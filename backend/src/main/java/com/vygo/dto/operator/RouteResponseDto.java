package com.vygo.dto.operator;

import com.vygo.dto.search.BoardingPointDto;

import java.math.BigDecimal;
import java.util.List;

public record RouteResponseDto(
        Long id,
        String routeNumber,
        String fromCity,
        String toCity,
        String routeType,
        String expresswayCode,
        String routeClass,
        BigDecimal distanceKm,
        Integer durationMin,
        String status,
        List<BoardingPointDto> boardingPoints) {
}
