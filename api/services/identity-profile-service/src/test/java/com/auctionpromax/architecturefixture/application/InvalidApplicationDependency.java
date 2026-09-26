package com.auctionpromax.architecturefixture.application;

import com.auctionpromax.identityprofileservice.adapter.in.web.baseline.TechnicalValidationRequest;

final class InvalidApplicationDependency {

  private final TechnicalValidationRequest request;

  InvalidApplicationDependency(TechnicalValidationRequest request) {
    this.request = request;
  }
}