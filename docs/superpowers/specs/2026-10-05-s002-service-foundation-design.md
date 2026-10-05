# Sprint 002 — reusable service foundation and independent core builds

Status: DESIGN_REVIEW_PENDING. The owner approved the scope in conversation; this written specification requires review before the implementation plan is written. Sprint 002 is not activated by this document.

## Intent and baseline

Complete the remaining Phase 0 engineering obligations, obtain an evidenced owner-approved Phase 0 exit, and deliver a verified transition/handoff to Phase 1 without implementing Phase 1 capabilities. Preserve Sprint 001's accepted Identity baseline, contracts, security policy and historical evidence. Sprint 002 achieves its intended goal only when the phase-exit and transition gates below complete, not merely when skeleton implementation finishes.

Baseline: PR17 merge `9a625b96e97cac9900046a89131184e2d4427402`. Sprint 001 is completed and published. Phase 0 remains open; web consumer compatibility remains `DEFERRED_NO_PRODUCER_CONTRACT`; release policy remains BLOCKED.

Provenance: PR16 merge `ab2d8256b25919cc7479fa6d6aad7a41eb964f83` published the accepted Sprint 001 technical outcome. PR17 follows it with five publication-bookkeeping documents and the lifecycle validator only; no application/runtime change or Sprint 002 design was part of PR17. Sprint 001 runtime evidence remains bound to its reviewed C1 `c71a49d16a2452268503b4a68eedbfe557e6c7fe`, not relabeled as a fresh PR17 rehearsal. This design is a subsequent, separate proposal.

Authority:

- [Blueprint §4.1 and Phase 0](../../../api/docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md).
- [Delivery State](../../../api/docs/DELIVERY_STATE.md).
- [Sprint Index](../../../api/docs/SPRINT_INDEX.md).
- [ADR-017 implementation addendum](../../../api/docs/adr/ADR-017-repository-topology-and-contract-governance.md).
- [Consumer-gate addendum](2026-09-27-s001-t09-phase0-consumer-gate-addendum.md).
- [Sprint 001 review](../../../api/docs/sprints/S001-T08_REVIEW_EVIDENCE.md).

## Scope and architecture

Use a repository-owned, parameterized source template with a minimal common foundation and two explicit variants: relational and gateway. Generate standalone Maven projects, not modules that require building another service first. Do not introduce a shared business library or runtime dependency between services. Generated source remains reviewable in Git; later regeneration must never silently overwrite hand-edited files.

The template is derived from proven technical patterns in Identity, not by copying its domain/sample application wholesale. Existing Identity is not regenerated or destructively rewritten; its current tests and sample flow remain authoritative regression coverage.

| Service | Variant | Canonical data boundary | Treatment |
| --- | --- | --- | --- |
| identity-profile-service | Relational | identity_db / identity_test_db | Preserve existing service and verify common baseline conformance |
| auction-service | Relational | auction_db / auction_test_db | New technical skeleton; no categories, auctions or S3 integration |
| transaction-core-service | Relational | transaction_db / transaction_test_db | New technical skeleton; no bids, wallet, ledger or financial schema |
| payment-service | Relational | payment_db / payment_test_db | New technical skeleton; no provider/webhook/payment flow |
| realtime-gateway | Gateway | Future Valkey ephemeral state | New technical skeleton; no PostgreSQL, JPA, Flyway or fake datastore readiness |

The gateway variant has no external datastore integration in this sprint. Readiness proves only the dependencies it actually uses; it cannot claim Valkey, WebSocket authentication or fanout readiness. Adding an actual Valkey adapter requires separate scoped approval and evidence.

## Template contract and safety

Template inputs are an allowlisted service identifier and its registered variant/data boundary. Do not allow arbitrary database targets, filesystem paths, executable template expressions or package names. Service package names derive deterministically from the approved identifier registry. The implementation plan must pin exact mappings and file interfaces before coding.

Generation must be deterministic, produce LF text, stay within the approved service destination and fail before writing if the destination already exists or input is invalid. Tests cover path traversal, unknown identifiers, inconsistent variants, existing destinations and repeat generation into separate empty destinations. No generated credentials, ignored local configuration, caches, binaries or scanner output enter Git.

