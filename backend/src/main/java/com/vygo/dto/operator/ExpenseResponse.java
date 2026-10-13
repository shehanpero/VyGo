package com.vygo.dto.operator;

import java.math.BigDecimal;

public record ExpenseResponse(
        Long id,
        Long busId,
        String busRegistration,
        String category,
        BigDecimal amount,
        String description,
        String expenseDate,
        String createdAt) {
}
