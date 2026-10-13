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
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "bus_operators")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusOperator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "registration_no", nullable = false, unique = true, length = 60)
    private String registrationNo;

    @Column(name = "license_no", length = 60)
    private String licenseNo;

    @Column(name = "address")
    private String address;

    @Column(name = "contact_person", length = 120)
    private String contactPerson;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "email", length = 150)
    private String email;

    /**
     * Whether this registrant is an individual/single private bus owner
     * (OWNER) or a collective body such as SLTB / an expressway operators'
     * association (ASSOCIATION). Legacy rows may be null until the dev data
     * initializer backfills them; use {@link #typeOrDefault()} to read safely.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "operator_type", length = 20)
    @Builder.Default
    private OperatorType operatorType = OperatorType.OWNER;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private OperatorStatus status = OperatorStatus.PENDING;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = OperatorStatus.PENDING;
        if (operatorType == null) operatorType = OperatorType.OWNER;
    }

    public OperatorType typeOrDefault() {
        return operatorType == null ? OperatorType.OWNER : operatorType;
    }

    public enum OperatorStatus { PENDING, APPROVED, REJECTED, SUSPENDED }

    public enum OperatorType { OWNER, ASSOCIATION }
}
