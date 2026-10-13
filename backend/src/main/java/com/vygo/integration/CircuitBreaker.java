package com.vygo.integration;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;

/**
 * Minimal thread-safe circuit breaker with three states:
 * CLOSED (normal), OPEN (fail fast), HALF_OPEN (bounded probe window).
 *
 * <p>While CLOSED, calls pass through and failures are counted. Once the failure
 * threshold is reached the breaker opens and all calls fail fast (falling back)
 * for {@code openTimeout}. When the timeout elapses the breaker enters HALF_OPEN
 * and allows a bounded burst of {@code halfOpenSuccessThreshold} probes; enough
 * successes close it again, any failure re-opens it.
 */
public final class CircuitBreaker {

    public enum State { CLOSED, OPEN, HALF_OPEN }

    private final int failureThreshold;
    private final int halfOpenSuccessThreshold;
    private final long openTimeoutMillis;

    private final AtomicReference<State> state = new AtomicReference<>(State.CLOSED);
    private final AtomicInteger failures = new AtomicInteger();
    private final AtomicInteger successes = new AtomicInteger();
    private final AtomicInteger halfOpenPermits = new AtomicInteger();
    private final AtomicLong openedAtMillis = new AtomicLong();

    public CircuitBreaker(int failureThreshold, int halfOpenSuccessThreshold, Duration openTimeout) {
        this.failureThreshold = Math.max(1, failureThreshold);
        this.halfOpenSuccessThreshold = Math.max(1, halfOpenSuccessThreshold);
        this.openTimeoutMillis = openTimeout.toMillis();
    }

    public State getState() {
        return state.get();
    }

    /**
     * Executes {@code action}, degrading to {@code fallback} while the breaker is
     * open (fail fast) or when the action throws (graceful degradation).
     */
    public <T> T call(Supplier<T> action, Supplier<T> fallback) {
        if (!tryAcquire()) {
            return fallback.get();
        }
        try {
            T result = action.get();
            onSuccess();
            return result;
        } catch (RuntimeException ex) {
            onFailure();
            return fallback.get();
        }
    }

    private boolean tryAcquire() {
        while (true) {
            State current = state.get();
            if (current == State.OPEN) {
                if (timeoutElapsed()) {
                    if (state.compareAndSet(State.OPEN, State.HALF_OPEN)) {
                        successes.set(0);
                        halfOpenPermits.set(halfOpenSuccessThreshold);
                        return acquireHalfOpenPermit();
                    }
                    continue;
                }
                return false;
            }
            if (current == State.HALF_OPEN) {
                return acquireHalfOpenPermit();
            }
            return true;
        }
    }

    private boolean acquireHalfOpenPermit() {
        while (true) {
            int permits = halfOpenPermits.get();
            if (permits <= 0) {
                return false;
            }
            if (halfOpenPermits.compareAndSet(permits, permits - 1)) {
                return true;
            }
        }
    }

    private void onSuccess() {
        State current = state.get();
        if (current == State.HALF_OPEN) {
            if (successes.incrementAndGet() >= halfOpenSuccessThreshold) {
                reset();
            }
        } else if (current == State.CLOSED) {
            failures.set(0);
        }
    }

    private void onFailure() {
        State current = state.get();
        if (current == State.HALF_OPEN) {
            open();
        } else if (current == State.CLOSED) {
            if (failures.incrementAndGet() >= failureThreshold) {
                open();
            }
        }
    }

    private void open() {
        state.set(State.OPEN);
        openedAtMillis.set(System.currentTimeMillis());
        successes.set(0);
        halfOpenPermits.set(0);
    }

    private void reset() {
        state.set(State.CLOSED);
        failures.set(0);
        successes.set(0);
        halfOpenPermits.set(0);
    }

    private boolean timeoutElapsed() {
        return System.currentTimeMillis() - openedAtMillis.get() >= openTimeoutMillis;
    }
}
