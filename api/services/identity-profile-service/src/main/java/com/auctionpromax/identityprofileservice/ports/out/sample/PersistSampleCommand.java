package com.auctionpromax.identityprofileservice.ports.out.sample;

import java.time.Instant;
import java.util.UUID;

public record PersistSampleCommand(
    String actorScope,
    String operationName,
    String keyDigest,
    String requestFingerprint,
    UUID sampleId,
    UUID commandId,
    UUID eventId,
    String purpose,
    String correlationId,
    String eventPayload,
    String responseBody,
    Instant occurredAt) {
}
