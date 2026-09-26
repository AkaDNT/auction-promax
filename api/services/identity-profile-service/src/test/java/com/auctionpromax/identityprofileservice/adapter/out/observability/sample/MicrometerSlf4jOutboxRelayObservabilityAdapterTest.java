package com.auctionpromax.identityprofileservice.adapter.out.observability.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayObservation;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.UUID;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MicrometerSlf4jOutboxRelayObservabilityAdapterTest {

  @Test
  void recordsAttemptPublishedAndFailedCountersWithoutIdentifierTags() {
    var meterRegistry = new SimpleMeterRegistry();
    var adapter = new MicrometerSlf4jOutboxRelayObservabilityAdapter(meterRegistry);
    var observation = new OutboxRelayObservation(
        "t06-correlation-001",
        UUID.fromString("0192f1c0-0000-7000-8000-000000000050"),
        2);

    adapter.relayAttempted(observation);
    adapter.relayPublished(observation);
    adapter.relayFailed(observation, "LOCAL_DELIVERY_FAILED");

    assertCounter(meterRegistry, "identity.sample.outbox.relay.attempts");
    assertCounter(meterRegistry, "identity.sample.outbox.published");
    assertCounter(meterRegistry, "identity.sample.outbox.processed");
    assertCounter(meterRegistry, "identity.sample.outbox.failed");
  }

  private void assertCounter(SimpleMeterRegistry meterRegistry, String name) {
    var counter = meterRegistry.get(name).counter();
    assertThat(counter.count()).isEqualTo(1.0);
    assertThat(counter.getId().getTags()).isEmpty();
  }
}
