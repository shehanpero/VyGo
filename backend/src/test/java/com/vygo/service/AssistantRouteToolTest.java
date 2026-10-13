package com.vygo.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vygo.config.AppProperties;
import com.vygo.dto.assistant.AssistantResponse;
import com.vygo.dto.routetools.RouteToolDto;
import com.vygo.entity.RouteTool.RouteToolNetwork;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Route-tool grounding for the AI assistant: questions about expressway corridors, operator
 * contacts, phone numbers and timetables should query RouteToolService and reply with a
 * "route-tool" citation carrying the matched route-tool entry.
 */
class AssistantRouteToolTest {

    private TripService tripService;
    private BookingService bookingService;
    private AppProperties props;
    private RouteToolService routeToolService;
    private AssistantService assistant;

    @BeforeEach
    void setUp() {
        tripService = mock(TripService.class);
        bookingService = mock(BookingService.class);
        props = new AppProperties();
        props.setCancellationWindowMinutes(60);
        props.setCancellationFeePct(5.0);
        routeToolService = mock(RouteToolService.class);
        assistant = new AssistantService(tripService, bookingService, props,
                new RestTemplateBuilder(), new ObjectMapper(),
                null, null, null, routeToolService);
    }

    private static RouteToolDto routeToolDto(Long id, String corridor, String from, String to,
                                             List<String> operators, List<String> phones,
                                             List<String> routeNumbers, String notes) {
        RouteToolDto dto = mock(RouteToolDto.class);
        when(dto.id()).thenReturn(id);
        when(dto.corridor()).thenReturn(corridor);
        when(dto.fromCity()).thenReturn(from);
        when(dto.toCity()).thenReturn(to);
        when(dto.via()).thenReturn(null);
        when(dto.operatorType()).thenReturn("STATE");
        when(dto.operators()).thenReturn(operators);
        when(dto.phones()).thenReturn(phones);
        when(dto.routeNumbers()).thenReturn(routeNumbers);
        when(dto.notes()).thenReturn(notes);
        when(dto.hasBookableTrips()).thenReturn(true);
        return dto;
    }

    @Test
    void operatorContactQueryReturnsRouteToolCitationAndOperatorName() {
        RouteToolDto dto = routeToolDto(7L, "Colombo – Kataragama", "Colombo", "Kataragama",
                List.of("SLTB", "Lanka Tours"), List.of("011-2345678", "077-1234567"),
                List.of("E03"), "Daily services via the Southern Expressway.");
        when(routeToolService.list(anyString(), eq(RouteToolNetwork.EXPRESSWAY)))
                .thenReturn(List.of(dto));
        when(routeToolService.list(anyString(), eq(RouteToolNetwork.NORMAL)))
                .thenReturn(List.of());

        AssistantResponse res = assistant.chat("which operators run Colombo to Kataragama?", null, Set.of());

        assertTrue(res.reply().contains("SLTB"));
        assertTrue(res.reply().contains("011-2345678"));
        assertTrue(res.reply().contains("Lanka Tours"));
        assertTrue(res.citations().stream().anyMatch(c ->
                "route-tool".equals(c.source()) && "7".equals(c.ref())));
        verify(routeToolService).list(anyString(), eq(RouteToolNetwork.EXPRESSWAY));
        verify(routeToolService).list(anyString(), eq(RouteToolNetwork.NORMAL));
    }

    @Test
    void expresswayContactQueryUsesExpresswayNetwork() {
        RouteToolDto dto = routeToolDto(3L, "Colombo – Katunayake Airport", "Colombo", "Katunayake Airport",
                List.of("Aero Lanka"), List.of("0112-334455"),
                List.of("E03"), "24/7 airport shuttle to the airport terminals.");
        when(routeToolService.list(anyString(), eq(RouteToolNetwork.EXPRESSWAY)))
                .thenReturn(List.of(dto));

        AssistantResponse res = assistant.chat("who runs the E03 to the airport and what's the number?", null, Set.of());

        assertTrue(res.reply().contains("Aero Lanka"));
        assertTrue(res.reply().contains("0112-334455"));
        assertTrue(res.citations().stream().anyMatch(c ->
                "route-tool".equals(c.source()) && "3".equals(c.ref())));
        verify(routeToolService).list(anyString(), eq(RouteToolNetwork.EXPRESSWAY));
    }

    @Test
    void normalRouteNumberQueryAddsSuggestedQueries() {
        RouteToolDto dto = routeToolDto(9L, "Colombo – Galle (coastal)", "Colombo", "Galle",
                List.of("SLTB"), List.of("011-9998887"),
                List.of("99"), "Hourly departures from Pettah.");
        when(routeToolService.list(anyString(), eq(RouteToolNetwork.NORMAL)))
                .thenReturn(List.of(dto));

        AssistantResponse res = assistant.chat("show me normal route 99 details", null, Set.of());

        assertTrue(res.reply().contains("SLTB"));
        assertTrue(res.reply().contains("99"));
        assertTrue(res.suggestions().stream().anyMatch(s -> s.toLowerCase().contains("route 99")));
        assertTrue(res.suggestions().stream().anyMatch(s -> s.toLowerCase().contains("expressway contact")));
        assertTrue(res.citations().stream().anyMatch(c -> "route-tool".equals(c.source())));
        verify(routeToolService).list(anyString(), eq(RouteToolNetwork.NORMAL));
    }

    @Test
    void bareExpresswayStillUsesFaqNotRouteTool() {
        AssistantResponse res = assistant.chat("expressway", null, Set.of());

        assertTrue(res.reply().contains("E001"));
        assertTrue(res.citations().stream().anyMatch(c -> "faq-factsheet".equals(c.source())
                && "expressway-services".equals(c.ref())));
        verify(routeToolService, never()).list(any(), any());
    }

    @Test
    void emptyRouteToolResultsFallBackToExistingBehavior() {
        when(routeToolService.list(anyString(), any())).thenReturn(List.of());

        AssistantResponse res = assistant.chat("expressway to Kandy", null, Set.of());

        assertNotNull(res.reply());
        assertFalse(res.reply().isBlank());
        verify(routeToolService).list(anyString(), any());
    }

    @Test
    void plainTripQueriesDoNotHitRouteToolService() {
        AssistantResponse res = assistant.chat("bus from Colombo to Kandy", null, Set.of());

        assertEquals("search", res.action().type());
        verify(routeToolService, never()).list(any(), any());
    }
}
