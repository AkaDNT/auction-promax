# Phase 0 Engineering Baselines

- Status: APPROVED
- Date: 2026-08-05
- Approval owner: Product Owner / Project Owner
- Approved by: Product Owner / Project Owner
- Decision record: [Business Decisions](BUSINESS_DECISIONS.md)
- Blueprint references: Sections 4, 5, 12, 13, 14, and Phase 0 in Section 16

## Approval Workflow

1. Product Owner / Project Owner approved this baseline and ADR-001 through ADR-015 on 2026-08-05.
2. Approved records change from `PROPOSED` to `APPROVED` with approver and date.
3. Rejected or superseded items retain their history and link to the replacement decision.
4. No implementation may silently contradict an approved ADR or this baseline.

## Implementation Status Boundary

This document approves the target architecture and decision baseline only. It does not evidence deployed Cognito, EventBridge/SQS, ECS, RDS, ElastiCache, AWS provisioning, or any completed product capability. Sprint 001 remains in progress; its scope explicitly excludes Cognito business flows, financial logic, lifecycle delivery, and AWS provisioning.

## PostgreSQL Privilege and Test Baseline

ADR-016 is the approved privilege model for every relational service:

| Environment / command | Database backend | Credential model | Verification purpose |
| --------------------- | ---------------- | ---------------- | -------------------- |
| `mvn test` | None | None | Unit tests only; no Spring context or database dependency. |
| Local development | Local PostgreSQL | Service runtime app + local migrator | Daily development fast path. |
| `mvn -Pit-local verify` | Separate local test database | Separate test app + test migrator | Fast JPA/Flyway/transaction verification. |
| `mvn verify` | PostgreSQL Testcontainers | Ephemeral migrator + app roles | Canonical clean-environment integration verification. |
| `mvn -Ppredeploy verify` | Ephemeral PostgreSQL | Ephemeral migrator + app roles | Migration rehearsal and release verification. |
| Public production | RDS PostgreSQL | Secrets Manager; one-off migrator task and runtime app role | Controlled migration and runtime least privilege. |

For each relational service, database ownership is `NOLOGIN`; the migrator owns the dedicated application schema and migration-created objects; the runtime application role owns no database object. `PUBLIC` has no database or application-schema privileges. Passwords must not be committed, logged, or sent in process command-line arguments. Local provisioning/verification/reset is repository-controlled; AWS infrastructure remains CDK-controlled.

The Testcontainers rows describe the approved target verification model. S001-T05 is implementing this path; the decision below is not evidence that the canonical integration test has passed. Completion still requires an executed default `mvn verify` with retained Testcontainers/Failsafe evidence.

### Canonical Testcontainers PostgreSQL Baseline

- Status: APPROVED
- Date: 2026-08-25
- Decision owner: Product Owner / Project Owner

Canonical clean-environment integration tests use the immutable Docker Official Image reference:

`postgres:17.11-bookworm@sha256:84560e3b9c6874893fc4e2854f5dc3e7c1a37bc9d1dfd7a8c641310ae22ba5ad`

The container bootstrap administrator is a deterministic, test-only identity used solely to provision the ephemeral database, roles, schema, ownership, and privileges. Flyway connects as `identity_test_migrator`; the runtime datasource connects as `identity_test_app`; and `identity_test_owner` is `NOLOGIN` and owns the database only.

Canonical tests do not use `@ServiceConnection` because the runtime JDBC datasource and Flyway require separate credentials. They bind both connection paths explicitly and never read `.env.local`, developer-local PostgreSQL credentials, CI database secrets, or production/staging secrets. Embedded credentials are obviously fake deterministic values scoped exclusively to the ephemeral test container.

Floating PostgreSQL image tags, including `latest` and unpinned `postgres:17`, are prohibited for this path. Digest updates require an explicit reviewed change. The test must prove the positive migrator/runtime permissions and the negative runtime DDL, administrative, Flyway-history, and owner-login boundaries before this baseline can be represented as delivered.

## Lightweight Threat Model

### Trust Boundaries

