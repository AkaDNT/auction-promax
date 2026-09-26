package com.auctionpromax.identityprofileservice.adapter.out.observability.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandObservabilityPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandObservation;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "auction.sample-flow.enabled", havingValue = "true")
public class MicrometerSlf4jSampleCommandObservabilityAdapter
    implements SampleCommandObservabilityPort {

  private static final Logger log = LoggerFactory.getLogger(
      MicrometerSlf4jSampleCommandObservabilityAdapter.class);

  private final MeterRegistry meterRegistry;

  public MicrometerSlf4jSampleCommandObservabilityAdapter(MeterRegistry meterRegistry) {
    this.meterRegistry = meterRegistry;
  }

  @Override
  public void sampleRecorded(SampleCommandObservation observation) {
    log.atInfo()
        .addKeyValue("event", "identity_sample.recorded")
        .addKeyValue("correlationId", observation.correlationId())
        .addKeyValue("idempotencyFingerprint", observation.idempotencyFingerprint())
        .addKeyValue("outboxEventId", observation.outboxEventId())
        .log("Identity profile sample recorded");
  }

  @Override
  public void sampleReplayed(SampleCommandObservation observation) {
    meterRegistry.counter("identity.sample.idempotency.replays").increment();
    log.atInfo()
        .addKeyValue("event", "identity_sample.replayed")
        .addKeyValue("correlationId", observation.correlationId())
        .addKeyValue("idempotencyFingerprint", observation.idempotencyFingerprint())
        .addKeyValue("outboxEventId", observation.outboxEventId())
        .log("Identity profile sample replayed");
  }
}
