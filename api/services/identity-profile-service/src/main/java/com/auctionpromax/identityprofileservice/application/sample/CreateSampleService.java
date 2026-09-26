package com.auctionpromax.identityprofileservice.application.sample;

import com.auctionpromax.identityprofileservice.domain.idempotency.IdempotencyKey;
import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleCommand;
import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleResult;
import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleUseCase;
import com.auctionpromax.identityprofileservice.ports.in.sample.IdempotencyKeyReusedException;
import com.auctionpromax.identityprofileservice.ports.out.sample.IdempotencyFingerprintConflictException;
import com.auctionpromax.identityprofileservice.ports.out.sample.PersistSampleCommand;
import com.auctionpromax.identityprofileservice.ports.out.sample.PersistSampleResult;
import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandObservation;
import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandObservabilityPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandPersistencePort;
import com.auctionpromax.identityprofileservice.ports.out.sample.SamplePayloadSerializerPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.SampleRecordedEventData;
import com.auctionpromax.identityprofileservice.ports.out.sample.StoredSampleResponseData;
import java.time.Instant;
import java.util.UUID;

public class CreateSampleService implements CreateSampleUseCase {
  private static final String ACTOR_SCOPE = "phase0-technical-actor";
  private static final String OPERATION_NAME = "CreateIdentityProfileSample";
  private final SampleCommandPersistencePort persistencePort;
  private final SamplePayloadSerializerPort serializerPort;
  private final SampleCommandObservabilityPort observabilityPort;

  public CreateSampleService(
      SampleCommandPersistencePort persistencePort,
      SamplePayloadSerializerPort serializerPort,
      SampleCommandObservabilityPort observabilityPort) {
    this.persistencePort = persistencePort;
    this.serializerPort = serializerPort;
    this.observabilityPort = observabilityPort;
  }

  @Override
  public CreateSampleResult create(CreateSampleCommand command) {
    IdempotencyKey idempotencyKey = IdempotencyKey.from(command.idempotencyKey());
    RequestFingerprint requestFingerprint = SampleRequestFingerprint.from(
        command.purpose(), command.sampleRequestId());
    String keyDigest = idempotencyKey.digest();
    String requestFingerprintValue = requestFingerprint.value();
    UUID sampleId = UUID.randomUUID();
    UUID commandId = command.sampleRequestId() == null ? UUID.randomUUID() : command.sampleRequestId();
    UUID eventId = UUID.randomUUID();
    Instant now = Instant.now();
    PersistSampleResult persistenceResult;
    try {
      persistenceResult = persistencePort.persist(new PersistSampleCommand(
          ACTOR_SCOPE,
          OPERATION_NAME,
          keyDigest,
          requestFingerprintValue,
          sampleId,
          commandId,
          eventId,
          command.purpose(),
          command.correlationId(),
          serializerPort.serializeEvent(new SampleRecordedEventData(
              eventId,
              sampleId,
              commandId,
              now,
              command.correlationId(),
              command.purpose())),
          serializerPort.serializeResponse(new StoredSampleResponseData(sampleId, "RECORDED")),
          now));
    } catch (IdempotencyFingerprintConflictException exception) {
      throw new IdempotencyKeyReusedException();
    }
    var observation = new SampleCommandObservation(
        command.correlationId(),
        keyDigest.substring(0, 12),
        persistenceResult.eventId());
    if (persistenceResult.replayed()) {
      observabilityPort.sampleReplayed(observation);
      return new CreateSampleResult(persistenceResult.sampleId(), "RECORDED", true);
    }
    observabilityPort.sampleRecorded(observation);
    return new CreateSampleResult(persistenceResult.sampleId(), "RECORDED", false);
  }

}
