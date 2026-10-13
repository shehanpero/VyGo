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

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ApiSmokeTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @Order(1)
    void healthEndpointIsUp() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("vygo-backend"));
    }

    @Test
    @Order(2)
    void seededRoutesArePublic() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/routes"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        assertTrue(body.isArray());
        assertFalse(body.isEmpty(), "expected seeded routes");
    }

    @Test
    @Order(3)
    void adminCanLogin() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin@vygo.lk\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.roles[0]").value("ADMIN"));
    }

    @Test
    @Order(4)
    void busTypeFilterOnSearchDoesNotCrash() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/buses/search")
                        .param("from", "Colombo").param("to", "Kandy")
                        .param("date", LocalDate.now().toString())
                        .param("busType", "NORMAL"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode results = objectMapper.readTree(result.getResponse().getContentAsString());
        for (JsonNode trip : results) {
            assertEquals("NORMAL", trip.get("busType").asText());
        }
    }

    @Test
    @Order(5)
    void routesCombineQueryAndTypeFilters() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/routes")
                        .param("q", "Matara").param("type", "EXPRESSWAY"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode routes = objectMapper.readTree(result.getResponse().getContentAsString());
        assertFalse(routes.isEmpty(), "expected Matara expressway routes");
        for (JsonNode route : routes) {
            assertEquals("EXPRESSWAY", route.get("routeType").asText());
            boolean hit = route.get("fromCity").asText().toLowerCase().contains("matara")
                    || route.get("toCity").asText().toLowerCase().contains("matara")
                    || (route.hasNonNull("routeNumber")
                        && route.get("routeNumber").asText().toLowerCase().contains("matara"));
            assertTrue(hit, "route should match the query");
        }
    }

    @Test
    @Order(6)
    void fullBookingAndPaymentFlow() throws Exception {
        String token = loginPassenger();

        String date = LocalDate.now().toString();
        MvcResult search = mockMvc.perform(get("/api/v1/buses/search")
                        .param("from", "Colombo").param("to", "Kandy").param("date", date))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode results = objectMapper.readTree(search.getResponse().getContentAsString());
        assertTrue(results.isArray() && !results.isEmpty(), "expected search results");
        JsonNode first = results.get(0);
        long tripId = first.get("tripId").asLong();
        long boardId = first.get("boardingPoints").get(0).get("id").asLong();
        JsonNode dropoffs = first.get("dropoffPoints");
        long dropId = dropoffs.get(dropoffs.size() - 1).get("id").asLong();

        String lockBody = """
                {"tripId":%d,"seatNumbers":["31","32"],"boardingPointId":%d,"dropoffPointId":%d}
                """.formatted(tripId, boardId, dropId);
        MvcResult lock = mockMvc.perform(post("/api/v1/bookings/lock-seats")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(lockBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lockToken").isNotEmpty())
                .andExpect(jsonPath("$.totalFare").exists())
                .andReturn();
        JsonNode lockJson = objectMapper.readTree(lock.getResponse().getContentAsString());
        String lockToken = lockJson.get("lockToken").asText();

        String bookingBody = """
                {"lockToken":"%s","tripId":%d,"seatNumbers":["31","32"],"boardingPointId":%d,"dropoffPointId":%d}
                """.formatted(lockToken, tripId, boardId, dropId);
        MvcResult bookingRes = mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(bookingBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bookingRef").isNotEmpty())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn();
        JsonNode bookingJson = objectMapper.readTree(bookingRes.getResponse().getContentAsString());
        String bookingRef = bookingJson.get("bookingRef").asText();

        String initiateBody = """
                {"bookingRef":"%s","method":"CARD"}
                """.formatted(bookingRef);
        MvcResult initRes = mockMvc.perform(post("/api/v1/payments/initiate")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(initiateBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.txnId").isNotEmpty())
                .andExpect(jsonPath("$.sandbox").value(true))
                .andReturn();
        JsonNode initJson = objectMapper.readTree(initRes.getResponse().getContentAsString());
        String txnId = initJson.get("txnId").asText();

        String confirmBody = """
                {"txnId":"%s"}
                """.formatted(txnId);
        mockMvc.perform(post("/api/v1/payments/confirm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(confirmBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"));

        MvcResult bookingAfter = mockMvc.perform(get("/api/v1/bookings/" + bookingRef)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andReturn();
        JsonNode after = objectMapper.readTree(bookingAfter.getResponse().getContentAsString());
        assertEquals(2, after.get("tickets").size(), "expected two generated tickets");

        String firstTicketRef = after.get("tickets").get(0).get("ticketRef").asText();
        mockMvc.perform(get("/api/v1/tickets/" + firstTicketRef + "/qr")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(r -> assertEquals("image/png",
                        r.getResponse().getContentType()));
    }

    private String loginPassenger() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"nimal@vygo.lk\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.get("accessToken").asText();
    }
}
