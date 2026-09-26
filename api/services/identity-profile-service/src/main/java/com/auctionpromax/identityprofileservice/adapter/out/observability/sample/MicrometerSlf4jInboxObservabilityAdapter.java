package com.auctionpromax.identityprofileservice.adapter.out.observability.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.InboxObservation;
import com.auctionpromax.identityprofileservice.ports.out.sample.InboxObservabilityPort;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "auction.sample-flow.enabled", havingValue = "true")
public class MicrometerSlf4jInboxObservabilityAdapter implements InboxObservabilityPort {

  private static final Logger log = LoggerFactory.getLogger(
      MicrometerSlf4jInboxObservabilityAdapter.class);

  private final MeterRegistry meterRegistry;

  public MicrometerSlf4jInboxObservabilityAdapter(MeterRegistry meterRegistry) {
    this.meterRegistry = meterRegistry;
  }

  @Override
  public void eventApplied(InboxObservation observation) {
    meterRegistry.counter("identity.sample.inbox.processed").increment();
    log.atInfo()
        .addKeyValue("event", "inbox.event.applied")
        .addKeyValue("correlationId", observation.correlationId())
        .addKeyValue("outboxEventId", observation.outboxEventId())
        .addKeyValue("inboxReceiptId", observation.inboxReceiptId())
        .addKeyValue("inboxEffectId", observation.inboxEffectId())
        .log("Inbox event effect applied");
  }

  @Override
  public void duplicateIgnored(InboxObservation observation) {
    meterRegistry.counter("identity.sample.inbox.duplicates").increment();
    log.atInfo()
        .addKeyValue("event", "inbox.event.duplicate")
        .addKeyValue("correlationId", observation.correlationId())
        .addKeyValue("outboxEventId", observation.outboxEventId())
        .addKeyValue("inboxReceiptId", observation.inboxReceiptId())
        .log("Duplicate inbox event ignored");
  }
}
