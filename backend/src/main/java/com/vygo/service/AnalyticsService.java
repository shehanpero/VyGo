package com.vygo.service;

import com.vygo.dto.admin.AnalyticsOverviewResponse;
import com.vygo.dto.admin.TrendPointResponse;
import com.vygo.entity.Booking;
import com.vygo.entity.Bus;
import com.vygo.entity.FareRule;
import com.vygo.entity.Route;
import com.vygo.entity.Schedule;
import com.vygo.entity.SeatInventory;
import com.vygo.entity.Trip;
import com.vygo.repository.BookingRepository;
import com.vygo.repository.BusRepository;
import com.vygo.repository.FareRuleRepository;
import com.vygo.repository.ReviewRepository;
import com.vygo.repository.ScheduleRepository;
import com.vygo.repository.SeatInventoryRepository;
import com.vygo.repository.TripRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);

    private final AdminService adminService;
    private final TripRepository tripRepo;
    private final ScheduleRepository scheduleRepo;
    private final SeatInventoryRepository seatRepo;
    private final BookingRepository bookingRepo;
    private final FareRuleRepository fareRuleRepo;
    private final BusRepository busRepo;
    private final ReviewRepository reviewRepo;

    public AnalyticsService(AdminService adminService, TripRepository tripRepo,
                            ScheduleRepository scheduleRepo, SeatInventoryRepository seatRepo,
                            BookingRepository bookingRepo, FareRuleRepository fareRuleRepo,
                            BusRepository busRepo,
                            ReviewRepository reviewRepo) {
        this.adminService = adminService;
        this.tripRepo = tripRepo;
        this.scheduleRepo = scheduleRepo;
        this.seatRepo = seatRepo;
        this.bookingRepo = bookingRepo;
        this.fareRuleRepo = fareRuleRepo;
        this.busRepo = busRepo;
        this.reviewRepo = reviewRepo;
    }

    @Transactional(readOnly = true)
    public List<TrendPointResponse> occupancyTrends(Long routeId) {
        List<Schedule> schedules = scheduleRepo.findByRouteId(routeId);
        if (schedules.isEmpty()) {
            return List.of();
        }
        LocalDate today = LocalDate.now();
        List<TrendPointResponse> out = new ArrayList<>();
        for (int i = 29; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            long booked = 0;
            long capacity = 0;
            for (Schedule s : schedules) {
                Trip t = tripRepo.findByScheduleIdAndTripDate(s.getId(), day).orElse(null);
                if (t != null) {
                    booked += seatRepo.countByTripIdAndStatus(t.getId(), SeatInventory.SeatStatus.BOOKED);
                    capacity += t.getSchedule().getBus().getCapacity();
                }
            }
            double pct = capacity > 0 ? round1(booked * 100.0 / capacity) : 0;
            out.add(new TrendPointResponse(day.toString(), pct, null, null, null));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<TrendPointResponse> demandForecast(String fromCity, String toCity, int days) {
        return adminService.demandForecast(fromCity, toCity, days);
    }

    @Transactional(readOnly = true)
    public List<TrendPointResponse> pricingSuggestions(Long routeId) {
        List<FareRule> rules = fareRuleRepo.findByRouteId(routeId);
        if (rules.isEmpty()) {
            return List.of();
        }
        Route route = rules.get(0).getRoute();
        List<TrendPointResponse> out = new ArrayList<>();
        for (FareRule rule : rules) {
            double occ = recentOccupancyByType(route, rule.getBusType(), 14);
            BigDecimal fare = rule.getBaseFare()
                    .add(rule.getPerKmRate().multiply(route.getDistanceKm()));
            double factor = clamp(0.85 + 0.3 * (occ / 100.0), 0.85, 1.35);
            BigDecimal recommended = fare.multiply(BigDecimal.valueOf(factor))
                    .setScale(2, RoundingMode.HALF_UP);
            out.add(new TrendPointResponse(rule.getBusType().name(), round1(occ), null, null, recommended));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public AnalyticsOverviewResponse operatorPerformance(Long operatorId) {
        List<Schedule> schedules = scheduleRepo.findByOperatorId(operatorId);
        LocalDate today = LocalDate.now();
        long booked = 0;
        long capacity = 0;
        long confirmedCount = 0;
        BigDecimal revenue = BigDecimal.ZERO;
        for (int i = 29; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            for (Schedule s : schedules) {
                Trip t = tripRepo.findByScheduleIdAndTripDate(s.getId(), day).orElse(null);
                if (t == null) {
                    continue;
                }
                booked += seatRepo.countByTripIdAndStatus(t.getId(), SeatInventory.SeatStatus.BOOKED);
                capacity += t.getSchedule().getBus().getCapacity();
                for (Booking b : bookingRepo.findByTripIdAndStatus(t.getId(), Booking.BookingStatus.CONFIRMED)) {
                    revenue = revenue.add(b.getTotalFare());
                    confirmedCount++;
                }
            }
        }
        double occupancyRate = capacity > 0 ? round1(booked * 100.0 / capacity) : 0;
        long totalBuses = busRepo.findByOperatorIdOrderByIdDesc(operatorId).size();
        Double rating = reviewRepo.averageRating(operatorId);
        log.info("Operator {} performance: averageRating={} confirmedBookings={} revenue={}",
                operatorId, rating, confirmedCount, revenue);
        return new AnalyticsOverviewResponse(confirmedCount, revenue,
                revenue.multiply(new BigDecimal("0.05")).setScale(2, RoundingMode.HALF_UP),
                1L, totalBuses, occupancyRate, 0L);
    }

    // ---- helpers -----------------------------------------------------

    private double recentOccupancyByType(Route route, Bus.BusType type, int days) {
        List<Schedule> schedules = scheduleRepo.findByRouteId(route.getId());
        LocalDate today = LocalDate.now();
        double sum = 0;
        int n = 0;
        for (int i = days - 1; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            for (Schedule s : schedules) {
                if (s.getBus().getBusType() != type) {
                    continue;
                }
                Trip t = tripRepo.findByScheduleIdAndTripDate(s.getId(), day).orElse(null);
                if (t != null) {
                    long b = seatRepo.countByTripIdAndStatus(t.getId(), SeatInventory.SeatStatus.BOOKED);
                    int c = t.getSchedule().getBus().getCapacity();
                    sum += c > 0 ? b * 100.0 / c : 0;
                    n++;
                }
            }
        }
        return n > 0 ? sum / n : 0;
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
