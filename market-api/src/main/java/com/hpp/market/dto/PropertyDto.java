package com.hpp.market.dto;

import com.hpp.market.domain.Property;

public record PropertyDto(long id, double squareFootage, int bedrooms, double bathrooms, int yearBuilt,
                          double lotSize, double distanceToCityCenter, double schoolRating, double price) {
    public static PropertyDto of(Property p) {
        return new PropertyDto(p.getId(), p.getSquareFootage(), p.getBedrooms(), p.getBathrooms(), p.getYearBuilt(),
                p.getLotSize(), p.getDistanceToCityCenter(), p.getSchoolRating(), p.getPrice());
    }
}
