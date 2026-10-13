package com.vygo.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record ComplaintRequest(
        @NotBlank String bookingRef,
        @NotBlank String subject,
        String description) {
}
