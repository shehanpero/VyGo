package com.vygo.service;

import com.vygo.dto.conductor.TripListRowResponse;
import com.vygo.dto.driver.DriverBusResponse;
import com.vygo.entity.BusStaff;
import com.vygo.entity.SeatInventory;
import com.vygo.entity.Trip;
import com.vygo.repository.BusStaffRepository;
import com.vygo.repository.SeatInventoryRepository;
import com.vygo.repository.TripRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class DriverService {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final BusStaffRepository busStaffRepo;
    private final TripRepository tripRepo;
    private final SeatInventoryRepository seatRepo;

    public DriverService(BusStaffRepository busStaffRepo, TripRepository tripRepo,
                         SeatInventoryRepository seatRepo) {
        this.busStaffRepo = busStaffRepo;
        this.tripRepo = tripRepo;
        this.seatRepo = seatRepo;
    }

    @Transactional(readOnly = true)
    public List<DriverBusResponse> myBuses(Long userId) {
        return busStaffRepo.findByUserId(userId).stream()
                .map(s -> new DriverBusResponse(s.getBus().getId(), s.getBus().getRegistrationNo(),
                        s.getBus().getBusType().name(), s.getBus().getCapacity(), s.getStaffRole().name()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TripListRowResponse> myTrips(Long userId, LocalDate date) {
        Set<Long> busIds = busStaffRepo.findByUserId(userId).stream()
                .map(s -> s.getBus().getId())
                .collect(Collectors.toSet());
        if (busIds.isEmpty()) {
            return List.of();
        }
        return tripRepo.findByTripDate(date).stream()
                .filter(t -> busIds.contains(t.getSchedule().getBus().getId()))
                .sorted(Comparator.comparing(t -> t.getSchedule().getDepartureTime()))
                .map(this::toTripRow)
                .toList();
    }

    private TripListRowResponse toTripRow(Trip t) {
        return new TripListRowResponse(t.getId(),
                t.getSchedule().getRoute().getFromCity() + " \u2192 " + t.getSchedule().getRoute().getToCity(),
                t.getSchedule().getBus().getRegistrationNo(),
                t.getSchedule().getDepartureTime().format(TIME),
                t.getStatus().name(),
                (int) seatRepo.countByTripIdAndStatus(t.getId(), SeatInventory.SeatStatus.BOOKED),
                t.getSchedule().getBus().getCapacity());
    }
}
