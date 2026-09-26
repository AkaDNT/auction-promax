package com.auctionpromax.identityprofileservice.domain.idempotency;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IdempotencyKeyTest {

  @ParameterizedTest
  @NullAndEmptySource
  @ValueSource(strings = {
      " ",
      "   ",
      "\t",
      "\r",
      "\n"
  })
  void rejectsMissingEmptyOrWhitespaceOnlyKey(String rawKey) {
    assertThatThrownBy(() -> IdempotencyKey.from(rawKey))
        .isInstanceOf(InvalidIdempotencyKeyException.class)
        .hasMessage("Invalid idempotency key");
  }

  @ParameterizedTest
  @ValueSource(strings = {
      "contains space",
      "contains/slash",
      "contains+plus",
      "contains=equals",
      "contains@at",
      "contains?question",
      "contains#hash",
      "contains\u00A0nonBreakingSpace",
      "unicode-\u0111"
  })
  void rejectsCharactersOutsideRegisteredSafeSet(String rawKey) {
    assertThatThrownBy(() -> IdempotencyKey.from(rawKey))
        .isInstanceOf(InvalidIdempotencyKeyException.class)
        .hasMessage("Invalid idempotency key");
  }

  @Test
  void rejectsKeyLongerThan128CharactersWithoutEchoingIt() {
    String oversizedKey = "a".repeat(129);

    assertThatThrownBy(() -> IdempotencyKey.from(oversizedKey))
        .isInstanceOf(InvalidIdempotencyKeyException.class)
        .hasMessage("Invalid idempotency key");
  }

  @ParameterizedTest
  @ValueSource(strings = {
      "a",
      "A",
      "sample-key",
      "sample_key",
      "sample.key",
      "sample:key",
      "T06-2026_08.26:request-001",
      "a1234567890",
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      "abcdefghijklmnopqrstuvwxyz"
  })
  void acceptsRegisteredSafeKeysAndExposesOnlySha256Digest(String rawKey) {
    IdempotencyKey key = IdempotencyKey.from(rawKey);

    assertThat(key.digest())
        .matches("[0-9a-f]{64}")
        .isNotEqualTo(rawKey);

    assertThat(key).hasToString("IdempotencyKey[redacted]");
  }

  @ParameterizedTest
  @ValueSource(strings = {
      "-sample",
      "_sample",
      ".sample",
      ":sample"
  })
  void acceptsRegisteredPunctuationAtFirstPosition(String rawKey) {
    IdempotencyKey key = IdempotencyKey.from(rawKey);

    assertThat(key.digest()).matches("[0-9a-f]{64}");
  }

  @Test
  void acceptsExactly128Characters() {
    String maximumLengthKey = "a".repeat(128);

    IdempotencyKey key = IdempotencyKey.from(maximumLengthKey);

    assertThat(key.digest()).matches("[0-9a-f]{64}");
  }

  @Test
  void isCaseSensitive() {
    IdempotencyKey lowercase = IdempotencyKey.from("sample-key");
    IdempotencyKey uppercase = IdempotencyKey.from("SAMPLE-KEY");

    assertThat(lowercase).isNotEqualTo(uppercase);
    assertThat(lowercase.digest()).isNotEqualTo(uppercase.digest());
  }

  @Test
  void doesNotTrimTheKey() {
    assertThatThrownBy(() -> IdempotencyKey.from(" sample-key "))
        .isInstanceOf(InvalidIdempotencyKeyException.class);
  }

  @Test
  void sameRawKeyHasSameValueObjectIdentity() {
    IdempotencyKey first = IdempotencyKey.from("stable-key-001");
    IdempotencyKey second = IdempotencyKey.from("stable-key-001");

    assertThat(first)
        .isEqualTo(second)
        .hasSameHashCodeAs(second);

    assertThat(first.digest()).isEqualTo(second.digest());
  }

  @Test
  void computesSha256DigestFromRawKey() {
    IdempotencyKey key = IdempotencyKey.from("stable-key-001");

    assertThat(key.digest()).isEqualTo(
        "9cd153607af6ff26c2256d9765419995aedd8838bfa92345926794d7603987e6"
    );
  }

  @Test
  void toStringDoesNotExposeKeyMaterial() {
    IdempotencyKey key = IdempotencyKey.from("sensitive-key-001");

    assertThat(key).hasToString("IdempotencyKey[redacted]");
  }

  @Test
  void exceptionNeverContainsRejectedRawValue() {
    String rejectedKey = "sensitive invalid value";

    assertThatThrownBy(() -> IdempotencyKey.from(rejectedKey))
        .isInstanceOf(InvalidIdempotencyKeyException.class)
        .hasMessage("Invalid idempotency key")
        .hasMessageNotContaining(rejectedKey);
  }
}
