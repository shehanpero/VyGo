package com.vygo.dto.operator;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record FareUpdateRequest(
        @NotNull @Positive BigDecimal baseFare,
        @Positive BigDecimal perKmRate,
        @NotNull @Positive BigDecimal surgeMultiplier) {
}
