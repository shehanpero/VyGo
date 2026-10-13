package com.vygo.util;

import com.vygo.entity.Bus.BusType;

/**
 * Server-decided fleet variant ("service class") for a trip, derived from the
 * bus type. A user cannot toggle this: the frontend must render whichever
 * variant the server assigns to the bus.
 * <ul>
 *   <li>{@link #NORMAL} - 2+3 five-across bench seating (Ashok Leyland Viking
 *       style): {@code BusType.NORMAL}.</li>
 *   <li>{@link #EXPRESS} - 2+2 reclining coach seating (Yutong C12 Pro style):
 *       {@code BusType.SEMI_LUXURY}, {@code BusType.LUXURY}, {@code BusType.AC}.</li>
 * </ul>
 * <p>
 * This enum is the SINGLE source of truth for both the {@code serviceClass}
 * field exposed on the search / seat-map DTOs and the seat-map row layout used
 * by {@code SeatLockService} (left seats per row), so the two can never drift.
 */
public enum ServiceClass {

    /** 2+3 five-across, bench seats (left side has 3 seats per row). */
    NORMAL,
    /** 2+2 reclining coach seats (left side has 2 seats per row). */
    EXPRESS;

    public static ServiceClass from(BusType busType) {
        return busType == BusType.NORMAL ? NORMAL : EXPRESS;
    }

    /**
     * Number of seats on the LEFT side of a row in the rendered seat map.
     * NORMAL buses seat 2+3 (left = 3), EXPRESS buses seat 2+2 (left = 2).
     */
    public int leftSeats() {
        return this == NORMAL ? 3 : 2;
    }

    /** Total seats per row: left side + 2-seat right side. */
    public int seatsPerRow() {
        return leftSeats() + 2;
    }
}
