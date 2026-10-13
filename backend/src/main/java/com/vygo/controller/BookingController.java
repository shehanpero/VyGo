package com.vygo.controller;

import com.vygo.dto.booking.BookingRequest;
import com.vygo.dto.booking.BookingResponse;
import com.vygo.dto.booking.LockSeatsRequest;
import com.vygo.dto.booking.LockSeatsResponse;
import com.vygo.dto.common.PageResponse;
import com.vygo.security.CurrentUser;
import com.vygo.service.BookingService;
import com.vygo.service.SeatLockService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/bookings")
@Tag(name = "Bookings", description = "Seat locking, booking and cancellation")
public class BookingController {

    private final SeatLockService seatLockService;
    private final BookingService bookingService;

    public BookingController(SeatLockService seatLockService, BookingService bookingService) {
        this.seatLockService = seatLockService;
        this.bookingService = bookingService;
    }

    @PostMapping("/lock-seats")
    @Operation(summary = "Lock seats for a trip (10-minute hold)")
    public LockSeatsResponse lockSeats(@Valid @RequestBody LockSeatsRequest request) {
        return seatLockService.lock(CurrentUser.id(), request);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a booking from a seat lock (PENDING until payment)")
    public BookingResponse create(@Valid @RequestBody BookingRequest request) {
        return bookingService.create(CurrentUser.id(), request);
    }

    @GetMapping("/my")
    @Operation(summary = "List the current passenger's bookings")
    public PageResponse<BookingResponse> my(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return bookingService.getMyBookings(CurrentUser.id(), page, size);
    }

    @GetMapping("/{ref}")
    @Operation(summary = "Get a booking by reference")
    public BookingResponse get(@PathVariable String ref) {
        return bookingService.getByRef(ref, CurrentUser.id(), CurrentUser.roles());
    }

    @PostMapping("/{ref}/cancel")
    @Operation(summary = "Cancel a booking (subject to cancellation window)")
    public BookingResponse cancel(@PathVariable String ref,
                                  @RequestBody(required = false) Map<String, String> body) {
        String reason = body == null ? null : body.get("reason");
        return bookingService.cancel(ref, CurrentUser.id(), reason);
    }
}
