package com.vygo.repository;

import com.vygo.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RouteRepository extends JpaRepository<Route, Long> {

    Optional<Route> findByFromCityIgnoreCaseAndToCityIgnoreCase(String fromCity, String toCity);

    Optional<Route> findByRouteNumber(String routeNumber);

    List<Route> findAllByFromCityIgnoreCaseAndToCityIgnoreCase(String fromCity, String toCity);

    List<Route> findByFromCityContainingIgnoreCaseOrToCityContainingIgnoreCase(String fromCity, String toCity);

    List<Route> findByFromCityContainingIgnoreCaseOrToCityContainingIgnoreCaseOrRouteNumberContainingIgnoreCase(
            String fromCity, String toCity, String routeNumber);

    List<Route> findAllByOrderByFromCityAsc();

    List<Route> findByRouteTypeOrderByFromCityAsc(Route.RouteType routeType);

    List<Route> findByRouteClassOrderByFromCityAsc(Route.RouteClass routeClass);

    List<Route> findByRouteTypeAndRouteClassOrderByFromCityAsc(
            Route.RouteType routeType, Route.RouteClass routeClass);
}
