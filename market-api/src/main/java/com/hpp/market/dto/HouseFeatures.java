package com.hpp.market.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** The 7 ml-api model features; bounds mirror ml-api/app/schemas.py. */
public record HouseFeatures(
        @NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("20000") Double squareFootage,
        @NotNull @Min(0) @Max(20) Integer bedrooms,
        @NotNull @DecimalMin("0") @DecimalMax("20") Double bathrooms,
        @NotNull @Min(1800) @Max(2100) Integer yearBuilt,
        @NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("1000000") Double lotSize,
        @NotNull @DecimalMin("0") @DecimalMax("500") Double distanceToCityCenter,
        @NotNull @DecimalMin("0") @DecimalMax("10") Double schoolRating) {

    public static final List<String> NAMES = List.of("square_footage", "bedrooms", "bathrooms", "year_built",
            "lot_size", "distance_to_city_center", "school_rating");
    /** ml-api validates these as ints. */
    public static final Set<String> INTEGER_NAMES = Set.of("bedrooms", "year_built");

    public Map<String, Number> asMap() {
        Map<String, Number> m = new LinkedHashMap<>();
        m.put("square_footage", squareFootage);
        m.put("bedrooms", bedrooms);
        m.put("bathrooms", bathrooms);
        m.put("year_built", yearBuilt);
        m.put("lot_size", lotSize);
        m.put("distance_to_city_center", distanceToCityCenter);
        m.put("school_rating", schoolRating);
        return m;
    }
}
