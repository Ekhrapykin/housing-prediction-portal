package com.hpp.market.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class Property {
    @Id
    private Long id;
    private double squareFootage;
    private int bedrooms;
    private double bathrooms;
    private int yearBuilt;
    private double lotSize;
    private double distanceToCityCenter;
    private double schoolRating;
    private double price;

    protected Property() {}

    public Property(Long id, double squareFootage, int bedrooms, double bathrooms, int yearBuilt,
                    double lotSize, double distanceToCityCenter, double schoolRating, double price) {
        this.id = id;
        this.squareFootage = squareFootage;
        this.bedrooms = bedrooms;
        this.bathrooms = bathrooms;
        this.yearBuilt = yearBuilt;
        this.lotSize = lotSize;
        this.distanceToCityCenter = distanceToCityCenter;
        this.schoolRating = schoolRating;
        this.price = price;
    }

    public Long getId() { return id; }
    public double getSquareFootage() { return squareFootage; }
    public int getBedrooms() { return bedrooms; }
    public double getBathrooms() { return bathrooms; }
    public int getYearBuilt() { return yearBuilt; }
    public double getLotSize() { return lotSize; }
    public double getDistanceToCityCenter() { return distanceToCityCenter; }
    public double getSchoolRating() { return schoolRating; }
    public double getPrice() { return price; }
}
