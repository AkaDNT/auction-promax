# ADR-005: Transaction Core Owns Bids, Wallets, Holds, Ledger, and Settlement

- Status: APPROVED
- Date: 2026-08-05
- Owner: Product owner
- Approved by: Product Owner / Project Owner
- Blueprint reference: Sections 3.1, 3.2, 7, and 19

## Context

Bids, winning state, wallet balances, holds, ledger entries, and settlement require shared atomic invariants.

## Decision

Keep these responsibilities in `transaction-core-service`; do not split them during normal delivery.

## Consequences

Financial correctness is designed and proven through local transactions, constraints, locking, idempotency, immutable ledger records, and reconciliation before bid endpoints are exposed.
