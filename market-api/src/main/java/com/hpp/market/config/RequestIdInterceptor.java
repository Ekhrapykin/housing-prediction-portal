package com.hpp.market.config;

import java.io.IOException;
import org.slf4j.MDC;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;

/** Forwards the current request's id (set by {@link RequestIdFilter}) to ml-api so both services log the same one. */
public class RequestIdInterceptor implements ClientHttpRequestInterceptor {
    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution)
            throws IOException {
        String id = MDC.get(RequestIdFilter.MDC_KEY);
        if (id != null) request.getHeaders().set(RequestIdFilter.HEADER, id);
        return execution.execute(request, body);
    }
}
