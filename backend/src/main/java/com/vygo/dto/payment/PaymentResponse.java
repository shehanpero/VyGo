package com.vygo.dto.payment;

import java.math.BigDecimal;

public record PaymentResponse(
        Long paymentId,
        String txnId,
        BigDecimal amount,
        BigDecimal commissionAmount,
        String status,
        String method,
        String paidAt,
        String createdAt) {
}
