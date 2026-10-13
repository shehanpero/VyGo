package com.vygo.controller;

import com.vygo.dto.booking.BookingResponse;
import com.vygo.dto.conductor.ManualBookingRequest;
import com.vygo.dto.conductor.ReconcileRequest;
import com.vygo.dto.conductor.ReconcileResponse;
import com.vygo.dto.conductor.TripListRowResponse;
import com.vygo.dto.search.SeatMapResponse;
import com.vygo.security.CurrentUser;
import com.vygo.service.ConductorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/conductor")
@PreAuthorize("hasRole('CONDUCTOR')")
@Tag(name = "Conductor", description = "Conductor dashboard operations")
public class ConductorController {

    private final ConductorService conductorService;

    public ConductorController(ConductorService conductorService) {
        this.conductorService = conductorService;
    }

    @GetMapping("/trips")
    @Operation(summary = "List trips for a date with occupancy")
    public List<TripListRowResponse> trips(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return conductorService.tripsForDate(date == null ? LocalDate.now() : date);
    }

    @GetMapping("/trips/{tripId}/seats")
    @Operation(summary = "Live seat occupancy for a trip (with passenger names)")
    public SeatMapResponse tripSeats(@PathVariable Long tripId) {
        return conductorService.tripSeats(tripId);
    }

    @PostMapping("/manual-booking")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create an on-the-spot manual booking with cash payment")
    public BookingResponse manualBooking(@Valid @RequestBody ManualBookingRequest request) {
        return conductorService.manualBooking(CurrentUser.get(), request);
    }

    @PostMapping("/trips/{tripId}/reconcile")
    @Operation(summary = "Record end-of-trip reconciliation")
    public ReconcileResponse reconcile(@PathVariable Long tripId,
                                       @Valid @RequestBody ReconcileRequest request) {
        return conductorService.reconcile(CurrentUser.id(), tripId, request);
    }
}
