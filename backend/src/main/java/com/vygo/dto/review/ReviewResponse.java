package com.vygo.dto.review;

public record ReviewResponse(
        Long id,
        String passengerName,
        Integer rating,
        String comment,
        String createdAt) {
}
