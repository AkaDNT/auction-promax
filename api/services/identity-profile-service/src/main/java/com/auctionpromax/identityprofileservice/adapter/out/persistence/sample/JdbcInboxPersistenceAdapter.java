package com.auctionpromax.identityprofileservice.adapter.out.persistence.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.InboxPersistencePort;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxDelivery;
import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "auction.sample-flow.enabled", havingValue = "true")
public class JdbcInboxPersistenceAdapter implements InboxPersistencePort {

  private final JdbcTemplate jdbcTemplate;

  public JdbcInboxPersistenceAdapter(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  @Transactional
  public boolean recordOnce(OutboxDelivery delivery, Instant receivedAt) {
    int inserted = jdbcTemplate.update("""
        INSERT INTO identity.inbox_receipt(event_id, received_at)
        VALUES (?, ?) ON CONFLICT DO NOTHING
        """, delivery.eventId(), Timestamp.from(receivedAt));
    if (inserted == 0) {
      return false;
    }

    jdbcTemplate.update("""
        INSERT INTO identity.identity_profile_sample_effect(event_id, sample_id, applied_at)
        VALUES (?, ?, ?)
        """, delivery.eventId(), delivery.sampleId(), Timestamp.from(receivedAt));
    return true;
  }
}
