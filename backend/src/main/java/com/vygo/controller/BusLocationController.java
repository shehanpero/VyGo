package com.vygo.controller;

import com.vygo.dto.live.BusPingRequest;
import com.vygo.dto.operator.BusLiveResponse;
import com.vygo.security.CurrentUser;
import com.vygo.service.BusLocationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/bus-location")
@Tag(name = "Live bus location", description = "GPS pings from drivers, conductors and operators")
public class BusLocationController {

    private final BusLocationService busLocationService;

    public BusLocationController(BusLocationService busLocationService) {
        this.busLocationService = busLocationService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OPERATOR','CONDUCTOR','DRIVER','ADMIN')")
    @Operation(summary = "Record a live GPS position for a bus")
    public BusLiveResponse ping(@Valid @RequestBody BusPingRequest request) {
        return busLocationService.ping(CurrentUser.id(), request);
    }
}
