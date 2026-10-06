# Release Plan

| Release | Audience | Roadmap phases | Outcome | Status |
| ------- | -------- | -------------- | ------- | ------ |
| R0 — Engineering Baseline | Developers and operators | Phase 0 | Reproducible engineering foundation, contracts, local data isolation, observability, outbox/inbox proof, and scans | ACTIVE |
| R1 — Identity Walking Skeleton | Internal testers | Phase 1 | Cognito-authenticated user can manage an application profile | PLANNED |
| R2 — Seller Auction Walking Skeleton | Internal sellers and viewers | Phases 2–3 | Seller auction creation, media, non-monetary listing entitlement/publication and durable lifecycle | PLANNED |
| R3 — Bidding and Winner Handoff | Internal buyers and sellers | Phases 4–5 | Concurrent bids, deterministic final winner/result and authorized handoff; auction-item payment/delivery remain outside platform | PLANNED |
| R4 — Platform Listing Billing Sandbox | Internal testers | Phase 6 | Signed, idempotent licensed-PSP purchase of platform listing packages and event-driven non-monetary entitlement grant | PLANNED |
| R5 — Realtime User Experience | Internal and invited users | Phases 7–8 (minimum) | Committed updates and basic notifications | PLANNED |
| R6 — Private Alpha | Invited real users | Phase 9 | Usable, observable, recoverable low-cost AWS deployment | PLANNED |
| R7 — Public Production | Public users | Phase 10 | Managed AWS production topology and evidence | PLANNED |
| R8 — Evidence-Based Growth | Growing production users | Phase 11 | Trigger-led scaling capabilities | PLANNED |

## R0 Exit Evidence

V1 release outcomes follow the [revised blueprint](Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md) and ADR-026/027. Advertising is an evidence-triggered later integration, not a Phase 0 service. This plan does not authorize any release or Sprint 002 activation.

- Every approved service template builds independently from a clean checkout.
- Versioned OpenAPI, event, and realtime-contract compatibility checks run in CI.
- Local PostgreSQL uses isolated logical databases/users and rejects cross-database access by design.
- A sample request and event traverse health/readiness, tracing, Problem Details, idempotency, outbox, and inbox skeletons.
- SBOM, dependency, and image scans execute with High/Critical findings surfaced.
