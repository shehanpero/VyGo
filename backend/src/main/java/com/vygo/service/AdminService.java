package com.vygo.service;

import com.vygo.dto.admin.AdminBookingResponse;
import com.vygo.dto.admin.AdminPaymentResponse;
import com.vygo.dto.admin.AnalyticsOverviewResponse;
import com.vygo.dto.admin.ApprovalRequest;
import com.vygo.dto.admin.AuditLogResponse;
import com.vygo.dto.admin.ComplaintRequest;
import com.vygo.dto.admin.ComplaintResponse;
import com.vygo.dto.admin.ComplaintUpdateRequest;
import com.vygo.dto.admin.OperatorAdminResponse;
import com.vygo.dto.admin.RoleUpdateRequest;
import com.vygo.dto.admin.TrendPointResponse;
import com.vygo.dto.auth.UserDto;
import com.vygo.dto.common.MessageResponse;
import com.vygo.dto.common.PageResponse;
import com.vygo.dto.staff.StaffVerificationResponse;
import com.vygo.dto.staff.VerificationDecisionRequest;
import com.vygo.entity.AuditLog;
import com.vygo.entity.Booking;
import com.vygo.entity.Bus;
import com.vygo.entity.BusOperator;
import com.vygo.entity.Complaint;
import com.vygo.entity.FareRule;
import com.vygo.entity.Payment;
import com.vygo.entity.Role;
import com.vygo.entity.Route;
import com.vygo.entity.Schedule;
import com.vygo.entity.SeatInventory;
import com.vygo.entity.Trip;
import com.vygo.entity.User;
import com.vygo.exception.BadRequestException;
import com.vygo.exception.NotFoundException;
import com.vygo.repository.AuditLogRepository;
import com.vygo.repository.BookingRepository;
import com.vygo.repository.BusOperatorRepository;
import com.vygo.repository.BusRepository;
import com.vygo.repository.ComplaintRepository;
import com.vygo.repository.FareRuleRepository;
import com.vygo.repository.PaymentRepository;
import com.vygo.repository.RoleRepository;
import com.vygo.repository.RouteRepository;
import com.vygo.repository.ScheduleRepository;
import com.vygo.repository.SeatInventoryRepository;
import com.vygo.repository.TripRepository;
import com.vygo.repository.UserRepository;
import com.vygo.security.SecurityUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminService.class);
    private static final DateTimeFormatter TS = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final BusOperatorRepository operatorRepo;
    private final BusRepository busRepo;
    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final BookingRepository bookingRepo;
    private final ComplaintRepository complaintRepo;
    private final AuditLogRepository auditLogRepo;
    private final TripRepository tripRepo;
    private final SeatInventoryRepository seatRepo;
    private final ScheduleRepository scheduleRepo;
    private final FareRuleRepository fareRuleRepo;
    private final RouteRepository routeRepo;
    private final PaymentRepository paymentRepo;

    public AdminService(BusOperatorRepository operatorRepo, BusRepository busRepo,
                        UserRepository userRepo, RoleRepository roleRepo,
                        BookingRepository bookingRepo, ComplaintRepository complaintRepo,
                        AuditLogRepository auditLogRepo, TripRepository tripRepo,
                        SeatInventoryRepository seatRepo, ScheduleRepository scheduleRepo,
                        FareRuleRepository fareRuleRepo, RouteRepository routeRepo,
                        PaymentRepository paymentRepo) {
        this.operatorRepo = operatorRepo;
        this.busRepo = busRepo;
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.bookingRepo = bookingRepo;
        this.complaintRepo = complaintRepo;
        this.auditLogRepo = auditLogRepo;
        this.tripRepo = tripRepo;
        this.seatRepo = seatRepo;
        this.scheduleRepo = scheduleRepo;
        this.fareRuleRepo = fareRuleRepo;
        this.routeRepo = routeRepo;
        this.paymentRepo = paymentRepo;
    }

    @Transactional(readOnly = true)
    public List<OperatorAdminResponse> listOperators(BusOperator.OperatorStatus status) {
        List<BusOperator> operators = status == null ? operatorRepo.findAll() : operatorRepo.findByStatus(status);
        return operators.stream().map(this::toOperatorAdminResponse).toList();
    }

    @Transactional
    public MessageResponse approveOperator(Long id) {
        BusOperator operator = operatorRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Operator not found"));
        operator.setStatus(BusOperator.OperatorStatus.APPROVED);
        operatorRepo.save(operator);
        recordAudit(null, "APPROVE_OPERATOR", "BusOperator", String.valueOf(id),
                "Operator \"" + operator.getName() + "\" approved");
        return new MessageResponse("Operator approved");
    }

    @Transactional
    public MessageResponse rejectOperator(Long id, ApprovalRequest req) {
        BusOperator operator = operatorRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Operator not found"));
        operator.setStatus(BusOperator.OperatorStatus.REJECTED);
        operatorRepo.save(operator);
        recordAudit(null, "REJECT_OPERATOR", "BusOperator", String.valueOf(id),
                req != null && req.reason() != null ? "reason=" + req.reason() : "");
        return new MessageResponse("Operator rejected");
    }

    @Transactional
    public MessageResponse suspendOperator(Long id, ApprovalRequest req) {
        BusOperator operator = operatorRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Operator not found"));
        operator.setStatus(BusOperator.OperatorStatus.SUSPENDED);
        operatorRepo.save(operator);
        recordAudit(null, "SUSPEND_OPERATOR", "BusOperator", String.valueOf(id),
                req != null && req.reason() != null ? "reason=" + req.reason() : "");
        return new MessageResponse("Operator suspended");
    }

    @Transactional(readOnly = true)
    public List<StaffVerificationResponse> listStaffVerifications(String status) {
        User.IdentityStatus filter = null;
        if (status != null && !status.isBlank()) {
            try {
                filter = User.IdentityStatus.valueOf(status.trim().toUpperCase());
            } catch (Exception e) {
                throw new BadRequestException("Invalid status: " + status);
            }
        }
        User.IdentityStatus f = filter;
        return userRepo.findAll().stream()
                .filter(u -> u.hasRole("DRIVER") || u.hasRole("CONDUCTOR"))
                .filter(u -> f == null || u.getVerificationStatus() == f)
                .map(this::toStaffVerificationResponse)
                .toList();
    }

    @Transactional
    public StaffVerificationResponse decideStaffVerification(Long id, VerificationDecisionRequest req) {
        User user = userRepo.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
        if (!user.hasRole("DRIVER") && !user.hasRole("CONDUCTOR")) {
            throw new BadRequestException("User is not a driver or conductor");
        }
        User.IdentityStatus status;
        try {
            status = User.IdentityStatus.valueOf(req.status().trim().toUpperCase());
        } catch (Exception e) {
            throw new BadRequestException("Invalid status: " + req.status());
        }
        if (status != User.IdentityStatus.VERIFIED && status != User.IdentityStatus.REJECTED) {
            throw new BadRequestException("Status must be VERIFIED or REJECTED");
        }
        user.setVerificationStatus(status);
        user.setVerificationNote(req.note());
        user.setVerifiedAt(status == User.IdentityStatus.VERIFIED ? LocalDateTime.now() : null);
        User saved = userRepo.save(user);
        recordAudit(null, "STAFF_IDENTITY_" + status.name(), "User", String.valueOf(id),
                saved.getFullName() + " identity " + status.name().toLowerCase());
        return toStaffVerificationResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<UserDto> listUsers(String role, String q) {
        String roleFilter = role == null || role.isBlank() ? null : role.toUpperCase();
        String qFilter = q == null || q.isBlank() ? null : q.toLowerCase();
        return userRepo.findAll().stream()
                .filter(u -> roleFilter == null || u.hasRole(roleFilter))
                .filter(u -> qFilter == null || containsIgnoreCase(u.getFullName(), qFilter)
                        || containsIgnoreCase(u.getEmail(), qFilter)
                        || containsIgnoreCase(u.getMobile(), qFilter))
                .map(this::toUserDto)
                .toList();
    }

    @Transactional
    public UserDto updateRoles(Long id, RoleUpdateRequest req) {
        User user = userRepo.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
        Set<Role> roles = new HashSet<>();
        for (String code : req.roles()) {
            Role.RoleCode roleCode;
            try {
                roleCode = Role.RoleCode.valueOf(code.toUpperCase());
            } catch (Exception e) {
                throw new BadRequestException("Invalid role: " + code);
            }
            Role role = roleRepo.findByCode(roleCode)
                    .orElseThrow(() -> new NotFoundException("Role not found: " + roleCode));
            roles.add(role);
        }
        user.setRoles(roles);
        userRepo.save(user);
        return toUserDto(user);
    }

    @Transactional(readOnly = true)
    public List<ComplaintResponse> listComplaints(Complaint.ComplaintStatus status) {
        List<Complaint> complaints = status == null
                ? complaintRepo.findAllByOrderByIdDesc()
                : complaintRepo.findByStatusOrderByIdDesc(status);
        return complaints.stream().map(this::toComplaintResponse).toList();
    }

    @Transactional
    public ComplaintResponse createComplaint(SecurityUser user, ComplaintRequest req) {
        Booking booking = bookingRepo.findByBookingRef(req.bookingRef())
                .orElseThrow(() -> new NotFoundException("Booking not found"));
        Complaint complaint = Complaint.builder()
                .passenger(user.getUser())
                .booking(booking)
                .subject(req.subject())
                .description(req.description())
                .status(Complaint.ComplaintStatus.OPEN)
                .build();
        Complaint saved = complaintRepo.save(complaint);
        recordAudit(user.userId(), "CREATE_COMPLAINT", "Complaint", String.valueOf(saved.getId()),
                "subject=" + req.subject());
        return toComplaintResponse(saved);
    }

    @Transactional
    public ComplaintResponse updateComplaint(Long id, ComplaintUpdateRequest req) {
        Complaint complaint = complaintRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Complaint not found"));
        if (req.status() != null && !req.status().isBlank()) {
            try {
                complaint.setStatus(Complaint.ComplaintStatus.valueOf(req.status().toUpperCase()));
            } catch (Exception e) {
                throw new BadRequestException("Invalid status: " + req.status());
            }
        }
        if (req.resolution() != null) {
            complaint.setResolution(req.resolution());
        }
        if (req.assignedTo() != null) {
            complaint.setAssignedTo(req.assignedTo());
        }
        complaintRepo.save(complaint);
        return toComplaintResponse(complaint);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> auditLogs(int page, int size) {
        PageRequest pageRequest = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        Page<AuditLog> result = auditLogRepo.findAllByOrderByIdDesc(pageRequest);
        List<AuditLogResponse> content = result.getContent().stream()
                .map(a -> new AuditLogResponse(a.getId(), a.getActorId(), a.getAction(), a.getEntityType(),
                        a.getEntityId(), a.getDetails(), a.getIpAddress(),
                        a.getCreatedAt() == null ? null : a.getCreatedAt().format(TS)))
                .toList();
        return new PageResponse<>(content, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminBookingResponse> bookings(String statusFilter, String q, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Booking> result;
        if (statusFilter != null && !statusFilter.isBlank()) {
            result = bookingRepo.findByStatusOrderByCreatedAtDesc(
                    Booking.BookingStatus.valueOf(statusFilter.toUpperCase()), pageable);
        } else {
            result = bookingRepo.findAllByOrderByCreatedAtDesc(pageable);
        }
        String query = q == null ? "" : q.trim().toLowerCase();
        List<AdminBookingResponse> content = result.getContent().stream()
                .filter(b -> query.isEmpty() || bookingMatches(b, query))
                .map(this::toAdminBooking)
                .toList();
        return new PageResponse<>(content, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminPaymentResponse> payments(String statusFilter, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)),
                Sort.by(Sort.Direction.DESC, "id"));
        Page<Payment> result;
        if (statusFilter != null && !statusFilter.isBlank()) {
            result = paymentRepo.findByStatusOrderByIdDesc(
                    Payment.PaymentStatus.valueOf(statusFilter.toUpperCase()), pageable);
        } else {
            result = paymentRepo.findAllByOrderByIdDesc(pageable);
        }
        List<AdminPaymentResponse> content = result.getContent().stream()
                .map(this::toAdminPayment)
                .toList();
        return new PageResponse<>(content, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public AnalyticsOverviewResponse overview() {
        long totalBookings = bookingRepo.countByStatus(Booking.BookingStatus.CONFIRMED);
        BigDecimal totalRevenue = bookingRepo.findAll().stream()
                .filter(b -> b.getStatus() == Booking.BookingStatus.CONFIRMED)
                .map(Booking::getTotalFare)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal platformCommission = paymentRepo.findAll().stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.SUCCESS
                        && p.getCommissionAmount() != null)
                .map(Payment::getCommissionAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long activeOperators = operatorRepo.findByStatus(BusOperator.OperatorStatus.APPROVED).size();
        long totalBuses = busRepo.count();
        double occupancyRate = todayOccupancy();
        long pendingComplaints = complaintRepo.findByStatusOrderByIdDesc(Complaint.ComplaintStatus.OPEN).size();
        return new AnalyticsOverviewResponse(totalBookings, totalRevenue, platformCommission, activeOperators,
                totalBuses, round1(occupancyRate), pendingComplaints);
    }

    @Transactional(readOnly = true)
    public List<TrendPointResponse> occupancyTrend(int days) {
        LocalDate today = LocalDate.now();
        List<TrendPointResponse> out = new ArrayList<>();
        for (int i = Math.max(days, 1) - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            long booked = 0;
            long capacity = 0;
            for (Trip t : tripRepo.findByTripDate(day)) {
                booked += seatRepo.countByTripIdAndStatus(t.getId(), SeatInventory.SeatStatus.BOOKED);
                capacity += t.getSchedule().getBus().getCapacity();
            }
            double pct = capacity > 0 ? round1(booked * 100.0 / capacity) : 0;
            out.add(new TrendPointResponse(day.toString(), pct, null, null, null));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<TrendPointResponse> revenueTrend(int days) {
        LocalDate today = LocalDate.now();
        List<TrendPointResponse> out = new ArrayList<>();
        for (int i = Math.max(days, 1) - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            List<Booking> bookings = bookingRepo.findByStatusAndCreatedAtBetween(
                    Booking.BookingStatus.CONFIRMED, day.atStartOfDay(), day.plusDays(1).atStartOfDay());
            BigDecimal revenue = bookings.stream()
                    .map(Booking::getTotalFare)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            out.add(new TrendPointResponse(day.toString(), null, revenue, (long) bookings.size(), null));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<TrendPointResponse> commissionTrend(int days) {
        LocalDate today = LocalDate.now();
        List<Payment> payments = paymentRepo.findAll().stream()
                .filter(p -> p.getStatus() == Payment.PaymentStatus.SUCCESS && p.getPaidAt() != null)
                .toList();
        List<TrendPointResponse> out = new ArrayList<>();
        for (int i = Math.max(days, 1) - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            LocalDateTime start = day.atStartOfDay();
            LocalDateTime end = day.plusDays(1).atStartOfDay();
            BigDecimal commission = BigDecimal.ZERO;
            long count = 0;
            for (Payment p : payments) {
                if (!p.getPaidAt().isBefore(start) && p.getPaidAt().isBefore(end)) {
                    commission = commission.add(p.getCommissionAmount() == null
                            ? BigDecimal.ZERO : p.getCommissionAmount());
                    count++;
                }
            }
            out.add(new TrendPointResponse(day.toString(), null, commission, count, null));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<TrendPointResponse> demandForecast(String fromCity, String toCity, int days) {        List<Route> routeMatches = routeRepo.findAllByFromCityIgnoreCaseAndToCityIgnoreCase(fromCity, toCity);
        if (routeMatches.isEmpty()) {
            return List.of();
        }
        Route route = routeMatches.get(0);
        List<Schedule> schedules = scheduleRepo.findByRouteId(route.getId());
        if (schedules.isEmpty()) {
            return List.of();
        }

        LocalDate today = LocalDate.now();
        int window = 14;
        double[] weekdayTotals = new double[8];
        int[] weekdayDays = new int[8];
        double total = 0;
        for (int i = window - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            int dow = day.getDayOfWeek().getValue();
            weekdayDays[dow]++;
            long dayBooked = 0;
            for (Schedule s : schedules) {
                Trip t = tripRepo.findByScheduleIdAndTripDate(s.getId(), day).orElse(null);
                if (t != null) {
                    dayBooked += seatRepo.countByTripIdAndStatus(t.getId(), SeatInventory.SeatStatus.BOOKED);
                }
            }
            weekdayTotals[dow] += dayBooked;
            total += dayBooked;
        }
        double avgDaily = total / window;
        double[] weekdayFactor = new double[8];
        for (int dow = 1; dow <= 7; dow++) {
            double avg = weekdayDays[dow] > 0 ? weekdayTotals[dow] / weekdayDays[dow] : 0;
            weekdayFactor[dow] = clamp(avgDaily > 0 ? avg / avgDaily : 1.0, 0.2, 3.0);
        }

        double avgCapacity = avgCapacityFor(schedules, today);
        BigDecimal baseFare = baseFareFor(route);

        List<TrendPointResponse> out = new ArrayList<>();
        for (int i = 1; i <= Math.max(days, 1); i++) {
            LocalDate day = today.plusDays(i);
            int dow = day.getDayOfWeek().getValue();
            long forecasted = Math.round(avgDaily * weekdayFactor[dow]);
            BigDecimal recommendedFare = null;
            if (baseFare != null) {
                double factor = clamp(0.8 + 0.4 * (avgCapacity > 0 ? forecasted / avgCapacity : 0), 0.8, 1.3);
                recommendedFare = baseFare.multiply(BigDecimal.valueOf(factor))
                        .setScale(2, RoundingMode.HALF_UP);
            }
            out.add(new TrendPointResponse(day.toString(), null, null, forecasted, recommendedFare));
        }
        return out;
    }

    // ---- helpers -----------------------------------------------------

    private OperatorAdminResponse toOperatorAdminResponse(BusOperator o) {
        User owner = o.getUser();
        return new OperatorAdminResponse(o.getId(), o.getName(), o.getRegistrationNo(), o.getLicenseNo(),
                o.getStatus().name(), o.typeOrDefault().name(),
                owner == null ? null : owner.getFullName(),
                owner == null ? null : owner.getEmail(),
                o.getCreatedAt() == null ? null : o.getCreatedAt().format(TS));
    }

    private StaffVerificationResponse toStaffVerificationResponse(User u) {
        BusOperator owner = u.getOwner();
        String role = u.hasRole("DRIVER") ? "DRIVER" : u.hasRole("CONDUCTOR") ? "CONDUCTOR" : null;
        return new StaffVerificationResponse(u.getId(), u.getFullName(), u.getEmail(), u.getMobile(),
                u.getMobileVerified(), role,
                owner == null ? null : owner.getId(), owner == null ? null : owner.getName(),
                u.getIdType(), u.getIdNumber(), u.getIdFrontUrl(), u.getIdBackUrl(), u.getLicenseUrl(),
                u.getSelfieUrl(), u.getProfileImageUrl(),
                u.getVerificationStatus() == null ? null : u.getVerificationStatus().name(),
                u.getVerificationNote(),
                u.getSubmittedAt() == null ? null : u.getSubmittedAt().format(TS),
                u.getVerifiedAt() == null ? null : u.getVerifiedAt().format(TS));
    }

    private UserDto toUserDto(User u) {
        Long operatorId = operatorRepo.findByUserId(u.getId()).map(BusOperator::getId).orElse(null);
        List<String> roles = u.getRoles() == null ? List.of()
                : u.getRoles().stream().map(r -> r.getCode().name()).sorted().toList();
        BusOperator owner = u.getOwner();
        return new UserDto(u.getId(), u.getFullName(), u.getEmail(), u.getMobile(), roles, u.getEnabled(), operatorId,
                u.getProfileImageUrl(), u.getMobileVerified(),
                u.getVerificationStatus() == null ? null : u.getVerificationStatus().name(),
                owner == null ? null : owner.getId(),
                owner == null ? null : owner.getName());
    }

    private ComplaintResponse toComplaintResponse(Complaint c) {
        User passenger = c.getPassenger();
        return new ComplaintResponse(c.getId(), passenger.getId(), passenger.getFullName(),
                c.getBooking() == null ? null : c.getBooking().getId(),
                c.getSubject(), c.getDescription(), c.getStatus().name(), c.getResolution(), c.getAssignedTo(),
                c.getCreatedAt() == null ? null : c.getCreatedAt().format(TS),
                c.getUpdatedAt() == null ? null : c.getUpdatedAt().format(TS));
    }

    private double todayOccupancy() {
        List<Trip> trips = tripRepo.findByTripDate(LocalDate.now());
        if (trips.isEmpty()) {
            return 0;
        }
        double sum = 0;
        for (Trip t : trips) {
            long booked = seatRepo.countByTripIdAndStatus(t.getId(), SeatInventory.SeatStatus.BOOKED);
            int capacity = t.getSchedule().getBus().getCapacity();
            sum += capacity > 0 ? booked * 100.0 / capacity : 0;
        }
        return sum / trips.size();
    }

    private double avgCapacityFor(List<Schedule> schedules, LocalDate date) {
        double sum = 0;
        int n = 0;
        for (Schedule s : schedules) {
            Trip t = tripRepo.findByScheduleIdAndTripDate(s.getId(), date).orElse(null);
            if (t != null) {
                sum += t.getSchedule().getBus().getCapacity();
                n++;
            }
        }
        if (n == 0) {
            for (Schedule s : schedules) {
                sum += s.getBus().getCapacity();
                n++;
            }
        }
        return n > 0 ? sum / n : 45.0;
    }

    private BigDecimal baseFareFor(Route route) {
        Optional<FareRule> ac = fareRuleRepo.findByRouteIdAndBusType(route.getId(), Bus.BusType.AC);
        if (ac.isPresent()) {
            return ac.get().getBaseFare();
        }
        return fareRuleRepo.findByRouteId(route.getId()).stream()
                .findFirst().map(FareRule::getBaseFare).orElse(null);
    }

    private boolean containsIgnoreCase(String value, String lowerQuery) {
        return value != null && value.toLowerCase().contains(lowerQuery);
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private boolean bookingMatches(Booking b, String lowerQuery) {
        String ref = String.valueOf(b.getBookingRef()).toLowerCase();
        String name = b.getPassenger() != null ? String.valueOf(b.getPassenger().getFullName()).toLowerCase() : "";
        String mobile = b.getPassenger() != null ? String.valueOf(b.getPassenger().getMobile()).toLowerCase() : "";
        String corridor = boardingName(b.getBoardingPoint()) + boardingName(b.getDropoffPoint());
        return ref.contains(lowerQuery) || name.contains(lowerQuery) || mobile.contains(lowerQuery)
                || corridor.toLowerCase().contains(lowerQuery);
    }

    private AdminBookingResponse toAdminBooking(Booking b) {
        String tripDate = b.getTrip() != null && b.getTrip().getTripDate() != null
                ? b.getTrip().getTripDate().toString() : null;
        return new AdminBookingResponse(
                b.getId(),
                b.getBookingRef(),
                b.getStatus() == null ? null : b.getStatus().name(),
                b.getPassenger() != null ? b.getPassenger().getFullName() : null,
                b.getPassenger() != null ? b.getPassenger().getMobile() : null,
                boardingName(b.getBoardingPoint()),
                boardingName(b.getDropoffPoint()),
                b.getTrip() != null ? b.getTrip().getId() : null,
                tripDate,
                b.getSeatsCount(),
                b.getTotalFare(),
                b.getBookedVia() == null ? null : b.getBookedVia().name(),
                b.getCreatedAt() == null ? null : b.getCreatedAt().format(TS));
    }

    private AdminPaymentResponse toAdminPayment(Payment p) {
        return new AdminPaymentResponse(
                p.getId(),
                p.getBooking() != null ? p.getBooking().getId() : null,
                p.getBooking() != null ? p.getBooking().getBookingRef() : null,
                p.getGatewayTxnId(),
                p.getMethod() == null ? null : p.getMethod().name(),
                p.getGateway(),
                p.getAmount(),
                p.getCommissionAmount(),
                p.getCurrency(),
                p.getStatus() == null ? null : p.getStatus().name(),
                p.getPaidAt() == null ? null : p.getPaidAt().format(TS),
                p.getCreatedAt() == null ? null : p.getCreatedAt().format(TS));
    }

    private String boardingName(com.vygo.entity.BoardingPoint point) {
        if (point == null) return "";
        String name = point.getName();
        return name == null ? "" : name;
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
