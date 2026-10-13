package com.vygo.dto.operator;

public record TripReportResponse(
        Long totalTrips,
        Long cancelledTrips,
        Long completedTrips,
        Double averageOccupancyPct) {
}
