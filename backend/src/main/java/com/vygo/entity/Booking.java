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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "booking_ref", nullable = false, unique = true, length = 40)
    private String bookingRef;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passenger_id", nullable = false)
    private User passenger;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING;

    @Column(name = "seats_count", nullable = false)
    private Integer seatsCount;

    @Column(name = "total_fare", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalFare;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "boarding_point_id", nullable = false)
    private BoardingPoint boardingPoint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dropoff_point_id", nullable = false)
    private BoardingPoint dropoffPoint;

    @Enumerated(EnumType.STRING)
    @Column(name = "booked_via", nullable = false, length = 10)
    @Builder.Default
    private BookedVia bookedVia = BookedVia.ONLINE;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancellation_reason", length = 255)
    private String cancellationReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = BookingStatus.PENDING;
        if (bookedVia == null) bookedVia = BookedVia.ONLINE;
    }

    public enum BookingStatus { PENDING, CONFIRMED, CANCELLED, COMPLETED }

    public enum BookedVia { ONLINE, MANUAL }
}
