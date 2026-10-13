package com.vygo.service;

import com.vygo.dto.operator.RouteResponseDto;
import com.vygo.dto.search.BoardingPointDto;
import com.vygo.dto.search.SearchResponse;
import com.vygo.dto.search.SeatDto;
import com.vygo.dto.search.SeatMapResponse;
import com.vygo.entity.BoardingPoint;
import com.vygo.entity.Bus;
import com.vygo.entity.Bus.BusType;
import com.vygo.entity.FareRule;
import com.vygo.entity.Route;
import com.vygo.entity.Schedule;
import com.vygo.entity.Schedule.ScheduleStatus;
import com.vygo.entity.SeatInventory;
import com.vygo.entity.SeatInventory.SeatStatus;
import com.vygo.entity.Trip;
import com.vygo.entity.Trip.TripStatus;
import com.vygo.exception.NotFoundException;
import com.vygo.repository.BoardingPointRepository;
import com.vygo.repository.FareRuleRepository;
import com.vygo.repository.RouteRepository;
import com.vygo.repository.ScheduleRepository;
import com.vygo.repository.SeatInventoryRepository;
import com.vygo.repository.TripRepository;
import com.vygo.util.AmenityJson;
import com.vygo.util.FleetVehicle;
import com.vygo.util.ServiceClass;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TripService {

    private static final Logger log = LoggerFactory.getLogger(TripService.class);
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter TS = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final BigDecimal FALLBACK_BASE_FARE = new BigDecimal("1000").setScale(2, RoundingMode.HALF_UP);

    private final TripRepository tripRepository;
    private final ScheduleRepository scheduleRepository;
    private final RouteRepository routeRepository;
    private final FareRuleRepository fareRuleRepository;
    private final SeatInventoryRepository seatInventoryRepository;
    private final BoardingPointRepository boardingPointRepository;
    private final FareCalculator fareCalculator;

    public TripService(TripRepository tripRepository,
                       ScheduleRepository scheduleRepository,
                       RouteRepository routeRepository,
                       FareRuleRepository fareRuleRepository,
                       SeatInventoryRepository seatInventoryRepository,
                       BoardingPointRepository boardingPointRepository,
                       FareCalculator fareCalculator) {
        this.tripRepository = tripRepository;
        this.scheduleRepository = scheduleRepository;
        this.routeRepository = routeRepository;
        this.fareRuleRepository = fareRuleRepository;
        this.seatInventoryRepository = seatInventoryRepository;
        this.boardingPointRepository = boardingPointRepository;
        this.fareCalculator = fareCalculator;
    }

    @Transactional
    public List<SearchResponse> search(String from, String to, LocalDate date, String time,
                                       String busType, String sort, Route.RouteType routeType) {
        List<Route> matches = routeRepository.findAllByFromCityIgnoreCaseAndToCityIgnoreCase(
                from.trim(), to.trim());
        if (matches.isEmpty()) {
            return List.of();
        }
        List<Route> activeMatches = matches.stream()
                .filter(r -> !scheduleRepository.findByRouteIdAndStatus(r.getId(), ScheduleStatus.ACTIVE).isEmpty())
                .toList();
        if (activeMatches.isEmpty()) {
            return List.of();
        }
        List<SearchResponse> results = new ArrayList<>();

        for (Route route : activeMatches) {
            List<BoardingPoint> boardingPoints = boardingPointRepository.findByRouteIdOrderBySequenceAsc(route.getId());
            for (Schedule schedule : scheduleRepository.findByRouteIdAndStatus(route.getId(), ScheduleStatus.ACTIVE)) {
                if (!isEffectiveOn(schedule, date)) {
                    continue;
                }
                Trip trip = getOrCreateTrip(schedule, date);
                materializeSeats(trip);

                FareRule rule = fareRuleRepository.findByRouteIdAndBusType(route.getId(), schedule.getBus().getBusType())
                        .orElse(null);
                BigDecimal fare = rule != null
                        ? fareCalculator.calculate(rule, route.getDistanceKm())
                        : FALLBACK_BASE_FARE;
                long availableSeats = seatInventoryRepository.countByTripIdAndStatus(trip.getId(), SeatStatus.AVAILABLE);

                List<BoardingPointDto> pointDtos = boardingPoints.stream()
                        .map(bp -> toBoardingPointDto(bp, schedule.getDepartureTime()))
                        .toList();

                Bus bus = schedule.getBus();
                ServiceClass serviceClass = ServiceClass.from(bus.getBusType());
                results.add(new SearchResponse(
                        trip.getId(),
                        route.getId(),
                        route.getRouteNumber(),
                        route.getRouteType() != null ? route.getRouteType().name() : "NORMAL",
                        route.getFromCity(),
                        route.getToCity(),
                        bus.getBusType().name(),
                        serviceClass.name(),
                        schedule.getOperator().getName(),
                        bus.getRegistrationNo(),
                        schedule.getDepartureTime().format(TIME),
                        schedule.getArrivalTime().format(TIME),
                        route.getDistanceKm(),
                        route.getDurationMin(),
                        fare,
                        (int) availableSeats,
                        bus.getCapacity(),
                        pointDtos,
                        pointDtos,
                        bus.getModel(),
                        FleetVehicle.vehicleModelId(bus.getModel(), serviceClass),
                        FleetVehicle.allowedCapacities(bus.getModel(), serviceClass)));
            }
        }

        if (time != null && !time.isBlank()) {
            String filterTime = time.trim();
            results = results.stream()
                    .filter(r -> r.departureTime().compareTo(filterTime) >= 0)
                    .collect(Collectors.toCollection(ArrayList::new));
        }
        if (busType != null && !busType.isBlank()) {
            String filterType = busType.trim().toUpperCase();
            results = results.stream()
                    .filter(r -> r.busType().equalsIgnoreCase(filterType))
                    .collect(Collectors.toCollection(ArrayList::new));
        }
        if (routeType != null) {
            results = results.stream()
                    .filter(r -> routeType.name().equalsIgnoreCase(r.routeType()))
                    .collect(Collectors.toCollection(ArrayList::new));
        }
        String sortKey = sort == null || sort.isBlank() ? "departure" : sort.trim().toLowerCase();
        if ("fare".equals(sortKey)) {
            results.sort(Comparator.comparing(SearchResponse::fare));
        } else {
            results.sort(Comparator.comparing(SearchResponse::departureTime));
        }
        return results;
    }

    @Transactional
    public Trip getOrCreateTrip(Schedule schedule, LocalDate date) {        return tripRepository.findByScheduleIdAndTripDate(schedule.getId(), date)
                .orElseGet(() -> {
                    Trip trip = Trip.builder()
                            .schedule(schedule)
                            .tripDate(date)
                            .status(TripStatus.SCHEDULED)
                            .build();
                    return tripRepository.save(trip);
                });
    }

    @Transactional
    public void materializeSeats(Trip trip) {
        if (seatInventoryRepository.countByTripId(trip.getId()) > 0) {
            return;
        }
        Schedule schedule = trip.getSchedule();
        int capacity = schedule.getBus().getCapacity() != null ? schedule.getBus().getCapacity() : 1;
        BigDecimal price = fareFor(trip);
        List<SeatInventory> seats = new ArrayList<>();
        for (int i = 1; i <= capacity; i++) {
            seats.add(SeatInventory.builder()
                    .trip(trip)
                    .seatNumber(String.valueOf(i))
                    .status(SeatStatus.AVAILABLE)
                    .price(price)
                    .build());
        }
        seatInventoryRepository.saveAll(seats);
        log.info("Materialized {} seats for trip {}", capacity, trip.getId());
    }

    @Transactional
    public SeatMapResponse getSeatMap(Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new NotFoundException("Trip not found"));
        releaseExpiredLocks(tripId);
        materializeSeats(trip);
        List<SeatInventory> seats = seatInventoryRepository.findByTripIdOrderBySeatNumberAsc(tripId);
        List<SeatDto> seatDtos = seats.stream()
                .map(s -> new SeatDto(
                        s.getSeatNumber(),
                        s.getStatus() != null ? s.getStatus().name() : null,
                        s.getPrice(),
                        com.vygo.util.IsoTime.instant(s.getLockExpiresAt()),
                        null))
                .toList();
        BigDecimal farePerSeat = seats.isEmpty() ? fareFor(trip) : seats.get(0).getPrice();
        Bus bus = trip.getSchedule().getBus();
        ServiceClass serviceClass = ServiceClass.from(bus.getBusType());
        return new SeatMapResponse(tripId,
                bus.getBusType().name(),
                bus.getModel(),
                serviceClass.name(),
                bus.getCapacity(),
                farePerSeat,
                AmenityJson.parse(bus.getAmenities()),
                seatDtos,
                FleetVehicle.vehicleModelId(bus.getModel(), serviceClass),
                FleetVehicle.allowedCapacities(bus.getModel(), serviceClass));
    }

    @Transactional
    public void releaseExpiredLocks(Long tripId) {
        LocalTime unused = null;
        List<SeatInventory> seats = seatInventoryRepository.findByTripIdOrderBySeatNumberAsc(tripId);
        List<SeatInventory> expired = seats.stream()
                .filter(s -> s.getStatus() == SeatStatus.LOCKED
                        && s.getLockExpiresAt() != null
                        && s.getLockExpiresAt().isBefore(java.time.LocalDateTime.now()))
                .toList();
        for (SeatInventory seat : expired) {
            seat.setStatus(SeatStatus.AVAILABLE);
            seat.setLockOwner(null);
            seat.setLockExpiresAt(null);
        }
        if (!expired.isEmpty()) {
            seatInventoryRepository.saveAll(expired);
            log.info("Released {} expired locks for trip {}", expired.size(), tripId);
        }
    }

    public BigDecimal fareFor(Trip trip) {
        Schedule schedule = trip.getSchedule();
        FareRule rule = fareRuleRepository.findByRouteIdAndBusType(
                        schedule.getRoute().getId(), schedule.getBus().getBusType())
                .orElse(null);
        if (rule != null) {
            return fareCalculator.calculate(rule, schedule.getRoute().getDistanceKm());
        }
        return FALLBACK_BASE_FARE;
    }

    public List<RouteResponseDto> listRoutes(String q, Route.RouteType type, Route.RouteClass routeClass) {
        List<Route> routes;
        boolean hasQ = q != null && !q.isBlank();
        if (hasQ) {
            String query = q.trim();
            routes = new ArrayList<>(routeRepository
                    .findByFromCityContainingIgnoreCaseOrToCityContainingIgnoreCaseOrRouteNumberContainingIgnoreCase(
                            query, query, query));
        } else {
            routes = new ArrayList<>(routeRepository.findAllByOrderByFromCityAsc());
        }
        if (type != null) {
            routes.removeIf(r -> r.getRouteType() != type);
        }
        if (routeClass != null) {
            routes.removeIf(r -> r.getRouteClass() != routeClass);
        }
        return routes.stream().map(route -> {
            List<BoardingPointDto> points = boardingPointRepository.findByRouteIdOrderBySequenceAsc(route.getId())
                    .stream()
                    .map(bp -> new BoardingPointDto(bp.getId(), bp.getName(), bp.getCity(), "00:00"))
                    .toList();
            return new RouteResponseDto(
                    route.getId(),
                    route.getRouteNumber(),
                    route.getFromCity(),
                    route.getToCity(),
                    route.getRouteType() != null ? route.getRouteType().name() : "NORMAL",
                    route.getExpresswayCode(),
                    route.getRouteClass() != null ? route.getRouteClass().name() : null,
                    route.getDistanceKm(),
                    route.getDurationMin(),
                    route.getStatus() != null ? route.getStatus().name() : null,
                    points);
        }).toList();
    }

    private boolean isEffectiveOn(Schedule schedule, LocalDate date) {
        if (schedule.getEffectiveFrom() != null && date.isBefore(schedule.getEffectiveFrom())) {
            return false;
        }
        if (schedule.getEffectiveTo() != null && date.isAfter(schedule.getEffectiveTo())) {
            return false;
        }
        Set<Integer> days = parseDays(schedule.getDaysOfWeek());
        return days.contains(date.getDayOfWeek().getValue());
    }

    private Set<Integer> parseDays(String daysOfWeek) {
        Set<Integer> days = new HashSet<>();
        if (daysOfWeek == null || daysOfWeek.isBlank()) {
            return days;
        }
        for (String part : daysOfWeek.split(",")) {
            try {
                days.add(Integer.parseInt(part.trim()));
            } catch (NumberFormatException e) {
                log.warn("Ignoring invalid day-of-week value: {}", part);
            }
        }
        return days;
    }

    private BoardingPointDto toBoardingPointDto(BoardingPoint bp, LocalTime departure) {
        int offset = bp.getTimeOffsetMin() != null ? bp.getTimeOffsetMin() : 0;
        return new BoardingPointDto(bp.getId(), bp.getName(), bp.getCity(),
                departure.plusMinutes(offset).format(TIME));
    }
}
