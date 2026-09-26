package com.auctionpromax.identityprofileservice.application.sample;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SampleRequestFingerprintTest {

    private static final String PURPOSE = "PHASE_0_BASELINE";

    @Test
    void sameCanonicalRequestProducesEqualValueObjects() {
        UUID requestId = UUID.fromString("0192f1c0-0000-7000-8000-000000000002");

        RequestFingerprint first = SampleRequestFingerprint.from(PURPOSE, requestId);
        RequestFingerprint second = SampleRequestFingerprint.from(PURPOSE, requestId);

        assertThat(first)
                .isEqualTo(second)
                .hasSameHashCodeAs(second);

        assertThat(first.value())
                .isEqualTo(second.value())
                .matches("[0-9a-f]{64}");
    }

    @Test
    void differentSampleRequestIdProducesDifferentFingerprint() {
        UUID firstRequestId = UUID.fromString("0192f1c0-0000-7000-8000-000000000002");
        UUID secondRequestId = UUID.fromString("0192f1c0-0000-7000-8000-000000000003");

        RequestFingerprint first = SampleRequestFingerprint.from(PURPOSE, firstRequestId);
        RequestFingerprint second = SampleRequestFingerprint.from(PURPOSE, secondRequestId);

        assertThat(first).isNotEqualTo(second);
        assertThat(first.value()).isNotEqualTo(second.value());
    }

    @Test
    void absentSampleRequestIdIsDeterministic() {
        RequestFingerprint first = SampleRequestFingerprint.from(PURPOSE, null);
        RequestFingerprint second = SampleRequestFingerprint.from(PURPOSE, null);

        assertThat(first).isEqualTo(second);
        assertThat(first.value()).matches("[0-9a-f]{64}");
    }

    @Test
    void absentAndPresentSampleRequestIdAreDifferentRequests() {
        UUID requestId = UUID.fromString("0192f1c0-0000-7000-8000-000000000002");

        RequestFingerprint absent = SampleRequestFingerprint.from(PURPOSE, null);
        RequestFingerprint present = SampleRequestFingerprint.from(PURPOSE, requestId);

        assertThat(absent).isNotEqualTo(present);
        assertThat(absent.value()).isNotEqualTo(present.value());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {
            " ",
            "   ",
            "\t",
            "ANOTHER_PURPOSE",
            "phase_0_baseline",
            "PHASE_0_BASELINE ",
            " PHASE_0_BASELINE"
    })
    void rejectsMissingBlankOrUnsupportedPurpose(String purpose) {
        UUID requestId = UUID.fromString("0192f1c0-0000-7000-8000-000000000002");

        assertThatThrownBy(() -> SampleRequestFingerprint.from(purpose, requestId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Unsupported sample purpose");
    }

    @Test
    void producesExpectedFingerprintForKnownCanonicalRequest() {
        UUID requestId = UUID.fromString("0192f1c0-0000-7000-8000-000000000002");

        RequestFingerprint fingerprint = SampleRequestFingerprint.from(PURPOSE, requestId);

        assertThat(fingerprint.value()).isEqualTo(
                "46a81d4d5c5fa9f5e51389384782425c5be1f1f15dc199ce192fc83de60269e8"
        );
    }

    @Test
    void producesExpectedFingerprintWhenSampleRequestIdIsAbsent() {
        RequestFingerprint fingerprint = SampleRequestFingerprint.from(PURPOSE, null);

        assertThat(fingerprint.value()).isEqualTo(
                "ee59efe38d110eb5045ece8b13176e2b47de6bb004a37f30b068d9905fe51ffa"
        );
    }

    @Test
    void toStringDoesNotExposeCanonicalRequestContent() {
        UUID requestId = UUID.fromString("0192f1c0-0000-7000-8000-000000000002");

        RequestFingerprint fingerprint = SampleRequestFingerprint.from(PURPOSE, requestId);

        assertThat(fingerprint).hasToString("RequestFingerprint[redacted]");
    }
}
