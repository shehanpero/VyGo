package com.vygo.dto.operator;

public record BusStaffResponse(
        Long id,
        Long userId,
        String fullName,
        String email,
        String mobile,
        String role,
        String assignedAt) {
}
