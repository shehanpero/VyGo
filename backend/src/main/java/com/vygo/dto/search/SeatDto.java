package com.vygo.dto.search;

import java.math.BigDecimal;

public record SeatDto(
        String seatNumber,
        String status,
        BigDecimal price,
        String lockExpiresAt,
        String passengerName) {
}
