package com.vygo.exception;

import com.vygo.dto.booking.ConflictDetail;

/**
 * Raised when a seat lock has expired before the booking could be confirmed.
 * Typed 409 conflict so the client can distinguish an expired hold (code
 * SEAT_LOCK_EXPIRED) from invalid input (400) or a seat taken by someone else
 * (code SEAT_UNAVAILABLE).
 */
public class SeatLockExpiredException extends ConflictException {

    public SeatLockExpiredException(String message, ConflictDetail detail) {
        super(message, detail);
    }
}
