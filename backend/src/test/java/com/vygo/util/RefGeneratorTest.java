package com.vygo.util;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RefGeneratorTest {

    private final BookingRefGenerator bookingRefGenerator = new BookingRefGenerator();
    private final TicketRefGenerator ticketRefGenerator = new TicketRefGenerator();

    @Test
    void bookingRefMatchesExpectedFormat() {
        String expectedDate = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String ref = bookingRefGenerator.next();
        assertTrue(ref.matches("VY-" + expectedDate + "-[0-9A-F]{12}"));
    }

    @Test
    void ticketRefMatchesExpectedFormat() {
        String expectedDate = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String ref = ticketRefGenerator.next();
        assertTrue(ref.matches("TK-" + expectedDate + "-[0-9A-F]{12}"));
    }

    @Test
    void bookingRefsHaveHighEntropyAcrossManyCalls() {
        Set<String> refs = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            refs.add(bookingRefGenerator.next());
        }
        assertTrue(refs.size() >= 985, "expected near-unique refs but got " + refs.size());
    }

    @Test
    void ticketRefsHaveHighEntropyAcrossManyCalls() {
        Set<String> refs = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            refs.add(ticketRefGenerator.next());
        }
        assertTrue(refs.size() >= 985, "expected near-unique refs but got " + refs.size());
    }

    @Test
    void refsAreNeverBlank() {
        assertFalse(bookingRefGenerator.next().isBlank());
        assertFalse(ticketRefGenerator.next().isBlank());
    }
}
