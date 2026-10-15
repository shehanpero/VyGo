package com.vygo.dto.staff;

public record StaffVerificationResponse(
        Long userId,
        String fullName,
        String email,
        String mobile,
        Boolean mobileVerified,
        String role,
        String operatorType,
        Long ownerId,
        String ownerName,
        String idType,
        String idNumber,
        String idFrontUrl,
        String idBackUrl,
        String licenseUrl,
        String businessDocUrl,
        String selfieUrl,
        String profileImageUrl,
        Double faceMatchScore,
        Boolean livenessPassed,
        String livenessActions,
        Boolean spoofPassed,
        String status,
        String note,
        String submittedAt,
        String verifiedAt) {
}
