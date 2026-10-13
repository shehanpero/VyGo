package com.vygo.controller;

import com.vygo.dto.notification.NotificationResponse;
import com.vygo.security.CurrentUser;
import com.vygo.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@Tag(name = "Notifications", description = "In-app notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    @Operation(summary = "List the current user's notifications")
    public List<NotificationResponse> list() {
        return notificationService.listForUser(CurrentUser.id());
    }

    @PostMapping("/{id}/read")
    @Operation(summary = "Mark a notification as read")
    public void markRead(@PathVariable Long id) {
        notificationService.markRead(CurrentUser.id(), id);
    }
}
