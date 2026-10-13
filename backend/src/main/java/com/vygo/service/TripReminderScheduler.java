package com.vygo.service;

import com.vygo.entity.Booking;
import com.vygo.entity.Booking.BookingStatus;
import com.vygo.entity.Notification.NotificationChannel;
import com.vygo.entity.Trip;
import com.vygo.repository.BookingRepository;
import com.vygo.repository.TripRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class TripReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(TripReminderScheduler.class);

    private final TripRepository tripRepository;
    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;

    public TripReminderScheduler(TripRepository tripRepository,
                                 BookingRepository bookingRepository,
                                 NotificationService notificationService) {
        this.tripRepository = tripRepository;
        this.bookingRepository = bookingRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(cron = "0 0 6 * * *")
    public void sendTripReminders() {
        try {
            LocalDate tomorrow = LocalDate.now().plusDays(1);
            List<Trip> trips = tripRepository.findByTripDate(tomorrow);
            int notified = 0;
            for (Trip trip : trips) {
                List<Booking> bookings = bookingRepository.findByTripIdAndStatus(
                        trip.getId(), BookingStatus.CONFIRMED);
                for (Booking booking : bookings) {
                    notificationService.notify(booking.getPassenger().getId(), NotificationChannel.SMS,
                            "Trip reminder - VyGo",
                            "Your trip " + trip.getSchedule().getRoute().getFromCity() + " -> "
                                    + trip.getSchedule().getRoute().getToCity() + " departs tomorrow "
                                    + tomorrow.format(DateTimeFormatter.ofPattern("dd MMM yyyy"))
                                    + " at " + trip.getSchedule().getDepartureTime() + ".");
                    notified++;
                }
            }
            if (notified > 0) {
                log.info("Trip reminders sent to {} passengers for {}", notified, tomorrow);
            }
        } catch (Exception e) {
            log.error("Failed to send trip reminders", e);
        }
    }
}
