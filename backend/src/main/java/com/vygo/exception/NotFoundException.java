package com.vygo.exception;

public class NotFoundException extends ApiException {

    public NotFoundException(String message) {
        super(404, message);
    }
}
