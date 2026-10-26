package com.hpp.market.dto;

import java.util.List;
import org.springframework.web.bind.annotation.BindParam;

/** Optional filters; snake_case query params. Record equals/hashCode makes it a cache key. `bedrooms` is any-of, `?bedrooms=2,4`. */
public record MarketFilter(
        @BindParam("bedrooms") List<Integer> bedrooms,
        @BindParam("min_price") Double minPrice,
        @BindParam("max_price") Double maxPrice,
        @BindParam("min_school_rating") Double minSchoolRating,
        @BindParam("max_distance") Double maxDistance,
        @BindParam("min_year_built") Integer minYearBuilt,
        @BindParam("max_year_built") Integer maxYearBuilt) {}
