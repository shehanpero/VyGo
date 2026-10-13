package com.vygo.dto.operator;

public record BusLiveResponse(
        Long busId,
        String registrationNo,
        String route,
        Double latitude,
        Double longitude,
        Double speedKph,
        String staffName,
        String recordedAt) {
}
