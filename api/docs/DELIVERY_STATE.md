# Auction Platform Delivery State

## Blueprint

- File: `docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md`
- Version: Final production architecture blueprint (repository copy has no explicit version identifier)
- Status: APPROVED SOURCE OF TRUTH

## Current Position

- Current roadmap phase: Phase 0 — Decision lock and engineering foundation
- Active milestone: R0 — Engineering Baseline
- Current sprint: SPRINT-002
- Sprint status: IN_PROGRESS
- Publication status: PENDING_PROTECTED_PR
- Activation evidence: [S002 review evidence](sprints/S002_REVIEW_EVIDENCE.md)
- Activation record publication: PUBLISHED_VERIFIED through PR #19 / merge 6459baf17ae8a88aeceb5d5d24bc0c601ba6868b.
- Delivery scope: T01–T06 actual technical publication verified; owner actual Phase 0 exit and Phase 1 handoff approved. T07 protected PR25 transition and factual closeout remain pending; current phase stays 0.
- Target environment: Local developer environment and CI baseline
- Last updated: 2026-10-12

## Sprint 001 historical lifecycle

- Current roadmap phase: Phase 0 — Decision lock and engineering foundation
- Current sprint: SPRINT-001
- Sprint status: COMPLETED
- Publication status: PUBLISHED_VERIFIED
- Published merge: `ab2d8256b25919cc7479fa6d6aad7a41eb964f83`.
- Actual review/closure date: 2026-10-05
- Current execution task: Phase 0 remaining-gate assessment (no next sprint or phase advancement authorized)
S001-T09 decision traceability: 20/20 approved

## Current Phase Goal

Establish reproducible, independently buildable service foundations with approved decisions, contract governance, isolated local data stores, observable request/event handling, and supply-chain scan evidence.

## Current Sprint Goal

Complete the approved Sprint 002 Phase 0 service-foundation and exit obligations through T01–T07. T01–T06 are published and verified. The owner approved actual exit/handoff; T07 protected transition and factual closeout remain pending.

## Phase Exit Gate Progress

All D01–D12 deliverables and E01–E03 technical exit criteria are PUBLISHED_VERIFIED in the [canonical matrix](decisions/PHASE_0_EXIT_MATRIX.md), binding frozen implementation `8a6fd2e` to actual technical publication PR24 / `0475661`. This includes all five independent committed-service builds, four relational isolation suites with explicit gateway exclusion, and the actual Identity sample trace. Owner actual exit/handoff is approved; protected T07 transition and factual closeout are pending. Current security execution/policy are PASS with 20 summed MEDIUM observations retained; consumer compatibility remains DEFERRED_NO_PRODUCER_CONTRACT.

## Historical Sprint 001 phase-gate assessment

The checklist below preserves Sprint 001 evidence and its then-open template obligation. Current Sprint 002 results above supersede its remaining-work and version assessments.

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

## Historical Sprint 001 Progress

S001-T01 through S001-T09 have accepted technical task outcomes. S001-T09 decision traceability: 20/20 approved mandatory blueprint subjects with no GAP/PARTIAL rows; these are architecture decisions, not AWS delivery. T09 is published via PR #15/default merge `0bd0f70a3324738fde08e3d104955e6b2d054742`. The owner accepted T08's [technical review](sprints/S001-T08_REVIEW_EVIDENCE.md) on 2026-10-05: fresh builds/contracts/database/sample evidence and canonical supply-chain execution PASS. PR16 delivered Sprint 001's technical outcome with required postmerge execution checks verified. The overall Phase 0 exit gate remains open. Consumer compatibility is DEFERRED_NO_PRODUCER_CONTRACT; release-policy=BLOCKED. Cognito, EventBridge/SQS, ECS, RDS, ElastiCache and multi-service choreography remain later-phase work.

## Repository Assessment

- Five committed independent foundations: Identity, Auction, Bidding, Billing and the database-free realtime gateway. Java 21, Boot 4.0.8 and Maven distribution 3.9.16 are pinned; [build baseline](runbooks/BUILD_VERSION_BASELINE.md) records exact framework/toolchain pins and reviewed supersessions. Relational services preserve separate runtime/Flyway credentials and canonical Testcontainers proof.
- `web`: Next.js 16.3.6 application with UI and client-side feature code; Node/npm policy and an independent root GitHub Actions lint/build workflow are configured. This is not evidence of Phase 1–8 backend delivery.
- Remaining Sprint 002 work is protected T07 transition and factual closeout publication. Template/topology technical obligations are verified; current five-service scans and default freshness have execution/policy PASS, with residual findings retained. Historical T08/S001 BLOCKED evidence remains historical. CDK deployment, ECR publishing, CodeBuild/CodePipeline and production recovery remain later platform work.
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

Publish and verify the owner-approved T07 transition through PR25, then prepare factual closeout from its actual merge/tree/checks for separate merge authorization. T06's [exit matrix](decisions/PHASE_0_EXIT_MATRIX.md) and technical publication are verified. Follow the [completion log](../../docs/superpowers/plans/2026-10-12-s002-phase0-completion-log.md). Time/capacity limits are superseded by OWNER-DECISION-2026-10-12-SELF-PROJECT-NO-TIME-LIMIT; current Phase 0 remains open until protected transition and closeout are verified.
