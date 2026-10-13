package com.vygo.dto.operator;

import java.math.BigDecimal;

public record OccupancyRowResponse(
        Long tripId,
        String date,
        String route,
        String departureTime,
        Integer booked,
        Integer capacity,
        Double occupancyPct,
        BigDecimal revenue) {
}
