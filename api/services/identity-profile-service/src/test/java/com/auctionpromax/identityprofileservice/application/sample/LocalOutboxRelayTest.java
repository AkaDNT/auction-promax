package com.auctionpromax.identityprofileservice.application.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxDelivery;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayObservation;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayObservabilityPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayPersistencePort;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LocalOutboxRelayTest {

  private static final Instant NOW = Instant.parse("2026-09-06T12:00:00Z");
  private static final UUID EVENT_ID =
      UUID.fromString("0192f1c0-0000-7000-8000-000000000040");
  private static final UUID SAMPLE_ID =
      UUID.fromString("0192f1c0-0000-7000-8000-000000000041");

  @Test
  void returnsFalseWithoutAttemptWhenNoEventIsDue() {
    var actions = new ArrayList<String>();
    var persistence = new CapturingPersistencePort(Optional.empty(), actions);
    var observability = new CapturingObservabilityPort(actions);
    var relay = relay(persistence, delivery -> actions.add("deliver"), observability, 0);

    boolean relayed = relay.relayOne();

    assertThat(relayed).isFalse();
    assertThat(actions).containsExactly("claim");
  }

  @Test
  void deliversAfterClaimAndMarksPublished() {
    var actions = new ArrayList<String>();
    var persistence = new CapturingPersistencePort(Optional.of(delivery(1)), actions);
    var observability = new CapturingObservabilityPort(actions);
    var relay = relay(persistence, delivery -> actions.add("deliver"), observability, 0);

    boolean relayed = relay.relayOne();

    assertThat(relayed).isTrue();
    assertThat(actions).containsExactly(
        "claim", "attempted", "deliver", "published-state", "published-observation");
    assertThat(persistence.publishedAt).isEqualTo(NOW);
    assertThat(persistence.failedAt).isNull();
  }

  @Test
  void failedDeliveryRemainsRetryableWithCappedBackoffAndInjectedJitter() {
    var actions = new ArrayList<String>();
    var persistence = new CapturingPersistencePort(Optional.of(delivery(3)), actions);
    var observability = new CapturingObservabilityPort(actions);
    var relay = relay(persistence, delivery -> {
      actions.add("deliver");
      throw new IllegalStateException("local delivery unavailable");
    }, observability, 2);

    boolean relayed = relay.relayOne();

    assertThat(relayed).isFalse();
    assertThat(actions).containsExactly(
        "claim", "attempted", "deliver", "failed-state", "failed-observation");
    assertThat(persistence.failedAt).isEqualTo(NOW.plusSeconds(6));
    assertThat(persistence.errorCode).isEqualTo("LOCAL_DELIVERY_FAILED");
    assertThat(persistence.publishedAt).isNull();
  }

  @Test
  void exponentialBackoffIsCappedAtFiveMinutes() {
    assertThat(LocalOutboxRelay.backoffSeconds(1)).isEqualTo(1);
    assertThat(LocalOutboxRelay.backoffSeconds(2)).isEqualTo(2);
    assertThat(LocalOutboxRelay.backoffSeconds(9)).isEqualTo(256);
    assertThat(LocalOutboxRelay.backoffSeconds(10)).isEqualTo(300);
    assertThat(LocalOutboxRelay.backoffSeconds(100)).isEqualTo(300);
  }

  private LocalOutboxRelay relay(
      OutboxRelayPersistencePort persistence,
      com.auctionpromax.identityprofileservice.ports.out.sample.LocalEventDeliveryPort delivery,
      OutboxRelayObservabilityPort observability,
      long jitterSeconds) {
    return new LocalOutboxRelay(
        persistence,
        delivery,
        observability,
        Clock.fixed(NOW, ZoneOffset.UTC),
        ignored -> jitterSeconds);
  }

  private OutboxDelivery delivery(int attempt) {
    return new OutboxDelivery(
        EVENT_ID,
        SAMPLE_ID,
        "t06-correlation-001",
        "{}",
        attempt);
  }

  private static final class CapturingPersistencePort implements OutboxRelayPersistencePort {

    private final Optional<OutboxDelivery> claimed;
    private final List<String> actions;
    private Instant publishedAt;
    private Instant failedAt;
    private String errorCode;

    private CapturingPersistencePort(
        Optional<OutboxDelivery> claimed,
        List<String> actions) {
      this.claimed = claimed;
      this.actions = actions;
    }

    @Override
    public Optional<OutboxDelivery> claimNext() {
      actions.add("claim");
      return claimed;
    }

    @Override
    public void markPublished(UUID eventId, Instant publishedAt) {
      actions.add("published-state");
      this.publishedAt = publishedAt;
    }

    @Override
    public void markFailed(UUID eventId, Instant nextAttemptAt, String errorCode) {
      actions.add("failed-state");
      failedAt = nextAttemptAt;
      this.errorCode = errorCode;
    }
  }

  private static final class CapturingObservabilityPort
      implements OutboxRelayObservabilityPort {

    private final List<String> actions;

    private CapturingObservabilityPort(List<String> actions) {
      this.actions = actions;
    }

    @Override
    public void relayAttempted(OutboxRelayObservation observation) {
      actions.add("attempted");
    }

    @Override
    public void relayPublished(OutboxRelayObservation observation) {
      actions.add("published-observation");
    }

    @Override
    public void relayFailed(OutboxRelayObservation observation, String errorCode) {
      actions.add("failed-observation");
    }
  }
}
