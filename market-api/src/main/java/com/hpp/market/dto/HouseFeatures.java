package com.hpp.market.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** The 7 ml-api model features; bounds mirror ml-api/app/schemas.py. */
public record HouseFeatures(
        @NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("20000") Double squareFootage,
        @NotNull @Min(0) @Max(20) Integer bedrooms,
        @NotNull @DecimalMin("0") @DecimalMax("20") Double bathrooms,
        @NotNull @Min(1800) @Max(2100) Integer yearBuilt,
        @NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("1000000") Double lotSize,
        @NotNull @DecimalMin("0") @DecimalMax("500") Double distanceToCityCenter,
        @NotNull @DecimalMin("0") @DecimalMax("10") Double schoolRating) {}
