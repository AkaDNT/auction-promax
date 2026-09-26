# ADR-006: DynamoDB Only for Approved Projection and TTL Workloads

- Status: APPROVED
- Date: 2026-08-05
- Owner: Product owner
- Approved by: Product Owner / Project Owner
- Blueprint reference: Sections 1, 6.2, and 19

## Context

High-churn or read-optimized access patterns differ from canonical financial transactions.

## Decision

Use DynamoDB only for approved notification inboxes, public read projections, optional realtime connection metadata, and TTL-heavy replay receipts.

## Consequences

DynamoDB cannot be the sole authority for bids, wallets, holds, ledger, winning state, or settlement. Projection rebuild and freshness evidence are required when it is introduced.
