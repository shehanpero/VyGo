package com.vygo.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vygo.entity.Bus.BusType;
import com.vygo.util.ServiceClass;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Fleet Variant Upgrade: the server decides a trip's {@code serviceClass}
 * ("NORMAL" | "EXPRESS") from the bus type and exposes it on both the search
 * response and the seat map. The row layout (2+3 vs 2+2) must come from the
 * same shared helper ({@link ServiceClass}) so the DTO derivation and the
 * seat-lock alternatives can never drift.
 * <p>
 * The NORMAL fixture is the Colombo -&gt; Kandy 11:30 Ashok Leyland Viking
 * (route 01, 58 seats, 2+3 five-across, fare 650.00/seat) on a day (today + 3)
 * that the other suites never touch; the EXPRESS fixtures are the seeded
 * AC/LUXURY/SEMI_LUXURY trips on the same demo routes.
 */
@SpringBootTest
@AutoConfigureMockMvc
class FleetVariantTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void normalTripCarriesServiceClassNormalInSearchAndSeatMap() throws Exception {
        String date = LocalDate.now().plusDays(3).toString();
        JsonNode trip = findTrip("Colombo", "Kandy", date, "NORMAL");

        assertEquals("NORMAL", trip.get("busType").asText());
        assertEquals("NORMAL", trip.get("serviceClass").asText(),
                "a NORMAL bus trip must be server-assigned serviceClass NORMAL");
        assertEquals("Ashok Leyland Viking", trip.get("model").asText(),
                "search must label the vehicle with the bus model");
        assertEquals("ashok_leyland_viking", trip.get("vehicleModel").asText(),
                "search must expose the frontend fleetVariants id for the Viking");

