package com.vygo.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vygo.dto.booking.LockSeatsRequest;
import com.vygo.exception.ConflictException;
import com.vygo.service.SeatLockService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Hardening tests for the seat-lock race path:
 * <ul>
 *   <li>double-lock rejection is atomic (pessimistic row lock) and returns a
 *       structured 409 with conflicting seats + nearest alternatives;</li>
 *   <li>confirm-time re-check detects an expired DB-side hold and returns a
 *       typed 409 (SEAT_LOCK_EXPIRED) instead of creating a booking;</li>
 *   <li>truly concurrent lock attempts on the same seat have exactly one winner.</li>
 * </ul>
 * All tests use the EX 1-1 Makumbura -&gt; Matara AC trip (seeded fare 1900.00/seat)
 * on a day (today + 2) that the other suites never touch, so seat state is
 * deterministic. AC buses seat 2+2 per row (seats 1-4 row 1, 5-8 row 2, ...).
 */
@SpringBootTest
@AutoConfigureMockMvc
class SeatLockConflictTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private SeatLockService seatLockService;

    private static final BigDecimal AC_FARE_MAKUMBURA_MATARA = new BigDecimal("1900.00");

    @Test
    void secondUserLockingSameSeatGetsStructured409WithAlternatives() throws Exception {
        String tokenA = login("nimal@vygo.lk");
        String tokenB = registerAndLoginPassenger("conflict.b@vygo.lk", "0701112223");
        String date = LocalDate.now().plusDays(2).toString();
        JsonNode trip = findAcTrip(tokenA, date);
        long tripId = trip.get("tripId").asLong();
        long boardId = trip.get("boardingPoints").get(0).get("id").asLong();
        JsonNode dropoffs = trip.get("dropoffPoints");
        long dropId = dropoffs.get(dropoffs.size() - 1).get("id").asLong();

        // User A takes seat 5. User B asks for 5 + 6 -> must be a structured 409.
        lockSeats(tokenA, tripId, boardId, dropId, List.of("5"));

        MvcResult conflictRes = mockMvc.perform(post("/api/v1/bookings/lock-seats")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(tripId, boardId, dropId, List.of("5", "6"))))
                .andExpect(status().isConflict())
                // legacy ErrorResponse fields are preserved (additive contract)
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").isNotEmpty())
                .andExpect(jsonPath("$.path").value("/api/v1/bookings/lock-seats"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                // new conflict payload
                .andExpect(jsonPath("$.conflict.code").value("SEAT_UNAVAILABLE"))
                .andExpect(jsonPath("$.conflict.conflictingSeats").isArray())
                .andExpect(jsonPath("$.conflict.conflictingSeats[0]").value("5"))
                .andExpect(jsonPath("$.conflict.suggestedAlternatives").isArray())
                .andExpect(jsonPath("$.conflict.suggestedAlternatives[0].seatNumber").value("7"))
                .andExpect(jsonPath("$.conflict.suggestedAlternatives[0].row").value(2))
                .andExpect(jsonPath("$.conflict.suggestedAlternatives[0].side").value("RIGHT"))
                .andExpect(jsonPath("$.conflict.suggestedAlternatives[0].price").value(1900.00))
                .andExpect(jsonPath("$.conflict.suggestedAlternatives[1].seatNumber").value("8"))
                .andReturn();
        JsonNode conflict = objectMapper.readTree(conflictRes.getResponse().getContentAsString())
                .get("conflict");

        // Alternatives must never include the seats the user already asked for,
        // must carry row/side/price, and must actually be AVAILABLE on the trip.
        JsonNode seatMap = seatMap(tripId);
        for (JsonNode alt : conflict.get("suggestedAlternatives")) {
            String number = alt.get("seatNumber").asText();
            assertFalse(List.of("5", "6").contains(number),
                    "must not suggest a seat the user already requested: " + number);
            assertTrue(alt.get("row").isInt(), "alternative must expose a row");
            assertTrue(alt.get("side").asText().matches("LEFT|RIGHT"), "alternative must expose a side");
            assertTrue(alt.get("price").isNumber(), "alternative must expose a price");
            JsonNode seat = findSeat(seatMap, number);
            assertEquals("AVAILABLE", seat.get("status").asText(),
                    "suggested alternative " + number + " must still be available");
        }
    }

    @Test
    void confirmWithExpiredDbLockReturnsTyped409Conflict() throws Exception {
        String token = login("nimal@vygo.lk");
        String date = LocalDate.now().plusDays(2).toString();
        JsonNode trip = findAcTrip(token, date);
        long tripId = trip.get("tripId").asLong();
        long boardId = trip.get("boardingPoints").get(0).get("id").asLong();
        JsonNode dropoffs = trip.get("dropoffPoints");
        long dropId = dropoffs.get(dropoffs.size() - 1).get("id").asLong();

        JsonNode lock = lockSeats(token, tripId, boardId, dropId, List.of("7"));

        // Expire the DB-side hold while the in-memory token is still live: the
        // confirm-time re-check (under the same pessimistic row lock as the
        // booking write) must catch it and answer a typed 409, not a booking.
        int updated = jdbcTemplate.update(
                "UPDATE seat_inventory SET lock_expires_at = ? " +
                        "WHERE trip_id = ? AND seat_number = ? AND status = 'LOCKED'",
                Timestamp.valueOf(LocalDateTime.now().minusMinutes(30)), tripId, "7");
        assertEquals(1, updated, "expected the locked seat to be expired");

        mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingBody(lock.get("lockToken").asText(), tripId,
                                boardId, dropId, List.of("7"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Seat lock has expired"))
                .andExpect(jsonPath("$.conflict.code").value("SEAT_LOCK_EXPIRED"))
                .andExpect(jsonPath("$.conflict.conflictingSeats[0]").value("7"));

        // And no booking must have been created for the expired lock.
        long bookings = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM bookings WHERE trip_id = ? AND seats_count = 1 AND status = 'PENDING'",
                Long.class, tripId);
        assertEquals(0, bookings, "no booking may be created from an expired lock");
    }

    @Test
    void concurrentDoubleLockAllowsExactlyOneWinner() throws Exception {
        String date = LocalDate.now().plusDays(2).toString();
        String token = login("nimal@vygo.lk");
        JsonNode trip = findAcTrip(token, date);
        long tripId = trip.get("tripId").asLong();
        long boardId = trip.get("boardingPoints").get(0).get("id").asLong();
        JsonNode dropoffs = trip.get("dropoffPoints");
        long dropId = dropoffs.get(dropoffs.size() - 1).get("id").asLong();

        // Two independent users race to lock the same seat. Exactly one may win.
        LockSeatsRequest request = new LockSeatsRequest(tripId, List.of("9"), boardId, dropId);

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch go = new CountDownLatch(1);
        AtomicInteger success = new AtomicInteger();
        AtomicInteger conflicts = new AtomicInteger();
        List<Throwable> unexpected = new ArrayList<>();

        List<Future<?>> futures = new ArrayList<>();
        long[] userIds = {9001L, 9002L};
        for (long uid : userIds) {
            futures.add(executor.submit(() -> {
                ready.countDown();
                try {
                    go.await(10, TimeUnit.SECONDS);
                    seatLockService.lock(uid, request);
                    success.incrementAndGet();
                } catch (ConflictException e) {
                    conflicts.incrementAndGet();
                } catch (Throwable t) {
                    unexpected.add(t);
                }
            }));
        }
        try {
            assertTrue(ready.await(10, TimeUnit.SECONDS), "both racers must start");
            go.countDown();
            for (Future<?> future : futures) {
                future.get(15, TimeUnit.SECONDS);
            }
        } finally {
            executor.shutdownNow();
        }

        assertEquals(1, success.get(), "exactly one user must win the seat lock");
        assertEquals(1, conflicts.get(), "the loser must be rejected with a 409-class conflict");
        assertTrue(unexpected.isEmpty(), "no unexpected failures: " + unexpected);
    }

    // ---------- helpers ----------

    private String registerAndLoginPassenger(String email, String mobile) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"fullName\":\"Race Passenger\",\"email\":\"%s\",\"mobile\":\"%s\"," +
                                "\"password\":\"password123\",\"role\":\"PASSENGER\"}").formatted(email, mobile)))
                .andExpect(status().isCreated())
                .andReturn();
        return login(email);
    }

    private JsonNode findAcTrip(String token, String date) throws Exception {
        MvcResult search = mockMvc.perform(get("/api/v1/buses/search")
                        .param("from", "Makumbura").param("to", "Matara")
                        .param("date", date).param("busType", "AC"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode results = objectMapper.readTree(search.getResponse().getContentAsString());
        assertTrue(results.isArray() && !results.isEmpty(),
                "expected AC trips for Makumbura -> Matara on " + date);
        JsonNode ac = null;
        for (JsonNode r : results) {
            if ("AC".equals(r.get("busType").asText())) {
                ac = r;
                break;
            }
        }
        assertTrue(ac != null, "expected an AC trip in the search results");
        assertEquals(0, AC_FARE_MAKUMBURA_MATARA.compareTo(new BigDecimal(ac.get("fare").asText())));
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
                .andReturn();
        return objectMapper.readTree(lock.getResponse().getContentAsString());
    }

    private JsonNode seatMap(long tripId) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/trips/" + tripId + "/seats"))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode findSeat(JsonNode seatMap, String seatNumber) {
        for (JsonNode seat : seatMap.get("seats")) {
            if (seatNumber.equals(seat.get("seatNumber").asText())) {
                return seat;
            }
        }
        throw new AssertionError("seat " + seatNumber + " not found in seat map");
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

    private String bookingBody(String lockToken, long tripId, long boardId, long dropId,
                               List<String> seats) {
        return ("{\"lockToken\":\"%s\",\"tripId\":%d,\"seatNumbers\":%s," +
                "\"boardingPointId\":%d,\"dropoffPointId\":%d}")
                .formatted(lockToken, tripId, seatsJson(seats), boardId, dropId);
    }

    private String seatsJson(List<String> seats) {
        return seats.stream().map(s -> "\"" + s + "\"").toList().toString();
    }
}
