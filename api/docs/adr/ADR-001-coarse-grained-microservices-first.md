# ADR-001: Coarse-Grained Microservices-First Architecture

- Status: APPROVED
- Date: 2026-08-05
- Owner: Product owner
- Approved by: Product Owner / Project Owner
- Blueprint reference: Sections 1, 3.1, and 19

## Context

The platform needs independently deployable ownership boundaries without prematurely splitting closely coupled financial invariants.

## Decision

Use the six coarse-grained services named in blueprint section 3.1: Identity/Profile, Auction, Transaction Core, Payment, Realtime Gateway, and Notification. Each service owns its canonical state; its canonical storage follows its approved boundary rather than assuming PostgreSQL for every service.

## Consequences

Identity, Auction, Transaction Core, and Payment own PostgreSQL canonical stores; Realtime Gateway primarily uses ephemeral Valkey state; Notification Service owns its approved DynamoDB workloads. Cross-service integration uses versioned HTTP contracts or events; no service may access another service database.
