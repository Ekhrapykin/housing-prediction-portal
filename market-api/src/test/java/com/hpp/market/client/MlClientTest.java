package com.hpp.market.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.fasterxml.jackson.databind.ObjectMapper;
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
        client = new MlClient(builder.build(), new ObjectMapper());
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

    private void assertRejected(HttpStatus status, String body, HttpStatus expected, String message) {
        server.expect(requestTo("http://ml/predict/batch"))
                .andRespond(withStatus(status).body(body).contentType(MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.predictBatch(List.of(Map.of("a", 1))))
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> {
                    assertThat(e.getStatusCode()).isEqualTo(expected);
                    assertThat(e.getReason()).isEqualTo(message);
                });
    }

    @Test
    void validationListBecomes400WithFieldAndMessage() {
        assertRejected(HttpStatus.UNPROCESSABLE_ENTITY, """
                {"detail":[{"loc":["body",0,"year_built"],"msg":"Input should be greater than or equal to 1800","type":"x"},
                           {"loc":["body",0,"bedrooms"],"msg":"Input should be less than or equal to 20"}]}""",
                HttpStatus.BAD_REQUEST,
                "year_built: Input should be greater than or equal to 1800; bedrooms: Input should be less than or equal to 20");
    }

    @Test
    void repeatedIssuesAcrossVariantsAreReportedOnce() {
        assertRejected(HttpStatus.UNPROCESSABLE_ENTITY, """
                {"detail":[{"loc":["body",0,"year_built"],"msg":"Input should be greater than or equal to 1800","type":"x"},
                           {"loc":["body",1,"year_built"],"msg":"Input should be greater than or equal to 1800","type":"x"}]}""",
                HttpStatus.BAD_REQUEST, "year_built: Input should be greater than or equal to 1800");
    }

    @Test
    void stringDetailPassesThrough() {
        assertRejected(HttpStatus.BAD_REQUEST, "{\"detail\":\"Batch too large\"}", HttpStatus.BAD_REQUEST, "Batch too large");
    }

    @Test
    void unparsable422FallsBackToGenericMessage() {
        assertRejected(HttpStatus.UNPROCESSABLE_ENTITY, "not json", HttpStatus.BAD_REQUEST,
                "Prediction service rejected the input");
    }

    @Test
    void unreachableUpstreamBecomes503() {
        server.expect(requestTo("http://ml/predict/batch"))
                .andRespond(request -> { throw new java.net.ConnectException("refused"); });
        assertThatThrownBy(() -> client.predictBatch(List.of(Map.of("a", 1))))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
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
