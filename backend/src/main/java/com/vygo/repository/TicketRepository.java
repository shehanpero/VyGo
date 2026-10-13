package com.vygo.repository;

import com.vygo.entity.Ticket;
import com.vygo.entity.Ticket.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    Optional<Ticket> findByTicketRef(String ticketRef);

    List<Ticket> findByBookingId(Long bookingId);

    List<Ticket> findByBookingIdAndStatus(Long bookingId, TicketStatus status);
}
