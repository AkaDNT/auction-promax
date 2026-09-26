package com.auctionpromax.identityprofileservice.ports.in.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxDelivery;

public interface SampleEventHandler {

  boolean accept(OutboxDelivery delivery);
}
