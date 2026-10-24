package com.hpp.market.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record WhatIfRequest(
        @NotNull @Valid HouseFeatures base,
        @NotBlank String feature,
        @NotNull Double from,
        @NotNull Double to,
        @Min(2) @Max(50) int steps) {}
