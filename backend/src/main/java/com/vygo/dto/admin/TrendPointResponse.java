package com.vygo.dto.admin;

import java.math.BigDecimal;

public record TrendPointResponse(
        String date,
        Double occupancyPct,
        BigDecimal revenue,
        Long bookings,
        BigDecimal recommendedFare) {
}
