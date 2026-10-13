package com.vygo.service;

import com.vygo.entity.FareRule;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class FareCalculatorTest {

    private final FareCalculator calculator = new FareCalculator();

    @Test
    void calculatesBasePlusPerKm() {
        FareRule rule = FareRule.builder()
                .baseFare(new BigDecimal("100.00"))
                .perKmRate(new BigDecimal("10.00"))
                .surgeMultiplier(new BigDecimal("1.00"))
                .build();
        assertEquals(new BigDecimal("250.00"), calculator.calculate(rule, new BigDecimal("15")));
    }

    @Test
    void appliesSurgeMultiplier() {
        FareRule rule = FareRule.builder()
                .baseFare(new BigDecimal("100.00"))
                .perKmRate(new BigDecimal("10.00"))
                .surgeMultiplier(new BigDecimal("1.50"))
                .build();
        assertEquals(new BigDecimal("375.00"), calculator.calculate(rule, new BigDecimal("15")));
    }

    @Test
    void roundsHalfUpToTwoDecimals() {
        FareRule rule = FareRule.builder()
                .baseFare(new BigDecimal("0.01"))
                .perKmRate(new BigDecimal("3.333"))
                .surgeMultiplier(new BigDecimal("1.00"))
                .build();
        assertEquals(new BigDecimal("5.01"), calculator.calculate(rule, new BigDecimal("1.5")));
    }

    @Test
    void handlesNullFieldsAsZeroOrOne() {
        FareRule rule = FareRule.builder().baseFare(null).perKmRate(null).surgeMultiplier(null).build();
        assertEquals(new BigDecimal("0.00"), calculator.calculate(rule, null));
        assertEquals(new BigDecimal("0.00"), calculator.calculate(rule, new BigDecimal("50")));
    }

    @Test
    void nullBaseFareStillAppliesPerKmRate() {
        FareRule rule = FareRule.builder()
                .baseFare(null)
                .perKmRate(new BigDecimal("1.00"))
                .surgeMultiplier(null)
                .build();
        assertEquals(new BigDecimal("50.00"), calculator.calculate(rule, new BigDecimal("50")));
    }
}
