package com.vygo.dto.assistant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AssistantChatRequest(
        @NotBlank @Size(max = 500) String message,
        String sessionId) {

    public AssistantChatRequest(String message) {
        this(message, null);
    }
}
