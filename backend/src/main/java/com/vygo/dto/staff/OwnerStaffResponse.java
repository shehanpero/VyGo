package com.vygo.dto.staff;

public record OwnerStaffResponse(
        Long userId,
        String fullName,
        String email,
        String mobile,
        String role,
        String profileImageUrl,
        Boolean mobileVerified,
        String verificationStatus,
        String verificationNote,
        String submittedAt) {
}
