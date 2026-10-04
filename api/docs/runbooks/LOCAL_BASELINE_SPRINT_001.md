# Local baseline and Sprint 001 review

## Scope and safety

This runbook exercises the Phase 0 identity technical sample, not auction/auth product APIs. Instructions are not PASS claims; actual results belong in the reviewed Sprint evidence. API, contracts, infrastructure tooling and web build independently inside the monorepo. No AWS deployment, ECR push, signing or GitHub-settings change is introduced.

Consumer compatibility is `DEFERRED_NO_PRODUCER_CONTRACT`. Successful supply-chain execution is distinct from a `BLOCKED` release policy. Completing this walkthrough does not complete all Phase 0 service-template or production recovery obligations.

Use an isolated checkout of a reviewed commit. Record commit/tree and start without old `node_modules`, `.next`, Maven `target` or scanner evidence. Trusted schema files require exact LF bytes; use an LF-materialized checkout rather than modifying trust checks or the index. Detailed logs and scan artifacts stay in ignored private storage outside the candidate checkout's tracked files.

All commands below run from the monorepo root unless specified. Use PowerShell 7 for the HTTP walkthrough. The Windows launcher fixtures additionally run under Windows PowerShell 5.1. Do not change execution policy or use Bypass by default.

## Prerequisites

| Dependency | Required baseline |
| --- | --- |
| Java | JDK 21 |
| Maven | Repository wrapper 3.9.16; wrapper implementation version is separate |
| Spring Boot | Pinned 3.5.16 |
| Node/npm | 24.15.0 / 11.12.1 |
| Web | Pinned Next.js 16.3.6 |
| Docker | Working Linux server for canonical Testcontainers/container checks |
| Native PostgreSQL | Dedicated loopback server major 17 plus psql |
| CDK | CLI 2.1135.1, library 2.269.0, constructs 10.8.1 |

```powershell
$ErrorActionPreference = 'Stop'
java -version
if ($LASTEXITCODE -ne 0) { throw 'Java unavailable' }
node --version
if ($LASTEXITCODE -ne 0) { throw 'Node unavailable' }
npm.cmd --version
if ($LASTEXITCODE -ne 0) { throw 'npm unavailable' }
docker version --format '{{.Server.Version}}'
if ($LASTEXITCODE -ne 0) { throw 'Docker server unavailable' }
docker info --format '{{.OSType}}'
if ($LASTEXITCODE -ne 0) { throw 'Docker engine unavailable' }
psql --version
if ($LASTEXITCODE -ne 0) { throw 'psql unavailable' }
pg_isready -h localhost -p 5432
if ($LASTEXITCODE -ne 0) { throw 'Local PostgreSQL unavailable' }
```

Compare output with the table; Docker must report `linux`. `psql --version` does not prove server version: bootstrap verifies the connected server is 17.

## Local database configuration

Create ignored `api/.env.local` from tracked `api/.env.local.example` using a local editor. Replace every password placeholder with a locally chosen value satisfying bootstrap constraints (at least eight characters). Never print, screenshot, commit or pass passwords on the command line. Verify ignore status with `git check-ignore api/.env.local` before proceeding; exit 0 is required.

The sample development profile consumes only:

```dotenv
IDENTITY_DB_URL=jdbc:postgresql://localhost:5432/identity_db
IDENTITY_DB_APP_USERNAME=identity_app
IDENTITY_DB_MIGRATOR_USERNAME=identity_migrator
```

Two additional password settings, `IDENTITY_DB_APP_PASSWORD` and `IDENTITY_DB_MIGRATOR_PASSWORD`, must be filled privately. Bootstrap needs the example's admin and other database settings too. Test-local uses the separate five `IDENTITY_TEST_DB_*` settings and `identity_test_db`; never substitute the development DB into them.

Native bootstrap creates eight databases and 24 roles for identity, auction, transaction and payment development/test boundaries. Each database has a NOLOGIN owner, LOGIN migrator and runtime app. Bootstrap checks names, loopback, connected server and administrator identity; database creation is convergent but not transactional across all databases.

