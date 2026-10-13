package com.vygo.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record OtpVerifyRequest(
        @NotBlank @Pattern(regexp = "^0[0-9]{9}$") String mobile,
        @NotBlank @Size(min = 6, max = 6) String otp) {
}
