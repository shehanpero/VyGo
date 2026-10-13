package com.vygo.service;

import com.vygo.dto.live.BusPingRequest;
import com.vygo.dto.operator.BusLiveResponse;
import com.vygo.entity.Bus;
import com.vygo.entity.BusLocation;
import com.vygo.entity.BusOperator;
import com.vygo.entity.BusStaff;
import com.vygo.entity.User;
import com.vygo.exception.ForbiddenException;
import com.vygo.exception.NotFoundException;
import com.vygo.repository.BusLocationRepository;
import com.vygo.repository.BusOperatorRepository;
import com.vygo.repository.BusRepository;
import com.vygo.repository.BusStaffRepository;
import com.vygo.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class BusLocationService {

    private static final Logger log = LoggerFactory.getLogger(BusLocationService.class);
    private static final DateTimeFormatter TS = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final BusRepository busRepo;
    private final BusStaffRepository busStaffRepo;
    private final BusLocationRepository busLocationRepo;
    private final BusOperatorRepository busOperatorRepo;
    private final UserRepository userRepo;

    public BusLocationService(BusRepository busRepo, BusStaffRepository busStaffRepo,
                              BusLocationRepository busLocationRepo, BusOperatorRepository busOperatorRepo,
                              UserRepository userRepo) {
        this.busRepo = busRepo;
        this.busStaffRepo = busStaffRepo;
        this.busLocationRepo = busLocationRepo;
        this.busOperatorRepo = busOperatorRepo;
        this.userRepo = userRepo;
    }

    /**
     * Records a live GPS ping for a bus. The reporter must be the bus's
     * operator, a driver/conductor assigned to it, or an admin. When no
     * {@code busId} is supplied (the mobile-driver case) the bus is inferred
     * from the caller's staff assignment (or, for operators, their fleet).
     */
    @Transactional
    public BusLiveResponse ping(Long userId, BusPingRequest req) {
        User user = userRepo.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        Bus bus = resolveBus(user, req.busId());

        BusLocation location = BusLocation.builder()
                .bus(bus)
                .latitude(req.latitude())
                .longitude(req.longitude())
                .speedKph(req.speedKph())
                .recordedBy(user)
                .build();
        BusLocation saved = busLocationRepo.save(location);
        log.info("Live ping bus={} by={} ({}, {})", bus.getRegistrationNo(), userId, req.latitude(), req.longitude());
        return new BusLiveResponse(bus.getId(), bus.getRegistrationNo(), null,
                saved.getLatitude(), saved.getLongitude(), saved.getSpeedKph(), user.getFullName(),
                saved.getRecordedAt() == null ? LocalDateTime.now().format(TS) : saved.getRecordedAt().format(TS));
    }

    private Bus resolveBus(User user, Long busId) {
        if (busId != null) {
            Bus bus = busRepo.findById(busId).orElseThrow(() -> new NotFoundException("Bus not found"));
            if (!canReport(user, bus)) {
                throw new ForbiddenException("You are not assigned to this bus");
            }
            return bus;
        }
        List<BusStaff> assignments = busStaffRepo.findByUserId(user.getId());
        if (!assignments.isEmpty()) {
            return assignments.get(0).getBus();
        }
        List<Bus> owned = busOperatorRepo.findByUserId(user.getId())
                .map(BusOperator::getId)
                .map(busRepo::findByOperatorIdOrderByIdDesc)
                .orElse(List.of());
        if (!owned.isEmpty()) {
            return owned.get(0);
        }
        throw new ForbiddenException("No bus is associated with your account");
    }

    private boolean canReport(User user, Bus bus) {
        if (user.hasRole("ADMIN")) {
            return true;
        }
        if (bus.getOperator().getUser() != null
                && bus.getOperator().getUser().getId().equals(user.getId())) {
            return true;
        }
        return busStaffRepo.findByBusIdAndUserId(bus.getId(), user.getId()).isPresent();
    }
}
