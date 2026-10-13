package com.vygo.dto.operator;

import java.math.BigDecimal;
import java.util.List;

public record RevenueReportResponse(
        BigDecimal totalRevenue,
        Long totalBookings,
        BigDecimal avgFare,
        BigDecimal totalExpenses,
        BigDecimal profit,
        List<DailyRevenueDto> daily) {
}
