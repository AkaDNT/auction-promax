# ADR-020: Step Functions Orchestration Criteria

- Status: APPROVED
- Date: 2026-10-03
- Owner: Project Owner / Repository Owner
- Approved by: AkaDNT (Project Owner / Repository Owner)
- Approval date: 2026-10-03
- Blueprint reference: Sections 9 and 34, item 13
- Refines: [ADR-005](ADR-005-transaction-core-financial-ownership.md), [ADR-008](ADR-008-transactional-outbox-eventbridge-sqs.md), [ADR-012](ADR-012-idempotency-and-immutable-ledger.md)
- Matrix: [S001-T09](../decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md)

## Context

The blueprint proposes withdrawal and reconciliation as possible long-running workflows. It forbids Step Functions for bid placement. Existing event and financial decisions do not yet define when orchestration is preferable to service-owned state machines.

## Proposed decision

Adopt Step Functions only after a workflow design shows material value from explicit multi-step state, bounded retry, wait/callback, compensation, or operational audit. Withdrawal and reconciliation are candidates, not automatically approved deployments. The owning domain service retains canonical business and financial state in its database; workflow execution history is not the ledger. Every external effect must be idempotent, every timeout and compensation path specified, and a human-review path defined for ambiguous provider outcomes. Bid placement and hot auction transitions remain outside Step Functions.

## Alternatives

- Orchestrate inside a service with an outbox: preferable for short, tightly transactional flows.
- Use Step Functions for every asynchronous event: adds workflow state and cost without demonstrated benefit.

## Consequences

Later proposals must compare workflow types, duration, retry semantics, observability, and recovery against the service-local alternative. No financial invariant is weakened by an orchestration engine.

## Later implementation evidence

Phase 6 designs must include duplicate delivery, timeout, callback, compensation, reconciliation, and owner-approved failure tests before deployment. No workflow or provider integration exists by virtue of this ADR.
