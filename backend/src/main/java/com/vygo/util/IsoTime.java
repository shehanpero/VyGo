package com.vygo.util;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Formats server-local {@link LocalDateTime} values as absolute ISO-8601 instants
 * (UTC, trailing {@code Z}).
 * <p>
 * Seat-lock expiry is computed with {@code LocalDateTime.now()} (server wall
 * clock, no zone) and consumed by clients that run in a different timezone (the
 * app targets Asia/Colombo while the server may run in UTC or another zone). A
 * zone-less string such as {@code 2026-10-12T05:03:22} is parsed by the browser
 * in the <em>device</em> timezone, so a device ahead of the server sees the lock
 * as already expired the moment it is created. Emitting the instant in UTC makes
 * the client countdown timezone-independent.
 */
public final class IsoTime {

    private IsoTime() {
    }

    public static String instant(LocalDateTime value) {
        if (value == null) {
            return null;
        }
        return value.atZone(ZoneId.systemDefault()).toInstant().toString();
    }
}
