package com.vygo.dto.routetools;

import java.util.List;

public record RouteToolDto(
        Long id,
        String corridor,
        String fromCity,
        String toCity,
        String via,
        String network,
        String operatorType,
        List<String> operators,
        List<String> phones,
        List<String> routeNumbers,
        String notes,
        Double distanceKm,
        Integer durationMin,
        boolean hasBookableTrips) {
}
