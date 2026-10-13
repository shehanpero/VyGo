package com.vygo.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end booking + payment flow on an expressway route with an AC fare
 * (seeded EX 1-1 Makumbura -&gt; Matara, base fare 1900.00/seat) — the highest
 * scheduled fare in the seeded catalogue, matching the expressway seeding.
 */
@SpringBootTest
@AutoConfigureMockMvc
class BookingPaymentExpresswayTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static final BigDecimal AC_FARE_MAKUMBURA_MATARA = new BigDecimal("1900.00");

    @Test
    void expresswayAcBookingPricesTwoSeatsAtFareTimesSeats() throws Exception {
        String token = loginPassenger();
        String date = LocalDate.now().plusDays(1).toString();
        JsonNode trip = findAcTrip(token, date, "Makumbura", "Matara", AC_FARE_MAKUMBURA_MATARA);
        long tripId = trip.get("tripId").asLong();
        long boardId = trip.get("boardingPoints").get(0).get("id").asLong();
        JsonNode dropoffs = trip.get("dropoffPoints");
        long dropId = dropoffs.get(dropoffs.size() - 1).get("id").asLong();

        JsonNode lock = lockSeats(token, tripId, boardId, dropId, List.of("1", "2"));
        assertEquals(0, AC_FARE_MAKUMBURA_MATARA.multiply(new BigDecimal("2"))
                .compareTo(new BigDecimal(lock.get("totalFare").asText())), "totalFare must be fare x seats");

        JsonNode booking = createBooking(token, lock.get("lockToken").asText(),
                tripId, boardId, dropId, List.of("1", "2"));
        assertEquals("PENDING", booking.get("status").asText());
        assertEquals(2, booking.get("seatsCount").asInt());
        assertEquals(0, AC_FARE_MAKUMBURA_MATARA.multiply(new BigDecimal("2"))
                .compareTo(new BigDecimal(booking.get("totalFare").asText())));
        assertEquals("AC", booking.get("bus").get("type").asText());
        assertFalse(booking.get("bus").get("operator").asText().isBlank(),
                "booking must keep operator linkage for the new operators");
    }

    @Test
    void paymentSuccessTransitionsBookingToConfirmedAndReplaysIdempotently() throws Exception {
        String token = loginPassenger();
        String date = LocalDate.now().plusDays(1).toString();
        JsonNode trip = findAcTrip(token, date, "Makumbura", "Matara", AC_FARE_MAKUMBURA_MATARA);
        long tripId = trip.get("tripId").asLong();
        long boardId = trip.get("boardingPoints").get(0).get("id").asLong();
        JsonNode dropoffs = trip.get("dropoffPoints");
        long dropId = dropoffs.get(dropoffs.size() - 1).get("id").asLong();

        JsonNode lock = lockSeats(token, tripId, boardId, dropId, List.of("3", "4"));
        JsonNode booking = createBooking(token, lock.get("lockToken").asText(),
                tripId, boardId, dropId, List.of("3", "4"));
        String bookingRef = booking.get("bookingRef").asText();

        JsonNode init = initiatePayment(token, bookingRef);
        assertEquals(0, AC_FARE_MAKUMBURA_MATARA.multiply(new BigDecimal("2"))
                .compareTo(new BigDecimal(init.get("amount").asText())), "gateway amount must match booking total");
        String txnId = init.get("txnId").asText();

        confirmPayment(token, txnId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"));

        // A replayed webhook/callback must be a no-op, not an error.
        confirmPayment(token, txnId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"));

        MvcResult bookingAfter = mockMvc.perform(get("/api/v1/bookings/" + bookingRef)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andReturn();
        JsonNode after = objectMapper.readTree(bookingAfter.getResponse().getContentAsString());
        assertEquals(2, after.get("tickets").size(), "expected two generated tickets");
    }

    @Test
    void cancelRefundsHighFareBookingAfterFee() throws Exception {
        String token = loginPassenger();
        String date = LocalDate.now().plusDays(1).toString();
        JsonNode trip = findAcTrip(token, date, "Makumbura", "Matara", AC_FARE_MAKUMBURA_MATARA);
        long tripId = trip.get("tripId").asLong();
        long boardId = trip.get("boardingPoints").get(0).get("id").asLong();
        JsonNode dropoffs = trip.get("dropoffPoints");
        long dropId = dropoffs.get(dropoffs.size() - 1).get("id").asLong();

        JsonNode lock = lockSeats(token, tripId, boardId, dropId, List.of("9", "10"));
        JsonNode booking = createBooking(token, lock.get("lockToken").asText(),
                tripId, boardId, dropId, List.of("9", "10"));
        String bookingRef = booking.get("bookingRef").asText();

        JsonNode init = initiatePayment(token, bookingRef);
        confirmPayment(token, init.get("txnId").asText()).andExpect(status().isOk());

        // total 3800.00; 5% cancellation fee = 190.00; refund = 3610.00
        MvcResult cancelRes = mockMvc.perform(post("/api/v1/bookings/" + bookingRef + "/cancel")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"travel plans changed\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andReturn();
        JsonNode cancelled = objectMapper.readTree(cancelRes.getResponse().getContentAsString());
        assertTrue(cancelled.hasNonNull("refund"), "expected a refund record for a paid booking");
        assertEquals(0, new BigDecimal("3610.00").compareTo(new BigDecimal(cancelled.get("refund").get("amount").asText())));
        assertEquals(0, new BigDecimal("190.00").compareTo(new BigDecimal(cancelled.get("refund").get("fee").asText())));
    }

    @Test
    void cancellingUnpaidPendingBookingCreatesNoRefundRecord() throws Exception {
        String token = loginPassenger();
        String date = LocalDate.now().plusDays(1).toString();
        JsonNode trip = findAcTrip(token, date, "Makumbura", "Matara", AC_FARE_MAKUMBURA_MATARA);
        long tripId = trip.get("tripId").asLong();
        long boardId = trip.get("boardingPoints").get(0).get("id").asLong();
        JsonNode dropoffs = trip.get("dropoffPoints");
        long dropId = dropoffs.get(dropoffs.size() - 1).get("id").asLong();

        JsonNode lock = lockSeats(token, tripId, boardId, dropId, List.of("5", "6"));
        JsonNode booking = createBooking(token, lock.get("lockToken").asText(),
                tripId, boardId, dropId, List.of("5", "6"));
        String bookingRef = booking.get("bookingRef").asText();

        // A PENDING booking with a payment initiated but never paid, then cancelled.
        JsonNode init = initiatePayment(token, bookingRef);
        MvcResult cancelRes = mockMvc.perform(post("/api/v1/bookings/" + bookingRef + "/cancel")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"changed mind\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andReturn();
        JsonNode cancelled = objectMapper.readTree(cancelRes.getResponse().getContentAsString());
        assertTrue(!cancelled.has("refund") || cancelled.get("refund").isNull(),
                "no refund record when money never moved");

        // And the stale sandbox page cannot resurrect the cancelled booking.
        mockMvc.perform(post("/api/v1/payments/sandbox/" + init.get("txnId").asText() + "/confirm"))
                .andExpect(status().isConflict());
    }

    @Test
    void expiredSeatLockIsReleasedAndSeatsBecomeAvailable() throws Exception {
        String token = loginPassenger();
        String date = LocalDate.now().plusDays(1).toString();
        JsonNode trip = findAcTrip(token, date, "Makumbura", "Matara", AC_FARE_MAKUMBURA_MATARA);
        long tripId = trip.get("tripId").asLong();
        long boardId = trip.get("boardingPoints").get(0).get("id").asLong();
        JsonNode dropoffs = trip.get("dropoffPoints");
        long dropId = dropoffs.get(dropoffs.size() - 1).get("id").asLong();

        JsonNode firstLock = lockSeats(token, tripId, boardId, dropId, List.of("7", "8"));

        // Simulate the 10-minute hold elapsing at the DB layer.
        int updated = jdbcTemplate.update(
                "UPDATE seat_inventory SET lock_expires_at = ? " +
                        "WHERE trip_id = ? AND seat_number IN (?, ?) AND status = 'LOCKED'",
                Timestamp.valueOf(LocalDateTime.now().minusMinutes(30)), tripId, "7", "8");
        assertEquals(2, updated, "expected both locked seats to be expired");

        // Locking again triggers releaseExpiredLocks, so the same seats are reusable.
        JsonNode secondLock = lockSeats(token, tripId, boardId, dropId, List.of("7", "8"));
        assertNotEquals(firstLock.get("lockToken").asText(), secondLock.get("lockToken").asText(),
                "a fresh lock token must be issued after expiry");
        assertEquals(0, AC_FARE_MAKUMBURA_MATARA.multiply(new BigDecimal("2"))
                .compareTo(new BigDecimal(secondLock.get("totalFare").asText())));
    }

    // ---------- helpers ----------

    private JsonNode findAcTrip(String token, String date, String from, String to,
                                BigDecimal expectedFare) throws Exception {
        MvcResult search = mockMvc.perform(get("/api/v1/buses/search")
                        .param("from", from).param("to", to)
                        .param("date", date).param("busType", "AC"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode results = objectMapper.readTree(search.getResponse().getContentAsString());
        assertTrue(results.isArray() && !results.isEmpty(),
                "expected AC trips for " + from + " -> " + to);
        JsonNode ac = null;
        for (JsonNode r : results) {
            if ("AC".equals(r.get("busType").asText())) {
                ac = r;
                break;
            }
        }
        assertTrue(ac != null, "expected an AC trip in the search results");
        assertFalse(ac.get("boardingPoints").isEmpty(), "expressway route must expose boarding points");
        assertEquals(0, expectedFare.compareTo(new BigDecimal(ac.get("fare").asText())),
                "fare must come from the FareRule for route + AC bus type");
        return ac;
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

    private JsonNode initiatePayment(String token, String bookingRef) throws Exception {
        MvcResult initRes = mockMvc.perform(post("/api/v1/payments/initiate")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingRef\":\"%s\",\"method\":\"CARD\"}".formatted(bookingRef)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.txnId").isNotEmpty())
                .andExpect(jsonPath("$.sandbox").value(true))
                .andReturn();
        return objectMapper.readTree(initRes.getResponse().getContentAsString());
    }

    private ResultActions confirmPayment(String token, String txnId) throws Exception {
        return mockMvc.perform(post("/api/v1/payments/confirm")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"txnId\":\"%s\"}".formatted(txnId)));
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

    private String body(long tripId, long boardId, long dropId, List<String> seats) {
        return "{\"tripId\":%d,\"seatNumbers\":%s,\"boardingPointId\":%d,\"dropoffPointId\":%d}"
                .formatted(tripId, seatsJson(seats), boardId, dropId);
    }

    private String seatsJson(List<String> seats) {
        return seats.stream().map(s -> "\"" + s + "\"").toList().toString();
    }
}
