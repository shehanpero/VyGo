package com.vygo.service;

import com.vygo.entity.FareRule;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class FareCalculator {

    public BigDecimal calculate(FareRule rule, BigDecimal distanceKm) {
        BigDecimal baseFare = rule.getBaseFare() != null ? rule.getBaseFare() : BigDecimal.ZERO;
        BigDecimal perKmRate = rule.getPerKmRate() != null ? rule.getPerKmRate() : BigDecimal.ZERO;
        BigDecimal surgeMultiplier = rule.getSurgeMultiplier() != null ? rule.getSurgeMultiplier() : BigDecimal.ONE;
        BigDecimal distance = distanceKm != null ? distanceKm : BigDecimal.ZERO;
        return baseFare
                .add(perKmRate.multiply(distance))
                .multiply(surgeMultiplier)
                .setScale(2, RoundingMode.HALF_UP);
    }
}
