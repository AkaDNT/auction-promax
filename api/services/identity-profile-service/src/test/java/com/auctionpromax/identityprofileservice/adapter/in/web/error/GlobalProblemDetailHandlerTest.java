package com.auctionpromax.identityprofileservice.adapter.in.web.error;

import com.auctionpromax.identityprofileservice.adapter.in.web.correlation.CorrelationIdFilter;
import org.junit.jupiter.api.Test;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalProblemDetailHandlerTest {

  private final GlobalProblemDetailHandler handler = new GlobalProblemDetailHandler();

  @Test
  void sanitizesUnexpectedException() {
    MockHttpServletRequest request = new MockHttpServletRequest(
        "POST",
        "/internal/technical-baseline/validate");
    request.setAttribute(
        CorrelationIdFilter.REQUEST_ATTRIBUTE_NAME,
        "t03-error-001");

    ResponseEntity<ProblemDetail> response = handler.handleUnexpectedException(
        new IllegalStateException("password=should-not-leak"),
        request);

    assertThat(response.getStatusCode().value()).isEqualTo(500);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getDetail())
        .isEqualTo("The request could not be processed.");
    assertThat(response.getBody().getProperties())
        .containsEntry("correlationId", "t03-error-001");
    assertThat(response.getBody().getDetail())
        .doesNotContain("password")
        .doesNotContain("should-not-leak");
  }
}