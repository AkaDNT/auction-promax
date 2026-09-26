# ADR-007: Valkey Is Ephemeral, Not Canonical Truth

- Status: APPROVED
- Date: 2026-08-05
- Owner: Product owner
- Approved by: Product Owner / Project Owner
- Blueprint reference: Sections 1, 3.1, 5, and 19

## Context

Realtime fanout, presence, cache, and rate limits need low-latency ephemeral coordination.

## Decision

Use Valkey/Redis only for ephemeral realtime and cache workloads.

## Consequences

Loss of Valkey state must not corrupt or decide terminal business state. Clients recover from authoritative snapshots and PostgreSQL remains canonical.
