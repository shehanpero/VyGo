package com.vygo.config;

import com.vygo.entity.BoardingPoint;
import com.vygo.entity.Booking;
import com.vygo.entity.Booking.BookingStatus;
import com.vygo.entity.BookingSeat;
import com.vygo.entity.Bus;
import com.vygo.entity.Bus.BusStatus;
import com.vygo.entity.Bus.BusType;
import com.vygo.entity.BusOperator;
import com.vygo.entity.BusOperator.OperatorStatus;
import com.vygo.entity.BusLocation;
import com.vygo.entity.BusStaff;
import com.vygo.entity.Complaint;
import com.vygo.entity.Complaint.ComplaintStatus;
import com.vygo.entity.Expense;
import com.vygo.entity.FareRule;
import com.vygo.entity.Notification;
import com.vygo.entity.Notification.NotificationChannel;
import com.vygo.entity.Notification.NotificationStatus;
import com.vygo.entity.Payment;
import com.vygo.entity.Payment.PaymentStatus;
import com.vygo.entity.Review;
import com.vygo.entity.Role;
import com.vygo.entity.Role.RoleCode;
import com.vygo.entity.Route;
import com.vygo.entity.Route.RouteClass;
import com.vygo.entity.Route.RouteStatus;
import com.vygo.entity.Route.RouteType;
import com.vygo.entity.RouteTool;
import com.vygo.entity.RouteTool.RouteToolNetwork;
import com.vygo.entity.Schedule;
import com.vygo.entity.Schedule.ScheduleStatus;
import com.vygo.entity.SeatInventory;
import com.vygo.entity.SeatInventory.SeatStatus;
import com.vygo.entity.Trip;
import com.vygo.entity.Trip.TripStatus;
import com.vygo.entity.User;
import com.vygo.repository.BoardingPointRepository;
import com.vygo.repository.BookingRepository;
import com.vygo.repository.BookingSeatRepository;
import com.vygo.repository.BusOperatorRepository;
import com.vygo.repository.BusLocationRepository;
import com.vygo.repository.BusRepository;
import com.vygo.repository.BusStaffRepository;
import com.vygo.repository.ComplaintRepository;
import com.vygo.repository.ExpenseRepository;
import com.vygo.repository.FareRuleRepository;
import com.vygo.repository.NotificationRepository;
import com.vygo.repository.PaymentRepository;
import com.vygo.repository.ReviewRepository;
import com.vygo.repository.RoleRepository;
import com.vygo.repository.RouteRepository;
import com.vygo.repository.RouteToolRepository;
import com.vygo.repository.ScheduleRepository;
import com.vygo.repository.SeatInventoryRepository;
import com.vygo.repository.UserRepository;
import com.vygo.service.TicketService;
import com.vygo.service.TripService;
import com.vygo.util.BookingRefGenerator;
import com.vygo.util.TicketRefGenerator;
import com.vygo.util.TxnIdGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Component
@Profile("dev")
@Order(2)
public class DataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    /** Collective / state operators classified as ASSOCIATION; all others are OWNER. */
    private static final List<String> ASSOCIATION_NAMES = List.of(
            "SLTB", "SLTB Kataragama", "SLTTS Katubadda", "Expressway Bus");

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BusOperatorRepository busOperatorRepository;
    private final BusRepository busRepository;
    private final BusStaffRepository busStaffRepository;
    private final BusLocationRepository busLocationRepository;
    private final ExpenseRepository expenseRepository;
    private final RouteRepository routeRepository;
    private final RouteToolRepository routeToolRepository;
    private final BoardingPointRepository boardingPointRepository;
    private final FareRuleRepository fareRuleRepository;
    private final ScheduleRepository scheduleRepository;
    private final SeatInventoryRepository seatInventoryRepository;
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final PaymentRepository paymentRepository;
    private final ComplaintRepository complaintRepository;
    private final ReviewRepository reviewRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final TicketService ticketService;
    private final TripService tripService;
    private final BookingRefGenerator bookingRefGenerator;
    private final TicketRefGenerator ticketRefGenerator;
    private final TxnIdGenerator txnIdGenerator;

    public DataInitializer(UserRepository userRepository,
                           RoleRepository roleRepository,
                           BusOperatorRepository busOperatorRepository,
                           BusRepository busRepository,
                           BusStaffRepository busStaffRepository,
                           BusLocationRepository busLocationRepository,
                           ExpenseRepository expenseRepository,
                           RouteRepository routeRepository,
                           RouteToolRepository routeToolRepository,
                           BoardingPointRepository boardingPointRepository,
                           FareRuleRepository fareRuleRepository,
                           ScheduleRepository scheduleRepository,
                           SeatInventoryRepository seatInventoryRepository,
                           BookingRepository bookingRepository,
                           BookingSeatRepository bookingSeatRepository,
                           PaymentRepository paymentRepository,
                           ComplaintRepository complaintRepository,
                           ReviewRepository reviewRepository,
                           NotificationRepository notificationRepository,
                           PasswordEncoder passwordEncoder,
                           TicketService ticketService,
                           TripService tripService,
                           BookingRefGenerator bookingRefGenerator,
                           TicketRefGenerator ticketRefGenerator,
                           TxnIdGenerator txnIdGenerator) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.busOperatorRepository = busOperatorRepository;
        this.busRepository = busRepository;
        this.busStaffRepository = busStaffRepository;
        this.busLocationRepository = busLocationRepository;
        this.expenseRepository = expenseRepository;
        this.routeRepository = routeRepository;
        this.routeToolRepository = routeToolRepository;
        this.boardingPointRepository = boardingPointRepository;
        this.fareRuleRepository = fareRuleRepository;
        this.scheduleRepository = scheduleRepository;
        this.seatInventoryRepository = seatInventoryRepository;
        this.bookingRepository = bookingRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.paymentRepository = paymentRepository;
        this.complaintRepository = complaintRepository;
        this.reviewRepository = reviewRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.ticketService = ticketService;
        this.tripService = tripService;
        this.bookingRefGenerator = bookingRefGenerator;
        this.ticketRefGenerator = ticketRefGenerator;
        this.txnIdGenerator = txnIdGenerator;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.findByEmail("admin@vygo.lk").isPresent()) {
            log.info("Seed data already present; running feature seeds only");
        } else {
            seedCoreData();
        }
        ensureFeatureSeeds();
    }

    private void seedCoreData() {
        Role passengerRole = role("PASSENGER", "Passenger");
        Role operatorRole = role("OPERATOR", "Operator");
        Role conductorRole = role("CONDUCTOR", "Conductor");
        Role adminRole = role("ADMIN", "Administrator");

        User admin = user("System Administrator", "admin@vygo.lk", "0700000001", List.of(adminRole));
        User operatorUser = user("Lanka Express Owner", "operator@vygo.lk", "0700000002", List.of(operatorRole));
        User conductorUser = user("Conductor Saman", "conductor@vygo.lk", "0700000003", List.of(conductorRole));
        User nimal = user("Nimal Perera", "nimal@vygo.lk", "0712345678", List.of(passengerRole));
        User ceylonUser = user("Ceylon Travels Owner", "pending@vygo.lk", "0700000004", List.of(operatorRole));

        BusOperator lankaExpress = BusOperator.builder()
                .user(operatorUser)
                .name("Lanka Express")
                .registrationNo("PV-1001")
                .licenseNo("L-88")
                .address("No 45, Colombo 10")
                .contactPerson("Kumar Fernando")
                .phone("0112345678")
                .email("operator@vygo.lk")
                .status(OperatorStatus.APPROVED)
                .createdAt(LocalDateTime.now())
                .build();
        busOperatorRepository.save(lankaExpress);

        BusOperator ceylonTravels = BusOperator.builder()
                .user(ceylonUser)
                .name("Ceylon Travels")
                .registrationNo("PV-2002")
                .licenseNo("L-99")
                .address("No 12, Galle Road, Moratuwa")
                .contactPerson("Shanaka Dias")
                .phone("0117654321")
                .email("info@ceylontravels.lk")
                .status(OperatorStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();
        busOperatorRepository.save(ceylonTravels);

        // Fleet upgrade: seeded Express coaches carry the Yutong C12 Pro model
        // (operator-configurable 51-53 seats; 52 here) and Normal services carry
        // the Ashok Leyland Viking (allowed 42/44/49/54/58; 58 on the flagship
        // route to keep the NORMAL FleetVariantTest fixture unchanged).
        Bus busAc = bus(lankaExpress, "ND-1234", BusType.AC, 52, "Yutong C12 Pro", 2022);
        Bus busLuxury = bus(lankaExpress, "ND-5678", BusType.LUXURY, 52, "Yutong C12 Pro", 2021);
        Bus busSemi = bus(lankaExpress, "ND-9101", BusType.SEMI_LUXURY, 52, "Yutong C12 Pro", 2020);
        Bus busNormal = bus(lankaExpress, "ND-1213", BusType.NORMAL, 58, "Ashok Leyland Viking", 2019);

        Route colomboKandy = route("01", RouteType.NORMAL, null, RouteClass.INTERCITY,
                "Colombo", "Kandy", new BigDecimal("115.00"), 210);
        Route colomboGalle = route("02", RouteType.NORMAL, null, RouteClass.INTERCITY,
                "Colombo", "Galle", new BigDecimal("128.00"), 180);
        Route colomboJaffna = route("30", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE,
                "Colombo", "Jaffna", new BigDecimal("398.00"), 480);
        Route kandyGalle = route("34", RouteType.NORMAL, null, RouteClass.INTERCITY,
                "Kandy", "Galle", new BigDecimal("174.00"), 300);

        boardingPoint(colomboKandy, "Colombo Bastian Mawatha", 1, "Colombo", 0);
        boardingPoint(colomboKandy, "Kegalle", 2, "Kegalle", 75);
        boardingPoint(colomboKandy, "Peradeniya Junction", 3, "Kandy", 195);
        boardingPoint(colomboKandy, "Kandy Clock Tower", 4, "Kandy", 210);

        boardingPoint(colomboGalle, "Colombo Bastian Mawatha", 1, "Colombo", 0);
        boardingPoint(colomboGalle, "Aluthgama", 2, "Aluthgama", 110);
        boardingPoint(colomboGalle, "Galle Fort", 3, "Galle", 180);

        fareRule(colomboKandy, BusType.NORMAL, new BigDecimal("650.00"), new BigDecimal("0.00"));
        fareRule(colomboKandy, BusType.SEMI_LUXURY, new BigDecimal("900.00"), new BigDecimal("0.00"));
        fareRule(colomboKandy, BusType.LUXURY, new BigDecimal("1200.00"), new BigDecimal("0.00"));
        fareRule(colomboKandy, BusType.AC, new BigDecimal("1500.00"), new BigDecimal("0.00"));
        fareRule(colomboGalle, BusType.NORMAL, new BigDecimal("750.00"), new BigDecimal("0.00"));
        fareRule(colomboGalle, BusType.SEMI_LUXURY, new BigDecimal("1000.00"), new BigDecimal("0.00"));
        fareRule(colomboGalle, BusType.LUXURY, new BigDecimal("1300.00"), new BigDecimal("0.00"));
        fareRule(colomboGalle, BusType.AC, new BigDecimal("1600.00"), new BigDecimal("0.00"));
        fareRule(colomboJaffna, BusType.NORMAL, new BigDecimal("1900.00"), new BigDecimal("0.00"));
        fareRule(colomboJaffna, BusType.SEMI_LUXURY, new BigDecimal("2400.00"), new BigDecimal("0.00"));
        fareRule(colomboJaffna, BusType.LUXURY, new BigDecimal("2900.00"), new BigDecimal("0.00"));
        fareRule(colomboJaffna, BusType.AC, new BigDecimal("3400.00"), new BigDecimal("0.00"));
        fareRule(kandyGalle, BusType.NORMAL, new BigDecimal("900.00"), new BigDecimal("0.00"));
        fareRule(kandyGalle, BusType.SEMI_LUXURY, new BigDecimal("1200.00"), new BigDecimal("0.00"));
        fareRule(kandyGalle, BusType.LUXURY, new BigDecimal("1500.00"), new BigDecimal("0.00"));
        fareRule(kandyGalle, BusType.AC, new BigDecimal("1800.00"), new BigDecimal("0.00"));

        Schedule s1 = schedule(lankaExpress, colomboKandy, busAc, LocalTime.of(6, 0), LocalTime.of(9, 30));
        Schedule s2 = schedule(lankaExpress, colomboKandy, busLuxury, LocalTime.of(14, 30), LocalTime.of(18, 0));
        Schedule s3 = schedule(lankaExpress, colomboGalle, busSemi, LocalTime.of(8, 0), LocalTime.of(11, 0));
        Schedule s4 = schedule(lankaExpress, colomboKandy, busNormal, LocalTime.of(11, 30), LocalTime.of(15, 0));
        // NORMAL (Ashok Leyland Viking) service on Colombo-Galle so the demo
        // route exposes BOTH fleet variants (EXPRESS on s3, NORMAL here).
        Schedule s5 = schedule(lankaExpress, colomboGalle, busNormal, LocalTime.of(10, 0), LocalTime.of(13, 0));

        List<Schedule> expressSchedules = seedRouteCatalogue(lankaExpress, busAc, busLuxury);
        List<Schedule> corridorSchedules = seedExpresswayAndClassicCatalogue(operatorRole);

        List<Schedule> allSchedules = new ArrayList<>(List.of(s1, s2, s3, s4, s5));
        allSchedules.addAll(expressSchedules);
        allSchedules.addAll(corridorSchedules);

        Trip demoTrip = null;
        for (int dayOffset = 0; dayOffset <= 6; dayOffset++) {
            LocalDate date = LocalDate.now().plusDays(dayOffset);
            for (Schedule sc : allSchedules) {
                trip(sc, date);
            }
            if (dayOffset == 0) {
                demoTrip = trip(s2, date);
            }
        }

        seedDemoBooking(nimal, lankaExpress, demoTrip, busLuxury);
        seedRouteTools();
        log.info("VyGo dev data seeded: admin={} operator={} conductor={} passenger={}",
                admin.getEmail(), operatorUser.getEmail(), conductorUser.getEmail(), nimal.getEmail());
    }

    private void seedDemoBooking(User nimal, BusOperator operator, Trip trip, Bus bus) {
        if (trip == null) {
            return;
        }
        BigDecimal price = new BigDecimal("1200.00");
        String bookingRef = "DEMO-" + bookingRefGenerator.next();
        BoardingPoint boarding = boardingPointRepository.findByRouteIdOrderBySequenceAsc(
                trip.getSchedule().getRoute().getId()).get(0);
        BoardingPoint dropoff = boardingPointRepository.findByRouteIdOrderBySequenceAsc(
                trip.getSchedule().getRoute().getId()).get(3);

        Booking booking = Booking.builder()
                .bookingRef(bookingRef)
                .passenger(nimal)
                .trip(trip)
                .status(BookingStatus.CONFIRMED)
                .seatsCount(2)
                .totalFare(price.multiply(new BigDecimal("2")))
                .boardingPoint(boarding)
                .dropoffPoint(dropoff)
                .bookedVia(Booking.BookedVia.ONLINE)
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();
        bookingRepository.save(booking);

        for (String seatNo : List.of("1", "2")) {
            BookingSeat seat = BookingSeat.builder()
                    .booking(booking)
                    .trip(trip)
                    .seatNumber(seatNo)
                    .price(price)
                    .build();
            bookingSeatRepository.save(seat);
        }

        List<SeatInventory> seats = seatInventoryRepository.findByTripIdAndSeatNumberIn(trip.getId(), List.of("1", "2"));
        for (SeatInventory seat : seats) {
            seat.setStatus(SeatStatus.BOOKED);
            seat.setBookingId(booking.getId());
            seat.setLockOwner(nimal.getId());
        }
        seatInventoryRepository.saveAll(seats);

        Payment payment = Payment.builder()
                .booking(booking)
                .gatewayTxnId(txnIdGenerator.next())
                .amount(booking.getTotalFare())
                .currency("LKR")
                .method(Payment.PayMethod.CARD)
                .gateway("PAYHERE_SANDBOX")
                .status(PaymentStatus.SUCCESS)
                .paidAt(LocalDateTime.now().minusDays(1))
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();
        paymentRepository.save(payment);

        ticketService.generateForBooking(booking);

        Notification notification = Notification.builder()
                .user(nimal)
                .channel(NotificationChannel.EMAIL)
                .subject("Booking confirmed " + booking.getBookingRef())
                .body("Your booking " + booking.getBookingRef() + " is confirmed. E-tickets are ready.")
                .status(NotificationStatus.SENT)
                .isRead(false)
                .sentAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        notificationRepository.save(notification);

        Review review = Review.builder()
                .booking(booking)
                .passenger(nimal)
                .operator(operator)
                .trip(trip)
                .rating(5)
                .comment("Smooth journey, on-time departure and comfortable bus.")
                .createdAt(LocalDateTime.now())
                .build();
        reviewRepository.save(review);

        Complaint complaint = Complaint.builder()
                .passenger(nimal)
                .booking(booking)
                .subject("Late departure on Colombo-Kandy route")
                .description("The 14:30 bus left 40 minutes late on the day of travel.")
                .status(ComplaintStatus.OPEN)
                .createdAt(LocalDateTime.now().minusHours(2))
                .updatedAt(LocalDateTime.now().minusHours(2))
                .build();
        complaintRepository.save(complaint);
    }

    private Role role(String code, String name) {
        return roleRepository.findByCode(RoleCode.valueOf(code))
                .orElseGet(() -> roleRepository.save(Role.builder().code(RoleCode.valueOf(code)).name(name).build()));
    }

    private User user(String fullName, String email, String mobile, List<Role> roles) {
        User user = User.builder()
                .fullName(fullName)
                .email(email)
                .mobile(mobile)
                .passwordHash(passwordEncoder.encode("password123"))
                .enabled(true)
                .otpVerified(true)
                .build();
        user.getRoles().addAll(roles);
        return userRepository.save(user);
    }

    private Bus bus(BusOperator operator, String reg, BusType type, int capacity, String model, int year) {
        return busRepository.findByRegistrationNo(reg)
                .orElseGet(() -> busRepository.save(Bus.builder()
                        .operator(operator)
                        .registrationNo(reg)
                        .busType(type)
                        .capacity(capacity)
                        .amenities(amenitiesFor(type))
                        .model(model)
                        .year(year)
                        .status(BusStatus.ACTIVE)
                        .createdAt(LocalDateTime.now())
                        .build()));
    }

    // Amenities are data, not marketing copy: the HUD renders exactly what a
    // bus actually carries. Premium (Express) fleet variants get the AC/WiFi/
    // USB/reclining kit; the NORMAL Viking only carries water.
    private String amenitiesFor(BusType type) {
        switch (type) {
            case AC:
                return "[\"WiFi\",\"Water\",\"Charging\",\"AC\"]";
            case LUXURY:
                return "[\"WiFi\",\"Water\",\"Charging\",\"USB\",\"Reclining Seats\",\"AC\"]";
            case SEMI_LUXURY:
                return "[\"WiFi\",\"Water\",\"Charging\",\"USB\",\"AC\"]";
            default:
                return "[\"Water\"]";
        }
    }

    private Route route(String number, RouteType type, String expresswayCode, RouteClass routeClass,
                        String from, String to, BigDecimal distance, int duration) {
        List<Route> existing = routeRepository.findAllByFromCityIgnoreCaseAndToCityIgnoreCase(from, to);
        Route match = existing.stream()
                .filter(r -> Objects.equals(r.getRouteNumber(), number))
                .findFirst()
                .orElse(null);
        if (match != null) {
            return match;
        }
        return routeRepository.save(Route.builder()
                .routeNumber(number)
                .fromCity(from)
                .toCity(to)
                .routeType(type)
                .expresswayCode(expresswayCode)
                .routeClass(routeClass)
                .distanceKm(distance)
                .durationMin(duration)
                .status(RouteStatus.APPROVED)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private void boardingPoint(Route route, String name, int sequence, String city, int offset) {
        BoardingPoint point = BoardingPoint.builder()
                .route(route)
                .name(name)
                .sequence(sequence)
                .city(city)
                .timeOffsetMin(offset)
                .build();
        boardingPointRepository.save(point);
    }

    private void fareRule(Route route, BusType type, BigDecimal base, BigDecimal perKm) {
        fareRuleRepository.save(FareRule.builder()
                .route(route)
                .busType(type)
                .baseFare(base)
                .perKmRate(perKm)
                .surgeMultiplier(BigDecimal.ONE)
                .build());
    }

    private Schedule schedule(BusOperator operator, Route route, Bus bus, LocalTime departure, LocalTime arrival) {
        return scheduleRepository.save(Schedule.builder()
                .route(route)
                .bus(bus)
                .operator(operator)
                .departureTime(departure)
                .arrivalTime(arrival)
                .daysOfWeek("1,2,3,4,5,6,7")
                .effectiveFrom(LocalDate.now().minusDays(1))
                .status(ScheduleStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private BusOperator approvedOperator(Role operatorRole, String name, String regNo, String licenseNo,
                                         String contactPerson, String phone, String address, String email,
                                         String mobile) {
        User owner = user("Owner - " + name, email, mobile, List.of(operatorRole));
        return busOperatorRepository.save(BusOperator.builder()
                .user(owner)
                .name(name)
                .registrationNo(regNo)
                .licenseNo(licenseNo)
                .address(address)
                .contactPerson(contactPerson)
                .phone(phone)
                .email(email)
                .status(OperatorStatus.APPROVED)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private Route exRoute(String number, String from, String to, String km, int min,
                          RouteClass routeClass, String expresswayCode) {
        return route(number, RouteType.EXPRESSWAY, expresswayCode, routeClass,
                from, to, new BigDecimal(km), min);
    }

    private Route classicRoute(String number, String from, String to, String km, int min,
                               RouteClass routeClass) {
        return route(number, RouteType.NORMAL, null, routeClass,
                from, to, new BigDecimal(km), min);
    }

    private List<Schedule> seedRouteCatalogue(BusOperator operator, Bus busAc, Bus busLuxury) {
        record Seed(String number, RouteType type, String expresswayCode, RouteClass routeClass,
                    String from, String to, String distanceKm, int durationMin) {
        }
        List<Seed> seeds = List.of(
                // ---- Expressway services (Southern Expressway E001) ----
                new Seed("EX 1-1", RouteType.EXPRESSWAY, "E001", RouteClass.INTERCITY, "Makumbura", "Matara", "140.00", 170),
                new Seed("EX001", RouteType.EXPRESSWAY, "E001", RouteClass.INTERCITY, "Makumbura", "Galle", "118.00", 140),
                new Seed("EX 1-2", RouteType.EXPRESSWAY, "E001", RouteClass.INTERCITY, "Kaduwela", "Matara", "138.00", 165),
                new Seed("EX 1-21", RouteType.EXPRESSWAY, "E001", RouteClass.INTERCITY, "Kadawatha", "Galle", "124.00", 145),
                new Seed("EX 1-22", RouteType.EXPRESSWAY, "E001", RouteClass.INTERCITY, "Kadawatha", "Matara", "142.00", 170),
                new Seed("EX 1-23", RouteType.EXPRESSWAY, "E001", RouteClass.INTERCITY, "Kaduwela", "Galle", "116.00", 140),
                new Seed("EX 1-25/450", RouteType.EXPRESSWAY, "E001", RouteClass.INTERCITY, "Panadura", "Matara", "132.00", 160),
                new Seed("EX 1-21R", RouteType.EXPRESSWAY, "E001", RouteClass.INTERCITY, "Galle", "Kadawatha", "124.00", 145),
                // ---- Long distance ----
                new Seed("A-Bay", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Maradana", "Akkaraipattu", "290.00", 420),
                new Seed("04", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Colombo", "Kataragama", "290.00", 420),
                new Seed("05", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Colombo", "Anuradhapura", "206.00", 300),
                new Seed("08", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Colombo", "Kalpitiya", "165.00", 280),
                new Seed("11", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Kataragama", "Kandy", "280.00", 420),
                // Renumbered 15 -> 15/3: real-world 15 = Colombo-Trincomalee (added below as classic 15)
                new Seed("15/3", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Kandy", "Monaragala", "190.00", 330),
                // Renumbered 16 -> 16/1: real-world 16 = Nawalapitiya-Colombo via Gampola/Peradeniya (added below)
                new Seed("16/1", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Colombo", "Anuradhapura", "206.00", 300),
                new Seed("31", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Kandy", "Ampara", "260.00", 400),
                new Seed("32", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Matara", "Bandarawela", "160.00", 300),
                new Seed("32/4", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Colombo", "Kataragama", "290.00", 420),
                new Seed("41", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Colombo", "Tangalle", "195.00", 300),
                // Renumbered 48 -> 48/4: real-world 48 = Colombo-Polonaruwa (added below); 48/3 already used for Colombo-Kalmunai
                new Seed("48/4", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Kandy", "Trincomalee", "230.00", 360),
                new Seed("48/3", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Colombo", "Kalmunai", "320.00", 480),
                new Seed("49", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Colombo", "Kaduruwela", "220.00", 330),
                new Seed("57", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Colombo", "Trincomalee", "260.00", 400),
                new Seed("60", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Colombo", "Anuradhapura", "206.00", 300),
                new Seed("64", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Deniyaya", "Colombo", "170.00", 300),
                new Seed("79", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Aluthgama", "Badulla", "250.00", 420),
                new Seed("98", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Arugam Bay", "Ampara", "180.00", 300),
                new Seed("99", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Colombo", "Badulla", "235.00", 390),
                new Seed("138-E01", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Colombo", "Matara", "130.00", 200),
                new Seed("140", RouteType.NORMAL, null, RouteClass.LONG_DISTANCE, "Colombo", "Matara", "130.00", 210),
                // ---- Intercity ----
                new Seed("03", RouteType.NORMAL, null, RouteClass.INTERCITY, "Colombo", "Kandy", "115.00", 195),
                new Seed("06", RouteType.NORMAL, null, RouteClass.INTERCITY, "Colombo", "Kurunegala", "95.00", 180),
                new Seed("07", RouteType.NORMAL, null, RouteClass.INTERCITY, "Colombo", "Kurunegala", "95.00", 180),
                new Seed("09", RouteType.NORMAL, null, RouteClass.INTERCITY, "Colombo", "Matale", "142.00", 240),
                new Seed("09/1", RouteType.NORMAL, null, RouteClass.INTERCITY, "Colombo", "Teldeniya", "160.00", 270),
                new Seed("09/2", RouteType.NORMAL, null, RouteClass.INTERCITY, "Colombo", "Wattegama", "152.00", 255),
                new Seed("10", RouteType.NORMAL, null, RouteClass.INTERCITY, "Colombo", "Digana", "125.00", 210),
                new Seed("13", RouteType.NORMAL, null, RouteClass.INTERCITY, "Matara", "Ratnapura", "90.00", 180),
                new Seed("14", RouteType.NORMAL, null, RouteClass.INTERCITY, "Colombo", "Dayagama", "150.00", 260),
                new Seed("17", RouteType.NORMAL, null, RouteClass.INTERCITY, "Colombo", "Nawalapitiya", "145.00", 250),
                new Seed("18", RouteType.NORMAL, null, RouteClass.INTERCITY, "Kandy", "Panadura", "140.00", 260),
                new Seed("21", RouteType.NORMAL, null, RouteClass.INTERCITY, "Colombo", "Hatton", "160.00", 270),
                new Seed("22", RouteType.NORMAL, null, RouteClass.INTERCITY, "Kandy", "Badulla", "130.00", 240),
                new Seed("45", RouteType.NORMAL, null, RouteClass.INTERCITY, "Kandy", "Kaduruwela", "145.00", 260),
                new Seed("87", RouteType.NORMAL, null, RouteClass.INTERCITY, "Colombo", "Nuwara Eliya", "165.00", 270),
                new Seed("400", RouteType.NORMAL, null, RouteClass.INTERCITY, "Colombo", "Aluthgama", "66.00", 140),
                new Seed("401", RouteType.NORMAL, null, RouteClass.INTERCITY, "Elpitiya", "Colombo", "100.00", 180),
                new Seed("430", RouteType.NORMAL, null, RouteClass.INTERCITY, "Mathugama", "Colombo", "72.00", 150),
                new Seed("450", RouteType.NORMAL, null, RouteClass.INTERCITY, "Panadura", "Ratnapura", "72.00", 150),
                new Seed("602", RouteType.NORMAL, null, RouteClass.INTERCITY, "Kandy", "Kurunegala", "48.00", 100),
                // ---- Suburban ----
                new Seed("100", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Panadura", "Colombo", "24.00", 90),
                new Seed("101", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Moratuwa", "Colombo", "18.00", 70),
                new Seed("102", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Moratuwa", "Kotahena", "20.00", 75),
                new Seed("103", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Moratuwa", "Kotahena", "20.00", 75),
                new Seed("104", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Ja Ela", "Bambalapitiya", "32.00", 100),
                new Seed("120", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Colombo", "Piliyandala", "18.00", 70),
                new Seed("122", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Colombo", "Avissawella", "38.00", 110),
                new Seed("125", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Colombo", "Padukka", "30.00", 95),
                new Seed("138", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Colombo", "Homagama", "25.00", 85),
                new Seed("138/1", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Kirillawala", "Colombo", "20.00", 75),
                new Seed("138/2", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Mattegoda", "Colombo", "22.00", 80),
                new Seed("138/3", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Rukmalgama", "Colombo", "24.00", 85),
                new Seed("143", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Hanwella", "Colombo", "30.00", 95),
                new Seed("154", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Angulana", "Kiribathgoda", "18.00", 70),
                new Seed("164", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Colombo", "Salmal Uyana", "20.00", 70),
                new Seed("170", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Athurugiriya", "Colombo", "22.00", 80),
                new Seed("180", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Nittambuwa", "Colombo", "35.00", 110),
                new Seed("187", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Katunayake Airport", "Colombo", "35.00", 75),
                new Seed("187/1", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Ekala", "Colombo", "24.00", 60),
                new Seed("188", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Raddolugama", "Colombo", "28.00", 80),
                new Seed("200", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Gampaha", "Colombo", "29.00", 80),
                new Seed("224", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Pugoda", "Colombo", "32.00", 100),
                new Seed("225", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Kirindiwala", "Colombo", "35.00", 110),
                new Seed("226", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Malwana", "Colombo", "20.00", 70),
                new Seed("234", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Delgoda", "Colombo", "18.00", 65),
                new Seed("240", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Colombo", "Negombo", "40.00", 90),
                new Seed("255", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Mount Lavinia", "Kottawa", "18.00", 60),
                new Seed("400/1", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Kalutara", "Colombo", "42.00", 100),
                new Seed("401/1", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Elpitiya", "Aluthgama", "60.00", 130),
                new Seed("401/3", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Aluthgama", "Uragasmanhandiya", "55.00", 120),
                new Seed("401/4", RouteType.NORMAL, null, RouteClass.SUBURBAN, "Elpitiya", "Aluthgama", "60.00", 130),
                // ---- City ----
                new Seed("112", RouteType.NORMAL, null, RouteClass.CITY, "Maharagama", "Kotahena", "14.00", 60),
                new Seed("113", RouteType.NORMAL, null, RouteClass.CITY, "Colombo", "Udahamulla", "12.00", 50),
                new Seed("117", RouteType.NORMAL, null, RouteClass.CITY, "Ratmalana Airport", "Nugegoda", "13.00", 45),
                new Seed("119", RouteType.NORMAL, null, RouteClass.CITY, "Maharagama", "Dehiwala", "8.00", 35),
                new Seed("135", RouteType.NORMAL, null, RouteClass.CITY, "Kohuwala", "Kelaniya", "15.00", 60),
                new Seed("144", RouteType.NORMAL, null, RouteClass.CITY, "Rajagiriya", "Colombo", "6.00", 30),
                new Seed("145", RouteType.NORMAL, null, RouteClass.CITY, "Colombo", "Mattakkuliya", "8.00", 35),
                new Seed("152", RouteType.NORMAL, null, RouteClass.CITY, "Colombo", "Angoda", "8.00", 30),
                new Seed("153", RouteType.NORMAL, null, RouteClass.CITY, "Borella", "Kotte", "8.00", 30),
                new Seed("155", RouteType.NORMAL, null, RouteClass.CITY, "Mattakkuliya", "Soysapura", "15.00", 55),
                new Seed("156", RouteType.NORMAL, null, RouteClass.CITY, "Dehiwala", "Nugegoda", "7.00", 30),
                new Seed("163", RouteType.NORMAL, null, RouteClass.CITY, "Dehiwala", "Battaramulla", "12.00", 45),
                new Seed("166", RouteType.NORMAL, null, RouteClass.CITY, "Colombo", "Mulleriyawa", "12.00", 45),
                new Seed("168", RouteType.NORMAL, null, RouteClass.CITY, "Kotahena", "Nugegoda", "10.00", 40),
                new Seed("171", RouteType.NORMAL, null, RouteClass.CITY, "Colombo", "Koswatta", "15.00", 55),
                new Seed("174", RouteType.NORMAL, null, RouteClass.CITY, "Borella", "Kottawa", "14.00", 50),
                new Seed("175", RouteType.NORMAL, null, RouteClass.CITY, "Kohilawatta", "Kollupitiya", "8.00", 30),
                new Seed("176", RouteType.NORMAL, null, RouteClass.CITY, "Kotahena", "Dehiwala", "12.00", 45),
                new Seed("177", RouteType.NORMAL, null, RouteClass.CITY, "Kollupitiya", "Kaduwela", "16.00", 55),
                new Seed("178", RouteType.NORMAL, null, RouteClass.CITY, "Narahenpita", "Mattakkuliya", "10.00", 40),
                new Seed("179", RouteType.NORMAL, null, RouteClass.CITY, "Battaramulla", "Bambalapitiya", "11.00", 45),
                new Seed("183", RouteType.NORMAL, null, RouteClass.CITY, "Nugegoda", "Panadura", "16.00", 60),
                new Seed("190", RouteType.NORMAL, null, RouteClass.CITY, "Colombo", "Godagama", "15.00", 55),
                new Seed("192", RouteType.NORMAL, null, RouteClass.CITY, "Moratuwa", "Maharagama", "14.00", 50),
                new Seed("193", RouteType.NORMAL, null, RouteClass.CITY, "Colombo", "Kadawatha", "14.00", 50),
                new Seed("401/2", RouteType.NORMAL, null, RouteClass.CITY, "Elpitiya", "Goluwamulla", "15.00", 50));

        Map<String, Route> byPair = new HashMap<>();
        for (Seed s : seeds) {
            Route r = route(s.number(), s.type(), s.expresswayCode(), s.routeClass(),
                    s.from(), s.to(), new BigDecimal(s.distanceKm()), s.durationMin());
            byPair.put(s.from() + "->" + s.to(), r);
            boolean express = r.getRouteType() == RouteType.EXPRESSWAY;
            boardingPoint(r, express ? s.from() + " Expressway Terminus" : s.from() + " Bus Stand", 1, s.from(), 0);
            boardingPoint(r, express ? s.to() + " Expressway Terminus" : s.to() + " Bus Stand", 2, s.to(), s.durationMin());
        }

        Route ex11 = byPair.get("Makumbura->Matara");
        Route ex001 = byPair.get("Makumbura->Galle");
        Route ex12 = byPair.get("Kaduwela->Matara");
        Route ex121 = byPair.get("Kadawatha->Galle");
        Route ex122 = byPair.get("Kadawatha->Matara");
        Route ex123 = byPair.get("Kaduwela->Galle");
        Route ex1225 = byPair.get("Panadura->Matara");
        Route ex121r = byPair.get("Galle->Kadawatha");

        fareRule(ex11, BusType.AC, new BigDecimal("1900.00"), new BigDecimal("0.00"));
        fareRule(ex11, BusType.LUXURY, new BigDecimal("1600.00"), new BigDecimal("0.00"));
        fareRule(ex001, BusType.AC, new BigDecimal("1600.00"), new BigDecimal("0.00"));
        fareRule(ex001, BusType.LUXURY, new BigDecimal("1350.00"), new BigDecimal("0.00"));
        fareRule(ex12, BusType.AC, new BigDecimal("1850.00"), new BigDecimal("0.00"));
        fareRule(ex12, BusType.LUXURY, new BigDecimal("1550.00"), new BigDecimal("0.00"));
        fareRule(ex121, BusType.AC, new BigDecimal("1650.00"), new BigDecimal("0.00"));
        fareRule(ex121, BusType.LUXURY, new BigDecimal("1400.00"), new BigDecimal("0.00"));
        fareRule(ex122, BusType.AC, new BigDecimal("1900.00"), new BigDecimal("0.00"));
        fareRule(ex122, BusType.LUXURY, new BigDecimal("1600.00"), new BigDecimal("0.00"));
        fareRule(ex123, BusType.AC, new BigDecimal("1550.00"), new BigDecimal("0.00"));
        fareRule(ex123, BusType.LUXURY, new BigDecimal("1300.00"), new BigDecimal("0.00"));
        fareRule(ex1225, BusType.AC, new BigDecimal("1750.00"), new BigDecimal("0.00"));
        fareRule(ex1225, BusType.LUXURY, new BigDecimal("1450.00"), new BigDecimal("0.00"));
        fareRule(ex121r, BusType.AC, new BigDecimal("1650.00"), new BigDecimal("0.00"));
        fareRule(ex121r, BusType.LUXURY, new BigDecimal("1400.00"), new BigDecimal("0.00"));

        List<Schedule> expressSchedules = new ArrayList<>();
        expressSchedules.add(schedule(operator, ex11, busAc, LocalTime.of(6, 0), LocalTime.of(8, 50)));
        expressSchedules.add(schedule(operator, ex11, busLuxury, LocalTime.of(10, 30), LocalTime.of(13, 20)));
        expressSchedules.add(schedule(operator, ex001, busAc, LocalTime.of(7, 30), LocalTime.of(9, 50)));
        expressSchedules.add(schedule(operator, ex121, busLuxury, LocalTime.of(9, 0), LocalTime.of(11, 25)));
        expressSchedules.add(schedule(operator, ex1225, busAc, LocalTime.of(16, 0), LocalTime.of(18, 40)));
        return expressSchedules;
    }

    /**
     * Seeds the user's expressway corridor network (E01 Southern Expressway + E03 Colombo-Katunayake
     * Expressway) and the real-world classic numbered routes. Every new operator is APPROVED with a
     * unique registration/license number, a unique @vygo.lk email, the OPERATOR role and password123.
     * Returns every schedule so the caller materializes 7 days of trips.
     */
    private List<Schedule> seedExpresswayAndClassicCatalogue(Role operatorRole) {
        // ---- 1. Approved operators (unique regNo / licenseNo / email / mobile) ----
        BusOperator expresswayBus = approvedOperator(operatorRole, "Expressway Bus", "PV-3001", "L-301",
                "Ravi Jayasinghe", "0113000001", "No 3, Expressway Terminal, Colombo 10",
                "expresswaybus@vygo.lk", "0773000001");
        BusOperator sltb = approvedOperator(operatorRole, "SLTB", "PV-3002", "L-302",
                "Director - Long Distance", "0113000002", "No 200, Kirulapone, Colombo 05",
                "sltb@vygo.lk", "0773000002");
        BusOperator slttsKatubadda = approvedOperator(operatorRole, "SLTTS Katubadda", "PV-3003", "L-303",
                "Depot Manager Katubadda", "0113000003", "Katubadda, Moratuwa",
                "sltts.katubadda@vygo.lk", "0773000003");
        BusOperator singhegiri = approvedOperator(operatorRole, "Singhegiri Transport", "PV-3004", "L-304",
                "Anura Singhegiri", "0113000004", "No 8, Ambalangoda Road, Galle",
                "singhegiri@vygo.lk", "0773000004");
        BusOperator jayalath = approvedOperator(operatorRole, "Jayalath Traders", "PV-3005", "L-305",
                "Jayalath Fernando", "0113000005", "No 21, Colombo Road, Galle",
                "jayalath.traders@vygo.lk", "0773000005");
        BusOperator sltbKataragama = approvedOperator(operatorRole, "SLTB Kataragama", "PV-3006", "L-306",
                "Depot Manager Kataragama", "0113000006", "Kataragama Bus Depot",
                "sltb.kataragama@vygo.lk", "0773000006");
        BusOperator dilanka = approvedOperator(operatorRole, "Dilanka Express", "PV-3007", "L-307",
                "Dilanka Weerasinghe", "0113000007", "No 14, Ampara Road, Ampara",
                "dilanka.express@vygo.lk", "0773000007");
        BusOperator greenLeaf = approvedOperator(operatorRole, "GreenLeaf", "PV-3008", "L-308",
                "Saman Gunawardena", "0113000008", "No 22, Mahiyanganaya Road, Ampara",
                "greenleaf@vygo.lk", "0773000008");
        BusOperator liyanage = approvedOperator(operatorRole, "Liyanage Express", "PV-3009", "L-309",
                "Upul Liyanage", "0113000009", "No 5, Akkaraipattu Road, Ampara",
                "liyanage.express@vygo.lk", "0773000009");
        BusOperator skSons = approvedOperator(operatorRole, "SK Sons", "PV-3010", "L-310",
                "S. K. Rizan", "0113000010", "No 33, Main Street, Ampara",
                "sksons@vygo.lk", "0773000010");
        BusOperator namali = approvedOperator(operatorRole, "Namali Travels", "PV-3011", "L-311",
                "Namali Bandara", "0113000011", "No 12, Lower Tank Road, Badulla",
                "namali.travels@vygo.lk", "0773000011");
        BusOperator namunukula = approvedOperator(operatorRole, "Namunukula Highway Express", "PV-3012", "L-312",
                "Chaminda Pushpakumara", "0113000012", "No 7, Havelock Road, Badulla",
                "namunukula.highway@vygo.lk", "0773000012");
        BusOperator ncg = approvedOperator(operatorRole, "NCG Express", "PV-3013", "L-313",
                "N. C. G. Peiris", "0113000013", "No 9, Ella Road, Badulla",
                "ncg.express@vygo.lk", "0773000013");
        BusOperator vishmitha = approvedOperator(operatorRole, "Vishmitha Highway", "PV-3014", "L-314",
                "Vishmitha Silva", "0113000014", "No 18, Station Road, Ella",
                "vishmitha.highway@vygo.lk", "0773000014");
        BusOperator maleesha = approvedOperator(operatorRole, "Maleesha Tours", "PV-3015", "L-315",
                "Maleesha Rajapaksha", "0113000015", "No 4, Matale Road, Matale",
                "maleesha.tours@vygo.lk", "0773000015");
        BusOperator jaffnaTravels = approvedOperator(operatorRole, "Jaffna Travels", "PV-3016", "L-316",
                "Sivakumar Pathmanathan", "0113000016", "No 25, Stanley Road, Jaffna",
                "jaffna.travels@vygo.lk", "0773000016");

        // ---- 2. Buses (unique registration numbers) ----
        // Fleet upgrade: every Express coach in the catalogue is a Yutong C12 Pro
        // (51-53 seats, 52 here) and every Normal service an Ashok Leyland Viking
        // (allowed 42/44/49/54/58, 58 here) so both fleet vehicles are exercised.
        Bus exAc = bus(expresswayBus, "NW-2301", BusType.AC, 52, "Yutong C12 Pro", 2022);
        Bus exLux = bus(expresswayBus, "NW-2302", BusType.LUXURY, 52, "Yutong C12 Pro", 2021);
        Bus sltbLux = bus(sltb, "SLTB-301", BusType.LUXURY, 52, "Yutong C12 Pro", 2021);
        Bus sltbNormalA = bus(sltb, "SLTB-302", BusType.NORMAL, 58, "Ashok Leyland Viking", 2020);
        Bus sltbNormalB = bus(sltb, "SLTB-303", BusType.NORMAL, 58, "Ashok Leyland Viking", 2019);
        Bus sltbAc = bus(sltb, "SLTB-304", BusType.AC, 52, "Yutong C12 Pro", 2022);
        Bus katAc = bus(slttsKatubadda, "KT-2501", BusType.AC, 52, "Yutong C12 Pro", 2021);
        Bus katLux = bus(slttsKatubadda, "KT-2502", BusType.LUXURY, 52, "Yutong C12 Pro", 2020);
        Bus singAc = bus(singhegiri, "SG-2601", BusType.AC, 52, "Yutong C12 Pro", 2022);
        Bus singLux = bus(singhegiri, "SG-2602", BusType.LUXURY, 52, "Yutong C12 Pro", 2021);
        Bus jayAc = bus(jayalath, "JT-2701", BusType.AC, 52, "Yutong C12 Pro", 2021);
        Bus katgAc = bus(sltbKataragama, "KG-2801", BusType.AC, 52, "Yutong C12 Pro", 2022);
        Bus katgNormal = bus(sltbKataragama, "KG-2802", BusType.NORMAL, 58, "Ashok Leyland Viking", 2020);
        Bus dilAc = bus(dilanka, "DE-2901", BusType.AC, 52, "Yutong C12 Pro", 2022);
        Bus greenLux = bus(greenLeaf, "GL-3001", BusType.LUXURY, 52, "Yutong C12 Pro", 2021);
        Bus liyAc = bus(liyanage, "LE-3101", BusType.AC, 52, "Yutong C12 Pro", 2021);
        Bus skNormal = bus(skSons, "SK-3201", BusType.NORMAL, 58, "Ashok Leyland Viking", 2019);
        Bus namaliLux = bus(namali, "NM-3301", BusType.LUXURY, 52, "Yutong C12 Pro", 2022);
        Bus namuAc = bus(namunukula, "NH-3401", BusType.AC, 52, "Yutong C12 Pro", 2021);
        Bus ncgLux = bus(ncg, "NC-3501", BusType.LUXURY, 52, "Yutong C12 Pro", 2022);
        Bus ncgAc = bus(ncg, "NC-3502", BusType.AC, 52, "Yutong C12 Pro", 2021);
        Bus vishAc = bus(vishmitha, "VH-3601", BusType.AC, 52, "Yutong C12 Pro", 2021);
        Bus maleeshaAc = bus(maleesha, "MT-3701", BusType.AC, 52, "Yutong C12 Pro", 2022);
        Bus maleeshaLux = bus(maleesha, "MT-3702", BusType.LUXURY, 52, "Yutong C12 Pro", 2021);
        Bus jaffnaAc = bus(jaffnaTravels, "JF-3801", BusType.AC, 52, "Yutong C12 Pro", 2022);
        Bus jaffnaLux = bus(jaffnaTravels, "JF-3802", BusType.LUXURY, 52, "Yutong C12 Pro", 2021);

        List<Schedule> schedules = new ArrayList<>();

        // ---- Corridor 1: Colombo / Makumbura <-> Kandy (E01 + Central Expressway link roads) ----
        Route ex21 = exRoute("EX 2-1", "Colombo", "Kandy", "125.00", 180, RouteClass.INTERCITY, "E001");
        Route ex22 = exRoute("EX 2-2", "Makumbura", "Kandy", "115.00", 165, RouteClass.INTERCITY, "E001");
        boardingPoint(ex21, "Colombo Expressway Terminus", 1, "Colombo", 0);
        boardingPoint(ex21, "Kottawa Interchange", 2, "Kottawa", 15);
        boardingPoint(ex21, "Gelanigama Interchange", 3, "Gelanigama", 40);
        boardingPoint(ex21, "Kandy Expressway Terminus", 4, "Kandy", 180);
        boardingPoint(ex22, "Makumbura Expressway Terminus", 1, "Makumbura", 0);
        boardingPoint(ex22, "Kadawatha Interchange", 2, "Kadawatha", 25);
        boardingPoint(ex22, "Gelanigama Interchange", 3, "Gelanigama", 45);
        boardingPoint(ex22, "Kandy Expressway Terminus", 4, "Kandy", 165);
        fareRule(ex21, BusType.AC, new BigDecimal("1800.00"), new BigDecimal("0.00"));
        fareRule(ex21, BusType.LUXURY, new BigDecimal("1500.00"), new BigDecimal("0.00"));
        fareRule(ex21, BusType.NORMAL, new BigDecimal("1000.00"), new BigDecimal("0.00"));
        fareRule(ex22, BusType.AC, new BigDecimal("1700.00"), new BigDecimal("0.00"));
        fareRule(ex22, BusType.LUXURY, new BigDecimal("1450.00"), new BigDecimal("0.00"));
        schedules.add(schedule(expresswayBus, ex21, exLux, LocalTime.of(6, 30), LocalTime.of(9, 30)));
        schedules.add(schedule(expresswayBus, ex21, exAc, LocalTime.of(15, 0), LocalTime.of(18, 0)));
        schedules.add(schedule(sltb, ex21, sltbNormalA, LocalTime.of(11, 0), LocalTime.of(14, 30)));
        schedules.add(schedule(expresswayBus, ex22, exAc, LocalTime.of(7, 0), LocalTime.of(9, 45)));
        schedules.add(schedule(sltb, ex22, sltbLux, LocalTime.of(13, 0), LocalTime.of(15, 45)));

        // ---- Corridor 2: Colombo <-> Galle / Matara (E01 Southern Expressway) ----
        Route ex23 = exRoute("EX 2-3", "Colombo", "Galle", "130.00", 150, RouteClass.INTERCITY, "E001");
        Route ex24 = exRoute("EX 2-4", "Colombo", "Matara", "150.00", 175, RouteClass.INTERCITY, "E001");
        boardingPoint(ex23, "Colombo Expressway Terminus", 1, "Colombo", 0);
        boardingPoint(ex23, "Kottawa Interchange", 2, "Kottawa", 15);
        boardingPoint(ex23, "Baddegama Interchange", 3, "Baddegama", 110);
        boardingPoint(ex23, "Galle Expressway Terminus", 4, "Galle", 150);
        boardingPoint(ex24, "Colombo Expressway Terminus", 1, "Colombo", 0);
        boardingPoint(ex24, "Kokmaduwa Interchange", 2, "Kokmaduwa", 130);
        boardingPoint(ex24, "Matara Expressway Terminus", 3, "Matara", 175);
        fareRule(ex23, BusType.AC, new BigDecimal("1500.00"), new BigDecimal("0.00"));
        fareRule(ex23, BusType.LUXURY, new BigDecimal("1250.00"), new BigDecimal("0.00"));
        fareRule(ex24, BusType.AC, new BigDecimal("1850.00"), new BigDecimal("0.00"));
        fareRule(ex24, BusType.LUXURY, new BigDecimal("1550.00"), new BigDecimal("0.00"));
        schedules.add(schedule(slttsKatubadda, ex23, katAc, LocalTime.of(6, 0), LocalTime.of(8, 30)));
        schedules.add(schedule(singhegiri, ex23, singLux, LocalTime.of(9, 30), LocalTime.of(12, 0)));
        schedules.add(schedule(jayalath, ex23, jayAc, LocalTime.of(16, 30), LocalTime.of(19, 0)));
        schedules.add(schedule(slttsKatubadda, ex24, katLux, LocalTime.of(7, 0), LocalTime.of(9, 55)));
        schedules.add(schedule(singhegiri, ex24, singAc, LocalTime.of(14, 0), LocalTime.of(16, 55)));

        // ---- Corridor 3: Colombo <-> Tangalle (E01 to Hambantota + A2) ----
        Route ex25 = exRoute("EX 2-5", "Colombo", "Tangalle", "195.00", 235, RouteClass.LONG_DISTANCE, "E001");
        boardingPoint(ex25, "Colombo Expressway Terminus", 1, "Colombo", 0);
        boardingPoint(ex25, "Beliatta Interchange", 2, "Beliatta", 160);
        boardingPoint(ex25, "Tangalle Bus Stand", 3, "Tangalle", 235);
        fareRule(ex25, BusType.AC, new BigDecimal("2300.00"), new BigDecimal("0.00"));
        fareRule(ex25, BusType.LUXURY, new BigDecimal("2000.00"), new BigDecimal("0.00"));
        schedules.add(schedule(expresswayBus, ex25, exAc, LocalTime.of(6, 30), LocalTime.of(10, 25)));
        schedules.add(schedule(sltb, ex25, sltbLux, LocalTime.of(13, 30), LocalTime.of(17, 25)));

        // ---- Corridor 4: Colombo <-> Kataragama (E01 + Mattala Highway) ----
        Route ex26 = exRoute("EX 2-6", "Colombo", "Kataragama", "290.00", 330, RouteClass.LONG_DISTANCE, "E001");
        boardingPoint(ex26, "Colombo Expressway Terminus", 1, "Colombo", 0);
        boardingPoint(ex26, "Mattala Interchange", 2, "Mattala", 260);
        boardingPoint(ex26, "Kataragama Bus Stand", 3, "Kataragama", 330);
        fareRule(ex26, BusType.AC, new BigDecimal("2400.00"), new BigDecimal("0.00"));
        fareRule(ex26, BusType.LUXURY, new BigDecimal("2100.00"), new BigDecimal("0.00"));
        fareRule(ex26, BusType.NORMAL, new BigDecimal("1600.00"), new BigDecimal("0.00"));
        schedules.add(schedule(sltbKataragama, ex26, katgAc, LocalTime.of(5, 30), LocalTime.of(11, 0)));
        schedules.add(schedule(sltbKataragama, ex26, katgNormal, LocalTime.of(15, 0), LocalTime.of(21, 0)));
        schedules.add(schedule(expresswayBus, ex26, exLux, LocalTime.of(8, 30), LocalTime.of(14, 0)));

        // ---- Corridor 5: E01 exits - Middeniya / Walasmulla / Beliatta / Hakmana ----
        Route ex27 = exRoute("EX 2-7", "Colombo", "Middeniya", "175.00", 215, RouteClass.INTERCITY, "E001");
        Route ex28 = exRoute("EX 2-8", "Colombo", "Walasmulla", "165.00", 205, RouteClass.INTERCITY, "E001");
        Route ex29 = exRoute("EX 2-9", "Colombo", "Beliatta", "158.00", 195, RouteClass.INTERCITY, "E001");
        Route ex210 = exRoute("EX 2-10", "Colombo", "Hakmana", "148.00", 185, RouteClass.INTERCITY, "E001");
        boardingPoint(ex27, "Colombo Expressway Terminus", 1, "Colombo", 0);
        boardingPoint(ex27, "Beliatta Interchange", 2, "Beliatta", 150);
        boardingPoint(ex27, "Middeniya Bus Stand", 3, "Middeniya", 215);
        boardingPoint(ex28, "Colombo Expressway Terminus", 1, "Colombo", 0);
        boardingPoint(ex28, "Beliatta Interchange", 2, "Beliatta", 150);
        boardingPoint(ex28, "Walasmulla Bus Stand", 3, "Walasmulla", 205);
        boardingPoint(ex29, "Colombo Expressway Terminus", 1, "Colombo", 0);
        boardingPoint(ex29, "Beliatta Expressway Terminus", 2, "Beliatta", 195);
        boardingPoint(ex210, "Colombo Expressway Terminus", 1, "Colombo", 0);
        boardingPoint(ex210, "Beliatta Interchange", 2, "Beliatta", 150);
        boardingPoint(ex210, "Hakmana Bus Stand", 3, "Hakmana", 185);
        fareRule(ex27, BusType.AC, new BigDecimal("2200.00"), new BigDecimal("0.00"));
        fareRule(ex28, BusType.AC, new BigDecimal("2100.00"), new BigDecimal("0.00"));
        fareRule(ex29, BusType.LUXURY, new BigDecimal("1900.00"), new BigDecimal("0.00"));
        fareRule(ex210, BusType.LUXURY, new BigDecimal("1800.00"), new BigDecimal("0.00"));
        schedules.add(schedule(singhegiri, ex27, singAc, LocalTime.of(6, 15), LocalTime.of(9, 50)));
        schedules.add(schedule(slttsKatubadda, ex28, katAc, LocalTime.of(7, 15), LocalTime.of(10, 40)));
        schedules.add(schedule(singhegiri, ex29, singLux, LocalTime.of(8, 15), LocalTime.of(11, 30)));
        schedules.add(schedule(slttsKatubadda, ex210, katLux, LocalTime.of(13, 15), LocalTime.of(16, 20)));

        // ---- Corridor 6: Ampara / Siyambalanduwa <-> Makumbura (via Wellawaya, Mattala, E01) ----
        Route ex211 = exRoute("EX 2-11", "Ampara", "Makumbura", "305.00", 360, RouteClass.LONG_DISTANCE, "E001");
        Route ex212 = exRoute("EX 2-12", "Siyambalanduwa", "Makumbura", "275.00", 330, RouteClass.LONG_DISTANCE, "E001");
        boardingPoint(ex211, "Ampara Bus Stand", 1, "Ampara", 0);
        boardingPoint(ex211, "Wellawaya Interchange", 2, "Wellawaya", 120);
        boardingPoint(ex211, "Mattala Interchange", 3, "Mattala", 200);
        boardingPoint(ex211, "Makumbura Expressway Terminus", 4, "Makumbura", 360);
        boardingPoint(ex212, "Siyambalanduwa Bus Stand", 1, "Siyambalanduwa", 0);
        boardingPoint(ex212, "Wellawaya Interchange", 2, "Wellawaya", 60);
        boardingPoint(ex212, "Mattala Interchange", 3, "Mattala", 170);
        boardingPoint(ex212, "Makumbura Expressway Terminus", 4, "Makumbura", 330);
        fareRule(ex211, BusType.AC, new BigDecimal("2400.00"), new BigDecimal("0.00"));
        fareRule(ex211, BusType.LUXURY, new BigDecimal("2100.00"), new BigDecimal("0.00"));
        fareRule(ex212, BusType.AC, new BigDecimal("2300.00"), new BigDecimal("0.00"));
        fareRule(ex212, BusType.NORMAL, new BigDecimal("1550.00"), new BigDecimal("0.00"));
        schedules.add(schedule(dilanka, ex211, dilAc, LocalTime.of(4, 30), LocalTime.of(10, 30)));
        schedules.add(schedule(greenLeaf, ex211, greenLux, LocalTime.of(15, 0), LocalTime.of(21, 0)));
        schedules.add(schedule(liyanage, ex212, liyAc, LocalTime.of(5, 0), LocalTime.of(10, 30)));
        schedules.add(schedule(skSons, ex212, skNormal, LocalTime.of(14, 30), LocalTime.of(20, 0)));

        // ---- Corridor 7: Badulla / Ella <-> Makumbura (E01 + highway) ----
        Route ex213 = exRoute("EX 2-13", "Badulla", "Makumbura", "255.00", 300, RouteClass.LONG_DISTANCE, "E001");
        Route ex214 = exRoute("EX 2-14", "Ella", "Makumbura", "240.00", 285, RouteClass.LONG_DISTANCE, "E001");
        boardingPoint(ex213, "Badulla Bus Stand", 1, "Badulla", 0);
        boardingPoint(ex213, "Ella", 2, "Ella", 45);
        boardingPoint(ex213, "Wellawaya Interchange", 3, "Wellawaya", 90);
        boardingPoint(ex213, "Makumbura Expressway Terminus", 4, "Makumbura", 300);
        boardingPoint(ex214, "Ella Bus Stand", 1, "Ella", 0);
        boardingPoint(ex214, "Wellawaya Interchange", 2, "Wellawaya", 45);
        boardingPoint(ex214, "Mattala Interchange", 3, "Mattala", 155);
        boardingPoint(ex214, "Makumbura Expressway Terminus", 4, "Makumbura", 285);
        fareRule(ex213, BusType.AC, new BigDecimal("2400.00"), new BigDecimal("0.00"));
        fareRule(ex213, BusType.LUXURY, new BigDecimal("2100.00"), new BigDecimal("0.00"));
        fareRule(ex214, BusType.AC, new BigDecimal("2300.00"), new BigDecimal("0.00"));
        fareRule(ex214, BusType.LUXURY, new BigDecimal("2000.00"), new BigDecimal("0.00"));
        schedules.add(schedule(namali, ex213, namaliLux, LocalTime.of(5, 30), LocalTime.of(10, 30)));
        schedules.add(schedule(namunukula, ex213, namuAc, LocalTime.of(13, 30), LocalTime.of(18, 30)));
        schedules.add(schedule(ncg, ex214, ncgAc, LocalTime.of(6, 0), LocalTime.of(10, 45)));
        schedules.add(schedule(vishmitha, ex214, vishAc, LocalTime.of(14, 0), LocalTime.of(18, 45)));

        // ---- Corridor 8: Matale / Kurunegala <-> Maharagama ----
        Route ex215 = exRoute("EX 2-15", "Matale", "Maharagama", "148.00", 205, RouteClass.INTERCITY, "E001");
        Route ex216 = exRoute("EX 2-16", "Kurunegala", "Maharagama", "118.00", 165, RouteClass.INTERCITY, "E001");
        boardingPoint(ex215, "Matale Bus Stand", 1, "Matale", 0);
        boardingPoint(ex215, "Kandy", 2, "Kandy", 30);
        boardingPoint(ex215, "Kadawatha Interchange", 3, "Kadawatha", 120);
        boardingPoint(ex215, "Maharagama Bus Stand", 4, "Maharagama", 205);
        boardingPoint(ex216, "Kurunegala Bus Stand", 1, "Kurunegala", 0);
        boardingPoint(ex216, "Kadawatha Interchange", 2, "Kadawatha", 75);
        boardingPoint(ex216, "Maharagama Bus Stand", 3, "Maharagama", 165);
        fareRule(ex215, BusType.AC, new BigDecimal("1900.00"), new BigDecimal("0.00"));
        fareRule(ex215, BusType.LUXURY, new BigDecimal("1650.00"), new BigDecimal("0.00"));
        fareRule(ex216, BusType.AC, new BigDecimal("1700.00"), new BigDecimal("0.00"));
        fareRule(ex216, BusType.LUXURY, new BigDecimal("1450.00"), new BigDecimal("0.00"));
        schedules.add(schedule(maleesha, ex215, maleeshaAc, LocalTime.of(5, 30), LocalTime.of(8, 55)));
        schedules.add(schedule(maleesha, ex215, maleeshaLux, LocalTime.of(15, 30), LocalTime.of(18, 55)));
        schedules.add(schedule(maleesha, ex216, maleeshaLux, LocalTime.of(6, 30), LocalTime.of(9, 15)));

        // ---- Corridor 9: Kadawatha <-> Panadura western connector (surface; no expressway alignment) ----
        Route ex217 = classicRoute("EX 2-17", "Kadawatha", "Panadura", "42.00", 90, RouteClass.INTERCITY);
        boardingPoint(ex217, "Kadawatha Bus Stand", 1, "Kadawatha", 0);
        boardingPoint(ex217, "Kollupitiya", 2, "Kollupitiya", 40);
        boardingPoint(ex217, "Panadura Bus Stand", 3, "Panadura", 90);
        fareRule(ex217, BusType.NORMAL, new BigDecimal("350.00"), new BigDecimal("0.00"));
        fareRule(ex217, BusType.LUXURY, new BigDecimal("600.00"), new BigDecimal("0.00"));
        schedules.add(schedule(sltb, ex217, sltbNormalA, LocalTime.of(6, 0), LocalTime.of(7, 30)));
        schedules.add(schedule(sltb, ex217, sltbLux, LocalTime.of(15, 0), LocalTime.of(16, 30)));

        // ---- Corridor 10: Colombo <-> Katunayake / Negombo (E03 Colombo-Katunayake Expressway) ----
        Route ex31 = exRoute("EX 3-1", "Colombo", "Katunayake Airport", "35.00", 40, RouteClass.INTERCITY, "E003");
        Route ex32 = exRoute("EX 3-2", "Colombo", "Negombo", "40.00", 50, RouteClass.INTERCITY, "E003");
        boardingPoint(ex31, "Colombo Expressway Terminus", 1, "Colombo", 0);
        boardingPoint(ex31, "Katunayake Airport Expressway Terminus", 2, "Katunayake Airport", 40);
        boardingPoint(ex32, "Colombo Expressway Terminus", 1, "Colombo", 0);
        boardingPoint(ex32, "Negombo Expressway Terminus", 2, "Negombo", 50);
        fareRule(ex31, BusType.LUXURY, new BigDecimal("900.00"), new BigDecimal("0.00"));
        fareRule(ex32, BusType.AC, new BigDecimal("950.00"), new BigDecimal("0.00"));
        schedules.add(schedule(sltb, ex31, sltbLux, LocalTime.of(6, 0), LocalTime.of(6, 40)));
        schedules.add(schedule(sltb, ex31, sltbLux, LocalTime.of(14, 0), LocalTime.of(14, 40)));
        schedules.add(schedule(expresswayBus, ex32, exAc, LocalTime.of(8, 0), LocalTime.of(8, 50)));

        // ---- Corridor 11: Colombo (Pettah) <-> Jaffna / Vavuniya (A9 + expressway sections) ----
        Route ex218 = classicRoute("EX 2-18", "Pettah", "Vavuniya", "300.00", 360, RouteClass.LONG_DISTANCE);
        Route ex219 = classicRoute("EX 2-19", "Pettah", "Jaffna", "400.00", 450, RouteClass.LONG_DISTANCE);
        boardingPoint(ex218, "Pettah Bus Stand", 1, "Pettah", 0);
        boardingPoint(ex218, "Anuradhapura", 2, "Anuradhapura", 240);
        boardingPoint(ex218, "Vavuniya Bus Stand", 3, "Vavuniya", 360);
        boardingPoint(ex219, "Pettah Bus Stand", 1, "Pettah", 0);
        boardingPoint(ex219, "Anuradhapura", 2, "Anuradhapura", 240);
        boardingPoint(ex219, "Vavuniya", 3, "Vavuniya", 330);
        boardingPoint(ex219, "Jaffna Bus Stand", 4, "Jaffna", 450);
        fareRule(ex218, BusType.AC, new BigDecimal("2600.00"), new BigDecimal("0.00"));
        fareRule(ex218, BusType.LUXURY, new BigDecimal("2300.00"), new BigDecimal("0.00"));
        fareRule(ex218, BusType.NORMAL, new BigDecimal("1800.00"), new BigDecimal("0.00"));
        fareRule(ex219, BusType.AC, new BigDecimal("3400.00"), new BigDecimal("0.00"));
        fareRule(ex219, BusType.LUXURY, new BigDecimal("2900.00"), new BigDecimal("0.00"));
        fareRule(ex219, BusType.NORMAL, new BigDecimal("1900.00"), new BigDecimal("0.00"));
        schedules.add(schedule(sltb, ex218, sltbAc, LocalTime.of(5, 30), LocalTime.of(11, 30)));
        schedules.add(schedule(jaffnaTravels, ex218, jaffnaLux, LocalTime.of(16, 0), LocalTime.of(22, 0)));
        schedules.add(schedule(sltb, ex219, sltbNormalB, LocalTime.of(4, 30), LocalTime.of(12, 0)));
        schedules.add(schedule(jaffnaTravels, ex219, jaffnaAc, LocalTime.of(15, 0), LocalTime.of(22, 30)));

        // ---- Classic numbered routes (NORMAL type, real-world SLTB numbers) ----
        // 4 Colombo-Ratnapura (manual 01/02/30/34 untouched)
        Route r4 = classicRoute("4", "Colombo", "Ratnapura", "105.00", 210, RouteClass.LONG_DISTANCE);
        boardingPoint(r4, "Colombo Bastian Mawatha", 1, "Colombo", 0);
        boardingPoint(r4, "Avissawella", 2, "Avissawella", 80);
        boardingPoint(r4, "Ratnapura Bus Stand", 3, "Ratnapura", 210);
        fareRule(r4, BusType.NORMAL, new BigDecimal("900.00"), new BigDecimal("0.00"));
        schedules.add(schedule(sltb, r4, sltbNormalA, LocalTime.of(6, 15), LocalTime.of(9, 45)));

        // 15 Colombo-Trincomalee (old seed 15 renumbered to 15/3 Kandy-Monaragala)
        Route r15 = classicRoute("15", "Colombo", "Trincomalee", "260.00", 400, RouteClass.LONG_DISTANCE);
        boardingPoint(r15, "Colombo Bastian Mawatha", 1, "Colombo", 0);
        boardingPoint(r15, "Dambulla", 2, "Dambulla", 180);
        boardingPoint(r15, "Trincomalee Bus Stand", 3, "Trincomalee", 400);
        fareRule(r15, BusType.NORMAL, new BigDecimal("1800.00"), new BigDecimal("0.00"));
        schedules.add(schedule(sltb, r15, sltbNormalB, LocalTime.of(5, 0), LocalTime.of(11, 40)));

        // 16 Nawalapitiya-Colombo via Gampola/Peradeniya (old seed 16 renumbered to 16/1 Colombo-Anuradhapura)
        Route r16 = classicRoute("16", "Nawalapitiya", "Colombo", "145.00", 250, RouteClass.INTERCITY);
        boardingPoint(r16, "Nawalapitiya Bus Stand", 1, "Nawalapitiya", 0);
        boardingPoint(r16, "Gampola", 2, "Gampola", 30);
        boardingPoint(r16, "Peradeniya Junction", 3, "Kandy", 60);
        boardingPoint(r16, "Colombo Bastian Mawatha", 4, "Colombo", 250);
        fareRule(r16, BusType.NORMAL, new BigDecimal("1200.00"), new BigDecimal("0.00"));
        schedules.add(schedule(sltb, r16, sltbNormalA, LocalTime.of(6, 30), LocalTime.of(10, 40)));

        // 17/57 Maharagama-Anuradhapura (17 kept as Colombo-Nawalapitiya)
        Route r1757 = classicRoute("17/57", "Maharagama", "Anuradhapura", "220.00", 330, RouteClass.LONG_DISTANCE);
        boardingPoint(r1757, "Maharagama Bus Stand", 1, "Maharagama", 0);
        boardingPoint(r1757, "Kurunegala", 2, "Kurunegala", 120);
        boardingPoint(r1757, "Anuradhapura Bus Stand", 3, "Anuradhapura", 330);
        fareRule(r1757, BusType.NORMAL, new BigDecimal("1600.00"), new BigDecimal("0.00"));
        schedules.add(schedule(sltb, r1757, sltbNormalB, LocalTime.of(5, 45), LocalTime.of(11, 15)));

        // 47 Kandy-Nuwara Eliya
        Route r47 = classicRoute("47", "Kandy", "Nuwara Eliya", "75.00", 150, RouteClass.INTERCITY);
        boardingPoint(r47, "Kandy Clock Tower", 1, "Kandy", 0);
        boardingPoint(r47, "Nuwara Eliya Bus Stand", 2, "Nuwara Eliya", 150);
        fareRule(r47, BusType.NORMAL, new BigDecimal("600.00"), new BigDecimal("0.00"));
        schedules.add(schedule(sltb, r47, sltbNormalA, LocalTime.of(7, 0), LocalTime.of(9, 30)));

        // 48 Colombo-Polonaruwa (old seed 48 renumbered to 48/4 Kandy-Trincomalee; 48/3 already = Colombo-Kalmunai)
        Route r48 = classicRoute("48", "Colombo", "Polonnaruwa", "220.00", 330, RouteClass.LONG_DISTANCE);
        boardingPoint(r48, "Colombo Bastian Mawatha", 1, "Colombo", 0);
        boardingPoint(r48, "Kaduruwela", 2, "Kaduruwela", 300);
        boardingPoint(r48, "Polonnaruwa Bus Stand", 3, "Polonnaruwa", 330);
        fareRule(r48, BusType.NORMAL, new BigDecimal("1700.00"), new BigDecimal("0.00"));
        schedules.add(schedule(sltb, r48, sltbNormalB, LocalTime.of(5, 15), LocalTime.of(10, 45)));

        // 99 Colombo-Badulla kept; sub-services 99/1 Colombo-Passara, 99/2 Colombo-Welimada, 99/3 Colombo-Bibila
        Route r991 = classicRoute("99/1", "Colombo", "Passara", "250.00", 420, RouteClass.LONG_DISTANCE);
        Route r992 = classicRoute("99/2", "Colombo", "Welimada", "245.00", 410, RouteClass.LONG_DISTANCE);
        Route r993 = classicRoute("99/3", "Colombo", "Bibila", "300.00", 480, RouteClass.LONG_DISTANCE);
        boardingPoint(r991, "Colombo Bastian Mawatha", 1, "Colombo", 0);
        boardingPoint(r991, "Badulla", 2, "Badulla", 390);
        boardingPoint(r991, "Passara Bus Stand", 3, "Passara", 420);
        boardingPoint(r992, "Colombo Bastian Mawatha", 1, "Colombo", 0);
        boardingPoint(r992, "Nuwara Eliya", 2, "Nuwara Eliya", 330);
        boardingPoint(r992, "Welimada Bus Stand", 3, "Welimada", 410);
        boardingPoint(r993, "Colombo Bastian Mawatha", 1, "Colombo", 0);
        boardingPoint(r993, "Wellawaya", 2, "Wellawaya", 250);
        boardingPoint(r993, "Bibila Bus Stand", 3, "Bibila", 480);
        fareRule(r991, BusType.NORMAL, new BigDecimal("1900.00"), new BigDecimal("0.00"));
        fareRule(r992, BusType.NORMAL, new BigDecimal("1850.00"), new BigDecimal("0.00"));
        fareRule(r993, BusType.NORMAL, new BigDecimal("2100.00"), new BigDecimal("0.00"));
        schedules.add(schedule(sltb, r991, sltbNormalB, LocalTime.of(4, 45), LocalTime.of(11, 45)));
        schedules.add(schedule(sltb, r992, sltbNormalA, LocalTime.of(6, 15), LocalTime.of(13, 5)));
        schedules.add(schedule(sltb, r993, sltbNormalB, LocalTime.of(5, 30), LocalTime.of(13, 30)));

        // 122 Colombo-Avissawella SUBURBAN kept; long Pettah services added as 122/1..122/4
        Route r1221 = classicRoute("122/1", "Pettah", "Ratnapura", "115.00", 210, RouteClass.LONG_DISTANCE);
        Route r1222 = classicRoute("122/2", "Pettah", "Embilipitiya", "180.00", 300, RouteClass.LONG_DISTANCE);
        Route r1223 = classicRoute("122/3", "Pettah", "Rakwana", "160.00", 280, RouteClass.LONG_DISTANCE);
        Route r1224 = classicRoute("122/4", "Pettah", "Kataragama", "290.00", 420, RouteClass.LONG_DISTANCE);
        boardingPoint(r1221, "Pettah Bus Stand", 1, "Pettah", 0);
        boardingPoint(r1221, "Avissawella", 2, "Avissawella", 90);
        boardingPoint(r1221, "Ratnapura Bus Stand", 3, "Ratnapura", 210);
        boardingPoint(r1222, "Pettah Bus Stand", 1, "Pettah", 0);
        boardingPoint(r1222, "Ratnapura", 2, "Ratnapura", 210);
        boardingPoint(r1222, "Embilipitiya Bus Stand", 3, "Embilipitiya", 300);
        boardingPoint(r1223, "Pettah Bus Stand", 1, "Pettah", 0);
        boardingPoint(r1223, "Ratnapura", 2, "Ratnapura", 210);
        boardingPoint(r1223, "Rakwana Bus Stand", 3, "Rakwana", 280);
        boardingPoint(r1224, "Pettah Bus Stand", 1, "Pettah", 0);
        boardingPoint(r1224, "Ratnapura", 2, "Ratnapura", 210);
        boardingPoint(r1224, "Embilipitiya", 3, "Embilipitiya", 300);
        boardingPoint(r1224, "Kataragama Bus Stand", 4, "Kataragama", 420);
        fareRule(r1221, BusType.NORMAL, new BigDecimal("950.00"), new BigDecimal("0.00"));
        fareRule(r1222, BusType.NORMAL, new BigDecimal("1400.00"), new BigDecimal("0.00"));
        fareRule(r1223, BusType.NORMAL, new BigDecimal("1300.00"), new BigDecimal("0.00"));
        fareRule(r1224, BusType.NORMAL, new BigDecimal("2000.00"), new BigDecimal("0.00"));
        schedules.add(schedule(sltb, r1221, sltbNormalA, LocalTime.of(6, 45), LocalTime.of(10, 15)));
        schedules.add(schedule(sltb, r1222, sltbNormalB, LocalTime.of(5, 45), LocalTime.of(10, 45)));
        schedules.add(schedule(sltb, r1223, sltbNormalA, LocalTime.of(7, 15), LocalTime.of(11, 55)));
        schedules.add(schedule(sltb, r1224, sltbNormalB, LocalTime.of(6, 0), LocalTime.of(13, 0)));

        // 138 Colombo-Homagama SUBURBAN kept; 138/4 Colombo-Kadawatha High Level Road added
        Route r1384 = classicRoute("138/4", "Colombo", "Kadawatha", "14.00", 50, RouteClass.SUBURBAN);
        boardingPoint(r1384, "Colombo Bastian Mawatha", 1, "Colombo", 0);
        boardingPoint(r1384, "Kadawatha Bus Stand", 2, "Kadawatha", 50);
        fareRule(r1384, BusType.NORMAL, new BigDecimal("150.00"), new BigDecimal("0.00"));
        schedules.add(schedule(sltb, r1384, sltbNormalA, LocalTime.of(6, 0), LocalTime.of(6, 50)));
        schedules.add(schedule(sltb, r1384, sltbNormalB, LocalTime.of(17, 0), LocalTime.of(17, 50)));

        // Refresh route 99 (Colombo-Badulla) boarding points to include Passara/Welimada/Bibila via-points
        Route route99 = routeRepository.findAllByFromCityIgnoreCaseAndToCityIgnoreCase("Colombo", "Badulla").stream()
                .filter(r -> "99".equals(r.getRouteNumber()))
                .findFirst()
                .orElse(null);
        if (route99 != null) {
            List<BoardingPoint> old99 = boardingPointRepository.findByRouteIdOrderBySequenceAsc(route99.getId());
            boardingPointRepository.deleteAll(old99);
            boardingPoint(route99, "Colombo Bastian Mawatha", 1, "Colombo", 0);
            boardingPoint(route99, "Avissawella", 2, "Avissawella", 80);
            boardingPoint(route99, "Ratnapura", 3, "Ratnapura", 150);
            boardingPoint(route99, "Haputale", 4, "Haputale", 260);
            boardingPoint(route99, "Bandarawela", 5, "Bandarawela", 320);
            boardingPoint(route99, "Ella", 6, "Ella", 350);
            boardingPoint(route99, "Welimada", 7, "Welimada", 360);
            boardingPoint(route99, "Passara", 8, "Passara", 380);
            boardingPoint(route99, "Bibila", 9, "Bibila", 385);
            boardingPoint(route99, "Badulla Bus Stand", 10, "Badulla", 390);
        }

        // Base 99 Colombo-Badulla flagship pilgrim service (sub-services 99/1-3 seeded above)
        if (route99 != null) {
            fareRule(route99, BusType.NORMAL, new BigDecimal("1950.00"), new BigDecimal("0.00"));
            schedules.add(schedule(sltb, route99, sltbNormalB, LocalTime.of(5, 45), LocalTime.of(12, 15)));
        }

        // ---- Complete manual routes 30 (Colombo-Jaffna, A9) and 34 (Kandy-Galle) ----
        // Route 30 and Route 34 are created with fare rules in run(); they previously had no boarding
        // points or schedules, so searches for the advertised Colombo->Jaffna and Kandy->Galle pairs
        // returned nothing. Add the classic boarding points and active services now. Bus assignments
        // reuse existing buses and always belong to the operator running the schedule.
        Route route30 = routeRepository.findAllByFromCityIgnoreCaseAndToCityIgnoreCase("Colombo", "Jaffna").stream()
                .filter(r -> "30".equals(r.getRouteNumber()))
                .findFirst()
                .orElse(null);
        if (route30 != null) {
            boardingPoint(route30, "Colombo Bastian Mawatha", 1, "Colombo", 0);
            boardingPoint(route30, "Kurunegala", 2, "Kurunegala", 150);
            boardingPoint(route30, "Vavuniya", 3, "Vavuniya", 330);
            boardingPoint(route30, "Jaffna Bus Stand", 4, "Jaffna", 480);
            schedules.add(schedule(sltb, route30, sltbNormalB, LocalTime.of(5, 0), LocalTime.of(13, 0)));
            schedules.add(schedule(jaffnaTravels, route30, jaffnaAc, LocalTime.of(15, 0), LocalTime.of(23, 0)));
        }

        Route route34 = routeRepository.findAllByFromCityIgnoreCaseAndToCityIgnoreCase("Kandy", "Galle").stream()
                .filter(r -> "34".equals(r.getRouteNumber()))
                .findFirst()
                .orElse(null);
        if (route34 != null) {
            boardingPoint(route34, "Kandy Clock Tower", 1, "Kandy", 0);
            boardingPoint(route34, "Colombo Bastian Mawatha", 2, "Colombo", 150);
            boardingPoint(route34, "Galle Bus Stand", 3, "Galle", 300);
            schedules.add(schedule(sltb, route34, sltbLux, LocalTime.of(6, 30), LocalTime.of(11, 30)));
            schedules.add(schedule(singhegiri, route34, singLux, LocalTime.of(14, 0), LocalTime.of(19, 0)));
            // NORMAL (Ashok Leyland Viking) service on Kandy-Galle so the demo
            // route exposes BOTH fleet variants (EXPRESS on the two luxury runs).
            schedules.add(schedule(sltb, route34, sltbNormalA, LocalTime.of(9, 0), LocalTime.of(14, 0)));
        }

        return schedules;
    }

    private Trip trip(Schedule schedule, LocalDate date) {
        Trip trip = tripService.getOrCreateTrip(schedule, date);
        tripService.materializeSeats(trip);
        return trip;
    }

    private void seedRouteTools() {
        if (routeToolRepository.count() > 0) {
            return;
        }
        record Tool(String corridor, String fromCity, String toCity, String via, RouteToolNetwork network,
                    String operatorType, String operators, String phones, String routeNumbers,
                    String notes, Double distanceKm, Integer durationMin) {
        }
        List<Tool> tools = List.of(
                new Tool("Colombo/Makumbura ↔ Galle/Matara", "Colombo", "Galle", "Southern Expwy (E01)", RouteToolNetwork.EXPRESSWAY,
                        "Expressway Bus operators", "SLTTS Katubadda, Singhegiri Transport", "0113000003,0113000004", "EX 2-1", null, null, null),
                new Tool("Colombo ↔ Tangalle", "Colombo", "Tangalle", "Southern Expwy via Peliyagoda, Kerawalapitiya", RouteToolNetwork.EXPRESSWAY,
                        "Expressway Bus operators", "Expressway Bus operators", "", "EX 2-6", null, null, null),
                new Tool("Colombo/Makumbura ↔ Kataragama", "Colombo", "Kataragama", "Southern Expwy", RouteToolNetwork.EXPRESSWAY,
                        "SLTB + Private", "SLTB Kataragama, Expressway Bus", "0113000006,0113000001", "EX 2-6", null, 290.0, 330),
                new Tool("Colombo ↔ Middeniya/Walasmulla/Beliatta/Hakmana", "Colombo", "Middeniya", "Southern Expwy", RouteToolNetwork.EXPRESSWAY,
                        "Expressway Bus operators", "Singhegiri Transport, SLTTS Katubadda", "0113000004,0113000003", "EX 2-7,EX 2-8,EX 2-9,EX 2-10", "Middeniya Depot", null, null),
                new Tool("Colombo ↔ Kamburupitiya", "Colombo", "Kamburupitiya", "Southern Expwy via Battaramulla, Kottawa, Makumbura, Pannipitiya, Rajagiriya", RouteToolNetwork.EXPRESSWAY,
                        "Private", "Singhegiri Transport", "0113000004", "", null, null, null),
                new Tool("Ampara/Siyambalanduwa ↔ Colombo (Makumbura)", "Ampara", "Colombo", "Southern Expwy via Monaragala, Wellawaya, Thanamalvila, 22 Junction, Mattala", RouteToolNetwork.EXPRESSWAY,
                        "Private", "Dilanka Express, GreenLeaf, Liyanage Express, SK Sons", "0113000007,0113000008,0113000009,0113000010", "EX 2-11,EX 2-12", null, null, null),
                new Tool("Badulla/Ella ↔ Makumbura", "Badulla", "Makumbura", "Southern Expwy via Wellawaya, Thanamalwila, 22 Junction, Mattala", RouteToolNetwork.EXPRESSWAY,
                        "Private", "Namali Travels, Namunukula Highway Express, NCG Express, Vishmitha Highway", "0113000011,0113000012,0113000013,0113000014", "99", null, null, null),
                new Tool("Matale/Kurunegala/Akurana/Katugastota ↔ Maharagama", "Matale", "Maharagama", "Central Expwy link via Mirigama, Pasyala", RouteToolNetwork.EXPRESSWAY,
                        "Private", "Maleesha Tours", "0113000015", "EX 2-15,EX 2-16", "~4h 30m journey", null, null),
                new Tool("Maharagama ↔ Matale (return leg)", "Maharagama", "Matale", "via Kadawatha, Jayewardenepura Univ., Nittabuwa, Yakkala", RouteToolNetwork.EXPRESSWAY,
                        "Private", "Maleesha Tours", "0113000015", "EX 2-15", "~4h 30m journey", null, null),
                new Tool("Kadawatha ↔ Panadura", "Kadawatha", "Panadura", "Outer Circular / Southern Expwy link", RouteToolNetwork.EXPRESSWAY,
                        "Expressway Bus operators", "Expressway Bus operators", "", "EX 2-17", "~45 min journey", null, null),
                new Tool("Kadawatha ↔ Kataragama", "Kadawatha", "Kataragama", "Southern Expwy", RouteToolNetwork.EXPRESSWAY,
                        "SLTB", "SLTB Kataragama", "0113000006", "", null, 270.0, 240),
                new Tool("Baddegama ↔ Colombo", "Baddegama", "Colombo", "Southern Expwy", RouteToolNetwork.EXPRESSWAY,
                        "Private", "Jayalath Traders", "0113000005", "EX 2-3", null, null, null),
                new Tool("Colombo ↔ Katunayake/Negombo", "Colombo", "Katunayake", "E03 Expwy", RouteToolNetwork.EXPRESSWAY,
                        "SLTB", "SLTB luxury service", "0113000002", "EX 3-1", "Only SLTB-operated on this expressway segment", 33.0, 40),
                new Tool("Colombo ↔ Galle (Maharagama branch)", "Colombo", "Galle", "Maharagama Highway Bus Station (Ex1 buses)", RouteToolNetwork.EXPRESSWAY,
                        "Private", "Private", "", "", "~2h, fare ~LKR 450", null, null),
                new Tool("Madulsima ↔ Makumbura", "Madulsima", "Makumbura", "Southern Expwy", RouteToolNetwork.EXPRESSWAY,
                        "Expressway Bus operators", "Expressway Bus operators", "", "", null, null, null),
                new Tool("Sri Jayewardenepura Hospital ↔ Bulathsinhala", "Sri Jayewardenepura", "Bulathsinhala", "Highway link", RouteToolNetwork.EXPRESSWAY,
                        "Expressway Bus operators", "Expressway Bus operators", "", "", null, null, null),

                new Tool("Colombo – Kandy", "Colombo", "Kandy", null, RouteToolNetwork.NORMAL,
                        "SLTB + Private", "", "", "01", null, null, null),
                new Tool("Colombo – Galle", "Colombo", "Galle", null, RouteToolNetwork.NORMAL,
                        "SLTB + Private", "", "", "02", null, null, null),
                new Tool("Colombo – Ratnapura", "Colombo", "Ratnapura", null, RouteToolNetwork.NORMAL,
                        "SLTB + Private", "", "", "04", null, null, null),
                new Tool("Colombo – Trincomalee", "Colombo", "Trincomalee", null, RouteToolNetwork.NORMAL,
                        "SLTB + Private", "", "", "15", null, null, null),
                new Tool("Nawalapitiya – Colombo (via Gampola/Peradeniya)", "Nawalapitiya", "Colombo", null, RouteToolNetwork.NORMAL,
                        "SLTB + Private", "", "", "16", null, null, null),
                new Tool("Maharagama – Anuradhapura", "Maharagama", "Anuradhapura", null, RouteToolNetwork.NORMAL,
                        "Private", "", "", "17/57", null, null, null),
                new Tool("Kandy – Nuwara Eliya", "Kandy", "Nuwara Eliya", null, RouteToolNetwork.NORMAL,
                        "SLTB (CTB)", "", "", "47", null, null, null),
                new Tool("Colombo – Polonnaruwa", "Colombo", "Polonnaruwa", null, RouteToolNetwork.NORMAL,
                        "SLTB + Private", "", "", "48", null, null, null),
                new Tool("Maharagama – Kandy", "Maharagama", "Kandy", null, RouteToolNetwork.NORMAL,
                        "Private", "", "", "74/122", null, null, null),
                new Tool("Colombo (Pettah) – Badulla/Passara/Welimada/Lunugala/Bibila", "Colombo", "Badulla", null, RouteToolNetwork.NORMAL,
                        "SLTB + Private", "", "", "99", null, 235.0, 330),
                new Tool("Pettah – Avissawella/Ratnapura/Embilipitiya/Rakwana/Suriyawewa/Kataragama", "Pettah", "Kataragama", null, RouteToolNetwork.NORMAL,
                        "SLTB + Private", "", "", "122", null, 290.0, 330),
                new Tool("Maharagama – Ihala Bope", "Maharagama", "Ihala Bope", null, RouteToolNetwork.NORMAL,
                        "Private", "", "", "124", null, null, null),
                new Tool("Padukka – Hanwella", "Padukka", "Hanwella", null, RouteToolNetwork.NORMAL,
                        "Private", "", "", "182", null, null, null),
                new Tool("Horana – Meepe", "Horana", "Meepe", null, RouteToolNetwork.NORMAL,
                        "Private", "", "", "315", null, null, null),
                new Tool("Matugama – Jaffna / Anuradhapura", "Matugama", "Jaffna", null, RouteToolNetwork.NORMAL,
                        "Private", "", "", "285/315/182/15", null, null, null),
                new Tool("Panadura – Polonnaruwa", "Panadura", "Polonnaruwa", null, RouteToolNetwork.NORMAL,
                        "Private", "", "", "450/315/182/48", null, null, null));

        List<RouteTool> rows = tools.stream()
                .map(t -> RouteTool.builder()
                        .corridor(t.corridor())
                        .fromCity(t.fromCity())
                        .toCity(t.toCity())
                        .via(t.via())
                        .network(t.network())
                        .operatorType(t.operatorType())
                        .operators(t.operators())
                        .phones(t.phones() == null ? "" : t.phones())
                        .routeNumbers(t.routeNumbers())
                        .notes(t.notes())
                        .distanceKm(t.distanceKm())
                        .durationMin(t.durationMin())
                        .hasBookableTrips(hasBookableTrips(t.routeNumbers()))
                        .build())
                .toList();
        routeToolRepository.saveAll(rows);
        log.info("Seeded {} route tools", rows.size());
    }

    private boolean hasBookableTrips(String routeNumbers) {
        if (routeNumbers == null || routeNumbers.isBlank()) {
            return false;
        }
        String first = routeNumbers.split(",")[0].trim();
        return routeRepository.findByRouteNumber(first)
                .map(r -> !scheduleRepository.findByRouteIdAndStatus(r.getId(), ScheduleStatus.ACTIVE).isEmpty())
                .orElse(false);
    }

    // ---- feature seeds (idempotent) ----------------------------------

    private void ensureFeatureSeeds() {
        Role driverRole = role("DRIVER", "Driver");
        Role conductorRole = role("CONDUCTOR", "Conductor");

        classifyOperators();
        ensureOperatorStaff(driverRole, conductorRole);

        User driver = userIfAbsent("Dinesh Silva", "driver@vygo.lk", "0700000005", driverRole);
        User conductor = userIfAbsent("Conductor Saman", "conductor@vygo.lk", "0700000003", conductorRole);

        busRepository.findByRegistrationNo("ND-1234").ifPresent(bus -> {
            assignStaff(bus, driver, BusStaff.StaffRole.DRIVER);
            assignStaff(bus, conductor, BusStaff.StaffRole.CONDUCTOR);
        });

        seedExpenses();
        seedBusLocations(driver);
        backfillCommission();
    }

    private User userIfAbsent(String fullName, String email, String mobile, Role role) {
        return userRepository.findByEmail(email)
                .map(existing -> {
                    if (!existing.hasRole(role.getCode().name())) {
                        existing.getRoles().add(role);
                        return userRepository.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> user(fullName, email, mobile, List.of(role)));
    }

    private void assignStaff(Bus bus, User user, BusStaff.StaffRole role) {
        if (busStaffRepository.findByBusIdAndUserId(bus.getId(), user.getId()).isPresent()) {
            return;
        }
        busStaffRepository.save(BusStaff.builder().bus(bus).user(user).staffRole(role).build());
    }

    /**
     * Marks the collective / state bodies as ASSOCIATION and every other named
     * company as OWNER. Idempotent: safe to run against an existing database
     * where the operator_type column was just added by Hibernate.
     */
    private void classifyOperators() {
        for (BusOperator operator : busOperatorRepository.findAll()) {
            BusOperator.OperatorType target = ASSOCIATION_NAMES.contains(operator.getName())
                    ? BusOperator.OperatorType.ASSOCIATION
                    : BusOperator.OperatorType.OWNER;
            if (operator.typeOrDefault() != target) {
                operator.setOperatorType(target);
                busOperatorRepository.save(operator);
            }
        }
    }

    /**
     * Every operator that runs buses gets its own driver and conductor login
     * (Lanka Express reuses the legacy driver@vygo.lk / conductor@vygo.lk
     * accounts), and each of those staff is assigned to every bus the operator
     * owns. Created only where missing, so it is safe to run repeatedly.
     */
    private void ensureOperatorStaff(Role driverRole, Role conductorRole) {
        for (BusOperator operator : busOperatorRepository.findAll()) {
            List<Bus> buses = busRepository.findByOperatorIdOrderByIdDesc(operator.getId());
            if (buses.isEmpty()) {
                continue;
            }
            User driver = ensureStaffUser(operator, "DRIVER", driverRole);
            User conductor = ensureStaffUser(operator, "CONDUCTOR", conductorRole);
            for (Bus bus : buses) {
                assignStaff(bus, driver, BusStaff.StaffRole.DRIVER);
                assignStaff(bus, conductor, BusStaff.StaffRole.CONDUCTOR);
            }
        }
    }

    private User ensureStaffUser(BusOperator operator, String role, Role roleEntity) {
        boolean legacy = "Lanka Express".equals(operator.getName());
        String slug = slugify(operator.getName());
        String email = legacy
                ? ("DRIVER".equals(role) ? "driver@vygo.lk" : "conductor@vygo.lk")
                : role.toLowerCase() + "." + slug + "@vygo.lk";
        String fullName = legacy
                ? ("DRIVER".equals(role) ? "Dinesh Silva" : "Conductor Saman")
                : ("DRIVER".equals(role) ? "Driver - " : "Conductor - ") + operator.getName();

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            String mobile = String.format("0761%06d",
                    operator.getId() * 2L + ("DRIVER".equals(role) ? 1L : 2L));
            user = User.builder()
                    .fullName(fullName)
                    .email(email)
                    .mobile(mobile)
                    .passwordHash(passwordEncoder.encode("password123"))
                    .enabled(true)
                    .otpVerified(true)
                    .mobileVerified(true)
                    .verificationStatus(User.IdentityStatus.VERIFIED)
                    .owner(operator)
                    .build();
        } else {
            if (user.getOwner() == null) {
                user.setOwner(operator);
            }
            if (user.getVerificationStatus() != User.IdentityStatus.VERIFIED) {
                user.setVerificationStatus(User.IdentityStatus.VERIFIED);
            }
            if (user.getMobileVerified() == null || !user.getMobileVerified()) {
                user.setMobileVerified(true);
            }
        }
        if (!user.hasRole(role)) {
            user.getRoles().add(roleEntity);
        }
        return userRepository.save(user);
    }

    private String slugify(String name) {
        if (name == null || name.isBlank()) {
            return "operator";
        }
        return name.toLowerCase()
                .replaceAll("[^a-z0-9]+", ".")
                .replaceAll("(^\\.+|\\.+$)", "");
    }

    private BusOperator operatorByOwnerEmail(String email) {
        return userRepository.findByEmail(email)
                .flatMap(u -> busOperatorRepository.findByUserId(u.getId()))
                .orElse(null);
    }

    private void seedExpenses() {
        if (expenseRepository.count() > 0) {
            return;
        }
        BusOperator operator = operatorByOwnerEmail("operator@vygo.lk");
        if (operator == null) {
            return;
        }
        Bus bus = busRepository.findByRegistrationNo("ND-1234").orElse(null);
        LocalDate today = LocalDate.now();
        List<Expense> rows = List.of(
                Expense.builder().operator(operator).bus(bus).category(Expense.ExpenseCategory.FUEL)
                        .amount(new BigDecimal("45000.00")).description("Diesel top-up \u2013 Colombo depot")
                        .expenseDate(today.minusDays(2)).build(),
                Expense.builder().operator(operator).bus(bus).category(Expense.ExpenseCategory.MAINTENANCE)
                        .amount(new BigDecimal("18500.00")).description("Brake pads & full service")
                        .expenseDate(today.minusDays(4)).build(),
                Expense.builder().operator(operator).bus(null).category(Expense.ExpenseCategory.SALARY)
                        .amount(new BigDecimal("120000.00")).description("Driver & conductor salaries")
                        .expenseDate(today.minusDays(1)).build(),
                Expense.builder().operator(operator).bus(null).category(Expense.ExpenseCategory.TOLL)
                        .amount(new BigDecimal("3200.00")).description("Expressway tolls")
                        .expenseDate(today.minusDays(3)).build());
        expenseRepository.saveAll(rows);
        log.info("Seeded {} demo expenses", rows.size());
    }

    private void seedBusLocations(User driver) {
        if (busLocationRepository.count() > 0) {
            return;
        }
        Bus bus = busRepository.findByRegistrationNo("ND-1234").orElse(null);
        if (bus == null) {
            return;
        }
        busLocationRepository.save(BusLocation.builder()
                .bus(bus)
                .latitude(6.9271)
                .longitude(79.8612)
                .speedKph(64.0)
                .recordedBy(driver)
                .recordedAt(LocalDateTime.now().minusMinutes(3))
                .build());
        log.info("Seeded demo bus location");
    }

    private void backfillCommission() {
        BigDecimal rate = new BigDecimal("0.05");
        int updated = 0;
        for (Payment p : paymentRepository.findAll()) {
            if (p.getStatus() == PaymentStatus.SUCCESS
                    && (p.getCommissionAmount() == null || p.getCommissionAmount().signum() == 0)) {
                p.setCommissionAmount(p.getAmount().multiply(rate).setScale(2, RoundingMode.HALF_UP));
                paymentRepository.save(p);
                updated++;
            }
        }
        if (updated > 0) {
            log.info("Backfilled commission on {} payments", updated);
        }
    }
}
