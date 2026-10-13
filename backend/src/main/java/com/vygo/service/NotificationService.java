package com.vygo.service;

import com.vygo.dto.notification.NotificationResponse;
import com.vygo.entity.Booking;
import com.vygo.entity.Notification;
import com.vygo.entity.Notification.NotificationChannel;
import com.vygo.entity.Notification.NotificationStatus;
import com.vygo.entity.User;
import com.vygo.exception.NotFoundException;
import com.vygo.integration.EmailSender;
import com.vygo.integration.SmsSender;
import com.vygo.repository.NotificationRepository;
import com.vygo.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final DateTimeFormatter TS = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailSender emailSender;
    private final SmsSender smsSender;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               EmailSender emailSender,
                               SmsSender smsSender) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.emailSender = emailSender;
        this.smsSender = smsSender;
    }

    @Transactional
    public void notify(Long userId, NotificationChannel channel, String subject, String body) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("Cannot notify unknown user id={}", userId);
            return;
        }
        Notification notification = Notification.builder()
                .user(user)
                .channel(channel)
                .subject(subject)
                .body(body)
                .status(NotificationStatus.PENDING)
                .isRead(false)
                .build();
        notification = notificationRepository.save(notification);

        boolean sent;
        if (channel == NotificationChannel.EMAIL) {
            sent = emailSender.send(user.getEmail(), subject, body);
        } else {
            sent = smsSender.send(user.getMobile(), subject + "\n" + body);
        }
        if (sent) {
            notification.setStatus(NotificationStatus.SENT);
            notification.setSentAt(LocalDateTime.now());
        } else {
            notification.setStatus(NotificationStatus.FAILED);
        }
        notificationRepository.save(notification);
        log.info("Notification {} userId={} channel={} status={}", notification.getId(), userId, channel, notification.getStatus());
    }

    public List<NotificationResponse> listForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByIdDesc(userId).stream()
                .map(n -> new NotificationResponse(
                        n.getId(),
                        n.getChannel() != null ? n.getChannel().name() : null,
                        n.getSubject(),
                        n.getBody(),
                        n.getStatus() != null ? n.getStatus().name() : null,
                        n.getIsRead(),
                        n.getSentAt() != null ? n.getSentAt().format(TS) : null))
                .toList();
    }

    @Transactional
    public void markRead(Long userId, Long id) {
        Notification notification = notificationRepository.findByUserIdAndId(userId, id)
                .orElseThrow(() -> new NotFoundException("Notification not found"));
        notification.setIsRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void bookingPending(Booking b) {
        String subject = "Payment pending - VyGo " + b.getBookingRef();
        String body = "Your booking " + b.getBookingRef() + " (" + routeLabel(b) + " on " + b.getTrip().getTripDate()
                + " at " + b.getTrip().getSchedule().getDepartureTime().format(TIME) + ") is awaiting payment. "
                + "Please complete payment to confirm your seats. - VyGo";
        notify(b.getPassenger().getId(), NotificationChannel.EMAIL, subject, body);
    }

    @Transactional
    public void bookingConfirmed(Booking b) {
        String subject = "Booking confirmed - VyGo " + b.getBookingRef();
        String body = "Your booking " + b.getBookingRef() + " (" + routeLabel(b) + " on " + b.getTrip().getTripDate()
                + " at " + b.getTrip().getSchedule().getDepartureTime().format(TIME) + ", Bus "
                + b.getTrip().getSchedule().getBus().getRegistrationNo() + " - "
                + b.getTrip().getSchedule().getOperator().getName() + ") is confirmed. "
                + "Your e-ticket is ready; present the QR at boarding. Safe travels! - VyGo";
        notify(b.getPassenger().getId(), NotificationChannel.EMAIL, subject, body);
    }

    @Transactional
    public void bookingCancelled(Booking b) {
        String subject = "Booking cancelled - VyGo " + b.getBookingRef();
        String body = "Your booking " + b.getBookingRef() + " (" + routeLabel(b) + ") has been cancelled. "
                + "Any applicable refund will be processed to your payment method. - VyGo";
        notify(b.getPassenger().getId(), NotificationChannel.EMAIL, subject, body);
    }

    private String routeLabel(Booking b) {
        return b.getTrip().getSchedule().getRoute().getFromCity()
                + " -> " + b.getTrip().getSchedule().getRoute().getToCity();
    }
}
