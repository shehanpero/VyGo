package com.vygo.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vygo.dto.common.MessageResponse;
import com.vygo.dto.operator.BoardingPointCreateDto;
import com.vygo.dto.operator.BusLiveResponse;
import com.vygo.dto.operator.BusRequest;
import com.vygo.dto.operator.BusResponse;
import com.vygo.dto.operator.BusStaffResponse;
import com.vygo.dto.operator.DailyRevenueDto;
import com.vygo.dto.operator.DelayNotifyResponse;
import com.vygo.dto.operator.DelayTripRequest;
import com.vygo.dto.operator.ExpenseRequest;
import com.vygo.dto.operator.ExpenseResponse;
import com.vygo.dto.operator.FareRuleResponse;
import com.vygo.dto.operator.FareUpdateRequest;
import com.vygo.dto.operator.OccupancyRowResponse;
import com.vygo.dto.operator.RevenueReportResponse;
import com.vygo.dto.operator.RouteCreateRequest;
import com.vygo.dto.operator.RouteResponseDto;
import com.vygo.dto.operator.ScheduleRequest;
import com.vygo.dto.operator.ScheduleResponse;
import com.vygo.dto.operator.StaffRequest;
import com.vygo.dto.operator.TripReportResponse;
import com.vygo.dto.search.BoardingPointDto;
import com.vygo.dto.staff.OwnerStaffResponse;
import com.vygo.entity.AuditLog;
import com.vygo.entity.BoardingPoint;
import com.vygo.entity.Booking;
import com.vygo.entity.Bus;
import com.vygo.entity.BusLocation;
import com.vygo.entity.BusOperator;
import com.vygo.entity.BusStaff;
import com.vygo.entity.Expense;
import com.vygo.entity.FareRule;
import com.vygo.entity.Notification;
import com.vygo.entity.Role;
import com.vygo.entity.Role.RoleCode;
import com.vygo.entity.Route;
import com.vygo.entity.Schedule;
import com.vygo.entity.SeatInventory;
import com.vygo.entity.Trip;
import com.vygo.entity.User;
import com.vygo.exception.BadRequestException;
import com.vygo.exception.ConflictException;
import com.vygo.exception.ForbiddenException;
import com.vygo.exception.NotFoundException;
import com.vygo.integration.SmsSender;
import com.vygo.repository.AuditLogRepository;
import com.vygo.repository.BookingRepository;
import com.vygo.repository.BusLocationRepository;
import com.vygo.repository.BusOperatorRepository;
import com.vygo.repository.BusRepository;
import com.vygo.repository.BusStaffRepository;
import com.vygo.repository.ExpenseRepository;
import com.vygo.repository.FareRuleRepository;
import com.vygo.repository.NotificationRepository;
import com.vygo.repository.RoleRepository;
import com.vygo.repository.RouteRepository;
import com.vygo.repository.ScheduleRepository;
import com.vygo.repository.SeatInventoryRepository;
import com.vygo.repository.TripRepository;
import com.vygo.repository.UserRepository;
import com.vygo.security.SecurityUser;
import com.vygo.util.AmenityJson;
import com.vygo.util.FleetVehicle;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.stream.Collectors;

@Service
public class OperatorService {

    private static final Logger log = LoggerFactory.getLogger(OperatorService.class);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter TS = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final BusOperatorRepository operatorRepo;
    private final BusRepository busRepo;
    private final RouteRepository routeRepo;
    private final FareRuleRepository fareRuleRepo;
    private final ScheduleRepository scheduleRepo;
    private final TripRepository tripRepo;
    private final SeatInventoryRepository seatRepo;
    private final BookingRepository bookingRepo;
    private final AuditLogRepository auditLogRepo;
    private final NotificationRepository notificationRepo;
    private final BusStaffRepository busStaffRepo;
    private final ExpenseRepository expenseRepo;
    private final BusLocationRepository busLocationRepo;
    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final PasswordEncoder passwordEncoder;
    private final SmsSender smsSender;

