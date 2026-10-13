package com.vygo.dto.admin;

import java.math.BigDecimal;

public record AnalyticsOverviewResponse(
        Long totalBookings,
        BigDecimal totalRevenue,
        BigDecimal platformCommission,
        Long activeOperators,
        Long totalBuses,
        Double occupancyRate,
        Long pendingComplaints) {
}
