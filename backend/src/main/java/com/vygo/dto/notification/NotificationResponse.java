package com.vygo.dto.notification;

public record NotificationResponse(
        Long id,
        String channel,
        String subject,
        String body,
        String status,
        Boolean isRead,
        String sentAt) {
}
