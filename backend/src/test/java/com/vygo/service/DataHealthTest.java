package com.vygo.service;

import com.vygo.entity.BoardingPoint;
import com.vygo.entity.Route;
import com.vygo.entity.Route.RouteClass;
import com.vygo.entity.Route.RouteType;
import com.vygo.entity.Schedule;
import com.vygo.entity.Schedule.ScheduleStatus;
import com.vygo.repository.BoardingPointRepository;
import com.vygo.repository.FareRuleRepository;
import com.vygo.repository.RouteRepository;
import com.vygo.repository.ScheduleRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class DataHealthTest {

    private static final Set<String> VALID_EXPRESSWAY_CODES = Set.of("E001", "E003");

    @Autowired
    private RouteRepository routeRepository;

    @Autowired
    private ScheduleRepository scheduleRepository;

    @Autowired
    private FareRuleRepository fareRuleRepository;

    @Autowired
    private BoardingPointRepository boardingPointRepository;

    @Autowired
    private CityGazetteer cityGazetteer;

    @Test
    void routeCatalogueCountMatchesSeed() {
        // 107 original seeds (3 renumbered in place: 15->15/3, 16->16/1, 48->48/4)
        // + 4 manual routes (01, 02, 30, 34)
        // + 21 expressway corridor routes (EX 2-1..2-19, EX 3-1, EX 3-2)
        // + 14 classic numbered routes (4, 15, 16, 17/57, 47, 48, 99/1..99/3, 122/1..122/4, 138/4)
        // = 146 total
        // NOTE: routes 30 (Colombo-Jaffna) and 34 (Kandy-Galle) are created in the manual block above;
        // they are now completed with boarding points + active schedules, but no NEW route records were
        // added, so the catalogue count stays 146.
        assertEquals(146, routeRepository.count(), "expected the seeded route catalogue (107 seeds + 4 manual routes + 21 expressway corridors + 14 classic routes)");
    }

    @Test
    void noDuplicateRouteNumbers() {
        List<String> numbers = routeRepository.findAll().stream()
                .map(Route::getRouteNumber)
                .toList();
        assertEquals(numbers.size(), new HashSet<>(numbers).size(), "route numbers must be unique");
    }

    @Test
    void routesHaveNoMissingFields() {
        for (Route route : routeRepository.findAll()) {
            assertNotNull(route.getRouteNumber(), "route id " + route.getId() + " has a blank route number");
            assertFalse(route.getRouteNumber().isBlank());
            assertNotNull(route.getFromCity(), "route " + route.getRouteNumber() + " has a null fromCity");
            assertFalse(route.getFromCity().isBlank());
            assertNotNull(route.getToCity(), "route " + route.getRouteNumber() + " has a null toCity");
            assertFalse(route.getToCity().isBlank());
            assertNotNull(route.getDistanceKm(), "route " + route.getRouteNumber() + " has a null distanceKm");
            assertNotNull(route.getDurationMin(), "route " + route.getRouteNumber() + " has a null durationMin");
        }
    }

    @Test
    void everyExpresswayRouteHasValidCode() {
        for (Route route : routeRepository.findAll()) {
            if (route.getRouteType() == RouteType.EXPRESSWAY) {
                assertNotNull(route.getExpresswayCode(),
                        "EXPRESSWAY route " + route.getRouteNumber() + " has no expresswayCode");
                assertTrue(VALID_EXPRESSWAY_CODES.contains(route.getExpresswayCode()),
                        "EXPRESSWAY route " + route.getRouteNumber() + " has unexpected code " + route.getExpresswayCode());
            }
        }
    }

    @Test
    void everyActiveScheduleHasFareRuleForItsBusType() {
        List<Schedule> schedules = scheduleRepository.findAll();
        assertFalse(schedules.isEmpty(), "expected seeded schedules");
        for (Schedule schedule : schedules) {
            if (schedule.getStatus() != ScheduleStatus.ACTIVE) {
                continue;
            }
            String routeNumber = schedule.getRoute().getRouteNumber();
            String busType = schedule.getBus().getBusType().name();
            assertTrue(fareRuleRepository.findByRouteIdAndBusType(
                            schedule.getRoute().getId(), schedule.getBus().getBusType()).isPresent(),
                    "active schedule on route " + routeNumber + " / bus type " + busType + " has no fare rule");
        }
    }

    @Test
    void gazetteerNormalizesEveryRouteCityToCanonical() {
        Set<String> cities = new LinkedHashSet<>();
        for (Route route : routeRepository.findAll()) {
            cities.add(route.getFromCity());
            cities.add(route.getToCity());
        }
        assertFalse(cities.isEmpty());
        for (String city : cities) {
            assertTrue(cityGazetteer.normalize(city).isPresent(),
                    "gazetteer could not normalize route city '" + city + "'");
        }
    }

    @Test
    void cityAndSuburbanBoardingPointsStayOnRouteEndpoints() {
        for (Route route : routeRepository.findAll()) {
            if (route.getRouteClass() != RouteClass.CITY && route.getRouteClass() != RouteClass.SUBURBAN) {
                continue;
            }
            List<BoardingPoint> points = boardingPointRepository.findByRouteIdOrderBySequenceAsc(route.getId());
            assertFalse(points.isEmpty(), "route " + route.getRouteNumber() + " has no boarding points");
            for (BoardingPoint point : points) {
                boolean onEndpoint = point.getCity().equalsIgnoreCase(route.getFromCity())
                        || point.getCity().equalsIgnoreCase(route.getToCity());
                assertTrue(onEndpoint,
                        "boarding point '" + point.getName() + "' on route " + route.getRouteNumber()
                                + " has off-route city '" + point.getCity() + "'");
            }
        }
    }
}
