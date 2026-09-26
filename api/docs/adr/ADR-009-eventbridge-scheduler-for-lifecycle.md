# ADR-009: EventBridge Scheduler for Auction Lifecycle Delivery

- Status: APPROVED
- Date: 2026-08-05
- Owner: Product owner
- Approved by: Product Owner / Project Owner
- Blueprint reference: Sections 1, 8, and 19

## Context

Auction start/end commands must survive restarts and tolerate duplicate, early, late, or stale delivery.

## Decision

Use EventBridge Scheduler to deliver lifecycle commands through SQS; Auction Service re-reads canonical state and server time before conditional transition.

## Consequences

Schedulers do not decide auction state. Lifecycle workers must be duplicate-safe, observable, and recoverable.
