# S001-T08 local baseline review evidence

Status: ACCEPTED_LOCAL_REVIEW. The owner accepted corrected C1's technical outcome on 2026-10-05. PR16 delivered that outcome; required postmerge execution checks passed. This does not complete Phase 0 or establish release readiness.

- Published merge: `ab2d8256b25919cc7479fa6d6aad7a41eb964f83`.
- Publication PR: https://github.com/AkaDNT/auction-promax/pull/16
- Postmerge monorepo-required: SUCCESS; https://github.com/AkaDNT/auction-promax/actions/runs/37261367669
- Postmerge supply-chain-verification: SUCCESS; https://github.com/AkaDNT/auction-promax/actions/runs/37261367494

PR16 was merged by the owner on 2026-10-05. Its actual merge has the reviewed base/C2 parents and C2 tree `25903fa703636bd68a1ab8375ec7f4c8661683a0`. A detached published-revision checkout passed the complete decision/closeout suite. C1 runtime evidence below remains bound to C1: it is applicable through the reviewed docs/lifecycle-only C2 delta and identical published tree, not relabeled as a full merge runtime rehearsal. Actual-merge push checks independently prove hosted execution. The separate release-policy check failed and remains BLOCKED; verification success is not vulnerability acceptance.

- Previous review: AkaDNT accepted the earlier C1 technical outcome on 2026-10-05; this does not approve the corrected revision automatically.
- Approved by: AkaDNT (Project Owner / Repository Owner)
- Review date: 2026-10-05
- Approval scope: technical review and truthful closeout preparation only; no vulnerability-risk acceptance, Phase 0 completion or merge authorization.

## Verified revision and scope

- Implementation C1: `c71a49d16a2452268503b4a68eedbfe557e6c7fe`.
- C1 tree: `39a42ee87f7d47db9fbc68b13cd84c0bcd608724`.
- Rehearsal date: 2026-10-05; new detached checkout, fresh builds, scans and live walkthrough.
- Fresh detached LF checkout initially had no dependency directories, Maven target, web build or scanner evidence. Tracked tree/index remained clean after execution.
- Technical identity sample only. No auction/auth consumer compatibility, AWS deployment or production recovery claim.
- Runbook: [Local baseline and Sprint review](../runbooks/LOCAL_BASELINE_SPRINT_001.md).

Detailed command/exit/report records and sanitized scanner artifacts are retained privately. Prior failed scans remain separate from the successful continuation. No raw inventory, credential, environment file or workstation path is included here.

## Six-part review

### 1. Decisions and outstanding risks

The T09 decision suite with `--require-complete --require-closeout` passed on C1, retaining 20/20 approved decision traceability and the pending-T08 lifecycle state. Consumer compatibility remains `DEFERRED_NO_PRODUCER_CONTRACT`, not PASS. Release policy remains BLOCKED; Phase 0 service-template and product/production obligations remain open.

### 2. Clean builds and contracts

Fresh independent contracts, infra and web lockfile installs passed. OpenAPI lint, schema validation, fixture/governance checks and sequential producer Fixture/Registry verification passed. Registry N/N-1 compatibility passed; deliberately breaking fixtures were correctly rejected internally.

Root workflow fixture/repository checks, required-check regressions and hosted supply-chain workflow contract modes passed. CDK CLI 2.1135.1 readiness passed; this is not synthesis/deployment evidence. Web lint/build passed.

Canonical service `mvnw.cmd -B clean verify` passed on corrected C1 before scanning: 113 Surefire and 10 canonical Testcontainers tests, zero failures/errors/skips. Supplementary local integration verification on 2026-10-05 passed 4 tests, zero failures/errors/skips. Canonical reports were retained separately before supplementary verification.

Launcher fixtures passed in PowerShell 7 and Windows PowerShell 5.1. The three new MDC/ECS regression cases explain the increase from the historical 110 unit tests to 113.

Inherited Spring/JVM/Maven configuration override rejection was proved RED then GREEN with real launcher fixtures. The launcher now fails before Maven or environment mutation rather than silently accepting an alternate datasource/Flyway target. Runbook workflow and orchestrator commands were completed and exercised on corrected C1.

### 3. PostgreSQL ownership and Flyway

