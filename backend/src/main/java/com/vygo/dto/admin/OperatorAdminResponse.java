package com.vygo.dto.admin;

public record OperatorAdminResponse(
        Long id,
        String name,
        String registrationNo,
        String licenseNo,
        String status,
        String type,
        String ownerName,
        String ownerEmail,
        String createdAt) {
}
