package com.vygo.dto.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank String fullName,
        @Email String email,
        @NotBlank @Pattern(regexp = "^0[0-9]{9}$") String mobile,
        @NotBlank @Size(min = 8) String password,
        @NotNull String role,
        @Valid OperatorRequest operator,
        Long ownerId) {
}
