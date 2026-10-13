package com.vygo.controller;

import com.vygo.dto.payment.ConfirmPaymentRequest;
import com.vygo.dto.payment.InitiatePaymentRequest;
import com.vygo.dto.payment.InitiatePaymentResponse;
import com.vygo.dto.payment.PaymentResponse;
import com.vygo.dto.payment.RefundRequest;
import com.vygo.dto.payment.RefundResponse;
import com.vygo.security.CurrentUser;
import com.vygo.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
@Tag(name = "Payments", description = "PayHere sandbox payment flow and refunds")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/initiate")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Initiate a payment for a pending booking")
    public InitiatePaymentResponse initiate(@Valid @RequestBody InitiatePaymentRequest request) {
        return paymentService.initiate(CurrentUser.id(), request);
    }

    @PostMapping("/confirm")
    @Operation(summary = "Simulate the gateway callback confirming a payment")
    public PaymentResponse confirm(@Valid @RequestBody ConfirmPaymentRequest request) {
        return paymentService.confirm(CurrentUser.id(), request);
    }

    @PostMapping("/sandbox/{txnId}/confirm")
    @Operation(summary = "Confirm a sandbox payment without authentication (called by the sandbox page)")
    public PaymentResponse confirmSandbox(@PathVariable String txnId) {
        return paymentService.confirmSandbox(txnId);
    }

    @GetMapping("/{txnId}")
    @Operation(summary = "Get a payment's status by gateway transaction id")
    public PaymentResponse status(@PathVariable String txnId) {
        return paymentService.getStatus(CurrentUser.id(), txnId);
    }

    @PostMapping("/{txnId}/refund")
    @Operation(summary = "Refund a successful payment")
    public RefundResponse refund(@PathVariable String txnId,
                                 @RequestBody(required = false) RefundRequest request) {
        return paymentService.refund(CurrentUser.id(), txnId,
                request == null ? new RefundRequest("Refund requested") : request);
    }

    @GetMapping(value = "/sandbox/{txnId}", produces = MediaType.TEXT_HTML_VALUE)
    @Operation(summary = "PayHere sandbox payment page (simulates the gateway UI)")
    public String sandboxPage(@PathVariable String txnId, jakarta.servlet.http.HttpServletRequest request) {
        Map<String, String> status = paymentService.sandboxStatus(txnId);
        // Send "Continue to VyGo" back to the app that opened this gateway tab
        // (the Referer origin), never the backend root. Defaults to "/" if the
        // referer is missing/unparseable so the page still degrades sanely.
        String referer = request.getHeader("Referer");
        String home = "/";
        if (referer != null) {
            try {
                java.net.URI uri = java.net.URI.create(referer);
                if (uri.getScheme() != null && uri.getHost() != null) {
                    int port = uri.getPort();
                    home = uri.getScheme() + "://" + uri.getHost() + (port != -1 ? ":" + port : "");
                }
            } catch (IllegalArgumentException ignored) {
                // malformed referer — keep the "/" fallback
            }
        }
        return """
                <!doctype html><html><head><meta charset="utf-8">
                <title>PayHere Sandbox - VyGo</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body{font-family:system-ui;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
                  .card{background:#1e293b;padding:32px;border-radius:16px;max-width:420px;width:100%%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.5)}
                  h1{color:#34d399;font-size:22px;margin:0 0 8px} p{color:#94a3b8;margin:4px 0}
                  .txn{color:#f1f5f9;font-weight:600}
                  button{margin-top:24px;width:100%%;padding:14px;border:0;border-radius:10px;background:#34d399;color:#022c22;font-weight:700;font-size:16px;cursor:pointer}
                  button:hover{background:#10b981}
                  .note{margin-top:16px;font-size:12px;color:#64748b}
                </style></head><body>
                <div class="card">
                  <h1>PayHere Sandbox</h1>
                  <p>Transaction ID</p><p class="txn">%s</p>
                  <p style="margin-top:8px">Status: <b>%s</b></p>
                  <button onclick="pay()">Pay Now (Simulate)</button>
                  <div id="result" style="margin-top:16px"></div>
                  <p class="note">This page simulates the PayHere payment gateway for the VyGo demo.</p>
                </div>
                <script>
                  async function pay(){
                    const btn=document.querySelector('button'); btn.disabled=true; btn.textContent='Processing...';
                    try{
                      const res=await fetch('/api/v1/payments/sandbox/%s/confirm',{method:'POST'});
                      const data=await res.json();
                      if(res.ok){document.getElementById('result').innerHTML='<p style="color:#34d399;font-weight:600">Payment successful!</p><p><a href="%s" style="color:#34d399">Continue to VyGo</a></p>';}
                      else{document.getElementById('result').innerHTML='<p style="color:#f87171">'+(data.error||'Payment failed')+'</p>';btn.disabled=false;btn.textContent='Pay Now (Simulate)';}
                    }catch(e){document.getElementById('result').innerHTML='<p style="color:#f87171">Network error</p>';btn.disabled=false;btn.textContent='Pay Now (Simulate)';}
                  }
                </script></body></html>
                """.formatted(txnId, status.get("status"), txnId, home);
    }
}
