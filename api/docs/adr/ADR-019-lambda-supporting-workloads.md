# ADR-019: Lambda for Supporting Workloads

- Status: APPROVED
- Date: 2026-10-03
- Owner: Project Owner / Repository Owner
- Approved by: AkaDNT (Project Owner / Repository Owner)
- Approval date: 2026-10-03
- Blueprint reference: Sections 8 and 34, items 7–8
- Refines: [ADR-010](ADR-010-ecs-fargate-alb-production-runtime.md), [ADR-005](ADR-005-transaction-core-financial-ownership.md)
- Matrix: [S001-T09](../decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md)

## Context

ADR-010 chooses ECS Fargate for core services but leaves the boundary to serverless supporting workloads implicit. The blueprint gives image processing as an example. The boundary must not move canonical financial ownership out of Transaction Core.

## Proposed decision

Long-running core domain APIs and workers remain owned by independently deployable services on the approved ECS target. Lambda may be selected for bounded, event-driven supporting work—initially image validation, thumbnail generation, or similarly isolated processing—when timeout, retry, concurrency, idempotency, and cost behavior are demonstrated. Each function has a named owning service, least-privilege access, a dead-letter/failure path where needed, and a contract for its input and output. Lambda must not own canonical bid, wallet, hold, ledger, settlement, or auction lifecycle state; a supporting function requests changes through the owning service's contract.

## Alternatives

- Use ECS workers for all support tasks: fewer runtime models, possibly higher idle cost.
- Make Lambda the default for domain services: conflicts with ADR-010 and obscures transaction ownership.

## Consequences

The ECS/Lambda boundary becomes explicit without mandating Lambda deployment. A later service design must document why a workload is bounded and how retries avoid duplicate effects. This refines rather than supersedes ADR-010.

## Later implementation evidence

Phase 8 image-processing design and failure/idempotency tests, plus service deployment evidence, are required before claiming this policy implemented. No Lambda function or AWS account is claimed here.
