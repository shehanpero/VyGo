package com.vygo.dto.booking;

public record TicketSummaryDto(
        Long id,
        String ticketRef,
        String seatNumber,
        String status,
        String qrCodeUrl) {
}
