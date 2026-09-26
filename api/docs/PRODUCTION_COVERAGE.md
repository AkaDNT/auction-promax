# Production Coverage

Baseline assessment dated 2026-08-05. Levels reflect verifiable repository evidence, not planned dependencies or UI prototypes.

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
| Observability | TESTED | Phase 0 | S001-T03 proves health/readiness, RFC 9457, W3C trace/correlation propagation, ECS logs, and HTTP metrics. S001-T06 adds safe command/outbox/relay/inbox linkage and replay, state, attempt, processed, failed, and duplicate metrics with canonical/local execution evidence. | Production collector/exporter deployment and alerting remain later-phase work. |
| Alerting | NONE | Phase 9 | No alarm configuration found. | Define and exercise service/queue/security alarms. |
| Backup | NONE | Phase 9 | No backup configuration or runbook found. | Backup policy and evidence. |
| Restore | NONE | Phase 9 | No restore drill or runbook found. | Restore procedure and timed drill. |
| Rollback | NONE | Phase 0 | No deployment pipeline or rollback procedure found. | Immutable deployment/rollback process. |
| Security scanning | BASIC | Phase 0 | CycloneDX plugin configured in one service only. | CI dependency/image scans and finding policy. |
| Load testing | NONE | Phase 9 | No load-test assets found. | Launch-profile test and results. |
| Recovery testing | NONE | Phase 9 | No recovery-test assets found. | Failure, restore, DLQ-redrive drills. |
| Cost controls | BASIC | Phase 0 | Approved local, low-cost-alpha, and public-production cost assumptions plus budget-notification policy documented in `docs/decisions/PHASE_0_BASELINES.md`. | Regional pricing validation, AWS budgets, anomaly detection, and operational evidence. |
| Runbooks | NONE | Phase 0 | No runbooks found. | Local operations and recovery runbooks. |
| User validation | NONE | Phase 1 | UI exists, but no integrated user journey evidence. | Authenticated profile journey acceptance evidence. |
