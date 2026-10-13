package com.vygo.dto.operator;

import java.util.List;

public record ScheduleResponse(
        Long id,
        Long routeId,
        Long busId,
        String route,
        String busReg,
        String departureTime,
        String arrivalTime,
        List<Integer> daysOfWeek,
        String effectiveFrom,
        String effectiveTo,
        String status) {
}
