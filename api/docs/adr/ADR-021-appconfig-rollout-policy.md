# ADR-021: AppConfig Rollout Policy

- Status: APPROVED
- Date: 2026-10-03
- Owner: Project Owner / Repository Owner
- Approved by: AkaDNT (Project Owner / Repository Owner)
- Approval date: 2026-10-03
- Blueprint reference: Sections 10, 23 and 34, item 14
- Refines: [ADR-012](ADR-012-idempotency-and-immutable-ledger.md), [ADR-015](ADR-015-low-cost-private-alpha-vs-managed-production.md)
- Matrix: [S001-T09](../decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md)

## Context

The blueprint selects AppConfig for runtime configuration and gradual feature rollout, while reserving canonical business records for domain-owned stores. A dynamic flag must not silently change authorization or financial correctness.

## Proposed decision

Use versioned, environment-specific AppConfig configurations for operational switches and controlled feature exposure. Validate syntax and business-safe ranges before deployment; use a progressive strategy, monitored alarms, and rollback to the prior validated version. Each flag has an owner, default, expiry/review date, and documented failure behavior. Secrets belong in Secrets Manager, not AppConfig. Authorization, ledger, payment and bid invariants are enforced in code/domain policy even when a feature is disabled or rolled back.

## Alternatives

- Static deployment configuration is simpler for infrequent changes but requires a release for operational toggles.
- Store all rules in AppConfig: rejected because canonical auditable business rules and secrets have different ownership.

## Consequences

Rollout adds monitoring and configuration-governance work. Missing validation or alarm evidence blocks production use of a flag. This proposal does not override the release policy.

## Later implementation evidence

Phase 9 requires config schemas, rollout and rollback tests, alarm wiring, version history, and a bad-deployment exercise. No AppConfig application or environment is claimed here.
