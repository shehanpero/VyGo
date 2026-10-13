package com.vygo.dto.admin;

import java.math.BigDecimal;

public record AdminPaymentResponse(
        Long id,
        Long bookingId,
        String bookingRef,
        String gatewayTxnId,
        String method,
        String gateway,
        BigDecimal amount,
        BigDecimal commissionAmount,
        String currency,
        String status,
        String paidAt,
        String createdAt) {
}