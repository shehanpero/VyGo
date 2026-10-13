package com.vygo.controller;

import com.vygo.dto.ticket.TicketResponse;
import com.vygo.dto.ticket.ValidateTicketRequest;
import com.vygo.dto.ticket.ValidateTicketResponse;
import com.vygo.security.CurrentUser;
import com.vygo.service.TicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tickets")
@Tag(name = "Tickets", description = "E-tickets and QR validation")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @GetMapping("/{ref}")
    @Operation(summary = "Get an e-ticket by reference")
    public TicketResponse get(@PathVariable String ref) {
        return ticketService.getByRef(ref, CurrentUser.id(), CurrentUser.roles());
    }

    @GetMapping(value = "/{ref}/qr", produces = MediaType.IMAGE_PNG_VALUE)
    @Operation(summary = "Get the ticket QR code as a PNG image")
    public byte[] qr(@PathVariable String ref) {
        return ticketService.qrPng(ref, CurrentUser.id(), CurrentUser.roles());
    }

    @PostMapping("/validate")
    @PreAuthorize("hasAnyRole('CONDUCTOR','OPERATOR','ADMIN')")
    @Operation(summary = "Validate a scanned QR ticket (CONDUCTOR/OPERATOR/ADMIN)")
    public ValidateTicketResponse validate(@Valid @RequestBody ValidateTicketRequest request) {
        return ticketService.validate(CurrentUser.id(), request);
    }
}
