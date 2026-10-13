package com.vygo.dto.booking;

public record BusSummaryDto(
        Long tripId,
        String operator,
        String reg,
        String type,
        String departureTime,
        String tripDate) {
}