| Boundary | Assets crossing it | Required control direction |
| -------- | ----------------- | -------------------------- |
| Browser/mobile client ↔ public ingress/API | Credentials, tokens, profile data, commands, uploads | TLS, Cognito token validation, authorization, input validation, rate limits, WAF, safe errors. |
| Public ingress ↔ private services | HTTP/WebSocket requests, correlation IDs | ALB/WAF boundary, least-privilege networking, request limits, structured audit/error logging. |
| Service ↔ PostgreSQL | Canonical profile, auction, financial, audit, and outbox data | Per-service credentials, TLS in managed environments, Flyway, least privilege, no cross-service access. |
| Service ↔ event infrastructure | Versioned domain/integration events | Transactional outbox, authenticated IAM, schema validation, idempotent inbox, DLQ controls. |
| Service ↔ Cognito / payment provider | JWTs, OAuth flows, webhook messages | Issuer/audience validation, signed/replay-protected webhooks, secret management, idempotency. |
| Service ↔ S3/media | Upload URLs, media objects/metadata | Scoped presigned URLs, type/size validation, malware scanning policy, confirmation before publication. |
| Operator/CI ↔ AWS and deployment | Infrastructure changes, artifacts, logs, secrets | SSO/MFA, least-privilege roles, immutable artifacts, scanned images, audit trails, no public SSH. |

### Highest Risks and Required Controls

| ID | Threat | Affected area | Required control | Planned evidence |
| -- | ------ | ------------- | ---------------- | ---------------- |
| TM-01 | Credential theft, token forgery, or token misuse | Identity/API | Cognito, JWT issuer/audience/signature validation, short-lived tokens, MFA for admin, no token logging | Phase 1 auth/security tests. |
| TM-02 | Broken role/ownership checks and IDOR | APIs/profile/auction/admin | Central authorization policy, actor-to-resource ownership checks, deny-by-default, matrix tests | Phase 1–2 authorization tests. |
| TM-03 | SQL injection, malformed input, or unsafe error disclosure | APIs/data | Typed validation, parameterized persistence, RFC 9457 safe responses, payload limits | S001-T03 tests. |
| TM-04 | Cross-service data access or credential overreach | Data | Logical DB/users, least privilege, cross-database denial tests | S001-T05 integration evidence. |
| TM-05 | Duplicate command/event/webhook produces multiple effects | Events/financial workflows | Idempotency keys, outbox/inbox, unique constraints, signed webhook replay protection | S001-T06 and Phases 4–6 tests. |
| TM-06 | Unauthorized or malicious media upload | Media | Short-lived scoped presigned URL, content-type/size limits, malware scan/quarantine, object confirmation | Phase 2 tests/runbook. |
| TM-07 | Secrets exposed in code, logs, CI, or client bundles | Operations | Secrets Manager/SSM, CI secret masking, least privilege, secret scanning, log redaction | S001-T07 scan/policy evidence. |
| TM-08 | Infrastructure compromise or unsafe operator action | Operations | No public SSH, SSM/SSO/MFA, audited IAM, CDK review, protected deployment path | Phases 1/9/10 evidence. |
| TM-09 | Denial of service or abusive traffic | Ingress/realtime | WAF, rate limits, payload/connection limits, queue backpressure, alarms | Phases 7/9/10 testing. |
| TM-10 | Tampering/loss of audit or financial records | Data/operations | Append-only audit/ledger, backups, restore drills, restricted write access | Phases 4/5/9 evidence. |

## Data Classification

