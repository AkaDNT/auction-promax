package com.auctionpromax.identityprofileservice.application.sample;

public final class RequestFingerprint {
  private final String value;

  RequestFingerprint(String value) {
    this.value = value;
  }

  public String value() {
    return value;
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof RequestFingerprint that)) {
      return false;
    }
    return value.equals(that.value);
  }

  @Override
  public int hashCode() {
    return value.hashCode();
  }

  @Override
  public String toString() {
    return "RequestFingerprint[redacted]";
  }
}
