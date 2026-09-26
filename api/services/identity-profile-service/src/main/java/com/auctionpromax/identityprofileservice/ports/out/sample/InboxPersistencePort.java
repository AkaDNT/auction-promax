package com.auctionpromax.identityprofileservice.ports.out.sample;

import java.time.Instant;

public interface InboxPersistencePort {

  boolean recordOnce(OutboxDelivery delivery, Instant receivedAt);
}
