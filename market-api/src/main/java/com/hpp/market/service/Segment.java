package com.hpp.market.service;

import com.hpp.market.domain.Property;
import java.util.function.IntFunction;
import java.util.function.ToIntFunction;

/** Segment bands: `order` picks the band (also the sort key), `label` names it. */
public enum Segment {
    BEDROOMS(Property::getBedrooms, o -> o + " bed"),
    SCHOOL_RATING(p -> p.getSchoolRating() < 7 ? 0 : p.getSchoolRating() < 8 ? 1 : 2,
            o -> new String[]{"< 7", "7–8", "8+"}[o]),
    DISTANCE(p -> p.getDistanceToCityCenter() < 3 ? 0 : p.getDistanceToCityCenter() < 6 ? 1 : 2,
            o -> new String[]{"< 3", "3–6", "6+"}[o]),
    DECADE(p -> p.getYearBuilt() / 10 * 10, o -> o + "s");

    final ToIntFunction<Property> order;
    final IntFunction<String> label;

    Segment(ToIntFunction<Property> order, IntFunction<String> label) {
        this.order = order;
        this.label = label;
    }
}
