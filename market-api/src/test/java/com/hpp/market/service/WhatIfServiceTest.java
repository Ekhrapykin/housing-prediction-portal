package com.hpp.market.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.hpp.market.client.MlClient;
import com.hpp.market.dto.HouseFeatures;
import com.hpp.market.dto.WhatIfPoint;
import com.hpp.market.dto.WhatIfRequest;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class WhatIfServiceTest {
    static final HouseFeatures BASE = new HouseFeatures(1500.0, 3, 2.0, 1997, 6800.0, 4.1, 7.6);

    MlClient ml = mock(MlClient.class);
    // same naming strategy as the app's global Jackson config
    WhatIfService service = new WhatIfService(ml,
            new ObjectMapper().setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE));

    /** Fake ml-api: price = 10 * (position + 1); returns the variants it was sent. */
    @SuppressWarnings("unchecked")
    List<Map<String, Number>> run(WhatIfRequest r, List<WhatIfPoint>[] out) {
        when(ml.predictBatch(anyList())).thenAnswer(inv ->
                java.util.stream.IntStream.range(0, ((List<?>) inv.getArgument(0)).size()).mapToObj(i -> 10.0 * (i + 1)).toList());
        out[0] = service.whatIf(r);
        var captor = ArgumentCaptor.forClass(List.class);
        org.mockito.Mockito.verify(ml).predictBatch(captor.capture());
        return captor.getValue();
    }

    @SuppressWarnings("unchecked")
    List<WhatIfPoint> points(WhatIfRequest r) {
        List<WhatIfPoint>[] out = new List[1];
        run(r, out);
        return out[0];
    }

    @Test
    void evenlySpacedValuesIncludeBothEndpointsAndMapToPricesInOrder() {
        var pts = points(new WhatIfRequest(BASE, "square_footage", 1000.0, 2500.0, 4));
        assertThat(pts).extracting(WhatIfPoint::value).containsExactly(1000.0, 1500.0, 2000.0, 2500.0);
        assertThat(pts).extracting(WhatIfPoint::price).containsExactly(10.0, 20.0, 30.0, 40.0);
    }

    @Test
    void integerFeaturesAreRounded() {
        assertThat(points(new WhatIfRequest(BASE, "year_built", 1900.0, 2000.0, 4)))
                .extracting(WhatIfPoint::value).containsExactly(1900.0, 1933.0, 1967.0, 2000.0);
    }

    @Test
    @SuppressWarnings("unchecked")
    void duplicatesAfterRoundingAreDroppedAndOnlyDistinctVariantsAreSent() {
        List<WhatIfPoint>[] out = new List[1];
        var sent = run(new WhatIfRequest(BASE, "bedrooms", 1.0, 3.0, 50), out);
        assertThat(out[0]).extracting(WhatIfPoint::value).containsExactly(1.0, 2.0, 3.0);
        assertThat(sent).hasSize(3);
    }

    @Test
    @SuppressWarnings("unchecked")
    void otherFeaturesOfTheBaseHouseArePreservedInEveryVariant() {
        List<WhatIfPoint>[] out = new List[1];
        var sent = run(new WhatIfRequest(BASE, "square_footage", 1000.0, 2000.0, 3), out);
        assertThat(sent).hasSize(3).allSatisfy(m -> assertThat(m)
                .containsEntry("bedrooms", 3).containsEntry("bathrooms", 2.0).containsEntry("year_built", 1997)
                .containsEntry("lot_size", 6800.0).containsEntry("distance_to_city_center", 4.1)
                .containsEntry("school_rating", 7.6));
        assertThat(sent).extracting(m -> m.get("square_footage")).containsExactly(1000.0, 1500.0, 2000.0);
    }

    @Test
    void unknownFeatureIs400WithDetail() {
        assertThatThrownBy(() -> service.whatIf(new WhatIfRequest(BASE, "pool", 1.0, 2.0, 3)))
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> {
                    assertThat(e.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(e.getReason()).startsWith("Unknown feature 'pool'; expected one of [square_footage");
                });
    }
}
