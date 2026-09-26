package com.auctionpromax.identityprofileservice.adapter.out.observability.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.InboxObservation;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.UUID;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MicrometerSlf4jInboxObservabilityAdapterTest {

  @Test
  void recordsProcessedAndDuplicateCountersWithoutIdentifierTags() {
    var meterRegistry = new SimpleMeterRegistry();
    var adapter = new MicrometerSlf4jInboxObservabilityAdapter(meterRegistry);
    UUID eventId = UUID.fromString("0192f1c0-0000-7000-8000-000000000070");
    var observation = new InboxObservation(
        "t06-correlation-001",
        eventId,
        eventId,
        eventId);

    adapter.eventApplied(observation);
    adapter.duplicateIgnored(observation);

    assertCounter(meterRegistry, "identity.sample.inbox.processed");
    assertCounter(meterRegistry, "identity.sample.inbox.duplicates");
  }

  private void assertCounter(SimpleMeterRegistry meterRegistry, String name) {
    var counter = meterRegistry.get(name).counter();
    assertThat(counter.count()).isEqualTo(1.0);
    assertThat(counter.getId().getTags()).isEmpty();
  }
}
