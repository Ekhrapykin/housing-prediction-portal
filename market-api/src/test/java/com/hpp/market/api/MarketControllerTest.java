package com.hpp.market.api;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hpp.market.dto.MarketSummary;
import com.hpp.market.service.ExportService;
import com.hpp.market.service.MarketService;
import com.hpp.market.service.PropertyService;
import com.hpp.market.service.WhatIfService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(MarketController.class)
class MarketControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean MarketService market;
    @MockitoBean PropertyService properties;
    @MockitoBean WhatIfService whatIf;
    @MockitoBean ExportService export;

    static final String BASE = """
            {"square_footage":1500,"bedrooms":3,"bathrooms":2,"year_built":1997,"lot_size":6800,
             "distance_to_city_center":4.1,"school_rating":7.6}""";

    @Test
    void summaryHappyPath() throws Exception {
        when(market.summary(any())).thenReturn(new MarketSummary(50, 1, 2, 3, 4, 5));
        mvc.perform(get("/api/market/summary?bedrooms=2,4"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(50))
                .andExpect(jsonPath("$.avg_price").value(1));
        verify(market).summary(argThat(f -> f.bedrooms().equals(List.of(2, 4))));
    }

    @Test
    void validIncomingRequestIdIsEchoed() throws Exception {
        mvc.perform(get("/api/market/segments?by=NOPE").header("X-Request-ID", "test-123"))
                .andExpect(header().string("X-Request-ID", "test-123"));
    }

    @Test
    void missingOrInvalidRequestIdIsReplacedByUuid() throws Exception {
        var uuid = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
        mvc.perform(get("/api/market/segments?by=NOPE"))
                .andExpect(header().string("X-Request-ID", org.hamcrest.Matchers.matchesPattern(uuid)));
        mvc.perform(get("/api/market/segments?by=NOPE").header("X-Request-ID", "bad id"))
                .andExpect(header().string("X-Request-ID", org.hamcrest.Matchers.matchesPattern(uuid)));
    }

    @Test
    void badSegmentIs400() throws Exception {
        mvc.perform(get("/api/market/segments?by=NOPE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").exists());
    }

    @Test
    void whatIfFromNotBelowToIs400() throws Exception {
        mvc.perform(post("/api/market/what-if").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"base\":" + BASE + ",\"feature\":\"bedrooms\",\"from\":3,\"to\":3,\"steps\":3}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("\"from\" must be less than \"to\""));
    }

    @Test
    void whatIfStepsOutOfRangeIs400() throws Exception {
        mvc.perform(post("/api/market/what-if").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"base\":" + BASE + ",\"feature\":\"bedrooms\",\"from\":1,\"to\":2,\"steps\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").exists());
    }

    @Test
    void invalidNestedFieldIsReportedWithSnakeCasePath() throws Exception {
        String bad = BASE.replace("1500", "-5");
        mvc.perform(post("/api/market/what-if").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"base\":" + bad + ",\"feature\":\"bedrooms\",\"from\":1,\"to\":2,\"steps\":3}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("base.square_footage ")))
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("squareFootage"))));
    }
}
