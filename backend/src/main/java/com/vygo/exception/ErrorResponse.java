package com.vygo.exception;

import com.vygo.dto.booking.ConflictDetail;

import java.time.Instant;

public record ErrorResponse(int status, String error, String path, String timestamp, ConflictDetail conflict) {

    public static ErrorResponse now(int status, String error, String path) {
        return new ErrorResponse(status, error, path, Instant.now().toString(), null);
    }

    public static ErrorResponse now(int status, String error, String path, ConflictDetail conflict) {
        return new ErrorResponse(status, error, path, Instant.now().toString(), conflict);
    }
}
