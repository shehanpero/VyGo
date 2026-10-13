package com.vygo.integration;

import com.vygo.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public final class SmsSender {

    private static final Logger log = LoggerFactory.getLogger(SmsSender.class);

    private final AppProperties app;

    public SmsSender(AppProperties app) {
        this.app = app;
    }

    public boolean send(String mobile, String message) {
        if (!app.getNotifications().isSmsEnabled()) {
            log.info("[VYGO SMS][stub] to={} msg={}", mobile, message);
        } else {
            log.info("[VYGO SMS] to={} msg={} (provider stub)", mobile, message);
        }
        return true;
    }
}
