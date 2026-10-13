package com.vygo.repository;

import com.vygo.entity.Bus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BusRepository extends JpaRepository<Bus, Long> {

    List<Bus> findByOperatorIdOrderByIdDesc(Long operatorId);

    Optional<Bus> findByRegistrationNo(String registrationNo);
}
