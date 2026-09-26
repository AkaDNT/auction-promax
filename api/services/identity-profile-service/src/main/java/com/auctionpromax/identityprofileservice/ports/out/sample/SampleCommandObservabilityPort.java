package com.auctionpromax.identityprofileservice.ports.out.sample;

public interface SampleCommandObservabilityPort {

  void sampleRecorded(SampleCommandObservation observation);

  void sampleReplayed(SampleCommandObservation observation);
}
