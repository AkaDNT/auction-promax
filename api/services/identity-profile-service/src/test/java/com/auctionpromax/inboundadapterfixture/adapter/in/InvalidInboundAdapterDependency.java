package com.auctionpromax.inboundadapterfixture.adapter.in;

import com.auctionpromax.identityprofileservice.application.sample.CreateSampleService;

final class InvalidInboundAdapterDependency {

  private final CreateSampleService service;

  InvalidInboundAdapterDependency(CreateSampleService service) {
    this.service = service;
  }
}
