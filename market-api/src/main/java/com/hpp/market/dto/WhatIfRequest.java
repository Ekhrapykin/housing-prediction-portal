package com.hpp.market.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record WhatIfRequest(
        @NotNull @Valid HouseFeatures base,
        @NotBlank String feature,
        @NotNull Double from,
        @NotNull Double to,
        @Min(2) @Max(50) int steps) {
    @JsonIgnore
    @AssertTrue(message = "\"from\" must be less than \"to\"")
    public boolean isRangeValid() {
        return from == null || to == null || from < to;
    }
}
