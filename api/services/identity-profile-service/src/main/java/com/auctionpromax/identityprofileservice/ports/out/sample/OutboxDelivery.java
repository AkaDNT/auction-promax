package com.auctionpromax.identityprofileservice.ports.out.sample;

import java.util.UUID;

public record OutboxDelivery(
    UUID eventId,
    UUID sampleId,
    String correlationId,
    String payload,
    int attempt) {
}
