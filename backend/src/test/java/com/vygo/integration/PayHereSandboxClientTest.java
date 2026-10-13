package com.vygo.integration;

import com.vygo.integration.PayHereClient.InitRequest;
import com.vygo.integration.PayHereClient.InitResult;
import com.vygo.integration.PayHereClient.RefundResult;
import com.vygo.integration.PayHereClient.StatusResult;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PayHereSandboxClientTest {

    private final PayHereSandboxClient client = new PayHereSandboxClient();

    private InitResult init(String orderId) {
        return client.init(new InitRequest(orderId, "1500.00", "LKR", "0712345678", "nimal@vygo.lk", "booking"));
    }

    @Test
    void initCreatesPendingTransaction() {
        InitResult result = init("VY-20260802-ABCD");
        assertTrue(result.ok());
        assertNotNull(result.txnId());
        assertTrue(result.txnId().startsWith("SBX-"));
        assertEquals("PENDING", result.status());
        assertTrue(result.redirectUrl().contains(result.txnId()));
        assertTrue(client.exists(result.txnId()));
    }

    @Test
    void markPaidFlipsStatusToSuccess() {
        String txnId = init("o1").txnId();
        assertTrue(client.markPaid(txnId));
        StatusResult status = client.status(txnId);
        assertEquals("SUCCESS", status.status());
    }

    @Test
    void refundMarksTransactionRefunded() {
        String txnId = init("o2").txnId();
        RefundResult result = client.refund(txnId, "1500.00", "cancellation");
        assertTrue(result.ok());
        assertNotNull(result.refundId());
        assertTrue(result.refundId().startsWith("RFD-"));
        assertEquals("REFUNDED", client.status(txnId).status());
    }

    @Test
    void unknownTransactionReturnsNotFoundInsteadOfThrowing() {
        // Stale/unknown txnIds must never surface as 500s (which would trip the
        // circuit breaker); they resolve to a typed NOT_FOUND / failed result.
        StatusResult status = client.status("SBX-unknown");
        assertEquals("NOT_FOUND", status.status());

        RefundResult refund = client.refund("SBX-unknown", "1.00", "x");
        assertFalse(refund.ok());

        assertFalse(client.markPaid("SBX-unknown"));
        assertFalse(client.exists("SBX-unknown"));
    }
}
