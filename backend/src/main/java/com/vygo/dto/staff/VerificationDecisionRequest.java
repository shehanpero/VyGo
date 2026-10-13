package com.vygo.dto.staff;

import jakarta.validation.constraints.NotBlank;

public record VerificationDecisionRequest(
        @NotBlank String status,
        String note) {
}
