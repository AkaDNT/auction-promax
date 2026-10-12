# S002 frozen technical candidate evidence

Status: **PUBLISHED_VERIFIED** for the technical foundation; actual Phase 0 exit/handoff is owner-approved; protected transition/closeout remains pending. This record covers roadmap Phase 0, not the earlier Spring remediation read-only probe labeled phase0.

## Frozen identity and scope

Implementation candidate: `8a6fd2eca7a8ac0da27c98fe71bad051592a3673`; Git tree: `63aa3ee5dd5cea3870e94bea92c28951a8a76026`. Independent exact-SHA review found no issue. Trusted postcommit scan passed directory=0/history=1/exact historical false-positive=1 before the authorized branch push. PR24 remains a draft to `migration/monorepo`; branch permission does not authorize merge, deployment or release.

The five committed services are Identity, Auction, Bidding, Billing and the database-free realtime gateway. Original CI source-delivery records preserve their actual import provenance; the tracing POM/profile correction is a curated, reviewed amendment. No real destination was generated locally. Product bidding, billing, listing entitlements, authentication and AWS infrastructure deployment are later-phase scope.

## Requirement-to-evidence map

The [canonical matrix](../../../api/docs/decisions/PHASE_0_EXIT_MATRIX.md) follows the exact deliverable and exit order in the amended blueprint.

| Requirement | Owning evidence and interpretation |
| --- | --- |
| D01 ADRs | Approved blueprint/ADR-026/027 and S002 design; revised service and non-monetary marketplace boundaries. |
| D02 Monorepo | Always-run lifecycle/required-check ownership plus independent API/contracts/infra/web baselines. A green service scan cannot replace this gate. |
| D03 Service template | Closed registry/inventory/conformance and four delivered technical foundations. Original imports were generated/exported only in CI, then independently reviewed and committed. |
| D04 Java 21 | Five standalone Maven enforcer/compile/build executions; canonical hosted Java 21 is separate from supplemental native JDK 21.0.10. |
| D05 Hexagonal architecture | Actual ArchUnit production boundaries and deliberate test-fixture violations in each service's executed unit suite. |
| D06 Contracts | Sample OpenAPI/schema/governance plus sequential Fixture/Registry N/N-1 gates. Product consumer compatibility remains DEFERRED_NO_PRODUCER_CONTRACT. |
| D07 Testcontainers | Canonical PostgreSQL 17.11 Testcontainers for four relational services; gateway's executed no-datastore integration suite is explicit. Native PostgreSQL 17.9 is supplemental only. |
| D08 Idempotency | Identity's executed canonical key validation/replay/conflict/concurrency/rollback cases and the live initial/replay/conflict/invalid walkthrough. |
| D09 Outbox/inbox | Identity's actual transactional persistence, duplicate delivery, retry and rollback tests plus scoped live relay completion. HTTP replay is not inbox duplicate-delivery proof. |
| D10 Flyway | Canonical relational migration/owner/migrator/history-boundary cases and native dedicated topology privilege probes. Gateway has no database/Flyway obligation. |
| D11 Structured logging | Executed ECS encoder/MDC regressions for all five; live Identity records bind the supplied trace and correlation. Local OTLP exporters are disabled individually; no production collector proof is claimed. |
| D12 Architecture tests | Actual executed production-boundary suites and rejected application/framework/inbound leakage fixtures. |
| E01 Independent builds | Five committed-source standalone Maven/Failsafe/graph/container scan/smoke executions, plus locked independent contracts/infra/web baselines. |
| E02 No cross-database access | Four canonical relational isolation cases and eight native development/test privilege matrices; explicit NOT_APPLICABLE_GATEWAY. |
| E03 Sample request/event trace | Fresh frozen-checkout Identity HTTP/persistence/metrics/ECS walkthrough; initial/replay logs must carry the exact supplied W3C trace and relay/inbox records retain correlation/event linkage. |

## Rehearsal and evidence limits

The detached checkout was materialized with LF bytes and no previous node_modules, .next, Maven target or scanner outputs. Shared download caches are permitted; they are not reused build outputs. The standalone conformance suite passed 39/39 before any contracts install, directly verifying the fixed lifecycle dependency issue. Detailed logs, configs and runtime summaries remain in ignored private storage.

