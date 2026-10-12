package com.auctionpromax.foundationfixtures.application;

import com.auctionpromax.biddingservice.adapter.in.web.TechnicalValidationRequest;

final class InvalidAdapterDependency {
    private final TechnicalValidationRequest request;
    InvalidAdapterDependency(TechnicalValidationRequest request) { this.request = request; }
}
