# SPRINT-001 — Engineering Baseline Demonstration

## Sprint Context

- Roadmap phase: Phase 0 — Decision lock and engineering foundation
- Milestone: R0 — Engineering Baseline
- Sprint duration: Two weeks (2026-08-10 through 2026-08-21, planned)
- Effective capacity: 45–50 hours for one developer
- Planned committed work: 45 hours; reserve 5 hours for integration/defects is not allocated to backlog tasks
- Target environment: Local developer environment and CI baseline
- Target users: Developers and operators
- Sprint status: IN_PROGRESS

## Sprint Goal

An engineer can build and verify the initial service baseline with versioned contracts, isolated local PostgreSQL, and one traced, idempotent outbox-to-inbox sample flow.

## Blueprint Traceability

| Blueprint section/exit gate                                       | Sprint contribution                                                                                                                                                                                         |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Principles P-01, P-02, P-05 through P-08, P-11, P-13 through P-15 | Establish Java-owned invariants, PostgreSQL transaction boundaries, data ownership, outbox/inbox, compatible contracts, observability, and evidence-based platform evolution.                               |
| Sections 17, 20, 21, and 31                                       | Establish hexagonal service boundaries, RFC 9457/W3C API conventions, structured observability, and architecture/integration/contract test foundations.                                                     |
| Section 22                                                        | Establish early GitHub Actions verification; retain CodeBuild/CodePipeline, ECR deployment, Inspector, and CDK synthesis as Phase 1+ target work.                                                           |
| Phase 0 exit gate (Section 33)                                    | Deliver independently buildable Spring Boot template, Java 21, hexagonal architecture, OpenAPI/event baseline, Testcontainers, Flyway, structured logging, architecture tests, and one request/event trace. |

## Entry Criteria

- [x] Approved blueprint is present in the repository.
- [x] Current repository has been assessed and Phase 0 / R0 confirmed.
- [x] Sprint capacity is set to 45–50 effective hours.
- [x] Product owner has confirmed the CI provider/image registry target when S001-T02 begins.

## Committed Scope

### Primary Vertical Slice

One non-financial sample command in `identity-profile-service` traverses HTTP validation and Problem Details, idempotency storage, a PostgreSQL transaction, an outbox record, an inbox consumer effect, and correlated structured logs/traces. It is a technical proof only; no Cognito profile feature is delivered.

### Supporting Work

- Decision, threat, data-classification, SLO, and cost-model records.
- Repository-wide baseline/version and independent-build definition.
- Contract registry and CI compatibility-check design.
- Isolated local PostgreSQL databases/users, Flyway, and canonical Testcontainers verification baseline.
- Supply-chain scan execution and local operational runbook.
- Revised-blueprint ADR delta for approved Java/AWS boundary, security, deployment, and recovery decisions.

### Required Production Coverage Improvements

- Data ownership: BASIC → TESTED for the local baseline.
- API and event contracts: BASIC/NONE → TESTED for registered baseline contracts.
- Idempotency: NONE → TESTED for the sample flow.
- Observability: BASIC → TESTED for the sample flow.
- Security scanning: BASIC → TESTED where CI evidence is available.
- Runbooks and cost controls: NONE → BASIC.

## Explicitly Out of Scope

- Cognito configuration, registration/login, profile APIs, or business authorization (Phase 1).
- Auction, media, lifecycle, bidding, wallet, ledger, settlement, payments, realtime fanout, notifications, or read projections (Phases 2–8).
- AWS account provisioning or production deployment pipeline beyond a documented Phase 0 CI baseline decision.
- Completion claims for the entire Phase 0 exit gate without executed evidence.

## Sprint Backlog

| Order | Task ID  | Task                                                          | Estimate | Uncertainty | Status      |
| ----: | -------- | ------------------------------------------------------------- | -------: | ----------- | ----------- |
|     1 | S001-T01 | Lock initial engineering decisions and risk baselines         |       5h | MEDIUM      | COMPLETED   |
|     2 | S001-T02 | Establish repository build and version baseline               |       5h | MEDIUM      | COMPLETED   |
|     3 | S001-T03 | Create identity service technical adapter baseline            |       6h | MEDIUM      | COMPLETED   |
|     4 | S001-T04 | Establish versioned contract registry and compatibility check |       5h | MEDIUM      | COMPLETED   |
|     5 | S001-T05 | Provision isolated local PostgreSQL and Flyway baseline       |       7h | HIGH        | COMPLETED   |
|     6 | S001-T06 | Prove idempotent outbox-to-inbox sample flow                  |       8h | HIGH        | COMPLETED   |
|     7 | S001-T07 | Add supply-chain scan evidence and CI verification path       |       5h | MEDIUM      | COMPLETED   |
|     8 | S001-T08 | Publish local baseline runbook and sprint evidence            |       4h | LOW         | READY       |
|     9 | S001-T09 | Reconcile revised blueprint decision delta                    |       4h | MEDIUM      | READY       |

## Stretch Backlog

| Task ID  | Task                                                                  | Dependency                |
| -------- | --------------------------------------------------------------------- | ------------------------- |
| S001-S01 | Add second empty service template from the approved boundary list     | S001-T02, S001-T03        |
| S001-S02 | Run a clean-checkout reproducibility drill on a second machine/runner | S001-T02 through S001-T07 |

## Dependency Map

`S001-T01 → S001-T02 → S001-T03 → S001-T04 → S001-T05 → S001-T06 → S001-T07 → S001-T08`, with `S001-T09` running in parallel before later AWS/platform phases.

T01 may proceed independently of the existing code. T02–T04 can overlap after T01’s decisions are approved. T05 must establish persistence before T06. T07 consumes build and SBOM outputs from T02/T03/T06. T08 captures actual, not planned, evidence from all prior tasks.

## Risks

| Risk                                                                                         | Severity | Mitigation                                                                                                                                                                                                                              | Owner                     |
| -------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Early CI differs from the Phase 1 target delivery platform                                   | Medium   | Keep GitHub Actions as the approved repository verification baseline; document CodeBuild/CodePipeline, ECR deploy, Inspector, and CDK synthesis as later target work rather than falsely claiming them in Phase 0.                      | Product owner / developer |
| Docker/Testcontainers unavailable on developer machine                                       | High     | Restore Docker/Testcontainers before T05 closure; local PostgreSQL is supplementary evidence, not a substitute for the canonical clean-environment verification.                                                                        | Developer                 |
| Revised blueprint specifies a monorepo while API and web are currently separate repositories | Medium   | Record an explicit topology decision under T09: migrate to a monorepo before later phases or approve the two-repository baseline with equivalent contract/build governance. Do not claim the monorepo deliverable before that decision. | Product owner / developer |
| Existing service skeleton conflicts with required hexagonal boundaries                       | Medium   | Add only technical baseline seams and architecture tests; record an ADR rather than silently redesigning.                                                                                                                               | Developer                 |
| Outbox/inbox proof grows into platform framework work                                        | High     | Keep one service, one non-financial sample command, one local consumer, and one event envelope.                                                                                                                                         | Developer                 |
| Revised blueprint adds mandatory decision areas after T01 completion                         | Medium   | Preserve approved ADR-001 through ADR-016; record only the delta under T09 with explicit supersession/cross-links where needed.                                                                                                         | Product owner / developer |

## Task Specifications

## S001-T01 — Lock initial engineering decisions and risk baselines

### Purpose

Provide the approved, traceable decisions required before foundational implementation and satisfy the first part of the Phase 0 exit gate.

### Scope