Keep the existing baseline versions: Java 21, Spring Boot 3.5.16 and Maven Wrapper 3.9.16. Reuse committed trust/image pins and scanner contracts without substitution. Dependency additions must be minimal, justified and reviewed; no automatic upgrades or vulnerability bypasses.

## Technical behavior

Every service owns its wrapper/build, entry point, configuration, architecture tests and technical tests. Default verification must not depend on native developer PostgreSQL, another service's target output or a root reactor build.

Provide health/liveness/readiness with an explicit safe actuator allowlist, canonical safe Problem Details for technical errors, correlation/trace propagation and structured logging. Sensitive actuator surfaces and exception details stay unavailable. Technical probes are not product APIs and cannot be exposed as a product-contract compatibility claim.

Hexagonal boundaries keep domain/application independent of framework and persistence adapters. Include deliberate prohibited-dependency fixtures so architecture tests prove rejection, not merely empty-package success. New skeletons need no artificial business entities/use cases to make architecture tests nonempty.

Relational services use the existing approved eight-database/24-role topology. Separate migrator/runtime credentials; migration history and ownership must stay inaccessible to inappropriate runtime DDL. Introduce only a minimal technical persistence probe where necessary for executed migration/DML evidence, clearly isolated from future domain schema. No reset/drop or production data operation is authorized.

Local launch conventions must reject inherited Spring/JVM/Maven configuration carriers that could redirect the reviewed local profile, validate service-specific loopback/database boundaries, avoid printing secrets and restore temporary environment changes. Windows PowerShell 5.1 and PowerShell 7 behavior must be exercised if the new launchers support both.

## Verification and acceptance

1. Template fixtures prove deterministic output, correct variant selection and fail-closed generation with no partial writes or overwrite.
2. Each of the five services passes standalone clean verification in a fresh checkout. No prior service build/install output substitutes for its result. Shared download caches are allowed and recorded honestly.
3. All relational service suites execute PostgreSQL 17 Testcontainers migration, ownership, runtime DML/DDL and cross-boundary negative checks against committed approved image pins. Dedicated native local verification supplements, not replaces, canonical evidence.
4. Gateway standalone verification succeeds without a PostgreSQL dependency or running database; dependency/configuration checks reject relational leakage.
5. Actual technical HTTP checks verify health, safe errors, denied sensitive actuator access and correlation/log serialization for newly generated services. Reuse formatter/MDC regression patterns; do not claim product trace flows.
6. Existing Identity sample/contracts/architecture/launcher regressions pass unchanged in meaning. Its accepted end-to-end request/event trace is repeated on the final candidate; do not distribute the sample across new services.
7. CI selects affected services independently and reports the existing stable required aggregate. Exercise service-only, template/shared, docs-only, mixed and deliberate-failure cases. Template changes must select all applicable generated-service conformance gates. No required-check/settings weakening.
8. Supply-chain tooling must cover every new shipped service artifact rather than silently scanning Identity alone. Produce validated revision-bound sanitized evidence per supported artifact; keep execution PASS distinct from BLOCKED release policy. If current tooling is single-service, extend it only through a reviewed explicit interface, tests and trusted scan path.
9. Runbook, service inventory, coverage and sprint evidence contain actual commands/results/revisions and scoped claims. Independent final review and protected PR/postmerge execution verification precede delivered completion.
10. A Phase 0 exit matrix maps every blueprint Phase 0 deliverable and all three exit criteria to exact revision-bound evidence or an explicit applicable approved decision. No unresolved mandatory Phase 0 gap may be silently classified as later-phase work. Historical decision approval is not implementation proof.
11. Lifecycle tests reject inconsistent current-phase claims across the active sprint, Delivery State and Sprint Index, including the previously deferred Sprint-only phase-mutation case. Distinguish a sprint's historical delivery phase from the authoritative current phase after transition. Preserve Sprint 001 closeout/provenance tests; support evidenced Sprint 002 activation, completion and the separately approved Phase 0-to-Phase 1 transition without inventing a generic lifecycle framework.
12. Owner acceptance of Phase 0 exit, protected publication, actual postmerge verification and a reviewed Phase 1 handoff complete before the authoritative current-phase state becomes Phase 1. Missing approval, incomplete exit evidence or failed/missing required checks must prevent advancement. Sprint 002 completion alone is not sufficient.

