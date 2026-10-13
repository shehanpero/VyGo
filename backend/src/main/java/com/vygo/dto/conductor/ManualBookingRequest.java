package com.vygo.dto.conductor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.List;

public record ManualBookingRequest(
        @NotNull Long tripId,
        @NotEmpty List<String> seatNumbers,
        @NotBlank String passengerName,
        @NotBlank @Pattern(regexp = "^0[0-9]{9}$") String passengerMobile,
        @NotBlank String paymentMethod,
        @NotNull @Positive BigDecimal amountPaid,
        @NotNull Long boardingPointId,
        @NotNull Long dropoffPointId) {
}
