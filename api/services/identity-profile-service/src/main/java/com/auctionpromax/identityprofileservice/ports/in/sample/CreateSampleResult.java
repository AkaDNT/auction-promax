package com.auctionpromax.identityprofileservice.ports.in.sample;

import java.util.UUID;

public record CreateSampleResult(UUID sampleId, String status, boolean replayed) {
}
