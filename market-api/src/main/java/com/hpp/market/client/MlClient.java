package com.hpp.market.client;

import com.hpp.market.exception.BadRequestException;
import com.hpp.market.exception.UpstreamErrorException;
import com.hpp.market.exception.UpstreamUnavailableException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class MlClient {
    record Prediction(double price, List<String> warnings) {}
    record BatchPrediction(int count, List<Prediction> predictions) {}

    private final RestClient http;

    public MlClient(RestClient mlRestClient) {
        this.http = mlRestClient;
    }

    /** features: snake_case feature objects; returns one price per item, in order. */
    public List<Double> predictBatch(List<?> features) {
        BatchPrediction res;
        try {
            res = http.post().uri("/predict/batch").body(features).retrieve().body(BatchPrediction.class);
        } catch (ResourceAccessException e) {
            throw new UpstreamUnavailableException("Prediction service is unavailable");
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().isSameCodeAs(HttpStatus.UNPROCESSABLE_ENTITY)
                    || e.getStatusCode().isSameCodeAs(HttpStatus.BAD_REQUEST)) {
                throw new BadRequestException("Prediction service rejected the input");
            }
            throw new UpstreamErrorException("Prediction service returned an error");
        }
        if (res == null || res.predictions() == null || res.predictions().size() != features.size()) {
            throw new UpstreamErrorException("Prediction service returned an error");
        }
        return res.predictions().stream().map(Prediction::price).toList();
    }
}
