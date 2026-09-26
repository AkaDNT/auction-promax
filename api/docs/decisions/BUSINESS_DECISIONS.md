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
