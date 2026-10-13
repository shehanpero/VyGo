package com.vygo.repository;

import com.vygo.entity.Bus.BusType;
import com.vygo.entity.FareRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FareRuleRepository extends JpaRepository<FareRule, Long> {

    Optional<FareRule> findByRouteIdAndBusType(Long routeId, BusType busType);

    List<FareRule> findByRouteId(Long routeId);
}
