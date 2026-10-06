# ADR-026: V1 Marketplace Transaction and Monetization Boundary

- Status: APPROVED
- Decision date: 2026-10-05
- Approved by: Project Owner (explicit V1 architecture-amendment instruction recorded as [BD-008](../decisions/BUSINESS_DECISIONS.md))
- Blueprint reference: [Sections 1, 4, 33–35](../Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md)
- Supersedes: Financial-domain scope of [ADR-005](ADR-005-transaction-core-financial-ownership.md) and the financial-ledger requirement of [ADR-012](ADR-012-idempotency-and-immutable-ledger.md). Historical financial examples/targets in ADR-006, ADR-019, ADR-020, ADR-021, ADR-024 and ADR-025 are not current V1 product scope; their general DynamoDB, Lambda, orchestration, configuration, deployment and recovery principles remain. No historical record is rewritten.

## Context

The earlier blueprint assumed platform-controlled auction-item payment, monetary wallets, holds and settlement. The Project Owner's V1 decision changes that product boundary before Sprint 002 activation and before a new service registry is generated. Sprint 001 approvals and execution evidence remain historical facts, not current authority for obsolete financial capabilities.

## Decision

Auction ProMax V1 enables seller auction creation, buyer bidding, final winner determination and authorized result handoff. Buyer and seller complete auctioned-goods payment and delivery outside Auction ProMax. V1 revenue is advertising and paid listing packages for the platform's own service. An initial free listing allowance and purchased listing entitlements permit auction publication. Entitlements are non-monetary rights: non-withdrawable, non-transferable between users, not stored value, not usable to purchase auctioned goods and not a seller payout balance.

V1 excludes transaction commission, auction-item payment through the platform, escrow, seller payout, stored monetary wallet, deposit, withdrawal, financial holds, financial settlement, money transfer between users and platform-controlled delivery. Future introduction requires a new explicit architecture decision and legal/compliance review. Initial advertising may use a third-party ad network/client integration later; a dedicated backend is evidence-triggered, not a Phase 0 service.

## Consequences

The five-service Phase 0 foundation has four relational services and one database-free gateway, but does not implement product bidding/billing. The canonical roadmap replaces financial phases 4–6 with concurrent bidding, winner handoff, and platform listing-package billing. Existing ADR-005/012 and the Sprint 001 matrix remain intact as historical approval evidence. General idempotency and append-only audit principles continue where applicable; obsolete financial ledger obligations do not.

This decision does not grant Sprint 002 activation, PR merge, Phase 0 exit, Phase 1 implementation or risk disposition.

## Later implementation evidence

Product behavior belongs to later roadmap phases and requires its own contracts, tests, security and legal/compliance gates. No runtime capability or payment-provider integration is claimed by this ADR.
