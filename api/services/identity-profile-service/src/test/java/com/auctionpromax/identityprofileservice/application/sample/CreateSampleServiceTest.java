package com.auctionpromax.identityprofileservice.application.sample;

import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleCommand;
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
import java.util.UUID;
import java.util.function.Function;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CreateSampleServiceTest {

  private static final UUID REQUEST_ID =
      UUID.fromString("0192f1c0-0000-7000-8000-000000000002");

  @Test
  void persistsPreparedCommandThroughOutboundPort() {
    CapturingPersistencePort port = new CapturingPersistencePort(command ->
        new PersistSampleResult(command.sampleId(), command.eventId(), false));
    CapturingObservabilityPort observability = new CapturingObservabilityPort();
    CreateSampleService service = service(port, observability);

    var result = service.create(command("sample-key-001"));

    assertThat(result.replayed()).isFalse();
    assertThat(result.sampleId()).isEqualTo(port.captured.sampleId());
    assertThat(port.captured.actorScope()).isEqualTo("phase0-technical-actor");
    assertThat(port.captured.operationName()).isEqualTo("CreateIdentityProfileSample");
    assertThat(port.captured.keyDigest()).matches("[0-9a-f]{64}");
    assertThat(port.captured.requestFingerprint()).isEqualTo(
        "46a81d4d5c5fa9f5e51389384782425c5be1f1f15dc199ce192fc83de60269e8");
    assertThat(port.captured.eventPayload()).isEqualTo("serialized-event");
    assertThat(port.captured.responseBody()).isEqualTo("serialized-response");
    assertThat(observability.recorded).isEqualTo(1);
    assertThat(observability.replayed).isZero();
    assertThat(observability.last.outboxEventId()).isEqualTo(port.captured.eventId());
    assertThat(observability.last.idempotencyFingerprint()).hasSize(12);
  }

  @Test
  void returnsStoredIdentityAndRecordsMetricWhenPersistenceReportsReplay() {
    UUID storedSampleId = UUID.fromString("0192f1c0-0000-7000-8000-000000000010");
    UUID storedEventId = UUID.fromString("0192f1c0-0000-7000-8000-000000000011");
    CapturingPersistencePort port = new CapturingPersistencePort(command ->
        new PersistSampleResult(storedSampleId, storedEventId, true));
    CapturingObservabilityPort observability = new CapturingObservabilityPort();
    CreateSampleService service = service(port, observability);

    var result = service.create(command("sample-key-002"));

    assertThat(result.sampleId()).isEqualTo(storedSampleId);
    assertThat(result.replayed()).isTrue();
    assertThat(observability.recorded).isZero();
    assertThat(observability.replayed).isEqualTo(1);
    assertThat(observability.last.outboxEventId()).isEqualTo(storedEventId);
  }

  @Test
  void mapsPersistenceFingerprintConflictToInboundUseCaseConflict() {
    CapturingPersistencePort port = new CapturingPersistencePort(command -> {
      throw new IdempotencyFingerprintConflictException();
    });
    CapturingObservabilityPort observability = new CapturingObservabilityPort();
    CreateSampleService service = service(port, observability);

    assertThatThrownBy(() -> service.create(command("sample-key-003")))
        .isInstanceOf(IdempotencyKeyReusedException.class)
        .hasMessage("The idempotency key was already used for a different request.");
    assertThat(observability.recorded).isZero();
    assertThat(observability.replayed).isZero();
  }

  private CreateSampleService service(
      SampleCommandPersistencePort port,
      SampleCommandObservabilityPort observabilityPort) {
    return new CreateSampleService(port, new StubSerializerPort(), observabilityPort);
  }

  private CreateSampleCommand command(String key) {
    return new CreateSampleCommand(
        key,
        "PHASE_0_BASELINE",
        REQUEST_ID,
        "t06-correlation-001");
  }

  private static final class CapturingPersistencePort implements SampleCommandPersistencePort {

    private final Function<PersistSampleCommand, PersistSampleResult> behavior;
    private PersistSampleCommand captured;

    private CapturingPersistencePort(
        Function<PersistSampleCommand, PersistSampleResult> behavior) {
      this.behavior = behavior;
    }

    @Override
    public PersistSampleResult persist(PersistSampleCommand command) {
      captured = command;
      return behavior.apply(command);
    }
  }

  private static final class StubSerializerPort implements SamplePayloadSerializerPort {

    @Override
    public String serializeEvent(SampleRecordedEventData event) {
      return "serialized-event";
    }

    @Override
    public String serializeResponse(StoredSampleResponseData response) {
      return "serialized-response";
    }
  }

  private static final class CapturingObservabilityPort
      implements SampleCommandObservabilityPort {

    private int recorded;
    private int replayed;
    private SampleCommandObservation last;

    @Override
    public void sampleRecorded(SampleCommandObservation observation) {
      recorded++;
      last = observation;
    }

    @Override
    public void sampleReplayed(SampleCommandObservation observation) {
      replayed++;
      last = observation;
    }
  }
}
