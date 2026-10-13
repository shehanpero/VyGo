package com.vygo.repository;

import com.vygo.entity.SeatInventory;
import com.vygo.entity.SeatInventory.SeatStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface SeatInventoryRepository extends JpaRepository<SeatInventory, Long> {

    @Query("select s from SeatInventory s where s.trip.id = :tripId " +
            "order by length(s.seatNumber) asc, s.seatNumber asc")
    List<SeatInventory> findByTripIdOrderBySeatNumberAsc(@Param("tripId") Long tripId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SeatInventory s where s.trip.id = :tripId and s.seatNumber in :seats")
    List<SeatInventory> lockSeatsForUpdate(@Param("tripId") Long tripId, @Param("seats") Collection<String> seats);

    List<SeatInventory> findByTripIdAndSeatNumberIn(Long tripId, Collection<String> seatNumbers);

    long countByTripId(Long tripId);

    long countByTripIdAndStatus(Long tripId, SeatStatus status);
}
