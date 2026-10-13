package com.vygo.dto.operator;

import java.math.BigDecimal;

public record DailyRevenueDto(
        String date,
        BigDecimal revenue,
        Integer bookings,
        BigDecimal expenses) {
}
