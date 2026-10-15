package com.vygo.controller;

import com.vygo.dto.admin.AdminBookingResponse;
import com.vygo.dto.admin.AdminPaymentResponse;
import com.vygo.dto.admin.AnalyticsOverviewResponse;
import com.vygo.dto.admin.ApprovalRequest;
import com.vygo.dto.admin.AuditLogResponse;
import com.vygo.dto.admin.BusVerificationResponse;
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
import com.vygo.entity.Complaint;
import com.vygo.security.CurrentUser;
import com.vygo.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "Platform administration")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/operators")
    @Operation(summary = "List operators, optionally filtered by status")
    public List<OperatorAdminResponse> operators(
            @RequestParam(required = false) String status) {
        com.vygo.entity.BusOperator.OperatorStatus s = null;
        if (status != null && !status.isBlank()) {
            s = com.vygo.entity.BusOperator.OperatorStatus.valueOf(status.toUpperCase());
        }
        return adminService.listOperators(s);
    }

    @PostMapping("/operators/{id}/approve")
    @Operation(summary = "Approve an operator application")
    public MessageResponse approveOperator(@PathVariable Long id) {
        return adminService.approveOperator(id);
    }

    @PostMapping("/operators/{id}/reject")
    @Operation(summary = "Reject an operator application")
    public MessageResponse rejectOperator(@PathVariable Long id, @RequestBody ApprovalRequest request) {
        return adminService.rejectOperator(id, request);
    }

    @PostMapping("/operators/{id}/suspend")
    @Operation(summary = "Suspend an operator")
    public MessageResponse suspendOperator(@PathVariable Long id, @RequestBody ApprovalRequest request) {
        return adminService.suspendOperator(id, request);
    }

    @GetMapping("/staff/verifications")
    @Operation(summary = "List driver/conductor identity verifications, optionally filtered by status")
    public List<StaffVerificationResponse> staffVerifications(
            @RequestParam(required = false) String status) {
        return adminService.listStaffVerifications(status);
    }

    @PostMapping("/staff/{id}/verification")
    @Operation(summary = "Approve or reject a driver/conductor identity verification")
    public StaffVerificationResponse decideStaffVerification(
            @PathVariable Long id, @Valid @RequestBody VerificationDecisionRequest request) {
        return adminService.decideStaffVerification(id, request);
    }

    @GetMapping("/buses")
    @Operation(summary = "List buses for vehicle verification, optionally filtered by status")
    public List<BusVerificationResponse> busVerifications(
            @RequestParam(required = false) String status) {
        return adminService.listBusVerifications(status);
    }

    @PostMapping("/buses/{id}/verification")
    @Operation(summary = "Approve or reject a bus vehicle verification")
    public BusVerificationResponse decideBusVerification(
            @PathVariable Long id, @Valid @RequestBody VerificationDecisionRequest request) {
        return adminService.decideBusVerification(id, request);
    }

    @GetMapping("/users")
    @Operation(summary = "List users, optionally filtered by role or query")
    public List<UserDto> users(@RequestParam(required = false) String role,
                               @RequestParam(required = false) String q) {
        return adminService.listUsers(role, q);
    }

    @PutMapping("/users/{id}/roles")
    @Operation(summary = "Update a user's roles")
    public UserDto updateRoles(@PathVariable Long id, @Valid @RequestBody RoleUpdateRequest request) {
        return adminService.updateRoles(id, request);
    }

    @GetMapping("/complaints")
    @Operation(summary = "List complaints, optionally filtered by status")
    public List<ComplaintResponse> complaints(
            @RequestParam(required = false) String status) {
        Complaint.ComplaintStatus s = null;
        if (status != null && !status.isBlank()) {
            s = Complaint.ComplaintStatus.valueOf(status.toUpperCase());
        }
        return adminService.listComplaints(s);
    }

    @PostMapping("/complaints")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Raise a complaint on behalf of a user")
    public ComplaintResponse createComplaint(@Valid @RequestBody ComplaintRequest request) {
        return adminService.createComplaint(CurrentUser.get(), request);
    }

    @PutMapping("/complaints/{id}")
    @Operation(summary = "Update complaint status and resolution")
    public ComplaintResponse updateComplaint(@PathVariable Long id,
                                             @Valid @RequestBody ComplaintUpdateRequest request) {
        return adminService.updateComplaint(id, request);
    }

    @GetMapping("/audit-logs")
    @Operation(summary = "Browse audit logs")
    public PageResponse<AuditLogResponse> auditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminService.auditLogs(page, size);
    }

    @GetMapping("/payments")
    @Operation(summary = "All payments across the platform")
    public PageResponse<AdminPaymentResponse> payments(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminService.payments(status, page, size);
    }

    @GetMapping("/bookings")
    @Operation(summary = "All bookings across the platform")
    public PageResponse<AdminBookingResponse> bookings(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminService.bookings(status, q, page, size);
    }

    @GetMapping("/analytics/overview")
    @Operation(summary = "Platform overview metrics")
    public AnalyticsOverviewResponse overview() {
        return adminService.overview();
    }

    @GetMapping("/analytics/occupancy-trend")
    @Operation(summary = "Occupancy trend over N days")
    public List<TrendPointResponse> occupancyTrend(@RequestParam(defaultValue = "14") int days) {
        return adminService.occupancyTrend(days);
    }

    @GetMapping("/analytics/revenue-trend")
    @Operation(summary = "Revenue trend over N days")
    public List<TrendPointResponse> revenueTrend(@RequestParam(defaultValue = "30") int days) {
        return adminService.revenueTrend(days);
    }

    @GetMapping("/analytics/commission-trend")
    @Operation(summary = "Platform commission (5%) trend over N days")
    public List<TrendPointResponse> commissionTrend(@RequestParam(defaultValue = "30") int days) {
        return adminService.commissionTrend(days);
    }

    @GetMapping("/analytics/demand-forecast")
    @Operation(summary = "Demand forecast for a corridor")
    public List<TrendPointResponse> demandForecast(
            @RequestParam(defaultValue = "Colombo") String from,
            @RequestParam(defaultValue = "Kandy") String to,
            @RequestParam(defaultValue = "7") int days) {
        return adminService.demandForecast(from, to, days);
    }
}
