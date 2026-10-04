package com.auctionpromax.identityprofileservice.adapter.out.observability.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandObservabilityPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandObservation;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
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
    logObservation("identity_sample.recorded", "Identity profile sample recorded", observation);
  }

  @Override
  public void sampleReplayed(SampleCommandObservation observation) {
    meterRegistry.counter("identity.sample.idempotency.replays").increment();
    logObservation("identity_sample.replayed", "Identity profile sample replayed", observation);
  }

  private void logObservation(String event, String message, SampleCommandObservation observation) {
    String previousCorrelation = MDC.get("correlationId");
    try {
      // ECS already includes MDC: adding this key again as a fluent pair breaks encoding.
      MDC.put("correlationId", observation.correlationId());
      log.atInfo()
          .addKeyValue("event", event)
          .addKeyValue("idempotencyFingerprint", observation.idempotencyFingerprint())
          .addKeyValue("outboxEventId", observation.outboxEventId())
          .log(message);
    } finally {
      if (previousCorrelation == null) {
        MDC.remove("correlationId");
      } else {
        MDC.put("correlationId", previousCorrelation);
      }
    }
  }
}
