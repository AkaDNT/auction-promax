# ADR-018: Hexagonal Service Boundaries

- Status: APPROVED
- Date: 2026-10-03
- Owner: Project Owner / Repository Owner
- Approved by: AkaDNT (Project Owner / Repository Owner)
- Approval date: 2026-10-03
- Blueprint reference: Sections 17 and 34, item 3
- Refines: [ADR-001](ADR-001-coarse-grained-microservices-first.md), [ADR-002](ADR-002-java-21-spring-boot-baseline.md)
- Matrix: [S001-T09](../decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md)

## Context

The blueprint names hexagonal architecture inside each coarse-grained service. Existing decisions define service ownership and the Java/Spring baseline, but do not bind dependency direction within a service. This decision concerns future service design, not a claim that every current module already meets it.

## Proposed decision

Domain rules and application use cases depend on inward-facing ports and domain types. REST, persistence, messaging, identity-provider, and configuration integrations implement adapters around those ports. Framework and AWS SDK types must not leak into domain policy. Each service owns its port contracts and adapter tests; architecture tests should fail on forbidden inward dependencies. A team may introduce a simpler module layout for a small service only with a documented exception preserving the same dependency direction.

## Alternatives

- Direct framework-centric layers reduce initial files but can couple business rules to transport and persistence.
- A shared cross-service domain library appears economical but blurs the independent ownership approved in ADR-001.

## Consequences

Service boundaries become testable without live AWS infrastructure. More ports and mapping code add maintenance cost; architecture tests must check actual imports rather than directory names alone. This refines, but does not supersede, ADR-001 or ADR-002.

## Later implementation evidence

Phase 0/1 service templates need dependency-rule tests, focused domain tests, and adapter integration tests from a clean checkout. No production-wide compliance or refactor is claimed by this proposal.
