package com.vygo.service;

import com.vygo.config.AppProperties;
import com.vygo.dto.ticket.TicketResponse;
import com.vygo.dto.ticket.ValidateTicketRequest;
import com.vygo.dto.ticket.ValidateTicketResponse;
import com.vygo.entity.Booking;
import com.vygo.entity.BookingSeat;
import com.vygo.entity.Ticket;
import com.vygo.entity.Ticket.TicketStatus;
import com.vygo.exception.NotFoundException;
import com.vygo.repository.BookingSeatRepository;
import com.vygo.repository.TicketRepository;
import com.vygo.util.QrCodeGenerator;
import com.vygo.util.TicketRefGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

@Service
public class TicketService {

    private static final Logger log = LoggerFactory.getLogger(TicketService.class);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final String PREFIX = "vygo1.";

    private final TicketRepository ticketRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final TicketRefGenerator ticketRefGenerator;
    private final QrCodeGenerator qrCodeGenerator;
    private final AppProperties appProperties;

    public TicketService(TicketRepository ticketRepository,
                         BookingSeatRepository bookingSeatRepository,
                         TicketRefGenerator ticketRefGenerator,
                         QrCodeGenerator qrCodeGenerator,
                         AppProperties appProperties) {
        this.ticketRepository = ticketRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.ticketRefGenerator = ticketRefGenerator;
        this.qrCodeGenerator = qrCodeGenerator;
        this.appProperties = appProperties;
    }

    @Transactional
    public void generateForBooking(Booking booking) {
        List<BookingSeat> seats = bookingSeatRepository.findByBookingId(booking.getId());
        for (BookingSeat seat : seats) {
            String ref = ticketRefGenerator.next();
            String payload = "{\"t\":\"" + ref + "\",\"b\":\"" + booking.getBookingRef()
                    + "\",\"s\":\"" + seat.getSeatNumber() + "\"}";
            String payloadB64 = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
            String sig = hmacHex(payloadB64);
            String qrContent = PREFIX + payloadB64 + "." + sig;

            Ticket ticket = Ticket.builder()
                    .booking(booking)
                    .ticketRef(ref)
                    .passengerName(booking.getPassenger().getFullName())
                    .seatNumber(seat.getSeatNumber())
                    .qrContent(qrContent)
                    .qrCodeUrl("/api/v1/tickets/" + ref + "/qr")
                    .status(TicketStatus.ACTIVE)
                    .createdAt(LocalDateTime.now())
                    .build();
            ticketRepository.save(ticket);
            log.info("Ticket {} generated for booking {}", ref, booking.getBookingRef());
        }
    }

    @Transactional(readOnly = true)
    public TicketResponse getByRef(String ref, Long userId, java.util.Set<String> roles) {
        Ticket ticket = requireTicket(ref);
        boolean owner = ticket.getBooking().getPassenger().getId().equals(userId);
        boolean staff = roles.contains("ROLE_CONDUCTOR") || roles.contains("ROLE_ADMIN");
        if (!owner && !staff) {
            throw new com.vygo.exception.ForbiddenException("You can only view your own tickets");
        }
        return toDto(ticket);
    }

    @Transactional(readOnly = true)
    public byte[] qrPng(String ref, Long userId, java.util.Set<String> roles) {
        Ticket ticket = requireTicket(ref);
        boolean owner = ticket.getBooking().getPassenger().getId().equals(userId);
        boolean staff = roles.contains("ROLE_CONDUCTOR") || roles.contains("ROLE_ADMIN");
        if (!owner && !staff) {
            throw new com.vygo.exception.ForbiddenException("You can only view your own tickets");
        }
        return qrCodeGenerator.generatePng(ticket.getQrContent(), 250);
    }

    @Transactional
    public ValidateTicketResponse validate(Long conductorId, ValidateTicketRequest req) {
        String qrContent = req.qrContent() == null ? "" : req.qrContent().trim();
        String ticketRef = parseTicketRef(qrContent);
        if (ticketRef == null) {
            return new ValidateTicketResponse(false, "Invalid ticket code", null);
        }

        Ticket ticket = ticketRepository.findByTicketRef(ticketRef).orElse(null);
        if (ticket == null) {
            return new ValidateTicketResponse(false, "Ticket not found", null);
        }
        if (ticket.getStatus() == TicketStatus.USED) {
            return new ValidateTicketResponse(false, "Ticket already used", toDto(ticket));
        }
        if (ticket.getStatus() == TicketStatus.CANCELLED) {
            return new ValidateTicketResponse(false, "Ticket cancelled", toDto(ticket));
        }
        if (ticket.getStatus() != TicketStatus.ACTIVE) {
            return new ValidateTicketResponse(false, "Ticket not valid", toDto(ticket));
        }
        if (req.tripId() != null && !ticket.getBooking().getTrip().getId().equals(req.tripId())) {
            return new ValidateTicketResponse(false, "Ticket is for a different trip", toDto(ticket));
        }

        ticket.setStatus(TicketStatus.USED);
        ticket.setValidatedBy(conductorId);
        ticket.setValidatedAt(LocalDateTime.now());
        ticketRepository.save(ticket);
        return new ValidateTicketResponse(true, "Ticket valid", toDto(ticket));
    }

    private Ticket requireTicket(String ref) {
        return ticketRepository.findByTicketRef(ref)
                .orElseThrow(() -> new NotFoundException("Ticket not found: " + ref));
    }

    private String parseTicketRef(String qrContent) {
        if (!qrContent.startsWith(PREFIX)) {
            return null;
        }
        String[] parts = qrContent.split("\\.", 3);
        if (parts.length != 3) {
            return null;
        }
        String payloadB64 = parts[1];
        String sig = parts[2];
        if (!constantTimeEquals(hmacHex(payloadB64), sig)) {
            return null;
        }
        try {
            String payload = new String(Base64.getUrlDecoder().decode(payloadB64), StandardCharsets.UTF_8);
            return extractJsonField(payload, "t");
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String extractJsonField(String json, String field) {
        String key = "\"" + field + "\":\"";
        int start = json.indexOf(key);
        if (start < 0) {
            return null;
        }
        int valueStart = start + key.length();
        int end = json.indexOf('"', valueStart);
        return end > valueStart ? json.substring(valueStart, end) : null;
    }

    private String hmacHex(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(appProperties.getQrSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HMAC-SHA256 unavailable", e);
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) {
            return false;
        }
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }

    private TicketResponse toDto(Ticket ticket) {
        Booking booking = ticket.getBooking();
        return new TicketResponse(
                ticket.getId(),
                ticket.getTicketRef(),
                booking.getBookingRef(),
                ticket.getPassengerName(),
                ticket.getSeatNumber(),
                booking.getTrip().getTripDate().toString(),
                booking.getTrip().getSchedule().getDepartureTime().format(TIME),
                booking.getTrip().getSchedule().getRoute().getFromCity(),
                booking.getTrip().getSchedule().getRoute().getToCity(),
                booking.getTrip().getSchedule().getBus().getRegistrationNo(),
                booking.getTrip().getSchedule().getOperator().getName(),
                ticket.getStatus() != null ? ticket.getStatus().name() : null,
                ticket.getQrCodeUrl());
    }
}
