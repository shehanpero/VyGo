package com.vygo.repository;

import com.vygo.entity.Booking;
import com.vygo.entity.Booking.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    Optional<Booking> findByBookingRef(String bookingRef);

    Page<Booking> findByPassengerIdOrderByIdDesc(Long passengerId, Pageable pageable);

    Page<Booking> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Booking> findByStatusOrderByCreatedAtDesc(BookingStatus status, Pageable pageable);

    List<Booking> findByTripId(Long tripId);

    List<Booking> findByTripIdAndStatus(Long tripId, BookingStatus status);

    List<Booking> findByCreatedAtBetween(LocalDateTime from, LocalDateTime to);

    List<Booking> findByStatusAndCreatedAtBetween(BookingStatus status, LocalDateTime from, LocalDateTime to);

    long countByStatus(BookingStatus status);
}
