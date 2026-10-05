# Auction Platform Delivery State

## Blueprint

- File: `docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md`
- Version: Final production architecture blueprint (repository copy has no explicit version identifier)
- Status: APPROVED SOURCE OF TRUTH

## Current Position

- Current roadmap phase: Phase 0 — Decision lock and engineering foundation
- Active milestone: R0 — Engineering Baseline
- Current sprint: SPRINT-001
- Sprint status: COMPLETED
- Publication status: PENDING_PROTECTED_PR
- Actual review/closure date: 2026-10-05
- Delivery scope: owner-accepted local technical closure; protected-default publication/postmerge evidence pending.
- Target environment: Local developer environment and CI baseline
- Last updated: 2026-10-05

## Current Phase Goal

Establish reproducible, independently buildable service foundations with approved decisions, contract governance, isolated local data stores, observable request/event handling, and supply-chain scan evidence.

## Current Sprint Goal

An engineer can build and verify the initial service baseline with versioned contracts, isolated local PostgreSQL, and one traced, idempotent outbox-to-inbox sample flow.

## Phase Exit Gate Progress

- [x] Final ADR set, threat model, data classification, SLOs, and cost model are approved and traceable.
  - Evidence: ADR-001 through ADR-016 and `docs/decisions/PHASE_0_BASELINES.md` were approved by the Product Owner / Project Owner on 2026-08-05; BD-004/BD-005 record the approved PostgreSQL privilege refinement and supersession rule. ADR-017 records the later topology decision; ADR-018 through ADR-025 were approved on 2026-10-03. The 20-row `docs/decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md` traces all mandatory blueprint subjects as approved decision-only coverage.
  - Covered by sprint/task: S001-T01, S001-T09.
- [ ] Monorepo and service templates let every service build independently.
  - Evidence: ADR-017 / BD-007 approved `OPTION_A_MONOREPO`; the public monorepo now has reviewed API and web snapshots and independent fresh-checkout API, web, contract, and infrastructure builds. Its protected default is `migration/monorepo`; unchanged, locked bootstrap `main` remains the rollback reference. Hosted path-classification and negative PR cases concluded as designed, and the first protected governance merge passed the required `monorepo-required` and `supply-chain-verification` checks. The canonical producer registry does not yet cover web product endpoints: consumer compatibility is `DEFERRED_NO_PRODUCER_CONTRACT`, not PASS. The owner accepted this residual risk for the Phase 0 topology cutover, not for product release. Detailed evidence remains local-only.
  - Covered by sprint/task: S001-T02, S001-T03, S001-T09. D-005 is resolved for the governed repository topology after the owner's final review of the amended evidence. This composite Phase 0 gate remains open for separate service-template obligations.
- [x] Java, Spring, Maven, Node, and CDK versions are pinned with a reproducible clean build.
  - Evidence: Java 21/Spring Boot 3.5.16/Maven Wrapper 3.9.16 are enforced by the Identity service; Node 24.15.0/npm 11.12.1 are pinned and checked in web; CDK CLI 2.1135.1, `aws-cdk-lib` 2.269.0, and `constructs` 10.8.1 are lockfile-pinned in `api/infra`. Original 2026-08-11 baseline evidence remains historical; T08 fresh C1 rehearsal/builds passed on 2026-10-04/05.
  - Covered by sprint/task: S001-T02.
- [x] OpenAPI, event, and realtime contracts have a registry and CI compatibility checks.
  - Evidence: Versioned registry locations and compatibility baselines exist under `contracts/`; the registered OpenAPI 3.1 `/api/v1` sample, integration-event envelope, and realtime placeholder passed Redocly/Ajv/governance/N/N-1 local verification on 2026-08-25. The malformed-schema and prohibited-breaking-change fixtures were intentionally rejected as required. The private GitHub Actions `verify-contract-registry` job passed; its run link/log is retained by the repository owner. Final contract-example review found no PII, token, password, secret, credential, or connection string.
  - Covered by sprint/task: S001-T04 — COMPLETED. Runtime implementation and contract conformance remain S001-T06.
- [x] Local logical databases/users per service prevent cross-database access by design.
  - Evidence: On 2026-08-25, two consecutive real ADR-016 bootstrap runs converged all eight databases and 24 least-privilege owner/migrator/app roles; the complete local verification matrix passed 8/8, including ownership, privilege, DML/DDL, and cross-database allow/deny checks. `scripts/run-it-local.ps1` passed 28 unit tests plus `IdentityProfileServiceApplicationLocalIT` (1/1), and clean-environment default `mvnw.cmd verify` passed `IdentityProfileServiceApplicationTestcontainersIT` (5/5) against the immutable PostgreSQL 17 image.
  - Covered by sprint/task: S001-T05.
- [x] Health/readiness, tracing, Problem Details, idempotency, and outbox/inbox skeletons produce a sample request/event trace.
  - Evidence: S001-T03 proved liveness/readiness, safe RFC 9457 responses, W3C-compatible trace/correlation propagation, ECS logs, and HTTP metrics. S001-T06 completed the linked command/outbox/relay/inbox flow on 2026-09-06: 110/110 Surefire, 10/10 PostgreSQL 17 Testcontainers, 4/4 supplementary local-profile integration tests, and all contract registry gates passed. Replay, rollback, concurrency, durable retry, duplicate inbox delivery, safe linked logs, and low-cardinality metrics are covered.
  - Covered by sprint/task: S001-T03, S001-T06.
