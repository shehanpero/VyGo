package com.vygo.controller;

import com.vygo.dto.operator.RouteResponseDto;
import com.vygo.entity.Route;
import com.vygo.service.TripService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/routes")
@Tag(name = "Routes", description = "Public route catalogue")
public class RouteController {

    private final TripService tripService;

    public RouteController(TripService tripService) {
        this.tripService = tripService;
    }

    @GetMapping
    @Operation(summary = "List available routes, optionally filtered by query, type and class")
    public List<RouteResponseDto> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Route.RouteType type,
            @RequestParam(required = false) Route.RouteClass routeClass) {
        return tripService.listRoutes(q, type, routeClass);
    }
}
