package com.auctionpromax.identityprofileservice.adapter.out.delivery.sample;

import com.auctionpromax.identityprofileservice.ports.in.sample.SampleEventHandler;
import com.auctionpromax.identityprofileservice.ports.out.sample.LocalEventDeliveryPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxDelivery;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "auction.sample-flow.enabled", havingValue = "true")
public class LocalSampleEventDeliveryAdapter implements LocalEventDeliveryPort {

  private final SampleEventHandler eventHandler;

  public LocalSampleEventDeliveryAdapter(SampleEventHandler eventHandler) {
    this.eventHandler = eventHandler;
  }

  @Override
  public void deliver(OutboxDelivery delivery) {
    eventHandler.accept(delivery);
  }
}
