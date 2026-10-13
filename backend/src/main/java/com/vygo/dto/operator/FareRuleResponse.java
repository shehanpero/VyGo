package com.vygo.dto.operator;

import java.math.BigDecimal;

public record FareRuleResponse(
        Long id,
        Long routeId,
        String busType,
        BigDecimal baseFare,
        BigDecimal perKmRate,
        BigDecimal surgeMultiplier) {
}
