package com.hpp.market.exception;

import org.springframework.http.HttpStatus;

public class UpstreamErrorException extends ApiException {
    public UpstreamErrorException(String detail) {
        super(HttpStatus.BAD_GATEWAY, detail);
    }
}
