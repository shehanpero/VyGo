package com.vygo.service;

import com.vygo.dto.review.OperatorReviewsResponse;
import com.vygo.dto.review.ReviewRequest;
import com.vygo.dto.review.ReviewResponse;
import com.vygo.entity.Booking;
import com.vygo.entity.Booking.BookingStatus;
import com.vygo.entity.Review;
import com.vygo.entity.User;
import com.vygo.exception.ConflictException;
import com.vygo.exception.ForbiddenException;
import com.vygo.exception.NotFoundException;
import com.vygo.repository.BookingRepository;
import com.vygo.repository.ReviewRepository;
import com.vygo.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewService.class);
    private static final DateTimeFormatter TS = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public ReviewService(ReviewRepository reviewRepository,
                         BookingRepository bookingRepository,
                         UserRepository userRepository,
                         AuditService auditService) {
        this.reviewRepository = reviewRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Transactional
    public ReviewResponse create(Long userId, ReviewRequest req) {
        Booking booking = bookingRepository.findByBookingRef(req.bookingRef())
                .orElseThrow(() -> new NotFoundException("Booking not found: " + req.bookingRef()));
        if (!booking.getPassenger().getId().equals(userId)) {
            throw new ForbiddenException("You can only review your own bookings");
        }
        if (booking.getStatus() != BookingStatus.CONFIRMED
                && booking.getStatus() != BookingStatus.COMPLETED) {
            throw new ConflictException("Only confirmed or completed bookings can be reviewed");
        }
        reviewRepository.findByBookingId(booking.getId()).ifPresent(r -> {
            throw new ConflictException("This booking has already been reviewed");
        });

        User passenger = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        Review review = Review.builder()
                .booking(booking)
                .passenger(passenger)
                .operator(booking.getTrip().getSchedule().getOperator())
                .trip(booking.getTrip())
                .rating(req.rating())
                .comment(req.comment())
                .createdAt(LocalDateTime.now())
                .build();
        reviewRepository.save(review);

        auditService.record("CREATE_REVIEW", "Review", String.valueOf(review.getId()),
                "Rating " + req.rating() + " for operator " + review.getOperator().getName());
        log.info("Review {} created by user {} for operator {}", review.getId(), userId,
                review.getOperator().getId());
        return new ReviewResponse(review.getId(), passenger.getFullName(), review.getRating(),
                review.getComment(),
                review.getCreatedAt() != null ? review.getCreatedAt().format(TS) : null);
    }

    @Transactional(readOnly = true)
    public OperatorReviewsResponse operatorReviews(Long operatorId) {
        Double avg = reviewRepository.averageRating(operatorId);
        long count = reviewRepository.countByOperatorId(operatorId);
        var reviews = reviewRepository.findByOperatorIdOrderByCreatedAtDesc(operatorId).stream()
                .map(r -> new ReviewResponse(r.getId(),
                        r.getPassenger() != null ? r.getPassenger().getFullName() : null,
                        r.getRating(), r.getComment(),
                        r.getCreatedAt() != null ? r.getCreatedAt().format(TS) : null))
                .toList();
        return new OperatorReviewsResponse(operatorId, avg != null ? avg : 0.0, count, reviews);
    }
}
