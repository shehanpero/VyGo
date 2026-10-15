package com.vygo.integration;

import com.vygo.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * SMS delivery with pluggable Sri Lankan gateways.
 *
 * <p>Configured via {@code app.notifications.*}. When {@code sms-enabled} is
 * false or no provider/key is set, messages are logged only (dev behaviour) so
 * the app keeps working without an account. Supported providers:</p>
 * <ul>
 *   <li>{@code textlk}  – Text.lk REST API (Bearer token)</li>
 *   <li>{@code notifylk} – Notify.lk REST API (user_id + api_key)</li>
 * </ul>
 */
@Component
public final class SmsSender {

    private static final Logger log = LoggerFactory.getLogger(SmsSender.class);

    private final AppProperties app;
    private final HttpClient http;

    public SmsSender(AppProperties app) {
        this.app = app;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean send(String mobile, String message) {
        AppProperties.Notifications cfg = app.getNotifications();
        String provider = cfg.getSmsProvider() == null ? "" : cfg.getSmsProvider().trim().toLowerCase();
        if (!cfg.isSmsEnabled() || provider.isEmpty()) {
            log.info("[VYGO SMS][stub] to={} msg={}", mobile, message);
            return true;
        }
        if (mobile == null || mobile.isBlank()) {
            log.warn("[VYGO SMS] no recipient number");
            return false;
        }
        String to = toMsisdn(mobile);
        try {
            return switch (provider) {
                case "textlk" -> sendTextLk(to, message);
                case "notifylk" -> sendNotifyLk(to, message);
                default -> {
                    log.warn("[VYGO SMS] unknown provider '{}', message to={} not sent", provider, to);
                    yield false;
                }
            };
        } catch (Exception e) {
            log.error("[VYGO SMS] send failed via {} to={}: {}", provider, to, e.getMessage());
            return false;
        }
    }

    /** Text.lk: POST https://app.text.lk/api/v3/sms/send with a Bearer token. */
    private boolean sendTextLk(String to, String message) throws Exception {
        String key = app.getNotifications().getSmsApiKey();
        String senderId = app.getNotifications().getSmsSenderId();
        if (key == null || key.isBlank() || senderId == null || senderId.isBlank()) {
            log.warn("[VYGO SMS] text.lk requires sms-api-key and sms-sender-id; not sent");
            return false;
        }
        String json = "{"
                + "\"recipient\":\"" + escape(to) + "\","
                + "\"sender_id\":\"" + escape(senderId) + "\","
                + "\"type\":\"plain\","
                + "\"message\":\"" + escape(message) + "\""
                + "}";
        HttpRequest req = HttpRequest.newBuilder(URI.create("https://app.text.lk/api/v3/sms/send"))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + key)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                .build();
        return execute(req, "text.lk");
    }

    /** Notify.lk: POST https://app.notify.lk/api/v1/send with user_id + api_key. */
    private boolean sendNotifyLk(String to, String message) throws Exception {
        String userId = app.getNotifications().getSmsUserId();
        String key = app.getNotifications().getSmsApiKey();
        String senderId = app.getNotifications().getSmsSenderId();
        if (userId == null || userId.isBlank() || key == null || key.isBlank()) {
            log.warn("[VYGO SMS] notify.lk requires sms-user-id and sms-api-key; not sent");
            return false;
        }
        String body = "user_id=" + enc(userId)
                + "&api_key=" + enc(key)
                + "&sender_id=" + enc(senderId == null ? "NotifyDEMO" : senderId)
                + "&to=" + enc(to)
                + "&message=" + enc(message);
        HttpRequest req = HttpRequest.newBuilder(URI.create("https://app.notify.lk/api/v1/send"))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
        return execute(req, "notify.lk");
    }

    private boolean execute(HttpRequest req, String provider) throws Exception {
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        String body = res.body() == null ? "" : res.body();
        boolean httpOk = res.statusCode() >= 200 && res.statusCode() < 300;
        boolean payloadOk = body.contains("\"status\":\"success\"") || body.toLowerCase().contains("success");
        boolean ok = httpOk && payloadOk;
        if (ok) {
            log.info("[VYGO SMS] sent via {} (HTTP {})", provider, res.statusCode());
        } else {
            log.warn("[VYGO SMS] {} rejected (HTTP {}): {}", provider, res.statusCode(), truncate(body));
        }
        return ok;
    }

    /** Convert stored local format (07XXXXXXXX) to MSISDN (947XXXXXXXX). */
    static String toMsisdn(String mobile) {
        String digits = mobile.replaceAll("[^0-9]", "");
        if (digits.startsWith("0")) {
            return "94" + digits.substring(1);
        }
        if (digits.startsWith("94")) {
            return digits;
        }
        return "94" + digits;
    }

    private static String enc(String s) {
        return URLEncoder.encode(s == null ? "" : s, StandardCharsets.UTF_8);
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static String truncate(String s) {
        return s.length() > 200 ? s.substring(0, 200) + "…" : s;
    }
}
