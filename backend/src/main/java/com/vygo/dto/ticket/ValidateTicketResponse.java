package com.vygo.dto.ticket;

public record ValidateTicketResponse(
        boolean valid,
        String message,
        TicketResponse ticket) {
}
