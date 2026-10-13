package com.vygo.exception;

import com.vygo.dto.booking.ConflictDetail;

public class ConflictException extends ApiException {

    private final ConflictDetail detail;

    public ConflictException(String message) {
        this(message, null);
    }

    /**
     * @param detail optional machine-readable conflict detail; when present the
     *               serialized 409 body gains a top-level {@code conflict} field.
     *               Existing clients that ignore unknown fields are unaffected.
     */
    public ConflictException(String message, ConflictDetail detail) {
        super(409, message);
        this.detail = detail;
    }

    public ConflictDetail getDetail() {
        return detail;
    }
}