Bootstrap, privilege verification and status passed on the existing dedicated loopback PostgreSQL 17 instance for the eight-database/24-role topology. This was not a newly empty cluster. No reset was used.

Canonical testcase reports also prove ownership topology, migrator-controlled DDL, runtime DML/denied DDL, Flyway history protection and database readiness. Runtime app and migrator identities remain separate.

### 4. HTTP initial request and replay

The exact C1 runbook HTTP block passed: readiness UP; original/replay HTTP 201 with the same RECORDED sample UUID; same-key/different-body HTTP 409 with `IDEMPOTENCY_KEY_REUSED`; invalid-key HTTP 400 with `VALIDATION_FAILED` and required ProblemDetails fields; non-allowlisted actuator access HTTP 403.

Sample-filtered readonly SQL reached exactly one sample, command, event, published event, inbox receipt and effect within the bounded wait. No global counts, payload dump or manual outbox update was used.

### 5. Delivery integrity and observability

Executed canonical tests include `replayAndDuplicateDeliveryProduceOneEffect`, `concurrentReplayAndExpiredLeaseAreHandled`, `conflictValidationAndForcedRollbackAreSafe` and `failedRelayStateRetainsTheRowAndCanBeRetried`. These provide duplicate delivery/concurrency/rollback/retry proof; HTTP replay alone does not.

Live recorded/replayed INFO events carry the supplied W3C trace; outbox published/inbox applied events share correlation and outbox identity. HTTP/replay and registered relay/inbox metrics passed. No duplicate-correlation formatter error remained. Live duplicate metrics are not claimed from integration-test JVM results.

Owner-authorized observability correction uses scoped MDC as the sole correlation source during sample log emission and restores prior context. Real ECS encoder regressions cover absent, matching and different previous correlation. No use-case, persistence, HTTP or security configuration was changed.

### 6. SBOM, scans and runbook

On 2026-10-05 the existing canonical orchestrator ran against the freshly verified same-C1 artifact with database refresh. Exit 0; authoritative validator accepted exactly seven summaries bound to C1:

```text
executionState = PASS
policyState    = BLOCKED
reviewState    = NOT_REQUIRED
failureCode   = NONE
```

The aggregate policy summary records CRITICAL 0, HIGH 61, UNKNOWN 0, MEDIUM 52, LOW 0. These are dated summary counts, not risk acceptance or expected future counts. Sanitized inventories contain 18 dependency findings, 95 container findings and 0 Gitleaks findings.

Container smoke: readiness UP, linux/amd64, runtime user `10001:10001`, read-only root filesystem, all capabilities dropped and no-new-privileges enabled. Container policy emitted `CONTAINER_SCAN_POLICY_BLOCKED`; no scanner/trust/policy bypass was applied.

Earlier Docker Hub anonymous-token EOF failures are retained as failed evidence, not hidden or substituted with this result. Successful execution does not establish release readiness.

## Accepted retrospective and outcome

- Worked: immutable revision provenance, independent lockfiles/builds, database role boundaries and actual integration/live evidence.
- Failed during rehearsal: problem-response byte decoding, clean scanner database prerequisite, duplicate MDC/ECS correlation and intermittent Docker Hub authentication connectivity.
- Corrected: reviewed runbook decoding/refresh instructions and owner-approved narrow observability regression/fix. Network recovery allowed the unchanged pinned scan to finish.
- Improve: retain immediate exit checks, long-path-capable report enumeration and real formatter coverage; separate execution integrity, vulnerability policy and product maturity.

Accepted outcome: the owner accepted corrected C1's local technical review on 2026-10-05 and authorized consistent T08/Sprint closure preparation. Actual technical review/closure date: 2026-10-05. Outstanding Phase 0 obligations, deferred consumer compatibility and BLOCKED release policy remain unchanged. This acceptance neither accepts vulnerability risk nor authorizes PR merge; subsequent owner merge and postmerge execution verification delivered the outcome through PR16.

Independent final review and owner-shell protection read-back preceded publication; public postmerge checks and exact-revision closeout verification completed afterward. Protection read-back was owner-provided, not a freshly authenticated administration GET by the agent. The deferred Sprint-only phase-mutation regression gap remains; actual documents stay Phase 0. No vulnerability disposition or Phase 0 exit approval is inferred.
