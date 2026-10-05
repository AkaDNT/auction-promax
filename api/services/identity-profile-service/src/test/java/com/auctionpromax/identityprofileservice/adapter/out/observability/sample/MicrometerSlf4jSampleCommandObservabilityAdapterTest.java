package com.auctionpromax.identityprofileservice.adapter.out.observability.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandObservation;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.UUID;
import java.util.Map;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.logging.logback.StructuredLogEncoder;
import org.springframework.core.env.Environment;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;

class MicrometerSlf4jSampleCommandObservabilityAdapterTest {

  private static final UUID EVENT_ID =
      UUID.fromString("0192f1c0-0000-7000-8000-000000000030");

  @ParameterizedTest
  @NullSource
  @ValueSource(strings = {"sample-correlation", "outer-correlation"})
  void emitsBothEcsEventsWithOneCorrelationAndRestoresMdc(String outerCorrelation) throws Exception {
    Map<String, String> originalMdc = MDC.getCopyOfContextMap();
    Logger logger = (Logger) LoggerFactory.getLogger(MicrometerSlf4jSampleCommandObservabilityAdapter.class);
    Level originalLevel = logger.getLevel();
    boolean originalAdditive = logger.isAdditive();
    var capture = new ListAppender<ILoggingEvent>() {
      @Override
      protected void append(ILoggingEvent event) {
        event.prepareForDeferredProcessing();
        super.append(event);
      }
    };
    var encoderContext = new LoggerContext();
    encoderContext.putObject(Environment.class.getName(), new MockEnvironment());
    var encoder = new StructuredLogEncoder();
    encoder.setContext(encoderContext);
    encoder.setFormat("ecs");
    try {
      encoder.start();
      capture.setContext(logger.getLoggerContext());
      capture.start();
      logger.addAppender(capture);
      logger.setLevel(Level.INFO);
      logger.setAdditive(false);
      MDC.clear();
      MDC.put("traceId", "synthetic-trace");
      if (outerCorrelation != null) {
        MDC.put("correlationId", outerCorrelation);
      }
      var expectedMdc = MDC.getCopyOfContextMap();
      var adapter = new MicrometerSlf4jSampleCommandObservabilityAdapter(new SimpleMeterRegistry());
      var observation = new SampleCommandObservation("sample-correlation", "0123456789ab", EVENT_ID);

      adapter.sampleRecorded(observation);
      assertThat(MDC.getCopyOfContextMap()).isEqualTo(expectedMdc);
      adapter.sampleReplayed(observation);
      assertThat(MDC.getCopyOfContextMap()).isEqualTo(expectedMdc);

      assertThat(capture.list).hasSize(2);
      var mapper = new ObjectMapper();
      for (int i = 0; i < 2; i++) {
        var event = capture.list.get(i);
        assertThatNoException().isThrownBy(() -> encoder.encode(event));
        var json = mapper.readTree(encoder.encode(event));
        assertThat(json.path("event").asText())
            .isEqualTo(i == 0 ? "identity_sample.recorded" : "identity_sample.replayed");
        assertThat(json.path("correlationId").asText()).isEqualTo("sample-correlation");
        assertThat(json.path("traceId").asText()).isEqualTo("synthetic-trace");
        assertThat(json.path("idempotencyFingerprint").asText()).isEqualTo("0123456789ab");
        assertThat(json.path("outboxEventId").asText()).isEqualTo(EVENT_ID.toString());
        assertThat(json.path("log").path("level").asText()).isEqualTo("INFO");
      }
    } finally {
      logger.detachAppender(capture);
      logger.setLevel(originalLevel);
      logger.setAdditive(originalAdditive);
      capture.stop();
      encoder.stop();
      encoderContext.stop();
      MDC.clear();
      if (originalMdc != null) {
        MDC.setContextMap(originalMdc);
      }
    }
  }

  @Test
  void incrementsReplayCounterOnlyForReplayObservation() {
    var meterRegistry = new SimpleMeterRegistry();
    var adapter = new MicrometerSlf4jSampleCommandObservabilityAdapter(meterRegistry);
    var observation = new SampleCommandObservation(
        "t06-correlation-001",
        "0123456789ab",
        EVENT_ID);

    adapter.sampleRecorded(observation);

    assertThat(meterRegistry.find("identity.sample.idempotency.replays").counter()).isNull();

    adapter.sampleReplayed(observation);
    adapter.sampleReplayed(observation);

    assertThat(meterRegistry.counter("identity.sample.idempotency.replays").count())
        .isEqualTo(2.0);
  }
}
