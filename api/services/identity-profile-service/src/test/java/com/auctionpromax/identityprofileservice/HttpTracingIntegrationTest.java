package com.auctionpromax.identityprofileservice;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.Filter;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
class HttpTracingIntegrationTest {
  @Test
  void extractsSuppliedW3cTraceAndStartsIndependentTraceForNextRequest() throws Exception {
    // Start production auto-configuration directly: test tracing imports must not mask missing modules.
    var application = new SpringApplication(IdentityProfileServiceApplication.class, CaptureConfiguration.class);
    application.setRegisterShutdownHook(false);
    application.setAdditionalProfiles("t03");
    application.setDefaultProperties(Map.of("server.address", "127.0.0.1", "server.port", "0",
        "management.tracing.export.otlp.enabled", "false", "management.otlp.metrics.export.enabled", "false",
        "management.logging.export.otlp.enabled", "false"));
    String suppliedTrace = "4bf92f3577b34da6a3ce929d0e0e4736";
    try (var context = application.run();
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()) {
      int port = context.getEnvironment().getRequiredProperty("local.server.port", Integer.class);
      var capture = context.getBean(CaptureConfiguration.class);
      send(client, port, "supplied", "00-" + suppliedTrace + "-00f067aa0ba902b7-01");
      send(client, port, "independent", null);
      assertThat(capture.traces.get("supplied")).isEqualTo(suppliedTrace);
      assertThat(capture.spans.get("supplied")).matches("[0-9a-f]{16}").isNotEqualTo("00f067aa0ba902b7");
      assertThat(capture.traces.get("independent")).matches("[0-9a-f]{32}").isNotEqualTo(suppliedTrace);
    }
  }

  private void send(HttpClient client, int port, String requestId, String traceparent) throws Exception {
    var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/actuator/health"))
        .timeout(Duration.ofSeconds(10)).header("X-Tracing-Test-Id", requestId);
    if (traceparent != null) request.header("traceparent", traceparent);
    assertThat(client.send(request.GET().build(), HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(200);
  }

  @TestConfiguration(proxyBeanMethods = false)
  static class CaptureConfiguration {
    final Map<String, String> traces = new ConcurrentHashMap<>();
    final Map<String, String> spans = new ConcurrentHashMap<>();

    @Bean
    FilterRegistrationBean<Filter> captureRequestTrace() {
      Filter filter = (request, response, chain) -> {
        String requestId = ((jakarta.servlet.http.HttpServletRequest) request).getHeader("X-Tracing-Test-Id");
        if (requestId != null) {
          String trace = MDC.get("traceId");
          String span = MDC.get("spanId");
          if (trace != null) traces.put(requestId, trace);
          if (span != null) spans.put(requestId, span);
        }
        chain.doFilter(request, response);
      };
      var registration = new FilterRegistrationBean<>(filter);
      registration.setOrder(Ordered.LOWEST_PRECEDENCE);
      return registration;
    }
  }
}
