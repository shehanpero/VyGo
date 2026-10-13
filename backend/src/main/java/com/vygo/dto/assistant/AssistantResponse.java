package com.vygo.dto.assistant;

import java.util.List;

public record AssistantResponse(
        String reply,
        List<String> suggestions,
        AssistantAction action,
        List<Citation> citations) {

    public AssistantResponse {
        citations = citations == null ? List.of() : citations;
    }

    public static AssistantResponse of(String reply, List<String> suggestions, AssistantAction action) {
        return new AssistantResponse(reply, suggestions, action, List.of());
    }

    public static AssistantResponse of(String reply, List<String> suggestions, AssistantAction action,
                                       List<Citation> citations) {
        return new AssistantResponse(reply, suggestions, action, citations);
    }
}
