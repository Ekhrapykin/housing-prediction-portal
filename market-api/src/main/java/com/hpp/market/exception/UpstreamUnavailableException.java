package com.hpp.market.exception;

import org.springframework.http.HttpStatus;

public class UpstreamUnavailableException extends ApiException {
    public UpstreamUnavailableException(String detail) {
        super(HttpStatus.SERVICE_UNAVAILABLE, detail);
    }
}
