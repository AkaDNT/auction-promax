package com.auctionpromax.identityprofileservice.ports.out.sample;

import java.util.UUID;

public record SampleCommandObservation(
    String correlationId,
    String idempotencyFingerprint,
    UUID outboxEventId) {
}
