package com.auctionpromax.identityprofileservice.adapter.out.persistence.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.IdempotencyFingerprintConflictException;
import com.auctionpromax.identityprofileservice.ports.out.sample.PersistSampleCommand;
import com.auctionpromax.identityprofileservice.ports.out.sample.PersistSampleResult;
import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandPersistencePort;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "auction.sample-flow.enabled", havingValue = "true")
public class JdbcSampleCommandPersistenceAdapter implements SampleCommandPersistencePort {

  private final JdbcTemplate jdbcTemplate;

  public JdbcSampleCommandPersistenceAdapter(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  @Transactional
  public PersistSampleResult persist(PersistSampleCommand command) {
    int inserted = jdbcTemplate.update("""
        INSERT INTO identity.idempotency_record(actor_scope, operation_name, key_digest,
          request_fingerprint, status, sample_id, command_id, event_id, created_at)
        VALUES (?, ?, ?, ?, 'PROCESSING', ?, ?, ?, ?) ON CONFLICT DO NOTHING
        """, command.actorScope(), command.operationName(), command.keyDigest(),
        command.requestFingerprint(), command.sampleId(), command.commandId(), command.eventId(),
        Timestamp.from(command.occurredAt()));

    IdempotencyRecord record = jdbcTemplate.queryForObject("""
        SELECT request_fingerprint, status, sample_id, command_id, event_id
        FROM identity.idempotency_record
        WHERE actor_scope = ? AND operation_name = ? AND key_digest = ? FOR UPDATE
        """, this::mapRecord, command.actorScope(), command.operationName(), command.keyDigest());

    if (!command.requestFingerprint().equals(record.requestFingerprint())) {
      throw new IdempotencyFingerprintConflictException();
    }
    if (inserted == 0 && "COMPLETED".equals(record.status())) {
      return new PersistSampleResult(record.sampleId(), record.eventId(), true);
    }

    jdbcTemplate.update("""
        INSERT INTO identity.identity_profile_sample(sample_id, purpose, created_at)
        VALUES (?, ?, ?)
        """, record.sampleId(), command.purpose(), Timestamp.from(command.occurredAt()));
    jdbcTemplate.update("""
        INSERT INTO identity.outbox_event(event_id, aggregate_id, correlation_id, causation_id,
          payload, status, next_attempt_at, created_at)
        VALUES (?, ?, ?, ?, CAST(? AS jsonb), 'PENDING', ?, ?)
        """, record.eventId(), record.sampleId(), command.correlationId(), record.commandId(),
        command.eventPayload(), Timestamp.from(command.occurredAt()),
        Timestamp.from(command.occurredAt()));
    jdbcTemplate.update("""
        UPDATE identity.idempotency_record
        SET status = 'COMPLETED', response_status = 201, response_body = CAST(? AS jsonb),
          completed_at = ?
        WHERE actor_scope = ? AND operation_name = ? AND key_digest = ?
        """, command.responseBody(), Timestamp.from(command.occurredAt()), command.actorScope(),
        command.operationName(), command.keyDigest());

    return new PersistSampleResult(record.sampleId(), record.eventId(), false);
  }

  private IdempotencyRecord mapRecord(ResultSet resultSet, int rowNumber) throws SQLException {
    return new IdempotencyRecord(
        resultSet.getString("request_fingerprint"),
        resultSet.getString("status"),
        resultSet.getObject("sample_id", UUID.class),
        resultSet.getObject("command_id", UUID.class),
        resultSet.getObject("event_id", UUID.class));
  }

  private record IdempotencyRecord(
      String requestFingerprint,
      String status,
      UUID sampleId,
      UUID commandId,
      UUID eventId) {
  }
}
