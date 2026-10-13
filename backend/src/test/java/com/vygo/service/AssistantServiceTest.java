package com.vygo.service;

import com.vygo.config.AppProperties;
import com.vygo.dto.assistant.AssistantResponse;
import com.vygo.dto.booking.BookingResponse;
import com.vygo.dto.common.PageResponse;
import com.vygo.dto.operator.RouteResponseDto;
import com.vygo.dto.search.SearchResponse;
import com.vygo.entity.Route;
import com.vygo.entity.Schedule;
import com.vygo.repository.RouteRepository;
import com.vygo.repository.ScheduleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.web.client.RestTemplateBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AssistantServiceTest {

    private TripService tripService;
    private BookingService bookingService;
    private AppProperties props;
    private AssistantService assistant;

    @BeforeEach
    void setUp() {
        tripService = mock(TripService.class);
        bookingService = mock(BookingService.class);
        props = new AppProperties();
        props.setCancellationWindowMinutes(60);
        props.setCancellationFeePct(5.0);
        assistant = new AssistantService(tripService, bookingService, props,
                new RestTemplateBuilder(), new ObjectMapper());
    }

    private static SearchResponse trip(long id, String dep, String arr, String busType, String operator,
                                       String fare, int seats, int total) {
        return new SearchResponse(
                id, id, "01", "NORMAL", "Colombo", "Kandy", busType,
                "NORMAL".equals(busType) ? "NORMAL" : "EXPRESS", operator,
                "ND-" + id, dep, arr, new BigDecimal("115"), 210,
                fare == null ? null : new BigDecimal(fare), seats, total, List.of(), List.of(),
                null, null, null);
    }

    private void stubSearch(SearchResponse... trips) {
        when(tripService.search(any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(List.of(trips));
    }

    @Test
    void greets() {
        AssistantResponse res = assistant.chat("Hi!", null, Set.of());
        assertEquals("none", res.action().type());
        assertNotNull(res.reply());
        assertTrue(res.reply().toLowerCase().contains("assistant"));
    }

    @Test
    void searchesWhenBothCitiesPresent() {
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));

        AssistantResponse res = assistant.chat("bus from Colombo to Kandy", null, Set.of());

        assertEquals("search", res.action().type());
        Map<String, Object> data = res.action().data();
        assertEquals("Colombo", data.get("from"));
        assertEquals("Kandy", data.get("to"));
        assertTrue(res.reply().contains("1500"));
    }

    @Test
    void asksForRouteWhenOnlyOneCityGiven() {
        AssistantResponse res = assistant.chat("I need a bus to Kandy", null, Set.of());
        assertEquals("none", res.action().type());
        assertTrue(res.reply().toLowerCase().contains("which route")
                || res.reply().toLowerCase().contains("which route are you travelling"));
    }

    @Test
    void bookingsGuestIsSentToLogin() {
        AssistantResponse res = assistant.chat("show my bookings", null, Set.of());
        assertEquals("navigate", res.action().type());
        assertEquals("/login", res.action().data().get("path"));
    }

    @Test
    void bookingsPassengerWithNoBookings() {
        when(bookingService.getMyBookings(anyLong(), anyInt(), anyInt()))
                .thenReturn(new PageResponse<>(List.of(), 0, 5, 0L, 0));
        AssistantResponse res = assistant.chat("my bookings", 7L, Set.of("ROLE_PASSENGER"));
        assertTrue(res.reply().toLowerCase().contains("don't have any bookings"));
    }

    @Test
    void bookingsPassengerWithBookingsNavigates() {
        BookingResponse b = new BookingResponse(1L, "VY-20260802-ABCD", 1L, "CONFIRMED",
                List.of("5"), 1, new BigDecimal("1500"), null, null, null,
                "2026-08-02", "2026-08-02T06:00:00", new BigDecimal("1500"),
                "Nimal", List.of(), null);
        when(bookingService.getMyBookings(anyLong(), anyInt(), anyInt()))
                .thenReturn(new PageResponse<>(List.of(b), 0, 5, 1L, 1));
        AssistantResponse res = assistant.chat("my bookings", 7L, Set.of("ROLE_PASSENGER"));
        assertEquals("navigate", res.action().type());
        assertEquals("/bookings", res.action().data().get("path"));
        assertTrue(res.reply().contains("VY-20260802-ABCD"));
    }

    @Test
    void cancelExplainsPolicy() {
        AssistantResponse res = assistant.chat("can I get a refund?", null, Set.of());
        assertEquals("none", res.action().type());
        assertTrue(res.reply().toLowerCase().contains("60 minutes"));
        assertTrue(res.reply().toLowerCase().contains("5%"));
    }

    @Test
    void unknownQuestionFallsBack() {
        AssistantResponse res = assistant.chat("quux plugh xyzzy", null, Set.of());
        assertEquals("none", res.action().type());
        assertNotNull(res.reply());
        assertTrue(res.suggestions().size() >= 3);
    }

    @Test
    void routesOpensRoutesPage() {
        AssistantResponse res = assistant.chat("what routes are available?", null, Set.of());
        assertEquals("navigate", res.action().type());
        assertEquals("/routes", res.action().data().get("path"));
    }

    @Test
    void searchResponseWithNullAmountIsHandled() {
        stubSearch(trip(2L, "14:30", "18:00", "LUXURY", "Lanka Express", null, 5, 45));
        AssistantResponse res = assistant.chat("Colombo to Kandy bus", null, Set.of());
        assertEquals("search", res.action().type());
        assertNotNull(res.reply());
    }

    // -------------------------------------------------------- date parsing

    @Test
    void searchesTomorrowWhenAsked() {
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));
        LocalDate tomorrow = LocalDate.now().plusDays(1);

        AssistantResponse res = assistant.chat("bus from Colombo to Kandy tomorrow", null, Set.of());

        assertEquals("search", res.action().type());
        assertEquals(tomorrow.toString(), res.action().data().get("date"));
        assertTrue(res.reply().contains("tomorrow"));
        assertEquals(tomorrow, capturedSearchDate());
    }

    @Test
    void searchesAbsoluteIsoDate() {
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));
        LocalDate target = LocalDate.now().plusDays(5);

        assistant.chat("bus from Colombo to Kandy on " + target, null, Set.of());

        assertEquals(target, capturedSearchDate());
    }

    @Test
    void searchesMonthNameDate() {
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));
        LocalDate target = LocalDate.of(LocalDate.now().getYear(), 8, 5);
        if (target.isBefore(LocalDate.now())) {
            target = LocalDate.now();
        }

        assistant.chat("bus from Colombo to Kandy on the 5th of august", null, Set.of());

        assertEquals(target, capturedSearchDate());
    }

    @Test
    void searchesWeekdayName() {
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));
        LocalDate now = LocalDate.now();
        int targetDow = 5;
        int days = (targetDow - now.getDayOfWeek().getValue() + 7) % 7;

        assistant.chat("bus from Colombo to Kandy on friday", null, Set.of());

        assertEquals(now.plusDays(days), capturedSearchDate());
    }

    @Test
    void searchesInDaysPhrase() {
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));

        assistant.chat("bus from Colombo to Kandy in 2 days", null, Set.of());

        assertEquals(LocalDate.now().plusDays(2), capturedSearchDate());
    }

    @Test
    void invalidOrPastDateClampsToToday() {
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));

        assistant.chat("bus from Colombo to Kandy yesterday", null, Set.of());

        assertEquals(LocalDate.now(), capturedSearchDate());
    }

    // ------------------------------------------------------- trip intents

    @Test
    void cheapestBusUsesLiveMinimum() {
        stubSearch(
                trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45),
                trip(2L, "08:30", "12:00", "SEMI_LUXURY", "Ceylon Tours", "1200.00", 20, 40),
                trip(3L, "14:00", "17:30", "NORMAL", "City Bus", "2000.00", 5, 45));

        AssistantResponse res = assistant.chat("cheapest bus from Colombo to Kandy", null, Set.of());

        assertEquals("search", res.action().type());
        assertTrue(res.reply().contains("1200"));
        assertTrue(res.reply().contains("Ceylon Tours"));
    }

    @Test
    void fareLookupSummarizesCheapestAndRange() {
        stubSearch(
                trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45),
                trip(2L, "08:30", "12:00", "SEMI_LUXURY", "Ceylon Tours", "1200.00", 20, 40),
                trip(3L, "14:00", "17:30", "NORMAL", "City Bus", "2000.00", 5, 45));

        AssistantResponse res = assistant.chat("how much is the fare from Colombo to Kandy", null, Set.of());

        assertEquals("search", res.action().type());
        assertTrue(res.reply().contains("1200"));
        assertTrue(res.reply().contains("2000"));
    }

    @Test
    void scheduleIntentListsDepartures() {
        stubSearch(
                trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45),
                trip(2L, "08:30", "12:00", "NORMAL", "Ceylon Tours", "900.00", 20, 40));

        AssistantResponse res = assistant.chat("what time does the bus from Colombo to Kandy leave", null, Set.of());

        assertEquals("search", res.action().type());
        assertTrue(res.reply().contains("06:00"));
        assertTrue(res.reply().contains("08:30"));
    }

    @Test
    void availabilityIntentReportsSeats() {
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));

        AssistantResponse res = assistant.chat("are seats available from Colombo to Kandy", null, Set.of());

        assertEquals("search", res.action().type());
        assertTrue(res.reply().toLowerCase().contains("available"));
        assertTrue(res.reply().contains("42"));
    }

    @Test
    void busTypeFilterPassesThroughToSearch() {
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));

        AssistantResponse res = assistant.chat("AC bus from Colombo to Kandy", null, Set.of());

        assertEquals("search", res.action().type());
        assertEquals("AC", res.action().data().get("busType"));
        assertTrue(res.reply().contains("AC"));
        verify(tripService).search(eq("Colombo"), eq("Kandy"), any(), isNull(), eq("AC"), isNull(), isNull());
    }

    @Test
    void singleCityAsksForDestination() {
        AssistantResponse res = assistant.chat("buses from Kandy", null, Set.of());
        assertEquals("none", res.action().type());
        assertTrue(res.reply().toLowerCase().contains("which route"));
    }

    @Test
    void extractsCitiesWithinLargerPlaceNames() {
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));

        AssistantResponse res = assistant.chat("bus from Colombo Fort to Kandy city", null, Set.of());

        assertEquals("Colombo", res.action().data().get("from"));
        assertEquals("Kandy", res.action().data().get("to"));
    }

    // ------------------------------------------------------ session memory

    @Test
    void sessionFollowUpResolvesStoredPair() {
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));
        LocalDate tomorrow = LocalDate.now().plusDays(1);

        assistant.chat("bus from Colombo to Kandy", null, Set.of(), "s1");
        AssistantResponse res = assistant.chat("what about tomorrow", null, Set.of(), "s1");

        assertEquals("search", res.action().type());
        assertEquals("Colombo", res.action().data().get("from"));
        assertEquals("Kandy", res.action().data().get("to"));
        assertEquals(tomorrow.toString(), res.action().data().get("date"));

        ArgumentCaptor<LocalDate> captor = ArgumentCaptor.forClass(LocalDate.class);
        verify(tripService, times(2)).search(eq("Colombo"), eq("Kandy"), captor.capture(),
                isNull(), isNull(), isNull(), isNull());
        assertEquals(LocalDate.now(), captor.getAllValues().get(0));
        assertEquals(tomorrow, captor.getAllValues().get(1));
    }

    @Test
    void sessionFollowUpWithBusTypeFilter() {
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));

        assistant.chat("bus from Colombo to Kandy", null, Set.of(), "s1");
        AssistantResponse res = assistant.chat("and the AC ones", null, Set.of(), "s1");

        assertEquals("search", res.action().type());
        assertEquals("AC", res.action().data().get("busType"));
        verify(tripService, times(2)).search(eq("Colombo"), eq("Kandy"), any(), isNull(), any(), isNull(), isNull());
    }

    @Test
    void sessionMemoryIsScopedToSessionId() {
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));

        assistant.chat("bus from Colombo to Kandy", null, Set.of(), "s1");
        AssistantResponse res = assistant.chat("what about tomorrow", null, Set.of(), "s2");

        assertEquals("none", res.action().type());
        assertTrue(res.reply().toLowerCase().contains("which route"));
    }

    // ------------------------------------------------------ accuracy

    @Test
    void routesUsesLiveRouteCount() {
        List<RouteResponseDto> dtos = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            dtos.add(new RouteResponseDto((long) i, "R0" + i, "Colombo", "Kandy", "NORMAL", null, "STANDARD",
                    new BigDecimal("115"), 210, "ACTIVE", List.of()));
        }
        when(tripService.listRoutes(any(), any(), any())).thenReturn(dtos);

        AssistantResponse res = assistant.chat("what routes are available?", null, Set.of());

        assertEquals("/routes", res.action().data().get("path"));
        assertTrue(res.reply().contains("3 routes"));
        assertTrue(res.reply().toLowerCase().contains("expressway"));
    }

    @Test
    void llmNotConfiguredStaysOffline() {
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));

        AssistantResponse res = assistant.chat("bus from Colombo to Kandy", null, Set.of());

        assertEquals("search", res.action().type());
        assertTrue(res.reply().contains("I found 1 trip"));
        assertTrue(res.reply().contains("1500"));
    }

    @Test
    void garbageInputFallsBack() {
        AssistantResponse res = assistant.chat("asdfgh qwerty zxcvbn", null, Set.of());
        assertEquals("none", res.action().type());
        assertTrue(res.suggestions().size() >= 3);
    }

    // ------------------------------------------------------ citations

    @Test
    void tripReplyCarriesTripSearchAndFareRuleCitations() {
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));

        AssistantResponse res = assistant.chat("bus from Colombo to Kandy", null, Set.of());

        assertFalse(res.citations().isEmpty());
        assertTrue(res.citations().stream().anyMatch(c -> "trip-search".equals(c.source())
                && "1".equals(c.ref())));
        assertTrue(res.citations().stream().anyMatch(c -> "fare-rule".equals(c.source())
                && "route1+AC".equals(c.ref())));
        assertTrue(res.citations().stream().allMatch(c -> c.label() != null && !c.label().isBlank()));
    }

    @Test
    void availabilityReplyOmitsFareRuleCitations() {
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));

        AssistantResponse res = assistant.chat("are seats available from Colombo to Kandy", null, Set.of());

        assertTrue(res.citations().stream().anyMatch(c -> "trip-search".equals(c.source())));
        assertTrue(res.citations().stream().noneMatch(c -> "fare-rule".equals(c.source())));
    }

    @Test
    void cheapestReplyCitesTheCheapestTrip() {
        stubSearch(
                trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45),
                trip(2L, "08:30", "12:00", "SEMI_LUXURY", "Ceylon Tours", "1200.00", 20, 40),
                trip(3L, "14:00", "17:30", "NORMAL", "City Bus", "2000.00", 5, 45));

        AssistantResponse res = assistant.chat("cheapest bus from Colombo to Kandy", null, Set.of());

        assertTrue(res.citations().stream().anyMatch(c -> "fare-rule".equals(c.source())
                && "route2+SEMI_LUXURY".equals(c.ref())));
        assertTrue(res.citations().stream().anyMatch(c -> "trip-search".equals(c.source()) && "2".equals(c.ref())));
        assertTrue(res.citations().stream().noneMatch(c -> "1".equals(c.ref()) || "3".equals(c.ref())));
    }

    @Test
    void noResultsReplyHasNoCitations() {
        stubSearch();

        AssistantResponse res = assistant.chat("bus from Colombo to Kandy", null, Set.of());

        assertTrue(res.citations().isEmpty());
    }

    @Test
    void routesReplySaysE001AndE003AndCarriesCatalogueCitation() {
        when(tripService.listRoutes(any(), any(), any())).thenReturn(List.of());

        AssistantResponse res = assistant.chat("what routes are available?", null, Set.of());

        assertTrue(res.reply().contains("E001"));
        assertTrue(res.reply().contains("E003"));
        assertFalse(res.reply().contains("E002"));
        assertTrue(res.citations().stream().anyMatch(c -> "route".equals(c.source())
                && "route-catalogue".equals(c.ref())));
    }

    @Test
    void cancelReplyCarriesFactSheetCitation() {
        AssistantResponse res = assistant.chat("can I get a refund?", null, Set.of());

        assertTrue(res.citations().stream().anyMatch(c -> "faq-factsheet".equals(c.source())
                && "cancellation-policy".equals(c.ref())));
    }

    @Test
    void bookingsCarryBookingCitationsForPassenger() {
        BookingResponse b = new BookingResponse(1L, "VY-20260802-ABCD", 1L, "CONFIRMED",
                List.of("5"), 1, new BigDecimal("1500"), null, null, null,
                "2026-08-02", "2026-08-02T06:00:00", new BigDecimal("1500"),
                "Nimal", List.of(), null);
        when(bookingService.getMyBookings(anyLong(), anyInt(), anyInt()))
                .thenReturn(new PageResponse<>(List.of(b), 0, 5, 1L, 1));

        AssistantResponse res = assistant.chat("my bookings", 7L, Set.of("ROLE_PASSENGER"));

        assertTrue(res.citations().stream().anyMatch(c -> "booking".equals(c.source())
                && "VY-20260802-ABCD".equals(c.ref())));
    }

    @Test
    void greetingHasNoCitations() {
        AssistantResponse res = assistant.chat("Hi!", null, Set.of());
        assertTrue(res.citations().isEmpty());
    }

    @Test
    void guestBookingsCitesDemoAccountsFact() {
        AssistantResponse res = assistant.chat("show my bookings", null, Set.of());
        assertTrue(res.citations().stream().anyMatch(c -> "faq-factsheet".equals(c.source())
                && "demo-accounts".equals(c.ref())));
    }

    // ------------------------------------------------------ gazetteer path

    @Test
    void gazetteerAliasCanonicalizesCityPair() {
        RouteRepository routeRepository = mock(RouteRepository.class);
        when(routeRepository.findAll()).thenReturn(List.of(
                route("Makumbura", "Matara"),
                route("Colombo", "Kandy")));
        AssistantService withGazetteer = new AssistantService(tripService, bookingService, props,
                new RestTemplateBuilder(), new ObjectMapper(), new CityGazetteer(routeRepository),
                null, null);
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1900.00", 42, 45));

        AssistantResponse res = withGazetteer.chat("bus from makumbara to matara", null, Set.of());

        assertEquals("search", res.action().type());
        assertEquals("Makumbura", res.action().data().get("from"));
        assertEquals("Matara", res.action().data().get("to"));
        verify(tripService).search(eq("Makumbura"), eq("Matara"), any(), isNull(), isNull(), isNull(), isNull());
    }

    @Test
    void gazetteerSupplementsFallbackForDbMissingCities() {
        RouteRepository routeRepository = mock(RouteRepository.class);
        when(routeRepository.findAll()).thenReturn(List.of(
                route("Colombo", "Kandy")));
        AssistantService withGazetteer = new AssistantService(tripService, bookingService, props,
                new RestTemplateBuilder(), new ObjectMapper(), new CityGazetteer(routeRepository),
                null, null);
        stubSearch(trip(1L, "06:00", "09:30", "AC", "Lanka Express", "1500.00", 42, 45));

        AssistantResponse res = withGazetteer.chat("bus from Colombo to Jaffna", null, Set.of());

        assertEquals("search", res.action().type());
        assertEquals("Colombo", res.action().data().get("from"));
        assertEquals("Jaffna", res.action().data().get("to"));
    }

    @Test
    void busFromColomboToKataragamaCanonicalizesAndCites() {
        RouteRepository routeRepository = mock(RouteRepository.class);
        when(routeRepository.findAll()).thenReturn(List.of(
                route("Colombo", "Kataragama"),
                route("Colombo", "Kandy")));
        AssistantService withGazetteer = new AssistantService(tripService, bookingService, props,
                new RestTemplateBuilder(), new ObjectMapper(), new CityGazetteer(routeRepository),
                null, null);
        stubSearch(trip(1L, "05:30", "11:00", "AC", "SLTB Kataragama", "2400.00", 42, 45));

        AssistantResponse res = withGazetteer.chat("bus from Colombo to Kataragama", null, Set.of());

        assertEquals("search", res.action().type());
        assertEquals("Colombo", res.action().data().get("from"));
        assertEquals("Kataragama", res.action().data().get("to"));
        assertTrue(res.citations().stream().anyMatch(c -> "trip-search".equals(c.source())));
    }

    @Test
    void expresswayToKatunayakeMentionsCanonicalAirport() {
        RouteRepository routeRepository = mock(RouteRepository.class);
        when(routeRepository.findAll()).thenReturn(List.of(
                route("Colombo", "Katunayake Airport"),
                route("Colombo", "Negombo")));
        AssistantService withGazetteer = new AssistantService(tripService, bookingService, props,
                new RestTemplateBuilder(), new ObjectMapper(), new CityGazetteer(routeRepository),
                null, null);

        AssistantResponse res = withGazetteer.chat("expressway to Katunayake", null, Set.of());

        assertTrue(res.reply().contains("Katunayake Airport"));
    }

    @Test
    void sltbOperatorAppearsInTripReply() {
        stubSearch(trip(1L, "07:00", "09:30", "NORMAL", "SLTB", "600.00", 40, 58));

        AssistantResponse res = assistant.chat("SLTB bus from Kandy to Nuwara Eliya", null, Set.of());

        assertEquals("search", res.action().type());
        assertTrue(res.reply().contains("SLTB"));
        assertTrue(res.reply().contains("600"));
        assertFalse(res.citations().isEmpty());
    }

    @Test
    void route47KandyToNuwaraEliyaSearches() {
        stubSearch(trip(1L, "07:00", "09:30", "NORMAL", "SLTB", "600.00", 40, 58));

        AssistantResponse res = assistant.chat("Route 47 from Kandy to Nuwara Eliya", null, Set.of());

        assertEquals("search", res.action().type());
        assertEquals("Kandy", res.action().data().get("from"));
        assertTrue(res.action().data().get("to").toString().toLowerCase().contains("nuwara"));
        assertTrue(res.citations().stream().anyMatch(c -> "trip-search".equals(c.source())));
    }

    @Test
    void pettahToJaffnaUsesCanonicalPettah() {
        RouteRepository routeRepository = mock(RouteRepository.class);
        when(routeRepository.findAll()).thenReturn(List.of(
                route("Pettah", "Jaffna"),
                route("Colombo", "Kandy")));
        AssistantService withGazetteer = new AssistantService(tripService, bookingService, props,
                new RestTemplateBuilder(), new ObjectMapper(), new CityGazetteer(routeRepository),
                null, null);
        stubSearch(trip(1L, "04:30", "12:00", "NORMAL", "SLTB", "1900.00", 50, 58));

        AssistantResponse res = withGazetteer.chat("bus from Pettah to Jaffna", null, Set.of());

        assertEquals("search", res.action().type());
        assertEquals("Pettah", res.action().data().get("from"));
        assertEquals("Jaffna", res.action().data().get("to"));
        assertFalse(res.citations().isEmpty());
    }

    @Test
    void expresswayFaqMentionsE001AndE003() {
        RouteRepository routeRepository = mock(RouteRepository.class);
        when(routeRepository.findAll()).thenReturn(List.of(
                route("Colombo", "Katunayake Airport"),
                route("Colombo", "Negombo")));
        when(routeRepository.findByRouteTypeOrderByFromCityAsc(Route.RouteType.EXPRESSWAY))
                .thenReturn(List.of(
                        Route.builder().id(1L).fromCity("Colombo").toCity("Katunayake Airport")
                                .routeType(Route.RouteType.EXPRESSWAY).expresswayCode("E003").build(),
                        Route.builder().id(2L).fromCity("Colombo").toCity("Negombo")
                                .routeType(Route.RouteType.EXPRESSWAY).expresswayCode("E003").build()));
        ScheduleRepository scheduleRepository = mock(ScheduleRepository.class);
        when(scheduleRepository.findByRouteId(anyLong())).thenReturn(List.of(new Schedule()));
        AssistantService withGazetteer = new AssistantService(tripService, bookingService, props,
                new RestTemplateBuilder(), new ObjectMapper(), new CityGazetteer(routeRepository),
                routeRepository, scheduleRepository);

        AssistantResponse res = withGazetteer.chat("expressway", null, Set.of());

        assertTrue(res.reply().contains("E001"));
        assertTrue(res.reply().contains("E003"));
        assertFalse(res.reply().contains("E002"));
        assertTrue(res.reply().contains("2 expressway routes"));
        assertTrue(res.reply().contains("2 scheduled services"));
        assertTrue(res.citations().stream().anyMatch(c -> "faq-factsheet".equals(c.source())
                && "expressway-services".equals(c.ref())));
    }

    private static Route route(String from, String to) {
        return Route.builder().fromCity(from).toCity(to).build();
    }

    private LocalDate capturedSearchDate() {
        ArgumentCaptor<LocalDate> captor = ArgumentCaptor.forClass(LocalDate.class);
        verify(tripService).search(eq("Colombo"), eq("Kandy"), captor.capture(), isNull(), isNull(), isNull(), isNull());
        return captor.getValue();
    }
}
