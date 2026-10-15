package com.vygo.integration;

import com.vygo.config.AppProperties;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public final class EmailSender {

    private static final Logger log = LoggerFactory.getLogger(EmailSender.class);

    private final AppProperties app;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final CircuitBreaker breaker;

    public EmailSender(AppProperties app, ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.app = app;
        this.mailSenderProvider = mailSenderProvider;
        this.breaker = new CircuitBreaker(5, 2, Duration.ofSeconds(30));
    }

    /** Plain-text email (used for booking notifications). */
    public boolean send(String to, String subject, String body) {
        if (to == null || to.isBlank()) {
            log.warn("[VYGO EMAIL] no recipient for subject={}", subject);
            return false;
        }
        if (!app.getNotifications().isEmailEnabled()) {
            log.info("[VYGO EMAIL][stub] to={} subject={} body={}", to, subject, body);
            return true;
        }
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("[VYGO EMAIL] JavaMailSender unavailable, cannot send to={}", to);
            return false;
        }
        return breaker.call(
                () -> deliverPlain(mailSender, to, subject, body),
                () -> {
                    log.warn("[VYGO EMAIL] circuit degraded, delivery skipped to={} subject={}", to, subject);
                    return false;
                });
    }

    /** HTML email (used for verification codes and rich notifications). */
    public boolean sendHtml(String to, String subject, String htmlBody) {
        if (to == null || to.isBlank()) {
            log.warn("[VYGO EMAIL] no recipient for subject={}", subject);
            return false;
        }
        if (!app.getNotifications().isEmailEnabled()) {
            log.info("[VYGO EMAIL][stub][html] to={} subject={}", to, subject);
            return true;
        }
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("[VYGO EMAIL] JavaMailSender unavailable, cannot send to={}", to);
            return false;
        }
        return breaker.call(
                () -> deliverHtml(mailSender, to, subject, htmlBody),
                () -> {
                    log.warn("[VYGO EMAIL] circuit degraded, HTML delivery skipped to={}", to);
                    return false;
                });
    }

    /**
     * One-time passcode email. Always attempts real delivery (bypasses the
     * circuit breaker) so a transient mail outage can never silently swallow a
     * code the user is waiting for; failures are surfaced to the caller.
     */
    public boolean sendOtp(String to, String otp, String purpose) {
        String subject = "Your VyGo verification code";
        String what = (purpose == null || purpose.isBlank()) ? "verification" : purpose;
        if (!app.getNotifications().isEmailEnabled()) {
            log.info("[VYGO EMAIL][stub][otp] to={} code={} purpose={}", to, otp, what);
            return true;
        }
        if (to == null || to.isBlank()) {
            log.warn("[VYGO EMAIL] no email on file for OTP purpose={}", what);
            return false;
        }
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("[VYGO EMAIL] JavaMailSender unavailable, cannot send OTP to={}", to);
            return false;
        }
        String html = otpHtml(otp, what);
        try {
            return deliverHtml(mailSender, to, subject, html);
        } catch (Exception e) {
            log.error("[VYGO EMAIL] OTP delivery failed to={}: {}", to, e.getMessage());
            return false;
        }
    }

    private boolean deliverPlain(JavaMailSender mailSender, String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(app.getNotifications().getEmailFrom());
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("[VYGO EMAIL] sent to={} subject={}", to, subject);
            return true;
        } catch (Exception e) {
            log.error("[VYGO EMAIL] failed to={} subject={}: {}", to, subject, e.getMessage());
            throw new MailDeliveryException(e);
        }
    }

    private boolean deliverHtml(JavaMailSender mailSender, String to, String subject, String html) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(app.getNotifications().getEmailFrom());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            log.info("[VYGO EMAIL] sent (html) to={} subject={}", to, subject);
            return true;
        } catch (Exception e) {
            log.error("[VYGO EMAIL] failed (html) to={} subject={}: {}", to, subject, e.getMessage());
            throw new MailDeliveryException(e);
        }
    }

    private static String otpHtml(String otp, String purpose) {
        return """
                <div style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
                  <h2 style="margin:0 0 4px;font-size:20px">VyGo %s</h2>
                  <p style="margin:0 0 20px;color:#475569;font-size:14px">Use the code below to continue. It expires in 5 minutes.</p>
                  <div style="font-size:34px;font-weight:700;letter-spacing:10px;background:#0f172a;color:#fff;padding:18px 24px;border-radius:12px;text-align:center">%s</div>
                  <p style="margin:20px 0 0;color:#94a3b8;font-size:12px">If you did not request this code, you can safely ignore this email.</p>
                </div>
                """.formatted(purpose, otp);
    }

    private static final class MailDeliveryException extends RuntimeException {
        MailDeliveryException(Throwable cause) {
            super(cause);
        }
    }
}
