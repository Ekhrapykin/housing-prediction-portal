package com.hpp.market;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class MarketApplicationTests {
    @Autowired MockMvc mvc;

    @Test
    void summaryCountsSeed() throws Exception {
        mvc.perform(get("/api/market/summary")).andExpect(status().isOk()).andExpect(jsonPath("$.count").value(50));
    }
}
