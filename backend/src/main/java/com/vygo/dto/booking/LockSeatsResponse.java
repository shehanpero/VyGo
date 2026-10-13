package com.vygo.dto.booking;

import java.math.BigDecimal;
import java.util.List;

public record LockSeatsResponse(
        String lockToken,
        List<String> lockedSeats,
        String expiresAt,
        BigDecimal totalFare) {
}
