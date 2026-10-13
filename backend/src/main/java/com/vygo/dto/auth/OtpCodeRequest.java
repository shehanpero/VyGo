package com.vygo.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record OtpCodeRequest(@NotBlank String otp) {
}
