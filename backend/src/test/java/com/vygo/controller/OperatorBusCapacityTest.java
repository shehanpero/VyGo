package com.vygo.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Fleet upgrade capacity validation: the operator bus create/update endpoints
 * must reject capacities outside the vehicle's allowed seat set (known model
 * first, then service-class range) with a clear 400, and stay permissive for
 * in-range custom/unknown models.
 */
@SpringBootTest
@AutoConfigureMockMvc
class OperatorBusCapacityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void createExpressYutongWithOutOfRangeCapacityIsRejected() throws Exception {
        createBus("{\"registrationNo\":\"CAP-101\",\"busType\":\"AC\",\"capacity\":45,\"model\":\"Yutong C12 Pro\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error", containsString("Capacity 45")))
                .andExpect(jsonPath("$.error", containsString("Yutong C12 Pro")));
    }

    @Test
    void createExpressYutongWithinRangeSucceeds() throws Exception {
        createBus("{\"registrationNo\":\"CAP-102\",\"busType\":\"AC\",\"capacity\":52,\"model\":\"Yutong C12 Pro\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.capacity").value(52))
                .andExpect(jsonPath("$.model").value("Yutong C12 Pro"));
    }

    @Test
    void createNormalVikingWithOutOfRangeCapacityIsRejected() throws Exception {
        createBus("{\"registrationNo\":\"CAP-103\",\"busType\":\"NORMAL\",\"capacity\":45,\"model\":\"Ashok Leyland Viking\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error", containsString("Capacity 45")))
                .andExpect(jsonPath("$.error", containsString("Ashok Leyland Viking")));
    }

    @Test
    void createNormalVikingWithAllowedCapacitySucceeds() throws Exception {
        createBus("{\"registrationNo\":\"CAP-104\",\"busType\":\"NORMAL\",\"capacity\":54,\"model\":\"Ashok Leyland Viking\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.capacity").value(54));
    }

    @Test
    void unknownModelFallsBackToServiceClassRange() throws Exception {
        // Unknown model + EXPRESS bus type -> 51-53 enforced.
        createBus("{\"registrationNo\":\"CAP-105\",\"busType\":\"LUXURY\",\"capacity\":45,\"model\":\"Kia Granbird\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error", containsString("EXPRESS service class")));
        // In-range capacity on the same unknown model is accepted.
        createBus("{\"registrationNo\":\"CAP-106\",\"busType\":\"LUXURY\",\"capacity\":53,\"model\":\"Kia Granbird\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.capacity").value(53));
    }

    @Test
    void updateBusRejectsOutOfRangeCapacity() throws Exception {
        MvcResult created = createBus(
                "{\"registrationNo\":\"CAP-107\",\"busType\":\"AC\",\"capacity\":52,\"model\":\"Yutong C12 Pro\"}")
                .andExpect(status().isCreated())
                .andReturn();
        long id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(put("/api/v1/operator/buses/" + id)
                        .header("Authorization", "Bearer " + loginOperator())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"registrationNo\":\"CAP-107\",\"busType\":\"AC\",\"capacity\":45,\"model\":\"Yutong C12 Pro\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error", containsString("Capacity 45")));
    }

    // ---------- helpers ----------

    private ResultActions createBus(String body) throws Exception {
        return mockMvc.perform(post("/api/v1/operator/buses")
                .header("Authorization", "Bearer " + loginOperator())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private String loginOperator() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"operator@vygo.lk\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }
}
