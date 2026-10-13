package com.vygo.dto.payment;

import java.math.BigDecimal;

public record RefundResponse(
        Long refundId,
        Long paymentId,
        BigDecimal amount,
        String status,
        String processedAt) {
}
