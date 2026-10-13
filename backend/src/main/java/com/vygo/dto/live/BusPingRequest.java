package com.vygo.dto.live;

import jakarta.validation.constraints.NotNull;

public record BusPingRequest(
        Long busId,
        @NotNull Double latitude,
        @NotNull Double longitude,
        Double speedKph) {
}
