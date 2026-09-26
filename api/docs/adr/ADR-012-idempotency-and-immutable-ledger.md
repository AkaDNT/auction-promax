# ADR-012: Idempotency and Immutable Financial Ledger

- Status: APPROVED
- Date: 2026-08-05
- Owner: Product owner
- Approved by: Product Owner / Project Owner
- Blueprint reference: Sections 2, 7, 10.3, and 19

## Context

Retries, duplicate commands, events, and webhooks must not create duplicate financial or terminal effects.

## Decision

Require idempotency keys for external financial/terminal commands and immutable append-only ledger records. Corrections are compensating entries.

## Consequences

Commands store/replay deterministic results; consumers deduplicate effects. Financial features require concurrency, reconciliation, and duplicate-delivery tests.
