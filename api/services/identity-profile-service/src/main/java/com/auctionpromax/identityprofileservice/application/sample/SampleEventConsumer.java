package com.auctionpromax.identityprofileservice.application.sample;

import com.auctionpromax.identityprofileservice.ports.in.sample.SampleEventHandler;
import com.auctionpromax.identityprofileservice.ports.out.sample.InboxObservation;
import com.auctionpromax.identityprofileservice.ports.out.sample.InboxObservabilityPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.InboxPersistencePort;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxDelivery;
import java.time.Clock;

public class SampleEventConsumer implements SampleEventHandler {

  private final InboxPersistencePort persistencePort;
  private final InboxObservabilityPort observabilityPort;
  private final Clock clock;

  public SampleEventConsumer(
      InboxPersistencePort persistencePort,
      InboxObservabilityPort observabilityPort,
      Clock clock) {
    this.persistencePort = persistencePort;
    this.observabilityPort = observabilityPort;
    this.clock = clock;
  }

  @Override
  public boolean accept(OutboxDelivery delivery) {
    boolean applied = persistencePort.recordOnce(delivery, clock.instant());
    var observation = new InboxObservation(
        delivery.correlationId(),
        delivery.eventId(),
        delivery.eventId(),
        delivery.eventId());
    if (applied) {
      observabilityPort.eventApplied(observation);
    } else {
      observabilityPort.duplicateIgnored(observation);
    }
    return applied;
  }
}
