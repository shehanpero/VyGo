package com.vygo.repository;

import com.vygo.entity.BoardingPoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BoardingPointRepository extends JpaRepository<BoardingPoint, Long> {

    List<BoardingPoint> findByRouteIdOrderBySequenceAsc(Long routeId);
}
