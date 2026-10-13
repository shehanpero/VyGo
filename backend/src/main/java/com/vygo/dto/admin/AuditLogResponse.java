package com.vygo.dto.admin;

public record AuditLogResponse(
        Long id,
        Long actorId,
        String action,
        String entityType,
        String entityId,
        String details,
        String ipAddress,
        String createdAt) {
}
