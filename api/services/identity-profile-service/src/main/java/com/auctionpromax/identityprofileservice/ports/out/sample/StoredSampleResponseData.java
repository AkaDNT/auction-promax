package com.auctionpromax.identityprofileservice.ports.out.sample;

import java.util.UUID;

public record StoredSampleResponseData(UUID sampleId, String status) {
}
