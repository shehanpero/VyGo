package com.vygo.dto.driver;

public record DriverBusResponse(
        Long busId,
        String registrationNo,
        String busType,
        Integer capacity,
        String role) {
}
