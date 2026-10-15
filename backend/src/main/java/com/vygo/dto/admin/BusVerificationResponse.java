package com.vygo.dto.admin;

public record BusVerificationResponse(
        Long id,
        String registrationNo,
        String busType,
        Integer capacity,
        String model,
        Integer year,
        String amenities,
        String status,
        Long operatorId,
        String operatorName,
        String operatorRegistrationNo,
        String operatorType,
        String ownerName,
        String ownerEmail) {
}
