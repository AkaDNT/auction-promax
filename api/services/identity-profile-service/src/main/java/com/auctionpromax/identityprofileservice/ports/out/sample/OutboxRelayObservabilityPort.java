package com.auctionpromax.identityprofileservice.ports.out.sample;

public interface OutboxRelayObservabilityPort {

  void relayAttempted(OutboxRelayObservation observation);

  void relayPublished(OutboxRelayObservation observation);

  void relayFailed(OutboxRelayObservation observation, String errorCode);
}
