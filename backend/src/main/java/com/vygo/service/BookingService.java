package com.vygo.service;

import com.vygo.config.AppProperties;
import com.vygo.dto.booking.BookingRequest;
import com.vygo.dto.booking.BookingResponse;
import com.vygo.dto.booking.BusSummaryDto;
import com.vygo.dto.booking.ConflictDetail;
import com.vygo.dto.booking.RefundSummaryDto;
import com.vygo.dto.booking.TicketSummaryDto;
import com.vygo.dto.common.PageResponse;
import com.vygo.dto.search.BoardingPointDto;
import com.vygo.entity.BoardingPoint;
import com.vygo.entity.Booking;
import com.vygo.entity.Booking.BookingStatus;
import com.vygo.entity.BookingSeat;
import com.vygo.entity.Refund;
import com.vygo.entity.Refund.RefundStatus;
import com.vygo.entity.SeatInventory;
import com.vygo.entity.SeatInventory.SeatStatus;
import com.vygo.entity.Ticket;
import com.vygo.entity.Ticket.TicketStatus;
import com.vygo.entity.Trip;
import com.vygo.entity.User;
import com.vygo.exception.ConflictException;
import com.vygo.exception.ForbiddenException;
import com.vygo.exception.NotFoundException;
import com.vygo.exception.SeatLockExpiredException;
import com.vygo.repository.BookingRepository;
import com.vygo.repository.BookingSeatRepository;
import com.vygo.repository.PaymentRepository;
import com.vygo.repository.RefundRepository;
import com.vygo.repository.SeatInventoryRepository;
import com.vygo.repository.TicketRepository;
import com.vygo.repository.TripRepository;
import com.vygo.repository.UserRepository;
import com.vygo.util.BookingRefGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter TS = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatInventoryRepository seatInventoryRepository;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final RefundRepository refundRepository;
    private final TicketRepository ticketRepository;
    private final BookingRefGenerator bookingRefGenerator;
    private final SeatLockService seatLockService;
    private final TripService tripService;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final AppProperties appProperties;

    public BookingService(BookingRepository bookingRepository,
                          BookingSeatRepository bookingSeatRepository,
                          SeatInventoryRepository seatInventoryRepository,
                          TripRepository tripRepository,
                          UserRepository userRepository,
                          PaymentRepository paymentRepository,
                          RefundRepository refundRepository,
                          TicketRepository ticketRepository,
                          BookingRefGenerator bookingRefGenerator,
                          SeatLockService seatLockService,
                          TripService tripService,
                          NotificationService notificationService,
                          AuditService auditService,
                          AppProperties appProperties) {
        this.bookingRepository = bookingRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.seatInventoryRepository = seatInventoryRepository;
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
        this.paymentRepository = paymentRepository;
        this.refundRepository = refundRepository;
        this.ticketRepository = ticketRepository;
        this.bookingRefGenerator = bookingRefGenerator;
        this.seatLockService = seatLockService;
        this.tripService = tripService;
        this.notificationService = notificationService;
        this.auditService = auditService;
        this.appProperties = appProperties;
    }

    @Transactional
    public BookingResponse create(Long userId, BookingRequest req) {
        SeatLockService.SeatLock lock = seatLockService.consume(req.lockToken(), userId);
        if (!lock.tripId().equals(req.tripId())
                || !lock.seats().containsAll(req.seatNumbers())
                || !req.seatNumbers().containsAll(lock.seats())) {
            throw new com.vygo.exception.BadRequestException("Lock token does not match the requested seats");
        }

        Trip trip = tripRepository.findById(req.tripId())
                .orElseThrow(() -> new NotFoundException("Trip not found"));
        User passenger = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        List<SeatInventory> seats = seatInventoryRepository.lockSeatsForUpdate(
                req.tripId(), new HashSet<>(req.seatNumbers()));
        if (seats.size() != req.seatNumbers().size()) {
            throw new com.vygo.exception.BadRequestException("Lock token does not match the requested seats");
        }
        // Atomic confirm-time re-check under the same pessimistic row lock that
        // will commit the booking: the seat must still be locked by THIS user AND
        // its DB-side hold must not have lapsed.
        LocalDateTime now = LocalDateTime.now();
        List<String> expired = new ArrayList<>();
        for (SeatInventory seat : seats) {
            if (seat.getStatus() != SeatStatus.LOCKED || !userId.equals(seat.getLockOwner())) {
                ConflictDetail detail = new ConflictDetail("SEAT_NO_LONGER_LOCKED",
                        "Seat " + seat.getSeatNumber() + " is no longer locked by this user",
                        List.of(seat.getSeatNumber()), List.of());
                throw new ConflictException("Seat " + seat.getSeatNumber() + " is no longer locked by this user", detail);
            }
            if (seat.getLockExpiresAt() != null && seat.getLockExpiresAt().isBefore(now)) {
                expired.add(seat.getSeatNumber());
            }
        }
        if (!expired.isEmpty()) {
            ConflictDetail detail = new ConflictDetail("SEAT_LOCK_EXPIRED",
                    "Seat lock has expired", expired.stream().sorted().toList(), List.of());
            throw new SeatLockExpiredException("Seat lock has expired", detail);
        }

        Booking booking = Booking.builder()
                .bookingRef(bookingRefGenerator.next())
                .passenger(passenger)
                .trip(trip)
                .status(BookingStatus.PENDING)
                .seatsCount(seats.size())
                .totalFare(lock.totalFare())
                .boardingPoint(trip.getSchedule().getRoute().getBoardingPoints().stream()
                        .filter(p -> p.getId().equals(req.boardingPointId()))
                        .findFirst()
                        .orElseThrow(() -> new NotFoundException("Boarding point not found")))
                .dropoffPoint(trip.getSchedule().getRoute().getBoardingPoints().stream()
                        .filter(p -> p.getId().equals(req.dropoffPointId()))
                        .findFirst()
                        .orElseThrow(() -> new NotFoundException("Drop-off point not found")))
                .bookedVia(Booking.BookedVia.ONLINE)
                .createdBy(userId)
                .createdAt(LocalDateTime.now())
                .build();
        booking = bookingRepository.save(booking);

        for (SeatInventory seat : seats) {
            seat.setStatus(SeatStatus.BOOKED);
            seat.setBookingId(booking.getId());
            seat.setLockOwner(null);
            seat.setLockExpiresAt(null);
            seatInventoryRepository.save(seat);
            bookingSeatRepository.save(BookingSeat.builder()
                    .booking(booking)
                    .trip(trip)
                    .seatNumber(seat.getSeatNumber())
                    .price(seat.getPrice())
                    .build());
        }

        notificationService.bookingPending(booking);
        auditService.record("CREATE_BOOKING", "Booking", booking.getBookingRef(),
                "Created booking for trip " + trip.getId() + " seats " + req.seatNumbers());
        log.info("Booking {} created for user {} (pending)", booking.getBookingRef(), userId);
        return toDto(booking);
    }

    @Transactional(readOnly = true)
    public PageResponse<BookingResponse> getMyBookings(Long userId, int page, int size) {
        Page<Booking> result = bookingRepository.findByPassengerIdOrderByIdDesc(userId,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50)));
        return new PageResponse<>(
                result.getContent().stream().map(this::toDto).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public BookingResponse getByRef(String ref, Long userId, Set<String> roles) {
        Booking booking = requireBooking(ref);
        if (!roles.contains("ROLE_ADMIN") && !booking.getPassenger().getId().equals(userId)) {
            throw new ForbiddenException("You can only view your own bookings");
        }
        return toDto(booking);
    }

    public Booking requireBooking(String ref) {
        return bookingRepository.findByBookingRef(ref)
                .orElseThrow(() -> new NotFoundException("Booking not found: " + ref));
    }

    @Transactional
    public BookingResponse cancel(String ref, Long userId, String reason) {
        Booking booking = requireBooking(ref);
        boolean isAdmin = userId == null;
        if (!isAdmin && !booking.getPassenger().getId().equals(userId)) {
            throw new ForbiddenException("You can only cancel your own bookings");
        }
        if (booking.getStatus() != BookingStatus.PENDING
                && booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new ConflictException("Booking cannot be cancelled in status " + booking.getStatus());
        }
        LocalDateTime departure = LocalDateTime.of(
                booking.getTrip().getTripDate(),
                booking.getTrip().getSchedule().getDepartureTime());
        LocalDateTime cutoff = departure.minusMinutes(appProperties.getCancellationWindowMinutes());
        if (LocalDateTime.now().isAfter(cutoff)) {
            throw new ConflictException("Too late to cancel: within " + appProperties.getCancellationWindowMinutes()
                    + " minutes of departure or after departure");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());
        booking.setCancellationReason(reason);
        bookingRepository.save(booking);

        List<Ticket> tickets = ticketRepository.findByBookingId(booking.getId());
        for (Ticket ticket : tickets) {
            ticket.setStatus(TicketStatus.CANCELLED);
            ticketRepository.save(ticket);
        }

        List<SeatInventory> seats = seatInventoryRepository.findByTripIdAndSeatNumberIn(
                booking.getTrip().getId(),
                bookingSeatRepository.findByBookingId(booking.getId()).stream()
                        .map(BookingSeat::getSeatNumber)
                        .toList());
        for (SeatInventory seat : seats) {
            seat.setStatus(SeatStatus.AVAILABLE);
            seat.setBookingId(null);
            seat.setLockOwner(null);
            seat.setLockExpiresAt(null);
            seatInventoryRepository.save(seat);
        }

        BigDecimal fee = booking.getTotalFare()
                .multiply(BigDecimal.valueOf(appProperties.getCancellationFeePct() / 100.0))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal refundAmount = booking.getTotalFare().subtract(fee).max(BigDecimal.ZERO);
        // Only record a refund when money actually moved. A PENDING (unpaid)
        // booking cancelled before payment gets no refund entry — otherwise the
        // ledger shows a refund for a charge that never happened.
        BigDecimal issuedRefund = BigDecimal.ZERO;
        com.vygo.entity.Payment paidPayment = paymentRepository
                .findFirstByBookingIdOrderByIdDesc(booking.getId())
                .filter(p -> p.getStatus() == com.vygo.entity.Payment.PaymentStatus.SUCCESS)
                .orElse(null);
        if (paidPayment != null) {
            paidPayment.setStatus(com.vygo.entity.Payment.PaymentStatus.REFUNDED);
            paymentRepository.save(paidPayment);
            refundRepository.save(Refund.builder()
                    .payment(paidPayment)
                    .booking(booking)
                    .amount(refundAmount)
                    .reason(reason)
                    .status(RefundStatus.COMPLETED)
                    .processedAt(LocalDateTime.now())
                    .createdAt(LocalDateTime.now())
                    .build());
            issuedRefund = refundAmount;
        }

        notificationService.bookingCancelled(booking);
        auditService.record("CANCEL_BOOKING", "Booking", booking.getBookingRef(),
                "Cancelled with reason: " + reason + ", refund " + issuedRefund);
        log.info("Booking {} cancelled, refund {}", booking.getBookingRef(), issuedRefund);
        return toDto(booking);
    }

    @Transactional
    public void completeTripBookings(Long tripId) {
        List<Booking> bookings = bookingRepository.findByTripIdAndStatus(tripId, BookingStatus.CONFIRMED);
        for (Booking booking : bookings) {
            booking.setStatus(BookingStatus.COMPLETED);
            bookingRepository.save(booking);
        }
        if (!bookings.isEmpty()) {
            log.info("Marked {} bookings COMPLETED for trip {}", bookings.size(), tripId);
        }
    }

    public BookingResponse toDto(Booking booking) {
        Trip trip = booking.getTrip();
        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(booking.getId());
        List<String> seatNumbers = bookingSeats.stream()
                .map(BookingSeat::getSeatNumber)
                .sorted()
                .toList();

        var boarding = toBoardingPointDto(booking.getBoardingPoint(), trip);
        var dropoff = toBoardingPointDto(booking.getDropoffPoint(), trip);
        var bus = new BusSummaryDto(
                trip.getId(),
                trip.getSchedule().getOperator().getName(),
                trip.getSchedule().getBus().getRegistrationNo(),
                trip.getSchedule().getBus().getBusType().name(),
                trip.getSchedule().getDepartureTime().format(TIME),
                trip.getTripDate().toString());

        List<TicketSummaryDto> tickets = ticketRepository.findByBookingId(booking.getId()).stream()
                .map(t -> new TicketSummaryDto(t.getId(), t.getTicketRef(), t.getSeatNumber(),
                        t.getStatus() != null ? t.getStatus().name() : null, t.getQrCodeUrl()))
                .toList();

        RefundSummaryDto refund = refundRepository.findByBookingId(booking.getId()).stream()
                .findFirst()
                .map(r -> new RefundSummaryDto(r.getAmount(), booking.getTotalFare().subtract(r.getAmount()),
                        r.getStatus() != null ? r.getStatus().name() : null))
                .orElse(null);

        BigDecimal paymentRequired = booking.getStatus() == BookingStatus.PENDING
                ? booking.getTotalFare()
                : null;

        return new BookingResponse(
                booking.getId(),
                booking.getBookingRef(),
                trip.getId(),
                booking.getStatus() != null ? booking.getStatus().name() : null,
                seatNumbers,
                booking.getSeatsCount(),
                booking.getTotalFare(),
                boarding,
                dropoff,
                bus,
                trip.getTripDate().toString(),
                booking.getCreatedAt() != null ? booking.getCreatedAt().format(TS) : null,
                paymentRequired,
                booking.getPassenger().getFullName(),
                tickets,
                refund);
    }

    private BoardingPointDto toBoardingPointDto(BoardingPoint bp, Trip trip) {
        int offset = bp.getTimeOffsetMin() != null ? bp.getTimeOffsetMin() : 0;
        String time = trip.getSchedule().getDepartureTime().plusMinutes(offset).format(TIME);
        return new BoardingPointDto(bp.getId(), bp.getName(), bp.getCity(), time);
    }
}
