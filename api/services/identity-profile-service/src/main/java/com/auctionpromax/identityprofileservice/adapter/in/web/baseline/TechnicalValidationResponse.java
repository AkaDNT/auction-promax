package com.auctionpromax.identityprofileservice.adapter.in.web.baseline;

public record TechnicalValidationResponse(
    boolean accepted,
    int valueLength) {
}