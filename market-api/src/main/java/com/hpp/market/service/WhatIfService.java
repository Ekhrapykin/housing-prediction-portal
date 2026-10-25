package com.hpp.market.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hpp.market.client.MlClient;
import com.hpp.market.dto.WhatIfPoint;
import com.hpp.market.dto.WhatIfRequest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WhatIfService {
    private final MlClient ml;
    private final ObjectMapper objectMapper;

    public WhatIfService(MlClient ml, ObjectMapper objectMapper) {
        this.ml = ml;
        this.objectMapper = objectMapper;
    }

    @Cacheable("whatIf")
    public List<WhatIfPoint> whatIf(WhatIfRequest r) {
        // snake_case names/types as ml-api expects them (the global Jackson naming strategy)
        Map<String, Number> base = objectMapper.convertValue(r.base(), new TypeReference<LinkedHashMap<String, Number>>() {});
        if (!base.containsKey(r.feature())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unknown feature '%s'; expected one of %s".formatted(r.feature(), base.keySet()));
        }
        boolean integer = base.get(r.feature()) instanceof Integer;
        List<Number> values = new ArrayList<>();
        List<Map<String, Number>> variants = new ArrayList<>();
        for (int i = 0; i < r.steps(); i++) {
            double v = r.from() + (r.to() - r.from()) * i / (r.steps() - 1);
            Number value = integer ? (Number) Math.round(v) : (Number) v;
            Map<String, Number> m = new LinkedHashMap<>(base);
            m.put(r.feature(), value);
            values.add(value);
            variants.add(m);
        }
        List<Double> prices = ml.predictBatch(variants);
        List<WhatIfPoint> out = new ArrayList<>();
        for (int i = 0; i < prices.size(); i++) out.add(new WhatIfPoint(values.get(i).doubleValue(), prices.get(i)));
        return out;
    }
}
