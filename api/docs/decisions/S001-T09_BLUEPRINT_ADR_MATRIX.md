# S001-T09 Blueprint Decision Traceability Matrix

**Scope:** Trace the 20 mandatory subjects in [Blueprint §34](../Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md#34-mandatory-adrs) to the repository's approved architecture decisions.

**Interpretation:** `COVERED` means an approved record makes a sufficiently binding decision for the named §34 subject. It does not mean the decision is implemented. `PARTIAL` means an approved record covers only part of the subject and an explicit delta remains. `GAP` means this matrix found no sufficiently binding approved ADR; a draft can exist without closing the gap. Every implementation state below is deliberately `DECISION_ONLY`: this task validates decision traceability, not implementation delivery.

The phase column is the target roadmap phase from Blueprint §33, not evidence that the phase has run. The proof column identifies remaining implementation or decision evidence. Existing ADR-001 through ADR-016 remain unchanged historical decisions.

## Blueprint section 34 mapping

| # | Blueprint requirement | Coverage | Approved ADR reference(s) | Decision status | Implementation phase | Implementation state | Implementation evidence / proof obligation | Delta owner |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Coarse-grained microservices-first architecture. | COVERED | [ADR-001](../adr/ADR-001-coarse-grained-microservices-first.md) | APPROVED | Phase 0 | DECISION_ONLY | ADR-001 defines six coarse-grained services and service-owned canonical state. Independent builds and runtime boundaries require separate phase-gate evidence. | — |
| 2 | Java 21 + Spring Boot baseline. | COVERED | [ADR-002](../adr/ADR-002-java-21-spring-boot-baseline.md) | APPROVED | Phase 0 | DECISION_ONLY | ADR-002 binds Java 21, Spring Boot 3.5.16, Spring MVC and Maven Wrapper. Build/version enforcement evidence is maintained under the relevant sprint gates. | — |
| 3 | Hexagonal architecture inside services. | COVERED | [ADR-018](../adr/ADR-018-hexagonal-service-boundaries.md) | APPROVED | Phase 0 | DECISION_ONLY | ADR-018 binds dependency direction and architecture-test obligations; service implementation evidence remains future work. | — |
| 4 | Cognito owns credentials; app owns business roles. | COVERED | [ADR-003](../adr/ADR-003-cognito-and-application-profile.md) | APPROVED | Phase 1 | DECISION_ONLY | ADR-003 separates Cognito credential/token lifecycle from application-owned profile and business roles. Phase 1 authorization and identity-mapping tests remain proof obligations. | — |
| 5 | PostgreSQL ownership per bounded context. | COVERED | [ADR-004](../adr/ADR-004-postgresql-database-ownership.md), [ADR-016](../adr/ADR-016-postgresql-owner-migrator-runtime-role-model.md) | APPROVED | Phase 1 | DECISION_ONLY | ADR-004 sets per-service canonical PostgreSQL ownership; ADR-016 refines owner, migrator, runtime, and test roles. Per-service isolation and privilege tests are implementation evidence, not supplied by these decisions. | — |
| 6 | Transaction Core owns bid/wallet/hold/ledger/settlement. | COVERED | [ADR-005](../adr/ADR-005-transaction-core-financial-ownership.md) | APPROVED | Phase 4 | DECISION_ONLY | ADR-005 keeps the named financial responsibilities in Transaction Core. Concurrency, idempotency, ledger immutability, and reconciliation proofs remain required before financial endpoints. | — |
| 7 | ECS for core long-running domain services. | COVERED | [ADR-010](../adr/ADR-010-ecs-fargate-alb-production-runtime.md), [ADR-019](../adr/ADR-019-lambda-supporting-workloads.md) | APPROVED | Phase 1 | DECISION_ONLY | ADR-010 selects ECS Fargate and ADR-019 binds the core-service versus supporting-Lambda boundary; no deployment is claimed. | — |
| 8 | Lambda only for approved supporting workloads. | COVERED | [ADR-019](../adr/ADR-019-lambda-supporting-workloads.md) | APPROVED | Phase 8 | DECISION_ONLY | ADR-019 bounds eligible workloads and prohibits canonical financial ownership; no deployed Lambda is claimed. | — |
| 9 | DynamoDB only for projection/inbox/TTL workloads. | COVERED | [ADR-006](../adr/ADR-006-dynamodb-approved-projections-only.md) | APPROVED | Phase 8 | DECISION_ONLY | ADR-006 limits DynamoDB to approved notification inbox, public projection, realtime metadata, and TTL-heavy receipt use. Projection rebuild/freshness evidence remains required. | — |
| 10 | Valkey is ephemeral, never financial truth. | COVERED | [ADR-007](../adr/ADR-007-valkey-is-ephemeral.md) | APPROVED | Phase 7 | DECISION_ONLY | ADR-007 restricts Valkey/Redis to ephemeral realtime/cache workloads. Recovery from loss must use authoritative snapshots; no operational test is claimed here. | — |
| 11 | Transactional outbox + EventBridge + SQS. | COVERED | [ADR-008](../adr/ADR-008-transactional-outbox-eventbridge-sqs.md) | APPROVED | Phase 4 | DECISION_ONLY | ADR-008 binds outbox relay, per-consumer SQS/DLQ, inbox receipts, and at-least-once/idempotent processing. End-to-end delivery and recovery tests remain required. | — |
| 12 | EventBridge Scheduler for auction lifecycle. | COVERED | [ADR-009](../adr/ADR-009-eventbridge-scheduler-for-lifecycle.md) | APPROVED | Phase 3 | DECISION_ONLY | ADR-009 makes Scheduler a delivery mechanism; Auction Service re-reads canonical state and server time before transition. Duplicate/late/early-delivery tests remain required. | — |
| 13 | Step Functions only for long-running orchestration. | COVERED | [ADR-020](../adr/ADR-020-step-functions-orchestration-criteria.md) | APPROVED | Phase 6 | DECISION_ONLY | ADR-020 requires explicit orchestration value and excludes bid placement; no workflow is claimed. | — |
| 14 | AppConfig for dynamic configuration/feature rollout. | COVERED | [ADR-021](../adr/ADR-021-appconfig-rollout-policy.md) | APPROVED | Phase 9 | DECISION_ONLY | ADR-021 binds validation, progressive rollout and alarm rollback; no AppConfig deployment is claimed. | — |
| 15 | KMS/security baseline. | COVERED | [ADR-022](../adr/ADR-022-kms-security-baseline.md) | APPROVED | Phase 1 | DECISION_ONLY | ADR-022 binds key ownership, least privilege, audit and recovery; no key or account is claimed. | — |
| 16 | PostgreSQL search first; OpenSearch trigger. | COVERED | [ADR-013](../adr/ADR-013-postgresql-search-before-opensearch.md) | APPROVED | Phase 2 | DECISION_ONLY | ADR-013 selects PostgreSQL FTS/trigram first and requires at least two documented triggers before OpenSearch. Benchmarks and reindex evidence remain required before adoption. | — |
| 17 | EventBridge/SQS first; MSK trigger. | COVERED | [ADR-014](../adr/ADR-014-eventbridge-sqs-before-msk.md) | APPROVED | Phase 4 | DECISION_ONLY | ADR-014 selects EventBridge/SQS first and names replay, ordering, throughput, retention, or multi-consumer needs as MSK triggers. No MSK adoption is implied. | — |
| 18 | Multi-account production governance. | COVERED | [ADR-023](../adr/ADR-023-multi-account-governance.md) | APPROVED | Phase 11 | DECISION_ONLY | ADR-023 assigns account-governance duties; no account is provisioned. | — |
| 19 | Immutable deployment digest and blue/green production rollout. | COVERED | [ADR-024](../adr/ADR-024-immutable-image-promotion-and-blue-green.md) | APPROVED | Phase 10 | DECISION_ONLY | ADR-024 binds digest promotion and protected rollout; no deployment is claimed. | — |
| 20 | Backup/restore and fault-testing policy. | COVERED | [ADR-025](../adr/ADR-025-backup-restore-and-fault-testing.md) | APPROVED | Phase 12 | DECISION_ONLY | ADR-025 binds backup and measured restore/fault-test proof; no restore drill is claimed. | — |

## Repository-topology checkpoint (separate from the 20 subjects)

[Blueprint §33](../Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md#33-roadmap) Phase 0 requires a monorepo. The current project baseline records API and web as separate repositories and identifies `api/contracts/` as the current contract registry; that current arrangement is not, by itself, an approved exception to the blueprint. The owner approved `OPTION_A_MONOREPO` on 2026-09-24; [ADR-017](../adr/ADR-017-repository-topology-and-contract-governance.md) and BD-007 in [Business Decisions](BUSINESS_DECISIONS.md) record the decision. Migration, independent-build evidence, and the Phase 0 topology gate remain open under D-005. This section is not a 21st matrix row.

**Implementation update, 2026-10-03:** The historical baseline above predates the reviewed snapshot migration. The public monorepo now has API and web in one repository with independent clean-checkout builds, a protected `migration/monorepo` default, stable required checks, and locked bootstrap `main` for rollback. Web product-endpoint compatibility is `DEFERRED_NO_PRODUCER_CONTRACT` under the [Phase 0 addendum](../../../docs/superpowers/specs/2026-09-27-s001-t09-phase0-consumer-gate-addendum.md), not a PASS. After the owner accepted the complete amended exit evidence, D-005 is RESOLVED for topology; the composite Phase 0 gate and unrelated decision gaps remain separate. This update does not alter the 20-row decision-coverage counts.

## Decision review summary

- `COVERED`: 20 subjects. Each has an approved primary decision reference; item 7 uses ADR-010 and the ADR-019 refinement together.
- `PARTIAL`: 0 subjects.
- `GAP`: 0 subjects.
- ADR-018 through ADR-025 were individually approved by AkaDNT (Project Owner / Repository Owner) on 2026-10-03. Their approval is decision evidence, not implementation evidence.
- This matrix does not claim AWS provisioning, deployment, multi-account controls, KMS keys, AppConfig rollout, backup/restore, or fault-injection execution.

## Task 1 execution log

**Date:** 2026-09-24
**Scope:** S001-T09 Task 1 only; no topology option or new ADR was approved.

- Reviewed Blueprint §34 against ADR-001 through ADR-016 and confirmed each existing record carries `Status: APPROVED`.
- Ran the test before creating this matrix. Expected RED: the existing ADR checks passed and the gate failed with `MATRIX_MISSING` because the canonical matrix did not yet exist.
- Added the 20-row trace, direct relative ADR links, coverage/decision/implementation separation, eight planned delta references, and separate §33 topology checkpoint.
- The first GREEN attempt exposed that row 20 was missing its ADR-reference cell (`COLUMN_COUNT_20`). Corrected the table row and reran the complete test.
- Final command: `node .\scripts\decisions\Test-S001-T09-Decisions.mjs` — exit code `0`; all 29 reported checks passed, including 16 approved-ADR checks, canonical matrix/topology checks, and 11 negative fixtures (missing/duplicate/reordered/extra rows, broken link, invalid values, missing approved decision/owner, false delivery claim, and PROPOSED-ADR rejection).
- Coverage result: 11 `COVERED`, 1 `PARTIAL` (item 7; ADR-010 plus the planned ADR-019 ECS/Lambda boundary), and 8 `GAP` (items 3, 8, 13, 14, 15, 18, 19, 20).
- Implementation remains explicitly `DECISION_ONLY`; this matrix is not evidence of AWS provisioning, deployment, or completion of later roadmap phases.

This log records Task 1 evidence only; it does not close S001-T09 or authorize Task 2 decisions.
