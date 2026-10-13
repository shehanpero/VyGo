package com.vygo.dto.booking;

import com.vygo.dto.search.BoardingPointDto;

import java.math.BigDecimal;
import java.util.List;

public record BookingResponse(
        Long id,
        String bookingRef,
        Long tripId,
        String status,
        List<String> seatNumbers,
        Integer seatsCount,
        BigDecimal totalFare,
        BoardingPointDto boardingPoint,
        BoardingPointDto dropoffPoint,
        BusSummaryDto bus,
        String tripDate,
        String createdAt,
        BigDecimal paymentRequired,
        String passengerName,
        List<TicketSummaryDto> tickets,
        RefundSummaryDto refund) {
}
