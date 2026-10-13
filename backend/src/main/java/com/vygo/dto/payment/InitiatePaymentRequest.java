package com.vygo.dto.payment;

import jakarta.validation.constraints.NotBlank;

public record InitiatePaymentRequest(
        @NotBlank String bookingRef,
        @NotBlank String method) {
}
