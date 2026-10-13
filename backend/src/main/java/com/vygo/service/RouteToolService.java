package com.vygo.service;

import com.vygo.dto.routetools.BoardingPointView;
import com.vygo.dto.routetools.RouteToolDto;
import com.vygo.dto.routetools.ScheduleView;
import com.vygo.entity.BoardingPoint;
import com.vygo.entity.FareRule;
import com.vygo.entity.Route;
import com.vygo.entity.RouteTool;
import com.vygo.entity.RouteTool.RouteToolNetwork;
import com.vygo.entity.Schedule;
import com.vygo.entity.Schedule.ScheduleStatus;
import com.vygo.exception.NotFoundException;
import com.vygo.repository.BoardingPointRepository;
import com.vygo.repository.FareRuleRepository;
import com.vygo.repository.RouteRepository;
import com.vygo.repository.RouteToolRepository;
import com.vygo.repository.ScheduleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

@Service
public class RouteToolService {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final BigDecimal FALLBACK_BASE_FARE = new BigDecimal("1000.00");

    private final RouteToolRepository routeToolRepository;
    private final RouteRepository routeRepository;
    private final ScheduleRepository scheduleRepository;
    private final BoardingPointRepository boardingPointRepository;
    private final FareRuleRepository fareRuleRepository;
    private final FareCalculator fareCalculator;

    public RouteToolService(RouteToolRepository routeToolRepository,
                            RouteRepository routeRepository,
                            ScheduleRepository scheduleRepository,
                            BoardingPointRepository boardingPointRepository,
                            FareRuleRepository fareRuleRepository,
                            FareCalculator fareCalculator) {
        this.routeToolRepository = routeToolRepository;
        this.routeRepository = routeRepository;
        this.scheduleRepository = scheduleRepository;
        this.boardingPointRepository = boardingPointRepository;
        this.fareRuleRepository = fareRuleRepository;
        this.fareCalculator = fareCalculator;
    }

    public List<RouteToolDto> list(String q, RouteToolNetwork network) {
        List<RouteTool> tools;
        boolean hasQ = q != null && !q.isBlank();
        if (hasQ) {
            String query = q.trim();
            tools = new ArrayList<>(routeToolRepository
                    .findByFromCityContainingIgnoreCaseOrToCityContainingIgnoreCaseOrCorridorContainingIgnoreCase(
                            query, query, query));
        } else {
            tools = new ArrayList<>(routeToolRepository.findAll());
        }
        if (network != null) {
            tools.removeIf(t -> t.getNetwork() != network);
        }
        tools.sort(Comparator.comparing(RouteTool::getCorridor));
        return tools.stream().map(this::toDto).toList();
    }

    public RouteToolDto findById(Long id) {
        RouteTool tool = routeToolRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Route tool not found"));
        return toDto(tool);
    }

    @Transactional(readOnly = true)
    public List<ScheduleView> timetable(Long routeToolId) {
        RouteTool tool = routeToolRepository.findById(routeToolId)
                .orElseThrow(() -> new NotFoundException("Route tool not found"));
        String firstRouteNumber = firstRouteNumber(tool.getRouteNumbers());
        if (firstRouteNumber == null) {
            return List.of();
        }
        Route route = routeRepository.findByRouteNumber(firstRouteNumber).orElse(null);
        if (route == null) {
            return List.of();
        }
        List<Schedule> schedules = scheduleRepository.findByRouteIdAndStatus(route.getId(), ScheduleStatus.ACTIVE);
        if (schedules.isEmpty()) {
            return List.of();
        }
        List<BoardingPoint> boardingPoints = boardingPointRepository.findByRouteIdOrderBySequenceAsc(route.getId());
        List<ScheduleView> views = new ArrayList<>();
        for (Schedule schedule : schedules) {
            FareRule rule = fareRuleRepository.findByRouteIdAndBusType(route.getId(), schedule.getBus().getBusType())
                    .orElse(null);
            BigDecimal fare = rule != null
                    ? fareCalculator.calculate(rule, route.getDistanceKm())
                    : FALLBACK_BASE_FARE;
            List<BoardingPointView> pointViews = boardingPoints.stream()
                    .map(bp -> new BoardingPointView(
                            bp.getName(),
                            bp.getCity(),
                            schedule.getDepartureTime()
                                    .plusMinutes(bp.getTimeOffsetMin() != null ? bp.getTimeOffsetMin() : 0)
                                    .format(TIME)))
                    .toList();
            views.add(new ScheduleView(
                    route.getRouteNumber(),
                    schedule.getOperator().getName(),
                    schedule.getBus().getBusType().name(),
                    schedule.getDepartureTime().format(TIME),
                    schedule.getArrivalTime().format(TIME),
                    route.getDistanceKm(),
                    route.getDurationMin(),
                    fare,
                    pointViews));
        }
        views.sort(Comparator.comparing(ScheduleView::departureTime));
        return views;
    }

    private String firstRouteNumber(String routeNumbers) {
        if (routeNumbers == null || routeNumbers.isBlank()) {
            return null;
        }
        return routeNumbers.split(",")[0].trim();
    }

    private RouteToolDto toDto(RouteTool tool) {
        return new RouteToolDto(
                tool.getId(),
                tool.getCorridor(),
                tool.getFromCity(),
                tool.getToCity(),
                tool.getVia(),
                tool.getNetwork() != null ? tool.getNetwork().name() : null,
                tool.getOperatorType(),
                splitList(tool.getOperators()),
                splitList(tool.getPhones()),
                splitList(tool.getRouteNumbers()),
                tool.getNotes(),
                tool.getDistanceKm(),
                tool.getDurationMin(),
                tool.isHasBookableTrips());
    }

    private List<String> splitList(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}
