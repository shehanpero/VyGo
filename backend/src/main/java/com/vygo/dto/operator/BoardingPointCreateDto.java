package com.vygo.dto.operator;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record BoardingPointCreateDto(
        @NotBlank String name,
        @NotBlank String city,
        @NotNull Integer sequence,
        Integer timeOffsetMin,
        Double lat,
        Double lng) {
}
