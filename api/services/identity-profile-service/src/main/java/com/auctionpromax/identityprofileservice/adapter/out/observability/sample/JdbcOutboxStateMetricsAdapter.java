package com.auctionpromax.identityprofileservice.adapter.out.observability.sample;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "auction.sample-flow.enabled", havingValue = "true")
public class JdbcOutboxStateMetricsAdapter {

  private static final String COUNT_BY_STATUS = """
      SELECT count(*)
      FROM identity.outbox_event
      WHERE status = ?
      """;

  public JdbcOutboxStateMetricsAdapter(
      JdbcTemplate jdbcTemplate,
      MeterRegistry meterRegistry) {
    registerGauge(meterRegistry, jdbcTemplate, "identity.sample.outbox.pending", "PENDING");
    registerGauge(meterRegistry, jdbcTemplate, "identity.sample.outbox.failed.current", "FAILED");
    registerGauge(
        meterRegistry,
        jdbcTemplate,
        "identity.sample.outbox.processed.current",
        "PUBLISHED");
  }

  private static void registerGauge(
      MeterRegistry meterRegistry,
      JdbcTemplate jdbcTemplate,
      String metricName,
      String status) {
    Gauge.builder(metricName, jdbcTemplate, database -> count(database, status))
        .description("Current number of sample outbox rows in the " + status + " state")
        .register(meterRegistry);
  }

  private static double count(JdbcTemplate jdbcTemplate, String status) {
    Long value = jdbcTemplate.queryForObject(COUNT_BY_STATUS, Long.class, status);
    return value == null ? 0.0 : value.doubleValue();
  }
}
