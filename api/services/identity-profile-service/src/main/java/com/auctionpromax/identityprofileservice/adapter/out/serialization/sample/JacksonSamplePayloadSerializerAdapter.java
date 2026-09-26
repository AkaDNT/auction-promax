package com.auctionpromax.identityprofileservice.adapter.out.serialization.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.SamplePayloadSerializerPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.SampleRecordedEventData;
import com.auctionpromax.identityprofileservice.ports.out.sample.StoredSampleResponseData;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "auction.sample-flow.enabled", havingValue = "true")
public class JacksonSamplePayloadSerializerAdapter implements SamplePayloadSerializerPort {

  private final ObjectMapper objectMapper;

  public JacksonSamplePayloadSerializerAdapter(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  @Override
  public String serializeEvent(SampleRecordedEventData event) {
    var root = objectMapper.createObjectNode()
        .put("eventId", event.eventId().toString())
        .put("eventType", "identity-profile.sample-recorded")
        .put("eventVersion", 1)
        .put("aggregateType", "identity-profile-sample")
        .put("aggregateId", event.sampleId().toString())
        .put("aggregateVersion", 1)
        .put("occurredAt", event.occurredAt().toString())
        .put("producer", "identity-profile-service")
        .put("correlationId", event.correlationId())
        .put("causationId", event.commandId().toString());
    root.set("payload", objectMapper.createObjectNode()
        .put("sampleId", event.sampleId().toString())
        .put("purpose", event.purpose()));
    return write(root, "event");
  }

  @Override
  public String serializeResponse(StoredSampleResponseData response) {
    var root = objectMapper.createObjectNode()
        .put("sampleId", response.sampleId().toString())
        .put("status", response.status());
    return write(root, "response");
  }

  private String write(Object value, String payloadType) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (JsonProcessingException exception) {
      throw new IllegalStateException(
          "Could not serialize sample " + payloadType,
          exception);
    }
  }
}
