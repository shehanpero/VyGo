package com.vygo.dto.ticket;

import jakarta.validation.constraints.NotBlank;

public record ValidateTicketRequest(
        @NotBlank String qrContent,
        Long tripId) {
}
