package com.vygo.integration;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CircuitBreakerTest {

    private static final int FALLBACK = -1;

    @Test
    void allowsCallsWhileHealthy() {
        CircuitBreaker breaker = new CircuitBreaker(3, 2, Duration.ofMinutes(1));
        AtomicInteger calls = new AtomicInteger();
        int result = breaker.call(calls::incrementAndGet, () -> FALLBACK);
        assertEquals(1, result);
        assertEquals(CircuitBreaker.State.CLOSED, breaker.getState());
    }

    @Test
    void opensAfterFailureThreshold() {
        CircuitBreaker breaker = new CircuitBreaker(3, 2, Duration.ofMinutes(1));
        for (int i = 0; i < 2; i++) {
            breaker.call(() -> {
                throw new IllegalStateException("boom");
            }, () -> FALLBACK);
        }
        assertEquals(CircuitBreaker.State.CLOSED, breaker.getState());
        breaker.call(() -> {
            throw new IllegalStateException("boom");
        }, () -> FALLBACK);
        assertEquals(CircuitBreaker.State.OPEN, breaker.getState());
    }

    @Test
    void failsFastWhileOpen() {
        CircuitBreaker breaker = new CircuitBreaker(2, 2, Duration.ofMinutes(1));
        for (int i = 0; i < 2; i++) {
            breaker.call(() -> {
                throw new IllegalStateException("boom");
            }, () -> FALLBACK);
        }
        AtomicInteger realCalls = new AtomicInteger();
        int result = breaker.call(realCalls::incrementAndGet, () -> FALLBACK);
        assertEquals(FALLBACK, result);
        assertEquals(0, realCalls.get());
        assertEquals(CircuitBreaker.State.OPEN, breaker.getState());
    }

    @Test
    void fallbackExceptionPropagatesToCaller() {
        CircuitBreaker breaker = new CircuitBreaker(1, 2, Duration.ofMinutes(1));
        breaker.call(() -> {
            throw new IllegalStateException("boom");
        }, () -> FALLBACK);
        assertThrows(IllegalStateException.class,
                () -> breaker.call(() -> 42, () -> {
                    throw new IllegalStateException("degraded");
                }));
    }

    @Test
    void halfOpenProbeRecoversAfterSuccesses() throws InterruptedException {
        CircuitBreaker breaker = new CircuitBreaker(2, 2, Duration.ofMillis(5));
        for (int i = 0; i < 2; i++) {
            breaker.call(() -> {
                throw new IllegalStateException("boom");
            }, () -> FALLBACK);
        }
        assertEquals(CircuitBreaker.State.OPEN, breaker.getState());

        Thread.sleep(20);
        assertEquals(42, breaker.call(() -> 42, () -> FALLBACK));

        AtomicInteger calls = new AtomicInteger();
        breaker.call(calls::incrementAndGet, () -> FALLBACK);
        breaker.call(calls::incrementAndGet, () -> FALLBACK);
        assertEquals(2, calls.get());
        assertEquals(CircuitBreaker.State.CLOSED, breaker.getState());
    }

    @Test
    void halfOpenFailureReopens() throws InterruptedException {
        CircuitBreaker breaker = new CircuitBreaker(2, 2, Duration.ofMillis(5));
        for (int i = 0; i < 2; i++) {
            breaker.call(() -> {
                throw new IllegalStateException("boom");
            }, () -> FALLBACK);
        }
        Thread.sleep(20);
        assertEquals(42, breaker.call(() -> 42, () -> FALLBACK));
        breaker.call(() -> {
            throw new IllegalStateException("boom again");
        }, () -> FALLBACK);
        assertEquals(CircuitBreaker.State.OPEN, breaker.getState());
    }
}
