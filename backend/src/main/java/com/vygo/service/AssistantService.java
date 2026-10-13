package com.vygo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vygo.config.AppProperties;
import com.vygo.dto.assistant.AssistantAction;
import com.vygo.dto.assistant.AssistantResponse;
import com.vygo.dto.assistant.Citation;
import com.vygo.dto.booking.BookingResponse;
import com.vygo.dto.common.PageResponse;
import com.vygo.dto.operator.RouteResponseDto;
import com.vygo.dto.routetools.RouteToolDto;
import com.vygo.dto.search.SearchResponse;
import com.vygo.entity.Route;
import com.vygo.entity.RouteTool.RouteToolNetwork;
import com.vygo.repository.RouteRepository;
import com.vygo.repository.ScheduleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * VyGo's in-site AI assistant. A deterministic intent engine answers questions
 * and performs real actions (trip search, bookings) through the platform's own
 * services. When an LLM API key is configured it upgrades free-form answers with
 * a live model, falling back to the local engine on any error.
 */
@Service
public class AssistantService {

    private static final Logger log = LoggerFactory.getLogger(AssistantService.class);

    private static final String SYSTEM_PROMPT = """
            You are VyGo Assistant, the in-app travel helper for VyGo — a Sri Lankan online bus
            booking and fleet management platform. Users can search trips between Sri Lankan cities,
            pick exact seats on a bus layout, lock seats for 10 minutes while paying, pay via PayHere
            (cards), and board with a digital QR e-ticket. Cancellations are allowed up to 60 minutes
            before departure with a 5% fee. Expressway services run on E001 (Southern Expressway) and E003
            (Colombo–Katunayake Expressway). Operators
            manage buses, routes, schedules and reports; conductors do onboard booking and ticket
            validation.
            Answer briefly (2-4 sentences), in the user's language, and never invent fares,
            timings, operators or phone numbers — tell them to search in the app for exact
            numbers.
            """;

    private static final List<String> CITIES = List.of(
            "nuwara eliya", "anuradhapura", "trincomalee", "hambantota", "batticaloa",
            "vavuniya", "polonnaruwa", "kadawatha", "kaduwela", "aluthgama", "panadura",
            "makumbara", "kegalle", "colombo", "kandy", "galle", "jaffna", "negombo",
            "matara", "kurunegala", "ratnapura", "badulla", "kalutara", "gampaha",
            "mannar", "puttalam", "monaragala", "pettah", "kataragama", "ampara",
            "tangalle", "embilipitiya", "rakwana", "passara", "bibila", "siyambalanduwa",
            "matale", "maharagama", "middeniya", "walasmulla", "beliatta", "hakmana");

    private static final List<String> COMMON_SUGGESTIONS =
            List.of("Book a bus", "My bookings", "Refund policy", "What can you do?");

    private static final List<String> HELP_KEYWORDS =
            List.of("help", "what can you do", "what do you do", "commands", "capabilities", "how does this work");

    private static final List<String> CANCEL_KEYWORDS =
            List.of("cancel", "cancellation", "refund", "cancel my booking");

    private static final List<String> HOW_TO_BOOK_KEYWORDS =
            List.of("how to book", "how do i book", "how can i book", "how to reserve",
                    "book a ticket", "book tickets", "make a booking", "booking process", "steps to book");

    private static final List<String> ROUTES_KEYWORDS =
            List.of("routes", "route list", "where can i go", "destinations", "available routes");

    private static final List<String> ROUTE_TOOL_KEYWORDS =
            List.of("corridor", "timetable",
                    "who runs", "who operates", "which operators", "which operator",
                    "operators run", "operators operate", "operator runs", "operator operate",
                    "operates the", "operator for", "operator on", "operators on",
                    "contact", "hotline", "telephone", "phone", "call",
                    "number for", "numbers for", "contact number", "phone number",
                    "route number", "route numbers", "reach");

    private static final List<String> ROUTE_NUMBER_CONTEXT =
            List.of("details", "show me", "tell me", "normal", "ordinary", "expressway",
                    "timetable", "contact", "phone", "hotline", "telephone", "who",
                    "operator", "corridor");

    private static final List<String> EXPRESSWAY_KEYWORDS =
            List.of("expressway", "highway", "e001", "e003", "e01", "e03");

    private static final List<String> EXPRESSWAY_CONTEXT =
            List.of("corridor", "timetable", "contact", "phone", "hotline", "telephone",
                    "who runs", "who operates", "operator", "route number", "details",
                    "show me", "tell me", "number for");

    private static final Pattern ROUTE_NUMBER_PATTERN = Pattern.compile("\\broute\\s+(\\d{1,3})\\b");

    private static final Map<String, Integer> WEEKDAYS = Map.ofEntries(
            Map.entry("monday", 1), Map.entry("tuesday", 2), Map.entry("wednesday", 3),
            Map.entry("thursday", 4), Map.entry("friday", 5), Map.entry("saturday", 6),
            Map.entry("sunday", 7));

    private static final List<String> MONTHS = List.of(
            "january", "february", "march", "april", "may", "june", "july",
            "august", "september", "october", "november", "december");

    private static final Pattern IN_DAYS = Pattern.compile("in\\s+(\\d+)\\s+days?");
    private static final Pattern ISO_DATE = Pattern.compile("\\b(\\d{4})-(\\d{1,2})-(\\d{1,2})\\b");

    private static final long SESSION_TTL_MS = 10 * 60 * 1000;
    private static final int SESSION_MAX = 200;

    private final TripService tripService;
    private final BookingService bookingService;
    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;
    private final RestTemplate perovinRestTemplate;
    private final CityGazetteer cityGazetteer;
    private final RouteRepository routeRepository;
    private final ScheduleRepository scheduleRepository;
    private final RouteToolService routeToolService;