Create proposed ADR-001 through ADR-015 from the blueprint list; add a lightweight threat model, data classification, initial SLOs, local/alpha cost assumptions, and decision approval workflow.

### Out of Scope

AWS provisioning, a full compliance certification, or changing the approved architecture.

### Dependencies

Blueprint and `docs/decisions/BUSINESS_DECISIONS.md`.

### Implementation Notes

Use concise records under `docs/adr/`; mark unapproved decisions `PROPOSED` and cross-link sources.

### Acceptance Criteria

- [x] ADR-001 through ADR-015 each state decision, context, consequences, status, and blueprint reference.
- [x] Threat model identifies trust boundaries and highest risks for identity, APIs, data, events, media, and operations.
- [x] Data classification, initial SLO targets, cost assumptions, and approval owner are documented.

### Required Tests

- Unit: N/A.
- Integration: N/A.
- Contract: Markdown link/reference check if available.
- Architecture: N/A.
- Concurrency: N/A.
- Security: Threat-model review against blueprint security requirements.
- End-to-end: N/A.

### Observability

Define initial request, error, queue, and trace signals to be implemented by T03/T06.

### Security

Record authentication, authorization, secrets, PII, IDOR, upload, webhook, and audit threats; do not store secrets.

### Documentation

ADR set, threat model, data classification, SLO/cost records, Delivery State update.

### Rollback

Revert proposed documents; approved changes require an ADR supersession.

### Estimate

- Size: Small
- Estimated hours: 5
- Uncertainty: MEDIUM

### Definition of Done

Documents are complete, internally linked, reviewed for blueprint consistency, and state reflects approval status.

### Evidence

- Commit/PR: Unavailable; the current working directory has no Git metadata.
- Commands: `Get-Content` task/dependency review; `rg` markdown/reference checks recorded in the task evidence below.
- Test results: Markdown link/reference and required-section verification passed; threat-model review passed against blueprint Phase 0, security, observability, reliability, and cost requirements. Product Owner / Project Owner approved the ADRs and baseline on 2026-08-05.
- Deployment: Not applicable; documentation-only task.
- Screenshots/log references: `docs/adr/ADR-001-*.md` through `ADR-015-*.md`; `docs/decisions/PHASE_0_BASELINES.md`.

## S001-T02 — Establish repository build and version baseline

### Purpose

Make the starting repository reproducible and define how services must build independently.

### Scope

Add a repository-level engineering baseline documenting/pinning Java 21, Spring Boot 3.5.16, Maven Wrapper, Node, and CDK v2; add portable clean build/lint verification entry points and CI configuration after provider approval.

### Out of Scope

Implementing all six services, deploying AWS infrastructure, or modifying product features.

### Dependencies

S001-T01 approval of build, CI, and image-registry decisions.

### Implementation Notes

Preserve existing `identity-profile-service` and `web` tooling; explicitly distinguish existing partial pins from repository-wide enforcement.

### Acceptance Criteria

- [x] A clean checkout has documented commands that build `identity-profile-service` and lint/build `web` independently.
- [x] Exact approved runtime/tool versions and wrapper policy are recorded and machine-verifiable where practical.
- [x] CI executes the baseline commands or contains a documented provider-approved handoff if credentials are unavailable.

### Required Tests

- Unit: Existing service test suite runs.
- Integration: N/A.
- Contract: N/A.
- Architecture: Build entry points reject unsupported runtime versions.
- Concurrency: N/A.
- Security: CI does not expose credentials.
- End-to-end: Clean-build drill.

### Observability

Publish build artifacts/log links from CI.

### Security

Use least-privilege CI permissions and no committed secrets.

### Documentation

Developer setup and CI baseline instructions; Delivery State update.

### Rollback

Remove new CI/workspace files; existing service build remains independently runnable.

### Estimate

- Size: Small
- Estimated hours: 5
- Uncertainty: MEDIUM

### Definition of Done

Commands, pinned-version evidence, CI result, and documentation are recorded.

### Evidence

- Commit/PR: API and web baseline changes were committed and pushed to their respective private repositories; commit identifiers and workflow logs are intentionally not copied into public-facing documentation.
- Commands: 2026-08-11: `api\\scripts\\verify-build-baseline.ps1` — PASS; `api\\infra\\npm ci` — PASS; `api\\infra\\npm run cdk:version` — PASS (`2.1135.1`); `web\\npm ci` — PASS; `web\\npm run lint` — PASS; `web\\npm run build` — PASS. `npm ci` reported 7 web vulnerabilities (1 low, 6 high) and the CDK toolchain reported 1 high vulnerability; these are recorded for S001-T07, not silently changed in this build-baseline task.
- Test results: Maven Enforcer passed Java 21 and Maven version rules; Maven `verify` built the executable JAR and CycloneDX SBOM. Web toolchain preflight accepted Node 24.15.0/npm 11.12.1; lint and Next.js production TypeScript/static build passed. The first API and web GitHub Actions workflow runs also passed on 2026-08-11, confirmed by the repository owner; logs are private.
- Deployment: Not applicable. Amazon ECR is approved for future image publishing; no credentials or ECR deployment are used by T02.
- Screenshots/log references: `docs/runbooks/BUILD_VERSION_BASELINE.md`; `infra/package-lock.json`; `.github/workflows/api-baseline.yml`; web repository `docs/BUILD_BASELINE.md` and `.github/workflows/web-baseline.yml`; `services/identity-profile-service/target/surefire-reports/com.auctionpromax.identityprofileservice.IdentityProfileServiceApplicationTests.txt`.

## S001-T03 — Create identity service technical adapter baseline

### Purpose

Make the existing service skeleton expose the Phase 0 technical seams needed by the sample vertical slice.

### Scope

Implement health/liveness/readiness, RFC 9457 Problem Details handling, W3C Trace Context-compatible correlation/trace propagation, ECS structured logging, OpenTelemetry-compatible tracing configuration, and hexagonal package-boundary architecture tests in `identity-profile-service`.

The temporary technical endpoint is `POST /internal/technical-baseline/validate`. It proves only the Phase 0 HTTP/validation/observability seam; it is not a stable public business contract. S001-T04 decides whether to register this endpoint or replace it with the later S001-T06 sample-command contract.

### Out of Scope

Cognito integration, profile CRUD, persistent business entities, or generic shared-framework extraction.

### Dependencies

S001-T02; baseline signals/requirements from S001-T01.

### Implementation Notes

Use the existing declared dependencies. Keep domain/application/ports/adapters boundaries explicit and testable. The already-created `adapter.in.web` technical packages remain valid inbound-adapter seams; before real application use cases are added, introduce `ports.in` and `ports.out` rather than leaking adapter types inward.

- Default configuration exposes only the Actuator `health` endpoint. The local profile may additionally expose `info` and `metrics`; no other Actuator endpoint is exposed.
- Enable the dedicated liveness and readiness health groups. The required local paths are `/actuator/health/liveness` and `/actuator/health/readiness`.
- Use Spring Boot ECS JSON console logging for local technical evidence. Correlation MDC fields and SLF4J fluent key-value fields must appear in the structured event.
- Treat `correlationId` separately from Micrometer tracing `traceId` and `spanId`; preserve W3C Trace Context propagation. Local sampling may be `1.0`; an external trace backend is not required for this task.
- Implement error translation in a `@ControllerAdvice` extending `ResponseEntityExceptionHandler`. Handle `MethodArgumentNotValidException`, `HandlerMethodValidationException`, `ConstraintViolationException`, and `HttpMessageNotReadableException` as safe 400 Problem Details responses; sanitize unexpected errors as 500 responses.
- Do not add entities, repositories, Flyway migrations, Cognito, idempotency, outbox, inbox, or a production endpoint intentionally designed to throw an exception. Use unit tests or test-only MVC support to cover unexpected-error sanitization.

