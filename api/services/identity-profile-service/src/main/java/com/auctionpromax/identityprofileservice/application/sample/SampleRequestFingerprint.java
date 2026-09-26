package com.auctionpromax.identityprofileservice.application.sample;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

public final class SampleRequestFingerprint {
  private static final String SUPPORTED_PURPOSE = "PHASE_0_BASELINE";

  private SampleRequestFingerprint() {}

  public static RequestFingerprint from(String purpose, UUID sampleRequestId) {
    if (!SUPPORTED_PURPOSE.equals(purpose)) {
      throw new IllegalArgumentException("Unsupported sample purpose");
    }

    String canonicalRequest =
        "purpose="
            + purpose
            + "\n"
            + "sampleRequestId="
            + (sampleRequestId == null ? "" : sampleRequestId.toString())
            + "\n";

    return new RequestFingerprint(sha256(canonicalRequest));
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
}
