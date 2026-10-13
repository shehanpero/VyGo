package com.vygo.controller;

import com.vygo.repository.BusOperatorRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/operators/public")
@Tag(name = "Operators", description = "Public operator directory")
public class OperatorPublicController {

    private final BusOperatorRepository busOperatorRepository;

    public OperatorPublicController(BusOperatorRepository busOperatorRepository) {
        this.busOperatorRepository = busOperatorRepository;
    }

    @GetMapping
    @Operation(summary = "List approved operators")
    public List<Map<String, Object>> list() {
        return busOperatorRepository.findAll().stream()
                .filter(o -> o.getStatus() == com.vygo.entity.BusOperator.OperatorStatus.APPROVED)
                .map(o -> Map.<String, Object>of(
                        "id", o.getId(),
                        "name", o.getName(),
                        "registrationNo", o.getRegistrationNo(),
                        "type", o.typeOrDefault().name(),
                        "phone", o.getPhone() == null ? "" : o.getPhone()))
                .toList();
    }
}
