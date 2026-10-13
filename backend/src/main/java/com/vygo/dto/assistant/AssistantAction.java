package com.vygo.dto.assistant;

import java.util.Map;

public record AssistantAction(
        String type,
        Map<String, Object> data) {

    public static AssistantAction none() {
        return new AssistantAction("none", Map.of());
    }

    public static AssistantAction search(Map<String, Object> data) {
        return new AssistantAction("search", data);
    }

    public static AssistantAction navigate(String path) {
        return new AssistantAction("navigate", Map.of("path", path));
    }
}
