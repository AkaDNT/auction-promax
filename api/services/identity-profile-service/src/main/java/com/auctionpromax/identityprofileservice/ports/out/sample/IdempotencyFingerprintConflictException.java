package com.auctionpromax.identityprofileservice.ports.out.sample;

public final class IdempotencyFingerprintConflictException extends RuntimeException {

  public IdempotencyFingerprintConflictException() {
    super("Stored idempotency fingerprint does not match the request fingerprint.");
  }
}
