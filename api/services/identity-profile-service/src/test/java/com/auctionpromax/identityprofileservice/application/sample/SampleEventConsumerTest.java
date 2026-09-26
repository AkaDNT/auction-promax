package com.auctionpromax.identityprofileservice.application.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.InboxObservation;
import com.auctionpromax.identityprofileservice.ports.out.sample.InboxObservabilityPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.InboxPersistencePort;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxDelivery;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SampleEventConsumerTest {

  private static final Instant NOW = Instant.parse("2026-09-06T12:00:00Z");
  private static final UUID EVENT_ID =
      UUID.fromString("0192f1c0-0000-7000-8000-000000000060");
  private static final UUID SAMPLE_ID =
      UUID.fromString("0192f1c0-0000-7000-8000-000000000061");

  @Test
  void reportsAppliedWhenPersistenceCreatesReceiptAndEffect() {
    var persistence = new CapturingPersistencePort(true, false);
    var observability = new CapturingObservabilityPort();
    var consumer = consumer(persistence, observability);

    boolean applied = consumer.accept(delivery());

    assertThat(applied).isTrue();
    assertThat(persistence.receivedAt).isEqualTo(NOW);
    assertThat(observability.applied).isEqualTo(1);
    assertThat(observability.duplicates).isZero();
    assertLinkedIdentifiers(observability.last);
  }

  @Test
  void reportsDuplicateWhenPersistenceFindsExistingReceipt() {
    var persistence = new CapturingPersistencePort(false, false);
    var observability = new CapturingObservabilityPort();
    var consumer = consumer(persistence, observability);

    boolean applied = consumer.accept(delivery());

    assertThat(applied).isFalse();
    assertThat(observability.applied).isZero();
    assertThat(observability.duplicates).isEqualTo(1);
    assertLinkedIdentifiers(observability.last);
  }

  @Test
  void doesNotReportOutcomeWhenPersistenceFails() {
    var persistence = new CapturingPersistencePort(false, true);
    var observability = new CapturingObservabilityPort();
    var consumer = consumer(persistence, observability);

    assertThatThrownBy(() -> consumer.accept(delivery()))
        .isInstanceOf(IllegalStateException.class)
        .hasMessage("inbox persistence unavailable");
    assertThat(observability.applied).isZero();
    assertThat(observability.duplicates).isZero();
  }

  private SampleEventConsumer consumer(
      InboxPersistencePort persistence,
      InboxObservabilityPort observability) {
    return new SampleEventConsumer(
        persistence,
        observability,
        Clock.fixed(NOW, ZoneOffset.UTC));
  }

  private OutboxDelivery delivery() {
    return new OutboxDelivery(
        EVENT_ID,
        SAMPLE_ID,
        "t06-correlation-001",
        "{}",
        2);
  }

  private void assertLinkedIdentifiers(InboxObservation observation) {
    assertThat(observation.correlationId()).isEqualTo("t06-correlation-001");
    assertThat(observation.outboxEventId()).isEqualTo(EVENT_ID);
    assertThat(observation.inboxReceiptId()).isEqualTo(EVENT_ID);
    assertThat(observation.inboxEffectId()).isEqualTo(EVENT_ID);
  }

  private static final class CapturingPersistencePort implements InboxPersistencePort {

    private final boolean result;
    private final boolean fail;
    private Instant receivedAt;

    private CapturingPersistencePort(boolean result, boolean fail) {
      this.result = result;
      this.fail = fail;
    }

    @Override
    public boolean recordOnce(OutboxDelivery delivery, Instant receivedAt) {
      this.receivedAt = receivedAt;
      if (fail) {
        throw new IllegalStateException("inbox persistence unavailable");
      }
      return result;
    }
  }

  private static final class CapturingObservabilityPort implements InboxObservabilityPort {

    private int applied;
    private int duplicates;
    private InboxObservation last;

    @Override
    public void eventApplied(InboxObservation observation) {
      applied++;
      last = observation;
    }

    @Override
    public void duplicateIgnored(InboxObservation observation) {
      duplicates++;
      last = observation;
    }
  }
}
