package com.vygo.dto.payment;

import java.math.BigDecimal;

public record InitiatePaymentResponse(
        Long paymentId,
        String txnId,
        BigDecimal amount,
        String status,
        String redirectUrl,
        Boolean sandbox) {
}
