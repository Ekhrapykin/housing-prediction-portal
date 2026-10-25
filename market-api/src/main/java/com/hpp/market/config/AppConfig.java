package com.hpp.market.config;

import java.net.http.HttpClient;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.ClientHttpRequestFactorySettings;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@EnableCaching
@EnableConfigurationProperties(MlProperties.class)
public class AppConfig {

    @Bean
    RestClient mlRestClient(MlProperties props, RestClient.Builder builder) {
        var settings = ClientHttpRequestFactorySettings.defaults()
                .withConnectTimeout(props.connectTimeout())
                .withReadTimeout(props.readTimeout());
        return builder.baseUrl(props.url())
                .requestFactory(ClientHttpRequestFactoryBuilder.jdk()
                        // uvicorn rejects the JDK client's default h2c upgrade request
                        .withHttpClientCustomizer(c -> c.version(HttpClient.Version.HTTP_1_1))
                        .build(settings))
                .build();
    }
}
