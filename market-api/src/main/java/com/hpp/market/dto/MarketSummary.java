package com.hpp.market.dto;

public record MarketSummary(int count, double avgPrice, double medianPrice, double minPrice, double maxPrice,
                            double avgPricePerSqft) {}
