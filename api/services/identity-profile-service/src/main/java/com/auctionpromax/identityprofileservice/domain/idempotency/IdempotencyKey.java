package com.auctionpromax.identityprofileservice.domain.idempotency;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.regex.Pattern;

public final class IdempotencyKey {
  private static final Pattern REGISTERED_SAFE_KEY = Pattern.compile("[A-Za-z0-9._:-]+");
  private static final int MAX_LENGTH = 128;
  private final String digest;

  private IdempotencyKey(String digest) {
    this.digest = digest;
  }

  public static IdempotencyKey from(String rawKey) {
    if (rawKey == null || rawKey.isBlank() || rawKey.length() > MAX_LENGTH) {
      throw new InvalidIdempotencyKeyException();
    }

    if (!REGISTERED_SAFE_KEY.matcher(rawKey).matches()) {
      throw new InvalidIdempotencyKeyException();
    }
    return new IdempotencyKey(sha256(rawKey));
  }

  private static String sha256(String value) {
    try {
      MessageDigest messageDigest = MessageDigest.getInstance("SHA-256");
      byte[] digestBytes = messageDigest.digest(value.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digestBytes);
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 algorithm is unavailable", exception);
    }
  }

  public String digest() {
    return digest;
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof IdempotencyKey that)) {
      return false;
    }
    return digest.equals(that.digest);
  }

  @Override
  public int hashCode() {
    return digest.hashCode();
  }

  @Override
  public String toString() {
    return "IdempotencyKey[redacted]";
  }
}
