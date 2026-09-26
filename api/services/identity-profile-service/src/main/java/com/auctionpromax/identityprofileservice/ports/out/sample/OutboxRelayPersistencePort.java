package com.auctionpromax.identityprofileservice.ports.out.sample;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface OutboxRelayPersistencePort {

  Optional<OutboxDelivery> claimNext();

  void markPublished(UUID eventId, Instant publishedAt);

  void markFailed(UUID eventId, Instant nextAttemptAt, String errorCode);
}
