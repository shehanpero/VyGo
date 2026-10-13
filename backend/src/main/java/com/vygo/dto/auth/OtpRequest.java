package com.vygo.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record OtpRequest(
        @NotBlank @Pattern(regexp = "^0[0-9]{9}$") String mobile) {
}
