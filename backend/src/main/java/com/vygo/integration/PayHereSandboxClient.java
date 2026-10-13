package com.vygo.integration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public final class PayHereSandboxClient implements PayHereClient {

    private static final Logger log = LoggerFactory.getLogger(PayHereSandboxClient.class);

    private final ConcurrentHashMap<String, String> txnStatus = new ConcurrentHashMap<>();

    @Override
    public InitResult init(InitRequest req) {
        String txnId = "SBX-" + UUID.randomUUID();
        txnStatus.put(txnId, "PENDING");
        log.info("[VYGO PAYHERE][stub] init orderId={} txnId={} amount={} currency={}",
                req.orderId(), txnId, req.amount(), req.currency());
        return new InitResult(true, txnId, "PENDING",
                "http://localhost:8080/api/v1/payments/sandbox/" + txnId, null);
    }

    @Override
    public StatusResult status(String txnId) {
        String status = txnStatus.get(txnId);
        if (status == null) {
            return new StatusResult("NOT_FOUND", txnId, "PAYMENT_NOT_FOUND");
        }
        return new StatusResult(status, txnId, null);
    }

    @Override
    public RefundResult refund(String txnId, String amount, String reason) {
        if (!txnStatus.containsKey(txnId)) {
            return new RefundResult(false, null, "Unknown transaction");
        }
        txnStatus.put(txnId, "REFUNDED");
        String refundId = "RFD-" + UUID.randomUUID();
        log.info("[VYGO PAYHERE][stub] refund txnId={} amount={} reason={}", txnId, amount, reason);
        return new RefundResult(true, refundId, null);
    }

    public boolean markPaid(String txnId) {
        if (!txnStatus.containsKey(txnId)) {
            return false;
        }
        txnStatus.put(txnId, "SUCCESS");
        log.info("[VYGO PAYHERE][stub] markPaid txnId={} status=SUCCESS", txnId);
        return true;
    }

    public boolean exists(String txnId) {
        return txnStatus.containsKey(txnId);
    }
}
