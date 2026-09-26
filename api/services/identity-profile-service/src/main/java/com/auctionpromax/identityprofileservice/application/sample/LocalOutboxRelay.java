package com.auctionpromax.identityprofileservice.application.sample;

import com.auctionpromax.identityprofileservice.ports.in.sample.OutboxRelayUseCase;
import com.auctionpromax.identityprofileservice.ports.out.sample.LocalEventDeliveryPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxDelivery;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayObservation;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayObservabilityPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayPersistencePort;
import java.time.Clock;
import java.time.Instant;
import java.util.function.LongUnaryOperator;

public class LocalOutboxRelay implements OutboxRelayUseCase {

  static final String LOCAL_DELIVERY_FAILED = "LOCAL_DELIVERY_FAILED";

  private final OutboxRelayPersistencePort persistencePort;
  private final LocalEventDeliveryPort deliveryPort;
  private final OutboxRelayObservabilityPort observabilityPort;
  private final Clock clock;
  private final LongUnaryOperator retryJitterSeconds;

  public LocalOutboxRelay(
      OutboxRelayPersistencePort persistencePort,
      LocalEventDeliveryPort deliveryPort,
      OutboxRelayObservabilityPort observabilityPort,
      Clock clock,
      LongUnaryOperator retryJitterSeconds) {
    this.persistencePort = persistencePort;
    this.deliveryPort = deliveryPort;
    this.observabilityPort = observabilityPort;
    this.clock = clock;
    this.retryJitterSeconds = retryJitterSeconds;
  }

  @Override
  public boolean relayOne() {
    OutboxDelivery delivery = persistencePort.claimNext().orElse(null);
    if (delivery == null) {
      return false;
    }

    var observation = new OutboxRelayObservation(
        delivery.correlationId(),
        delivery.eventId(),
        delivery.attempt());
    observabilityPort.relayAttempted(observation);

    try {
      deliveryPort.deliver(delivery);
      persistencePort.markPublished(delivery.eventId(), clock.instant());
      observabilityPort.relayPublished(observation);
      return true;
    } catch (RuntimeException exception) {
      long baseBackoff = backoffSeconds(delivery.attempt());
      long jitter = Math.max(0, retryJitterSeconds.applyAsLong(baseBackoff));
      Instant nextAttemptAt = clock.instant().plusSeconds(Math.min(300, baseBackoff + jitter));
      persistencePort.markFailed(
          delivery.eventId(),
          nextAttemptAt,
          LOCAL_DELIVERY_FAILED);
      observabilityPort.relayFailed(observation, LOCAL_DELIVERY_FAILED);
      return false;
    }
  }

  static long backoffSeconds(int attempt) {
    int safeAttempt = Math.max(1, attempt);
    return Math.min(300, 1L << Math.min(safeAttempt - 1, 30));
  }
}