    public OperatorService(BusOperatorRepository operatorRepo, BusRepository busRepo,
                           RouteRepository routeRepo,
                           FareRuleRepository fareRuleRepo, ScheduleRepository scheduleRepo,
                           TripRepository tripRepo, SeatInventoryRepository seatRepo,
                           BookingRepository bookingRepo, AuditLogRepository auditLogRepo,
                           NotificationRepository notificationRepo, BusStaffRepository busStaffRepo,
                           ExpenseRepository expenseRepo, BusLocationRepository busLocationRepo,
                           UserRepository userRepo, RoleRepository roleRepo,
                           PasswordEncoder passwordEncoder, SmsSender smsSender) {
        this.operatorRepo = operatorRepo;
        this.busRepo = busRepo;
        this.routeRepo = routeRepo;
        this.fareRuleRepo = fareRuleRepo;
        this.scheduleRepo = scheduleRepo;
        this.tripRepo = tripRepo;
        this.seatRepo = seatRepo;
        this.bookingRepo = bookingRepo;
        this.auditLogRepo = auditLogRepo;
        this.notificationRepo = notificationRepo;
        this.busStaffRepo = busStaffRepo;
        this.expenseRepo = expenseRepo;
        this.busLocationRepo = busLocationRepo;
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.passwordEncoder = passwordEncoder;
        this.smsSender = smsSender;
    }

    private BusOperator requireOperator(Long userId) {
        return operatorRepo.findByUserId(userId)
                .orElseThrow(() -> new ForbiddenException("User is not associated with an operator"));
    }

