package com.auctionpromax.identityprofileservice.application.sample;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RequestFingerprintTest {

    private static final String FIRST_DIGEST = "a".repeat(64);
    private static final String SECOND_DIGEST = "b".repeat(64);

    @Test
    void sameValueProducesEqualValueObjects() {
        RequestFingerprint first = new RequestFingerprint(FIRST_DIGEST);
        RequestFingerprint second = new RequestFingerprint(FIRST_DIGEST);

        assertThat(first).isEqualTo(second);
    }

    @Test
    void differentValuesProduceDifferentValueObjects() {
        RequestFingerprint first = new RequestFingerprint(FIRST_DIGEST);
        RequestFingerprint second = new RequestFingerprint(SECOND_DIGEST);

        assertThat(first).isNotEqualTo(second);
    }

    @Test
    void equalValuesHaveSameHashCode() {
        RequestFingerprint first = new RequestFingerprint(FIRST_DIGEST);
        RequestFingerprint second = new RequestFingerprint(FIRST_DIGEST);

        assertThat(first).hasSameHashCodeAs(second);
    }

    @Test
    void toStringIsRedacted() {
        RequestFingerprint fingerprint = new RequestFingerprint(FIRST_DIGEST);

        assertThat(fingerprint).hasToString("RequestFingerprint[redacted]");
        assertThat(fingerprint.toString()).doesNotContain(FIRST_DIGEST);
    }
}
