package com.auctionpromax.identityprofileservice.adapter.out.observability.sample;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JdbcOutboxStateMetricsAdapterTest {

  @Test
  void exposesLowCardinalityDatabaseBackedStateGauges() {
    JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    when(jdbcTemplate.queryForObject(anyString(), eq(Long.class), eq("PENDING")))
        .thenReturn(2L);
    when(jdbcTemplate.queryForObject(anyString(), eq(Long.class), eq("FAILED")))
        .thenReturn(1L);
    when(jdbcTemplate.queryForObject(anyString(), eq(Long.class), eq("PUBLISHED")))
        .thenReturn(5L);
    var registry = new SimpleMeterRegistry();

    new JdbcOutboxStateMetricsAdapter(jdbcTemplate, registry);

    assertGauge(registry, "identity.sample.outbox.pending", 2.0);
    assertGauge(registry, "identity.sample.outbox.failed.current", 1.0);
    assertGauge(registry, "identity.sample.outbox.processed.current", 5.0);
  }

  private void assertGauge(SimpleMeterRegistry registry, String name, double expected) {
    var gauge = registry.get(name).gauge();
    assertThat(gauge.value()).isEqualTo(expected);
    assertThat(gauge.getId().getTags()).isEmpty();
  }
}
