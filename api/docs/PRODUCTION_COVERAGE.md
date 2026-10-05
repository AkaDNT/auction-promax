# Production Coverage

Baseline assessment dated 2026-08-05; local T08 scope update accepted 2026-10-05, protected publication pending. Levels reflect verifiable repository evidence, not planned dependencies or UI prototypes. [T08 review](sprints/S001-T08_REVIEW_EVIDENCE.md) documents the exact C1 and dates; TESTED here does not imply production readiness.

| Capability | Current level | Target phase | Evidence | Remaining gap |
| ---------- | ------------- | ------------ | -------- | ------------- |
| Authentication | NONE | Phase 1 | Cognito is an approved target architecture decision; the repository has only an OAuth resource-server dependency, with no Cognito flow or tests. | Configure Cognito and prove authenticated API flow. |
| Authorization | NONE | Phase 1 | Spring Security dependency only. | Define and test role/ownership matrix. |
| Data ownership | TESTED | Phase 0 | Approved boundaries assign canonical state to each service: relational services use PostgreSQL; Realtime Gateway primarily uses Valkey; Notification Service uses approved DynamoDB workloads. On 2026-08-25, ADR-016 bootstrap converged twice, the complete local role/privilege/cross-database matrix passed 8/8, the Identity local Flyway/JPA path passed 1/1, and the canonical PostgreSQL 17 Testcontainers suite passed 5/5. | Extend the proven persistence boundary to the remaining service templates and later production infrastructure. |
| Idempotency | TESTED | Phase 0 | S001-T06 verifies key validation, digest-only persistence, stored-response replay, fingerprint conflict, concurrent duplicate safety, atomic rollback, and one outbox event using unit plus PostgreSQL 17 Testcontainers tests. | Replace the fixed Phase 0 actor scope with authenticated actor identity in Phase 1. |
| Concurrency safety | NONE | Phase 4 | No Transaction Core implementation. | Financial locking/invariant design and tests. |
| Financial invariants | NONE | Phase 4 | No Transaction Core implementation. | Wallet/hold/ledger model and reconciliation evidence. |
| API contracts | TESTED | Phase 0 | Versioned OpenAPI sample contract, governance fixtures, runtime behavior, and N/N-1 compatibility verification passed under S001-T04/T06. | Extend governed contracts only when later business capabilities are introduced. |
| Event contracts | TESTED | Phase 0 | The versioned sample event envelope/schema passes validation and is mapped by the T06 payload adapter with contract/unit evidence. | Replace local delivery with approved production transport in a later phase without changing the envelope incompatibly. |
| Observability | TESTED | Phase 0 | T03/T06 foundations plus T08 fresh C1 local HTTP/replay, correlated recorded/replayed/outbox/inbox ECS events and metrics; real MDC/ECS regression fixes duplicate correlation without changing business persistence. | Production collectors/exporters and alerting remain unproved; test-JVM duplicate metrics are not live-service observations. |
| Alerting | NONE | Phase 9 | No alarm configuration found. | Define and exercise service/queue/security alarms. |
| Backup | NONE | Phase 9 | No backup configuration or runbook found. | Backup policy and evidence. |
| Restore | NONE | Phase 9 | No restore drill or runbook found. | Restore procedure and timed drill. |
| Rollback | NONE | Phase 0 | T08 documents safe local stop/cleanup; T09 retains governed topology rollback reference. Neither proves application production rollback. | Immutable production deployment and rollback drill remain open. |
| Security scanning | TESTED | Phase 0 | T08 local canonical SBOM/dependency/secret/image trust/scan/smoke execution PASS on reviewed C1, validated seven-file evidence; T07 has separately recorded hosted evidence. | Release policy BLOCKED; findings require remediation or exact approved unexpired dispositions. No risk acceptance from Sprint closure. |
| Load testing | NONE | Phase 9 | No load-test assets found. | Launch-profile test and results. |
| Recovery testing | NONE | Phase 9 | No recovery-test assets found. | Failure, restore, DLQ-redrive drills. |
| Cost controls | BASIC | Phase 0 | Approved local, low-cost-alpha, and public-production cost assumptions plus budget-notification policy documented in `docs/decisions/PHASE_0_BASELINES.md`. | Regional pricing validation, AWS budgets, anomaly detection, and operational evidence. |
| Runbooks | TESTED | Phase 0 | [Local baseline runbook](runbooks/LOCAL_BASELINE_SPRINT_001.md) exercised on T08 C1 for builds, native PG, sample/replay/persistence/logs/metrics and scans. | Production operations/recovery/restore runbooks and drills remain open. |
| User validation | NONE | Phase 1 | UI exists, but no integrated user journey evidence. | Authenticated profile journey acceptance evidence. |
