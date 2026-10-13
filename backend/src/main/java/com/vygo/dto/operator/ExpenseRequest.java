package com.vygo.dto.operator;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record ExpenseRequest(
        Long busId,
        @NotBlank String category,
        @NotNull @Positive BigDecimal amount,
        String description,
        @NotBlank String expenseDate) {
}
