package com.vygo.exception;

public class UnauthorizedException extends ApiException {

    public UnauthorizedException(String message) {
        super(401, message);
    }
}
