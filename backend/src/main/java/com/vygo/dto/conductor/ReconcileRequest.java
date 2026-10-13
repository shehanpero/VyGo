package com.vygo.dto.conductor;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record ReconcileRequest(
        @NotNull Integer seatsSoldOnBoard,
        @NotNull @Positive BigDecimal cashCollected,
        String notes) {
}
