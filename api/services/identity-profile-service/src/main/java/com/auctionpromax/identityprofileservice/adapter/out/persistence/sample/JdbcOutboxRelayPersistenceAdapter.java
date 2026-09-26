package com.auctionpromax.identityprofileservice.adapter.out.persistence.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxDelivery;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayPersistencePort;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "auction.sample-flow.enabled", havingValue = "true")
public class JdbcOutboxRelayPersistenceAdapter implements OutboxRelayPersistencePort {

  private final JdbcTemplate jdbcTemplate;

  public JdbcOutboxRelayPersistenceAdapter(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  @Transactional
  public Optional<OutboxDelivery> claimNext() {
    List<OutboxDelivery> rows = jdbcTemplate.query("""
        WITH candidate AS (
          SELECT event_id FROM identity.outbox_event
          WHERE next_attempt_at <= now()
            AND (status IN ('PENDING', 'FAILED')
              OR (status = 'PROCESSING' AND lease_until < now()))
          ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1
        )
        UPDATE identity.outbox_event event
        SET status = 'PROCESSING', attempts = attempts + 1,
          locked_by = 'identity-profile-service-local',
          last_attempt_at = now(), lease_until = now() + interval '30 seconds'
        FROM candidate WHERE event.event_id = candidate.event_id
        RETURNING event.event_id, event.aggregate_id, event.correlation_id,
          event.payload::text, event.attempts
        """, this::mapDelivery);
    return rows.stream().findFirst();
  }

  @Override
  @Transactional
  public void markPublished(UUID eventId, Instant publishedAt) {
    jdbcTemplate.update("""
        UPDATE identity.outbox_event
        SET status = 'PUBLISHED', published_at = ?, lease_until = NULL,
          locked_by = NULL, error_code = NULL
        WHERE event_id = ?
        """, Timestamp.from(publishedAt), eventId);
  }

  @Override
  @Transactional
  public void markFailed(
      UUID eventId,
      Instant nextAttemptAt,
      String errorCode) {
    jdbcTemplate.update("""
        UPDATE identity.outbox_event
        SET status = 'FAILED', lease_until = NULL, locked_by = NULL,
          error_code = ?, next_attempt_at = ?
        WHERE event_id = ?
        """, errorCode, Timestamp.from(nextAttemptAt), eventId);
  }

  private OutboxDelivery mapDelivery(ResultSet resultSet, int rowNumber) throws SQLException {
    return new OutboxDelivery(
        resultSet.getObject("event_id", UUID.class),
        resultSet.getObject("aggregate_id", UUID.class),
        resultSet.getString("correlation_id"),
        resultSet.getString("payload"),
        resultSet.getInt("attempts"));
  }
}
