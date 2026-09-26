package com.auctionpromax.identityprofileservice.ports.out.sample;

public interface InboxObservabilityPort {

  void eventApplied(InboxObservation observation);

  void duplicateIgnored(InboxObservation observation);
}
