# Business Decisions

## Status Key

`PROPOSED` requires product-owner approval before it becomes binding. `APPROVED` decisions outrank plans and code.

| ID | Decision | Status | Source / rationale | Owner | Date |
| -- | -------- | ------ | ------------------ | ----- | ---- |
| BD-001 | Use the approved blueprint as architecture and roadmap source of truth. | APPROVED | User instruction; blueprint priority rules. | Product owner | 2026-08-05 |
| BD-002 | Start delivery at Phase 0 / R0 despite existing UI and a service skeleton. | APPROVED | No objective Phase 0 exit-gate evidence exists. | Product owner | 2026-08-05 |
| BD-003 | Sprint duration and effective capacity are two weeks and 45–50 hours for one developer. | APPROVED | User instruction. | Product owner | 2026-08-05 |
| BD-004 | ADR-001 through ADR-015 and Phase 0 baselines are approved; significant architecture changes require a new ADR or traceable supersession. | APPROVED | S001-T01 product-owner approval; [Phase 0 baselines](PHASE_0_BASELINES.md). | Product Owner / Project Owner | 2026-08-05 |
| BD-005 | Relational services use separate NOLOGIN database owner, login-only Flyway migrator, and least-privilege runtime application roles; local integration and canonical container verification use separate test credentials/databases. | APPROVED | Product Owner instruction; [ADR-016](../adr/ADR-016-postgresql-owner-migrator-runtime-role-model.md). | Product Owner / Project Owner | 2026-08-05 |
| BD-006 | Use GitHub Actions for repository verification and Amazon ECR for future container images. API and web retain separate baseline workflows. | APPROVED | Product Owner instruction; build baseline runbook. | Product Owner / Project Owner | 2026-08-11 |
| BD-007 | Adopt `OPTION_A_MONOREPO` as the target repository topology while retaining independent API/web build, test, and deployment boundaries. Keep `api/contracts/` canonical during initial migration; require path-aware CI with stable required aggregate checks and web consumer compatibility validation. | APPROVED | [ADR-017](../adr/ADR-017-repository-topology-and-contract-governance.md); Blueprint §33 Phase 0. Migration and independent-build evidence remain open under D-005. | AkaDNT (Project Owner / Repository Owner) | 2026-09-24 |
| BD-008 | V1 buyer/seller auction-item payment and delivery occur outside Auction ProMax; revenue is advertising and paid non-monetary listing entitlements. Canonical contexts are Identity, Auction, Bidding, Platform Billing and Realtime; obsolete financial features are excluded. This approves the business boundary and architecture amendment only, not Sprint activation or merge. | APPROVED | Explicit Project Owner V1 architecture-amendment instruction dated 2026-10-05; [ADR-026](../adr/ADR-026-marketplace-transaction-and-monetization-boundary.md), [ADR-027](../adr/ADR-027-bidding-billing-and-listing-entitlement-ownership.md). | Project Owner | 2026-10-05 |

BD-003 is the historical Sprint 001 planning baseline, not a cap on the separately approved Sprint 002 execution envelope. The [Sprint 002 owner execution decision](../../../docs/superpowers/plans/2026-10-05-s002-phase0-exit-and-service-foundation.md#owner-execution-decision) authorizes 72–114 engineering hours plus 14–22 reserve over at most four engineering weeks, with post-T03 re-estimation. Neither decision grants Sprint 002 activation or merge authorization.
