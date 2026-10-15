package com.vygo.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vygo.config.AppProperties;
import com.vygo.dto.booking.BookingResponse;
import com.vygo.dto.booking.BusSummaryDto;
import com.vygo.dto.booking.TicketSummaryDto;
import com.vygo.dto.conductor.ManualBookingRequest;
import com.vygo.dto.conductor.ReconcileRequest;
import com.vygo.dto.conductor.ReconcileResponse;
import com.vygo.dto.conductor.TripListRowResponse;
import com.vygo.dto.search.BoardingPointDto;
import com.vygo.dto.search.SeatDto;
import com.vygo.dto.search.SeatMapResponse;
import com.vygo.entity.AuditLog;
import com.vygo.entity.BoardingPoint;
import com.vygo.entity.Booking;
import com.vygo.entity.BookingSeat;
import com.vygo.entity.Bus;
import com.vygo.entity.BusOperator;
import com.vygo.entity.FareRule;
import com.vygo.entity.Notification;
import com.vygo.entity.Payment;
import com.vygo.entity.Role;
import com.vygo.entity.Route;
import com.vygo.entity.Schedule;
import com.vygo.entity.SeatInventory;
import com.vygo.entity.Ticket;
import com.vygo.entity.Trip;
import com.vygo.entity.User;
import com.vygo.exception.BadRequestException;
import com.vygo.exception.ConflictException;
import com.vygo.exception.ForbiddenException;
import com.vygo.exception.NotFoundException;
import com.vygo.integration.SmsSender;
import com.vygo.repository.AuditLogRepository;
import com.vygo.repository.BoardingPointRepository;
import com.vygo.repository.BookingRepository;
import com.vygo.repository.BookingSeatRepository;
import com.vygo.repository.BusStaffRepository;
import com.vygo.repository.FareRuleRepository;
import com.vygo.repository.NotificationRepository;
import com.vygo.repository.PaymentRepository;
import com.vygo.repository.RoleRepository;
import com.vygo.repository.SeatInventoryRepository;
import com.vygo.repository.TicketRepository;
import com.vygo.repository.TripRepository;
import com.vygo.repository.UserRepository;
import com.vygo.security.SecurityUser;
import com.vygo.util.AmenityJson;
import com.vygo.util.BookingRefGenerator;
import com.vygo.util.FleetVehicle;
import com.vygo.util.ServiceClass;
import com.vygo.util.TicketRefGenerator;
import com.vygo.util.TxnIdGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ConductorService {

    private static final Logger log = LoggerFactory.getLogger(ConductorService.class);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter TS = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final String QR_PREFIX = "vygo1.";
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final TripRepository tripRepo;
    private final SeatInventoryRepository seatRepo;
    private final BookingRepository bookingRepo;
    private final BookingSeatRepository bookingSeatRepo;
    private final BusStaffRepository busStaffRepo;
    private final TripService tripService;
    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final PaymentRepository paymentRepo;
    private final TicketRepository ticketRepo;
    private final BoardingPointRepository boardingPointRepo;
    private final FareRuleRepository fareRuleRepo;
    private final AuditLogRepository auditLogRepo;
    private final NotificationRepository notificationRepo;
    private final SmsSender smsSender;
    private final BookingRefGenerator bookingRefGen;
    private final TicketRefGenerator ticketRefGen;
    private final TxnIdGenerator txnIdGen;
    private final AppProperties app;

    public ConductorService(TripRepository tripRepo, SeatInventoryRepository seatRepo,
                            BookingRepository bookingRepo, BookingSeatRepository bookingSeatRepo,
                            BusStaffRepository busStaffRepo, TripService tripService,
                            UserRepository userRepo, RoleRepository roleRepo,
                            PaymentRepository paymentRepo, TicketRepository ticketRepo,
                            BoardingPointRepository boardingPointRepo, FareRuleRepository fareRuleRepo,
                            AuditLogRepository auditLogRepo, NotificationRepository notificationRepo,
                            SmsSender smsSender, BookingRefGenerator bookingRefGen,
                            TicketRefGenerator ticketRefGen, TxnIdGenerator txnIdGen, AppProperties app) {
        this.tripRepo = tripRepo;
        this.seatRepo = seatRepo;
        this.bookingRepo = bookingRepo;
        this.bookingSeatRepo = bookingSeatRepo;
        this.busStaffRepo = busStaffRepo;
        this.tripService = tripService;
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.paymentRepo = paymentRepo;
        this.ticketRepo = ticketRepo;
        this.boardingPointRepo = boardingPointRepo;
        this.fareRuleRepo = fareRuleRepo;
        this.auditLogRepo = auditLogRepo;
        this.notificationRepo = notificationRepo;
        this.smsSender = smsSender;
        this.bookingRefGen = bookingRefGen;
        this.ticketRefGen = ticketRefGen;
        this.txnIdGen = txnIdGen;
        this.app = app;
    }

    @Transactional
    public List<TripListRowResponse> tripsForDate(Long userId, LocalDate date) {
        User user = userRepo.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        List<Trip> trips;
        if (user.getOwner() != null) {
            // Scoped to the bus owner / association this conductor belongs to, so
            // the list only contains that operator's buses (including newly added ones).
            trips = tripService.tripsForOperatorOnDate(user.getOwner().getId(), date);
        } else {
            trips = tripsForAssignedBuses(userId, date);
        }
        return trips.stream()
                .map(this::toTripRow)
                .sorted(Comparator.comparing(TripListRowResponse::departureTime))
                .toList();
    }

    private List<Trip> tripsForAssignedBuses(Long userId, LocalDate date) {
        Set<Long> busIds = busStaffRepo.findByUserId(userId).stream()
                .map(s -> s.getBus().getId())
                .collect(Collectors.toSet());
        if (busIds.isEmpty()) {
            return List.of();
        }
        return tripRepo.findByTripDate(date).stream()
                .filter(t -> busIds.contains(t.getSchedule().getBus().getId()))
                .toList();
    }

    /**
     * A conductor may only act on trips that belong to their bus owner / association
     * (or, if unaffiliated, a bus they are assigned to). Prevents cross-operator access.
     */
    private Trip requireAccessibleTrip(Long userId, Long tripId) {
        Trip trip = tripRepo.findById(tripId).orElseThrow(() -> new NotFoundException("Trip not found"));
        User user = userRepo.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        BusOperator op = trip.getSchedule().getOperator() != null
                ? trip.getSchedule().getOperator()
                : trip.getSchedule().getBus().getOperator();
        if (user.getOwner() != null && op != null) {
            if (!op.getId().equals(user.getOwner().getId())) {
                throw new ForbiddenException("This trip belongs to another bus owner");
            }
            return trip;
        }
        boolean assigned = busStaffRepo.findByUserId(userId).stream()
                .anyMatch(s -> s.getBus().getId().equals(trip.getSchedule().getBus().getId()));
        if (!assigned) {
            throw new ForbiddenException("This trip is not assigned to you");
        }
        return trip;
    }

    @Transactional
    public SeatMapResponse tripSeats(Long userId, Long tripId) {
        Trip trip = requireAccessibleTrip(userId, tripId);
        releaseExpiredLocks(tripId);
        List<SeatInventory> seats = seatRepo.findByTripIdOrderBySeatNumberAsc(tripId);
        if (seats.isEmpty()) {
            materializeSeats(trip);
            seats = seatRepo.findByTripIdOrderBySeatNumberAsc(tripId);
        }
        List<SeatDto> dtos = seats.stream()
                .map(s -> new SeatDto(s.getSeatNumber(), s.getStatus().name(), s.getPrice(),
                        com.vygo.util.IsoTime.instant(s.getLockExpiresAt()),
                        passengerNameFor(s)))
                .toList();
        BigDecimal farePerSeat = seats.isEmpty() ? fareFor(trip) : seats.get(0).getPrice();
        Bus bus = trip.getSchedule().getBus();
        ServiceClass serviceClass = ServiceClass.from(bus.getBusType());
        return new SeatMapResponse(trip.getId(), bus.getBusType().name(), bus.getModel(),
                serviceClass.name(),
                bus.getCapacity(), farePerSeat, AmenityJson.parse(bus.getAmenities()), dtos,
                FleetVehicle.vehicleModelId(bus.getModel(), serviceClass),
                FleetVehicle.allowedCapacities(bus.getModel(), serviceClass));
    }

    @Transactional
    public BookingResponse manualBooking(SecurityUser user, ManualBookingRequest req) {
        Trip trip = requireAccessibleTrip(user.userId(), req.tripId());
        materializeSeats(trip);

        List<SeatInventory> lockedSeats = seatRepo.lockSeatsForUpdate(trip.getId(), req.seatNumbers());
        Map<String, SeatInventory> bySeat = lockedSeats.stream()
                .collect(Collectors.toMap(SeatInventory::getSeatNumber, s -> s));
        for (String seatNo : req.seatNumbers()) {
            SeatInventory s = bySeat.get(seatNo);
            if (s == null || s.getStatus() != SeatInventory.SeatStatus.AVAILABLE) {
                throw new ConflictException("Seat " + seatNo + " is not available");
            }
        }

        User passenger = findOrCreatePassenger(req.passengerMobile(), req.passengerName());
        BoardingPoint boarding = boardingPointRepo.findById(req.boardingPointId())
                .orElseThrow(() -> new NotFoundException("Boarding point not found"));
        BoardingPoint dropoff = boardingPointRepo.findById(req.dropoffPointId())
                .orElseThrow(() -> new NotFoundException("Dropoff point not found"));
        Long routeId = trip.getSchedule().getRoute().getId();
        if (!boarding.getRoute().getId().equals(routeId)) {
            throw new BadRequestException("Boarding point does not belong to this route");
        }
        if (!dropoff.getRoute().getId().equals(routeId)) {
            throw new BadRequestException("Dropoff point does not belong to this route");
        }

        Booking booking = Booking.builder()
                .bookingRef(bookingRefGen.next())
                .passenger(passenger)
                .trip(trip)
                .status(Booking.BookingStatus.CONFIRMED)
                .seatsCount(req.seatNumbers().size())
                .totalFare(req.amountPaid())
                .boardingPoint(boarding)
                .dropoffPoint(dropoff)
                .bookedVia(Booking.BookedVia.MANUAL)
                .createdBy(user.userId())
                .build();
        Booking saved = bookingRepo.save(booking);

        List<BookingSeat> bookingSeats = new ArrayList<>();
        for (String seatNo : req.seatNumbers()) {
            SeatInventory s = bySeat.get(seatNo);
            s.setStatus(SeatInventory.SeatStatus.BOOKED);
            s.setBookingId(saved.getId());
            s.setLockOwner(null);
            s.setLockExpiresAt(null);
            seatRepo.save(s);
            bookingSeats.add(BookingSeat.builder().booking(saved).trip(trip)
                    .seatNumber(seatNo).price(s.getPrice()).build());
        }
        bookingSeatRepo.saveAll(bookingSeats);

        Payment payment = Payment.builder()
                .booking(saved)
                .gatewayTxnId(txnIdGen.next())
                .amount(req.amountPaid())
                .method(parsePayMethod(req.paymentMethod()))
                .gateway("CASH")
                .status(Payment.PaymentStatus.SUCCESS)
                .paidAt(LocalDateTime.now())
                .build();
        paymentRepo.save(payment);

        for (String seatNo : req.seatNumbers()) {
            createTicket(saved, req.passengerName(), seatNo);
        }

        sendSmsNotification(passenger, "Booking confirmed",
                "VyGo booking " + saved.getBookingRef() + " confirmed. Trip " + routeName(trip)
                        + " on " + trip.getTripDate());
        recordAudit(user.userId(), "MANUAL_BOOKING", "Booking", saved.getBookingRef(),
                "seats=" + String.join(",", req.seatNumbers()) + ", amount=" + req.amountPaid());
        log.info("Manual booking created ref={} tripId={} seats={}", saved.getBookingRef(), trip.getId(),
                req.seatNumbers());
        return toBookingResponse(saved);
    }

    @Transactional
    public ReconcileResponse reconcile(Long userId, Long tripId, ReconcileRequest req) {
        Trip trip = requireAccessibleTrip(userId, tripId);
        if (trip.getStatus() != Trip.TripStatus.CANCELLED) {
            trip.setStatus(Trip.TripStatus.COMPLETED);
            tripRepo.save(trip);
        }
        for (Booking b : bookingRepo.findByTripIdAndStatus(tripId, Booking.BookingStatus.CONFIRMED)) {
            b.setStatus(Booking.BookingStatus.COMPLETED);
            bookingRepo.save(b);
        }
        String details = "seatsSoldOnBoard=" + req.seatsSoldOnBoard() + ", cashCollected=" + req.cashCollected()
                + (req.notes() != null ? ", notes=" + req.notes() : "");
        Long auditId = recordAuditReturningId(userId, "RECONCILE_TRIP", "Trip", String.valueOf(tripId), details);
        return new ReconcileResponse("Reconciliation saved", auditId);
    }

    // ---- helpers -----------------------------------------------------

    private TripListRowResponse toTripRow(Trip t) {
        return new TripListRowResponse(t.getId(), routeName(t), t.getSchedule().getBus().getRegistrationNo(),
                t.getSchedule().getDepartureTime().format(TIME), t.getStatus().name(),
                (int) seatRepo.countByTripIdAndStatus(t.getId(), SeatInventory.SeatStatus.BOOKED),
                t.getSchedule().getBus().getCapacity());
    }

    private String passengerNameFor(SeatInventory s) {
        if (s.getStatus() != SeatInventory.SeatStatus.BOOKED || s.getBookingId() == null) {
            return null;
        }
        return bookingRepo.findById(s.getBookingId())
                .map(b -> b.getPassenger().getFullName())
                .orElse(null);
    }

    private String routeName(Trip t) {
        Route r = t.getSchedule().getRoute();
        return r.getFromCity() + " \u2192 " + r.getToCity();
    }

    private User findOrCreatePassenger(String mobile, String fullName) {
        Optional<User> existing = userRepo.findByMobile(mobile);
        if (existing.isPresent()) {
            return existing.get();
        }
        User user = User.builder().fullName(fullName).mobile(mobile).enabled(true).build();
        roleRepo.findByCode(Role.RoleCode.PASSENGER)
                .ifPresent(r -> user.setRoles(new HashSet<>(Set.of(r))));
        return userRepo.save(user);
    }

    private void createTicket(Booking booking, String passengerName, String seatNumber) {
        String ref = ticketRefGen.next();
        String qr = buildQr(ref, booking.getBookingRef(), seatNumber, passengerName);
        Ticket ticket = Ticket.builder()
                .booking(booking)
                .ticketRef(ref)
                .passengerName(passengerName)
                .seatNumber(seatNumber)
                .qrContent(qr)
                .status(Ticket.TicketStatus.ACTIVE)
                .build();
        ticketRepo.save(ticket);
    }

    private String buildQr(String ref, String bookingRef, String seat, String passengerName) {
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("t", ref);
        payload.put("b", bookingRef);
        payload.put("s", seat);
        try {
            String json = objectMapper.writeValueAsString(payload);
            String b64 = Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(qrSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(json.getBytes(StandardCharsets.UTF_8));
            return QR_PREFIX + b64 + "." + HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to sign ticket QR content", e);
        }
    }

    private String qrSecret() {
        String secret = app.getQrSecret();
        return secret == null || secret.isBlank() ? "vygo-qr-signing-secret-0123456789" : secret;
    }

    private void materializeSeats(Trip trip) {
        List<SeatInventory> existing = seatRepo.findByTripIdOrderBySeatNumberAsc(trip.getId());
        if (!existing.isEmpty()) {
            return;
        }
        Bus bus = trip.getSchedule().getBus();
        BigDecimal fare = fareFor(trip);
        List<SeatInventory> rows = new ArrayList<>();
        for (int i = 1; i <= bus.getCapacity(); i++) {
            rows.add(SeatInventory.builder()
                    .trip(trip)
                    .seatNumber(String.valueOf(i))
                    .status(SeatInventory.SeatStatus.AVAILABLE)
                    .price(fare)
                    .build());
        }
        seatRepo.saveAll(rows);
    }

    private void releaseExpiredLocks(Long tripId) {
        LocalDateTime now = LocalDateTime.now();
        for (SeatInventory s : seatRepo.findByTripIdOrderBySeatNumberAsc(tripId)) {
            if (s.getStatus() == SeatInventory.SeatStatus.LOCKED
                    && s.getLockExpiresAt() != null && s.getLockExpiresAt().isBefore(now)) {
                s.setStatus(SeatInventory.SeatStatus.AVAILABLE);
                s.setLockOwner(null);
                s.setLockExpiresAt(null);
                seatRepo.save(s);
            }
        }
    }

    private BigDecimal fareFor(Trip trip) {
        Schedule schedule = trip.getSchedule();
        Route route = schedule.getRoute();
        Optional<FareRule> rule = fareRuleRepo.findByRouteIdAndBusType(route.getId(), schedule.getBus().getBusType());
        FareRule fareRule = rule.orElseGet(() -> fareRuleRepo.findByRouteId(route.getId())
                .stream().findFirst().orElse(null));
        if (fareRule == null) {
            return BigDecimal.valueOf(1000);
        }
        return fareRule.getBaseFare()
                .add(fareRule.getPerKmRate().multiply(route.getDistanceKm()))
                .multiply(fareRule.getSurgeMultiplier())
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BookingResponse toBookingResponse(Booking b) {
        List<String> seats = bookingSeatRepo.findByBookingId(b.getId())
                .stream().map(BookingSeat::getSeatNumber).toList();
        Trip trip = b.getTrip();
        LocalTime dep = trip.getSchedule().getDepartureTime();
        BoardingPointDto boarding = new BoardingPointDto(b.getBoardingPoint().getId(),
                b.getBoardingPoint().getName(), b.getBoardingPoint().getCity(), bpTime(dep, b.getBoardingPoint()));
        BoardingPointDto dropoff = new BoardingPointDto(b.getDropoffPoint().getId(),
                b.getDropoffPoint().getName(), b.getDropoffPoint().getCity(), bpTime(dep, b.getDropoffPoint()));
        BusSummaryDto bus = new BusSummaryDto(trip.getId(), trip.getSchedule().getOperator().getName(),
                trip.getSchedule().getBus().getRegistrationNo(), trip.getSchedule().getBus().getBusType().name(),
                trip.getSchedule().getDepartureTime().format(TIME), trip.getTripDate().toString());
        List<TicketSummaryDto> tickets = ticketRepo.findByBookingId(b.getId()).stream()
                .map(t -> new TicketSummaryDto(t.getId(), t.getTicketRef(), t.getSeatNumber(),
                        t.getStatus().name(), t.getQrCodeUrl()))
                .toList();
        return new BookingResponse(b.getId(), b.getBookingRef(), trip.getId(), b.getStatus().name(), seats,
                b.getSeatsCount(), b.getTotalFare(), boarding, dropoff, bus, trip.getTripDate().toString(),
                b.getCreatedAt() == null ? null : b.getCreatedAt().format(TS), b.getTotalFare(),
                b.getPassenger().getFullName(), tickets, null);
    }

    private String bpTime(LocalTime departure, BoardingPoint p) {
        if (p.getTimeOffsetMin() == null) {
            return null;
        }
        return departure.plusMinutes(p.getTimeOffsetMin()).format(TIME);
    }

    private Payment.PayMethod parsePayMethod(String s) {
        try {
            return Payment.PayMethod.valueOf(s.trim().toUpperCase());
        } catch (Exception e) {
            throw new BadRequestException("Invalid payment method: " + s);
        }
    }

    private void sendSmsNotification(User passenger, String subject, String body) {
        Notification n = Notification.builder()
                .user(passenger)
                .channel(Notification.NotificationChannel.SMS)
                .subject(subject)
                .body(body)
                .status(Notification.NotificationStatus.SENT)
                .isRead(false)
                .sentAt(LocalDateTime.now())
                .build();
        notificationRepo.save(n);
        smsSender.send(passenger.getMobile(), subject + ": " + body);
    }

    private void recordAudit(Long actorId, String action, String entityType, String entityId, String details) {
        recordAuditReturningId(actorId, action, entityType, entityId, details);
    }

    private Long recordAuditReturningId(Long actorId, String action, String entityType, String entityId, String details) {
        AuditLog entry = AuditLog.builder()
                .actorId(actorId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .createdAt(LocalDateTime.now())
                .build();
        return auditLogRepo.save(entry).getId();
    }
}
