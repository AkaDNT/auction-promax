package com.auctionpromax.identityprofileservice.ports.out.sample;

public interface LocalEventDeliveryPort {

  void deliver(OutboxDelivery delivery);
}