### Acceptance Criteria

- [ ] Liveness and readiness endpoints return documented statuses in a local run.
- [ ] Invalid and malformed sample input return RFC 9457 responses without stack traces, exception classes, sensitive values, or echoed request bodies.
- [ ] A sample request preserves a valid correlation identifier, replaces an invalid one, and emits an ECS structured log containing correlation ID, trace ID, span ID, and a fixed event field.
- [ ] Architecture tests fail when domain/application code imports forbidden adapter packages, and package-cycle checks pass.

### Required Tests

- Unit: Problem Details mapper and correlation behavior, including an unexpected-error sanitization case.
- Integration: Actuator, valid correlation, invalid correlation, validation-failure, and malformed-JSON HTTP tests.
- Contract: Error response schema check for `application/problem+json`.
- Architecture: ArchUnit package-boundary and cycle tests.
- Concurrency: N/A.
- Security: Error sanitization test.
- End-to-end: Local request trace check.

### Observability

Health, request duration/error counters, correlation ID, trace ID, span ID, and ECS structured success/error logs.

### Security

Sanitize exceptions; no token/PII logging; expose only intended actuator endpoints.

### Documentation

Endpoint, local telemetry, and explicit Actuator exposure instructions.

### Rollback

Remove adapters/configuration; no persistent schema or public business contract is introduced.

### Estimate

- Size: Medium
- Estimated hours: 6
- Uncertainty: MEDIUM

### Definition of Done

Implementation, automated tests, architecture tests, observability evidence, and documentation pass. The T03 build gate is `mvnw.cmd test` and `mvnw.cmd verify`. `mvnw.cmd -Pit-local verify` is S001-T05 database-isolation evidence and is not required to complete T03.

### Evidence

- Commit/PR: Pending; record the actual commit/PR reference after committing the T03 changes.
- Commands: 2026-08-20 final closure: `services\identity-profile-service\mvnw.cmd clean test` — PASS (28 tests, 0 failures, 0 errors); `services\identity-profile-service\mvnw.cmd verify` — PASS. `clean` removed a stale compiled test class that had no corresponding source file; the source-only test suite is database-free under the `t03` profile. Local technical evidence: `services\identity-profile-service\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=technical-local"` — PASS; liveness/readiness, technical validation, validation/malformed Problem Details, W3C trace/correlation, ECS event, and `http.server.requests` checks — PASS.
- Test results: T03 MVC validation/security, Actuator health, correlation-filter, RFC 9457 Problem Details/sanitization, structured logging, and ArchUnit boundary/cycle tests passed. The default Failsafe configuration skipped integration tests during `verify`; `-Pit-local verify` remains T05-only evidence.
- Deployment: Not applicable; Phase 0 local/CI technical baseline only.
- Screenshots/log references: `services/identity-profile-service/target/surefire-reports/`; `services/identity-profile-service/target/t03-step12-final.out.log`; `docs/runbooks/IDENTITY_PROFILE_TECHNICAL_BASELINE.md`.

## S001-T04 — Establish versioned contract registry and compatibility check

### Purpose

Prevent undocumented API/event/realtime changes and advance the Phase 0 contract gate.

### Scope

Create repository contract locations, versioning rules, an initial non-financial OpenAPI 3.1 sample contract under `/api/v1`, an event envelope schema, realtime protocol placeholder, and an automated compatibility/lint check.

### Out of Scope

Full business APIs, EventBridge/SQS deployment, or WebSocket implementation.

### Dependencies

S001-T01 and S001-T02.

### Implementation Notes

Use N/N-1-compatible additive-change rules from the blueprint. Align the sample command/event with S001-T06 without implementing it here.

### Acceptance Criteria

- [x] Registry has separate versioned locations for OpenAPI, integration events, and realtime messages.
- [x] Sample API request/response and event envelope specify identifiers, version, W3C trace context/correlation, idempotency where applicable, UTC ISO-8601 timestamps, stable Problem Details codes, and N/N-1 compatibility rules.
- [x] CI/local command fails on malformed schema or a prohibited breaking change fixture.

### Required Tests

- Unit: N/A.
- Integration: N/A.
- Contract: Schema lint and known-breaking-change fixture.
- Architecture: Registry ownership/path validation.
- Concurrency: N/A.
- Security: Contract examples contain no secrets/PII.
- End-to-end: S001-T06 verifies implementation matches registered sample contract.

### Observability

Require correlation and event identifiers in envelope/log conventions.

### Security

Document payload classification and forbid secret-bearing event fields.

### Documentation

Contract governance/readme and Delivery State update.

### Rollback

Remove unused registry and CI job; no runtime state is altered.

### Estimate

- Size: Small
- Estimated hours: 5
- Uncertainty: MEDIUM

### Definition of Done

Schemas, compatibility verification, fixtures, and usage instructions are committed with successful evidence.

### Evidence

- Commit/PR: Contract-registry change was pushed; the associated GitHub Actions run is retained in the private repository.
- Commands: 2026-08-25: `contracts\\npm.cmd run lint:openapi` — PASS; `contracts\\npm.cmd run validate:schemas` — PASS; `contracts\\npm.cmd run test:fixtures` — PASS; `contracts\\npm.cmd run test:governance` — PASS; `scripts\\verify-contracts.ps1 -Mode Registry` — PASS; `scripts\\verify-contracts.ps1 -Mode Fixture` — PASS.
- Test results: Contract: Redocly accepted the OpenAPI 3.1 `/api/v1` sample; Ajv accepted the event and realtime JSON Schemas; the malformed-schema fixture was rejected; oasdiff rejected the candidate that removes required `201.status`, and the verifier treated that intentional rejection as a passing fixture test. Architecture: registry ownership/path and event/realtime N/N-1 additive-change rules passed. Security: final review found only synthetic UUIDs, fixed purpose values, safe timestamps, and empty/public payloads in examples/fixtures; no PII, token, password, secret, credential, or connection string is present. The governance test also rejects prohibited example field names.
- Deployment: Not applicable; this task adds registry/verification only and no runtime endpoint, database, AWS, event transport, or WebSocket implementation.
- Screenshots/log references: Local terminal outputs for the commands above; `contracts/tests/contract-fixtures.test.mjs`; `contracts/tests/contract-governance.test.mjs`; `contracts/fixtures/malformed/`; `contracts/fixtures/prohibited-breaking-change/`; GitHub Actions private workflow job `verify-contract-registry` — PASS (run link/log retained by repository owner).

## S001-T05 — Provision isolated local PostgreSQL and Flyway baseline

### Purpose

Prove the database-per-service ownership model locally before business persistence work begins.

### Scope

Implement the ADR-016 local PostgreSQL baseline for the four relational services and their separate local-integration test databases: owner/migrator/runtime roles, database/schema/object privileges, safe bootstrap/status/verify/reset commands, identity Flyway credentials, automated isolation verification, and canonical Testcontainers verification for `identity-profile-service`.

### Out of Scope

RDS/Aurora provisioning, schemas for later service business domains, cross-service joins, AWS adapter integration, or DynamoDB/Valkey production setup.

### Dependencies

S001-T01 decision records, S001-T02 local tooling baseline, S001-T03 service configuration seam.

### Implementation Notes

