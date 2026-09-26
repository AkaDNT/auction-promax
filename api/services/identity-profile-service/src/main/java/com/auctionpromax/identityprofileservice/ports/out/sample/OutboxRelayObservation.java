package com.auctionpromax.identityprofileservice.ports.out.sample;

import java.util.UUID;

public record OutboxRelayObservation(
    String correlationId,
    UUID outboxEventId,
    int relayAttempt) {
}
