package com.vygo.controller;

import com.vygo.dto.routetools.RouteToolDto;
import com.vygo.dto.routetools.ScheduleView;
import com.vygo.entity.RouteTool.RouteToolNetwork;
import com.vygo.service.RouteToolService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/route-tools")
@Tag(name = "Route Tools", description = "Live route-search tools: expressway & normal corridors, timetables and operator contacts")
public class RouteToolsController {

    private final RouteToolService routeToolService;

    public RouteToolsController(RouteToolService routeToolService) {
        this.routeToolService = routeToolService;
    }

    @GetMapping
    @Operation(summary = "List route tools, optionally filtered by query and network")
    public List<RouteToolDto> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) RouteToolNetwork network) {
        return routeToolService.list(q, network);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a single route tool by id")
    public RouteToolDto get(@PathVariable Long id) {
        return routeToolService.findById(id);
    }

    @GetMapping("/{id}/timetable")
    @Operation(summary = "Get the live timetable for the first route number referenced by a route tool")
    public List<ScheduleView> timetable(@PathVariable Long id) {
        return routeToolService.timetable(id);
    }
}
