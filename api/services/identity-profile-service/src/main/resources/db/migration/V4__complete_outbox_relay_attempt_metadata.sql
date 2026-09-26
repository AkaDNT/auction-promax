ALTER TABLE identity.outbox_event
    ADD COLUMN locked_by varchar(100),
    ADD COLUMN last_attempt_at timestamptz;
