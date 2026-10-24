package com.hpp.market.repository;

import com.hpp.market.domain.Property;
import com.hpp.market.dto.MarketFilter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public final class PropertySpecifications {
    private PropertySpecifications() {}

    public static Specification<Property> from(MarketFilter f) {
        List<Specification<Property>> s = new ArrayList<>();
        if (f.minBedrooms() != null) s.add((r, q, cb) -> cb.greaterThanOrEqualTo(r.get("bedrooms"), f.minBedrooms()));
        if (f.maxBedrooms() != null) s.add((r, q, cb) -> cb.lessThanOrEqualTo(r.get("bedrooms"), f.maxBedrooms()));
        if (f.minPrice() != null) s.add((r, q, cb) -> cb.greaterThanOrEqualTo(r.get("price"), f.minPrice()));
        if (f.maxPrice() != null) s.add((r, q, cb) -> cb.lessThanOrEqualTo(r.get("price"), f.maxPrice()));
        if (f.minSchoolRating() != null) s.add((r, q, cb) -> cb.greaterThanOrEqualTo(r.get("schoolRating"), f.minSchoolRating()));
        if (f.maxDistance() != null) s.add((r, q, cb) -> cb.lessThanOrEqualTo(r.get("distanceToCityCenter"), f.maxDistance()));
        if (f.minYearBuilt() != null) s.add((r, q, cb) -> cb.greaterThanOrEqualTo(r.get("yearBuilt"), f.minYearBuilt()));
        if (f.maxYearBuilt() != null) s.add((r, q, cb) -> cb.lessThanOrEqualTo(r.get("yearBuilt"), f.maxYearBuilt()));
        return Specification.allOf(s);
    }
}