    private final Map<String, SessionEntry> sessions = Collections.synchronizedMap(
            new LinkedHashMap<>(16, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, SessionEntry> eldest) {
                    return size() > SESSION_MAX;
                }
            });

    public AssistantService(TripService tripService,
                            BookingService bookingService,
                            AppProperties appProperties,
                            RestTemplateBuilder builder,
                            ObjectMapper objectMapper) {
        this(tripService, bookingService, appProperties, builder, objectMapper, null, null, null, null);
    }

    public AssistantService(TripService tripService,
                            BookingService bookingService,
                            AppProperties appProperties,
                            RestTemplateBuilder builder,
                            ObjectMapper objectMapper,
                            CityGazetteer cityGazetteer,
                            RouteRepository routeRepository,
                            ScheduleRepository scheduleRepository) {
        this(tripService, bookingService, appProperties, builder, objectMapper,
                cityGazetteer, routeRepository, scheduleRepository, null);
    }

    @Autowired
    public AssistantService(TripService tripService,
                            BookingService bookingService,
                            AppProperties appProperties,
                            RestTemplateBuilder builder,
                            ObjectMapper objectMapper,
                            CityGazetteer cityGazetteer,
                            RouteRepository routeRepository,
                            ScheduleRepository scheduleRepository,
                            RouteToolService routeToolService) {
        this.tripService = tripService;
        this.bookingService = bookingService;
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
        this.cityGazetteer = cityGazetteer;
        this.routeRepository = routeRepository;
        this.scheduleRepository = scheduleRepository;
        this.routeToolService = routeToolService;
        this.restTemplate = builder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(20))
                .build();
        this.perovinRestTemplate = builder
                .setConnectTimeout(Duration.ofSeconds(5))
                .setReadTimeout(Duration.ofSeconds(120))
                .build();
    }

    public AssistantResponse chat(String message, Long userId, Set<String> roles) {
        return chat(message, userId, roles, null);
    }

    public AssistantResponse chat(String message, Long userId, Set<String> roles, String sessionId) {
        AssistantResponse local = respond(message, userId, roles, sessionId);
        Optional<String> perovin = perovinReply(message, sessionId);
        if (perovin.isPresent()) {
            return AssistantResponse.of(perovin.get(), local.suggestions(), local.action(), local.citations());
        }
        return local;
    }

    private AssistantResponse respond(String message, Long userId, Set<String> roles, String sessionId) {
        String lower = normalize(message);

        if (isGreeting(lower)) {
            return greeting();
        }
        if (hasAny(lower, HELP_KEYWORDS)) {
            return help();
        }
        if (hasAny(lower, CANCEL_KEYWORDS)) {
            return upgradeWithLlm(cancelInfo(), message, null);
        }
        if (hasAny(lower, HOW_TO_BOOK_KEYWORDS)) {
            if (extractCities(lower) != null) {
                return handleTrip(lower, analyze(message, sessionId), message);
            }
            return upgradeWithLlm(howToBook(), message, null);
        }
        if (isBookingsQuery(lower)) {
            return bookings(userId, roles);
        }

        TripContext ctx = analyze(message, sessionId);
        if (isRouteToolQuery(lower, ctx)) {
            AssistantResponse routeTool = routeTool(lower, ctx);
            if (routeTool != null) {
                return routeTool;
            }
        }
        if (ctx.hasPair()) {
            return handleTrip(lower, ctx, message);
        }
        if (hasAny(lower, ROUTES_KEYWORDS)) {
            return routes();
        }
        if (ctx.singleCity() != null || isTripQuery(lower) || isFollowUp(lower)) {
            return handleTrip(lower, ctx, message);
        }

        AssistantResponse faq = faq(lower);
        if (faq != null) {
            return upgradeWithLlm(faq, message, null);
        }
        return upgradeWithLlm(fallback(), message, null);
    }

    // ---------------------------------------------------------------- intents

    private AssistantResponse greeting() {
        return AssistantResponse.of(
                "Hi! I'm the VyGo Assistant. I can search trips, check your bookings, "
                        + "and answer questions about fares, refunds, payments and boarding. What can I help with?",
                List.of("Book a bus", "My bookings", "Refund policy", "What can you do?"),
                AssistantAction.none());
    }

    private AssistantResponse help() {
        return AssistantResponse.of(
                "Here's what I can do:\n"
                        + "• Find trips — try \"bus from Colombo to Kandy\"\n"
                        + "• Check your bookings — \"show my bookings\"\n"
                        + "• Answer questions — refunds, payments, QR e-tickets, expressway\n"
                        + "• Open pages — routes, alerts, operator dashboards",
                List.of("Book a bus", "My bookings", "Refund policy", "Routes"),
                AssistantAction.none());
    }

    private AssistantResponse cancelInfo() {
        int window = appProperties.getCancellationWindowMinutes();
        double feePct = appProperties.getCancellationFeePct();
        return AssistantResponse.of(
                "You can cancel a booking up to " + window + " minutes before departure from My Bookings. "
                        + "A " + formatFee(feePct) + "% cancellation fee applies and the rest is refunded. "
                        + "Once it's within the window or the trip has left, bookings can't be cancelled.",
                List.of("My bookings", "Payment methods", "Book a bus"),
                AssistantAction.none(),
                List.of(new Citation("Cancellation policy (" + window + " min / " + formatFee(feePct)
                        + "% fee, llms.txt)", "faq-factsheet", "cancellation-policy")));
    }

    private String formatFee(double feePct) {
        if (feePct == Math.floor(feePct)) {
            return String.valueOf((long) feePct);
        }
        return String.valueOf(feePct);
    }

    private AssistantResponse howToBook() {
        return AssistantResponse.of(
                "Booking is easy:\n1. Search a route and date\n2. Pick your exact seats on the bus map\n"
                        + "3. Enter your boarding point and pay via PayHere\n4. Get a QR e-ticket on your phone and board.",
                List.of("Book a bus", "Payment methods", "Refund policy"),
                AssistantAction.none());
    }

    private AssistantResponse bookings(Long userId, Set<String> roles) {
        if (userId == null) {
            return AssistantResponse.of(
                    "Sign in to see your bookings. Use the demo account nimal@vygo.lk (password password123).",
                    List.of("Go to login", "Book a bus"),
                    AssistantAction.navigate("/login"),
                    List.of(new Citation("Demo accounts (llms.txt)", "faq-factsheet", "demo-accounts")));
        }
        if (!roles.contains("ROLE_PASSENGER")) {
            return AssistantResponse.of(
                    "Personal bookings are available to passenger accounts. "
                            + "Your role is " + String.join(", ", roles) + " — head to your dashboard to get started.",
                    List.of("Go to my dashboard"),
                    AssistantAction.navigate("/"));
        }
        try {
            PageResponse<BookingResponse> page = bookingService.getMyBookings(userId, 0, 5);
            List<BookingResponse> list = page.content();
            if (list == null || list.isEmpty()) {
                return AssistantResponse.of(
                        "You don't have any bookings yet. Want me to find a trip for you?",
                        List.of("Book a bus", "Colombo to Kandy", "Refund policy"),
                        AssistantAction.none());
            }
            StringBuilder sb = new StringBuilder();
            sb.append("You have ").append(page.totalElements()).append(" booking")
                    .append(page.totalElements() == 1 ? "" : "s").append(":\n");
            List<Citation> citations = new ArrayList<>();
            for (BookingResponse b : list) {
                sb.append("• ").append(b.bookingRef()).append(" · ").append(b.status())
                        .append(" · LKR ").append(b.totalFare() == null ? "0" : b.totalFare()).append("\n");
                if (b.bookingRef() != null && !b.bookingRef().isBlank()) {
                    citations.add(new Citation(
                            b.bookingRef() + " · " + b.status() + " · LKR "
                                    + (b.totalFare() == null ? "0" : b.totalFare()),
                            "booking", b.bookingRef()));
                }
            }
            sb.append("Open My Bookings for details and your e-tickets.");
            return AssistantResponse.of(sb.toString(),
                    List.of("View my e-tickets", "Cancel a booking", "Book a new trip"),
                    AssistantAction.navigate("/bookings"),
                    citations);
        } catch (Exception e) {
            log.warn("Assistant bookings lookup failed: {}", e.getMessage());
            return AssistantResponse.of("I couldn't load your bookings right now — please try again.",
                    List.of("My bookings", "Book a bus"), AssistantAction.navigate("/bookings"));
        }
    }

    private AssistantResponse routes() {
        int count = -1;
        try {
            if (routeRepository != null) {
                count = Math.toIntExact(routeRepository.count());
            }
        } catch (Exception e) {
            log.warn("Assistant route count lookup failed: {}", e.getMessage());
        }
        if (count < 0) {
            try {
                List<RouteResponseDto> all = tripService.listRoutes(null, null, null);
                count = all == null ? 0 : all.size();
            } catch (Exception e) {
                log.warn("Assistant routes lookup failed: {}", e.getMessage());
                count = -1;
            }
        }
        String head = count >= 0
                ? "We serve " + count + " routes across Sri Lanka, including expressway services on E001 "
                        + "(Southern Expressway) and E003 (Colombo–Katunayake Expressway). "
                : "We serve routes across Sri Lanka, including expressway services on E001 "
                        + "(Southern Expressway) and E003 (Colombo–Katunayake Expressway). ";
        return AssistantResponse.of(
                head + "Open the Routes page to browse every route, boarding point and operator.",
                List.of("Open routes", "Book a bus", "My bookings"),
                AssistantAction.navigate("/routes"),
                List.of(new Citation("Route catalogue (llms.txt)", "route", "route-catalogue")));
    }

    // ------------------------------------------------------ route-tool intents

    /**
     * Decides whether the message is asking about live route-tool data (expressway corridors,
     * operator contacts, phone numbers, timetables) rather than a bookable trip. Detection is
     * intentionally narrow so plain trip queries ("bus from Colombo to Kandy"), the expressway
     * FAQ ("expressway"), and route-number trip queries ("Route 47 from Kandy to Nuwara Eliya")
     * keep their existing behavior.
     */
    private boolean isRouteToolQuery(String lower, TripContext ctx) {
        if (hasAny(lower, ROUTE_TOOL_KEYWORDS)) {
            return true;
        }
        if (ROUTE_NUMBER_PATTERN.matcher(lower).find() && hasAny(lower, ROUTE_NUMBER_CONTEXT)) {
            return true;
        }
        if (hasAny(lower, EXPRESSWAY_KEYWORDS)) {
            boolean hasCity = ctx != null && (ctx.hasPair() || ctx.singleCity() != null);
            if (hasCity || hasAny(lower, EXPRESSWAY_CONTEXT)) {
                return true;
            }
        }
        return false;
    }

    private AssistantResponse routeTool(String lower, TripContext ctx) {
        if (routeToolService == null) {
            return null;
        }
        try {
            List<RouteToolDto> matches = routeToolMatches(lower, ctx, routeToolNetwork(lower));
            if (matches == null || matches.isEmpty()) {
                return null;
            }
            List<RouteToolDto> shown = new ArrayList<>(matches.size() > 3 ? matches.subList(0, 3) : matches);
            RouteToolDto primary = shown.get(0);
            boolean bookable = shown.stream().anyMatch(d -> Boolean.TRUE.equals(d.hasBookableTrips()));
            AssistantAction action = AssistantAction.none();
            if (ctx != null && ctx.hasPair()) {
                action = AssistantAction.search(searchData(ctx.from(), ctx.to(), LocalDate.now(), null));
            }
            return AssistantResponse.of(routeToolReply(shown, ctx, bookable),
                    routeToolSuggestions(primary), action, routeToolCitations(shown));
        } catch (Exception e) {
            log.warn("Assistant route-tool lookup failed: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Queries the route-tool service with a handful of candidate queries, most specific first
     * (from+to, destination, origin, route number, expressway code, airport alias) and keeps the
     * first non-empty result set. This works around the service's single-string matching on
     * fromCity/toCity/corridor while keeping replies focused: a broad origin query is only tried
     * when the destination-specific ones come back empty.
     */
    private List<RouteToolDto> routeToolMatches(String lower, TripContext ctx, RouteToolNetwork network) {
        List<String> queries = routeToolQueries(lower, ctx);
        if (queries.isEmpty()) {
            queries = List.of("");
        }
        List<RouteToolDto> all = new ArrayList<>();
        Set<Long> seen = new HashSet<>();
        for (String q : queries) {
            for (RouteToolDto dto : routeToolQuery(q, network)) {
                if (dto.id() != null && seen.add(dto.id())) {
                    all.add(dto);
                }
            }
            if (!all.isEmpty()) {
                break;
            }
        }
        return all;
    }

    private List<RouteToolDto> routeToolQuery(String q, RouteToolNetwork network) {
        if (network != null) {
            return routeToolService.list(q, network);
        }
        List<RouteToolDto> all = new ArrayList<>();
        List<RouteToolDto> expressway = routeToolService.list(q, RouteToolNetwork.EXPRESSWAY);
        if (expressway != null) {
            all.addAll(expressway);
        }
        List<RouteToolDto> normal = routeToolService.list(q, RouteToolNetwork.NORMAL);
        if (normal != null) {
            all.addAll(normal);
        }
        return all;
    }

    private RouteToolNetwork routeToolNetwork(String lower) {
        if (hasAny(lower, List.of("expressway", "highway", "e001", "e003", "e01", "e03"))) {
            return RouteToolNetwork.EXPRESSWAY;
        }
        if (hasAny(lower, List.of("normal", "ordinary"))) {
            return RouteToolNetwork.NORMAL;
        }
        return null;
    }

    private List<String> routeToolQueries(String lower, TripContext ctx) {
        List<String> candidates = new ArrayList<>();
        if (ctx != null) {
            if (ctx.hasPair()) {
                candidates.add(ctx.from() + " " + ctx.to());
                candidates.add(ctx.to());
                candidates.add(ctx.from());
            } else if (ctx.singleCity() != null) {
                candidates.add(ctx.singleCity());
            }
        }
        Matcher routeNum = ROUTE_NUMBER_PATTERN.matcher(lower);
        if (routeNum.find()) {
            candidates.add(routeNum.group(1));
        }
        for (String code : List.of("e001", "e003", "e01", "e03")) {
            if (lower.contains(code)) {
                candidates.add(code);
                break;
            }
        }
        if (lower.contains("airport")) {
            candidates.add("katunayake");
            candidates.add("airport");
        }
        return candidates;
    }

    private String routeToolReply(List<RouteToolDto> shown, TripContext ctx, boolean bookable) {
        StringBuilder sb = new StringBuilder();
        if (shown.size() == 1) {
            sb.append("Here's what I found: ").append(routeToolLine(shown.get(0))).append(".");
        } else {
            sb.append("Here's what I found:\n");
            for (RouteToolDto dto : shown) {
                sb.append("• ").append(routeToolLine(dto)).append("\n");
            }
        }
        if (ctx != null && ctx.hasPair()) {
            sb.append(bookable
                    ? " This corridor has bookable trips — tap below to see them."
                    : " Tap below to search trips on this corridor.");
        }
        return sb.toString().trim();
    }

    private String routeToolLine(RouteToolDto dto) {
        StringBuilder sb = new StringBuilder(routeToolName(dto));
        if (dto.routeNumbers() != null && !dto.routeNumbers().isEmpty()) {
            sb.append(" (route ").append(String.join(", ", dto.routeNumbers())).append(")");
        }
        if (dto.operators() != null && !dto.operators().isEmpty()) {
            sb.append(" · run by ").append(String.join(", ", dto.operators()));
        }
        if (dto.phones() != null && !dto.phones().isEmpty()) {
            sb.append(" · ").append(String.join(", ", dto.phones()));
        }
        if (dto.notes() != null && !dto.notes().isBlank()) {
            sb.append(" · ").append(dto.notes());
        }
        return sb.toString();
    }

    private String routeToolName(RouteToolDto dto) {
        if (dto.corridor() != null && !dto.corridor().isBlank()) {
            return dto.corridor();
        }
        if (dto.fromCity() != null && dto.toCity() != null) {
            return dto.fromCity() + " → " + dto.toCity();
        }
        return dto.fromCity() != null ? dto.fromCity() : "This route";
    }

    private List<Citation> routeToolCitations(List<RouteToolDto> shown) {
        List<Citation> citations = new ArrayList<>();
        for (RouteToolDto dto : shown) {
            citations.add(new Citation(
                    routeToolLine(dto),
                    "route-tool",
                    dto.id() != null ? String.valueOf(dto.id()) : routeToolName(dto)));
        }
        return citations;
    }

    private List<String> routeToolSuggestions(RouteToolDto primary) {
        List<String> suggestions = new ArrayList<>();
        String name = routeToolName(primary);
        if (name != null && !name.isBlank()) {
            suggestions.add("Show " + name + " buses");
        }
        String firstRouteNumber = primary.routeNumbers() != null && !primary.routeNumbers().isEmpty()
                ? primary.routeNumbers().get(0) : null;
        if (firstRouteNumber != null && !firstRouteNumber.isBlank()) {
            suggestions.add("Route " + firstRouteNumber + " timetable");
        }
        suggestions.add("Expressway contact numbers");
        return suggestions;
    }

    // ------------------------------------------------------------ trip intents

    private enum IntentKind { PLAIN, FARE, CHEAPEST, SCHEDULE, AVAILABILITY }

    private AssistantResponse handleTrip(String lower, TripContext ctx, String message) {
        if (!ctx.hasPair()) {
            return clarifyRoute(ctx.singleCity());
        }
        IntentKind kind = detectIntent(lower);
        List<SearchResponse> results;
        try {
            results = tripService.search(ctx.from(), ctx.to(), ctx.date(),
                    null, ctx.busType(), null, null);
        } catch (Exception e) {
            log.warn("Assistant trip search failed: {}", e.getMessage());
            return AssistantResponse.of("The trip search hit a snag — please try searching directly.",
                    List.of("Colombo to Kandy", "Colombo to Galle"), AssistantAction.none());
        }
        AssistantResponse local;
        if (results == null || results.isEmpty()) {
            local = AssistantResponse.of(
                    "I couldn't find any trips for " + routeLabel(ctx) + ". "
                            + "Try another route or date — I can take you straight to the search.",
                    List.of("Colombo to Kandy", "Colombo to Galle", "Colombo to Jaffna"),
                    AssistantAction.search(searchData(ctx.from(), ctx.to(), ctx.date(), ctx.busType())));
        } else {
            local = switch (kind) {
                case FARE -> fareReply(ctx, results);
                case CHEAPEST -> cheapestReply(ctx, results);
                case SCHEDULE -> scheduleReply(ctx, results);
                case AVAILABILITY -> availabilityReply(ctx, results);
                case PLAIN -> plainReply(ctx, results);
            };
        }
        return upgradeWithLlm(local, message, resultsContext(results));
    }

    private IntentKind detectIntent(String lower) {
        if (hasAny(lower, List.of("cheapest", "cheap", "cheaper", "least expensive",
                "lowest fare", "best fare", "lowest price"))) {
            return IntentKind.CHEAPEST;
        }
        if (hasAny(lower, List.of("how much", "fare", "price", "cost"))) {
            return IntentKind.FARE;
        }
        if (hasAny(lower, List.of("what time", "departure", "departures", "schedule", "timing",
                "when does", "when do", "leave", "leaves", "leaving"))) {
            return IntentKind.SCHEDULE;
        }
        if (hasAny(lower, List.of("seats available", "available seats", "any seats", "seat availability",
                "is there space", "space available", "is there a seat", "availability"))) {
            return IntentKind.AVAILABILITY;
        }
        return IntentKind.PLAIN;
    }

    private AssistantResponse plainReply(TripContext ctx, List<SearchResponse> results) {
        StringBuilder sb = new StringBuilder();
        sb.append("I found ").append(results.size()).append(" trip").append(results.size() == 1 ? "" : "s")
                .append(" for ").append(routeLabel(ctx)).append(":\n");
        int shown = 0;
        for (SearchResponse r : results) {
            if (shown++ >= 3) {
                break;
            }
            sb.append("• ").append(r.departureTime()).append("–").append(r.arrivalTime())
                    .append(" · ").append(r.busType()).append(" · ").append(r.operator())
                    .append(" · LKR ").append(r.fare()).append(" · ").append(r.availableSeats()).append(" seats\n");
        }
        sb.append("Tap below to see all results and pick your seat.");
        return AssistantResponse.of(sb.toString(),
                List.of("Show me", "Refund policy", "Payment methods"),
                AssistantAction.search(searchData(ctx.from(), ctx.to(), ctx.date(), ctx.busType())),
                tripCitations(ctx, results, 3, true));
    }

    private AssistantResponse fareReply(TripContext ctx, List<SearchResponse> results) {
        SearchResponse best = cheapestOf(results);
        if (best == null) {
            return plainReply(ctx, results);
        }
        BigDecimal max = null;
        for (SearchResponse r : results) {
            if (r.fare() == null) {
                continue;
            }
            if (max == null || r.fare().compareTo(max) > 0) {
                max = r.fare();
            }
        }
        StringBuilder sb = new StringBuilder();
        sb.append("Fares for ").append(routeLabel(ctx)).append(" start at LKR ").append(best.fare())
                .append(" (").append(best.busType()).append(", ").append(best.operator()).append(", ")
                .append(best.departureTime()).append(")");
        if (max != null && max.compareTo(best.fare()) != 0) {
            sb.append(" and go up to LKR ").append(max).append(" across bus types");
        }
        sb.append(". Tap below for all options.");
        List<Citation> citations = new ArrayList<>();
        addTripCitation(citations, ctx, best, true);
        return AssistantResponse.of(sb.toString(),
                List.of("Show me", "Refund policy", "Payment methods"),
                AssistantAction.search(searchData(ctx.from(), ctx.to(), ctx.date(), ctx.busType())),
                citations);
    }

    private AssistantResponse cheapestReply(TripContext ctx, List<SearchResponse> results) {
        SearchResponse best = cheapestOf(results);
        if (best == null) {
            return plainReply(ctx, results);
        }
        String reply = "The cheapest bus for " + routeLabel(ctx) + " is LKR " + best.fare()
                + " — " + best.busType() + " by " + best.operator()
                + " leaving at " + best.departureTime() + " (arrives " + best.arrivalTime() + "). "
                + "Tap below to see it and book.";
        List<Citation> citations = new ArrayList<>();
        addTripCitation(citations, ctx, best, true);
        return AssistantResponse.of(reply,
                List.of("Show me", "Refund policy", "Payment methods"),
                AssistantAction.search(searchData(ctx.from(), ctx.to(), ctx.date(), ctx.busType())),
                citations);
    }

    private AssistantResponse scheduleReply(TripContext ctx, List<SearchResponse> results) {
        StringBuilder sb = new StringBuilder();
        sb.append("Departures for ").append(routeLabel(ctx)).append(":\n");
        int shown = 0;
        for (SearchResponse r : results) {
            if (shown++ >= 5) {
                break;
            }
            sb.append("• ").append(r.departureTime()).append(" (")
                    .append(r.busType()).append(", ").append(r.operator())
                    .append(", LKR ").append(r.fare()).append(")\n");
        }
        sb.append("Tap below for the full schedule.");
        return AssistantResponse.of(sb.toString(),
                List.of("Show me", "Refund policy", "Payment methods"),
                AssistantAction.search(searchData(ctx.from(), ctx.to(), ctx.date(), ctx.busType())),
                tripCitations(ctx, results, 5, true));
    }

    private AssistantResponse availabilityReply(TripContext ctx, List<SearchResponse> results) {
        StringBuilder sb = new StringBuilder();
        sb.append("Seat availability for ").append(routeLabel(ctx)).append(":\n");
        int shown = 0;
        for (SearchResponse r : results) {
            if (shown++ >= 3) {
                break;
            }
            sb.append("• ").append(r.departureTime()).append(" — ").append(r.availableSeats())
                    .append(" seats available (of ").append(r.seatsTotal()).append(")\n");
        }
        sb.append("Tap below to pick your seats.");
        return AssistantResponse.of(sb.toString(),
                List.of("Show me", "Refund policy", "Payment methods"),
                AssistantAction.search(searchData(ctx.from(), ctx.to(), ctx.date(), ctx.busType())),
                tripCitations(ctx, results, 3, false));
    }

    private SearchResponse cheapestOf(List<SearchResponse> results) {
        SearchResponse best = null;
        for (SearchResponse r : results) {
            if (r.fare() == null) {
                continue;
            }
            if (best == null || r.fare().compareTo(best.fare()) < 0) {
                best = r;
            }
        }
        return best;
    }

    private List<Citation> tripCitations(TripContext ctx, List<SearchResponse> results, int maxShown,
                                         boolean includeFareRules) {
        List<Citation> citations = new ArrayList<>();
        if (results == null) {
            return citations;
        }
        int shown = 0;
        for (SearchResponse r : results) {
            if (shown++ >= maxShown) {
                break;
            }
            addTripCitation(citations, ctx, r, includeFareRules);
        }
        return citations;
    }

    private void addTripCitation(List<Citation> citations, TripContext ctx, SearchResponse r,
                                 boolean includeFareRules) {
        if (r.tripId() != null) {
            citations.add(new Citation(
                    ctx.from() + "→" + ctx.to() + " · " + r.departureTime() + " · " + r.busType()
                            + (r.fare() != null ? " · LKR " + r.fare() : ""),
                    "trip-search", String.valueOf(r.tripId())));
        }
        if (includeFareRules && r.fare() != null) {
            String routeNumber = r.routeNumber() == null ? "" : r.routeNumber();
            String routeId = r.routeId() == null ? "" : String.valueOf(r.routeId());
            citations.add(new Citation(
                    "Fare rule " + routeNumber + "+" + r.busType(),
                    "fare-rule", "route" + routeId + "+" + r.busType()));
        }
    }

    private AssistantResponse clarifyRoute(String singleCity) {
        String reply;
        if (singleCity != null) {
            reply = "Which route are you travelling? I spotted " + title(singleCity)
                    + " — tell me the other end too, e.g. \"Colombo to Kandy\".";
        } else {
            reply = "Which route are you travelling? I can look up live trips — try \"Colombo to Kandy\" or \"Galle to Jaffna\".";
        }
        return AssistantResponse.of(reply,
                List.of("Colombo to Kandy", "Colombo to Galle", "Kandy to Galle"),
                AssistantAction.none());
    }

    // ------------------------------------------------------------ FAQ entries

    private AssistantResponse faq(String lower) {
        if (hasAny(lower, List.of("pay", "payment", "payhere", "card", "credit", "debit", "how do i pay"))) {
            return AssistantResponse.of(
                    "We take card payments through PayHere at checkout (sandbox mode in this demo). "
                            + "Your seats are held for 10 minutes while you pay, and the booking confirms the "
                            + "moment payment succeeds.",
                    List.of("Book a bus", "Refund policy", "QR e-tickets"),
                    AssistantAction.none(),
                    List.of(new Citation("PayHere sandbox (llms.txt)", "faq-factsheet", "payment-sandbox")));
        }
        if (hasAny(lower, List.of("board", "qr", "ticket", "e-ticket", "eticket", "scan"))) {
            return AssistantResponse.of(
                    "After payment your e-ticket is generated with a QR code. Show it to the conductor at "
                            + "boarding — you can pull it up any time from My Bookings.",
                    List.of("My bookings", "How to book", "Refund policy"),
                    AssistantAction.none(),
                    List.of(new Citation("QR e-ticket (llms.txt)", "faq-factsheet", "qr-e-ticket")));
        }
        if (hasAny(lower, List.of("seat", "lock", "select seat", "pick seat"))) {
            return AssistantResponse.of(
                    "You pick your exact seat on a live bus map. Seats you've chosen are locked for 10 minutes "
                            + "while you pay, so nobody else can grab them in the meantime.",
                    List.of("Book a bus", "Refund policy", "Payment methods"),
                    AssistantAction.none(),
                    List.of(new Citation("Seat lock 10 minutes (llms.txt)", "faq-factsheet", "seat-lock")));
        }
        if (hasAny(lower, List.of("expressway", "e001", "e003", "highway"))) {
            return expresswayFaq();
        }
        if (hasAny(lower, List.of("login", "log in", "sign in", "register", "sign up", "create account", "otp"))) {
            return AssistantResponse.of(
                    "You can log in with email or mobile. New users register in a minute, and mobile login "
                            + "supports OTP verification. Try the demo accounts on the login page.",
                    List.of("Go to login", "Book a bus"),
                    AssistantAction.navigate("/login"),
                    List.of(new Citation("Demo accounts (llms.txt)", "faq-factsheet", "demo-accounts")));
        }
        if (hasAny(lower, List.of("operator", "fleet", "own a bus", "register a bus", "sell tickets on vygo"))) {
            return AssistantResponse.of(
                    "Operators register on the platform, get approved by admins, then manage buses, routes, "
                            + "schedules and reports from their dashboard. They can also notify passengers of delays.",
                    List.of("Go to register", "My bookings"),
                    AssistantAction.navigate("/register"),
                    List.of(new Citation("Operator dashboard (llms.txt)", "faq-factsheet", "app-routes")));
        }
        if (hasAny(lower, List.of("conductor", "onboard", "on-board", "validate ticket"))) {
            return AssistantResponse.of(
                    "Conductors use the mobile panel for onboard seat booking, QR ticket validation and "
                            + "trip-end reconciliation. Log in as a conductor to see it.",
                    List.of("Go to login", "Book a bus"),
                    AssistantAction.navigate("/login"),
                    List.of(new Citation("Conductor panel (llms.txt)", "faq-factsheet", "app-routes")));
        }
        if (hasAny(lower, List.of("delay", "notification", "alert", "reminder", "get notified"))) {
            return AssistantResponse.of(
                    "You'll get alerts for trip delays and reminders before departure. Manage them from the "
                            + "Alerts page when you're signed in.",
                    List.of("Go to alerts", "My bookings", "Book a bus"),
                    AssistantAction.navigate("/notifications"),
                    List.of(new Citation("Alerts page (llms.txt)", "faq-factsheet", "app-routes")));
        }
        return null;
    }

    private AssistantResponse expresswayFaq() {
        int routeCount = expresswayRouteCount();
        long serviceCount = expresswayServiceCount();
        StringBuilder sb = new StringBuilder();
        sb.append("Yes — we run expressway services on E001 (Southern Expressway) and E003 "
                + "(Colombo–Katunayake Expressway)");
        if (routeCount >= 0) {
            sb.append(" (").append(routeCount).append(" expressway routes");
            if (serviceCount >= 0) {
                sb.append(", ").append(serviceCount).append(" scheduled services");
            }
            sb.append(")");
        }
        sb.append(" with faster timings and premium coaches. Filter by expressway on the search page to see them.");
        return AssistantResponse.of(
                sb.toString(),
                List.of("Book a bus", "Colombo to Galle", "Colombo to Matara"),
                AssistantAction.none(),
                List.of(new Citation("Expressway E001 + E003 (llms.txt)", "faq-factsheet", "expressway-services")));
    }

    private int expresswayRouteCount() {
        if (routeRepository == null) {
            return -1;
        }
        try {
            return routeRepository.findByRouteTypeOrderByFromCityAsc(Route.RouteType.EXPRESSWAY).size();
        } catch (Exception e) {
            log.warn("Assistant expressway route lookup failed: {}", e.getMessage());
            return -1;
        }
    }

    private long expresswayServiceCount() {
        if (scheduleRepository == null || routeRepository == null) {
            return -1;
        }
        try {
            List<Route> express = routeRepository.findByRouteTypeOrderByFromCityAsc(Route.RouteType.EXPRESSWAY);
            long count = 0;
            for (Route r : express) {
                count += scheduleRepository.findByRouteId(r.getId()).size();
            }
            return count;
        } catch (Exception e) {
            log.warn("Assistant expressway service lookup failed: {}", e.getMessage());
            return -1;
        }
    }

    private AssistantResponse fallback() {
        return AssistantResponse.of(
                "I'm not sure I caught that. Try asking for a trip (\"Colombo to Kandy\"), your bookings, "
                        + "or refunds and payments — or tap one of the shortcuts below.",
                COMMON_SUGGESTIONS, AssistantAction.none());
    }

    // ------------------------------------------------------ context analysis

    private TripContext analyze(String message, String sessionId) {
        String lower = normalize(message);
        LocalDate today = LocalDate.now();
        List<CityHit> hits = findCityHits(lower);
        CityPair pair = buildPair(lower, hits);
        Optional<LocalDate> parsedDate = parseDate(lower, today);
        String busType = parseBusType(lower).orElse(null);

        String from = null;
        String to = null;
        LocalDate memoryDate = null;
        if (pair != null) {
            from = pair.from();
            to = pair.to();
        } else if (hits.isEmpty() && isFollowUp(lower)) {
            SessionEntry mem = recall(sessionId);
            if (mem != null) {
                from = mem.from();
                to = mem.to();
                memoryDate = mem.date();
            }
        }
        LocalDate searchDate = parsedDate.orElse(memoryDate != null ? memoryDate : today);
        if (searchDate.isBefore(today)) {
            searchDate = today;
        }

        boolean hasPair = from != null && to != null && !from.equalsIgnoreCase(to);
        if (hasPair && sessionId != null && !sessionId.isBlank()) {
            remember(sessionId, from, to, searchDate);
        }
        String single = (hits.size() == 1 && pair == null) ? hits.get(0).name() : null;
        return new TripContext(from, to, searchDate, busType, single);
    }

    private Optional<LocalDate> parseDate(String lower, LocalDate today) {
        if (lower.contains("tomorrow")) {
            return Optional.of(today.plusDays(1));
        }
        if (lower.contains("tonight")) {
            return Optional.of(today);
        }
        if (lower.contains("today")) {
            return Optional.of(today);
        }
        Matcher days = IN_DAYS.matcher(lower);
        if (days.find()) {
            return Optional.of(today.plusDays(parseDayCount(days.group(1))));
        }
        if (lower.contains("next week")) {
            return Optional.of(today.plusDays(7));
        }
        if (lower.contains("weekend")) {
            return Optional.of(upcomingWeekend(today));
        }
        for (Map.Entry<String, Integer> e : WEEKDAYS.entrySet()) {
            if (lower.contains(e.getKey())) {
                boolean strict = hasAny(lower, List.of("next " + e.getKey(), "following " + e.getKey()));
                return Optional.of(nextWeekday(today, e.getValue(), strict));
            }
        }
        Matcher iso = ISO_DATE.matcher(lower);
        if (iso.find()) {
            try {
                return Optional.of(LocalDate.of(
                        Integer.parseInt(iso.group(1)),
                        Integer.parseInt(iso.group(2)),
                        Integer.parseInt(iso.group(3))));
            } catch (Exception ignored) {
                // fall through to month-name forms
            }
        }
        Optional<LocalDate> monthForm = parseMonthForm(lower, today);
        if (monthForm.isPresent()) {
            return monthForm;
        }
        return Optional.empty();
    }

    private int parseDayCount(String digits) {
        try {
            return Math.max(1, Integer.parseInt(digits.trim()));
        } catch (NumberFormatException e) {
            return 1;
        }
    }

    private LocalDate nextWeekday(LocalDate today, int target, boolean strict) {
        int todayDow = today.getDayOfWeek().getValue();
        int days = (target - todayDow + 7) % 7;
        if (days == 0 && strict) {
            days = 7;
        }
        return today.plusDays(days);
    }

    private LocalDate upcomingWeekend(LocalDate today) {
        int dow = today.getDayOfWeek().getValue();
        int days;
        if (dow == 6 || dow == 7) {
            days = 0;
        } else {
            days = (6 - dow + 7) % 7;
        }
        return today.plusDays(days);
    }

    private Optional<LocalDate> parseMonthForm(String lower, LocalDate today) {
        for (int i = 0; i < MONTHS.size(); i++) {
            String month = MONTHS.get(i);
            if (!lower.contains(month)) {
                continue;
            }
            Matcher dayBefore = Pattern.compile(
                    "(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?" + Pattern.quote(month) + "\\b").matcher(lower);
            if (dayBefore.find()) {
                try {
                    return Optional.of(LocalDate.of(today.getYear(), i + 1, Integer.parseInt(dayBefore.group(1))));
                } catch (Exception ignored) {
                    // invalid day for this month — keep scanning
                }
            }
            Matcher dayAfter = Pattern.compile(
                    "\\b" + Pattern.quote(month) + "\\s+(\\d{1,2})(?:st|nd|rd|th)?").matcher(lower);
            if (dayAfter.find()) {
                try {
                    return Optional.of(LocalDate.of(today.getYear(), i + 1, Integer.parseInt(dayAfter.group(1))));
                } catch (Exception ignored) {
                    // invalid day for this month — keep scanning
                }
            }
        }
        return Optional.empty();
    }

    private Optional<String> parseBusType(String lower) {
        if (hasAny(lower, List.of("semi luxury", "semi-luxury"))) {
            return Optional.of("SEMI_LUXURY");
        }
        if (hasAny(lower, List.of("luxury"))) {
            return Optional.of("LUXURY");
        }
        if (hasAny(lower, List.of("normal bus", "ordinary"))) {
            return Optional.of("NORMAL");
        }
        if (Pattern.compile("(^|\\W)ac($|\\W)").matcher(lower).find()) {
            return Optional.of("AC");
        }
        return Optional.empty();
    }

    private boolean isTripQuery(String lower) {
        if (hasAny(lower, List.of("bus", "trip", "travel", "journey", "ride", "search", "find",
                "available", "departure", "schedule", "fare", "price", "cost", "cheap",
                "how much", "seat", "from ", " to ", "leave", "leaves", "when does"))) {
            return true;
        }
        return hasDateKeyword(lower) || hasBusTypeKeyword(lower) || isFollowUp(lower);
    }

    private boolean isFollowUp(String lower) {
        if (hasAny(lower, List.of("again", "the ac", "fares", "show me", "the luxury", "semi luxury"))) {
            return true;
        }
        return hasDateKeyword(lower) || hasBusTypeKeyword(lower);
    }

    private boolean hasDateKeyword(String lower) {
        if (hasAny(lower, List.of("today", "tomorrow", "tonight", "weekend", "next week", "this week"))) {
            return true;
        }
        for (String day : WEEKDAYS.keySet()) {
            if (lower.contains(day)) {
                return true;
            }
        }
        return IN_DAYS.matcher(lower).find();
    }

    private boolean hasBusTypeKeyword(String lower) {
        return parseBusType(lower).isPresent();
    }

    // ------------------------------------------------------ city extraction

    private CityPair extractCities(String lower) {
        return buildPair(lower, findCityHits(lower));
    }

    private List<CityHit> findCityHits(String lower) {
        List<CityHit> hits = new ArrayList<>();
        if (cityGazetteer != null) {
            for (CityGazetteer.CityMatch m : cityGazetteer.findCityMatches(lower)) {
                hits.add(new CityHit(m.city(), m.start()));
                if (hits.size() >= 2) {
                    break;
                }
            }
        }
        if (hits.size() < 2) {
            for (CityHit h : fallbackCityHits(lower)) {
                boolean present = hits.stream().anyMatch(x -> x.name().equalsIgnoreCase(h.name()));
                if (!present) {
                    hits.add(h);
                }
                if (hits.size() >= 2) {
                    break;
                }
            }
        }
        hits.sort(Comparator.comparingInt(CityHit::start));
        if (hits.size() > 2) {
            hits = new ArrayList<>(hits.subList(0, 2));
        }
        return hits;
    }

    private List<CityHit> fallbackCityHits(String lower) {
        List<String> sorted = CITIES.stream()
                .sorted((a, b) -> Integer.compare(b.length(), a.length()))
                .toList();
        List<CityHit> found = new ArrayList<>();
        List<int[]> ranges = new ArrayList<>();
        for (String city : sorted) {
            int idx = indexOfWord(lower, city);
            if (idx < 0) {
                continue;
            }
            boolean inside = ranges.stream().anyMatch(r -> idx >= r[0] && idx < r[1]);
            if (inside) {
                continue;
            }
            found.add(new CityHit(city, idx));
            ranges.add(new int[]{idx, idx + city.length()});
            if (found.size() >= 2) {
                break;
            }
        }
        return found;
    }

    private int indexOfWord(String text, String word) {
        Matcher m = Pattern.compile("(^|\\W)" + Pattern.quote(word) + "($|\\W)").matcher(text);
        if (m.find()) {
            return m.start() + m.group(1).length();
        }
        return -1;
    }

    private CityPair buildPair(String lower, List<CityHit> hits) {
        if (hits.size() < 2) {
            return null;
        }
        List<CityHit> byPos = hits.stream()
                .sorted(Comparator.comparingInt(CityHit::start))
                .toList();
        int fromIdx = indexOfWord(lower, "from");
        int toIdx = indexOfWord(lower, "to");
        CityHit origin = null;
        CityHit dest = null;
        if (fromIdx >= 0 && toIdx >= 0) {
            for (CityHit h : byPos) {
                if (h.start() > fromIdx && origin == null) {
                    origin = h;
                }
            }
            for (CityHit h : byPos) {
                if (h.start() > toIdx && h != origin) {
                    dest = h;
                    break;
                }
            }
        } else if (fromIdx >= 0) {
            for (CityHit h : byPos) {
                if (h.start() > fromIdx && origin == null) {
                    origin = h;
                }
            }
            for (CityHit h : byPos) {
                if (h != origin) {
                    dest = h;
                    break;
                }
            }
        } else if (toIdx >= 0) {
            for (CityHit h : byPos) {
                if (h.start() < toIdx) {
                    origin = h;
                }
            }
            for (CityHit h : byPos) {
                if (h.start() > toIdx) {
                    dest = h;
                    break;
                }
            }
        } else {
            origin = byPos.get(0);
            dest = byPos.get(1);
        }
        if (origin == null || dest == null || origin.name().equalsIgnoreCase(dest.name())) {
            return null;
        }
        return new CityPair(canonical(origin.name()), canonical(dest.name()));
    }

    private String canonical(String city) {
        if (cityGazetteer != null) {
            return cityGazetteer.normalize(city).orElseGet(() -> title(city));
        }
        return title(city);
    }

    private String title(String city) {
        if (city == null || city.isEmpty()) {
            return city;
        }
        return city.substring(0, 1).toUpperCase(Locale.ROOT) + city.substring(1);
    }

    // ------------------------------------------------------- session memory

    private void remember(String sessionId, String from, String to, LocalDate date) {
        cleanupSessions();
        sessions.put(sessionId, new SessionEntry(from, to, date, System.currentTimeMillis()));
    }

    private SessionEntry recall(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return null;
        }
        cleanupSessions();
        synchronized (sessions) {
            SessionEntry e = sessions.get(sessionId);
            if (e == null) {
                return null;
            }
            long now = System.currentTimeMillis();
            if (now - e.updatedAt() > SESSION_TTL_MS) {
                sessions.remove(sessionId);
                return null;
            }
            sessions.put(sessionId, new SessionEntry(e.from(), e.to(), e.date(), now));
            return e;
        }
    }

    private void cleanupSessions() {
        long now = System.currentTimeMillis();
        synchronized (sessions) {
            sessions.entrySet().removeIf(entry -> now - entry.getValue().updatedAt() > SESSION_TTL_MS);
        }
    }

    // -------------------------------------------------- reply + LLM helpers

    private String routeLabel(TripContext ctx) {
        return ctx.from() + " → " + ctx.to() + " " + dateLabel(ctx.date());
    }

    private String dateLabel(LocalDate date) {
        LocalDate today = LocalDate.now();
        if (date.equals(today)) {
            return "today";
        }
        if (date.equals(today.plusDays(1))) {
            return "tomorrow";
        }
        return "on " + date;
    }

    private Map<String, Object> searchData(String from, String to, LocalDate date, String busType) {
        Map<String, Object> data = new HashMap<>();
        data.put("from", from);
        data.put("to", to);
        data.put("date", date.toString());
        if (busType != null && !busType.isBlank()) {
            data.put("busType", busType);
        }
        return data;
    }

    private AssistantResponse upgradeWithLlm(AssistantResponse local, String message, String tripContext) {
        Optional<String> llm = llmReply(message, tripContext);
        if (llm.isPresent()) {
            return AssistantResponse.of(llm.get(), local.suggestions(), local.action(), local.citations());
        }
        return local;
    }

    private Optional<String> perovinReply(String message, String sessionId) {
        AppProperties.Ai cfg = appProperties.getAi();
        if (cfg == null || cfg.getPerovinUrl() == null || cfg.getPerovinUrl().isBlank()) {
            return Optional.empty();
        }
        try {
            String base = cfg.getPerovinUrl().trim();
            String url = base.endsWith("/") ? base + "api/chat" : base + "/api/chat";
            Map<String, Object> body = new HashMap<>();
            body.put("message", message);
            body.put("sessionId", sessionId);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<String> resp = perovinRestTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                return Optional.empty();
            }
            String text = extractStreamedText(resp.getBody());
            if (text == null || text.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(text.trim());
        } catch (Exception e) {
            log.warn("Assistant Perovin call failed, using local reply: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private String extractStreamedText(String sse) {
        StringBuilder sb = new StringBuilder();
        for (String block : sse.split("\\r?\\n")) {
            if (!block.startsWith("data: ")) {
                continue;
            }
            String json = block.substring("data: ".length()).trim();
            if (json.isEmpty()) {
                continue;
            }
            try {
                JsonNode node = objectMapper.readTree(json);
                String type = node.path("type").asText("");
                if ("error".equals(type)) {
                    return "";
                }
                if ("done".equals(type) && node.hasNonNull("text")) {
                    sb.setLength(0);
                    sb.append(node.get("text").asText());
                } else if ("text_delta".equals(type) && node.hasNonNull("content")) {
                    sb.append(node.get("content").asText());
                }
            } catch (Exception ignored) {
                // skip malformed events
            }
        }
        return sb.toString().trim();
    }

    private Optional<String> llmReply(String message) {
        return llmReply(message, null);
    }

    private Optional<String> llmReply(String message, String tripContext) {
        AppProperties.Ai.Llm cfg = appProperties.getAi().getLlm();
        if (cfg == null || cfg.getApiKey() == null || cfg.getApiKey().isBlank()) {
            return Optional.empty();
        }
        try {
            String base = (cfg.getBaseUrl() == null || cfg.getBaseUrl().isBlank())
                    ? "https://api.openai.com/v1"
                    : cfg.getBaseUrl().trim();
            String url = base.endsWith("/") ? base + "chat/completions" : base + "/chat/completions";
            String system = SYSTEM_PROMPT;
            if (tripContext != null && !tripContext.isBlank()) {
                system = SYSTEM_PROMPT + "\n\nLive trip data for the route the user asked about "
                        + "(departure, arrival, bus type, operator, fare in LKR, available seats):\n"
                        + tripContext
                        + "\nNever invent numbers not in this list — use exactly these fares, times and seat counts.";
            }
            Map<String, Object> body = Map.of(
                    "model", (cfg.getModel() == null || cfg.getModel().isBlank()) ? "gpt-4o-mini" : cfg.getModel(),
                    "messages", List.of(
                            Map.of("role", "system", "content", system),
                            Map.of("role", "user", "content", message)),
                    "temperature", 0.4,
                    "max_tokens", 300);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(cfg.getApiKey());
            ResponseEntity<String> resp = restTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                return Optional.empty();
            }
            JsonNode root = objectMapper.readTree(resp.getBody());
            JsonNode content = root.path("choices").get(0).path("message").path("content");
            if (content != null && content.isTextual()) {
                String text = content.asText().trim();
                if (!text.isEmpty()) {
                    return Optional.of(text);
                }
            }
        } catch (Exception e) {
            log.warn("Assistant LLM call failed, using local reply: {}", e.getMessage());
        }
        return Optional.empty();
    }

    private String resultsContext(List<SearchResponse> results) {
        if (results == null || results.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        int shown = 0;
        for (SearchResponse r : results) {
            if (shown++ >= 5) {
                break;
            }
            sb.append("- departure ").append(r.departureTime())
                    .append(", arrival ").append(r.arrivalTime())
                    .append(", busType ").append(r.busType())
                    .append(", operator ").append(r.operator())
                    .append(", fare LKR ").append(r.fare())
                    .append(", seats ").append(r.availableSeats()).append("\n");
        }
        return sb.toString();
    }

    private boolean isGreeting(String lower) {
        if (lower.length() > 60) {
            return false;
        }
        return indexOfWord(lower, "hi") >= 0
                || indexOfWord(lower, "hello") >= 0
                || indexOfWord(lower, "hey") >= 0
                || indexOfWord(lower, "yo") >= 0
                || indexOfWord(lower, "hola") >= 0
                || indexOfWord(lower, "salam") >= 0
                || hasAny(lower, List.of("good morning", "good afternoon", "good evening", "howdy"));
    }

    private boolean isBookingsQuery(String lower) {
        return hasAny(lower, List.of("my booking", "my bookings", "my trip", "my trips",
                "booking status", "check my booking", "check bookings", "show my booking",
                "show bookings", "view my booking", "view bookings", "where is my booking"));
    }

    private boolean hasAny(String lower, List<String> keywords) {
        for (String k : keywords) {
            if (lower.contains(k)) {
                return true;
            }
        }
        return false;
    }

    private String normalize(String message) {
        return (message == null ? "" : message.trim()).toLowerCase(Locale.ROOT);
    }

    private record CityPair(String from, String to) {
    }

    private record CityHit(String name, int start) {
    }

    private record TripContext(String from, String to, LocalDate date, String busType, String singleCity) {
        boolean hasPair() {
            return from != null && to != null;
        }
    }

    private record SessionEntry(String from, String to, LocalDate date, long updatedAt) {
    }
}
