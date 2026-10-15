package com.vygo.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.vygo.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Base64;
import java.util.Map;

/**
 * Client for the self-hosted face verification service (see {@code face-service/}).
 *
 * <p>Compares the live "selfie" capture against the portrait on the submitted ID
 * document and returns a similarity score. When the feature is disabled or the
 * Python service is unreachable the call degrades gracefully
 * ({@link FaceMatchResult#available()} = false) instead of blocking the flow.</p>
 */
@Component
public class FaceVerificationClient {

    private static final Logger log = LoggerFactory.getLogger(FaceVerificationClient.class);

    private final AppProperties app;
    private final RestClient client;

    public FaceVerificationClient(AppProperties app, RestClient.Builder restClientBuilder) {
        this.app = app;
        this.client = restClientBuilder.build();
    }

    public boolean isEnabled() {
        return app.getFace().isEnabled();
    }

    public FaceMatchResult match(byte[] selfie, byte[] document) {
        if (!isEnabled()) {
            return FaceMatchResult.disabled();
        }
        if (selfie == null || selfie.length == 0 || document == null || document.length == 0) {
            return FaceMatchResult.unavailable("Face scan or document image missing");
        }
        try {
            JsonNode node = client.post()
                    .uri(app.getFace().getUrl() + "/match")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "selfie", Base64.getEncoder().encodeToString(selfie),
                            "document", Base64.getEncoder().encodeToString(document)))
                    .retrieve()
                    .body(JsonNode.class);
            if (node == null) {
                return FaceMatchResult.unavailable("Empty response from face service");
            }
            int selfieFaces = node.path("selfie_faces").asInt(0);
            int documentFaces = node.path("document_faces").asInt(0);
            double similarity = node.path("similarity").asDouble(0.0);
            boolean matched = node.path("matched").asBoolean(false);
            boolean selfieReal = node.path("selfie_real").asBoolean(true);
            double spoofScore = node.path("spoof_score").asDouble(0.0);
            return new FaceMatchResult(true, selfieFaces, documentFaces, similarity, matched,
                    selfieReal, spoofScore, null);
        } catch (Exception e) {
            log.warn("[VYGO FACE] service unavailable at {}: {}", app.getFace().getUrl(), e.getMessage());
            return FaceMatchResult.unavailable("Face verification service is offline");
        }
    }

    /**
     * @param available      whether the face service produced a result at all
     * @param selfieFaces    number of faces detected in the selfie
     * @param documentFaces  number of faces detected on the ID document
     * @param similarity     cosine similarity of the two face embeddings (0..1)
     * @param matched        whether {@code similarity} cleared the configured threshold
     * @param selfieReal     passive anti-spoofing verdict (false = likely photo/screen)
     * @param spoofScore     anti-spoofing "real" confidence (0..1, higher = more real)
     * @param message        failure reason when {@code available} is false
     */
    public record FaceMatchResult(
            boolean available,
            int selfieFaces,
            int documentFaces,
            double similarity,
            boolean matched,
            boolean selfieReal,
            double spoofScore,
            String message) {

        static FaceMatchResult disabled() {
            return new FaceMatchResult(false, 0, 0, 0, false, true, 0, "disabled");
        }

        static FaceMatchResult unavailable(String message) {
            return new FaceMatchResult(false, 0, 0, 0, false, true, 0, message);
        }
    }
}
