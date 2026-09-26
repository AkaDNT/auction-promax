package com.auctionpromax.identityprofileservice.configuration;

import com.auctionpromax.identityprofileservice.application.sample.CreateSampleService;
import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleUseCase;
import com.auctionpromax.identityprofileservice.ports.in.sample.OutboxRelayUseCase;
import com.auctionpromax.identityprofileservice.ports.in.sample.SampleEventHandler;
import com.auctionpromax.identityprofileservice.ports.out.sample.InboxObservation;
import com.auctionpromax.identityprofileservice.ports.out.sample.InboxObservabilityPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.InboxPersistencePort;
import com.auctionpromax.identityprofileservice.ports.out.sample.LocalEventDeliveryPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxDelivery;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayObservation;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayObservabilityPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayPersistencePort;
import com.auctionpromax.identityprofileservice.ports.out.sample.PersistSampleResult;
import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandObservation;
import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandObservabilityPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandPersistencePort;
import com.auctionpromax.identityprofileservice.ports.out.sample.SamplePayloadSerializerPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.SampleRecordedEventData;
import com.auctionpromax.identityprofileservice.ports.out.sample.StoredSampleResponseData;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class SampleFlowConfigurationTest {

  private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
      .withUserConfiguration(SampleFlowConfiguration.class)
      .withBean(SampleCommandPersistencePort.class, () -> command ->
          new PersistSampleResult(command.sampleId(), command.eventId(), false))
      .withBean(SamplePayloadSerializerPort.class, StubSerializerPort::new)
      .withBean(SampleCommandObservabilityPort.class, NoOpObservabilityPort::new)
      .withBean(OutboxRelayPersistencePort.class, EmptyRelayPersistencePort::new)
      .withBean(LocalEventDeliveryPort.class, () -> delivery -> { })
      .withBean(OutboxRelayObservabilityPort.class, NoOpRelayObservabilityPort::new)
      .withBean(InboxPersistencePort.class, () -> (delivery, receivedAt) -> true)
      .withBean(InboxObservabilityPort.class, NoOpInboxObservabilityPort::new);

  @Test
  void createsUseCaseWhenSampleFlowIsEnabled() {
    contextRunner
        .withPropertyValues("auction.sample-flow.enabled=true")
        .run(context -> {
          assertThat(context).hasSingleBean(CreateSampleUseCase.class);
          assertThat(context).hasSingleBean(OutboxRelayUseCase.class);
          assertThat(context).hasSingleBean(SampleEventHandler.class);
          assertThat(context.getBean(CreateSampleUseCase.class))
              .isExactlyInstanceOf(CreateSampleService.class);
        });
  }

  @Test
  void doesNotCreateUseCaseWhenSampleFlowIsDisabled() {
    contextRunner
        .withPropertyValues("auction.sample-flow.enabled=false")
        .run(context -> {
          assertThat(context).doesNotHaveBean(CreateSampleUseCase.class);
          assertThat(context).doesNotHaveBean(OutboxRelayUseCase.class);
          assertThat(context).doesNotHaveBean(SampleEventHandler.class);
        });
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

  private static final class NoOpObservabilityPort implements SampleCommandObservabilityPort {

    @Override
    public void sampleRecorded(SampleCommandObservation observation) {
    }

    @Override
    public void sampleReplayed(SampleCommandObservation observation) {
    }
  }

  private static final class EmptyRelayPersistencePort implements OutboxRelayPersistencePort {

    @Override
    public Optional<OutboxDelivery> claimNext() {
      return Optional.empty();
    }

    @Override
    public void markPublished(UUID eventId, Instant publishedAt) {
    }

    @Override
    public void markFailed(
        UUID eventId,
        Instant nextAttemptAt,
        String errorCode) {
    }
  }

  private static final class NoOpRelayObservabilityPort
      implements OutboxRelayObservabilityPort {

    @Override
    public void relayAttempted(OutboxRelayObservation observation) {
    }

    @Override
    public void relayPublished(OutboxRelayObservation observation) {
    }

    @Override
    public void relayFailed(OutboxRelayObservation observation, String errorCode) {
    }
  }

  private static final class NoOpInboxObservabilityPort implements InboxObservabilityPort {

    @Override
    public void eventApplied(InboxObservation observation) {
    }

    @Override
    public void duplicateIgnored(InboxObservation observation) {
    }
  }
}
