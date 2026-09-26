CREATE TABLE identity.identity_profile_sample (sample_id uuid PRIMARY KEY, purpose varchar(40) NOT NULL, created_at timestamptz NOT NULL);
CREATE TABLE identity.idempotency_record (actor_scope varchar(100) NOT NULL, operation_name varchar(100) NOT NULL, key_digest char(64) NOT NULL, request_fingerprint char(64) NOT NULL, status varchar(20) NOT NULL, sample_id uuid NOT NULL, command_id uuid NOT NULL, event_id uuid NOT NULL, response_status integer, response_body jsonb, created_at timestamptz NOT NULL, completed_at timestamptz, PRIMARY KEY (actor_scope, operation_name, key_digest));
CREATE TABLE identity.outbox_event (event_id uuid PRIMARY KEY, aggregate_id uuid NOT NULL, correlation_id varchar(128) NOT NULL, causation_id uuid NOT NULL, payload jsonb NOT NULL, status varchar(20) NOT NULL, attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL, lease_until timestamptz, error_code varchar(80), created_at timestamptz NOT NULL, published_at timestamptz);
CREATE TABLE identity.inbox_receipt (event_id uuid PRIMARY KEY, received_at timestamptz NOT NULL);
CREATE TABLE identity.identity_profile_sample_effect (event_id uuid PRIMARY KEY REFERENCES identity.inbox_receipt(event_id), sample_id uuid NOT NULL, applied_at timestamptz NOT NULL);
CREATE INDEX outbox_event_due_idx ON identity.outbox_event (next_attempt_at, created_at) WHERE status IN ('PENDING', 'FAILED', 'PROCESSING');
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA identity FROM PUBLIC, ${runtimeRole};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity TO ${runtimeRole};
