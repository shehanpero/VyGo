package com.vygo.integration;

import com.vygo.exception.ServiceUnavailableException;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Decorates {@link PayHereClient} with a {@link CircuitBreaker}. While the
 * payment gateway is failing, calls fail fast with a 503
 * (for init/refund) or a degraded status instead of hanging or 500ing.
 */
@Component
@Primary
public final class ResilientPayHereClient implements PayHereClient {

    private static final String DEGRADED_STATUS = "UNAVAILABLE";

    private final PayHereClient delegate;
    private final CircuitBreaker breaker;

    public ResilientPayHereClient(PayHereSandboxClient delegate) {
        this.delegate = delegate;
        this.breaker = new CircuitBreaker(5, 2, Duration.ofSeconds(30));
    }

    CircuitBreaker getBreaker() {
        return breaker;
    }

    @Override
    public InitResult init(InitRequest req) {
        return breaker.call(() -> delegate.init(req), () -> {
            throw new ServiceUnavailableException(
                    "Payment gateway is temporarily unavailable, please try again in a moment");
        });
    }

    @Override
    public StatusResult status(String txnId) {
        return breaker.call(() -> delegate.status(txnId),
                () -> new StatusResult(DEGRADED_STATUS, txnId, "PAYMENT_GATEWAY_UNAVAILABLE"));
    }

    @Override
    public RefundResult refund(String txnId, String amount, String reason) {
        return breaker.call(() -> delegate.refund(txnId, amount, reason), () -> {
            throw new ServiceUnavailableException(
                    "Refund service is temporarily unavailable, please try again in a moment");
        });
    }
}
