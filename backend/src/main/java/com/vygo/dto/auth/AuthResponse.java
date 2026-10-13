package com.vygo.dto.auth;

public record AuthResponse(
        String accessToken,
        String tokenType,
        Long expiresIn,
        UserDto user) {
}
