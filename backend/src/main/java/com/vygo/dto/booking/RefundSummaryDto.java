package com.vygo.dto.booking;

import java.math.BigDecimal;

public record RefundSummaryDto(
        BigDecimal amount,
        BigDecimal fee,
        String status) {
}
