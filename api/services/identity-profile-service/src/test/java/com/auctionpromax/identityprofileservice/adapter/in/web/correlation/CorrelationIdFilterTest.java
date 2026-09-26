package com.auctionpromax.identityprofileservice.adapter.in.web.correlation;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CorrelationIdFilterTest {

  private static final Pattern CORRELATION_ID_PATTERN = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$");

  private final CorrelationIdFilter filter = new CorrelationIdFilter();

  @AfterEach
  void clearMdc() {
    MDC.remove(CorrelationIdFilter.MDC_KEY);
  }

  @Test
  void preservesValidCorrelationId() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader(CorrelationIdFilter.HEADER_NAME, "t03-local-001");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response,
        (ignoredRequest, ignoredResponse) -> assertThat(MDC.get(CorrelationIdFilter.MDC_KEY))
            .isEqualTo("t03-local-001"));

    assertThat(response.getHeader(CorrelationIdFilter.HEADER_NAME))
        .isEqualTo("t03-local-001");
    assertThat(request.getAttribute(CorrelationIdFilter.REQUEST_ATTRIBUTE_NAME))
        .isEqualTo("t03-local-001");
  }

  @Test
  void generatesCorrelationIdWhenHeaderIsMissing() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
    });

    String correlationId = response.getHeader(CorrelationIdFilter.HEADER_NAME);

    assertThat(correlationId).matches(CORRELATION_ID_PATTERN);
    assertThat(request.getAttribute(CorrelationIdFilter.REQUEST_ATTRIBUTE_NAME))
        .isEqualTo(correlationId);
  }

  @Test
  void replacesMaliciousCorrelationId() throws Exception {
    String maliciousValue = "<script>alert(1)</script>";
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader(CorrelationIdFilter.HEADER_NAME, maliciousValue);
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
    });

    String correlationId = response.getHeader(CorrelationIdFilter.HEADER_NAME);

    assertThat(correlationId)
        .isNotEqualTo(maliciousValue)
        .matches(CORRELATION_ID_PATTERN);
  }

  @Test
  void replacesCorrelationIdLongerThanOneHundredTwentyEightCharacters() throws Exception {
    String tooLong = "a".repeat(129);
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader(CorrelationIdFilter.HEADER_NAME, tooLong);
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
    });

    assertThat(response.getHeader(CorrelationIdFilter.HEADER_NAME))
        .isNotEqualTo(tooLong)
        .matches(CORRELATION_ID_PATTERN);
  }

  @Test
  void replacesWhitespaceOnlyCorrelationId() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader(CorrelationIdFilter.HEADER_NAME, "   ");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
    });

    assertThat(response.getHeader(CorrelationIdFilter.HEADER_NAME))
        .matches(CORRELATION_ID_PATTERN);
  }

  @Test
  void removesCorrelationIdFromMdcAfterSuccessfulRequest() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
    });

    assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
  }

  @Test
  void removesCorrelationIdFromMdcWhenFilterChainThrowsException() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();

    assertThatThrownBy(() -> filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
      throw new ServletException("Expected test exception");
    })).isInstanceOf(ServletException.class);

    assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
  }
}