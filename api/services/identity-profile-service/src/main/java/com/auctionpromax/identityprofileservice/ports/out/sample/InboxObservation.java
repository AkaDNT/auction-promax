package com.auctionpromax.identityprofileservice.ports.out.sample;

import java.util.UUID;

public record InboxObservation(
    String correlationId,
    UUID outboxEventId,
    UUID inboxReceiptId,
    UUID inboxEffectId) {
}
