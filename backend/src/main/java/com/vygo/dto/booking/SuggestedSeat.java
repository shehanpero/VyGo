package com.vygo.dto.booking;

import java.math.BigDecimal;

/**
 * A suggested alternative seat for a seat that was no longer available when the
 * user tried to lock it. {@code row} is 1-based; {@code side} is "LEFT" or
 * "RIGHT" relative to the aisle (mirrors the frontend 2-seat/3-seat layout).
 */
public record SuggestedSeat(
        String seatNumber,
        Integer row,
        String side,
        BigDecimal price) {
}