| Class | Examples | Storage/handling rule | Logging rule | Retention / access |
| ----- | -------- | --------------------- | ------------ | ------------------ |
| PUBLIC | Published auction titles, descriptions, approved media, public projections | May be publicly delivered after publication rules pass. | May log identifiers/metadata needed for operations. | Public read access only through approved APIs/CDN. |
| INTERNAL | Service configuration (non-secret), operational metrics, deployment metadata, contract schemas | Store in controlled repositories/observability systems. | Log only necessary operational detail. | Developer/operator access by role. |
| CONFIDENTIAL | User profile data, email/phone, seller status, internal moderation/audit records | Encrypt in transit and at rest; service-owned access only. | Never log raw values; use IDs/redaction. | Least privilege; retention/deletion policy to be defined before alpha. |
| RESTRICTED | Passwords (Cognito-owned), JWTs/refresh tokens, OAuth client secrets, payment webhook secrets, bank/payment data, credentials | Never commit; use Cognito/provider custody or Secrets Manager/SSM. Encrypt and tightly scope access. | Never log values, headers, or unredacted payloads. | Need-to-know only; rotate/revoke on exposure. |

### Financial Integrity and Audit Rule

Ledger and settlement records are governed by an integrity and audit rule, not a data-classification level: Transaction Core keeps canonical financial records; ledger entries are append-only; corrections use reconciliation or compensating entries with an audit trail; history is never arbitrarily edited or deleted. Their confidentiality classification is applied according to the content they contain, while payment credentials and sensitive payment information remain `RESTRICTED`.

## Initial SLO and Signal Baseline

These approved public-production targets are from blueprint section 13; they are not achieved by this task. They require telemetry, load tests, and operational evidence in later phases. S001-T03/T06 implement the first local signals.

| Service signal | Proposed target | Measurement / alert intent | Initial implementation owner |
| -------------- | --------------- | -------------------------- | ---------------------------- |
| Public REST availability | 99.9% monthly | Successful synthetic/request ratio; alert on sustained availability breach | Phase 1 / platform |
| Public REST latency | p95 < 300 ms, p99 < 800 ms excluding external provider latency | HTTP duration histogram by route/status | S001-T03 baseline; Phase 9 validation |
| Auction command completion | p95 < 500 ms while healthy | Command duration and failure metrics | Phase 2–3 |
| Bid acceptance completion | p95 < 800 ms while healthy | Transaction command duration and conflict/retry metrics | Phase 4 |
| Duplicate financial effect | 0 | Reconciliation and idempotency violation counter | Phases 4–6 |
| Multiple winning bids | 0 | Constraint/reconciliation alarm | Phases 4–5 |
| Lost completed settlement | 0 | Settlement reconciliation alarm | Phase 5 |
| Outbox oldest event age | < 60 seconds steady state | Oldest unprocessed outbox timestamp; backlog/failure alarm | S001-T06 baseline; later production alarm |
| SQS consumer age | Workflow-specific SLO | Approximate age/backlog and DLQ metrics | Phase 3 onward |
| Search projection freshness | p95 < 30 seconds initially | Projection lag histogram | Phase 8 |

Initial common signal convention: every request/event flow must support safe correlation identifiers; request duration/error, queue/outbox age/failure, and trace propagation are the first signals. Alert thresholds and dashboards become operationally enforced in Phase 9/10.

## Cost Assumptions and Controls

| Environment | Proposed posture | Assumption / limit | Owner | Evidence still required |
| ----------- | ---------------- | ------------------ | ----- | ----------------------- |
| Local development | Containers and local tools | Developer-managed cost; no cloud resources required for S001 | Developer | Local setup documentation in S001-T05/T08. |
| Development/demo/private alpha | Production-shaped low-cost topology; not High Availability or complete production topology | Approximately USD 30/month: one small Graviton EC2 host, Docker Compose, one PostgreSQL, self-hosted Valkey, limited CloudWatch retention, encrypted backups to S3 | Product Owner / Project Owner | Current regional pricing, resource sizing, AWS budget, and anomaly-alert configuration before deployment. |
| Public production | Managed AWS topology | Budget is intentionally not fixed in blueprint; require workload forecast and separate approval of managed topology/cost envelope before Phase 10 | Product Owner / Project Owner | Cost model, budget thresholds, anomaly detection, and monthly review. |

For any AWS environment, proposed budget notifications are 50%, 80%, and 100% of the approved monthly envelope plus anomaly detection, consistent with blueprint section 13.3. No infrastructure is provisioned or cost committed by this record.
