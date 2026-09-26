package com.auctionpromax.identityprofileservice;

import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleCommand;
import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleResult;
import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleUseCase;
import com.auctionpromax.identityprofileservice.ports.in.sample.OutboxRelayUseCase;
import com.auctionpromax.identityprofileservice.ports.in.sample.SampleEventHandler;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxDelivery;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayPersistencePort;
import com.auctionpromax.identityprofileservice.application.sample.RequestFingerprint;
import com.auctionpromax.identityprofileservice.application.sample.SampleRequestFingerprint;
import com.auctionpromax.identityprofileservice.domain.idempotency.IdempotencyKey;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;

import javax.sql.DataSource;

import io.micrometer.core.instrument.MeterRegistry;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("testcontainers")
@Testcontainers
class IdentityProfileServiceApplicationTestcontainersIT {

  private static final String INSUFFICIENT_PRIVILEGE_SQL_STATE = "42501";

  private static final DockerImageName POSTGRES_IMAGE = DockerImageName.parse(
      "postgres:17.11-bookworm@sha256:"
          + "84560e3b9c6874893fc4e2854f5dc3e7c1a37bc9d1dfd7a8c641310ae22ba5ad")
      .asCompatibleSubstituteFor("postgres");

  private static final String DATABASE_NAME = "identity_test_db";

  private static final String BOOTSTRAP_USERNAME = "tc_bootstrap";
  private static final String BOOTSTRAP_PASSWORD = "test-only-bootstrap-not-a-secret";

  private static final String MIGRATOR_USERNAME = "identity_test_migrator";
  private static final String MIGRATOR_PASSWORD = "test-only-identity-migrator-not-a-secret";

  private static final String APP_USERNAME = "identity_test_app";
  private static final String APP_PASSWORD = "test-only-identity-app-not-a-secret";

  @Container
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(POSTGRES_IMAGE)
      .withDatabaseName(DATABASE_NAME)
      .withUsername(BOOTSTRAP_USERNAME)
      .withPassword(BOOTSTRAP_PASSWORD)
      .withInitScript(
          "db/testcontainers/bootstrap-identity.sql");

  @DynamicPropertySource
  static void databaseProperties(
      DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add(
        "spring.datasource.username",
        () -> APP_USERNAME);
    registry.add(
        "spring.datasource.password",
        () -> APP_PASSWORD);

    registry.add("spring.flyway.url", POSTGRES::getJdbcUrl);
    registry.add(
        "spring.flyway.user",
        () -> MIGRATOR_USERNAME);
    registry.add(
        "spring.flyway.password",
        () -> MIGRATOR_PASSWORD);
    registry.add(
        "spring.flyway.default-schema",
        () -> "identity");
    registry.add("spring.flyway.schemas", () -> "identity");
    registry.add(
        "spring.flyway.table",
        () -> "flyway_schema_history");
    registry.add(
        "spring.flyway.create-schemas",
        () -> "false");
    registry.add(
        "spring.flyway.locations",
        () -> String.join(",",
            "classpath:db/migration",
            "classpath:db/testcontainers/migration"));
    registry.add(
        "spring.flyway.placeholders.runtimeRole",
        () -> APP_USERNAME);

    registry.add(
        "management.endpoint.health.group.readiness.include",
        () -> "readinessState,db");
    registry.add("auction.sample-flow.enabled", () -> "true");
  }

  private final JdbcTemplate jdbcTemplate;
  private final MockMvc mockMvc;
  private final CreateSampleUseCase createSampleUseCase;
  private final OutboxRelayUseCase relay;
  private final SampleEventHandler consumer;
  private final TransactionTemplate transactionTemplate;
  private final MeterRegistry meterRegistry;
  private final OutboxRelayPersistencePort relayPersistence;

  @Autowired
  IdentityProfileServiceApplicationTestcontainersIT(
      DataSource dataSource,
      MockMvc mockMvc,
      CreateSampleUseCase createSampleUseCase,
      OutboxRelayUseCase relay,
      SampleEventHandler consumer,
      TransactionTemplate transactionTemplate,
      MeterRegistry meterRegistry,
      OutboxRelayPersistencePort relayPersistence) {
    this.jdbcTemplate = new JdbcTemplate(dataSource);
    this.mockMvc = mockMvc;
    this.createSampleUseCase = createSampleUseCase;
    this.relay = relay;
    this.consumer = consumer;
    this.transactionTemplate = transactionTemplate;
    this.meterRegistry = meterRegistry;
    this.relayPersistence = relayPersistence;
  }

