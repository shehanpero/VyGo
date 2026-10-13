package com.vygo.config;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

@Component
public class ProdSecretsValidator implements InitializingBean {

    private final Environment environment;
    private final AppProperties appProperties;

    public ProdSecretsValidator(Environment environment, AppProperties appProperties) {
        this.environment = environment;
        this.appProperties = appProperties;
    }

    @Override
    public void afterPropertiesSet() {
        if (!environment.acceptsProfiles(Profiles.of("prod"))) {
            return;
        }
        if (isKnownDefault(appProperties.getSecret()) || isKnownDefault(appProperties.getQrSecret())) {
            throw new IllegalStateException(
                    "Refusing to start in prod with default secrets. Set VYGO_JWT_SECRET and VYGO_QR_SECRET.");
        }
    }

    private boolean isKnownDefault(String value) {
        return value == null || value.isBlank() || value.startsWith("change-me-in-prod")
                || value.contains("0123456789");
    }
}