```powershell
pwsh -NoProfile -File api/scripts/local-db-bootstrap.ps1
if ($LASTEXITCODE -ne 0) { throw 'Local bootstrap failed; inspect before rerun' }
pwsh -NoProfile -File api/scripts/local-db-verify.ps1
if ($LASTEXITCODE -ne 0) { throw 'Database isolation verification failed' }
pwsh -NoProfile -File api/scripts/local-db-status.ps1
if ($LASTEXITCODE -ne 0) { throw 'Database status unavailable' }
```

Verify runs privilege probes that create/drop objects; it is not read-only. Use only the dedicated validated local instance. Confirm runtime DML allowed, runtime DDL denied, history protected, PUBLIC access denied and cross-database access denied. Do not loosen grants to resolve a failing probe.

## Independent build and contract gates

Run each native command sequentially and check `$LASTEXITCODE` immediately; nonzero stops its gate. The inventory below is not a paste-and-ignore-errors batch.

```powershell
npm.cmd --prefix api/contracts ci
npm.cmd --prefix api/contracts run lint:openapi
npm.cmd --prefix api/contracts run validate:schemas
npm.cmd --prefix api/contracts run test:fixtures
npm.cmd --prefix api/contracts run test:governance
pwsh -NoProfile -File api/scripts/verify-contracts.ps1 -Mode Fixture
pwsh -NoProfile -File api/scripts/verify-contracts.ps1 -Mode Registry
npm.cmd --prefix api/infra ci
npm.cmd --prefix api/infra run cdk:version
pwsh -NoProfile -File api/scripts/verify-build-baseline.ps1
npm.cmd --prefix web ci
npm.cmd --prefix web run lint
npm.cmd --prefix web run build
```

Fixture and Registry share an oasdiff cache: run them sequentially. The deliberate breaking fixture must be rejected internally while the fixture harness succeeds. CDK version is readiness only, not synthesis/deployment evidence. Web lint/build is not consumer compatibility proof.

Canonical Maven verification runs PostgreSQL Testcontainers using the Linux Docker engine. For a fresh full build, from `api/services/identity-profile-service` run `./mvnw.cmd -B clean verify`, then return to the monorepo root. Record actual Surefire and Failsafe XML counts/failures/errors/skips; historic counts are 110 unit and 10 canonical integration tests, not an unconditional expected-result shortcut.

After native database verification, run the supplementary integration path:

```powershell
pwsh -NoProfile -File api/scripts/run-it-local.ps1
if ($LASTEXITCODE -ne 0) { throw 'Supplementary local integration tests failed' }
```

These tests delete sample data in the dedicated test DB. Preserve canonical reports before the supplementary run changes report contents. Historical supplementary count is four; inspect actual reports.

Architecture, concurrent replay, forced rollback, duplicate delivery, durable relay retry, ownership/DDL/DML and readiness assertions are in the existing automated suites. Link actual executed method/report evidence, not a method name alone.

## Start the service

First verify the launcher in both shells:

```powershell
pwsh -NoProfile -File api/scripts/Test-RunIdentityLocal.ps1
powershell.exe -NoProfile -File api/scripts/Test-RunIdentityLocal.ps1
```

Check each exit. Fixtures use temporary synthetic data, not real PostgreSQL. The launcher validates all settings before changing the environment, exports only the five development settings, then restores original values and working directory on exit. Errors are classified without echoing secret values.

Terminal A:

```powershell
pwsh -NoProfile -File api/scripts/run-identity-local.ps1
```

It invokes Maven `spring-boot:run` with `local` profile and binds `127.0.0.1:8080`. Spring does not load `.env.local` automatically; the launcher does. Flyway uses the migrator while runtime uses the app role; Hibernate validates the schema and Flyway clean stays disabled. Keep this terminal open for logs.

Technical health/info/metrics/sample paths are permitAll and other paths denyAll. This is not product authentication; do not expose it on the LAN.

## HTTP sample and negative cases

Terminal B, PowerShell 7:

