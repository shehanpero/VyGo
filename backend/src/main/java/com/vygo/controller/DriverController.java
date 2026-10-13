package com.vygo.controller;

import com.vygo.dto.conductor.TripListRowResponse;
import com.vygo.dto.driver.DriverBusResponse;
import com.vygo.security.CurrentUser;
import com.vygo.service.DriverService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/driver")
@PreAuthorize("hasAnyRole('DRIVER','CONDUCTOR')")
@Tag(name = "Driver", description = "Driver & conductor daily trip view")
public class DriverController {

    private final DriverService driverService;

    public DriverController(DriverService driverService) {
        this.driverService = driverService;
    }

    @GetMapping("/buses")
    @Operation(summary = "Buses the current driver/conductor is assigned to")
    public List<DriverBusResponse> myBuses() {
        return driverService.myBuses(CurrentUser.id());
    }

    @GetMapping("/trips")
    @Operation(summary = "Trips for the caller's assigned buses on a given date")
    public List<TripListRowResponse> myTrips(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return driverService.myTrips(CurrentUser.id(), date == null ? LocalDate.now() : date);
    }
}
