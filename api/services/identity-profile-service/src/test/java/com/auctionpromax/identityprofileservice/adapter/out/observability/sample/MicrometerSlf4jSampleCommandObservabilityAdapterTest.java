package com.auctionpromax.identityprofileservice.adapter.out.observability.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandObservation;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.UUID;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MicrometerSlf4jSampleCommandObservabilityAdapterTest {

  private static final UUID EVENT_ID =
      UUID.fromString("0192f1c0-0000-7000-8000-000000000030");

  @Test
  void incrementsReplayCounterOnlyForReplayObservation() {
    var meterRegistry = new SimpleMeterRegistry();
    var adapter = new MicrometerSlf4jSampleCommandObservabilityAdapter(meterRegistry);
    var observation = new SampleCommandObservation(
        "t06-correlation-001",
        "0123456789ab",
        EVENT_ID);

    adapter.sampleRecorded(observation);

    assertThat(meterRegistry.find("identity.sample.idempotency.replays").counter()).isNull();

    adapter.sampleReplayed(observation);
    adapter.sampleReplayed(observation);

    assertThat(meterRegistry.counter("identity.sample.idempotency.replays").count())
        .isEqualTo(2.0);
  }
}
