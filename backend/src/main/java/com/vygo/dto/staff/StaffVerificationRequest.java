package com.vygo.dto.staff;

import jakarta.validation.constraints.NotBlank;

public record StaffVerificationRequest(
        @NotBlank String idType,
        @NotBlank String idNumber,
        @NotBlank String idFrontUrl,
        String idBackUrl,
        String licenseUrl,
        String businessDocUrl,
        @NotBlank String selfieUrl,
        Long ownerId,
        Boolean livenessPassed,
        String livenessActions) {
}
