package com.vygo.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

/**
 * Reads the {@code amenities} JSON column on {@link com.vygo.entity.Bus}.
 *
 * <p>The column is JSON-typed. On H2 (dev) a bound string is wrapped into a
 * JSON string scalar, so a raw array like {@code ["WiFi","Water"]} is stored
 * as the double-encoded {@code "[\"WiFi\",\"Water\"]"}. {@link #parse(String)}
 * tolerates both the raw-array form (Postgres/MySQL etc.) and the wrapped
 * string form, so the seat map, conductor tooling and operator listings all
 * render the same truthful list regardless of database.
 */
public final class AmenityJson {

    private static final Logger log = LoggerFactory.getLogger(AmenityJson.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<List<String>>() {};

    private AmenityJson() {
    }

    public static List<String> parse(String stored) {
        if (stored == null || stored.isBlank()) {
            return List.of();
        }
        String candidate = stored.trim();
        if (candidate.startsWith("\"") && candidate.endsWith("\"")) {
            try {
                String unwrapped = MAPPER.readValue(candidate, String.class);
                if (unwrapped == null || unwrapped.isBlank()) {
                    return List.of();
                }
                if (!unwrapped.equals(candidate)) {
                    candidate = unwrapped.trim();
                }
            } catch (Exception ignored) {
                // Not a JSON string scalar; fall through and try the raw value.
            }
        }
        try {
            List<String> amenities = MAPPER.readValue(candidate, LIST_TYPE);
            return amenities == null ? List.of() : amenities;
        } catch (Exception e) {
            log.warn("Unparseable bus amenities JSON: {}", stored);
            return List.of();
        }
    }
}
