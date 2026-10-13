package com.vygo.dto.auth;

import java.util.List;

public record UserDto(
        Long id,
        String fullName,
        String email,
        String mobile,
        List<String> roles,
        Boolean enabled,
        Long operatorId,
        String profileImageUrl,
        Boolean mobileVerified,
        String verificationStatus,
        Long ownerId,
        String ownerName) {
}
