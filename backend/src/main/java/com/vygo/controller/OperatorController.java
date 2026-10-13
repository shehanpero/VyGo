package com.vygo.controller;

import com.vygo.dto.booking.BookingResponse;
import com.vygo.dto.common.MessageResponse;
import com.vygo.dto.operator.BusLiveResponse;
import com.vygo.dto.operator.BusRequest;
import com.vygo.dto.operator.BusResponse;
import com.vygo.dto.operator.BusStaffResponse;
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
import com.vygo.dto.staff.OwnerStaffResponse;
import com.vygo.security.CurrentUser;
import com.vygo.service.OperatorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/operator")
@PreAuthorize("hasRole('OPERATOR')")
@Tag(name = "Operator", description = "Operator fleet, routes, schedules and reports")
public class OperatorController {

    private final OperatorService operatorService;

    public OperatorController(OperatorService operatorService) {
        this.operatorService = operatorService;
    }

    @PostMapping("/buses")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a bus")
    public BusResponse createBus(@Valid @RequestBody BusRequest request) {
        return operatorService.createBus(CurrentUser.get(), request);
    }

    @GetMapping("/buses")
    @Operation(summary = "List the operator's buses")
    public List<BusResponse> listBuses() {
        return operatorService.listBuses(CurrentUser.id());
    }

    @PutMapping("/buses/{id}")
    @Operation(summary = "Update a bus")
    public BusResponse updateBus(@PathVariable Long id, @Valid @RequestBody BusRequest request) {
        return operatorService.updateBus(CurrentUser.id(), id, request);
    }

    @DeleteMapping("/buses/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a bus")
    public void deleteBus(@PathVariable Long id) {
        operatorService.deleteBus(CurrentUser.id(), id);
    }

    @PostMapping("/routes")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a route (or propose a new one for approval)")
    public RouteResponseDto createRoute(@Valid @RequestBody RouteCreateRequest request) {
        return operatorService.createRoute(CurrentUser.id(), request);
    }

    @PostMapping("/schedules")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a schedule")
    public ScheduleResponse createSchedule(@Valid @RequestBody ScheduleRequest request) {
        return operatorService.createSchedule(CurrentUser.id(), request);
    }

    @GetMapping("/schedules")
    @Operation(summary = "List the operator's schedules")
    public List<ScheduleResponse> listSchedules() {
        return operatorService.listSchedules(CurrentUser.id());
    }

    @PutMapping("/schedules/{id}")
    @Operation(summary = "Update a schedule")
    public ScheduleResponse updateSchedule(@PathVariable Long id, @Valid @RequestBody ScheduleRequest request) {
        return operatorService.updateSchedule(CurrentUser.id(), id, request);
    }

    @DeleteMapping("/schedules/{id}")
    @Operation(summary = "Deactivate a schedule")
    public MessageResponse deactivateSchedule(@PathVariable Long id) {
        return operatorService.deactivateSchedule(CurrentUser.id(), id);
    }

    @GetMapping("/fare-rules")
    @Operation(summary = "List the operator's fare rules")
    public List<FareRuleResponse> listFareRules() {
        return operatorService.listFareRules(CurrentUser.id());
    }

    @PutMapping("/fare-rules/{id}")
    @Operation(summary = "Update a fare rule")
    public FareRuleResponse updateFareRule(@PathVariable Long id, @Valid @RequestBody FareUpdateRequest request) {
        return operatorService.updateFareRule(CurrentUser.id(), id, request);
    }

    @GetMapping("/reports/occupancy")
    @Operation(summary = "Occupancy report per trip")
    public List<OccupancyRowResponse> occupancy(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return operatorService.getOccupancy(CurrentUser.id(), from, to);
    }

    @GetMapping("/reports/revenue")
    @Operation(summary = "Revenue report grouped by route/day")
    public RevenueReportResponse revenue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return operatorService.getRevenueReport(CurrentUser.id(), from, to);
    }

    @GetMapping("/staff")
    @Operation(summary = "List all drivers and conductors belonging to this bus owner / association")
    public List<OwnerStaffResponse> listOwnerStaff() {
        return operatorService.listOwnerStaff(CurrentUser.id());
    }

    @GetMapping("/buses/{busId}/staff")
    @Operation(summary = "List drivers and conductors assigned to a bus")
    public List<BusStaffResponse> listBusStaff(@PathVariable Long busId) {
        return operatorService.listBusStaff(CurrentUser.id(), busId);
    }

    @PostMapping("/buses/{busId}/staff")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Assign a driver or conductor to a bus (creates the user if new)")
    public BusStaffResponse addBusStaff(@PathVariable Long busId, @Valid @RequestBody StaffRequest request) {
        return operatorService.addBusStaff(CurrentUser.id(), busId, request);
    }

    @DeleteMapping("/buses/{busId}/staff/{staffId}")
    @Operation(summary = "Remove a driver or conductor from a bus")
    public MessageResponse removeBusStaff(@PathVariable Long busId, @PathVariable Long staffId) {
        return operatorService.removeBusStaff(CurrentUser.id(), busId, staffId);
    }

    @GetMapping("/expenses")
    @Operation(summary = "List recorded expenses, optionally filtered by bus or date range")
    public List<ExpenseResponse> expenses(
            @RequestParam(required = false) Long busId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return operatorService.listExpenses(CurrentUser.id(), busId, from, to);
    }

    @PostMapping("/expenses")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Record an expense (fuel, maintenance, salary, …)")
    public ExpenseResponse createExpense(@Valid @RequestBody ExpenseRequest request) {
        return operatorService.createExpense(CurrentUser.id(), request);
    }

    @PutMapping("/expenses/{id}")
    @Operation(summary = "Update an expense")
    public ExpenseResponse updateExpense(@PathVariable Long id, @Valid @RequestBody ExpenseRequest request) {
        return operatorService.updateExpense(CurrentUser.id(), id, request);
    }

    @DeleteMapping("/expenses/{id}")
    @Operation(summary = "Delete an expense")
    public MessageResponse deleteExpense(@PathVariable Long id) {
        return operatorService.deleteExpense(CurrentUser.id(), id);
    }

    @GetMapping("/bus-locations")
    @Operation(summary = "Latest live GPS position of each bus in the fleet")
    public List<BusLiveResponse> busLocations() {
        return operatorService.listBusLocations(CurrentUser.id());
    }

    @GetMapping("/reports/trips")
    @Operation(summary = "Trip report with bookings and cancellations")
    public TripReportResponse trips(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return operatorService.getTripReport(CurrentUser.id(), from, to);
    }

    @PostMapping("/trips/{tripId}/delay")
    @Operation(summary = "Notify passengers of a trip delay")
    public DelayNotifyResponse notifyDelay(@PathVariable Long tripId, @Valid @RequestBody DelayTripRequest request) {
        return operatorService.notifyDelay(CurrentUser.id(), tripId, request);
    }
}
