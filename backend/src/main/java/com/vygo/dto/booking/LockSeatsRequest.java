package com.vygo.dto.booking;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record LockSeatsRequest(
        @NotNull Long tripId,
        @NotEmpty List<String> seatNumbers,
        @NotNull Long boardingPointId,
        @NotNull Long dropoffPointId) {
}
