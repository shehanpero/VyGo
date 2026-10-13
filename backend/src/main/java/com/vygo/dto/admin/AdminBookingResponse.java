package com.vygo.dto.admin;

import java.math.BigDecimal;

public record AdminBookingResponse(
        Long id,
        String bookingRef,
        String status,
        String passengerName,
        String passengerMobile,
        String fromCity,
        String toCity,
        Long tripId,
        String tripDate,
        Integer seatsCount,
        BigDecimal totalFare,
        String bookedVia,
        String createdAt) {
}