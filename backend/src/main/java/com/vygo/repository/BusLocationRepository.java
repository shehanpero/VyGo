package com.vygo.repository;

import com.vygo.entity.BusLocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BusLocationRepository extends JpaRepository<BusLocation, Long> {

    Optional<BusLocation> findTopByBusIdOrderByRecordedAtDesc(Long busId);

    List<BusLocation> findByBusIdOrderByRecordedAtDesc(Long busId);
}
