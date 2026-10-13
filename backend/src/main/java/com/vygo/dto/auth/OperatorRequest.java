package com.vygo.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record OperatorRequest(
        @NotBlank String name,
        @NotBlank String registrationNo,
        String licenseNo,
        String address,
        String contactPerson,
        String phone,
        String email,
        String type) {
}