    @Transactional
    public BusResponse createBus(SecurityUser user, BusRequest req) {
        BusOperator operator = requireOperator(user.userId());
        if (busRepo.findByRegistrationNo(req.registrationNo().trim()).isPresent()) {
            throw new ConflictException("Registration number already exists");
        }
        Bus.BusType busType = parseBusType(req.busType());
        validateCapacity(req.model(), busType, req.capacity());
        Bus bus = Bus.builder()
                .operator(operator)
                .registrationNo(req.registrationNo().trim())
                .busType(busType)
                .capacity(req.capacity())
                .amenities(writeAmenities(req.amenities()))
                .model(req.model())
                .year(req.year())
                .status(Bus.BusStatus.ACTIVE)
                .build();
        Bus saved = busRepo.save(bus);
        log.info("Bus created reg={} operatorId={}", saved.getRegistrationNo(), operator.getId());
        return toBusResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<BusResponse> listBuses(Long userId) {
        BusOperator operator = requireOperator(userId);
        return busRepo.findByOperatorIdOrderByIdDesc(operator.getId())
                .stream().map(this::toBusResponse).toList();
    }

    @Transactional
    public BusResponse updateBus(Long userId, Long id, BusRequest req) {
        BusOperator operator = requireOperator(userId);
        Bus bus = busRepo.findById(id).orElseThrow(() -> new NotFoundException("Bus not found"));
        if (!bus.getOperator().getId().equals(operator.getId())) {
            throw new ForbiddenException("Not your bus");
        }
        if (!bus.getRegistrationNo().equalsIgnoreCase(req.registrationNo())
                && busRepo.findByRegistrationNo(req.registrationNo().trim()).isPresent()) {
            throw new ConflictException("Registration number already exists");
        }
        Bus.BusType busType = parseBusType(req.busType());
        validateCapacity(req.model(), busType, req.capacity());
        bus.setRegistrationNo(req.registrationNo().trim());
        bus.setBusType(busType);
        bus.setCapacity(req.capacity());
        bus.setAmenities(writeAmenities(req.amenities()));
        bus.setModel(req.model());
        bus.setYear(req.year());
        return toBusResponse(busRepo.save(bus));
    }

    @Transactional
    public void deleteBus(Long userId, Long id) {
        BusOperator operator = requireOperator(userId);
        Bus bus = busRepo.findById(id).orElseThrow(() -> new NotFoundException("Bus not found"));
        if (!bus.getOperator().getId().equals(operator.getId())) {
            throw new ForbiddenException("Not your bus");
        }
        if (!scheduleRepo.findByBusId(bus.getId()).isEmpty()) {
            throw new ConflictException("Bus has schedules");
        }
        busRepo.delete(bus);
    }

    @Transactional
    public RouteResponseDto createRoute(Long userId, RouteCreateRequest req) {
        requireOperator(userId);
        boolean alreadyApproved = routeRepo.findAllByFromCityIgnoreCaseAndToCityIgnoreCase(
                req.fromCity().trim(), req.toCity().trim()).stream()
                .anyMatch(r -> r.getStatus() == Route.RouteStatus.APPROVED);
        if (alreadyApproved) {
            Route existing = routeRepo.findAllByFromCityIgnoreCaseAndToCityIgnoreCase(
                    req.fromCity().trim(), req.toCity().trim()).get(0);
            return toRouteResponseDto(existing);
        }
        Route route = Route.builder()
                .routeNumber(req.routeNumber() == null ? null : req.routeNumber().trim())
                .fromCity(req.fromCity().trim())
                .toCity(req.toCity().trim())
                .routeType(req.routeType() == null ? Route.RouteType.NORMAL : req.routeType())
                .expresswayCode(req.expresswayCode() == null ? null : req.expresswayCode().trim())
                .routeClass(req.routeClass())
                .distanceKm(req.distanceKm())
                .durationMin(req.durationMin())
                .status(Route.RouteStatus.PENDING)
                .build();
        List<BoardingPoint> points = new ArrayList<>();
        if (req.boardingPoints() != null) {
            for (BoardingPointCreateDto p : req.boardingPoints()) {
                points.add(BoardingPoint.builder()
                        .route(route)
                        .name(p.name())
                        .city(p.city())
                        .sequence(p.sequence())
                        .timeOffsetMin(p.timeOffsetMin() == null ? 0 : p.timeOffsetMin())
                        .lat(p.lat() == null ? null : BigDecimal.valueOf(p.lat()))
                        .lng(p.lng() == null ? null : BigDecimal.valueOf(p.lng()))
                        .build());
            }
        }
        route.setBoardingPoints(points);
        Route saved = routeRepo.save(route);
        log.info("Route created id={} {} -> {}", saved.getId(), saved.getFromCity(), saved.getToCity());
        return toRouteResponseDto(saved);
    }

    @Transactional
    public ScheduleResponse createSchedule(Long userId, ScheduleRequest req) {
        BusOperator operator = requireOperator(userId);
        Bus bus = busRepo.findById(req.busId()).orElseThrow(() -> new NotFoundException("Bus not found"));
        if (!bus.getOperator().getId().equals(operator.getId())) {
            throw new ForbiddenException("Bus does not belong to your operator");
        }
        Route route = routeRepo.findById(req.routeId()).orElseThrow(() -> new NotFoundException("Route not found"));
        Schedule schedule = Schedule.builder()
                .route(route)
                .bus(bus)
                .operator(operator)
                .departureTime(parseTime(req.departureTime()))
                .arrivalTime(parseTime(req.arrivalTime()))
                .daysOfWeek(req.daysOfWeek().stream().map(String::valueOf).collect(Collectors.joining(",")))
                .effectiveFrom(parseDate(req.effectiveFrom(), "effectiveFrom"))
                .effectiveTo(parseNullableDate(req.effectiveTo(), "effectiveTo"))
                .status(Schedule.ScheduleStatus.ACTIVE)
                .build();
        Schedule saved = scheduleRepo.save(schedule);
        return toScheduleResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ScheduleResponse> listSchedules(Long userId) {
        BusOperator operator = requireOperator(userId);
        return scheduleRepo.findByOperatorId(operator.getId())
                .stream().map(this::toScheduleResponse).toList();
    }

    @Transactional
    public ScheduleResponse updateSchedule(Long userId, Long id, ScheduleRequest req) {
        BusOperator operator = requireOperator(userId);
        Schedule schedule = scheduleRepo.findById(id).orElseThrow(() -> new NotFoundException("Schedule not found"));
        if (!schedule.getOperator().getId().equals(operator.getId())) {
            throw new ForbiddenException("Not your schedule");
        }
        Bus bus = busRepo.findById(req.busId()).orElseThrow(() -> new NotFoundException("Bus not found"));
        if (!bus.getOperator().getId().equals(operator.getId())) {
            throw new ForbiddenException("Bus does not belong to your operator");
        }
        Route route = routeRepo.findById(req.routeId()).orElseThrow(() -> new NotFoundException("Route not found"));
        schedule.setRoute(route);
        schedule.setBus(bus);
        schedule.setDepartureTime(parseTime(req.departureTime()));
        schedule.setArrivalTime(parseTime(req.arrivalTime()));
        schedule.setDaysOfWeek(req.daysOfWeek().stream().map(String::valueOf).collect(Collectors.joining(",")));
        schedule.setEffectiveFrom(parseDate(req.effectiveFrom(), "effectiveFrom"));
        schedule.setEffectiveTo(parseNullableDate(req.effectiveTo(), "effectiveTo"));
        return toScheduleResponse(scheduleRepo.save(schedule));
    }

    @Transactional
    public MessageResponse deactivateSchedule(Long userId, Long id) {
        BusOperator operator = requireOperator(userId);
        Schedule schedule = scheduleRepo.findById(id).orElseThrow(() -> new NotFoundException("Schedule not found"));
        if (!schedule.getOperator().getId().equals(operator.getId())) {
            throw new ForbiddenException("Not your schedule");
        }
        schedule.setStatus(Schedule.ScheduleStatus.DEACTIVATED);
        scheduleRepo.save(schedule);
        return new MessageResponse("Schedule deactivated");
    }

    @Transactional
    public FareRuleResponse updateFareRule(Long userId, Long id, FareUpdateRequest req) {
        BusOperator operator = requireOperator(userId);
        Set<Long> routeIds = operatorRouteIds(operator);
        FareRule rule = fareRuleRepo.findById(id).orElseThrow(() -> new NotFoundException("Fare rule not found"));
        if (!routeIds.contains(rule.getRoute().getId())) {
            throw new ForbiddenException("Not your fare rule");
        }
        rule.setBaseFare(req.baseFare());
        if (req.perKmRate() != null) {
            rule.setPerKmRate(req.perKmRate());
        }
        rule.setSurgeMultiplier(req.surgeMultiplier());
        FareRule saved = fareRuleRepo.save(rule);
        return new FareRuleResponse(saved.getId(), saved.getRoute().getId(), saved.getBusType().name(),
                saved.getBaseFare(), saved.getPerKmRate(), saved.getSurgeMultiplier());
    }

    @Transactional(readOnly = true)
    public List<FareRuleResponse> listFareRules(Long userId) {
        BusOperator operator = requireOperator(userId);
        Set<Long> routeIds = operatorRouteIds(operator);
        return fareRuleRepo.findAll().stream()
                .filter(fr -> routeIds.contains(fr.getRoute().getId()))
                .map(fr -> new FareRuleResponse(fr.getId(), fr.getRoute().getId(), fr.getBusType().name(),
                        fr.getBaseFare(), fr.getPerKmRate(), fr.getSurgeMultiplier()))
                .toList();
    }

    private Set<Long> operatorRouteIds(BusOperator operator) {
        return scheduleRepo.findByOperatorId(operator.getId()).stream()
                .map(s -> s.getRoute().getId())
                .collect(Collectors.toSet());
    }

    @Transactional(readOnly = true)
    public List<OccupancyRowResponse> getOccupancy(Long userId, LocalDate from, LocalDate to) {
        BusOperator operator = requireOperator(userId);
        List<Trip> trips = operatorTrips(operator, from, to);
        List<OccupancyRowResponse> rows = new ArrayList<>();
        for (Trip trip : trips) {
            long booked = seatRepo.countByTripIdAndStatus(trip.getId(), SeatInventory.SeatStatus.BOOKED);
            int capacity = trip.getSchedule().getBus().getCapacity();
            double pct = capacity > 0 ? round1(booked * 100.0 / capacity) : 0;
            rows.add(new OccupancyRowResponse(trip.getId(), trip.getTripDate().toString(),
                    routeName(trip), trip.getSchedule().getDepartureTime().format(TIME),
                    (int) booked, capacity, pct, tripRevenue(trip)));
        }
        rows.sort(Comparator.comparing(OccupancyRowResponse::date)
                .thenComparing(OccupancyRowResponse::departureTime));
        return rows;
    }

    @Transactional(readOnly = true)
    public RevenueReportResponse getRevenueReport(Long userId, LocalDate from, LocalDate to) {
        BusOperator operator = requireOperator(userId);
        LocalDate windowFrom = from == null ? LocalDate.now().minusDays(30) : from;
        LocalDate windowTo = to == null ? LocalDate.now().plusDays(30) : to;
        List<Trip> trips = operatorTrips(operator, from, to);
        Map<LocalDate, List<Trip>> byDay = trips.stream()
                .collect(Collectors.groupingBy(Trip::getTripDate, TreeMap::new, Collectors.toList()));

        Map<LocalDate, BigDecimal> expenseByDay = new TreeMap<>();
        BigDecimal totalExpenses = BigDecimal.ZERO;
        for (Expense ex : expenseRepo.findByOperatorIdAndExpenseDateBetweenOrderByExpenseDateDescIdDesc(
                operator.getId(), windowFrom, windowTo)) {
            expenseByDay.merge(ex.getExpenseDate(), ex.getAmount(), BigDecimal::add);
            totalExpenses = totalExpenses.add(ex.getAmount());
        }

        BigDecimal total = BigDecimal.ZERO;
        long count = 0;
        List<DailyRevenueDto> daily = new ArrayList<>();
        Set<LocalDate> days = new TreeSet<>();
        days.addAll(byDay.keySet());
        days.addAll(expenseByDay.keySet());
        for (LocalDate day : days) {
            BigDecimal dayRev = BigDecimal.ZERO;
            int dayCount = 0;
            for (Trip t : byDay.getOrDefault(day, List.of())) {
                for (Booking b : bookingRepo.findByTripIdAndStatus(t.getId(), Booking.BookingStatus.CONFIRMED)) {
                    dayRev = dayRev.add(b.getTotalFare());
                    dayCount++;
                }
            }
            total = total.add(dayRev);
            count += dayCount;
            daily.add(new DailyRevenueDto(day.toString(), dayRev, dayCount,
                    expenseByDay.getOrDefault(day, BigDecimal.ZERO)));
        }
        BigDecimal avg = count > 0
                ? total.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        return new RevenueReportResponse(total, count, avg, totalExpenses, total.subtract(totalExpenses), daily);
    }

    // ---- staff (drivers & conductors) --------------------------------

    @Transactional(readOnly = true)
    public List<OwnerStaffResponse> listOwnerStaff(Long userId) {
        BusOperator operator = requireOperator(userId);
        return userRepo.findByOwnerIdOrderByIdAsc(operator.getId()).stream()
                .filter(u -> u.hasRole(RoleCode.DRIVER.name()) || u.hasRole(RoleCode.CONDUCTOR.name()))
                .map(this::toOwnerStaffResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BusStaffResponse> listBusStaff(Long userId, Long busId) {
        BusOperator operator = requireOperator(userId);
        Bus bus = requireOwnedBus(operator, busId);
        return busStaffRepo.findByBusIdOrderByIdAsc(bus.getId()).stream()
                .map(this::toStaffResponse).toList();
    }

    @Transactional
    public BusStaffResponse addBusStaff(Long userId, Long busId, StaffRequest req) {
        BusOperator operator = requireOperator(userId);
        Bus bus = requireOwnedBus(operator, busId);
        BusStaff.StaffRole staffRole;
        try {
            staffRole = BusStaff.StaffRole.valueOf(req.role().trim().toUpperCase());
        } catch (Exception e) {
            throw new BadRequestException("Invalid staff role: " + req.role());
        }
        User member = resolveStaffUser(operator, req, staffRole);
        if (busStaffRepo.findByBusIdAndUserId(bus.getId(), member.getId()).isPresent()) {
            throw new ConflictException("This staff member is already assigned to the bus");
        }
        BusStaff saved = busStaffRepo.save(BusStaff.builder()
                .bus(bus)
                .user(member)
                .staffRole(staffRole)
                .build());
        recordAudit(userId, "ADD_BUS_STAFF", "BusStaff", String.valueOf(saved.getId()),
                member.getFullName() + " (" + staffRole + ") assigned to " + bus.getRegistrationNo());
        return toStaffResponse(saved);
    }

    @Transactional
    public MessageResponse removeBusStaff(Long userId, Long busId, Long staffId) {
        BusOperator operator = requireOperator(userId);
        requireOwnedBus(operator, busId);
        BusStaff staff = busStaffRepo.findById(staffId)
                .orElseThrow(() -> new NotFoundException("Staff assignment not found"));
        if (!staff.getBus().getOperator().getId().equals(operator.getId())) {
            throw new ForbiddenException("Not your bus staff");
        }
        busStaffRepo.delete(staff);
        recordAudit(userId, "REMOVE_BUS_STAFF", "BusStaff", String.valueOf(staffId),
                staff.getUser().getFullName() + " removed from " + staff.getBus().getRegistrationNo());
        return new MessageResponse("Staff member removed");
    }

    // ---- expenses ----------------------------------------------------

    @Transactional(readOnly = true)
    public List<ExpenseResponse> listExpenses(Long userId, Long busId, LocalDate from, LocalDate to) {
        BusOperator operator = requireOperator(userId);
        List<Expense> list;
        if (busId != null) {
            list = expenseRepo.findByOperatorIdAndBusIdOrderByExpenseDateDescIdDesc(operator.getId(), busId);
        } else if (from != null && to != null) {
            list = expenseRepo.findByOperatorIdAndExpenseDateBetweenOrderByExpenseDateDescIdDesc(
                    operator.getId(), from, to);
        } else {
            list = expenseRepo.findByOperatorIdOrderByExpenseDateDescIdDesc(operator.getId());
        }
        return list.stream().map(this::toExpenseResponse).toList();
    }

    @Transactional
    public ExpenseResponse createExpense(Long userId, ExpenseRequest req) {
        BusOperator operator = requireOperator(userId);
        Expense expense = Expense.builder()
                .operator(operator)
                .bus(resolveExpenseBus(operator, req.busId()))
                .category(parseExpenseCategory(req.category()))
                .amount(req.amount())
                .description(req.description())
                .expenseDate(parseDate(req.expenseDate(), "expenseDate"))
                .build();
        Expense saved = expenseRepo.save(expense);
        recordAudit(userId, "CREATE_EXPENSE", "Expense", String.valueOf(saved.getId()),
                saved.getCategory() + " " + saved.getAmount());
        return toExpenseResponse(saved);
    }

    @Transactional
    public ExpenseResponse updateExpense(Long userId, Long id, ExpenseRequest req) {
        BusOperator operator = requireOperator(userId);
        Expense expense = expenseRepo.findById(id).orElseThrow(() -> new NotFoundException("Expense not found"));
        if (!expense.getOperator().getId().equals(operator.getId())) {
            throw new ForbiddenException("Not your expense");
        }
        expense.setBus(resolveExpenseBus(operator, req.busId()));
        expense.setCategory(parseExpenseCategory(req.category()));
        expense.setAmount(req.amount());
        expense.setDescription(req.description());
        expense.setExpenseDate(parseDate(req.expenseDate(), "expenseDate"));
        return toExpenseResponse(expenseRepo.save(expense));
    }

    @Transactional
    public MessageResponse deleteExpense(Long userId, Long id) {
        BusOperator operator = requireOperator(userId);
        Expense expense = expenseRepo.findById(id).orElseThrow(() -> new NotFoundException("Expense not found"));
        if (!expense.getOperator().getId().equals(operator.getId())) {
            throw new ForbiddenException("Not your expense");
        }
        expenseRepo.delete(expense);
        return new MessageResponse("Expense deleted");
    }

    // ---- live bus locations ------------------------------------------

    @Transactional(readOnly = true)
    public List<BusLiveResponse> listBusLocations(Long userId) {
        BusOperator operator = requireOperator(userId);
        List<BusLiveResponse> out = new ArrayList<>();
        for (Bus bus : busRepo.findByOperatorIdOrderByIdDesc(operator.getId())) {
            BusLocation loc = busLocationRepo.findTopByBusIdOrderByRecordedAtDesc(bus.getId()).orElse(null);
            if (loc == null) {
                continue;
            }
            out.add(new BusLiveResponse(bus.getId(), bus.getRegistrationNo(), latestRouteName(bus),
                    loc.getLatitude(), loc.getLongitude(), loc.getSpeedKph(),
                    loc.getRecordedBy() == null ? null : loc.getRecordedBy().getFullName(),
                    loc.getRecordedAt() == null ? null : loc.getRecordedAt().format(TS)));
        }
        return out;
    }

    // ---- helpers -----------------------------------------------------

    private Bus requireOwnedBus(BusOperator operator, Long busId) {
        Bus bus = busRepo.findById(busId).orElseThrow(() -> new NotFoundException("Bus not found"));
        if (!bus.getOperator().getId().equals(operator.getId())) {
            throw new ForbiddenException("Not your bus");
        }
        return bus;
    }

    private Bus resolveExpenseBus(BusOperator operator, Long busId) {
        if (busId == null) {
            return null;
        }
        return requireOwnedBus(operator, busId);
    }

    private Expense.ExpenseCategory parseExpenseCategory(String value) {
        try {
            return Expense.ExpenseCategory.valueOf(value.trim().toUpperCase());
        } catch (Exception e) {
            throw new BadRequestException("Invalid expense category: " + value);
        }
    }

    private User resolveStaffUser(BusOperator operator, StaffRequest req, BusStaff.StaffRole role) {
        RoleCode roleCode = role == BusStaff.StaffRole.DRIVER ? RoleCode.DRIVER : RoleCode.CONDUCTOR;
        Role roleEntity = roleRepo.findByCode(roleCode)
                .orElseThrow(() -> new NotFoundException("Role not seeded: " + roleCode));
        if (req.mobile() != null && !req.mobile().isBlank()) {
            Optional<User> existing = userRepo.findByMobile(req.mobile().trim());
            if (existing.isPresent()) {
                User user = existing.get();
                attachOwner(user, operator);
                user.getRoles().add(roleEntity);
                return userRepo.save(user);
            }
            if (req.name() == null || req.name().isBlank()) {
                throw new BadRequestException("Staff name is required to create a new member");
            }
            String password = req.password() == null || req.password().isBlank() ? "password123" : req.password();
            User user = User.builder()
                    .fullName(req.name().trim())
                    .email(req.email() == null || req.email().isBlank() ? null : req.email().trim())
                    .mobile(req.mobile().trim())
                    .passwordHash(passwordEncoder.encode(password))
                    .enabled(true)
                    .otpVerified(true)
                    .owner(operator)
                    .build();
            user.getRoles().add(roleEntity);
            return userRepo.save(user);
        }
        if (req.email() != null && !req.email().isBlank()) {
            User user = userRepo.findByEmail(req.email().trim())
                    .orElseThrow(() -> new BadRequestException(
                            "No user found with that email; provide a mobile number to create one"));
            attachOwner(user, operator);
            user.getRoles().add(roleEntity);
            return userRepo.save(user);
        }
        throw new BadRequestException("Provide the staff member's mobile number (and name) to add or create them");
    }

    private void attachOwner(User user, BusOperator operator) {
        if (user.getOwner() == null) {
            user.setOwner(operator);
        } else if (!user.getOwner().getId().equals(operator.getId())) {
            throw new ForbiddenException("This staff member belongs to another bus owner / association");
        }
    }

    private BusStaffResponse toStaffResponse(BusStaff s) {
        User u = s.getUser();
        return new BusStaffResponse(s.getId(), u.getId(), u.getFullName(), u.getEmail(), u.getMobile(),
                s.getStaffRole().name(), s.getAssignedAt() == null ? null : s.getAssignedAt().format(TS));
    }

    private OwnerStaffResponse toOwnerStaffResponse(User u) {
        String role = u.hasRole(RoleCode.DRIVER.name()) ? "DRIVER" : "CONDUCTOR";
        return new OwnerStaffResponse(u.getId(), u.getFullName(), u.getEmail(), u.getMobile(), role,
                u.getProfileImageUrl(), u.getMobileVerified(),
                u.getVerificationStatus() == null ? null : u.getVerificationStatus().name(),
                u.getVerificationNote(),
                u.getSubmittedAt() == null ? null : u.getSubmittedAt().toString());
    }

    private ExpenseResponse toExpenseResponse(Expense e) {
        return new ExpenseResponse(e.getId(),
                e.getBus() == null ? null : e.getBus().getId(),
                e.getBus() == null ? null : e.getBus().getRegistrationNo(),
                e.getCategory().name(), e.getAmount(), e.getDescription(),
                e.getExpenseDate() == null ? null : e.getExpenseDate().toString(),
                e.getCreatedAt() == null ? null : e.getCreatedAt().format(TS));
    }

    private String latestRouteName(Bus bus) {
        return scheduleRepo.findByBusId(bus.getId()).stream()
                .filter(s -> s.getStatus() == Schedule.ScheduleStatus.ACTIVE)
                .findFirst()
                .map(s -> s.getRoute().getFromCity() + " \u2192 " + s.getRoute().getToCity())
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public TripReportResponse getTripReport(Long userId, LocalDate from, LocalDate to) {
        BusOperator operator = requireOperator(userId);
        List<Trip> trips = operatorTrips(operator, from, to);
        long cancelled = trips.stream().filter(t -> t.getStatus() == Trip.TripStatus.CANCELLED).count();
        long completed = trips.stream().filter(t -> t.getStatus() == Trip.TripStatus.COMPLETED).count();
        double avgOcc = trips.isEmpty() ? 0 : trips.stream().mapToDouble(this::occupancyPct).average().orElse(0);
        return new TripReportResponse((long) trips.size(), cancelled, completed, round1(avgOcc));
    }

    @Transactional
    public DelayNotifyResponse notifyDelay(Long userId, Long tripId, DelayTripRequest req) {
        BusOperator operator = requireOperator(userId);
        Trip trip = tripRepo.findById(tripId).orElseThrow(() -> new NotFoundException("Trip not found"));
        if (!trip.getSchedule().getOperator().getId().equals(operator.getId())) {
            throw new ForbiddenException("Trip does not belong to your operator");
        }
        trip.setStatus(Trip.TripStatus.DELAYED);
        tripRepo.save(trip);
        List<Booking> bookings = bookingRepo.findByTripIdAndStatus(trip.getId(), Booking.BookingStatus.CONFIRMED);
        int notified = 0;
        for (Booking b : bookings) {
            sendSmsNotification(b.getPassenger(), "Trip delayed",
                    "Your VyGo trip " + routeName(trip) + " on " + trip.getTripDate() + " is delayed by "
                            + req.delayMinutes() + " minutes."
                            + (req.reason() != null && !req.reason().isBlank() ? " Reason: " + req.reason() : ""));
            notified++;
        }
        recordAudit(userId, "NOTIFY_DELAY", "Trip", String.valueOf(tripId),
                "delayMinutes=" + req.delayMinutes() + ", notified=" + notified);
        return new DelayNotifyResponse("Passengers notified", notified);
    }

    // ---- helpers -----------------------------------------------------

    private List<Trip> operatorTrips(BusOperator operator, LocalDate from, LocalDate to) {
        if (from == null) {
            from = LocalDate.now().minusDays(30);
        }
        if (to == null) {
            to = LocalDate.now().plusDays(30);
        }
        if (to.isBefore(from)) {
            return List.of();
        }
        Set<Long> scheduleIds = scheduleRepo.findByOperatorId(operator.getId())
                .stream().map(Schedule::getId).collect(Collectors.toSet());
        if (scheduleIds.isEmpty()) {
            return List.of();
        }
        return tripRepo.findByTripDateBetween(from, to).stream()
                .filter(t -> scheduleIds.contains(t.getSchedule().getId()))
                .sorted(Comparator.comparing(Trip::getTripDate)
                        .thenComparing(t -> t.getSchedule().getDepartureTime()))
                .toList();
    }

    private BigDecimal tripRevenue(Trip trip) {
        return bookingRepo.findByTripIdAndStatus(trip.getId(), Booking.BookingStatus.CONFIRMED).stream()
                .map(Booking::getTotalFare)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private double occupancyPct(Trip trip) {
        long booked = seatRepo.countByTripIdAndStatus(trip.getId(), SeatInventory.SeatStatus.BOOKED);
        int capacity = trip.getSchedule().getBus().getCapacity();
        return capacity > 0 ? booked * 100.0 / capacity : 0;
    }

    private String routeName(Trip trip) {
        Route r = trip.getSchedule().getRoute();
        return r.getFromCity() + " \u2192 " + r.getToCity();
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private BusResponse toBusResponse(Bus b) {
        return new BusResponse(b.getId(), b.getRegistrationNo(), b.getBusType().name(), b.getCapacity(),
                readAmenities(b.getAmenities()), b.getModel(), b.getYear(),
                b.getStatus() == null ? null : b.getStatus().name());
    }

    private RouteResponseDto toRouteResponseDto(Route r) {
        List<BoardingPointDto> points = r.getBoardingPoints() == null ? List.of()
                : r.getBoardingPoints().stream()
                .map(p -> new BoardingPointDto(p.getId(), p.getName(), p.getCity(), null))
                .toList();
        return new RouteResponseDto(r.getId(), r.getRouteNumber(), r.getFromCity(), r.getToCity(),
                r.getRouteType() != null ? r.getRouteType().name() : "NORMAL",
                r.getExpresswayCode(),
                r.getRouteClass() != null ? r.getRouteClass().name() : null,
                r.getDistanceKm(), r.getDurationMin(), r.getStatus().name(), points);
    }

    private ScheduleResponse toScheduleResponse(Schedule s) {
        Route r = s.getRoute();
        List<Integer> days = Arrays.stream(s.getDaysOfWeek().split(","))
                .filter(x -> !x.isBlank())
                .map(Integer::valueOf)
                .toList();
        return new ScheduleResponse(s.getId(), r.getId(), s.getBus().getId(),
                r.getFromCity() + " \u2192 " + r.getToCity(), s.getBus().getRegistrationNo(),
                s.getDepartureTime().format(TIME), s.getArrivalTime().format(TIME), days,
                s.getEffectiveFrom().toString(),
                s.getEffectiveTo() == null ? null : s.getEffectiveTo().toString(),
                s.getStatus().name());
    }

    private String writeAmenities(List<String> amenities) {
        if (amenities == null || amenities.isEmpty()) {
            return "[]";
        }
        try {
            return objectMapper.writeValueAsString(amenities);
        } catch (JsonProcessingException e) {
            throw new BadRequestException("Invalid amenities");
        }
    }

    private List<String> readAmenities(String json) {
        return AmenityJson.parse(json);
    }

    private Bus.BusType parseBusType(String s) {
        try {
            return Bus.BusType.valueOf(s.trim().toUpperCase());
        } catch (Exception e) {
            throw new BadRequestException("Invalid bus type: " + s);
        }
    }

    /**
     * Data-driven capacity guard backed by the {@link FleetVehicle} registry:
     * a known model is validated against its allowed seat-count set, and an
     * unknown/custom model falls back to the service-class range. The registry
     * returns {@code Optional.empty()} when neither applies, keeping custom
     * buses permissive.
     */
    private void validateCapacity(String model, Bus.BusType busType, Integer capacity) {
        FleetVehicle.capacityError(model, busType, capacity).ifPresent(error -> {
            throw new BadRequestException(error);
        });
    }

    private LocalTime parseTime(String s) {
        try {
            return LocalTime.parse(s);
        } catch (Exception e) {
            throw new BadRequestException("Invalid time: " + s);
        }
    }

    private LocalDate parseDate(String s, String field) {
        try {
            return LocalDate.parse(s);
        } catch (Exception e) {
            throw new BadRequestException("Invalid " + field + ": " + s);
        }
    }

    private LocalDate parseNullableDate(String s, String field) {
        if (s == null || s.isBlank()) {
            return null;
        }
        return parseDate(s, field);
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
        AuditLog entry = AuditLog.builder()
                .actorId(actorId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .createdAt(LocalDateTime.now())
                .build();
        auditLogRepo.save(entry);
    }
}
