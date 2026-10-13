package com.vygo.dto.operator;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record BusRequest(
        @NotBlank String registrationNo,
        @NotBlank String busType,
        @NotNull @Min(1) Integer capacity,
        List<String> amenities,
        String model,
        Integer year) {
}
