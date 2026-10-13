package com.vygo.repository;

import com.vygo.entity.BusStaff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BusStaffRepository extends JpaRepository<BusStaff, Long> {

    List<BusStaff> findByBusIdOrderByIdAsc(Long busId);

    List<BusStaff> findByUserId(Long userId);

    Optional<BusStaff> findByBusIdAndUserId(Long busId, Long userId);

    List<BusStaff> findByBusOperatorId(Long operatorId);
}
