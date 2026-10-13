package com.vygo.controller;

import com.vygo.dto.admin.AnalyticsOverviewResponse;
import com.vygo.dto.admin.TrendPointResponse;
import com.vygo.security.CurrentUser;
import com.vygo.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/analytics")
@PreAuthorize("hasAnyRole('OPERATOR','ADMIN')")
@Tag(name = "Analytics", description = "Demand, pricing and performance analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/routes/{routeId}/occupancy-trend")
    @Operation(summary = "Historical occupancy trend for a route")
    public List<TrendPointResponse> occupancyTrends(@PathVariable Long routeId) {
        return analyticsService.occupancyTrends(routeId);
    }

    @GetMapping("/routes/{routeId}/pricing-suggestions")
    @Operation(summary = "Suggested fare changes for a route")
    public List<TrendPointResponse> pricingSuggestions(@PathVariable Long routeId) {
        return analyticsService.pricingSuggestions(routeId);
    }

    @GetMapping("/demand-forecast")
    @Operation(summary = "Demand forecast for a corridor")
    public List<TrendPointResponse> demandForecast(
            @RequestParam(defaultValue = "Colombo") String from,
            @RequestParam(defaultValue = "Kandy") String to,
            @RequestParam(defaultValue = "7") int days) {
        return analyticsService.demandForecast(from, to, days);
    }

    @GetMapping("/operators/{operatorId}/performance")
    @Operation(summary = "Operator performance summary")
    public AnalyticsOverviewResponse operatorPerformance(@PathVariable Long operatorId) {
        return analyticsService.operatorPerformance(operatorId);
    }
}
