package com.auctionpromax.identityprofileservice.ports.in.sample;

public final class IdempotencyKeyReusedException extends RuntimeException {

  public IdempotencyKeyReusedException() {
    super("The idempotency key was already used for a different request.");
  }
}
