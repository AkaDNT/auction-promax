# ADR-025: Backup, Restore and Fault Testing

- Status: APPROVED
- Date: 2026-10-03
- Owner: Project Owner / Repository Owner
- Approved by: AkaDNT (Project Owner / Repository Owner)
- Approval date: 2026-10-03
- Blueprint reference: Sections 24–25 and 34, item 20
- Refines: [ADR-004](ADR-004-postgresql-database-ownership.md), [ADR-006](ADR-006-dynamodb-approved-projections-only.md), [ADR-007](ADR-007-valkey-is-ephemeral.md), [ADR-015](ADR-015-low-cost-private-alpha-vs-managed-production.md)
- Matrix: [S001-T09](../decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md)

## Context

Backup success is not restore success. The blueprint assigns recovery targets to canonical databases, media and rebuildable projections, and requires failure testing. Current Phase 0 local tests do not demonstrate production recovery.

## Proposed decision

Each canonical datastore has a named restore owner, backup/PITR policy, retention and isolation choice, and tested recovery procedure. Production target RPO/RTO follows the blueprint: Transaction, Auction and Payment databases at most 5 minutes RPO/60 minutes RTO; Identity database at most 15 minutes RPO/60 minutes RTO. DynamoDB projections are rebuildable with a 4-hour full-rebuild target; Valkey is ephemeral and recovered from authoritative state. Media requires durable versioned objects and service-restoration testing. Validate recovery time and data correctness by periodic isolated restores, not dashboard backup status alone. Fault exercises cover duplicate/out-of-order events, DLQ redrive, worker/Lambda failure, database failover, bad config and failed deployment, with safe blast-radius controls.

## Alternatives

- Backup reports without restore rehearsal: cannot prove usable data or meet recovery targets.
- Treat cache/projections as authoritative backups: conflicts with ADR-006/007 and risks corrupt recovery.

## Consequences

Restore drills and controlled fault tests cost time and infrastructure; targets may require redesign if tests fail. No destructive shared-environment experiment is authorized by approving this decision alone.

## Later implementation evidence

Phase 12 requires backup policy read-back, point-in-time and cross-account restore exercises, measured RPO/RTO, integrity checks and approved fault-test results. No AWS Backup job, restore, or FIS experiment is claimed here.
