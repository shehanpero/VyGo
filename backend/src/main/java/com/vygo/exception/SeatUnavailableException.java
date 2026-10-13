package com.vygo.exception;

import com.vygo.dto.booking.ConflictDetail;

/**
 * Raised when a seat the user tried to lock is no longer available (already
 * locked or booked by someone else). Typed 409 conflict carrying the
 * conflicting seat numbers and 1-2 nearest available alternatives so the
 * frontend can offer them.
 */
public class SeatUnavailableException extends ConflictException {

    public SeatUnavailableException(String message, ConflictDetail detail) {
        super(message, detail);
    }
}
