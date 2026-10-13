package com.vygo.dto.operator;

import com.vygo.entity.Route;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.List;

public record RouteCreateRequest(
        String routeNumber,
        Route.RouteType routeType,
        String expresswayCode,
        Route.RouteClass routeClass,
        @NotBlank String fromCity,
        @NotBlank String toCity,
        @NotNull @Positive BigDecimal distanceKm,
        @NotNull @Positive Integer durationMin,
        @Valid List<BoardingPointCreateDto> boardingPoints) {
}
