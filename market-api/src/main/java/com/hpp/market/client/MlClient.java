package com.hpp.market.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

@Component
public class MlClient {
    record Prediction(double price, List<String> warnings) {}
    record BatchPrediction(List<Prediction> predictions) {}

    private final RestClient http;

    private final ObjectMapper objectMapper;

    public MlClient(RestClient mlRestClient, ObjectMapper objectMapper) {
        this.http = mlRestClient;
        this.objectMapper = objectMapper;
    }

    /** features: snake_case feature objects; returns one price per item, in order. */
    public List<Double> predictBatch(List<?> features) {
        BatchPrediction res;
        try {
            res = http.post().uri("/predict/batch").body(features).retrieve().body(BatchPrediction.class);
        } catch (ResourceAccessException e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Prediction service is unavailable");
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().isSameCodeAs(HttpStatus.UNPROCESSABLE_ENTITY)
                    || e.getStatusCode().isSameCodeAs(HttpStatus.BAD_REQUEST)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, rejection(e));
            }
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Prediction service returned an error");
        }
        if (res == null || res.predictions() == null || res.predictions().size() != features.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Prediction service returned an error");
        }
        return res.predictions().stream().map(Prediction::price).toList();
    }

    /** FastAPI detail: a string (400) or a list of {loc, msg} (422), e.g. "year_built: Input should be ...". */
    private String rejection(RestClientResponseException e) {
        String generic = "Prediction service rejected the input";
        try {
            JsonNode detail = objectMapper.readTree(e.getResponseBodyAsString()).path("detail");
            if (detail.isTextual()) return detail.asText();
            // A set: several batch variants failing the same bound give the same message once.
            Set<String> issues = new LinkedHashSet<>();
            for (JsonNode d : detail) {
                JsonNode loc = d.path("loc");
                String msg = d.path("msg").asText("");
                if (msg.isEmpty()) continue;
                issues.add(loc.isEmpty() ? msg : loc.get(loc.size() - 1).asText() + ": " + msg);
            }
            return issues.isEmpty() ? generic : String.join("; ", issues);
        } catch (Exception ex) {
            return generic;
        }
    }
}
