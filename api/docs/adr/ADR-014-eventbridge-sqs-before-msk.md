# ADR-014: EventBridge/SQS First; MSK by Evidence

- Status: APPROVED
- Date: 2026-08-05
- Owner: Product owner
- Approved by: Product Owner / Project Owner
- Blueprint reference: Sections 1, 11.1, and 19

## Context

The initial platform needs durable asynchronous integration without the operational cost of a streaming cluster.

## Decision

Use EventBridge and SQS first. Introduce MSK only when documented replay, ordering, throughput, retention, or multi-consumer needs meet blueprint triggers.

## Consequences

Event contracts remain stable and consumers idempotent. A future MSK proposal requires partition/replay semantics and operational ownership evidence.
