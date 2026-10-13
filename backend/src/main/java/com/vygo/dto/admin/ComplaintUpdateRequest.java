package com.vygo.dto.admin;

public record ComplaintUpdateRequest(
        String status,
        String resolution,
        Long assignedTo) {
}
