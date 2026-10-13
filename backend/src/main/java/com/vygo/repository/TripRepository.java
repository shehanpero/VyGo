package com.vygo.repository;

import com.vygo.entity.Trip;
import com.vygo.entity.Trip.TripStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TripRepository extends JpaRepository<Trip, Long> {

    Optional<Trip> findByScheduleIdAndTripDate(Long scheduleId, LocalDate tripDate);

    List<Trip> findByTripDate(LocalDate tripDate);

    List<Trip> findByTripDateBetween(LocalDate start, LocalDate end);

    @Query("SELECT t FROM Trip t JOIN t.schedule s JOIN s.route r " +
            "WHERE r.fromCity = :from AND r.toCity = :to AND t.tripDate = :date")
    List<Trip> searchByRouteAndDate(@Param("from") String from, @Param("to") String to, @Param("date") LocalDate date);

    List<Trip> findByTripDateAndStatus(LocalDate tripDate, TripStatus status);
}
