package com.vygo.repository;

import com.vygo.entity.RouteTool;
import com.vygo.entity.RouteTool.RouteToolNetwork;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RouteToolRepository extends JpaRepository<RouteTool, Long> {

    List<RouteTool> findByNetwork(RouteToolNetwork network);

    List<RouteTool> findByFromCityContainingIgnoreCaseOrToCityContainingIgnoreCaseOrCorridorContainingIgnoreCase(
            String fromCity, String toCity, String corridor);
}
