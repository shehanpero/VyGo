package com.vygo.service;

import com.vygo.dto.common.MessageResponse;
import com.vygo.dto.payment.ConfirmPaymentRequest;
import com.vygo.dto.payment.InitiatePaymentRequest;
import com.vygo.dto.payment.InitiatePaymentResponse;
import com.vygo.dto.payment.PaymentResponse;
import com.vygo.dto.payment.RefundRequest;
import com.vygo.dto.payment.RefundResponse;
import com.vygo.entity.Booking;
import com.vygo.entity.Payment;
import com.vygo.entity.Payment.PayMethod;
import com.vygo.entity.Payment.PaymentStatus;
import com.vygo.entity.Refund;
import com.vygo.entity.Refund.RefundStatus;
import com.vygo.entity.Role.RoleCode;
import com.vygo.entity.User;
import com.vygo.exception.BadRequestException;
import com.vygo.exception.ConflictException;
import com.vygo.exception.ForbiddenException;
import com.vygo.exception.NotFoundException;
import com.vygo.integration.PayHereClient;
import com.vygo.integration.PayHereSandboxClient;
import com.vygo.repository.PaymentRepository;
import com.vygo.repository.RefundRepository;
import com.vygo.repository.UserRepository;
import com.vygo.util.TxnIdGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
    private static final DateTimeFormatter TS = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /** VyGo's platform commission on every confirmed booking (5%). */
    private static final BigDecimal PLATFORM_COMMISSION_RATE = new BigDecimal("0.05");

    private final PaymentRepository paymentRepository;
    private final RefundRepository refundRepository;
    private final UserRepository userRepository;
    private final BookingService bookingService;
    private final TicketService ticketService;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final PayHereClient payHereClient;
    private final PayHereSandboxClient payHereSandboxClient;
    private final TxnIdGenerator txnIdGenerator;
    private final Environment environment;

    public PaymentService(PaymentRepository paymentRepository,
                          RefundRepository refundRepository,
                          UserRepository userRepository,
                          BookingService bookingService,
                          TicketService ticketService,
                          NotificationService notificationService,
                          AuditService auditService,
                          PayHereClient payHereClient,
                          PayHereSandboxClient payHereSandboxClient,
                          TxnIdGenerator txnIdGenerator,
                          Environment environment) {
        this.paymentRepository = paymentRepository;
        this.refundRepository = refundRepository;
        this.userRepository = userRepository;
        this.bookingService = bookingService;
        this.ticketService = ticketService;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.payHereClient = payHereClient;
        this.payHereSandboxClient = payHereSandboxClient;
        this.txnIdGenerator = txnIdGenerator;
        this.environment = environment;
    }

    @Transactional
    public InitiatePaymentResponse initiate(Long userId, InitiatePaymentRequest req) {
        Booking booking = bookingService.requireBooking(req.bookingRef());
        requireOwner(booking, userId);
        if (booking.getStatus() != Booking.BookingStatus.PENDING) {
            throw new ConflictException("Booking is not awaiting payment");
        }
        PayMethod method;
        try {
            method = PayMethod.valueOf(req.method().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid payment method: " + req.method());
        }

        PayHereClient.InitResult result = payHereClient.init(new PayHereClient.InitRequest(
                booking.getBookingRef(),
                booking.getTotalFare().toPlainString(),
                "LKR",
                booking.getPassenger().getMobile(),
                booking.getPassenger().getEmail(),
                "VyGo bus booking " + booking.getBookingRef()));

        Payment payment = Payment.builder()
                .booking(booking)
                .gatewayTxnId(result.txnId())
                .amount(booking.getTotalFare())
                .currency("LKR")
                .method(method)
                .gateway("PAYHERE_SANDBOX")
                .status(PaymentStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();
        paymentRepository.save(payment);

        auditService.record("PAYMENT_INITIATE", "Payment", result.txnId(),
                "Initiated " + method + " payment for " + booking.getBookingRef());
        return new InitiatePaymentResponse(payment.getId(), result.txnId(), payment.getAmount(),
                PaymentStatus.PENDING.name(), result.redirectUrl(), true);
    }

    @Transactional
    public PaymentResponse confirm(Long userId, ConfirmPaymentRequest req) {
        Payment payment = requirePaymentForUpdate(req.txnId());
        requireOwner(payment.getBooking(), userId);
        return doConfirm(payment);
    }

    @Transactional
    public PaymentResponse confirmSandbox(String txnId) {
        if (!sandboxEnabled()) {
            throw new NotFoundException("Sandbox payment gateway is only available in development");
        }
        Payment payment = requirePaymentForUpdate(txnId);
        return doConfirm(payment);
    }

    /**
     * Applies a gateway callback to a PENDING payment. The gateway's own status
     * is the source of truth: the booking is only CONFIRMED after the gateway
     * reports the charge as SUCCESS. Replays (webhooks can be delivered twice)
     * are a no-op, and a callback against a cancelled booking is rejected so a
     * stale sandbox page cannot resurrect a booking that was refunded or
     * cancelled while the payment was still pending.
     */
    private PaymentResponse doConfirm(Payment payment) {
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            log.info("Payment {} already SUCCESS; ignoring duplicate callback", payment.getGatewayTxnId());
            return toDto(payment);
        }
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new ConflictException("Payment already processed");
        }
        Booking booking = payment.getBooking();
        if (booking.getStatus() != Booking.BookingStatus.PENDING) {
            throw new ConflictException("Booking is not awaiting payment (status " + booking.getStatus() + ")");
        }

        if (!payHereSandboxClient.markPaid(payment.getGatewayTxnId())) {
            throw new ConflictException("Payment session expired, please retry");
        }
        PayHereClient.StatusResult gateway = payHereClient.status(payment.getGatewayTxnId());
        if ("NOT_FOUND".equals(gateway.status())) {
            throw new ConflictException("Payment session expired, please retry");
        }
        if (!"SUCCESS".equals(gateway.status())) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            auditService.record("PAYMENT_FAILED", "Payment", payment.getGatewayTxnId(),
                    "Gateway did not confirm payment for " + booking.getBookingRef());
            throw new ConflictException("Payment gateway did not confirm the transaction");
        }

        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAt(LocalDateTime.now());
        payment.setCommissionAmount(payment.getAmount()
                .multiply(PLATFORM_COMMISSION_RATE)
                .setScale(2, java.math.RoundingMode.HALF_UP));
        paymentRepository.save(payment);

        booking.setStatus(Booking.BookingStatus.CONFIRMED);
        ticketService.generateForBooking(booking);
        notificationService.bookingConfirmed(booking);

        auditService.record("PAYMENT_SUCCESS", "Payment", payment.getGatewayTxnId(),
                "Confirmed payment " + payment.getAmount() + " LKR for " + booking.getBookingRef());
        log.info("Payment {} confirmed, booking {} CONFIRMED", payment.getGatewayTxnId(), booking.getBookingRef());
        return toDto(payment);
    }

    @Transactional(readOnly = true)
    public PaymentResponse getStatus(Long userId, String txnId) {
        Payment payment = requirePayment(txnId);
        if (!isAdmin(userId) && !payment.getBooking().getPassenger().getId().equals(userId)) {
            throw new ForbiddenException("You can only view your own payments");
        }
        return toDto(payment);
    }

    @Transactional
    public RefundResponse refund(Long userId, String txnId, RefundRequest req) {
        Payment payment = requirePayment(txnId);
        if (!isAdmin(userId) && !payment.getBooking().getPassenger().getId().equals(userId)) {
            throw new ForbiddenException("You can only refund your own payments");
        }
        if (payment.getStatus() != PaymentStatus.SUCCESS) {
            throw new ConflictException("Only successful payments can be refunded");
        }
        PayHereClient.RefundResult result = payHereClient.refund(txnId,
                payment.getAmount().toPlainString(), req.reason());
        if (!result.ok()) {
            throw new ConflictException("Refund failed: " + result.error());
        }
        payment.setStatus(PaymentStatus.REFUNDED);
        paymentRepository.save(payment);

        Refund refund = Refund.builder()
                .payment(payment)
                .booking(payment.getBooking())
                .amount(payment.getAmount())
                .reason(req.reason())
                .status(RefundStatus.COMPLETED)
                .processedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        refundRepository.save(refund);

        auditService.record("PAYMENT_REFUND", "Payment", txnId, "Refund " + payment.getAmount() + " LKR");
        return new RefundResponse(refund.getId(), payment.getId(), refund.getAmount(),
                refund.getStatus().name(),
                refund.getProcessedAt() != null ? refund.getProcessedAt().format(TS) : null);
    }

    public Map<String, String> sandboxStatus(String txnId) {
        if (!sandboxEnabled()) {
            throw new NotFoundException("Sandbox payment gateway is only available in development");
        }
        PayHereClient.StatusResult result = payHereClient.status(txnId);
        return Map.of("status", result.status(), "txnId", result.txnId());
    }

    private Payment requirePayment(String txnId) {
        return paymentRepository.findByGatewayTxnId(txnId)
                .orElseThrow(() -> new NotFoundException("Payment not found: " + txnId));
    }

    private boolean sandboxEnabled() {
        return environment.acceptsProfiles(Profiles.of("dev"));
    }

    private Payment requirePaymentForUpdate(String txnId) {
        return paymentRepository.findByGatewayTxnIdForUpdate(txnId)
                .orElseThrow(() -> new NotFoundException("Payment not found: " + txnId));
    }

    private void requireOwner(Booking booking, Long userId) {
        if (!booking.getPassenger().getId().equals(userId)) {
            throw new ForbiddenException("You can only manage your own bookings");
        }
    }

    private boolean isAdmin(Long userId) {
        if (userId == null) {
            return false;
        }
        return userRepository.findById(userId)
                .map(u -> u.getRoles().stream()
                        .anyMatch(r -> r.getCode() == RoleCode.ADMIN))
                .orElse(false);
    }

    private PaymentResponse toDto(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getGatewayTxnId(),
                payment.getAmount(),
                payment.getCommissionAmount(),
                payment.getStatus() != null ? payment.getStatus().name() : null,
                payment.getMethod() != null ? payment.getMethod().name() : null,
                payment.getPaidAt() != null ? payment.getPaidAt().format(TS) : null,
                payment.getCreatedAt() != null ? payment.getCreatedAt().format(TS) : null);
    }
}
