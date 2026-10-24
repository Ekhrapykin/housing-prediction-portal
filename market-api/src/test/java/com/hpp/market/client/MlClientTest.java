package com.hpp.market.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.hpp.market.exception.UpstreamErrorException;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class MlClientTest {
    MockRestServiceServer server;
    MlClient client;

    @BeforeEach
    void setUp() {
        var builder = RestClient.builder().baseUrl("http://ml");
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
                .isInstanceOf(UpstreamErrorException.class);
    }
}
