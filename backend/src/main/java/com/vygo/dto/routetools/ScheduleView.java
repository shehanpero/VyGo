package com.vygo.dto.routetools;

import java.math.BigDecimal;
import java.util.List;

public record ScheduleView(
        String routeNumber,
        String operator,
        String busType,
        String departureTime,
        String arrivalTime,
        BigDecimal distanceKm,
        Integer durationMin,
        BigDecimal fare,
        List<BoardingPointView> boardingPoints) {
}