The first supplemental Identity run failed because the approved separate cluster on loopback 55432 was stopped (`Connection refused`, `pg_ctl: no server running`). Only that existing data directory was restarted after path/config verification, without initialization, data deletion, reset or changed privileges. That failed attempt is retained and cannot be a PASS claim. The legacy cluster was untouched.

Local database verification is a privilege-probe operation, not read-only; the live sample persistence readback is sample-filtered read-only SQL. Runtime checks preserve sample data. Metrics observations do not prove per-request metric increments. Test-JVM duplicate-delivery evidence does not establish live duplicate metrics.

## Actual frozen results

PR supply-chain [run 38256927490](https://github.com/AkaDNT/auction-promax/actions/runs/38256927490) completed SUCCESS on checked-out execution `13c73e27a145add6eef3e49d38746a683137473c`, distinct from the frozen candidate. Each selected service was COMMITTED; standalone Maven, Failsafe registration/count checks, dependency-graph gates, hardened container/technical HTTP smoke and owning seven-file evidence validation passed. Offline downloaded schema/identity/count readback and five-service aggregation passed, separately from the owning built-JAR validator. PR [Monorepo verification 38256927293](https://github.com/AkaDNT/auction-promax/actions/runs/38256927293) passed including corrected lifecycle and monorepo-required; all current PR24 checks had no failed or pending entries at readback.

GitHub's actual execution object was read back: tree `63aa3ee5dd5cea3870e94bea92c28951a8a76026` exactly equals the frozen candidate tree; parents are published base `54c72e67f84fee3e7fef3686b473840d9997dcc7` and candidate `8a6fd2eca7a8ac0da27c98fe71bad051592a3673`. This is synthetic PR execution provenance, not actual protected publication.

| Service | Actual unit/Failsafe tests | Isolation | Smoke / execution / policy | Residual inventory |
| --- | --- | --- | --- | --- |
| Identity | 119 / 10 | PASS | UP/linux-amd64; PASS/PASS | 4 MEDIUM; 0 CRITICAL/HIGH/UNKNOWN |
| Auction | 19 / 6 | PASS | UP/linux-amd64; PASS/PASS | 4 MEDIUM; 0 CRITICAL/HIGH/UNKNOWN |
| Bidding | 19 / 6 | PASS | UP/linux-amd64; PASS/PASS | 4 MEDIUM; 0 CRITICAL/HIGH/UNKNOWN |
| Billing | 19 / 6 | PASS | UP/linux-amd64; PASS/PASS | 4 MEDIUM; 0 CRITICAL/HIGH/UNKNOWN |
| Realtime gateway | 19 / 1 | NOT_APPLICABLE_GATEWAY | UP/linux-amd64; PASS/PASS | 4 MEDIUM; 0 CRITICAL/HIGH/UNKNOWN |

All test totals have zero failures/errors/skips. MEDIUM=20 below means summed service inventory observations, not 20 distinct vulnerabilities: the same OpenTelemetry CVE appears on two components and in dependency/container inventories for each service. Repository vulnerability count is zero. The single exact historical Gitleaks false positive remains visible in each owning inventory and expires 2026-11-11T09:12:08Z; no broad ignore or real-credential risk acceptance was added.

Fresh locked contracts/OpenAPI/schema/governance and sequential Fixture/Registry compatibility checks passed. Fresh web lint/build and infra CDK readiness passed. After the verified existing cluster restart, Identity supplemental native verification passed and all eight development/test ownership/default-deny/DML/DDL/history/cross-database probes passed. Matrix 31/31, transition 30/30 and workflow 18/18 fixtures, workflow repository and required-check regressions passed; pre-install conformance passed 39/39.

The final live Identity walkthrough on this exact checkout passed readiness UP, initial/replay 201 with the same RECORDED UUID, conflict 409, invalid-key 400, denied actuator 403 and exactly one scoped sample/command/event/published-event/receipt/effect. Observed HTTP/replay metrics and parsed recorded/replayed ECS events carry the exact supplied W3C trace; published/applied records preserve correlation. No collector-export failure was observed. Canonical executed methods supply duplicate delivery, concurrent replay, rollback and durable retry proof; these are not inferred from live replay. Detailed runtime identifiers/logs remain private.

Implementation applicability stays frozen to the exact candidate/tree. The subsequent matrix, coverage, review and approval-log changes are documentation-only under the two fixed approved directories, and require separate structural/link/security/delta review. They do not replace the frozen revision or claim unknown publication identities.

## Residual obligations and owner gates

Mandatory Phase 0 template/topology obligations are technically resolved by the results above. Authentication/authorization, product functions, producer contracts and production platform/recovery remain open in their blueprint phases. Historical S001 evidence is preserved rather than relabeled as current proof. Consumer compatibility remains deferred. A policy PASS is distinct from zero vulnerabilities, production readiness or release authorization.

After technical readiness: present the concrete candidate/matrix for owner technical acceptance and separate PR24 merge permission. After actual protected publication and postmerge checks: obtain actual Phase 0 exit and Phase 1 handoff approval, publish the separate transition record with verified Git/check identities, and complete factual readback. No future merge SHA, approval or phase advance is invented.

## Actual owner technical acceptance and conditional merge decision

On 2026-10-12 the owner explicitly accepted PHASE0_TECHNICAL_CANDIDATE for frozen implementation `8a6fd2eca7a8ac0da27c98fe71bad051592a3673`, tree `63aa3ee5dd5cea3870e94bea92c28951a8a76026`, and the evidence limits/residuals above: `OWNER-DECISION-2026-10-12-S002-T06-TECHNICAL-ACCEPTANCE`. This does not accept vulnerability risk, confirm actual Phase 0 exit/handoff or authorize deployment/release.

In a separate question, the owner authorized PR24 merge into `migration/monorepo` at the exact public AkaDNT/auction-promax repository, conditional on reviewed/scanned decision-record documentation, unchanged frozen implementation and all required checks passing: `OWNER-DECISION-2026-10-12-PR24-CONDITIONAL-MERGE`. Changes after reviewed documentation candidate `472e208` are restricted to these factual decision records. No bypass or GitHub-setting change is authorized. Actual merge/check identities remain unknown until publication.

Authenticated read-only target inspection confirmed default tip `54c72e67f84fee3e7fef3686b473840d9997dcc7`, protection enabled, strict `monorepo-required` and `supply-chain-verification` checks from the configured app, administrator enforcement enabled and zero required approving reviews. This is a protection readback, not a settings update or a merge success claim.

## Actual protected technical publication

After exact approval-record candidate `2251a0eab493195f5fa99ee4bcc57ba8c45e6173` passed its own review, trusted postcommit scan and required/all PR checks, the owner-authorized head-matched protected merge completed without administrator bypass or setting changes. [PR24](https://github.com/AkaDNT/auction-promax/pull/24) is MERGED at actual `0475661743c5da0114eba04810bf24f962a53b60`, tree `d74d07cc76d96c2a651438bc7a1d1e873b4791ca`, parents `54c72e67f84fee3e7fef3686b473840d9997dcc7` and `2251a0eab493195f5fa99ee4bcc57ba8c45e6173`. Default tip matched this actual merge at readback. The isolated task branch fast-forwarded to it; the primary dirty worktree was preserved.

Actual-merge push [monorepo-required](https://github.com/AkaDNT/auction-promax/actions/runs/38259366261) and [supply-chain-verification](https://github.com/AkaDNT/auction-promax/actions/runs/38259366704) completed SUCCESS on that merge, with the configured check app identity verified. Full five-service postmerge sanitized readback preserved the actual 119/10, 19/6, 19/6, 19/6, 19/1 totals, COMMITTED source, smoke UP/linux-amd64, policy/execution PASS and four MEDIUM observations per service.

The current-default [freshness run 38259532672](https://github.com/AkaDNT/auction-promax/actions/runs/38259532672) also passed on the same actual merge, all five committed services and both aggregation/release-policy gates; strict downloaded schema/identity/count/aggregate and Linux-fixture readback passed. An earlier scheduled run 38239202351 failed SECRET_SCAN_FAILED on old default `54c72e6`, with only an empty sanitized secret inventory; its specific finding is not established by that artifact. The historical failure remains retained and is not relabeled PASS.

The actual merge has no frozen implementation delta outside the two approved documentation directories. The canonical matrix now passes PUBLISHED_VERIFIED technical publication and actual Git-tree/ancestor binding. Owner actual exit/handoff remains pending; [the handoff memo](../../../api/docs/decisions/PHASE_1_HANDOFF.md) is ready for that decision, without starting Phase 1 work or claiming a future transition merge.
