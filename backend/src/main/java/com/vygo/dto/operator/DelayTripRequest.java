package com.vygo.dto.operator;

import jakarta.validation.constraints.NotNull;

public record DelayTripRequest(
        @NotNull Integer delayMinutes,
        String reason) {
}