  @BeforeEach
  void cleanSampleFlowTables() {
    jdbcTemplate.update("DELETE FROM identity.identity_profile_sample_effect");
    jdbcTemplate.update("DELETE FROM identity.inbox_receipt");
    jdbcTemplate.update("DELETE FROM identity.outbox_event");
    jdbcTemplate.update("DELETE FROM identity.idempotency_record");
    jdbcTemplate.update("DELETE FROM identity.identity_profile_sample");
  }

  @Test
  void replayAndDuplicateDeliveryProduceOneEffect() throws Exception {
    String body = "{\"purpose\":\"PHASE_0_BASELINE\"}";
    String idempotencyKey = "t06-tc-replay-001";

    for (int invocation = 0; invocation < 2; invocation++) {
      mockMvc.perform(post("/api/v1/identity-profile-samples")
              .header("Idempotency-Key", idempotencyKey)
              .header("X-Correlation-Id", "t06-tc-correlation-001")
              .contentType("application/json")
              .content(body))
          .andExpect(status().isCreated())
          .andExpect(jsonPath("$.status").value("RECORDED"));
    }

    String keyDigest = IdempotencyKey.from(idempotencyKey).digest();
    UUID eventId = jdbcTemplate.queryForObject(
        "SELECT event_id FROM identity.idempotency_record WHERE key_digest = ?",
        UUID.class,
        keyDigest);
    UUID sampleId = jdbcTemplate.queryForObject(
        "SELECT aggregate_id FROM identity.outbox_event WHERE event_id = ?",
        UUID.class,
        eventId);

    assertThat(countWhere("identity.idempotency_record", "key_digest", keyDigest)).isOne();
    assertThat(countWhere("identity.identity_profile_sample", "sample_id", sampleId)).isOne();
    assertThat(countWhere("identity.outbox_event", "event_id", eventId)).isOne();
    assertThat(gauge("identity.sample.outbox.pending")).isEqualTo(1.0);
    assertThat(counter("identity.sample.idempotency.replays")).isGreaterThanOrEqualTo(1.0);
    jdbcTemplate.update(
        "UPDATE identity.outbox_event SET next_attempt_at=? WHERE event_id=?",
        Timestamp.from(Instant.now().minusSeconds(1)),
        eventId);
    assertThat(relay.relayOne()).isTrue();
    assertThat(consumer.accept(new OutboxDelivery(
        eventId, sampleId, "t06-tc-correlation-001", "{}", 2))).isFalse();
    assertThat(countWhere("identity.inbox_receipt", "event_id", eventId)).isOne();
    assertThat(countWhere("identity.identity_profile_sample_effect", "event_id", eventId)).isOne();
    assertThat(gauge("identity.sample.outbox.processed.current")).isEqualTo(1.0);
    assertThat(counter("identity.sample.outbox.processed")).isGreaterThanOrEqualTo(1.0);
    assertThat(counter("identity.sample.inbox.duplicates")).isGreaterThanOrEqualTo(1.0);
  }

