package com.vygo.dto.search;

import java.math.BigDecimal;
import java.util.List;

public record SeatMapResponse(
        Long tripId,
        String busType,
        String model,
        String serviceClass,
        Integer capacity,
        BigDecimal farePerSeat,
        List<String> amenities,
        List<SeatDto> seats,
        String vehicleModel,
        List<Integer> allowedSeatCounts) {
}
