package com.vygo.dto.admin;

public record ComplaintResponse(
        Long id,
        Long passengerId,
        String passengerName,
        Long bookingId,
        String subject,
        String description,
        String status,
        String resolution,
        Long assignedTo,
        String createdAt,
        String updatedAt) {
}