```powershell
$ErrorActionPreference = 'Stop'
$baseUri = 'http://127.0.0.1:8080'
$health = Invoke-RestMethod "$baseUri/actuator/health/readiness"
if ($health.status -ne 'UP') { throw 'Readiness not UP' }
$headers = @{
    'Idempotency-Key' = 't08-' + [guid]::NewGuid().ToString('N')
    'X-Correlation-Id' = 't08-' + [guid]::NewGuid().ToString('N')
    'traceparent' = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
}
$body = @{ purpose = 'PHASE_0_BASELINE'; sampleRequestId = [guid]::NewGuid().ToString() } | ConvertTo-Json -Compress
$first = Invoke-WebRequest "$baseUri/api/v1/identity-profile-samples" -Method Post -Headers $headers -ContentType application/json -Body $body
$replay = Invoke-WebRequest "$baseUri/api/v1/identity-profile-samples" -Method Post -Headers $headers -ContentType application/json -Body $body
$a = $first.Content | ConvertFrom-Json
$b = $replay.Content | ConvertFrom-Json
if ($first.StatusCode -ne 201 -or $replay.StatusCode -ne 201 -or
    $a.sampleId -ne $b.sampleId -or $a.status -ne 'RECORDED' -or $b.status -ne 'RECORDED') {
    throw 'Initial/replay response mismatch'
}
$sampleId = [guid]::Parse($a.sampleId).ToString()
function Assert-Problem($Response, [int]$Status, [string]$Code) {
    # application/problem+json can be exposed as byte[] by PowerShell 7.
    $problemText = if ($Response.Content -is [byte[]]) {
        [Text.Encoding]::UTF8.GetString($Response.Content)
    } else { [string]$Response.Content }
    $problem = $problemText | ConvertFrom-Json
    foreach ($field in @('type','title','status','code','correlationId')) {
        if ($null -eq $problem.PSObject.Properties[$field]) { throw 'Missing canonical problem field' }
    }
    if ($Response.StatusCode -ne $Status -or $problem.status -ne $Status -or $problem.code -ne $Code -or
        [string]::IsNullOrWhiteSpace($problem.type) -or [string]::IsNullOrWhiteSpace($problem.title) -or
        [string]::IsNullOrWhiteSpace($problem.correlationId)) { throw 'Problem classification mismatch' }
}
$changed = @{ purpose = 'PHASE_0_BASELINE'; sampleRequestId = [guid]::NewGuid().ToString() } | ConvertTo-Json -Compress
$conflict = Invoke-WebRequest "$baseUri/api/v1/identity-profile-samples" -Method Post -Headers $headers -ContentType application/json -Body $changed -SkipHttpErrorCheck
Assert-Problem $conflict 409 IDEMPOTENCY_KEY_REUSED
$invalid = Invoke-WebRequest "$baseUri/api/v1/identity-profile-samples" -Method Post -Headers @{ 'Idempotency-Key' = 'contains whitespace' } -ContentType application/json -Body $body -SkipHttpErrorCheck
Assert-Problem $invalid 400 VALIDATION_FAILED
$denied = Invoke-WebRequest "$baseUri/actuator/env" -SkipHttpErrorCheck
if ($denied.StatusCode -ne 403) { throw 'Expected denied actuator access' }
"HTTP_SAMPLE_PASS sampleId=$sampleId"
```

Both initial and replay return 201 with the same UUID. HTTP replay is not duplicate inbox delivery. Do not add a redelivery API or manually update outbox rows to manufacture that proof.

## Persistence and observability

With the validated `$sampleId` above, query as the local runtime app using psql password prompt (`-W`) or temporary private process environment. Do not pass a password in arguments. Use bounded polling up to 15 seconds for relay completion; stop on timeout.

Read-only SQL for that sample (replace the UUID placeholder with its parsed UUID only):

