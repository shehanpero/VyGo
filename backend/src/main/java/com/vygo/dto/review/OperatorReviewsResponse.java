package com.vygo.dto.review;

import java.util.List;

public record OperatorReviewsResponse(
        Long operatorId,
        Double rating,
        Long reviewCount,
        List<ReviewResponse> reviews) {
}
