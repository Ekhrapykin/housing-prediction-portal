package com.hpp.market.service;

import com.hpp.market.client.MlClient;
import com.hpp.market.dto.HouseFeatures;
import com.hpp.market.dto.WhatIfPoint;
import com.hpp.market.dto.WhatIfRequest;
import com.hpp.market.exception.BadRequestException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
public class WhatIfService {
    private final MlClient ml;

    public WhatIfService(MlClient ml) {
        this.ml = ml;
    }

    @Cacheable("whatIf")
    public List<WhatIfPoint> whatIf(WhatIfRequest r) {
        if (!HouseFeatures.NAMES.contains(r.feature())) {
            throw new BadRequestException("Unknown feature '%s'; expected one of %s".formatted(r.feature(), HouseFeatures.NAMES));
        }
        boolean integer = HouseFeatures.INTEGER_NAMES.contains(r.feature());
        List<Number> values = new ArrayList<>();
        List<Map<String, Number>> variants = new ArrayList<>();
        for (int i = 0; i < r.steps(); i++) {
            double v = r.from() + (r.to() - r.from()) * i / (r.steps() - 1);
            Number value = integer ? (Number) Math.round(v) : (Number) v;
            Map<String, Number> m = new LinkedHashMap<>(r.base().asMap());
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
