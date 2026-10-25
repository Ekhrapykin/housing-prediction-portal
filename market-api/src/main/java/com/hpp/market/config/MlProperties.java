package com.hpp.market.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ml.api")
public record MlProperties(String url, Duration connectTimeout, Duration readTimeout) {}
