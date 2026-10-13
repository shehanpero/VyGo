package com.vygo.dto.review;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ReviewRequest(
        @NotBlank String bookingRef,
        @NotNull @Min(1) @Max(5) Integer rating,
        String comment) {
}
