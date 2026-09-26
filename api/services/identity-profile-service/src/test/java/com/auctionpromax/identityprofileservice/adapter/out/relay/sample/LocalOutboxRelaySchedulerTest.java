package com.auctionpromax.identityprofileservice.adapter.out.relay.sample;

import com.auctionpromax.identityprofileservice.ports.in.sample.OutboxRelayUseCase;
import org.junit.jupiter.api.Test;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class LocalOutboxRelaySchedulerTest {

  @Test
  void scheduledPollDelegatesOneClaimToTheUseCase() {
    OutboxRelayUseCase relay = mock(OutboxRelayUseCase.class);

    new LocalOutboxRelayScheduler(relay).pollOnce();

    verify(relay).relayOne();
  }
}
