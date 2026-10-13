package com.vygo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "route_tool")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteTool {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "corridor", nullable = false, length = 200)
    private String corridor;

    @Column(name = "from_city", nullable = false, length = 80)
    private String fromCity;

    @Column(name = "to_city", nullable = false, length = 80)
    private String toCity;

    @Column(name = "via", length = 300)
    private String via;

    @Enumerated(EnumType.STRING)
    @Column(name = "network", nullable = false, length = 20)
    private RouteToolNetwork network;

    @Column(name = "operator_type", length = 80)
    private String operatorType;

    @Column(name = "operators", length = 500)
    private String operators;

    @Column(name = "phones", length = 300)
    @Builder.Default
    private String phones = "";

    @Column(name = "route_numbers", length = 200)
    private String routeNumbers;

    @Column(name = "notes", length = 300)
    private String notes;

    @Column(name = "distance_km")
    private Double distanceKm;

    @Column(name = "duration_min")
    private Integer durationMin;

    @Column(name = "has_bookable_trips", nullable = false)
    private boolean hasBookableTrips;

    public enum RouteToolNetwork { EXPRESSWAY, NORMAL }
}
