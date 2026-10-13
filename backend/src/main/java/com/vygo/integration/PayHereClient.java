package com.vygo.integration;

public interface PayHereClient {

    InitResult init(InitRequest req);

    StatusResult status(String txnId);

    RefundResult refund(String txnId, String amount, String reason);

    record InitRequest(String orderId, String amount, String currency,
                       String customerMobile, String customerEmail, String description) {
    }

    record InitResult(boolean ok, String txnId, String status, String redirectUrl, String error) {
    }

    record StatusResult(String status, String txnId, String error) {
    }

    record RefundResult(boolean ok, String refundId, String error) {
    }
}