        JsonNode seatMap = seatMap(trip.get("tripId").asLong());
        assertEquals("NORMAL", seatMap.get("serviceClass").asText(),
                "the NORMAL trip seat map must carry serviceClass NORMAL");
        assertEquals("NORMAL", seatMap.get("busType").asText());
        assertEquals("ashok_leyland_viking", seatMap.get("vehicleModel").asText(),
                "the NORMAL seat map must expose the frontend fleetVariants id");
        assertEquals(List.of(42, 44, 49, 54, 58), ints(seatMap.get("allowedSeatCounts")),
                "the NORMAL Viking must expose its operator-configurable seat set");
        assertEquals(58, seatMap.get("capacity").asInt(), "NORMAL Viking capacity must stay 58");
        assertEquals(58, seatMap.get("seats").size(), "a 58-seat NORMAL bus must materialize 58 seats");
        assertEquals(List.of("Water"), amenities(seatMap),
                "the NORMAL Viking only carries water - the HUD must not invent extras");
    }

    @Test
    void expressBusTypesCarryServiceClassExpress() throws Exception {
        String date = LocalDate.now().plusDays(3).toString();

        // AC on Colombo-Kandy (route 01, 6:00 Kia Granbird).
        JsonNode ac = findTrip("Colombo", "Kandy", date, "AC");
        assertExpress(ac, "AC");

        // LUXURY on Colombo-Kandy (route 01, 14:30 Scania K410).
        JsonNode luxury = findTrip("Colombo", "Kandy", date, "LUXURY");
        assertExpress(luxury, "LUXURY");

        // SEMI_LUXURY on Colombo-Galle (route 02, 8:00 Yutong C12 Pro).
        JsonNode semi = findTrip("Colombo", "Galle", date, "SEMI_LUXURY");
        assertExpress(semi, "SEMI_LUXURY");
    }

    @Test
    void layoutHelperDerivesLeftSeatsPerServiceClass() {
        assertEquals(ServiceClass.NORMAL, ServiceClass.from(BusType.NORMAL));
        assertEquals(ServiceClass.EXPRESS, ServiceClass.from(BusType.SEMI_LUXURY));
        assertEquals(ServiceClass.EXPRESS, ServiceClass.from(BusType.LUXURY));
        assertEquals(ServiceClass.EXPRESS, ServiceClass.from(BusType.AC));

        // Single source of truth for the 2+3 vs 2+2 layout:
        assertEquals(3, ServiceClass.NORMAL.leftSeats(), "NORMAL seats 2+3 (left = 3)");
        assertEquals(2, ServiceClass.EXPRESS.leftSeats(), "EXPRESS seats 2+2 (left = 2)");
        assertEquals(5, ServiceClass.NORMAL.seatsPerRow());
        assertEquals(4, ServiceClass.EXPRESS.seatsPerRow());
    }

    @Test
    void fiveAcrossNormalBusMiddleSeatCanBeLockedAndConfirmed() throws Exception {
        String token = login("nimal@vygo.lk");
        String date = LocalDate.now().plusDays(3).toString();
        JsonNode trip = findTrip("Colombo", "Kandy", date, "NORMAL");
        long tripId = trip.get("tripId").asLong();
        long boardId = trip.get("boardingPoints").get(0).get("id").asLong();
        JsonNode dropoffs = trip.get("dropoffPoints");
        long dropId = dropoffs.get(dropoffs.size() - 1).get("id").asLong();

        // On a 2+3 five-across NORMAL bus, seat 3 is the middle seat of the
        // 3-across left block (left side seats 1,2,3 | right side seats 4,5).
        // Locking it end-to-end proves the NORMAL fleet variant is bookable.
        JsonNode lock = lockSeats(token, tripId, boardId, dropId, List.of("3"));
        assertEquals(0, new BigDecimal("650.00").compareTo(new BigDecimal(lock.get("totalFare").asText())),
                "route 01 NORMAL fare is 650.00/seat");

        JsonNode booking = createBooking(token, lock.get("lockToken").asText(),
                tripId, boardId, dropId, List.of("3"));
        assertEquals("PENDING", booking.get("status").asText());
        assertEquals(1, booking.get("seatsCount").asInt());
        assertEquals("3", booking.get("seatNumbers").get(0).asText(),
                "the 3rd seat of the 3-across side must be confirmed on the NORMAL bus");
        assertEquals("NORMAL", booking.get("bus").get("type").asText());
    }

    // ---------- helpers ----------

    private void assertExpress(JsonNode trip, String busType) throws Exception {
        assertEquals(busType, trip.get("busType").asText());
        assertEquals("EXPRESS", trip.get("serviceClass").asText(),
                busType + " bus trips must be server-assigned serviceClass EXPRESS");
        assertEquals("Yutong C12 Pro", trip.get("model").asText(),
                busType + " Express coaches must carry the Yutong C12 Pro model");
        assertEquals("yutong_c12_pro", trip.get("vehicleModel").asText(),
                busType + " Express trips must expose the frontend fleetVariants id");

        JsonNode seatMap = seatMap(trip.get("tripId").asLong());
        assertEquals("EXPRESS", seatMap.get("serviceClass").asText(),
                "the " + busType + " trip seat map must carry serviceClass EXPRESS");
        assertEquals("yutong_c12_pro", seatMap.get("vehicleModel").asText(),
                "the " + busType + " seat map must expose the frontend fleetVariants id");
        assertEquals(List.of(51, 52, 53), ints(seatMap.get("allowedSeatCounts")),
                "the " + busType + " Yutong C12 Pro must expose its 51-53 seat set");
        assertTrue(!amenities(seatMap).isEmpty(),
                "the " + busType + " Express coach carries a real amenity kit - the HUD must render it");
    }

    private static List<Integer> ints(JsonNode arr) {
        List<Integer> result = new ArrayList<>();
        arr.forEach(n -> result.add(n.asInt()));
        return result;
    }

    private static List<String> amenities(JsonNode seatMap) {
        JsonNode arr = seatMap.get("amenities");
        if (arr == null || !arr.isArray()) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        arr.forEach(n -> result.add(n.asText()));
        return result;
    }

    private JsonNode findTrip(String from, String to, String date, String busType) throws Exception {
        MvcResult search = mockMvc.perform(get("/api/v1/buses/search")
                        .param("from", from).param("to", to)
                        .param("date", date).param("busType", busType))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode results = objectMapper.readTree(search.getResponse().getContentAsString());
        assertTrue(results.isArray() && !results.isEmpty(),
                "expected " + busType + " trips for " + from + " -> " + to + " on " + date);
        for (JsonNode r : results) {
            if (busType.equals(r.get("busType").asText())) {
                // All fixtures target the classic intercity route 01; the multi-route
                // search also surfaces expressway corridors (e.g. EX 2-1) between the
                // same cities, so match the fixture's route explicitly.
                if ("01".equals(r.get("routeNumber").asText())) {
                    return r;
                }
            }
        }
        for (JsonNode r : results) {
            if (busType.equals(r.get("busType").asText())) {
                return r;
            }
        }
        throw new AssertionError("no " + busType + " trip in the search results");
    }

    private JsonNode lockSeats(String token, long tripId, long boardId, long dropId,
                               List<String> seats) throws Exception {
        MvcResult lock = mockMvc.perform(post("/api/v1/bookings/lock-seats")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(tripId, boardId, dropId, seats)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lockToken").isNotEmpty())
                .andExpect(jsonPath("$.totalFare").exists())
                .andReturn();
        return objectMapper.readTree(lock.getResponse().getContentAsString());
    }

    private JsonNode createBooking(String token, String lockToken, long tripId, long boardId,
                                   long dropId, List<String> seats) throws Exception {
        MvcResult bookingRes = mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"lockToken\":\"%s\",\"tripId\":%d,\"seatNumbers\":%s," +
                                "\"boardingPointId\":%d,\"dropoffPointId\":%d}")
                                .formatted(lockToken, tripId, seatsJson(seats), boardId, dropId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bookingRef").isNotEmpty())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn();
        return objectMapper.readTree(bookingRes.getResponse().getContentAsString());
    }

    private JsonNode seatMap(long tripId) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/trips/" + tripId + "/seats"))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String login(String username) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"username\":\"%s\",\"password\":\"password123\"}")
                                .formatted(username)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.get("accessToken").asText();
    }

    private String body(long tripId, long boardId, long dropId, List<String> seats) {
        return "{\"tripId\":%d,\"seatNumbers\":%s,\"boardingPointId\":%d,\"dropoffPointId\":%d}"
                .formatted(tripId, seatsJson(seats), boardId, dropId);
    }

    private String seatsJson(List<String> seats) {
        return seats.stream().map(s -> "\"" + s + "\"").toList().toString();
    }
}
