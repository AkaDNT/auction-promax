# Identity Profile Service — Technical Baseline

## Purpose

Historical scope: this is the T03 database-free `technical-local` profile. For the later database-backed sample, idempotency, outbox/inbox and current Sprint 001 walkthrough, use [Local baseline and Sprint 001 review](LOCAL_BASELINE_SPRINT_001.md). Statements below describe T03's profile, not the full current service.

This runbook records the Sprint 001 technical HTTP and observability baseline for `identity-profile-service`.

It proves HTTP validation, safe RFC 9457 Problem Details, correlation handling, W3C Trace Context-compatible tracing, ECS structured logs, Actuator health, HTTP metrics, and architecture boundaries. It does not describe a stable public business API.

## Scope and exclusions

The temporary Phase 0 endpoint is:

```text
POST /internal/technical-baseline/validate
```

It is not an `/api/v1` endpoint or a registered stable product contract. S001-T04 and S001-T06 govern the later contract.

This baseline does not implement Cognito/JWT business authentication, profile CRUD, persistent business entities, repositories, Flyway migrations, idempotency, outbox, inbox, or event delivery.

## Run the database-free technical baseline

From the API repository root:

```powershell
cd services/identity-profile-service
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=technical-local"
```

`technical-local` excludes datasource, JPA, and Flyway auto-configuration. It is the T03 evidence profile and does not require PostgreSQL or local database credentials.

## Actuator exposure

| Profile | Exposed endpoints |
| ------- | ----------------- |
| Default | `health` only |
| `local` | `health`, `info`, `metrics` |
| `technical-local` | `health`, `info`, `metrics` |

Required health probes:

```text
GET /actuator/health/liveness
GET /actuator/health/readiness
```

Sensitive endpoints such as `env`, `configprops`, `loggers`, `heapdump`, and `threaddump` are not exposed.

## Technical endpoint

```http
POST /internal/technical-baseline/validate
Content-Type: application/json
X-Correlation-Id: t03-example-001

{
  "value": "hello"
}
```

Successful response:

```json
{
  "accepted": true,
  "valueLength": 5
}
```

`value` must be non-blank and must not exceed 100 characters.

## Error behavior

Invalid and malformed input return RFC 9457-compatible Problem Details with `application/problem+json` content type. The response contains safe `type`, `title`, `status`, `detail`, `instance`, and `correlationId` fields.

Responses must not expose stack traces, exception classes, raw request bodies, credentials, tokens, or secrets.

## Correlation and tracing

`X-Correlation-Id` is allow-listed. A valid value is preserved; a missing or invalid value is replaced with a generated safe identifier.

`correlationId` is distinct from `traceId` and `spanId`. The service accepts standard W3C Trace Context through `traceparent`; it does not implement a custom `traceparent` parser or generator.

Example headers:

```text
X-Correlation-Id: t03-example-001
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

## Local observability

The `technical-local` profile writes ECS JSON console logs. A successful request emits:

```text
event = technical_validation.accepted
correlationId
traceId
spanId
valueLength
```

Validation and malformed requests emit safe fixed error events:

```text
request_validation.failed
request_malformed.failed
```

No Jaeger, Zipkin, or OTLP backend is required for this Phase 0 technical baseline.

HTTP request telemetry is available at:

```text
GET /actuator/metrics/http.server.requests
```

## Automated verification

Run:

```powershell
.\mvnw.cmd test
.\mvnw.cmd verify
```

`mvnw.cmd -Pit-local verify` is database-isolation evidence for S001-T05 and is not a T03 completion gate.
