package com.vygo.service;

import com.vygo.dto.conductor.TripListRowResponse;
import com.vygo.dto.driver.DriverBusResponse;
import com.vygo.entity.SeatInventory;
import com.vygo.entity.Trip;
import com.vygo.entity.User;
import com.vygo.repository.BusRepository;
import com.vygo.repository.BusStaffRepository;
import com.vygo.repository.SeatInventoryRepository;
import com.vygo.repository.TripRepository;
import com.vygo.repository.UserRepository;
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

    private final BusRepository busRepo;
    private final BusStaffRepository busStaffRepo;
    private final TripRepository tripRepo;
    private final SeatInventoryRepository seatRepo;
    private final TripService tripService;
    private final UserRepository userRepo;

    public DriverService(BusRepository busRepo, BusStaffRepository busStaffRepo,
                         TripRepository tripRepo, SeatInventoryRepository seatRepo,
                         TripService tripService, UserRepository userRepo) {
        this.busRepo = busRepo;
        this.busStaffRepo = busStaffRepo;
        this.tripRepo = tripRepo;
        this.seatRepo = seatRepo;
        this.tripService = tripService;
        this.userRepo = userRepo;
    }

    @Transactional(readOnly = true)
    public List<DriverBusResponse> myBuses(Long userId) {
        User user = userRepo.findById(userId).orElse(null);
        if (user != null && user.getOwner() != null) {
            // All buses of the operator the caller works for, so newly added buses show up.
            String role = user.hasRole("DRIVER") ? "DRIVER" : "CONDUCTOR";
            return busRepo.findByOperatorIdOrderByIdDesc(user.getOwner().getId()).stream()
                    .map(b -> new DriverBusResponse(b.getId(), b.getRegistrationNo(),
                            b.getBusType().name(), b.getCapacity(), role))
                    .toList();
        }
        return busStaffRepo.findByUserId(userId).stream()
                .map(s -> new DriverBusResponse(s.getBus().getId(), s.getBus().getRegistrationNo(),
                        s.getBus().getBusType().name(), s.getBus().getCapacity(), s.getStaffRole().name()))
                .toList();
    }

    @Transactional
    public List<TripListRowResponse> myTrips(Long userId, LocalDate date) {
        User user = userRepo.findById(userId).orElse(null);
        List<Trip> trips;
        if (user != null && user.getOwner() != null) {
            // Scoped to the bus owner / association this driver belongs to.
            trips = tripService.tripsForOperatorOnDate(user.getOwner().getId(), date);
        } else {
            Set<Long> busIds = busStaffRepo.findByUserId(userId).stream()
                    .map(s -> s.getBus().getId())
                    .collect(Collectors.toSet());
            if (busIds.isEmpty()) {
                return List.of();
            }
            trips = tripRepo.findByTripDate(date).stream()
                    .filter(t -> busIds.contains(t.getSchedule().getBus().getId()))
                    .toList();
        }
        return trips.stream()
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
