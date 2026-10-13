package com.vygo.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.function.Predicate;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * API tests for the public read-only RouteTools feature at /api/v1/route-tools.
 *
 * Mirrors the style of ApiSmokeTest: @SpringBootTest + MockMvc against the in-memory H2
 * database seeded by DataInitializer (32 route tools). All tests are read-only.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class RouteToolsApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @Order(1)
    void listReturnsAllRouteToolsWithExpectedShape() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/route-tools"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode tools = objectMapper.readTree(result.getResponse().getContentAsString());
        assertTrue(tools.isArray(), "expected a JSON array");
        assertFalse(tools.isEmpty(), "expected seeded route tools");

        boolean hasExpressway = false;
        boolean hasNormal = false;
        for (JsonNode tool : tools) {
            assertTrue(tool.has("id") && tool.get("id").canConvertToLong(), "id required");
            assertTrue(tool.hasNonNull("corridor"), "corridor required");
            assertTrue(tool.hasNonNull("fromCity"), "fromCity required");
            assertTrue(tool.hasNonNull("toCity"), "toCity required");
            assertTrue(tool.hasNonNull("network"), "network required");
            String network = tool.get("network").asText();
            assertTrue("EXPRESSWAY".equals(network) || "NORMAL".equals(network),
                    "unexpected network " + network);
            if ("EXPRESSWAY".equals(network)) {
                hasExpressway = true;
            }
            if ("NORMAL".equals(network)) {
                hasNormal = true;
            }
            assertTrue(tool.has("operatorType"), "operatorType required");
            assertTrue(tool.get("operators").isArray(), "operators required");
            assertTrue(tool.get("phones").isArray(), "phones required");
            assertTrue(tool.get("routeNumbers").isArray(), "routeNumbers required");
        }
        assertTrue(hasExpressway, "seed should include EXPRESSWAY tools");
        assertTrue(hasNormal, "seed should include NORMAL tools");
    }

    @Test
    @Order(2)
    void queryKataragamaFiltersToMatchingCorridors() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/route-tools").param("q", "Kataragama"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode tools = objectMapper.readTree(result.getResponse().getContentAsString());
        assertFalse(tools.isEmpty(), "expected Kataragama route tools");
        for (JsonNode tool : tools) {
            assertTrue(tool.get("corridor").asText().toLowerCase().contains("kataragama"),
                    "corridor should mention Kataragama: " + tool.get("corridor"));
        }
    }

    @Test
    @Order(3)
    void queryAndNetworkFilterCombine() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/route-tools")
                        .param("q", "kataragama")
                        .param("network", "EXPRESSWAY"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode tools = objectMapper.readTree(result.getResponse().getContentAsString());
        assertFalse(tools.isEmpty(), "expected expressway Kataragama route tools");
        for (JsonNode tool : tools) {
            assertEquals("EXPRESSWAY", tool.get("network").asText());
            assertTrue(tool.get("corridor").asText().toLowerCase().contains("kataragama"),
                    "corridor should mention Kataragama: " + tool.get("corridor"));
        }
    }

    @Test
    @Order(4)
    void networkFilterReturnsOnlyExpressway() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/route-tools").param("network", "EXPRESSWAY"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode tools = objectMapper.readTree(result.getResponse().getContentAsString());
        assertFalse(tools.isEmpty(), "expected expressway route tools");
        for (JsonNode tool : tools) {
            assertEquals("EXPRESSWAY", tool.get("network").asText());
        }
    }

    @Test
    @Order(5)
    void invalidNetworkValueIsRejected() throws Exception {
        // "BADVALUE" cannot bind to RouteToolNetwork. Spring throws MethodArgumentTypeMismatchException,
        // which GlobalExceptionHandler maps to 400.
        mockMvc.perform(get("/api/v1/route-tools").param("network", "BADVALUE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    @Order(6)
    void getByIdReturnsMatchingCorridor() throws Exception {
        long id = kataragamaToolId();
        mockMvc.perform(get("/api/v1/route-tools/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.corridor", containsString("Kataragama")))
                .andExpect(jsonPath("$.network").value("EXPRESSWAY"))
                .andExpect(jsonPath("$.routeNumbers[0]").value("EX 2-6"))
                .andExpect(jsonPath("$.operators[0]").value("SLTB Kataragama"));
    }

    @Test
    @Order(7)
    void getNonExistentReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/route-tools/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Route tool not found"));
    }

    @Test
    @Order(8)
    void getNonNumericIdIsRejected() throws Exception {
        // Path variable "abc" cannot convert to Long -> MethodArgumentTypeMismatchException,
        // mapped to 400 by GlobalExceptionHandler.
        mockMvc.perform(get("/api/v1/route-tools/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    @Order(9)
    void timetableForKataragamaToolIsPopulated() throws Exception {
        long id = kataragamaToolId();
        MvcResult result = mockMvc.perform(get("/api/v1/route-tools/{id}/timetable", id))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode rows = objectMapper.readTree(result.getResponse().getContentAsString());
        assertTrue(rows.isArray() && !rows.isEmpty(), "expected a populated timetable");

        JsonNode ac0530 = null;
        for (JsonNode row : rows) {
            assertEquals("EX 2-6", row.get("routeNumber").asText(), "routeNumber required");
            assertTrue(row.get("operator").asText().length() > 0, "operator required");
            assertTrue(row.get("busType").asText().length() > 0, "busType required");
            assertTrue(row.get("departureTime").asText().matches("\\d{2}:\\d{2}"), "departureTime required");
            assertTrue(row.get("arrivalTime").asText().matches("\\d{2}:\\d{2}"), "arrivalTime required");
            assertTrue(row.get("fare").isNumber(), "fare required");
            JsonNode points = row.get("boardingPoints");
            assertTrue(points.isArray() && !points.isEmpty(), "boardingPoints required");
            if ("05:30".equals(row.get("departureTime").asText()) && "AC".equals(row.get("busType").asText())) {
                ac0530 = row;
            }
        }
        assertNotNull(ac0530, "expected the 05:30 AC row");
        assertEquals(0, new BigDecimal("2400.00").compareTo(ac0530.get("fare").decimalValue()),
                "05:30 AC fare should be 2400.00");
        assertEquals("Colombo Expressway Terminus",
                ac0530.get("boardingPoints").get(0).get("name").asText());
        assertEquals("05:30", ac0530.get("boardingPoints").get(0).get("time").asText());
    }

    @Test
    @Order(10)
    void timetableForNonBookableToolIsEmpty() throws Exception {
        long id = findToolId(t -> "Kamburupitiya".equals(t.get("toCity").asText()));
        JsonNode tool = fetchTool(id);
        assertFalse(tool.get("hasBookableTrips").asBoolean(),
                "Kamburupitiya tool should have hasBookableTrips=false");

        MvcResult result = mockMvc.perform(get("/api/v1/route-tools/{id}/timetable", id))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode rows = objectMapper.readTree(result.getResponse().getContentAsString());
        assertTrue(rows.isArray(), "expected a JSON array");
        assertTrue(rows.isEmpty(), "expected an empty timetable for a non-bookable tool");
    }

    @Test
    @Order(11)
    void routeToolsEndpointIsReadOnly() throws Exception {
        mockMvc.perform(post("/api/v1/route-tools")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @Order(12)
    void timetableRowsAreSortedByDepartureTime() throws Exception {
        long id = kataragamaToolId();
        MvcResult result = mockMvc.perform(get("/api/v1/route-tools/{id}/timetable", id))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode rows = objectMapper.readTree(result.getResponse().getContentAsString());
        assertTrue(rows.size() >= 2, "expected multiple timetable rows");
        String previous = "00:00";
        for (JsonNode row : rows) {
            String departure = row.get("departureTime").asText();
            assertTrue(departure.compareTo(previous) >= 0,
                    "rows must be sorted by departureTime: " + departure + " after " + previous);
            previous = departure;
        }
    }

    @Test
    @Order(13)
    void timetableForColomboKandyToolIsPopulated() throws Exception {
        long id = findToolId(t -> "Kandy".equals(t.get("toCity").asText())
                && "01".equals(firstRouteNumber(t)));
        MvcResult result = mockMvc.perform(get("/api/v1/route-tools/{id}/timetable", id))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode rows = objectMapper.readTree(result.getResponse().getContentAsString());
        assertFalse(rows.isEmpty(), "expected a populated Colombo-Kandy timetable");

        JsonNode ac0600 = null;
        for (JsonNode row : rows) {
            assertEquals("01", row.get("routeNumber").asText());
            if ("06:00".equals(row.get("departureTime").asText()) && "AC".equals(row.get("busType").asText())) {
                ac0600 = row;
            }
        }
        assertNotNull(ac0600, "expected the 06:00 AC row");
        assertEquals(0, new BigDecimal("1500.00").compareTo(ac0600.get("fare").decimalValue()),
                "06:00 AC fare should be 1500.00");
        assertEquals("Colombo Bastian Mawatha",
                ac0600.get("boardingPoints").get(0).get("name").asText());
        assertEquals("06:00", ac0600.get("boardingPoints").get(0).get("time").asText());
    }

    private JsonNode fetchTool(long id) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/route-tools/{id}", id))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private long kataragamaToolId() throws Exception {
        // The seeded "Colombo/Makumbura ↔ Kataragama" EXPRESSWAY tool is the only one whose
        // toCity is Kataragama and whose first routeNumber is EX 2-6.
        return findToolId(t -> "Kataragama".equals(t.get("toCity").asText())
                && "EX 2-6".equals(firstRouteNumber(t)));
    }

    private String firstRouteNumber(JsonNode tool) {
        JsonNode routeNumbers = tool.get("routeNumbers");
        if (routeNumbers == null || !routeNumbers.isArray() || routeNumbers.isEmpty()) {
            return null;
        }
        return routeNumbers.get(0).asText();
    }

    private long findToolId(Predicate<JsonNode> matcher) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/route-tools"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode tools = objectMapper.readTree(result.getResponse().getContentAsString());
        for (JsonNode tool : tools) {
            if (matcher.test(tool)) {
                return tool.get("id").asLong();
            }
        }
        throw new AssertionError("no route tool matched the predicate");
    }
}
