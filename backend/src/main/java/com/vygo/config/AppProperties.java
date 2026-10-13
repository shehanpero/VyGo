package com.vygo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private String secret;
    private int accessTokenTtlMinutes;
    private int seatLockTtlMinutes;
    private int cancellationWindowMinutes;
    private double cancellationFeePct;
    private String qrSecret;
    private String corsAllowedOrigins;
    private final Notifications notifications = new Notifications();
    private final Ai ai = new Ai();

    public String getSecret() {
        return secret;
    }

    public String getJwtSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public int getAccessTokenTtlMinutes() {
        return accessTokenTtlMinutes;
    }

    public void setAccessTokenTtlMinutes(int accessTokenTtlMinutes) {
        this.accessTokenTtlMinutes = accessTokenTtlMinutes;
    }

    public int getSeatLockTtlMinutes() {
        return seatLockTtlMinutes;
    }

    public void setSeatLockTtlMinutes(int seatLockTtlMinutes) {
        this.seatLockTtlMinutes = seatLockTtlMinutes;
    }

    public int getCancellationWindowMinutes() {
        return cancellationWindowMinutes;
    }

    public void setCancellationWindowMinutes(int cancellationWindowMinutes) {
        this.cancellationWindowMinutes = cancellationWindowMinutes;
    }

    public double getCancellationFeePct() {
        return cancellationFeePct;
    }

    public void setCancellationFeePct(double cancellationFeePct) {
        this.cancellationFeePct = cancellationFeePct;
    }

    public String getQrSecret() {
        return qrSecret;
    }

    public void setQrSecret(String qrSecret) {
        this.qrSecret = qrSecret;
    }

    public String getCorsAllowedOrigins() {
        return corsAllowedOrigins;
    }

    public void setCorsAllowedOrigins(String corsAllowedOrigins) {
        this.corsAllowedOrigins = corsAllowedOrigins;
    }

    public Notifications getNotifications() {
        return notifications;
    }

    public Ai getAi() {
        return ai;
    }

    public static class Ai {

        private final Llm llm = new Llm();
        private String perovinUrl;

        public Llm getLlm() {
            return llm;
        }

        public String getPerovinUrl() {
            return perovinUrl;
        }

        public void setPerovinUrl(String perovinUrl) {
            this.perovinUrl = perovinUrl;
        }

        public static class Llm {

            private String baseUrl;
            private String apiKey;
            private String model;

            public String getBaseUrl() {
                return baseUrl;
            }

            public void setBaseUrl(String baseUrl) {
                this.baseUrl = baseUrl;
            }

            public String getApiKey() {
                return apiKey;
            }

            public void setApiKey(String apiKey) {
                this.apiKey = apiKey;
            }

            public String getModel() {
                return model;
            }

            public void setModel(String model) {
                this.model = model;
            }
        }
    }

    public static class Notifications {

        private String emailFrom;
        private boolean emailEnabled;
        private boolean smsEnabled;

        public String getEmailFrom() {
            return emailFrom;
        }

        public void setEmailFrom(String emailFrom) {
            this.emailFrom = emailFrom;
        }

        public boolean isEmailEnabled() {
            return emailEnabled;
        }

        public void setEmailEnabled(boolean emailEnabled) {
            this.emailEnabled = emailEnabled;
        }

        public boolean isSmsEnabled() {
            return smsEnabled;
        }

        public void setSmsEnabled(boolean smsEnabled) {
            this.smsEnabled = smsEnabled;
        }
    }
}
