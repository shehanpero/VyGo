package com.vygo.dto.operator;

import jakarta.validation.constraints.NotBlank;

public record StaffRequest(
        @NotBlank String role,
        String name,
        String email,
        String mobile,
        String password) {
}
