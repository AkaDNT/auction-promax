package com.auctionpromax.identityprofileservice.domain.idempotency;

public final class InvalidIdempotencyKeyException extends RuntimeException {
  public InvalidIdempotencyKeyException() {
    super("Invalid idempotency key");
  }
}
