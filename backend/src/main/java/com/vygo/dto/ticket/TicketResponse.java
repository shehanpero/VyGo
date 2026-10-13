package com.vygo.dto.ticket;

public record TicketResponse(
        Long id,
        String ticketRef,
        String bookingRef,
        String passengerName,
        String seatNumber,
        String tripDate,
        String departureTime,
        String from,
        String to,
        String busReg,
        String operator,
        String status,
        String qrCodeUrl) {
}
