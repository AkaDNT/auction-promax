package com.auctionpromax.identityprofileservice.adapter.in.web.correlation;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

  public static final String HEADER_NAME = "X-Correlation-Id";
  public static final String MDC_KEY = "correlationId";
  public static final String REQUEST_ATTRIBUTE_NAME = "correlationId";

  private static final Pattern VALID_CORRELATION_ID = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$");

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    String correlationId = resolveCorrelationId(request.getHeader(HEADER_NAME));

    request.setAttribute(REQUEST_ATTRIBUTE_NAME, correlationId);
    response.setHeader(HEADER_NAME, correlationId);
    MDC.put(MDC_KEY, correlationId);

    try {
      filterChain.doFilter(request, response);
    } finally {
      MDC.remove(MDC_KEY);
    }
  }

  private String resolveCorrelationId(String suppliedCorrelationId) {
    if (suppliedCorrelationId != null
        && VALID_CORRELATION_ID.matcher(suppliedCorrelationId).matches()) {
      return suppliedCorrelationId;
    }

    return UUID.randomUUID().toString();
  }
}