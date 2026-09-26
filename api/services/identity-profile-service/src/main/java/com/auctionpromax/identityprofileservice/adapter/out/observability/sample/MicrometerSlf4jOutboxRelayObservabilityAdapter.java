package com.auctionpromax.identityprofileservice.adapter.out.observability.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayObservation;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayObservabilityPort;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "auction.sample-flow.enabled", havingValue = "true")
public class MicrometerSlf4jOutboxRelayObservabilityAdapter
    implements OutboxRelayObservabilityPort {

  private static final Logger log = LoggerFactory.getLogger(
      MicrometerSlf4jOutboxRelayObservabilityAdapter.class);

  private final MeterRegistry meterRegistry;

  public MicrometerSlf4jOutboxRelayObservabilityAdapter(MeterRegistry meterRegistry) {
    this.meterRegistry = meterRegistry;
  }

  @Override
  public void relayAttempted(OutboxRelayObservation observation) {
    meterRegistry.counter("identity.sample.outbox.relay.attempts").increment();
  }

  @Override
  public void relayPublished(OutboxRelayObservation observation) {
    meterRegistry.counter("identity.sample.outbox.published").increment();
    meterRegistry.counter("identity.sample.outbox.processed").increment();
    log.atInfo()
        .addKeyValue("event", "outbox.relay.published")
        .addKeyValue("correlationId", observation.correlationId())
        .addKeyValue("outboxEventId", observation.outboxEventId())
        .addKeyValue("relayAttempt", observation.relayAttempt())
        .addKeyValue("inboxReceiptId", observation.outboxEventId())
        .log("Outbox event delivered locally");
  }

  @Override
  public void relayFailed(OutboxRelayObservation observation, String errorCode) {
    meterRegistry.counter("identity.sample.outbox.failed").increment();
    log.atWarn()
        .addKeyValue("event", "outbox.relay.failed")
        .addKeyValue("correlationId", observation.correlationId())
        .addKeyValue("outboxEventId", observation.outboxEventId())
        .addKeyValue("relayAttempt", observation.relayAttempt())
        .addKeyValue("errorCode", errorCode)
        .log("Outbox event remains retryable");
  }
}