- [x] Hosted SBOM, dependency, secret, and image-scan evidence is retained and branch-protected.
  - Evidence: Previously verified hosted PR/push and default-branch freshness executions recorded execution integrity `PASS`, release policy `BLOCKED`, and `failureCode=NONE`. Their downloaded artifacts passed the exact seven-file sanitized-evidence allowlist validation and had 30-day retention. The freshness artifact recorded `deltaState=BASELINE_UNAVAILABLE`; this does not weaken the policy block. Phase 0 requires `supply-chain-verification`; the visible `release-policy` check is not required while policy remains blocked. Retained container counts were 29 High, 37 Medium, and 0 Critical; no disposition was created automatically. Legacy run, revision, and artifact identifiers are intentionally omitted from this public snapshot.
  - Covered by sprint/task: S001-T07.

## Current Sprint Progress

S001-T01 through S001-T09 have accepted local task outcomes. S001-T09 decision traceability: 20/20 approved mandatory blueprint subjects with no GAP/PARTIAL rows; these are architecture decisions, not AWS delivery. T09 is published via PR #15/default merge `0bd0f70a3324738fde08e3d104955e6b2d054742`. The owner accepted T08's [technical review](sprints/S001-T08_REVIEW_EVIDENCE.md) on 2026-10-05: fresh builds/contracts/database/sample evidence and canonical supply-chain execution PASS. Sprint 001 technical outcome is closed locally; protected T08 publication/postmerge delivery remains pending. The overall Phase 0 exit gate remains open. Consumer compatibility is DEFERRED_NO_PRODUCER_CONTRACT; release-policy=BLOCKED. Cognito, EventBridge/SQS, ECS, RDS, ElastiCache and multi-service choreography remain later-phase work.

## Repository Assessment

- `services/identity-profile-service`: Spring Boot skeleton with Java 21, Spring Boot 3.5.16, Maven Wrapper, persistence/security/observability dependencies, separate local/test Flyway credentials, and split local/Testcontainers integration-test paths.
- `web`: Next.js 16.3.6 application with UI and client-side feature code; Node/npm policy and an independent root GitHub Actions lint/build workflow are configured. This is not evidence of Phase 1–8 backend delivery.
- Remaining Phase 0 work includes service-template obligations outside the resolved D-005 topology gate. T08's local [runbook](runbooks/LOCAL_BASELINE_SPRINT_001.md) was exercised on the exact reviewed C1; it does not prove production recovery. Hosted T07 evidence and local T08 supply-chain execution remain separate from BLOCKED release policy. CDK deployment, ECR publishing and CodeBuild/CodePipeline remain later platform work.
- This public monorepo's bootstrap and snapshot commits establish its own history; they do not import or assert ancestry from prior source repositories.

## Decision / Blocker Log

| ID | Item | Status | Owner | Resolution path |
| -- | ---- | ------ | ----- | --------------- |
| D-001 | Formal approval of initial ADR/threat/SLO/cost baselines | RESOLVED | Product Owner / Project Owner | Approved on 2026-08-05; future significant architecture changes require a new ADR or traceable supersession. |
| D-002 | CI provider and container image registry choice | RESOLVED | Product Owner / Project Owner | GitHub Actions and Amazon ECR were approved on 2026-08-11; separate API/web baseline workflows are configured. ECR publishing awaits a dedicated GitHub OIDC role in a later deployment task. |
| D-003 | Identity service baseline test cannot initialize a datasource | RESOLVED | Developer | Local integration context now passes through `mvnw.cmd -Pit-local verify` using `identity_test_db` and separate runtime/Flyway credentials (2026-08-11). |
| D-004 | PostgreSQL owner/migrator/runtime baseline lacks full execution evidence | RESOLVED | Developer | Resolved on 2026-08-25: bootstrap converged twice, the complete local isolation matrix passed 8/8, the local Identity integration path passed 1/1, and canonical Testcontainers verification passed 5/5. |
| D-005 | Revised blueprint requires governed monorepo delivery | RESOLVED | Project Owner / Developer | Resolved on 2026-10-03 after owner review and acceptance of the amended exit evidence: reviewed current-tree snapshot, independent clean-checkout builds, protected default and stable required checks, ownership, hosted PR matrix, sanitized evidence, and locked bootstrap rollback reference. Prior Git ancestry was intentionally not imported. Phase 0 web consumer compatibility remains `DEFERRED_NO_PRODUCER_CONTRACT` under the approved addendum, not PASS; release policy remains separately `BLOCKED`, so this does not authorize product release. |

## Next Action

Complete protected publication/postmerge verification of the locally accepted S001-T08 closeout, with separate merge authorization. Then assess service-template gaps and authoritative producer contracts before proposing the next Phase 0 sprint; no Phase 1 start or Sprint 002 commitment is implied. Keep release-policy visible and BLOCKED until findings are remediated or receive exact approved unexpired dispositions.
