package com.auctionpromax.identityprofileservice.ports.out.sample;

import java.time.Instant;
import java.util.UUID;

public record SampleRecordedEventData(
    UUID eventId,
    UUID sampleId,
    UUID commandId,
    Instant occurredAt,
    String correlationId,
    String purpose) {
}
