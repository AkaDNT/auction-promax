package com.auctionpromax.identityprofileservice.ports.in.sample;

import java.util.UUID;

public record CreateSampleCommand(
    String idempotencyKey,
    String purpose,
    UUID sampleRequestId,
    String correlationId) {
}
