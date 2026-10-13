package com.vygo.controller;

import com.vygo.dto.assistant.AssistantChatRequest;
import com.vygo.dto.assistant.AssistantResponse;
import com.vygo.exception.UnauthorizedException;
import com.vygo.security.CurrentUser;
import com.vygo.service.AssistantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

@RestController
@RequestMapping("/api/v1/assistant")
@Tag(name = "AI Assistant", description = "In-site VyGo travel assistant (local engine with optional LLM upgrade)")
public class AssistantController {

    private final AssistantService assistantService;

    public AssistantController(AssistantService assistantService) {
        this.assistantService = assistantService;
    }

    @PostMapping("/chat")
    @Operation(summary = "Send a message to the VyGo assistant")
    public AssistantResponse chat(@Valid @RequestBody AssistantChatRequest request) {
        Long userId = null;
        Set<String> roles = Set.of();
        try {
            userId = CurrentUser.id();
            roles = CurrentUser.roles();
        } catch (UnauthorizedException ignored) {
            // anonymous guest — assistant works without signing in
        }
        return assistantService.chat(request.message(), userId, roles, request.sessionId());
    }
}
