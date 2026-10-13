package com.vygo.dto.operator;

import java.util.List;

public record BusResponse(
        Long id,
        String registrationNo,
        String busType,
        Integer capacity,
        List<String> amenities,
        String model,
        Integer year,
        String status) {
}