Follow the revised blueprint Phase 0 database/testing baseline and ADR-016: each `*_owner` is NOLOGIN and owns only the database; each `*_migrator` owns the dedicated application schema and Flyway-created objects; each `*_app` is runtime DML-only. Development and test databases/credentials are separate. No cross-database foreign keys, views, triggers, or joins. `mvn test` is database-free; `mvn -Pit-local verify` proves the local database path; and default `mvn verify` proves the canonical Testcontainers integration path. Local PostgreSQL is supplementary evidence, not a Testcontainers substitute.

The canonical Identity Testcontainers path follows `docs/decisions/PHASE_0_BASELINES.md`: immutable PostgreSQL 17 image digest, test-only bootstrap administrator, separate owner/migrator/runtime roles, explicit runtime datasource and Flyway property binding, and no `.env.local` dependency. This approved implementation decision is backed by the execution evidence recorded below.

### Acceptance Criteria

- [x] One local startup command converges the four development and four local-test databases, distinct owner/migrator/app roles, application schemas, and `PUBLIC` revocations.
- [x] Identity Flyway uses a separate migrator credential and schema history table; runtime uses only its app credential.
- [x] Automated verification proves role attributes/membership, ownership, schema DML/DDL boundary, and the complete cross-database allow/deny matrix.
- [x] `mvn -Pit-local verify` uses only `identity_test_db`, and default `mvn verify` proves the clean-environment Testcontainers path without using local database credentials.
- [x] Local data is excluded from version control and startup credentials are documented without committed secrets.

### Required Tests

- Unit: Configuration parsing where applicable.
- Integration: local PostgreSQL/Flyway startup and isolation test; Testcontainers PostgreSQL/Flyway clean-environment test.
- Contract: N/A.
- Architecture: No cross-service datasource configuration.
- Concurrency: N/A.
- Security: Least-privilege access-denial test.
- End-to-end: Local identity service startup against containerized DB.

### Observability

Readiness reflects database connectivity; migration failures are diagnosable without credentials in logs.

### Security

Separate credentials, least privilege, secret placeholders only, no logs of connection strings with passwords.

### Documentation

Local database setup, reset-safe startup, and data ownership notes.

### Rollback

Stop local containers; remove new local volumes through documented developer-owned cleanup only. No shared data is touched.

### Estimate

- Size: Medium
- Estimated hours: 7
- Uncertainty: HIGH

### Definition of Done

Local bootstrap twice, migration, role/isolation test, canonical Testcontainers verification, readiness evidence, and documentation succeed from a clean environment. Do not close this task on static checks alone.

### Evidence

- Commit/PR: Unavailable; the current working directory has no Git metadata.
- Commands: On 2026-08-25, the PostgreSQL 17 loopback preflight passed; two consecutive real `scripts/local-db-bootstrap.ps1` runs converged all four development and four local-test databases; `scripts/local-db-status.ps1` confirmed the expected owners and all 24 least-privilege roles; and `scripts/local-db-verify.ps1` passed the complete 8/8 role, ownership, privilege, DML/DDL, and cross-database allow/deny matrix. `scripts/run-it-local.ps1` is the repository-controlled local-test entry point and temporarily injects only Identity test credentials into the Maven child process.
- Test results: On 2026-08-25, `scripts/run-it-local.ps1` passed with 28 unit tests plus `IdentityProfileServiceApplicationLocalIT` (1 test, 0 failures, 0 errors, 0 skipped). A clean-process-environment default `mvnw.cmd verify` then passed against the immutable PostgreSQL 17 Testcontainers image; Failsafe executed `IdentityProfileServiceApplicationTestcontainersIT` (5 tests, 0 failures, 0 errors, 0 skipped). The canonical suite verifies separate owner/migrator/runtime roles, Flyway ownership and installation identity, runtime DML, denied runtime DDL, database connectivity, and readiness health.
- Deployment:
- Screenshots/log references: ignored local evidence under `services/identity-profile-service/target/s001-t05-evidence/` (`01-bootstrap-preflight.log` through `07-testcontainers-verify.log`) and the generated Failsafe reports under `services/identity-profile-service/target/failsafe-reports/`. No hosted CI result is claimed for T05.

## S001-T06 — Prove idempotent outbox-to-inbox sample flow

### Purpose

Deliver the Sprint 001 primary vertical slice and prove the transactional delivery skeleton required by Phase 0.

### Scope

Implement one non-financial sample command in identity-profile-service that validates input, records an idempotency key/result, commits an outbox event in the same PostgreSQL transaction, relays it locally, and records an inbox receipt/effect exactly once under duplicate delivery.

### Out of Scope

EventBridge/SQS deployment, profile business behavior, money, bids, wallets, settlement, generic enterprise framework, or multi-service choreography.

### Dependencies

S001-T03, S001-T04, and S001-T05.

### Implementation Notes

Use the registered contract and a service-local consumer/effect. Clearly document retry, duplicate, and failure behavior. Ensure the relay never makes the database transaction depend on external delivery.

The pre-implementation blockers were resolved on 2026-08-26. The additive
OpenAPI refinement and the authoritative key/scope/fingerprint/causation/relay/
retry decisions are recorded in `contracts/README.md` and summarized in
`docs/guides/S001-T06-blocker-resolution.html`. This decision evidence makes
T06 implementable; it is not runtime or acceptance evidence and does not change
the task status to COMPLETED.

### Acceptance Criteria

- [x] Repeating the same command with the same idempotency key returns the stored response and creates one business effect/outbox event.
- [x] Command transaction atomically persists idempotency state and outbox row; forced rollback leaves neither durable effect.
- [x] Delivering the same event at least twice causes one inbox effect/receipt outcome.
- [x] A test/demo trace links HTTP correlation ID, diagnostic idempotency fingerprint, outbox event ID, relay attempt, and inbox receipt without logging the raw key.
- [x] Failed relay attempts remain retryable and observable without losing the outbox row.

### Required Tests

- Unit: Idempotency, envelope, and retry state transitions.
- Integration: PostgreSQL transactional rollback, outbox persistence, duplicate inbox delivery.
- Contract: Request/response/event validation against S001-T04 schemas.
- Architecture: Domain/application adapters remain boundary compliant.
- Concurrency: Concurrent duplicate idempotency-key test.
- Security: Input validation, no sensitive payload logging, internal consumer boundary check.
- End-to-end: One local command through relay and inbox effect with correlated evidence.

### Observability

Metrics for idempotency replays, outbox pending/failed/processed, relay attempts, inbox duplicates; structured logs and trace links using safe identifiers.

### Security

Validate idempotency key size/format, avoid replaying across actors if actor context is later introduced, and never log payload secrets.

### Documentation

Technical flow diagram, retry/duplicate behavior, contract link, and Delivery/coverage state updates.

### Rollback

Disable local relay via configuration and retain outbox rows for investigation; rollback application version without database rollback.

### Estimate

- Size: Medium
- Estimated hours: 8
- Uncertainty: HIGH

### Definition of Done

All specified tests pass, the local end-to-end trace is captured, metrics/logs are inspectable, and actual evidence is recorded.

### Evidence

