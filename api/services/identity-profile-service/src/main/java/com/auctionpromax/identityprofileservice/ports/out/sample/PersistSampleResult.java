package com.auctionpromax.identityprofileservice.ports.out.sample;

import java.util.UUID;

public record PersistSampleResult(UUID sampleId, UUID eventId, boolean replayed) {
}
