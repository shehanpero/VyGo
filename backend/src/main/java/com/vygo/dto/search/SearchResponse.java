package com.vygo.dto.search;

import java.math.BigDecimal;
import java.util.List;

public record SearchResponse(
        Long tripId,
        Long routeId,
        String routeNumber,
        String routeType,
        String from,
        String to,
        String busType,
        String serviceClass,
        String operator,
        String busReg,
        String departureTime,
        String arrivalTime,
        BigDecimal distanceKm,
        Integer durationMin,
        BigDecimal fare,
        Integer availableSeats,
        Integer seatsTotal,
        List<BoardingPointDto> boardingPoints,
        List<BoardingPointDto> dropoffPoints,
        String model,
        String vehicleModel,
        List<Integer> allowedSeatCounts) {
}
