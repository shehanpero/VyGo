package com.vygo.dto.conductor;

public record TripListRowResponse(
        Long tripId,
        String route,
        String busReg,
        String departureTime,
        String status,
        Integer bookedSeats,
        Integer capacity) {
}