Test assertions must exercise behavior and real launch/build boundaries. Source-text checks alone cannot establish runtime isolation, HTTP safety or service build success. Record RED/GREEN for implementation changes and retain failed evidence privately.

## Exclusions and carried risks

No Cognito/auth product flow, auction/category functionality, bidding/financial invariants, payment integration, WebSocket product flow, EventBridge/SQS transport, AWS deployment, ECR publication or production recovery drill. Supporting Lambda workloads are outside the five-core-service scope. Do not provision every service with PostgreSQL.

Consumer compatibility stays deferred under the existing addendum until authoritative producer contracts exist in later product tasks. Its applicability and residual boundary must be stated in the Phase 0 exit review; this is not consumer compatibility PASS. Security findings require fresh revision-specific assessment, remediation or exact approved unexpired dispositions; no risk acceptance is implied here. The Sprint-only phase-mutation regression is IN SCOPE for Sprint 002 under acceptance 11, with tracking reference S002-LIFECYCLE-01. It must be fixed before phase-transition closeout, but does not create a fourth blueprint technical exit criterion.

The Phase 1 handoff must distinguish planning/non-deployment work from image publication/deployment/release activities and identify the applicable existing security-policy prerequisites for each. BLOCKED policy cannot be bypassed by advancing the roadmap phase. If an intended Phase 1 activity lacks an approved applicable policy route, record it as blocked; any new exception requires separate owner/security approval, not an implementation-plan assumption.

## Delivery sequencing and owner gates

After written-design approval, write a detailed plan with independently testable task boundaries: template/registry, relational skeletons, gateway variant, independent CI/security evidence integration, lifecycle/activation safeguards, complete Phase 0 exit rehearsal, and protected closeout/Phase 1 handoff. Supporting docs/config belong to the deliverable that needs them. Each task pins exact files, interfaces, RED/GREEN assertions, commands and expected results.

The plan must identify coupled CI/scanner/lifecycle changes before execution and size the sprint accordingly. Dates and capacity are owner planning inputs, not inherited automatically from Sprint 001. If estimates exceed available capacity, present the total effort, uncertainty and options to revise duration/capacity or split delivery for owner decision. Do not reduce verification gates to fit a sprint. Any split must retain CI/security coverage for artifacts introduced by each delivered increment, and the final increment must still satisfy the phase-exit goal; incomplete work is not Phase 0 completion.

Sprint activation requires approval of the written plan and an execution method. Implementation uses isolated worktrees and preserves primary edits. Publication requires protected PR checks; merge authorization remains separate. Do not change Delivery State to an active Sprint 002 while this design is awaiting review.

Closing Phase 0 requires an explicit owner review of all three blueprint exit criteria and the approved deliverables on the exact published revision: independent core-service builds, data isolation and the sample request/event trace. Five skeleton directories alone do not satisfy this gate. Prepare acceptance against a frozen candidate, publish only with separate merge authorization, then verify the actual published revision before recording the verified exit and phase transition. A follow-up bookkeeping PR may be required to record postmerge facts; the implementation plan must define this sequence without circularly demanding a commit contain its own final merge SHA.

The handoff records the accepted Phase 0 evidence, carried risks/deferred product contracts, Phase 1 entry prerequisites, proposed backlog and owner approval. Sprint 001 remains historical Phase 0 COMPLETED/PUBLISHED_VERIFIED; it is not relabeled Phase 1. Current Delivery State and Sprint Index advance consistently only after the transition gate. Phase 1 implementation belongs to a subsequent approved sprint and is not started during this closeout. Phase advancement, vulnerability disposition and release readiness remain separate decisions.

## Rollback and evidence

Keep PR17 baseline and each reviewed task commit recoverable. Roll back through reviewed reverts, never database resets or history rewrite. Preserve existing migrations and Identity runtime behavior; new technical database changes require explicit rollback limitations in their task evidence. Retain private logs/config without publishing paths, raw reports or credentials.
