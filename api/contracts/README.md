# Contract Registry

## Purpose and scope

This directory is the repository-owned, versioned registry for public OpenAPI contracts, integration-event JSON Schemas, and realtime-message JSON Schemas. It is a **contract-only** boundary: it does not create a runtime endpoint, database entity, Flyway migration, outbox/inbox implementation, EventBridge/SQS resource, or WebSocket server.

Sprint S001-T04 registers the Phase 0 technical sample that S001-T06 will later implement:

- command: `CreateIdentityProfileSample`;
- HTTP: `POST /api/v1/identity-profile-samples`;
- required request header: `Idempotency-Key`;
- request body: `{ "purpose": "PHASE_0_BASELINE" }`;
- event: `identity-profile.sample-recorded`, `eventVersion: 1`.

The sample proves technical delivery semantics only. It is not profile CRUD, Cognito integration, or a product business capability.

`CreateIdentityProfileSample` is intentionally unauthenticated only for the Phase 0 local technical proof. It must not be deployed as an unauthenticated public endpoint. The Phase 1 Cognito/OIDC policy supersedes this exception.

### S001-T06 implementation decisions

The following decisions remove the remaining implementation ambiguity without
introducing a production transport or product capability:

- The key restriction is an approved pre-runtime correction to the T04
  contract baseline, not an additive N/N-1 change. The endpoint has no runtime
  implementation or consumers, so correcting current and baseline together is
  safer than publishing a knowingly unsafe v1 contract. The complete T04
  verifier must be rerun and its new result supersedes the earlier contract
  evidence. Once runtime exists, the same tightening requires a new major
  version or an explicitly approved compatibility transition.

- `Idempotency-Key` is case-sensitive, is never trimmed, is 1–128 characters,
  and matches `^[A-Za-z0-9._:-]+$`. Missing, blank, oversized, or malformed
  values return `400 application/problem+json` with `VALIDATION_FAILED`.
- The raw key is never logged and is not stored. Persistence uses a SHA-256
  digest. Structured evidence may contain only a short, explicitly labelled
  diagnostic fingerprint; metrics must not tag by key or fingerprint.
- During the unauthenticated Phase 0 proof, key uniqueness is scoped to the
  fixed internal actor `phase0-technical-actor` and operation
  `CreateIdentityProfileSample`. Phase 1 must replace the fixed actor with the
  authenticated subject without changing historical records silently.
- `sampleRequestId` is an optional UUID. Adding it is backward-compatible. It
  provides a second valid request shape for proving that the same key with a
  different canonical request fingerprint returns `IDEMPOTENCY_KEY_REUSED`.
- Request fingerprinting uses a documented canonical representation of all
  command fields, not raw JSON bytes, so property order and insignificant JSON
  formatting do not change identity.
- The canonical request fingerprint input is the exact UTF-8 byte sequence
  `purpose=PHASE_0_BASELINE\nsampleRequestId=<uuid-or-empty>\n`, where every
  `\n` is LF (`U+000A`), the UUID form is `UUID.toString()`, and an absent
  `sampleRequestId` is the empty string after `=`. The SHA-256 result is encoded
  as 64 lowercase hexadecimal characters. Implementations must not use the
  platform line separator, the literal `null`, raw JSON bytes, the idempotency
  key, or correlation metadata in this fingerprint.
- When `sampleRequestId` is present it becomes the event `causationId`; when it
  is absent the server generates and persists a command UUID. Replay returns
  the stored response and reuses the already-persisted event/causation data.
- Idempotency keys and relay/inbox operational metadata are not integration
  event payload fields. Trace ID, span ID, relay attempt and inbox identifiers
  remain observability/persistence metadata. High-cardinality identifiers are
  log fields, never metric tags.

The service-local relay is a PostgreSQL-backed scheduled poller. It claims due
rows in a short transaction using a lease and `FOR UPDATE SKIP LOCKED`, commits
the claim, then delivers through an in-process port. Delivery therefore occurs
only after the originating business transaction commits. Success/failure state
is written in a separate transaction. States are `PENDING`, `PROCESSING`,
`PUBLISHED`, and `FAILED`; failures retain the row and sanitized error code.
Retries are unbounded for this Phase 0 proof with capped exponential backoff
and deterministic jitter injection for tests. Expired leases are reclaimable.
The local scheduler is disabled by default and enabled explicitly only in the
local demonstration profile; integration tests invoke the relay deterministically.

