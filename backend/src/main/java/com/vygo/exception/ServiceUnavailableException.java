package com.vygo.exception;

public class ServiceUnavailableException extends ApiException {

    public ServiceUnavailableException(String message) {
        super(503, message);
    }
}
