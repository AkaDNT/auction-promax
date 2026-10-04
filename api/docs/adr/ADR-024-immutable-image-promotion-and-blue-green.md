# ADR-024: Immutable Image Promotion and Blue/Green

- Status: APPROVED
- Date: 2026-10-03
- Owner: Project Owner / Repository Owner
- Approved by: AkaDNT (Project Owner / Repository Owner)
- Approval date: 2026-10-03
- Blueprint reference: Sections 22 and 34, item 19
- Refines: [ADR-010](ADR-010-ecs-fargate-alb-production-runtime.md), [ADR-015](ADR-015-low-cost-private-alpha-vs-managed-production.md)
- Matrix: [S001-T09](../decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md)

## Context

The blueprint calls for promoting the same immutable image digest across environments and a guarded blue/green production rollout. Phase 0 supply-chain execution integrity can pass while release policy is BLOCKED; that is not deployment authorization.

## Proposed decision

Build once, record an immutable image digest and provenance, then promote that same digest through Dev, Staging and Production; never rebuild solely for Production. Each service deploys independently. Production rollout uses blue/green traffic shifting with health checks, observability thresholds and automatic/manual rollback paths. Database changes use expand-contract compatibility and are not reversed merely because application traffic rolls back. A Production deployment requires a separate release-policy PASS; execution-integrity PASS alone is insufficient. A change to that requirement would need its own approved policy decision, not an implicit exception in this ADR.

## Alternatives

- Rebuild per environment: risks different binaries under the same release label.
- In-place production update: simpler but narrows traffic rollback options.

## Consequences

Digest retention, compatibility windows and pre/post-deployment observation add operational work. Rollback restores application traffic, not canonical financial records or ledger entries.

## Later implementation evidence

Phase 10 requires signed-off pipeline/IaC design, immutable digest equality across stages, migration compatibility tests, failure/alarm rollback rehearsal and policy gate evidence. No ECR publishing, CodeDeploy rollout, signing or deployment is claimed here.