```sql
WITH sample_events AS (
  SELECT event_id, status FROM identity.outbox_event
  WHERE aggregate_id = '<sample-uuid>'::uuid
)
SELECT
  (SELECT count(*) FROM identity.identity_profile_sample WHERE sample_id = '<sample-uuid>'::uuid) AS samples,
  (SELECT count(*) FROM identity.idempotency_record WHERE sample_id = '<sample-uuid>'::uuid) AS commands,
  (SELECT count(*) FROM sample_events) AS events,
  (SELECT count(*) FROM sample_events WHERE status = 'PUBLISHED') AS published,
  (SELECT count(*) FROM identity.inbox_receipt r JOIN sample_events e USING (event_id)) AS receipts,
  (SELECT count(*) FROM identity.identity_profile_sample_effect WHERE sample_id = '<sample-uuid>'::uuid) AS effects;
```

All six counts must become exactly one. Poll using a temporary authenticated session without repeatedly exposing credentials. Never use database-global counts or publish stored payload/response bodies.

Inspect `/actuator/metrics/http.server.requests`, `/actuator/metrics/identity.sample.idempotency.replays` and completed outbox/inbox observations. Metrics are sometimes lazy: live HTTP replay does not necessarily register `inbox.duplicates`. Duplicate-delivery evidence comes from the test JVM's actual report, not a metric claimed from the running app.

Terminal A logs should show `identity_sample.recorded`, `identity_sample.replayed`, `outbox.relay.published` and `inbox.event.applied`, linked by safe correlation/trace/event identifiers. Observe the supplied W3C trace, not merely HTTP success. Do not publish raw idempotency keys or request bodies.

## Security evidence and Sprint review

After Maven verification in the same clean commit, invoke the existing orchestrator with `-WorkflowName supply-chain`, `-CommitSha` set to that actual checkout commit, `-EvidenceRoot` set to absolute ignored private storage, and `-UseExistingVerifiedArtifact` only for the artifact just built. On a fresh checkout use `-RefreshDatabase`: without it the default path requires an already fresh local Trivy DB. Check native exit and summary execution state; do not fabricate summaries.

Validate with `node api/scripts/supply-chain/Validate-HostedSupplyChainEvidence.mjs <evidence-root> <commit-sha>` and check exit immediately. Exactly seven sanitized files are required: run summary, vulnerability inventory, Gitleaks inventory, container vulnerability inventory, image identity, smoke summary and policy summary. No raw report upload/publication.

Execution PASS with policy BLOCKED is possible and is not release-ready. Use actual current scanner counts and revisions; historical findings are not current expected counts. Scanner trust/network failures stop the gate.

Review six sections: approved decisions/risks; clean builds/contracts; native PostgreSQL ownership/Flyway; initial/replay HTTP; outbox/inbox/concurrency and observability; SBOM/scans/runbook. Prepare results and residual gaps for explicit owner Sprint outcome acceptance before closeout. Public review evidence is a sanitized summary; detailed execution logs remain private.

## Troubleshooting and cleanup

| Symptom | Required response |
| --- | --- |
| Docker server unavailable | Start/repair Linux engine; do not skip Testcontainers |
| Native server/version/roles wrong | Inspect dedicated loopback PostgreSQL 17 config; do not loosen privileges |
| Flyway or sample assertion fails | Stop; report classified error and revision before business changes |
| Node/npm/JDK mismatch | Select pinned versions; do not alter pins merely to pass |
| Port 8080 occupied | Identify existing process; do not kill unrelated workloads |
| Google Fonts/dependency download blocked | Use authorized network execution; record environmental retry |
| Trust checksum/TUF/scanner failure | Diagnose exact bytes/provenance/network; no bypass |
| Policy BLOCKED | Record separately from execution integrity; no release-ready claim |

Stop the foreground service with Ctrl+C. Leave development data intact by default. Existing reset deletes only configured test databases but lacks its own loopback guard; it is not routine cleanup and requires independent dedicated-local preflight plus explicit destructive acknowledgment. Never delete a PostgreSQL cluster or shared database to fix tests.

If the walkthrough requires changed runtime behavior or unexplained security relaxation, stop and obtain an owner decision. Correct inaccurate documentation through a reviewed follow-up; no production restore drill is claimed here.
