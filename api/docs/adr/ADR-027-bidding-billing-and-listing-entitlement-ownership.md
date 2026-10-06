# ADR-027: Bidding, Platform Billing and Listing-Entitlement Ownership

- Status: APPROVED
- Decision date: 2026-10-05
- Approved by: Project Owner (explicit V1 architecture-amendment instruction recorded as [BD-008](../decisions/BUSINESS_DECISIONS.md))
- Blueprint reference: [Sections 4–5, 11 and 33](../Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md)
- Supersedes: Service list and ownership examples in [ADR-001](ADR-001-coarse-grained-microservices-first.md), [ADR-005](ADR-005-transaction-core-financial-ownership.md) and [ADR-016](ADR-016-postgresql-owner-migrator-runtime-role-model.md), without changing their coarse-grained architecture or database-role principles; retains general idempotency from [ADR-012](ADR-012-idempotency-and-immutable-ledger.md)
- Depends on: [ADR-026](ADR-026-marketplace-transaction-and-monetization-boundary.md)

## Context

The V1 boundary removes monetary auction settlement but still needs strict local bid, publication and platform-purchase consistency. Phase 0 must lock service identities before template generation.

## Decision

The canonical core set is `identity-profile-service`, `auction-service`, `bidding-service`, `billing-service` and `realtime-gateway`. The relational database/test pairs are `identity_db`/`identity_test_db`, `auction_db`/`auction_test_db`, `bidding_db`/`bidding_test_db` and `billing_db`/`billing_test_db`; the gateway has no PostgreSQL database.

`bidding-service` owns bid placement/history, current price/winner, bidding-session state, minimum increment, bid idempotency/concurrency and final bid consistency. It owns no wallet, monetary hold, financial ledger, settlement or auction-item payment.

`billing-service` owns only purchases of Auction ProMax's own listing service: listing-package catalogue, PurchaseOrder, licensed PSP adapter, provider-payment state, signed webhook/replay protection and provider reconciliation. It proves the platform service was paid for and later emits an integration signal for entitlement grant; the exact event name is deferred to its contract. It never owns auction-item payment, seller payout, user monetary wallet, escrow or auction settlement.

`auction-service` owns auction drafts/publication/lifecycle, categories/media metadata, seller ownership, final AuctionResult and usable listing allowance/entitlement state. The authorization question is whether this seller may consume a listing entitlement and publish this auction. Consumption and publication must commit in one local `auction_db` transaction; a synchronous billing authorization call cannot own that invariant. A verified billing purchase is consumed idempotently as a grant signal, not as money in Auction.

`identity-profile-service` owns application roles, profile, seller eligibility/restrictions while Cognito owns credentials. `realtime-gateway` owns WebSocket authentication, subscriptions, fanout and reconnect support with ephemeral Valkey state only; it never owns canonical bids.

## Consequences

Phase 0 templates and service-aware CI/security use these exact IDs and database boundaries. Later integration uses transactional outbox, at-least-once delivery and idempotent consumers. A failed purchase/grant cannot make Billing authoritative for auction publication; Auction's canonical entitlement state remains the local guard. No distributed transaction or monetary entitlement model is introduced.

This decision does not grant Sprint activation, PR merge or product implementation.

## Later implementation evidence

Later phases must prove bid/close concurrency, atomic publication/consumption, webhook replay safety and exactly one entitlement-grant business effect. This ADR is decision-only evidence.
