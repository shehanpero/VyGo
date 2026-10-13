package com.vygo.dto.operator;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ScheduleRequest(
        @NotNull Long routeId,
        @NotNull Long busId,
        @NotBlank String departureTime,
        @NotBlank String arrivalTime,
        @NotEmpty List<Integer> daysOfWeek,
        @NotBlank String effectiveFrom,
        String effectiveTo) {
}
