package com.vygo.dto.payment;

import jakarta.validation.constraints.NotBlank;

public record ConfirmPaymentRequest(
        @NotBlank String txnId) {
}
