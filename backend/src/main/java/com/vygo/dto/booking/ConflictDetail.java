package com.vygo.dto.booking;

import java.util.List;

/**
 * Machine-readable detail attached to a 409 conflict response. It is purely
 * additive to the existing {@code ErrorResponse} shape: the legacy fields
 * (status, error, path, timestamp) remain unchanged, and consumers that only
 * read those fields are unaffected.
 *
 * @param code                  stable conflict code, e.g. SEAT_UNAVAILABLE or SEAT_LOCK_EXPIRED
 * @param message               human-readable summary of the conflict
 * @param conflictingSeats      the seat number(s) that triggered the conflict
 * @param suggestedAlternatives 1-2 nearest available alternatives per conflicting seat
 */
public record ConflictDetail(
        String code,
        String message,
        List<String> conflictingSeats,
        List<SuggestedSeat> suggestedAlternatives) {
}
