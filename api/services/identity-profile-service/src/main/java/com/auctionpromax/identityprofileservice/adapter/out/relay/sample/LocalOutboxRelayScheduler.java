package com.auctionpromax.identityprofileservice.adapter.out.relay.sample;

import com.auctionpromax.identityprofileservice.ports.in.sample.OutboxRelayUseCase;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(
    name = "auction.sample-flow.relay.scheduler-enabled",
    havingValue = "true")
public class LocalOutboxRelayScheduler {

  private final OutboxRelayUseCase relay;

  public LocalOutboxRelayScheduler(OutboxRelayUseCase relay) {
    this.relay = relay;
  }

  @Scheduled(fixedDelayString = "${auction.sample-flow.relay.fixed-delay:1s}")
  void pollOnce() {
    relay.relayOne();
  }
}
