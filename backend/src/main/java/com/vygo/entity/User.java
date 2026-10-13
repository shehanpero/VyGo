package com.vygo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(name = "email", unique = true, length = 150)
    private String email;

    @Column(name = "mobile", nullable = false, unique = true, length = 20)
    private String mobile;

    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    @Column(name = "otp_code", length = 6)
    private String otpCode;

    @Column(name = "otp_expires_at")
    private LocalDateTime otpExpiresAt;

    @Column(name = "otp_verified")
    @Builder.Default
    private Boolean otpVerified = false;

    @Column(name = "enabled", nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @Column(name = "profile_image_url", length = 300)
    private String profileImageUrl;

    @Column(name = "mobile_verified")
    @Builder.Default
    private Boolean mobileVerified = false;

    // ---- identity verification (drivers & conductors) ----------------

    @Column(name = "id_type", length = 20)
    private String idType;

    @Column(name = "id_number", length = 60)
    private String idNumber;

    @Column(name = "id_front_url", length = 300)
    private String idFrontUrl;

    @Column(name = "id_back_url", length = 300)
    private String idBackUrl;

    @Column(name = "license_url", length = 300)
    private String licenseUrl;

    @Column(name = "selfie_url", length = 300)
    private String selfieUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", length = 20)
    @Builder.Default
    private IdentityStatus verificationStatus = IdentityStatus.UNVERIFIED;

    @Column(name = "verification_note", length = 300)
    private String verificationNote;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    /** The bus owner / association this driver or conductor belongs to. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "owner_id")
    private BusOperator owner;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (enabled == null) enabled = true;
        if (otpVerified == null) otpVerified = false;
        if (mobileVerified == null) mobileVerified = false;
        if (verificationStatus == null) verificationStatus = IdentityStatus.UNVERIFIED;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public boolean hasRole(String code) {
        if (roles == null) return false;
        return roles.stream()
                .anyMatch(r -> r.getCode() != null && r.getCode().name().equals(code));
    }

    /** Identity verification workflow for drivers and conductors. */
    public enum IdentityStatus { UNVERIFIED, PENDING, VERIFIED, REJECTED }
}