`POST /internal/technical-baseline/validate` remains S001-T03-only technical evidence. It is neither an `/api/v1` endpoint nor a registered stable public contract.

## Registry ownership and layout

| Contract kind | Owner layout | Example |
| --- | --- | --- |
| OpenAPI | `openapi/<service>/v<major>/` | `openapi/identity-profile-service/v1/` |
| Integration event | `events/<service>/v<major>/` | `events/identity-profile-service/v1/` |
| Realtime protocol | `realtime/v<major>/` | `realtime/v1/` |
| OpenAPI N-1 baseline | `compatibility/baseline/openapi/<service>/v<major>/` | `compatibility/baseline/openapi/identity-profile-service/v1/` |
| Deliberately invalid fixtures | `fixtures/<fixture-kind>/` | `fixtures/malformed/` |

The producing service owns its OpenAPI and integration-event artifacts. The realtime gateway owns its future production protocol; the S001-T04 realtime artifact is only a versioned placeholder.

## Versioning and compatibility

All public APIs use `/api/v1`. The registry supports N/N-1 compatibility during rolling deployment.

- Within one API/event/realtime major version, changes must be additive and backward-compatible.
- Do not remove or rename an existing field, operation, event type, response, or message type.
- Do not add an existing consumer-visible field to `required`.
- Do not change a field type, narrow an enum, or tighten a length/range/pattern so that formerly valid data becomes invalid.
- Do not change the meaning of an existing field.
- A breaking event or realtime change requires a new `eventVersion` or `schemaVersion` and retention of the previous version in the registry.
- The OpenAPI gate compares baseline N-1 with current N using `oasdiff v1.28.0`.
- Event and realtime additive compatibility is enforced by the repository-owned `scripts/verify-contracts.ps1` policy.

## Required conventions

- Identifiers are opaque strings/UUIDs and are stable for the life of the contract.
- `traceparent` carries optional W3C Trace Context. `X-Correlation-Id` is optional and remains distinct from trace and span identifiers.
- Timestamps use UTC ISO-8601 / RFC 3339 and end in `Z`.
- Any command declared idempotent must state its `Idempotency-Key` behavior. For the Phase 0 sample, the same key and request replay the stored status/body; the same key with a different request returns `409 application/problem+json` with `IDEMPOTENCY_KEY_REUSED`.
- RFC 9457 responses use stable application codes. The initial vocabulary is `VALIDATION_FAILED`, `MALFORMED_REQUEST`, `IDEMPOTENCY_KEY_REUSED`, and `INTERNAL_ERROR`.
- Event envelope metadata includes `eventId`, `eventType`, `eventVersion`, `aggregateType`, `aggregateId`, `aggregateVersion`, `occurredAt`, `producer`, `correlationId`, `causationId`, and `payload`.

## Data classification and examples

Examples and fixtures may contain only safe `PUBLIC` or safe `INTERNAL` data. Never place PII (such as names, email addresses, phone numbers, addresses, user profiles, or free text), credentials, passwords, API keys, tokens, JWTs, refresh tokens, connection strings, or secrets in this registry.

The Phase 0 request uses the fixed enum `PHASE_0_BASELINE` specifically to avoid an arbitrary free-text/PII field.

## Toolchain

All versions are exact and local to this directory:

- OpenAPI lint: `@redocly/cli@2.46.1`.
- Event/realtime JSON Schema validation: `ajv@8.20.0` and `ajv-formats@3.0.1`.
- OpenAPI compatibility: `oasdiff v1.28.0`, provisioned by the repository verification script in a later T04 step.

Run `npm ci` from this directory. Do not use floating `latest` versions or global tool installations. Once schemas exist, `npm run lint:openapi`, `npm run validate:schemas`, and `..\\scripts\\verify-contracts.ps1` become the local contract gates; CI will call the same repository-owned verifier.

## Verification boundary

S001-T04 proves registry validity, ownership, lint, and compatibility. S001-T06 must later prove the Spring runtime request/response/event implementation conforms to these registered artifacts and provides idempotent outbox-to-inbox evidence.
