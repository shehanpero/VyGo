package com.vygo.controller;

import com.vygo.dto.review.OperatorReviewsResponse;
import com.vygo.dto.review.ReviewRequest;
import com.vygo.dto.review.ReviewResponse;
import com.vygo.security.CurrentUser;
import com.vygo.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reviews")
@Tag(name = "Reviews", description = "Trip and operator reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Submit a review for a confirmed/completed booking (PASSENGER)")
    public ReviewResponse create(@Valid @RequestBody ReviewRequest request) {
        return reviewService.create(CurrentUser.id(), request);
    }

    @GetMapping("/operator/{operatorId}")
    @Operation(summary = "Get reviews for an operator")
    public OperatorReviewsResponse byOperator(@PathVariable Long operatorId) {
        return reviewService.operatorReviews(operatorId);
    }
}
