package com.vygo.integration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
public final class GeoService {

    private static final Logger log = LoggerFactory.getLogger(GeoService.class);

    public String[] geocode(String placeName) {
        int hash = placeName == null ? 0 : placeName.hashCode();
        double latOffset = (hash % 100) / 100.0 - 0.5;
        double lngOffset = ((hash / 7) % 100) / 100.0 - 0.5;
        double lat = 7.2 + latOffset * 0.1;
        double lng = 80.5 + lngOffset * 0.1;
        log.debug("[VYGO GEO][stub] geocode {} -> lat={} lng={}", placeName, lat, lng);
        return new String[]{String.format("%.6f", lat), String.format("%.6f", lng)};
    }

    public String routeLink(String from, String to) {
        String origin = URLEncoder.encode(from == null ? "" : from, StandardCharsets.UTF_8);
        String destination = URLEncoder.encode(to == null ? "" : to, StandardCharsets.UTF_8);
        return "https://www.google.com/maps/dir/?api=1&origin=" + origin
                + "&destination=" + destination;
    }
}
