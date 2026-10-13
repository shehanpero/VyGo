package com.vygo.controller;

import com.vygo.dto.search.SearchResponse;
import com.vygo.dto.search.SeatMapResponse;
import com.vygo.entity.Route;
import com.vygo.service.TripService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Bus Search", description = "Public bus search and seat maps")
public class BusSearchController {

    private final TripService tripService;

    public BusSearchController(TripService tripService) {
        this.tripService = tripService;
    }

    @GetMapping("/buses/search")
    @Operation(summary = "Search buses by route, date, time and bus type")
    public List<SearchResponse> search(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String time,
            @RequestParam(required = false) String busType,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Route.RouteType type) {
        return tripService.search(from, to, date, time, busType, sort, type);
    }

    @GetMapping("/trips/{tripId}/seats")
    @Operation(summary = "Get the live seat map for a trip")
    public SeatMapResponse seats(@PathVariable Long tripId) {
        return tripService.getSeatMap(tripId);
    }
}
