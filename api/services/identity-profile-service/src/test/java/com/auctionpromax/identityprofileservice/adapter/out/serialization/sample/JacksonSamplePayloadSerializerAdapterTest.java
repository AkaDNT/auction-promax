package com.auctionpromax.identityprofileservice.adapter.out.serialization.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.SampleRecordedEventData;
import com.auctionpromax.identityprofileservice.ports.out.sample.StoredSampleResponseData;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JacksonSamplePayloadSerializerAdapterTest {

  private static final UUID EVENT_ID =
      UUID.fromString("0192f1c0-0000-7000-8000-000000000020");
  private static final UUID SAMPLE_ID =
      UUID.fromString("0192f1c0-0000-7000-8000-000000000021");
  private static final UUID COMMAND_ID =
      UUID.fromString("0192f1c0-0000-7000-8000-000000000022");
  private static final Instant OCCURRED_AT = Instant.parse("2026-09-06T12:00:00Z");

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final JacksonSamplePayloadSerializerAdapter adapter =
      new JacksonSamplePayloadSerializerAdapter(objectMapper);

  @Test
  void serializesVersionedEventEnvelopeAndPayload() throws Exception {
    String serialized = adapter.serializeEvent(new SampleRecordedEventData(
        EVENT_ID,
        SAMPLE_ID,
        COMMAND_ID,
        OCCURRED_AT,
        "t06-correlation-001",
        "PHASE_0_BASELINE"));

    JsonNode event = objectMapper.readTree(serialized);

    assertThat(event.size()).isEqualTo(11);
    assertThat(event.path("eventId").asText()).isEqualTo(EVENT_ID.toString());
    assertThat(event.path("eventType").asText()).isEqualTo("identity-profile.sample-recorded");
    assertThat(event.path("eventVersion").asInt()).isEqualTo(1);
    assertThat(event.path("aggregateType").asText()).isEqualTo("identity-profile-sample");
    assertThat(event.path("aggregateId").asText()).isEqualTo(SAMPLE_ID.toString());
    assertThat(event.path("aggregateVersion").asInt()).isEqualTo(1);
    assertThat(event.path("occurredAt").asText()).isEqualTo(OCCURRED_AT.toString());
    assertThat(event.path("producer").asText()).isEqualTo("identity-profile-service");
    assertThat(event.path("correlationId").asText()).isEqualTo("t06-correlation-001");
    assertThat(event.path("causationId").asText()).isEqualTo(COMMAND_ID.toString());
    assertThat(event.path("payload").size()).isEqualTo(2);
    assertThat(event.path("payload").path("sampleId").asText())
        .isEqualTo(SAMPLE_ID.toString());
    assertThat(event.path("payload").path("purpose").asText())
        .isEqualTo("PHASE_0_BASELINE");
  }

  @Test
  void serializesStoredResponseWithoutInternalMetadata() throws Exception {
    String serialized = adapter.serializeResponse(
        new StoredSampleResponseData(SAMPLE_ID, "RECORDED"));

    JsonNode response = objectMapper.readTree(serialized);

    assertThat(response.size()).isEqualTo(2);
    assertThat(response.path("sampleId").asText()).isEqualTo(SAMPLE_ID.toString());
    assertThat(response.path("status").asText()).isEqualTo("RECORDED");
  }

  @Test
  void serializationFailureUsesSafeMessage() {
    ObjectMapper failingMapper = new ObjectMapper() {
      @Override
      public String writeValueAsString(Object value) throws JsonProcessingException {
        throw new JsonProcessingException("sensitive serializer detail") {
        };
      }
    };
    var failingAdapter = new JacksonSamplePayloadSerializerAdapter(failingMapper);

    assertThatThrownBy(() -> failingAdapter.serializeResponse(
        new StoredSampleResponseData(SAMPLE_ID, "RECORDED")))
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("Could not serialize sample response")
        .hasMessageNotContaining("sensitive serializer detail");
  }
}
