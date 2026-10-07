# Sprint 002 Phase 0 Exit and Service Foundation Implementation Plan

> Execute task-by-task using the owner-approved execution method; each task requires its specified review and evidence gates. Steps use checkbox (`- [ ]`) syntax for tracking. Agent-specific skills are execution-environment instructions, not project dependencies.

**Goal:** Deliver independently verified foundations for five core services, close Phase 0 through owner-approved published evidence, and record the Phase 1 handoff without starting Phase 1 implementation.

**Architecture:** Repository-owned deterministic templates generate standalone relational or gateway projects. Preserve Identity and its sample flow; extend existing CI/security boundaries explicitly rather than creating shared business/runtime libraries. Lifecycle activation and final transition are separately protected, evidence-backed changes.

**Tech Stack:** Existing Java 21, Spring Boot 3.5.16, Maven distribution 3.9.16, PostgreSQL 17, PowerShell 5.1/7, Node and GitHub Actions baselines; committed scanner/image trust pins.

**Spec:** [Approved design](../specs/2026-10-05-s002-service-foundation-design.md).

Status: OWNER_APPROVED_FOR_EXECUTION (2026-10-05). Owner approval covers the full Sprint 002 plan and T01 scope, capacity/duration envelope and direct sequential execution method recorded under [Owner execution decision](#owner-execution-decision). Activation approval and per-PR merge authorization remain ungranted.

V1 architecture amendment (Project Owner instruction, 2026-10-05): [Blueprint](../../../api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md), [ADR-026](../../../api/docs/adr/ADR-026-marketplace-transaction-and-monetization-boundary.md) and [ADR-027](../../../api/docs/adr/ADR-027-bidding-billing-and-listing-entitlement-ownership.md) supersede obsolete financial-domain assumptions before activation/T02. The owner-approved execution envelope and task order stay in force; activation and per-PR merge approval remain separate and NOT GRANTED.

## Global Constraints

- Baseline PR17 merge: `9a625b96e97cac9900046a89131184e2d4427402`; preserve primary edits and all private evidence.
- Exactly five core services: identity-profile-service, auction-service, bidding-service, billing-service, realtime-gateway. Supporting Lambda workloads are later-phase obligations. These are technical foundations, not product bidding/billing implementation.
- Java 21, Spring Boot 3.5.16, Maven Wrapper 3.3.4 and its pinned Maven distribution 3.9.16 remain unchanged; wrapper implementation and integrity metadata come from the existing reviewed wrapper, not a new download.
- Preserve Identity business/sample code, migrations and accepted contracts. No shared business library, cross-service runtime dependency or mandatory root reactor.
- Gateway has no PostgreSQL/JPA/Flyway/Valkey adapter or invented datastore readiness. No Cognito/AWS/product functionality.
- Dedicated native PostgreSQL supplements canonical Testcontainers. No reset/drop, credential output, registry publication, policy bypass, settings mutation or inferred merge permission.
- Existing stable required checks remain `monorepo-required` and `supply-chain-verification`; release policy remains independently enforced and visible.
- Producer consumer compatibility stays `DEFERRED_NO_PRODUCER_CONTRACT`; decision approval is not implementation evidence.
- Every task uses immediate native-command exit checks, RED/GREEN for changed behavior, scoped review and exact-path commits with approved noreply identity. Record failures privately.
- New paths listed below are proposed contracts, not existing tools. Verify library/API configuration against current primary documentation; do not update approved versions silently. Context7 is the required documentation helper in this session under AGENTS.md, not a repository build/runtime dependency.

## Review Focus

1. Destination alias/symlink or interrupted generation must not overwrite existing files or escape the service root (T02).
2. Inherited Spring/JVM/Maven carriers and absent-versus-empty environment values must not redirect a database or leak credentials (T04).
3. Deleted/renamed services, malformed diff and a selected matrix job disappearing must not produce a green aggregate (T03).
4. A valid scan accidentally bound to Identity or another SHA/artifact must not satisfy a new service gate (T03/T05).
5. Historical Sprint 001 Phase 0 and a later current Phase 1 must coexist, while premature activation/transition and approval omissions fail (T01/T07).

## Capacity and dependency map

Planning estimates, not commitments: T01 10–16h; T02 10–16h; T03 18–28h; T04 12–18h; T05 6–10h; T06 10–16h; T07 6–10h. Total **72–114 engineering hours**, plus **14–22h reserve** for platform/scan/review corrections; owner reviews, hosted queue and merge waiting are additional elapsed time. T01 includes always-run hosted lifecycle enforcement and protected activation bookkeeping; see its detailed guide. Refine after T03 interface audit, before enlarging scope.

This does not fit Sprint 001's 45–50h capacity. The owner approved 72–114 engineering hours plus 14–22 hours reserve (maximum envelope 86–136 hours) over no more than four engineering weeks. No start/end dates are invented before execution begins. A delivery split means separately reviewed, CI/security-covered PRs or increments within the approved Sprint 002 execution envelope, not silent deferral of T07 to Sprint 003. Deferring Phase 0 closure to another sprint requires explicit owner re-baselining; Sprint 002 must not be marked successful against this plan. No gate is dropped to fit a date. Re-estimate after T03; stop and rebaseline if forecast exceeds 136 hours or T07 is no longer feasible in the approved envelope.

Sequence: plan/capacity/method approval → T01 protected activation → T02 template → T03 CI/security interfaces → T04 first relational reference → T05 remaining variants → T06 frozen-candidate review/publication → T07 verified exit/transition. No new artifact is delivered before its T03 security route is exercised.

## File and interface map

All paths are repository-relative. Service-specific generated files below use a closed expansion, not an arbitrary user path.

| Boundary | Files / responsibility |
| --- | --- |
| Lifecycle | Existing `api/scripts/decisions/Test-S001-T09-Decisions.mjs`; new `api/scripts/decisions/SprintLifecycle.mjs` and `Test-S002-Lifecycle.mjs`: current lifecycle validation without weakening historical T09 gates |
| Sprint records | New `api/docs/sprints/SPRINT_002.md`, `S002_REVIEW_EVIDENCE.md`, `api/docs/decisions/PHASE_0_EXIT_MATRIX.md`; existing `api/docs/DELIVERY_STATE.md`, `SPRINT_INDEX.md`, `PRODUCTION_COVERAGE.md` |
| Registry/generator | New `api/service-foundation/services.json`, `template-files.json`, `README.md`, `templates/common/`, `templates/relational/`, `templates/gateway/`; new `api/scripts/foundation/Generate-Service.mjs`, `Test-ServiceGenerator.mjs`, `Test-ServiceConformance.mjs` |
| Hosted selection | Existing `scripts/migration/MonorepoRequiredChecks.mjs`, `Test-MonorepoRequiredChecks.mjs`, `Test-MonorepoWorkflowContracts.mjs`, `.github/workflows/monorepo-verification.yml` |
| Artifact security | Existing `api/scripts/supply-chain/` entry points/contracts and `.github/workflows/supply-chain.yml`, `security-freshness.yml`; new service artifact resolver, per-service evidence validator/tests listed in T03 |
| Local operations | New `api/scripts/foundation/Run-ServiceLocal.ps1`, `Test-RunServiceLocal.ps1`, `Test-ServiceHttp.ps1`; new `api/docs/runbooks/SERVICE_FOUNDATION.md`; existing Identity launcher preserved |

Registry exact mappings: group `com.auctionpromax`, artifact/version `<service-id>:0.0.1-SNAPSHOT`; Identity package `com.auctionpromax.identityprofileservice`, auction `com.auctionpromax.auctionservice`, bidding `com.auctionpromax.biddingservice`, billing `com.auctionpromax.billingservice`, gateway `com.auctionpromax.realtimegateway`. Entry classes respectively `IdentityProfileServiceApplication` (existing), `AuctionServiceApplication`, `BiddingServiceApplication`, `BillingServiceApplication`, `RealtimeGatewayApplication`. Relational pairs are `identity_db`/`identity_test_db`, `auction_db`/`auction_test_db`, `bidding_db`/`bidding_test_db`, `billing_db`/`billing_test_db`; gateway has no PostgreSQL DB.

For each new service `<id>`, generated destination `api/services/<id>/` includes `pom.xml`, `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties`, `Dockerfile`, `README.md`, `src/main/java/<package-path>/<EntryClass>.java`, `configuration/TechnicalConfiguration.java`, `adapter/in/web/CorrelationIdFilter.java`, `TechnicalProblemAdvice.java`, `TechnicalProbeController.java`, `src/main/resources/application.yaml`, `application-local.yaml`, and test classes `TechnicalHttpTest`, `StructuredLoggingTest`, `architecture/ArchitectureTest` under its package. Relational adds `src/main/resources/db/migration/V1__create_technical_probe.sql`, test `RelationalBoundaryTestcontainersIT`, test bootstrap resources. Gateway adds `GatewayNoDatastoreIT` and no database resources. New fixture packages live only under test sources.

Template inventory pins this exact expansion and source provenance; no copying Identity's sample/domain/migrations V1–V4. Add any extra generated path only through reviewed inventory change.

## T01 — Safe lifecycle and protected Sprint activation

**Files:** Lifecycle and sprint records above; additionally `.github/workflows/monorepo-verification.yml`, `scripts/migration/MonorepoRequiredChecks.mjs`, `Test-MonorepoRequiredChecks.mjs` to enforce lifecycle on docs-only PRs before activation. Do not rewrite historical Sprint 001 acceptance. Follow [T01 self-contained guide](2026-10-05-s002-t01-lifecycle-activation-guide.md) for historical routing, parsed-state interfaces and the protected activation sequence.

**Interfaces:** `validateLifecycle({sprint, delivery, index, exitEvidence}) -> {valid:boolean, errors:string[]}` exported by `SprintLifecycle.mjs`. Validate current state separately from historical sprint phase. T09 retains its existing complete/closeout CLI. New CLI `node api/scripts/decisions/Test-S002-Lifecycle.mjs --repository` checks actual records; fixture mode with no flag runs synthetic cases.

Execution prerequisites (plan/T01 scope, capacity/duration and execution method) precede every modifying RED/GREEN step. Reference existing design approval. Separate owner activation approval follows local audit/review and precedes prerequisite PR; merge permission remains separate. `exitEvidence.activationPublication` binds prerequisite evidence, never Sprint closeout publication. T01 keeps `sprint.publicationStatus=NOT_PUBLISHED` even when active; exact allowed tuples and rejection fixtures are pinned in the T01 guide. T07 owns Sprint closeout publication states.

- [ ] Write fixture assertions: `assert.equal(validateLifecycle(sprintOnlyPrematurePhase1).valid, false)`; valid planned S002/Phase0 true; active S002/Phase0 requires design, plan, capacity/duration decision, execution-method and activation approvals plus verified prerequisite publication. Independently remove each approval and assert false; wrong scope/date/reference also fails. Record all approval references in Sprint 002 activation metadata. T01 rejects current Phase1 even with historical S001 Phase0; T07 later adds the evidenced transition positive fixture. Model exact fields before implementation.
- [ ] Run new fixture CLI; record intended RED on old Sprint-only omission, not syntax/dependency failure.
- [ ] Extract only shared lifecycle logic needed by S002, preserve all T09 negative fixtures and existing publication semantics; implement GREEN assertions.
- [ ] Create Sprint 002 record with task IDs T01–T07, unset dates until owner supplies them, approved capacity/method reference, acceptance linked to design, and explicit local activation/publication-pending state. Actual published activation is not claimed in premerge content.
- [ ] Run both S002 modes and `node api/scripts/decisions/Test-S001-T09-Decisions.mjs --require-complete --require-closeout`; check links/whitespace and trusted redacted introduced-range scan. Commit exact lifecycle/activation paths.
- [ ] Obtain separate merge authorization, verify fresh protection read-back, PR-event required checks, actual merge parents/tree and push-event required checks. Publish factual activation bookkeeping if necessary; retain private read-back. Stop before T02 if authoritative activation is not verified.

**Done:** Corrected gate rejects Sprint-only mutation before/with protected activation; Sprint 001 evidence and Phase 0 remain intact. Tracking `S002-LIFECYCLE-01` remains green through T07.

## T02 — Deterministic two-variant template

**Files:** Registry/generator map above. `template-files.json` is the closed inventory of source/destination token mappings; test-only temp output is outside committed service destinations.

**Interfaces:** `generateService({serviceId, repositoryRoot}) -> {serviceId, variant, files:string[]}`; registry alone determines package/database/variant/destination. CLI `node api/scripts/foundation/Generate-Service.mjs --service <registered-new-id>` has no arbitrary destination flag. Tests may pass isolated temporary repository roots through the exported API. Identity generation fails with `SERVICE_PRESERVED`.

- [x] Write named fixtures `deterministicLfOutput`, `unknownIdNoWrites`, `variantMismatchNoWrites`, `traversalNoWrites`, `existingDestinationUnchanged`, `linkedDestinationRejected`, `interruptedGenerationNoPublishedPartialTree`, `identityPreserved`. Exercise Windows junction/reparse-point and symlink destinations/ancestors as well as supported Unix symlinks; lack of symlink creation privilege is not a passing case, retain actual junction proof and explicitly report the unsupported fixture. Assert complete byte equality of two generated inventories and unchanged sentinel hashes on rejection.
- [x] Run `node api/scripts/foundation/Test-ServiceGenerator.mjs`; record RED at missing generator/intended safety assertion.
- [x] Implement allowlisted registry and literal token substitution, preflight every file/target, stage in validated sibling temporary directory then publish with no-overwrite semantics; failure cleanup only its validated temporary path. No executable template expressions.
- [x] Derive common technical adapters/test patterns from Identity, relational/gateway dependency sets separately; add deliberate forbidden-import test fixtures. Test-only invalid DTO/500 probe coverage must not introduce a production endpoint designed to throw.
- [x] Run generator fixtures and `node api/scripts/foundation/Test-ServiceConformance.mjs --templates`; verify gateway forbidden dependency/config inventory, wrapper/image pin equality, no secrets/generated output tracked. Commit template only; no service artifact delivered yet.

**Done:** Reviewed source template and exact registry/expansion contract; no artificial business use case or runtime shared library.

T02 registry accepts only the revised five IDs. The new Bidding/Billing expansions are relational technical shells; neither implements a product bid, listing package, PSP flow, monetary wallet or auction-item payment.

## T03 — Independent CI and artifact-aware security gate

**Files:** Hosted selection map; new `api/scripts/supply-chain/ServiceArtifact.psm1`, `Test-ServiceArtifact.ps1`, `Validate-ServiceSupplyChainEvidence.mjs`, `Test-ServiceSupplyChainEvidence.mjs`; modify existing `Invoke-HostedSupplyChain.ps1`, `Validate-IdentitySbom.mjs`, container prebuild/build/smoke/scan entry points, vulnerability scanning and their matching tests only where service identity is hardcoded. Update corresponding committed schemas/contracts under `api/security/` in the same reviewed delta, retaining trust pins.

**Interfaces:** `Resolve-ServiceArtifact -ServiceId <registry-id>` returns registry-bound project path, group/artifact/version, Dockerfile, JAR path, variant; no caller-provided artifact path. Existing orchestrator gains optional `-ServiceId` defaulting to Identity. Service evidence validator `--service <id> --commit <40hex> --directory <private-dir>` requires exactly seven existing sanitized summary types with validated service identity and revision. Legacy Identity invocation remains supported and tested. Repository-wide Gitleaks/infra scanning may be reused only on identical revision, explicitly referenced; never substitute another service's artifact scan.

- [ ] Audit hardcoded Identity targets across SBOM/dependency/container/smoke/orchestrator/policy/schema interfaces; record exact modified-file allowlist before coding. Stop for review if policy/trust semantics must change; target generalization does not authorize those changes.
- [ ] Add RED classifier fixtures: auction-only selects only auction plus repository checks; contract change selects API contracts/web; template/registry/shared change selects all five; docs-only skips service builds but validates lifecycle; rename/delete includes both paths; invalid diff selects all. Preserve existing API/web boolean compatibility until workflow consumers migrate together.
- [ ] Define new classifier output `services` as JSON array of registered IDs. Matrix must report one result for each selected ID; aggregate fails missing/duplicate/unknown result, failure/cancelled, classifier error or unjustified skip. Add RED assertions for a vanished selected service and gateway failure hidden by Identity success.
- [ ] Implement classifier/matrix and existing stable aggregate. No workflow-level path filter; PR uses merge revision, push uses pushed revision; wrapper clean verify runs from each project directory. Keep contracts/CDK/web/repository gates and pinned Actions. Template conformance runs on generated projects too.
- [ ] Add security RED fixtures: mismatched service root/GAV/JAR/hash/SHA, gateway database-dependent smoke, missing one summary, copied Identity result, fresh DB missing, blocked policy with successful execution. Assert wrong identity is rejected while valid execution PASS/policy BLOCKED remains distinct.
- [ ] Implement registry-bound target propagation end-to-end, generic SBOM expected identity without changing legacy validation semantics, exact evidence binding and safe health-only gateway smoke. Update both supply-chain and freshness workflow selection so no new shipped artifact is omitted; fail closed on unknown input.
- [ ] Run `node scripts/migration/Test-MonorepoRequiredChecks.mjs`, `node scripts/migration/Test-MonorepoWorkflowContracts.mjs --repository`, new service artifact/evidence fixtures, existing hosted contract/orchestration/evidence and Identity scanner fixtures. Exercise temporary generated artifact through the real trusted route; retain ignored evidence only.
- [ ] Review/commit exact interface and CI paths. Required-check names/settings unchanged. Hosted controlled path-selection/failure cases must be executed before final acceptance, not counted as proven by workflow source tests alone.

**Done:** CI/security routes can independently verify every registry artifact, including gateway without PostgreSQL; no service is delivered with Identity-only scan coverage.

T03 service-selection, matrix identity and artifact-binding fixtures use `bidding-service` and `billing-service`; shared/template changes select all five revised IDs. Unknown IDs and malformed input remain fail-closed.

## T04 — Auction relational reference and safe local runner

**Files:** Generate exact auction expansion; local operations files above. Registry maps auction to `auction_db` / `auction_test_db`; use existing ADR-016 role names, not invented credentials.

**Interfaces:** `Run-ServiceLocal.ps1 -ServiceId <new-id> -ConfigurationPath <ignored-local-file> -Port <loopback-port>` validates registry target and inherited carriers before mutating environment. Gateway configuration carries no DB fields. Existing `run-identity-local.ps1` remains unchanged. `Test-ServiceHttp.ps1 -ServiceId <id> -BaseUri <loopback-uri> -LogPath <private-log>` returns nonzero on missing live proof; does not start or stop unrelated processes.

- [ ] Add RED tests `rejectInheritedSpringDatasource`, `rejectSpringJsonConfigProfile`, `rejectJvmMavenOptions`, `restoreAbsentAndEmptyVariables`, `rejectWrongServiceDatabase`, `rejectNonLoopback`, `noSecretOutput`. Controlled Maven child verifies exported bindings/arguments and exact restoration; use synthetic credentials only.
- [ ] Run runner fixture script in native PowerShell 7 and 5.1; record intended rejection failure before implementation.
- [ ] Implement runner guard/config parser with registry-bound datasource/migrator mapping, no value logging; reuse proven Identity behavior through source patterns, not a runtime dependency or arbitrary config override.
- [ ] Generate auction; implement minimal technical table migration with separate migrator/runtime ownership and no auction domain columns. Canonical IT uses committed PostgreSQL digest and test bootstrap, proving migration history protection, runtime DML, denied DDL and denied other-service boundary. Unit test phase remains database-free.
- [ ] Run local GREEN tests, review exact paths/whitespace/secret boundaries and create a local candidate commit containing generated auction, runner and runbook; record SHA/tree. Local commit is not publication or owner acceptance. Create a fresh detached LF checkout at that SHA, then run auction wrapper `clean verify` standalone; count actual Surefire/Failsafe XML with no failed/error/skipped required tests. Exercise architecture rejection fixtures and real formatter with MDC plus fluent fields.
- [ ] Run native bootstrap/verify/status on existing dedicated topology without reset; live loopback health/probe/error/actuator/correlation metrics/log checks; UTF-8 normalize problem response bytes. Stop only verified launched ancestry.
- [ ] Invoke service-specific real orchestrator with `-ServiceId auction-service -RefreshDatabase` on that committed candidate SHA in its clean rehearsal checkout, validate seven summaries; execution PASS required, policy honestly recorded. If correction is needed, preserve failed evidence, create a new local candidate commit and repeat affected gates with reviewed unchanged-evidence applicability; never relabel old evidence as the new SHA. Review candidate/evidence before acceptance or publication.

**Done:** First relational reference establishes executed pattern and artifact coverage. No product auction behavior.

## T05 — Bidding, billing and gateway conformance

**Files:** Exact generated expansions for bidding-service, billing-service and realtime-gateway; update service inventory/runbook. No Identity migrations changed.

**Interfaces:** T02 generator; T03 service artifact/evidence route; T04 runner/HTTP verifier. Registry DB pairs bidding_db/bidding_test_db and billing_db/billing_test_db; gateway no database mapping.

- [ ] Add conformance RED cases asserting exact service package/GAV/data mappings and no Identity sample class/event/table leakage. Gateway tests assert no JDBC/JPA/Flyway dependency or datasource config and verify startup with no database process.
- [ ] For each bidding/billing technical-shell increment: generate, implement, run local GREEN, exact-path review and create a local candidate commit; record SHA/tree and create its fresh detached LF checkout. Execute standalone canonical Testcontainers proof of migration ownership/history protection, runtime DML allowed, runtime DDL denied and cross-service DB access denied; native isolation supplements it. Execute live HTTP/log proof. Record service-specific XML/logs, not pooled test counts. No product bid, listing purchase or PSP behavior is added.
- [ ] For gateway: generate, run local GREEN, exact-path review and create its local candidate commit/fresh detached checkout before clean verification or SHA-bound scans. Execute standalone clean verify and real no-datastore HTTP startup/readiness plus serialization/architecture tests. Valkey/fanout/auth remain explicitly unimplemented.
- [ ] For each service, run trusted real service-specific artifact scan and exact seven-file validation on frozen revision. Missing/wrong-service evidence blocks delivery. Re-run T02 generator/conformance and T03 classifier/aggregate fixtures.
- [ ] Review each committed variant and its evidence in independently covered increments. Any fix produces a new candidate SHA, retained failed evidence and renewed affected verification/applicability review. Do not claim hosted delivery until applicable PR/push service and security jobs pass. Keep all evidence private and sanitized.

**Done:** All four new services verified independently; original Identity remains the sole sample request/event proof.

## T06 — Complete Phase 0 matrix, clean rehearsal and publication

**Files:** `api/docs/decisions/PHASE_0_EXIT_MATRIX.md`, `api/docs/sprints/S002_REVIEW_EVIDENCE.md`, `SPRINT_002.md`, coverage/runbook; new `api/scripts/foundation/Test-Phase0ExitMatrix.mjs`. Delivery/Index still Phase 0 with closeout pending, not final success.

**Interfaces:** Matrix rows contain `requirementId`, amended blueprint/ADR authority, scope/applicability, implementation revision, evidence reference, result and owner acceptance reference. IDs D01–D12 follow blueprint deliverable order; E01 independent builds (all five revised IDs), E02 no cross-DB (Identity, Auction, Bidding and Billing relational; gateway not applicable with evidence), E03 Identity sample trace. Inherited-gap rows reference Sprint 001 sources and later-phase authority without modifying history. Missing implementation evidence cannot be replaced with an ADR status.

- [ ] Write RED fixtures `missingDeliverableRejected`, `oneServiceMissingRejected`, `decisionOnlyRuntimeRejected`, `consumerDeferredNotPass`, `staleRevisionRejected`, `unresolvedMandatoryGapRejected`; run validator and implement exact matrix validation GREEN.
- [ ] Freeze candidate commit/tree; create clean detached LF checkout, fresh locked installs, build each service independently, complete contracts Fixture/Registry, workflow/scanner fixtures and T09/S002 lifecycle gates. Shared download cache allowed, no prior target output.
- [ ] Repeat Identity canonical tests and accepted live request/event proof on that candidate: initial/replay, conflicts, rollback/concurrency coverage, scoped six-table persistence, health/metrics and recorded/replayed/published/applied logs. Preserve runtime provenance; no distributed sample introduced.
- [ ] Run four-service canonical isolation and all new live HTTP checks; real supply-chain evidence for all five artifacts plus repository targets, fresh DB validation and exact service/revision binding. Record execution/policy/review/failure states and dated counts; do not inherit old vulnerability totals.
- [ ] Validate all changed Markdown targets/headings, exact allowlist, trusted redacted full introduced Git-range scan and whitespace; independent final review. Resolve Important findings and rerun affected exact-revision gates; no silent scope expansion.
- [ ] Present frozen evidence and inherited-gap reconciliation for explicit owner technical/Phase0 candidate acceptance; retain separate merge authorization gate. Publish protected PR only through approved workflow; inspect PR-event checks rather than substituting branch-push runs.
- [ ] After authorized owner merge, verify actual parents/tree/default ref and actual-merge push checks; local lifecycle/matrix verification on published checkout. Any runtime/tree difference requires renewed applicability review and affected rehearsal. Record published candidate facts privately for T07.

**Done:** Published technical candidate verified; Phase 0 transition and Sprint completion remain pending T07.

## T07 — Verified exit, protected transition and Phase 1 handoff

**Files:** Matrix/review evidence, Sprint002, DeliveryState, SprintIndex, coverage; lifecycle module/tests only if final tested-state implementation requires it. Sprint001 remains historical Phase0 completed/published.

**Interfaces:** Transition record references published technical candidate merge/tree, required run links/results, explicit owner actual-exit confirmation, handoff approval/date and pending/final publication status. A premerge record may reference the earlier candidate, never invent its own future merge SHA.

- [ ] Add RED fixtures rejecting transition with candidate-only approval, missing actual merge checks, mismatched candidate/tree, absent owner actual-exit confirmation, premature Sprint COMPLETE and release-policy relabeled PASS. Valid historical S001 plus verified current Phase1 remains GREEN.
- [ ] Present actual published evidence for owner confirmation of Phase0 exit and handoff. Handoff lists Phase1 entry/backlog, owning deferred producer contracts, residual findings, and activities blocked by security policy; do not infer permission to publish images/deploy.
- [ ] Prepare transition/bookkeeping PR within this sprint, encoding verified candidate facts and explicit transition-publication-pending semantics. Lifecycle gate must reject incomplete states without demanding circular self-merge identity. Obtain separate merge authorization and required PR checks.
- [ ] Verify transition actual merge and push checks; confirm authoritative Delivery/Index current Phase1 and Sprint002 final completed outcome, without changing historical Sprint001 phase. If further factual bookkeeping is needed, retain explicit pending status and complete protected follow-up before final success claim; no fabricated self-referential SHA.
- [ ] Run final repository lifecycle/exit-matrix/link/security-range/whitespace gates on exact published state. Record final read-back privately and provide owner concise Phase0 closure/Phase1 handoff report. No Phase1 implementation starts automatically.

**Done:** Sprint002 COMPLETE, Phase0 CLOSED and current Phase1 are evidenced and published. BLOCKED release policy/deferred consumer contracts remain truthful and routed to their owning work.

## Verification interpretation and rollback

Commands in this plan are future execution requirements, not results. New tool interfaces must be implemented/tested before use; all native commands check exit immediately. Approval/publication stages are owner gates, not automated writes. Rehearsal and hosted evidence must bind to actual revisions; docs-only follow-up applicability may reuse earlier runtime evidence only with exact delta/tree review.

Rollback uses reviewed reverts with preserved commits/evidence, never reset/drop/history rewrite. New technical database tables have no implicit destructive rollback; stop affected launcher and retain data for diagnosis. No worktree/evidence cleanup is authorized by sprint completion.

## Plan self-review and approval gates

Spec coverage: acceptance 1 T02; 2–6 T04/T05/T06; 7–8 T03/T06; 9 T06/T07; 10 T06; 11 T01/T07; 12 T07. All five Review Focus risks have owning negative fixtures. Template/registry and artifact identities are shared explicit interfaces; historical phase differs from current lifecycle state. No Phase1 implementation or security-policy exemption included.

The owner approved this plan for execution on 2026-10-05, including full Sprint 002 scope, the 86–136 hour envelope with a four-engineering-week maximum, the post-T03 re-estimate/stop rule, and direct sequential implementation in the isolated worktree with independent scoped/final review. The baseline LF/CRLF test-harness repair was separately authorized and must be GREEN before T01 RED/GREEN. Planning approval does not authorize activation or future merges; activation, candidate acceptance, actual exit and transition retain their separate gates.

### Owner execution decision

Decision reference: `OWNER-DECISION-2026-10-05-S002-EXECUTION`.

Recorded 2026-10-05 from the Project Owner:

| Decision | Approved direction |
| --- | --- |
| Parent plan / T01 | APPROVED FOR EXECUTION; full Sprint 002 plan with the goal of closing Phase 0 |
| Scope | Entire Sprint 002 plan, not only baseline repair |
| Capacity | 72–114 engineering hours + 14–22 hours reserve; maximum total envelope 86–136 hours |
| Duration | Maximum four engineering weeks; leave start/end unset until execution begins |
| Re-estimate | Mandatory after T03; stop and rebaseline if forecast exceeds 136 hours or T07 is no longer feasible |
| Execution method | Direct sequential implementation in isolated worktree; independent scoped/final review remains required |
| Baseline failure | Minimum LF/CRLF-compatible test-harness repair authorized; rerun baseline to GREEN before T01 RED/GREEN |
| Activation approval | NOT GRANTED; consider only after local T01 review is GREEN |
| Merge authorization | NOT GRANTED; separate authorization remains necessary for every PR |
| Phase 1 | No Phase 1 implementation during Sprint 002 |
