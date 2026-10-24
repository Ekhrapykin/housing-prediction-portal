package com.hpp.market.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ml.api")
public record MlProperties(String url) {
    public MlProperties {
        if (url == null || url.isBlank()) url = "http://localhost:8000";
    }
}
