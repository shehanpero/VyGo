package com.vygo.integration;

import com.vygo.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
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

    public boolean send(String to, String subject, String body) {
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
                () -> doSend(mailSender, to, subject, body),
                () -> {
                    log.warn("[VYGO EMAIL] circuit degraded, delivery skipped to={} subject={}", to, subject);
                    return false;
                });
    }

    private boolean doSend(JavaMailSender mailSender, String to, String subject, String body) {
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

    private static final class MailDeliveryException extends RuntimeException {
        MailDeliveryException(Throwable cause) {
            super(cause);
        }
    }
}
