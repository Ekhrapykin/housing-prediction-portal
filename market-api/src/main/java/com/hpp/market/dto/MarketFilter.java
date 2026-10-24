package com.hpp.market.dto;

import org.springframework.web.bind.annotation.BindParam;

/** Optional filters; snake_case query params. Record equals/hashCode makes it a cache key. */
public record MarketFilter(
        @BindParam("min_bedrooms") Integer minBedrooms,
        @BindParam("max_bedrooms") Integer maxBedrooms,
        @BindParam("min_price") Double minPrice,
        @BindParam("max_price") Double maxPrice,
        @BindParam("min_school_rating") Double minSchoolRating,
        @BindParam("max_distance") Double maxDistance,
        @BindParam("min_year_built") Integer minYearBuilt,
        @BindParam("max_year_built") Integer maxYearBuilt) {}
