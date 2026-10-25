package com.hpp.market.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Reads or generates X-Request-ID, puts it in the MDC for the logs and for {@link
 * com.hpp.market.config.AppConfig}'s ml-api interceptor, and echoes it in the response.
 * Logs one line per request, like the Python services. The whole request runs
 * on one (virtual) thread, so the thread-bound MDC is visible to the RestClient call.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(RequestIdFilter.class);
    public static final String HEADER = "X-Request-ID";
    public static final String MDC_KEY = "requestId";
    // Only this shape is accepted from clients; anything else is replaced. Stops log injection.
    private static final Pattern VALID_ID = Pattern.compile("[A-Za-z0-9-]{1,64}");

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String incoming = req.getHeader(HEADER);
        String id = incoming != null && VALID_ID.matcher(incoming).matches() ? incoming : UUID.randomUUID().toString();
        MDC.put(MDC_KEY, id);
        res.setHeader(HEADER, id);
        long started = System.nanoTime();
        try {
            chain.doFilter(req, res);
        } finally {
            // The compose healthcheck polls /actuator/health every 10 s; logging it would bury real traffic.
            if (!req.getRequestURI().startsWith("/actuator/health")) {
                log.info("{} {} -> {} ({} ms)", req.getMethod(), req.getRequestURI(), res.getStatus(),
                        (System.nanoTime() - started) / 1_000_000);
            }
            MDC.remove(MDC_KEY);
        }
    }
}
