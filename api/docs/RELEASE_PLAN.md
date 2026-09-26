# Release Plan

| Release | Audience | Roadmap phases | Outcome | Status |
| ------- | -------- | -------------- | ------- | ------ |
| R0 — Engineering Baseline | Developers and operators | Phase 0 | Reproducible engineering foundation, contracts, local data isolation, observability, outbox/inbox proof, and scans | ACTIVE |
| R1 — Identity Walking Skeleton | Internal testers | Phase 1 | Cognito-authenticated user can manage an application profile | PLANNED |
| R2 — Seller Auction Walking Skeleton | Internal sellers and viewers | Phases 2–3 | Seller auction creation, media, publication, and durable lifecycle | PLANNED |
| R3 — Bidding Walking Skeleton | Internal buyers and sellers | Phases 4–5 | Safe bid, hold, winner, and settlement workflow | PLANNED |
| R4 — Payment Sandbox | Internal testers | Phase 6 | Signed, idempotent sandbox payment workflows | PLANNED |
| R5 — Realtime User Experience | Internal and invited users | Phases 7–8 (minimum) | Committed updates and basic notifications | PLANNED |
| R6 — Private Alpha | Invited real users | Phase 9 | Usable, observable, recoverable low-cost AWS deployment | PLANNED |
| R7 — Public Production | Public users | Phase 10 | Managed AWS production topology and evidence | PLANNED |
| R8 — Evidence-Based Growth | Growing production users | Phase 11 | Trigger-led scaling capabilities | PLANNED |

## R0 Exit Evidence

- Every approved service template builds independently from a clean checkout.
- Versioned OpenAPI, event, and realtime-contract compatibility checks run in CI.
- Local PostgreSQL uses isolated logical databases/users and rejects cross-database access by design.
- A sample request and event traverse health/readiness, tracing, Problem Details, idempotency, outbox, and inbox skeletons.
- SBOM, dependency, and image scans execute with High/Critical findings surfaced.
