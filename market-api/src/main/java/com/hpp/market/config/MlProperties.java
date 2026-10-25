package com.hpp.market.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ml.api")
public record MlProperties(String url, Duration connectTimeout, Duration readTimeout) {
    public MlProperties {
        if (url == null || url.isBlank()) url = "http://localhost:8000";
        if (connectTimeout == null) connectTimeout = Duration.ofSeconds(2);
        if (readTimeout == null) readTimeout = Duration.ofSeconds(5);
    }
}
