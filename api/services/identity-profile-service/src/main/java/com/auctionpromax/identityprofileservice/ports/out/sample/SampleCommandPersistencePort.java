package com.auctionpromax.identityprofileservice.ports.out.sample;

public interface SampleCommandPersistencePort {

  PersistSampleResult persist(PersistSampleCommand command);
}