  @Test
  void conflictValidationAndForcedRollbackAreSafe() throws Exception {
    String conflictKey = "t06-tc-conflict-001";
    createSampleUseCase.create(command(conflictKey, UUID.randomUUID()));

    mockMvc.perform(post("/api/v1/identity-profile-samples")
            .header("Idempotency-Key", conflictKey)
            .contentType("application/json")
            .content("{\"purpose\":\"PHASE_0_BASELINE\",\"sampleRequestId\":\""
                + UUID.randomUUID() + "\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));
    mockMvc.perform(post("/api/v1/identity-profile-samples")
            .header("Idempotency-Key", "contains whitespace")
            .contentType("application/json")
            .content("{\"purpose\":\"PHASE_0_BASELINE\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

    String rollbackKey = "t06-tc-rollback-001";
    Integer samplesBeforeRollback = queryInteger("SELECT count(*) FROM identity.identity_profile_sample");
    Integer outboxBeforeRollback = queryInteger("SELECT count(*) FROM identity.outbox_event");
    transactionTemplate.executeWithoutResult(status -> {
      createSampleUseCase.create(command(rollbackKey, null));
      status.setRollbackOnly();
    });

    String rollbackDigest = IdempotencyKey.from(rollbackKey).digest();
    assertThat(countWhere("identity.idempotency_record", "key_digest", rollbackDigest)).isZero();
    assertThat(queryInteger("SELECT count(*) FROM identity.identity_profile_sample"))
        .isEqualTo(samplesBeforeRollback);
    assertThat(queryInteger("SELECT count(*) FROM identity.outbox_event"))
        .isEqualTo(outboxBeforeRollback);
  }

  @Test
  void concurrentReplayAndExpiredLeaseAreHandled() throws Exception {
    String idempotencyKey = "t06-tc-concurrent-001";
    try (var executor = Executors.newFixedThreadPool(2)) {
      Callable<CreateSampleResult> operation =
          () -> createSampleUseCase.create(command(idempotencyKey, null));
      var results = executor.invokeAll(List.of(operation, operation));
      assertThat(results.get(0).get().sampleId()).isEqualTo(results.get(1).get().sampleId());
    }

    String keyDigest = IdempotencyKey.from(idempotencyKey).digest();
    UUID eventId = jdbcTemplate.queryForObject(
        "SELECT event_id FROM identity.idempotency_record WHERE key_digest = ?",
        UUID.class,
        keyDigest);
    assertThat(countWhere("identity.idempotency_record", "key_digest", keyDigest)).isOne();
    assertThat(countWhere("identity.outbox_event", "event_id", eventId)).isOne();

    jdbcTemplate.update(
        "UPDATE identity.outbox_event SET status='PROCESSING', lease_until=?, "
            + "next_attempt_at=? WHERE event_id=?",
        Timestamp.from(Instant.now().minusSeconds(1)),
        Timestamp.from(Instant.now().minusSeconds(1)),
        eventId);
    assertThat(relay.relayOne()).isTrue();
    assertThat(jdbcTemplate.queryForObject(
        "SELECT status FROM identity.outbox_event WHERE event_id=?",
        String.class,
        eventId)).isEqualTo("PUBLISHED");
    assertThat(jdbcTemplate.queryForObject(
        "SELECT last_attempt_at IS NOT NULL AND locked_by IS NULL "
            + "FROM identity.outbox_event WHERE event_id=?",
        Boolean.class,
        eventId)).isTrue();
  }

  @Test
  void failedRelayStateRetainsTheRowAndCanBeRetried() {
    CreateSampleResult result = createSampleUseCase.create(
        command("t06-tc-relay-failure-001", null));
    jdbcTemplate.update(
        "UPDATE identity.outbox_event SET next_attempt_at=? WHERE aggregate_id=?",
        Timestamp.from(Instant.now().minusSeconds(1)),
        result.sampleId());
    OutboxDelivery claimed = relayPersistence.claimNext().orElseThrow();
    Instant retryAt = Instant.now().plusSeconds(30);

    relayPersistence.markFailed(claimed.eventId(), retryAt, "LOCAL_DELIVERY_FAILED");

    Map<String, Object> failed = jdbcTemplate.queryForMap(
        "SELECT status, attempts, error_code, next_attempt_at, locked_by "
            + "FROM identity.outbox_event WHERE event_id=?",
        claimed.eventId());
    assertThat(failed)
        .containsEntry("status", "FAILED")
        .containsEntry("attempts", 1)
        .containsEntry("error_code", "LOCAL_DELIVERY_FAILED")
        .containsEntry("locked_by", null);
    assertThat(countWhere("identity.outbox_event", "event_id", claimed.eventId())).isOne();
    assertThat(countWhere("identity.identity_profile_sample", "sample_id", result.sampleId())).isOne();
    assertThat(gauge("identity.sample.outbox.failed.current")).isEqualTo(1.0);

    jdbcTemplate.update(
        "UPDATE identity.outbox_event SET next_attempt_at=? WHERE event_id=?",
        Timestamp.from(Instant.now().minusSeconds(1)),
        claimed.eventId());
    assertThat(relay.relayOne()).isTrue();
    assertThat(jdbcTemplate.queryForObject(
        "SELECT status FROM identity.outbox_event WHERE event_id=?",
        String.class,
        claimed.eventId())).isEqualTo("PUBLISHED");
  }

  @Test
  void sampleFlowPersistsCanonicalIdempotencyDigests() {
    String rawKey = "t06-persisted-fingerprint-001";
    String purpose = "PHASE_0_BASELINE";
    UUID requestId = UUID.fromString("0192f1c0-0000-7000-8000-000000000002");

    CreateSampleResult result = createSampleUseCase.create(new CreateSampleCommand(
        rawKey,
        purpose,
        requestId,
        "t06-fingerprint-correlation-001"));

    Map<String, Object> stored = jdbcTemplate.queryForMap("""
        SELECT key_digest, request_fingerprint
        FROM identity.idempotency_record
        WHERE sample_id = ?
        """, result.sampleId());

    assertThat(stored.get("key_digest"))
        .isEqualTo(IdempotencyKey.from(rawKey).digest());

    RequestFingerprint expectedFingerprint = SampleRequestFingerprint.from(purpose, requestId);

    assertThat(stored.get("request_fingerprint"))
        .isEqualTo(expectedFingerprint.value());
  }

  @Test
  void runtimeAndOwnershipTopologyMatchesAdr016() {
    assertThat(queryString("SELECT current_user"))
        .isEqualTo(APP_USERNAME);

    assertThat(queryString("""
        SELECT pg_get_userbyid(datdba)
        FROM pg_database
        WHERE datname = current_database()
        """))
        .isEqualTo("identity_test_owner");

    assertThat(queryString("""
        SELECT pg_get_userbyid(nspowner)
        FROM pg_namespace
        WHERE nspname = 'identity'
        """))
        .isEqualTo(MIGRATOR_USERNAME);

    assertThat(roleMatchesAdr016("identity_test_owner", false))
        .isTrue();

    assertThat(roleMatchesAdr016(MIGRATOR_USERNAME, true))
        .isTrue();

    assertThat(roleMatchesAdr016(APP_USERNAME, true))
        .isTrue();

    assertThat(queryInteger("""
        SELECT count(*)
        FROM pg_auth_members membership
        JOIN pg_roles granted
          ON granted.oid = membership.roleid
        JOIN pg_roles member
          ON member.oid = membership.member
        WHERE granted.rolname LIKE 'identity_test_%'
           OR member.rolname LIKE 'identity_test_%'
        """))
        .isZero();
  }

  @Test
  void flywayUsesMigratorAndProtectsHistory() throws Exception {
    assertThat(queryString("""
        SELECT tableowner
        FROM pg_tables
        WHERE schemaname = 'identity'
          AND tablename = 'flyway_schema_history'
        """))
        .isEqualTo(MIGRATOR_USERNAME);

    assertThat(queryString("""
        SELECT tableowner
        FROM pg_tables
        WHERE schemaname = 'identity'
          AND tablename = 'identity_test_probe'
        """))
        .isEqualTo(MIGRATOR_USERNAME);

    try (
        var connection = DriverManager.getConnection(
            POSTGRES.getJdbcUrl(),
            MIGRATOR_USERNAME,
            MIGRATOR_PASSWORD);
        var statement = connection.createStatement();
        var resultSet = statement.executeQuery("""
            SELECT DISTINCT installed_by
            FROM identity.flyway_schema_history
            WHERE success
            ORDER BY installed_by
            """)) {
      assertThat(resultSet.next()).isTrue();
      assertThat(resultSet.getString("installed_by"))
          .isEqualTo(MIGRATOR_USERNAME);
      assertThat(resultSet.next()).isFalse();
    }

    assertThat(queryBoolean("""
        SELECT has_table_privilege(
            current_user,
            'identity.flyway_schema_history',
            'SELECT'
        )
        """))
        .isFalse();

    assertInsufficientPrivilege(() -> jdbcTemplate.queryForObject(
        """
            SELECT count(*)
            FROM identity.flyway_schema_history
            """,
        Integer.class));
  }

  @Test
  void runtimeCanUseGrantedDmlButCannotUseDdl() {
    Long id = jdbcTemplate.queryForObject(
        """
            INSERT INTO identity.identity_test_probe(probe_value)
            VALUES (?)
            RETURNING id
            """,
        Long.class,
        "initial");

    assertThat(id).isNotNull();

    assertThat(jdbcTemplate.update(
        """
            UPDATE identity.identity_test_probe
            SET probe_value = ?
            WHERE id = ?
            """,
        "updated",
        id)).isOne();

    assertThat(jdbcTemplate.queryForObject(
        """
            SELECT probe_value
            FROM identity.identity_test_probe
            WHERE id = ?
            """,
        String.class,
        id)).isEqualTo("updated");

    assertThat(jdbcTemplate.update(
        """
            DELETE FROM identity.identity_test_probe
            WHERE id = ?
            """,
        id)).isOne();

    assertThat(queryBoolean("""
        SELECT has_schema_privilege(
            current_user,
            'identity',
            'CREATE'
        )
        """))
        .isFalse();

    assertInsufficientPrivilege(() -> jdbcTemplate.execute("""
        CREATE TABLE identity.runtime_ddl_must_be_denied (
            id bigint PRIMARY KEY
        )
        """));
  }

  @Test
  void migratorCanPerformControlledDdl() throws Exception {
    try (
        var connection = DriverManager.getConnection(
            POSTGRES.getJdbcUrl(),
            MIGRATOR_USERNAME,
            MIGRATOR_PASSWORD);
        var statement = connection.createStatement()) {
      statement.execute("""
          CREATE TABLE identity.migrator_ddl_probe (
              id bigint PRIMARY KEY
          )
          """);

      statement.execute("""
          DROP TABLE identity.migrator_ddl_probe
          """);
    }
  }

  @Test
  void readinessIsUpWithDatabaseConnectivity() throws Exception {
    mockMvc.perform(get("/actuator/health/readiness"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"));
  }

  private String queryString(String sql) {
    return jdbcTemplate.queryForObject(sql, String.class);
  }

  private Boolean queryBoolean(String sql) {
    return jdbcTemplate.queryForObject(sql, Boolean.class);
  }

  private Integer queryInteger(String sql) {
    return jdbcTemplate.queryForObject(sql, Integer.class);
  }

  private CreateSampleCommand command(String idempotencyKey, UUID requestId) {
    return new CreateSampleCommand(
        idempotencyKey,
        "PHASE_0_BASELINE",
        requestId,
        "t06-tc-correlation-001");
  }

  private Integer countWhere(String table, String column, Object value) {
    return jdbcTemplate.queryForObject(
        "SELECT count(*) FROM " + table + " WHERE " + column + " = ?",
        Integer.class,
        value);
  }

  private double gauge(String name) {
    return meterRegistry.get(name).gauge().value();
  }

  private double counter(String name) {
    return meterRegistry.get(name).counter().count();
  }

  private boolean roleMatchesAdr016(
      String roleName,
      boolean expectedLogin) {
    return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
        """
            SELECT rolcanlogin = ?
               AND NOT rolsuper
               AND NOT rolcreatedb
               AND NOT rolcreaterole
               AND NOT rolreplication
               AND NOT rolbypassrls
               AND NOT rolinherit
            FROM pg_roles
            WHERE rolname = ?
            """,
        Boolean.class,
        expectedLogin,
        roleName));
  }

  private static void assertInsufficientPrivilege(
      ThrowingCallable operation) {
    assertThatThrownBy(operation)
        .isInstanceOf(DataAccessException.class)
        .satisfies(error -> assertThat(findSqlState(error))
            .isEqualTo(INSUFFICIENT_PRIVILEGE_SQL_STATE));
  }

  private static String findSqlState(Throwable error) {
    Throwable current = error;

    while (current != null) {
      if (current instanceof SQLException sqlException) {
        return sqlException.getSQLState();
      }

      current = current.getCause();
    }

    return null;
  }
}
