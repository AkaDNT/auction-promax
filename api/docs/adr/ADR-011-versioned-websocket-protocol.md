# ADR-011: Native Versioned WebSocket Protocol and Snapshot Recovery

- Status: APPROVED
- Date: 2026-08-05
- Owner: Product owner
- Approved by: Product Owner / Project Owner
- Blueprint reference: Sections 9.3, 11.3, and 19

## Context

Clients need committed auction updates while tolerating dropped, duplicate, or out-of-order realtime messages.

## Decision

Use a native, versioned WebSocket protocol with authenticated subscriptions, sequence-aware messages, and authoritative snapshot recovery.

## Consequences

Realtime delivery is never part of a bid commit. Protocol compatibility and reconnect/resequence tests are required before Phase 7 exits.
