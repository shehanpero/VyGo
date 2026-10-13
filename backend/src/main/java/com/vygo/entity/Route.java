package com.vygo.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "routes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Route {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "route_number", length = 20)
    private String routeNumber;

    @Column(name = "from_city", nullable = false, length = 80)
    private String fromCity;

    @Column(name = "to_city", nullable = false, length = 80)
    private String toCity;

    @Enumerated(EnumType.STRING)
    @Column(name = "route_type", nullable = false, length = 20)
    @Builder.Default
    private RouteType routeType = RouteType.NORMAL;

    @Column(name = "expressway_code", length = 20)
    private String expresswayCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "route_class", length = 20)
    private RouteClass routeClass;

    @Column(name = "distance_km", nullable = false, precision = 8, scale = 2)
    private BigDecimal distanceKm;

    @Column(name = "duration_min", nullable = false)
    private Integer durationMin;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private RouteStatus status = RouteStatus.APPROVED;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, mappedBy = "route")
    @OrderBy("sequence ASC")
    @Builder.Default
    private List<BoardingPoint> boardingPoints = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = RouteStatus.APPROVED;
    }

    public enum RouteStatus { PENDING, APPROVED, REJECTED }

    public enum RouteType { NORMAL, EXPRESSWAY }

    public enum RouteClass { CITY, SUBURBAN, INTERCITY, LONG_DISTANCE }
}
