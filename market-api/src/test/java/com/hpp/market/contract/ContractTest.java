package com.hpp.market.contract;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hpp.market.dto.HouseFeatures;
import com.hpp.market.dto.MarketFilter;
import com.hpp.market.dto.WhatIfRequest;
import com.hpp.market.service.PropertyService;
import com.hpp.market.service.Segment;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.BindParam;

/** The native Java types must match contracts/*.json. build.gradle.kts passes the directory in. */
class ContractTest {
    static final ObjectMapper JSON = new ObjectMapper();
    static final Path DIR = Path.of(System.getProperty("contracts.dir", "../contracts"));

    static JsonNode contract(String file) throws IOException {
        return JSON.readTree(DIR.resolve(file).toFile());
    }

    static List<String> strings(JsonNode array) {
        return JSON.convertValue(array, new com.fasterxml.jackson.core.type.TypeReference<>() {});
    }

    static String snake(String camel) {
        return camel.replaceAll("([A-Z])", "_$1").toLowerCase();
    }

    static String typeOf(Class<?> c) {
        return Set.of(Integer.class, Long.class, int.class, long.class).contains(c) ? "integer" : "number";
    }

    @Test
    void houseFeaturesMatchSchema() throws IOException {
        JsonNode schema = contract("house-features.schema.json");

        // actual: property -> {type, minimum|exclusiveMinimum, maximum}, built from the annotations
        Map<String, Map<String, Object>> actual = new TreeMap<>();
        Set<String> required = new TreeSet<>();
        for (var f : HouseFeatures.class.getDeclaredFields()) {
            if (java.lang.reflect.Modifier.isStatic(f.getModifiers())) continue;
            Map<String, Object> p = new TreeMap<>();
            p.put("type", typeOf(f.getType()));
            if (f.isAnnotationPresent(NotNull.class)) required.add(snake(f.getName()));
            if (f.isAnnotationPresent(Min.class)) p.put("minimum", BigDecimal.valueOf(f.getAnnotation(Min.class).value()));
            if (f.isAnnotationPresent(Max.class)) p.put("maximum", BigDecimal.valueOf(f.getAnnotation(Max.class).value()));
            if (f.isAnnotationPresent(DecimalMin.class)) {
                var d = f.getAnnotation(DecimalMin.class);
                p.put(d.inclusive() ? "minimum" : "exclusiveMinimum", new BigDecimal(d.value()));
            }
            if (f.isAnnotationPresent(DecimalMax.class)) {
                var d = f.getAnnotation(DecimalMax.class);
                p.put(d.inclusive() ? "maximum" : "exclusiveMaximum", new BigDecimal(d.value()));
            }
            actual.put(snake(f.getName()), p);
        }

        Map<String, Map<String, Object>> expected = new TreeMap<>();
        schema.get("properties").fields().forEachRemaining(e -> {
            Map<String, Object> p = new TreeMap<>();
            e.getValue().fields().forEachRemaining(kv -> p.put(kv.getKey(),
                    kv.getValue().isNumber() ? kv.getValue().decimalValue() : kv.getValue().asText()));
            expected.put(e.getKey(), p);
        });

        var actualN = normalise(actual);
        var expectedN = normalise(expected);
        assertThat(actualN.keySet()).as("feature names").isEqualTo(expectedN.keySet());
        expectedN.forEach((name, spec) -> assertThat(actualN.get(name)).as("feature %s", name).isEqualTo(spec));
        assertThat(required).containsExactlyInAnyOrderElementsOf(strings(schema.get("required")));
    }

    /** BigDecimal equality is scale-sensitive (0 vs 0.0), so compare as strings of the stripped value. */
    static Map<String, Map<String, String>> normalise(Map<String, Map<String, Object>> m) {
        Map<String, Map<String, String>> out = new TreeMap<>();
        m.forEach((k, v) -> {
            Map<String, String> p = new LinkedHashMap<>();
            v.forEach((a, b) -> p.put(a, b instanceof BigDecimal d ? d.stripTrailingZeros().toPlainString() : b.toString()));
            out.put(k, p);
        });
        return out;
    }

    @Test
    void segmentKeysMatch() throws IOException {
        assertThat(Arrays.stream(Segment.values()).map(Enum::name).toList())
                .containsExactlyInAnyOrderElementsOf(strings(contract("market.json").get("segment_keys")));
    }

    @Test
    void sortKeysMatch() throws IOException {
        assertThat(PropertyService.SORTABLE.stream().map(ContractTest::snake).toList())
                .containsExactlyInAnyOrderElementsOf(strings(contract("market.json").get("sort_keys")));
    }

    @Test
    void filtersMatch() throws IOException {
        Map<String, String> actual = new TreeMap<>();
        // @BindParam targets parameters, so read it from the canonical constructor
        var ctor = MarketFilter.class.getDeclaredConstructors()[0];
        for (var p : ctor.getParameters())
            actual.put(p.getAnnotation(BindParam.class).value(), typeOf(p.getType()));
        Map<String, String> expected = new TreeMap<>();
        contract("market.json").get("filters").fields().forEachRemaining(e -> expected.put(e.getKey(), e.getValue().asText()));
        assertThat(actual).isEqualTo(expected);
    }

    @Test
    void whatIfStepsMatch() throws Exception {
        var steps = contract("market.json").get("what_if").get("steps");
        var field = WhatIfRequest.class.getDeclaredField("steps");
        assertThat(field.getAnnotation(Min.class).value()).isEqualTo(steps.get("minimum").asLong());
        assertThat(field.getAnnotation(Max.class).value()).isEqualTo(steps.get("maximum").asLong());
    }
}
