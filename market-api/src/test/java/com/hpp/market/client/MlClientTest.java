package com.hpp.market.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.hpp.market.config.RequestIdInterceptor;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

class MlClientTest {
    MockRestServiceServer server;
    MlClient client;

    @BeforeEach
    void setUp() {
        var builder = RestClient.builder().baseUrl("http://ml").requestInterceptor(new RequestIdInterceptor());
        server = MockRestServiceServer.bindTo(builder).build();
        client = new MlClient(builder.build());
    }

    @Test
    void returnsPricesInOrder() {
        server.expect(requestTo("http://ml/predict/batch")).andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("""
                        {"count":2,"predictions":[{"price":100.5,"warnings":[]},{"price":200,"warnings":["x"]}]}""",
                        MediaType.APPLICATION_JSON));
        assertThat(client.predictBatch(List.of(Map.of("a", 1), Map.of("a", 2)))).containsExactly(100.5, 200.0);
    }

    @Test
    void upstream5xxBecomesUpstreamError() {
        server.expect(requestTo("http://ml/predict/batch")).andRespond(withServerError());
        assertThatThrownBy(() -> client.predictBatch(List.of(Map.of("a", 1))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
    }

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void forwardsRequestIdFromMdc() {
        MDC.put("requestId", "abc-123");
        server.expect(requestTo("http://ml/predict/batch")).andExpect(header("X-Request-ID", "abc-123"))
                .andRespond(withSuccess("""
                        {"count":1,"predictions":[{"price":1,"warnings":[]}]}""", MediaType.APPLICATION_JSON));
        client.predictBatch(List.of(Map.of("a", 1)));
        server.verify();
    }
}
