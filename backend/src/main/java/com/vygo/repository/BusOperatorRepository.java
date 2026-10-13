package com.vygo.repository;

import com.vygo.entity.BusOperator;
import com.vygo.entity.BusOperator.OperatorStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BusOperatorRepository extends JpaRepository<BusOperator, Long> {

    List<BusOperator> findByStatus(OperatorStatus status);

    Optional<BusOperator> findByUserId(Long userId);
}
