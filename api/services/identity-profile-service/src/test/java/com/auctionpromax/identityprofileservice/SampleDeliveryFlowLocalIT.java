package com.auctionpromax.identityprofileservice;

import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleCommand;
import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleResult;
import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleUseCase;
import com.auctionpromax.identityprofileservice.ports.in.sample.OutboxRelayUseCase;
import com.auctionpromax.identityprofileservice.ports.in.sample.SampleEventHandler;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxDelivery;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test-local")
class SampleDeliveryFlowLocalIT {
  @Autowired CreateSampleUseCase createSampleUseCase;
  @Autowired OutboxRelayUseCase relay;
  @Autowired SampleEventHandler consumer;
  @Autowired MockMvc mockMvc;
  @Autowired TransactionTemplate transactionTemplate;
  private JdbcTemplate jdbcTemplate;

  @Autowired
  void dataSource(DataSource dataSource) { jdbcTemplate = new JdbcTemplate(dataSource); }

  @BeforeEach
  void cleanDatabase() {
    jdbcTemplate.update("DELETE FROM identity.identity_profile_sample_effect");
    jdbcTemplate.update("DELETE FROM identity.inbox_receipt");
    jdbcTemplate.update("DELETE FROM identity.outbox_event");
    jdbcTemplate.update("DELETE FROM identity.idempotency_record");
    jdbcTemplate.update("DELETE FROM identity.identity_profile_sample");
  }

  @Test
  void replayAndDuplicateDeliveryProduceOneEffect() throws Exception {
    String body = "{\"purpose\":\"PHASE_0_BASELINE\"}";
    for (int invocation = 0; invocation < 2; invocation++) {
      mockMvc.perform(post("/api/v1/identity-profile-samples").header("Idempotency-Key", "t06-replay-001").header("X-Correlation-Id", "t06-correlation-001").contentType("application/json").content(body))
          .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("RECORDED"));
    }
    assertThat(count("identity.identity_profile_sample")).isOne();
    assertThat(count("identity.outbox_event")).isOne();
    assertThat(relay.relayOne()).isTrue();
    UUID eventId = jdbcTemplate.queryForObject("SELECT event_id FROM identity.outbox_event", UUID.class);
    UUID sampleId = jdbcTemplate.queryForObject("SELECT aggregate_id FROM identity.outbox_event", UUID.class);
    assertThat(consumer.accept(new OutboxDelivery(eventId, sampleId, "t06-correlation-001", "{}", 2))).isFalse();
    assertThat(count("identity.inbox_receipt")).isOne();
    assertThat(count("identity.identity_profile_sample_effect")).isOne();
  }

  @Test
  void conflictValidationAndRollbackAreSafe() throws Exception {
    createSampleUseCase.create(command("t06-conflict", UUID.randomUUID()));
    mockMvc.perform(post("/api/v1/identity-profile-samples").header("Idempotency-Key", "t06-conflict").contentType("application/json").content("{\"purpose\":\"PHASE_0_BASELINE\",\"sampleRequestId\":\"" + UUID.randomUUID() + "\"}"))
        .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));
    mockMvc.perform(post("/api/v1/identity-profile-samples").header("Idempotency-Key", "contains whitespace").contentType("application/json").content("{\"purpose\":\"PHASE_0_BASELINE\"}"))
        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    transactionTemplate.executeWithoutResult(status -> { createSampleUseCase.create(command("t06-rollback", null)); status.setRollbackOnly(); });
    assertThat(jdbcTemplate.queryForObject("SELECT count(*) FROM identity.idempotency_record WHERE key_digest <> ''", Integer.class)).isOne();
    assertThat(count("identity.identity_profile_sample")).isOne();
    assertThat(count("identity.outbox_event")).isOne();
  }

  @Test
  void concurrentReplayAndExpiredLeaseAreHandled() throws Exception {
    try (var executor = Executors.newFixedThreadPool(2)) {
      Callable<CreateSampleResult> operation = () -> createSampleUseCase.create(command("t06-concurrent", null));
      var results = executor.invokeAll(List.of(operation, operation));
      assertThat(results.get(0).get().sampleId()).isEqualTo(results.get(1).get().sampleId());
    }
    assertThat(count("identity.identity_profile_sample")).isOne();
    UUID eventId = jdbcTemplate.queryForObject("SELECT event_id FROM identity.outbox_event", UUID.class);
    jdbcTemplate.update("UPDATE identity.outbox_event SET status='PROCESSING', lease_until=? WHERE event_id=?", Timestamp.from(Instant.now().minusSeconds(1)), eventId);
    assertThat(relay.relayOne()).isTrue();
    assertThat(jdbcTemplate.queryForObject("SELECT status FROM identity.outbox_event WHERE event_id=?", String.class, eventId)).isEqualTo("PUBLISHED");
  }

  private CreateSampleCommand command(String key, UUID requestId) { return new CreateSampleCommand(key, "PHASE_0_BASELINE", requestId, "t06-correlation-001"); }
  private Integer count(String table) { return jdbcTemplate.queryForObject("SELECT count(*) FROM " + table, Integer.class); }
}