- Commit/PR:
- Commands: 2026-09-06 `mvn.cmd verify`; `mvn.cmd -Pit-local verify` against an ephemeral PostgreSQL 17 local-evidence container; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-contracts.ps1 -Mode Registry`.
- Test results: 110/110 Surefire tests and 10/10 canonical Testcontainers tests passed; 4/4 supplementary local-profile integration tests passed; OpenAPI lint, event/realtime JSON Schema validation, governance, and Registry N/N-1 compatibility passed.
- Migrations: V2 creates the sample/idempotency/outbox/inbox tables; V3 restores the runtime-role denial on Flyway history; V4 adds relay `locked_by` and `last_attempt_at` metadata. PostgreSQL 17 applied the complete migration chain successfully.
- Runtime evidence: replay creates one sample and one outbox row; forced rollback leaves no durable command effects; concurrent duplicate commands resolve to one sample; duplicate event delivery creates one inbox effect; failed/expired relay state remains durable and retryable. Low-cardinality replay, pending/failed/processed, relay-attempt, and inbox-duplicate metrics are asserted in tests.
- Deployment: Not applicable; Phase 0 local technical proof only. The ephemeral evidence container was removed after verification.
- Screenshots/log references: `contracts/README.md`; `docs/guides/S001-T06-blocker-resolution.html`; `docs/guides/S001-T06-cycle-13-hexagonal-architecture-101.html`; `docs/guides/S001-T06-cycle-14-completion-evidence.html`; `services/identity-profile-service/target/surefire-reports`; `services/identity-profile-service/target/failsafe-reports`; `services/identity-profile-service/target/site/jacoco/index.html`.

## S001-T07 — Add supply-chain scan evidence and CI verification path

### Purpose

Surface dependency and image risk as required by the Phase 0 exit gate.

### Scope

Make SBOM generation, dependency scanning, secret scanning, and container image scanning executable locally and in the early GitHub Actions CI path; define High/Critical finding disposition requirements and document the later CodeBuild/CodePipeline, CDK synthesis, ECR, and Inspector handoff.

### Out of Scope

Remediation of unrelated findings, registry publishing, production image signing, or a full security program.

### Dependencies

S001-T02, S001-T03, and an image build definition where applicable.

### Implementation Notes

Reuse the existing CycloneDX configuration; select scanners consistent with the approved CI/provider decision.

Cycle 0 decision lock (2026 amendment) was finalized on 2026-09-08: the supply-chain decision record `docs/decisions/S001-T07_SUPPLY_CHAIN_DECISIONS.md` was approved by the Repository Owner / Project Owner. Selected toolchain: CycloneDX Maven Plugin 2.9.2 (CycloneDX JSON Schema 1.6), Trivy CLI 0.74.0, Gitleaks CLI 8.30.0 (8.30.1 rejected due to a known detection regression), Cosign CLI 3.1.2 for Trivy release provenance only, and repository-owned PowerShell policy evaluation. The final decision also locks committed pre-execution checksums, Trivy DB age by `VulnerabilityDB.UpdatedAt`, full-SHA pinning for every external Action remaining in the modified workflow, and edit-sensitive scanner-provided Gitleaks fingerprints. S001-T07 moved from `READY` to `IN_PROGRESS` when execution began. Cycle 1 (tool bootstrap and integrity verification) completed locally on Windows x64 on 2026-09-08; no SBOM or scanner PASS claim is made by that cycle.

### Acceptance Criteria

- [x] Identity service SBOM is generated during a documented build path.
- [x] Dependency, secret, and image scan commands run against representative artifacts/images.
- [x] CI records results and fails or requires explicit approved disposition for High/Critical findings; the Phase 1 CodeBuild/CodePipeline, CDK synth, ECR, and Inspector path is documented without being claimed as implemented.

### Required Tests

- Unit: N/A.
- Integration: Scanner commands run against generated artifact/image.
- Contract: N/A.
- Architecture: N/A.
- Concurrency: N/A.
- Security: Seeded policy/fixture verifies a High/Critical finding is surfaced.
- End-to-end: CI job completion evidence.

### Observability

Retain scan summaries/artifact references in CI.

### Security

No scanner tokens or registry credentials in repository; apply least privilege.

### Documentation

Finding disposition policy and developer scan instructions.

### Rollback

Remove scanner job/configuration; no runtime data is affected.

### Estimate

- Size: Small
- Estimated hours: 5
- Uncertainty: MEDIUM

### Definition of Done

SBOM, scans, policy behavior, CI evidence, and instructions are complete.

### Evidence

- Commit/PR:
- Commands: 2026-09-08 Cycle 1 — `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Install-SupplyChainTools.ps1`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-SupplyChainTooling.ps1`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Install-SupplyChainTools.ps1 -VerifyOnly`; `git diff --check`.
- Test results: Cycle 1 tool bootstrap PASS on `windows-x64`. Cosign 3.1.2 checksum/version verification passed; Trivy 0.74.0 checksum, official Sigstore bundle/issuer/tag-specific identity, and version verification passed; Gitleaks 8.30.0 checksum/version verification passed. The pinned Draft 2020-12 JSON Schema compiled in Ajv strict mode; canonical manifest acceptance and 17 schema negative paths passed (version, placeholder checksum, duplicate identity, repository URL, purpose/Sigstore binding, provenance fields, version command/pattern including partial-match patterns, asset mapping, and array order). The deterministic and cached-tool suite passed 47/47 with 0 failures and 0 skipped, including strict rejection of Trivy `0.74.01`, Gitleaks `8.30.0-dev`, and Cosign `v3.1.20`, plus checksum, partial/corrupt cache, executable-cache tamper, archive traversal/duplicate executable, missing provenance inputs, modified Trivy asset, tampered bundle, wrong issuer, and wrong identity negative paths. `git diff --check` passed. Linux x64 and hosted CI execution remain later evidence gates.
- Commands: 2026-09-10 Cycle 2 — `npm --prefix .\contracts ci`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-IdentitySbom.ps1`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-IdentitySbom.ps1 -SkipBuild`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-SupplyChainTooling.ps1`; `git diff --check`.
- Test results: Cycle 2 SBOM trust, validation, and clean-build reproducibility PASS locally on `windows-x64`. The repository-owned CycloneDX 1.6 trust manifest and its three vendored schemas passed checksum verification; the schema test rejected wrong source, placeholder/wrong checksum, and asset-order drift, and confirmed external references resolve only from the local trust set. The identity SBOM validator accepted the generated BOM with root `com.auctionpromax:identity-profile-service:0.0.1-SNAPSHOT` of type `application`, 119 components, and 120 dependencies. All 23 deterministic fixture paths passed and each negative path asserted its expected sanitized failure code, including malformed or incomplete BOMs, wrong root identity, empty inventory/graph, duplicate references, a known test-only component, unavailable referenced schema, trust-manifest tampering, semantic component-version drift, and an allowed BOM-level serial/timestamp-only difference. Two independent Maven Wrapper clean builds were semantically equal after approved normalization; their byte hashes differed only because volatile BOM metadata changed. The `-SkipBuild` entry point passed and explicitly makes no clean-build reproducibility claim. Cycle 1 regression remained 47/47 with 0 failures and 0 skipped. Generated `target/bom.json` and `.tools/` are ignored and not Git-tracked; no raw SBOM was committed. Linux x64, hosted CI, Trivy vulnerability scanning, Gitleaks scanning, image build/scan, policy disposition evaluation, and SARIF remain later gates and are not claimed by Cycle 2.
- Commands: 2026-09-22 Cycle 2 re-verification: `npm.cmd --prefix .\contracts ci`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-IdentityMavenWrapper.ps1`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-IdentitySbom.ps1 -SkipBuild`; two separate `services\identity-profile-service\mvnw.cmd -B clean package -DskipTests` executions with the first `target\bom.json` held in a safe temporary snapshot and the second validated using `Validate-IdentitySbom.mjs --reference-bom`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-SupplyChainTooling.ps1`; `git diff --check`.
- Test results: Cycle 2 re-verification PASS locally on `windows-x64`. A regression in the repository-owned Maven Wrapper 3.3.4 script was fixed: a normal non-link Maven user-home directory no longer crashes when its link target is null or an empty array, and the new wrapper version test passed. The offline CycloneDX trust suite passed 13 checks, including rejection of an extra manifest asset and explicit failure when either the local SPDX or JSF reference schema is absent. The identity fixture suite passed 32 deterministic paths: it additionally proves test-scope exclusion for Testcontainers and ArchUnit, rejects unknown dependency nodes and `dependsOn` edges, rejects a semantic change to an otherwise valid dependency edge, accepts order-only differences, and rejects duplicate or unsupported validator CLI arguments. Two independently executed clean Maven builds each produced `target/bom.json` with 119 components; the second validated semantically against the first with 120 dependencies and PASSed. `-SkipBuild` PASSed with its explicit no-reproducibility-claim notice. Cycle 1 regression remained 47/47 with 0 failures and 0 skipped. `target/bom.json` remains ignored and untracked. Byte-for-byte equality, Linux x64, hosted CI, Trivy, Gitleaks, image scanning, policy disposition, and SARIF are not claimed by this Cycle 2 execution.
- Commands: 2026-09-11 Cycle 3 — `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-VulnerabilityScanning.ps1`; `node .\scripts\supply-chain\Test-VulnerabilityScanContract.mjs`; `node .\scripts\supply-chain\Test-VulnerabilityDispositionSchema.mjs`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-ControlledVulnerableFixture.ps1`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Invoke-VulnerabilityScanning.ps1`; `services\identity-profile-service\mvnw.cmd clean verify`; `services\identity-profile-service\mvnw.cmd dependency:tree -Dincludes=org.apache.tomcat.embed:* -DoutputType=text`; `infra\npm.cmd ci --ignore-scripts`; `git diff --check`.
- Test results: Cycle 3 vulnerability-scanning implementation PASS locally on `windows-x64`: the strict execution contract and disposition registry schemas passed; the PowerShell fixture matrix passed 34/34 with fail-closed coverage for missing/empty DB payload, missing/malformed/stale/future metadata, refresh and post-refresh validation, command-vector drift, forbidden filtering, malformed/empty/wrong-ecosystem reports, both Trivy package-identifier shapes, sanitized-field enforcement, exact/expired/overlong/future dispositions, Critical acknowledgement, Unknown severity, and an empty clean inventory. The controlled SBOM fixture caused Trivy 0.74.0 to detect the pinned `CVE-2021-23337` tuple. Cosign provenance verification now refreshes official Sigstore TUF metadata into an ignored repository-local cache before using that execution's trusted root. Raw Trivy reports were created only in a generated temporary directory and removed on both PASS and policy-blocked paths; only the sanitized inventory was retained under ignored `target/s001-t07-evidence/`.
- Actual scan result: both canonical targets were scanned with a fresh Trivy DB and the policy gate **PASSed**: 0 Critical, 0 High, 7 report-only Medium findings, and 0 accepted-risk dispositions. PostgreSQL was remediated from `42.7.11` to `42.7.12` through a reviewed Spring Boot property override. `aws-cdk-lib` was upgraded from `2.264.0` to `2.269.0`, moving its bundled `brace-expansion` from `5.0.8` to `5.0.9`; `npm ci --ignore-scripts` and npm audit then reported 0 vulnerabilities, and the infra Trivy scan contained no findings. The Project Owner approved a targeted embedded-Tomcat remediation: the original `10.1.55` findings named `10.1.58` as Trivy's patched boundary, but that artifact was unavailable from Maven Central; the released fix `10.1.59` was selected through Spring Boot dependency management via `<tomcat.version>10.1.59</tomcat.version>`, with no risk exception. The dependency tree confirms `tomcat-embed-core`, `tomcat-embed-el`, and `tomcat-embed-websocket` all resolve to `10.1.59`. With Docker Desktop 4.71.0 / Engine 29.4.1 enabled, `mvnw.cmd clean verify` passed: 110 unit/MVC/architecture tests and 10 PostgreSQL 17.11 Testcontainers integration tests completed with 0 failures and 0 errors, four Flyway migrations applied, and the canonical SBOM was regenerated and validated (119 components, 120 dependencies). Linux x64 and hosted CI remain later evidence gates.
- Commands: 2026-09-13 Cycle 4 — `node .\scripts\supply-chain\Test-GitleaksScanContract.mjs`; `node .\scripts\supply-chain\Test-GitleaksConfiguration.mjs`; `node .\scripts\supply-chain\Test-GitleaksAllowlistSchema.mjs`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-GitleaksWorkingTreeSnapshot.ps1`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-GitleaksScanAdapters.ps1`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-GitleaksScanning.ps1`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-ControlledGitleaksFixture.ps1`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Invoke-GitleaksScanning.ps1`; `git diff --check`.
- Test results: Cycle 4 secret scanning PASS locally on `windows-x64`. The strict execution contract, configuration contract, and exact false-positive registry schema passed. Snapshot tests passed 5/5: tracked and nonignored untracked files were included, ignored `.env.local` was excluded, tracked root or nested `.env.local` candidates were rejected before content copy, and temporary snapshots were removed. Adapter tests passed 6/6 with exact dir and full-history git vectors, dedicated finding exit code `3`, explicit 300-second scanner timeout, and fail-closed unexpected exit handling. Sanitizer/policy tests passed 11/11: malformed reports, missing/absolute fingerprints, missing Git commit metadata, unallowlisted findings, expired review records, and case-drifted exact matches were rejected; only the approved seven-field inventory survived normalization. The controlled temporary Git fixture passed in both `dir` and `git` modes, detected `apx-controlled-secret-fixture`, rejected a no-op scanner, verified redact/exit mapping, and removed its temporary repository and reports. The actual verified Gitleaks 8.30.0 scan required a non-shallow repository with 12 reachable commits and PASSed with 0 working-tree findings, 0 history findings, and 0 false positives. No secret, source line, raw report, token fragment, or fixture value was retained as evidence. Linux x64 and hosted CI remain later evidence gates.
- Commands: 2026-09-22 Cycle 5 — local Corretto trust, prebuilt JAR/image, hardened smoke, and Trivy local-image scan gates.
- Test results: Cycle 5 local container verification passed base-image build integrity, image contract, and hardened readiness smoke; mutable upstream tag drift is REVIEW_REQUIRED only. The Trivy scanner completed with required OS and Java detections and retained only a sanitized inventory. Policy is BLOCKED: 29 High and 37 Medium findings, 0 Critical, and no dispositions. This is local-only evidence and makes no hosted-CI, ECR, Inspector, signing, AWS deployment, global-platform-security, or release-ready claim.
- Commands: 2026-09-23 Cycle 6 local preflight: `npm.cmd --prefix .\contracts ci`; `node .\scripts\supply-chain\Test-HostedSupplyChainContract.mjs --repository`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-HostedSupplyChain.ps1`; `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-HostedSupplyChainOrchestration.ps1`; `node .\scripts\supply-chain\Test-HostedSupplyChainEvidence.mjs`; local `Invoke-HostedSupplyChain.ps1`; and `Validate-HostedSupplyChainEvidence.mjs`.
- Test results: Cycle 6 deterministic workflow, state-machine, orchestration, and evidence gates PASSed. The local end-to-end run for `ecdb6e89da1a08d246014f886858c0c8607c6fd2` classified execution integrity as `PASS` and release policy as `BLOCKED`; the validator accepted exactly seven sanitized evidence files. Findings were 7 dependency Medium, 29 container High, 37 container Medium, 0 Critical, and 0 Gitleaks. Hardened smoke cleanup left no matching container. `BLOCKED` is an honest policy result, not an implementation failure; no disposition was created. This is local-only evidence and does not claim hosted execution, default-branch freshness evidence, branch protection, ECR, Inspector, signing, AWS deployment, or release readiness.
- Commands: 2026-09-24 Cycle 6 hosted evidence — previously verified GitHub Actions PR/push verification and default-branch freshness flows. Legacy run, revision, and artifact identifiers are intentionally omitted from this public snapshot.
- Test results: Both hosted flows recorded `executionState=PASS`, `policyState=BLOCKED`, `reviewState=NOT_REQUIRED`, and `failureCode=NONE`. Their downloaded artifacts passed exact seven-file sanitized-evidence allowlist validation and have 30-day retention. The freshness artifact recorded `deltaState=BASELINE_UNAVAILABLE`; this does not weaken the policy block. Retained container counts were 29 High, 37 Medium, and 0 Critical. The `release-policy` jobs intentionally failed because policy was `BLOCKED`; their execution-integrity jobs passed. The repository owner confirmed `supply-chain-verification` is the required Phase 0 branch-protection check and `release-policy` remains visible but non-required. No disposition was created automatically. This completes S001-T07, but does not claim ECR, Inspector, signing, AWS deployment, SARIF, or release readiness.
- Deployment: Not applicable. Cycle 6 makes no registry push, ECR, Inspector, AWS deployment, or application-signing claim.
- Screenshots/log references: `security/tooling/supply-chain-tools.json`; `security/schemas/supply-chain-tools.schema.json`; `scripts/supply-chain/SupplyChainTooling.psm1`; `scripts/supply-chain/Install-SupplyChainTools.ps1`; `scripts/supply-chain/Test-SupplyChainToolSchema.mjs`; `scripts/supply-chain/Test-SupplyChainTooling.ps1`; `security/tooling/cyclonedx-schemas.json`; `security/schemas/cyclonedx-schemas.schema.json`; `security/schemas/cyclonedx/1.6/`; `scripts/supply-chain/Test-CycloneDxSchemaTrust.mjs`; `scripts/supply-chain/Validate-IdentitySbom.mjs`; `scripts/supply-chain/Test-IdentitySbomFixtures.mjs`; `scripts/supply-chain/Test-IdentitySbom.ps1`; `scripts/supply-chain/Test-IdentityMavenWrapper.ps1`; `docs/superpowers/plans/2026-09-22-s001-t07-cycle-2-identity-sbom.md`; `security/tooling/vulnerability-scan-contract.json`; `security/schemas/vulnerability-scan-contract.schema.json`; `security/vulnerability-dispositions.json`; `security/schemas/vulnerability-dispositions.schema.json`; `security/fixtures/vulnerable-sbom/`; `scripts/supply-chain/VulnerabilityScanning.psm1`; `scripts/supply-chain/Invoke-VulnerabilityScanning.ps1`; `scripts/supply-chain/Test-VulnerabilityScanning.ps1`; `scripts/supply-chain/Test-ControlledVulnerableFixture.ps1`; `docs/guides/S001-T07-cycle-3-vulnerability-scanning.md`; `security/tooling/gitleaks-scan-contract.json`; `security/schemas/gitleaks-scan-contract.schema.json`; `security/tooling/gitleaks.toml`; `security/tooling/gitleaks-empty-ignore.txt`; `security/gitleaks-allowlist.json`; `security/schemas/gitleaks-allowlist.schema.json`; `scripts/supply-chain/GitleaksScanning.psm1`; `scripts/supply-chain/Invoke-GitleaksScanning.ps1`; `scripts/supply-chain/Test-GitleaksScanContract.mjs`; `scripts/supply-chain/Test-GitleaksConfiguration.mjs`; `scripts/supply-chain/Test-GitleaksAllowlistSchema.mjs`; `scripts/supply-chain/Test-GitleaksWorkingTreeSnapshot.ps1`; `scripts/supply-chain/Test-GitleaksScanAdapters.ps1`; `scripts/supply-chain/Test-GitleaksScanning.ps1`; `scripts/supply-chain/Test-ControlledGitleaksFixture.ps1`; `docs/guides/S001-T07-cycle-4-secret-scanning.md`. Downloaded tools, raw scanner reports, generated SBOMs, sanitized local inventories, and temporary build snapshots are ignored or removed and are not committed evidence artifacts.

## S001-T09 — Reconcile revised blueprint decision delta

### Purpose

Preserve the approved T01 decision evidence while reconciling the revised architecture blueprint's mandatory decision areas before later AWS/platform phases begin.

### Scope

Create a traceability matrix that maps the revised blueprint's 20 mandatory ADR areas to ADR-001 through ADR-016 or to a new, explicitly scoped delta ADR. Record a repository-topology decision because the revised blueprint specifies a monorepo while API and web are currently independent repositories. Add only decisions not already covered: hexagonal architecture, approved Lambda use, Step Functions criteria, AppConfig rollout policy, KMS/security baseline, multi-account governance, immutable deployment/blue-green policy, and backup/fault-testing policy as applicable after mapping.

### Out of Scope

AWS account creation, CDK deployment, CodeBuild/CodePipeline implementation, ECR publishing, Inspector integration, multi-account provisioning, or renumbering/revoking approved ADRs without a supersession record.

### Dependencies

Revised blueprint and completed S001-T01 decision baseline.

### Acceptance Criteria

- [ ] Every revised mandatory ADR area has a traceable existing ADR or a new delta ADR.
- [ ] The monorepo-versus-two-repository topology is explicitly approved, including the resulting build/contract-governance obligations.
- [ ] Existing approved ADR-001 through ADR-016 remain valid unless a new record explicitly supersedes a decision.
- [ ] The decision matrix distinguishes Phase 0 evidence from later Phase 1+ AWS/platform delivery.

### Required Tests

- Contract: Markdown link/reference validation.
- Security: Review that no decision record contains credentials, account IDs, or secrets.

### Documentation

Decision matrix, any delta ADRs, Delivery State update, and Sprint evidence update.

### Definition of Done

The revised blueprint's mandatory decisions are fully traceable without retroactively invalidating completed T01 evidence or claiming unimplemented AWS work.

### Evidence

- Commit/PR:
- Commands:
- Test results:
- Deployment: Not applicable.
- Screenshots/log references:

## S001-T08 — Publish local baseline runbook and sprint evidence

### Purpose

Turn the implemented foundation into reproducible operational knowledge and accurately close the sprint evidence trail.

### Scope

Write local setup/run/verification/troubleshooting/rollback runbook; execute sprint review demonstration; update all sprint evidence fields, Delivery State, Production Coverage, and retrospective with actual results.

### Out of Scope

Production restore drill, AWS operations, or marking uncompleted Phase 0 criteria complete.

### Dependencies

S001-T01 through S001-T07 and S001-T09.

### Implementation Notes

Document only commands and outcomes actually exercised. Distinguish expected local-data cleanup from destructive shared-environment operations.

### Acceptance Criteria

- [ ] A new developer can follow the runbook to build, start local dependencies, run migration/tests, invoke the sample flow, and inspect evidence.
- [ ] Sprint review demonstration is executed and linked to logs/test output.
- [ ] Delivery State and Production Coverage reflect actual maturity and gaps, not planned work.
- [ ] Retrospective and next-sprint recommendation are recorded.

### Required Tests

- Unit: N/A.
- Integration: Re-run documented baseline verification.
- Contract: Re-run contract compatibility check.
- Architecture: Re-run architecture tests.
- Concurrency: Re-run duplicate idempotency test.
- Security: Re-run scan policy and access-denial checks.
- End-to-end: Execute sample flow from runbook.

### Observability

Link health, trace, logs, and metrics inspection steps.

### Security

Ensure docs contain no real credentials and describe safe local cleanup.

### Documentation

Runbook, sprint state/evidence, coverage matrix, retrospective.

### Rollback

Documentation-only change; correct erroneous claims immediately with a follow-up edit.

### Estimate

- Size: Small
- Estimated hours: 4
- Uncertainty: LOW

### Definition of Done

Runbook is proven by execution, evidence is complete, and no planned item is represented as delivered.

### Evidence

- Commit/PR:
- Commands:
- Test results:
- Deployment:
- Screenshots/log references:

## Daily Execution State

### Current execution state — 2026-08-20

- Completed: S001-T01 — approved ADR-001 through ADR-015, threat model, data classification, SLO baseline, cost assumptions, and approval workflow.
- Evidence: `docs/adr/ADR-001-*.md` through `ADR-015-*.md`; `docs/decisions/PHASE_0_BASELINES.md`; reference verification command output.
- Completed: S001-T03 — technical HTTP baseline, health probes, safe RFC 9457 errors, W3C-compatible correlation/tracing, ECS logging, and ArchUnit boundaries are implemented and evidenced. The final `clean test` and `verify` gates passed.
- Completed: S001-T05 — the PostgreSQL 17 bootstrap converged twice, all eight databases and 24 roles passed the complete isolation matrix, the local Flyway/JPA path passed, and the clean-environment canonical Testcontainers suite passed 5/5.
- Completed: S001-T02 baseline commands, version pins, independent GitHub Actions workflows, and first hosted workflow runs are complete. Cognito, financial logic, lifecycle delivery, and AWS provisioning remain explicitly out of scope.
- Completed: S001-T04 — versioned OpenAPI/event/realtime registry, Phase 0 `/api/v1` sample, event envelope, realtime placeholder, N/N-1 compatibility gates, malformed/breaking fixtures, local evidence, and the private GitHub Actions `verify-contract-registry` PASS are recorded.
- Completed: S001-T06 — safe validation, idempotent replay, atomic sample/idempotency/outbox persistence, forced rollback, concurrent duplicate safety, post-commit local relay with durable retry state, duplicate-safe inbox effect, linked trace/correlation logs, and low-cardinality metrics passed canonical and supplementary local verification on 2026-09-06.
- Completed: S001-T07 — hosted PR/push and default-branch freshness executions passed their execution-integrity checks; their release policy remains `BLOCKED` with 29 High, 37 Medium, and 0 Critical container findings. Sanitized artifact validation and owner-confirmed Phase 0 branch protection are recorded.
- Next action: Complete S001-T08 runbook/sprint closeout and resolve the S001-T09 monorepo/topology decision. Do not treat the blocked release policy as release readiness.

## Sprint Acceptance Criteria

- [x] A clean documented command set independently builds the identity service and web application using the approved version baseline.
- [x] Versioned sample API, event, and realtime contract artifacts pass their compatibility/lint checks.
- [x] Local PostgreSQL starts with isolated service databases/users; identity migration succeeds and cross-database access is denied.
- [x] The sample command demonstrates validated Problem Details, correlation-aware trace/log evidence, idempotent replay, transactional outbox, retryable relay, and duplicate-safe inbox effect.
- [ ] SBOM, dependency/image scans, and the local baseline runbook have actual execution evidence.

## Sprint Review Demonstration

1. Show approved/Proposed decision and risk record status.
2. From a clean environment, run documented build and contract checks.
3. Start local PostgreSQL, show service-specific database ownership, and run the Flyway migration.
4. Invoke the sample command once and repeat with the same idempotency key.
5. Show one outbox event, duplicate relay delivery, one inbox effect, and linked logs/traces/metrics.
6. Show SBOM and scan outcome plus the runbook used to reproduce the demonstration.

## Sprint Verification Evidence

### Build

Identity Maven local integration build passed through `mvnw.cmd -Pit-local verify` on 2026-08-11. T02 API `verify-build-baseline.ps1`, CDK toolchain check, and web `npm ci`/lint/build also passed locally on 2026-08-11. The first API and web hosted GitHub Actions runs passed on 2026-08-11; the private logs were reviewed by the repository owner.

### Tests

S001-T03 final `clean test` and `verify` passed on 2026-08-20: 28 tests, 0 failures, 0 errors. S001-T04 contract verification passed on 2026-08-25 and again on 2026-09-06: OpenAPI lint, event/realtime schema validation, registry governance/path validation, and N/N-1 compatibility passed. S001-T05 passed on 2026-08-25: local runner 28 unit tests plus 1/1 local integration test, complete 8/8 database-isolation verification, and 5/5 canonical Testcontainers integration tests. S001-T06 passed on 2026-09-06: 110/110 Surefire tests, 10/10 canonical PostgreSQL 17 Testcontainers tests, and 4/4 supplementary local-profile integration tests.

### Security

PostgreSQL verification confirms all managed roles are non-superuser, cannot create databases/roles, cannot replicate, cannot bypass RLS, and do not inherit roles. The complete local allow/deny matrix passed 8/8, including runtime DML, denied runtime DDL, ownership, membership, `PUBLIC` revocations, and cross-database isolation; the canonical Testcontainers suite independently passed the Identity least-privilege boundary.

S001-T04 final contract review found no PII, token, password, secret, credential, or connection string in registered examples, baselines, or fixtures. Payload-classification restrictions and the governance test enforce this boundary for the registered JSON Schema examples.

### Deployment

Not applicable; local/CI baseline only.

### Observability

S001-T03 local technical evidence passed on 2026-08-20: liveness/readiness, correlation/W3C trace propagation, ECS success/error event fields, and `http.server.requests` were observed. S001-T06 evidence on 2026-09-06 links HTTP trace/correlation context to safe idempotency diagnostics, outbox event/attempt, and inbox receipt/effect logs; tests inspect replay, outbox state/processed, relay-attempt, and inbox-duplicate metrics without high-cardinality tags.

### Recovery

Not applicable beyond documented local rollback/cleanup.

### Cost

Proposed local/alpha/public-production cost baseline and budget-notification policy: `docs/decisions/PHASE_0_BASELINES.md`. AWS budget/anomaly configuration remains future work.

### User Flow

Developer/operator technical sample flow passed through canonical Testcontainers and the supplementary `it-local` profile on 2026-09-06.

## Incomplete Work

S001-T02 through S001-T07 are complete. S001-T08 and S001-T09 remain incomplete; do not represent Sprint 001 as complete.

## Technical Debt Accepted

None accepted at planning time.

## Retrospective

### What worked

Not started.

### What failed

Not started.

### What should change

Not started.

## Sprint Result

`PENDING`

## Next Sprint Recommendation

Complete any remaining Phase 0 exit criteria based on Sprint 001 evidence; do not plan Phase 1 in task detail until the Phase 0 gate is objectively evaluated.

## Immediate Next Action

Complete S001-T08 runbook/sprint closeout and resolve the S001-T09 monorepo/topology decision; do not expand the completed T06 sample flow into production messaging or multi-service choreography. Keep release-policy blocked until findings are remediated or receive exact valid dispositions.
