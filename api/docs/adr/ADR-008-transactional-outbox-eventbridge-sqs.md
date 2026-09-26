# ADR-008: Transactional Outbox with EventBridge and Per-Consumer SQS/DLQ

- Status: APPROVED
- Date: 2026-08-05
- Owner: Product owner
- Approved by: Product Owner / Project Owner
- Blueprint reference: Sections 1, 2, 5.3, 10.3, and 19

## Context

Database commits and event publication must avoid uncontrolled dual writes and tolerate at-least-once delivery.

## Decision

Persist integration events in a transactional outbox; relay to EventBridge; route each consumer through its own SQS queue and DLQ. Consumers persist inbox receipts/effects transactionally.

## Consequences

Delivery is at-least-once. Producers and consumers require stable envelopes, retry behavior, idempotency, DLQ-redrive controls, and operational age/failure signals.
