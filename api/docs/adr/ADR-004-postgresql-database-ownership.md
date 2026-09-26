# ADR-004: PostgreSQL Database Ownership Per Service

- Status: APPROVED
- Date: 2026-08-05
- Owner: Product owner
- Approved by: Product Owner / Project Owner
- Blueprint reference: Sections 1, 3.1, 6.1, and 19

## Context

Atomic business invariants need a canonical relational store, while service boundaries must prohibit hidden coupling.

## Decision

Use PostgreSQL as canonical transactional storage with one logical database, least-privilege user, and Flyway history per relational service.

## Consequences

No cross-database foreign keys, views, triggers, joins, reads, or writes are permitted. Cross-service consistency uses events or APIs.

ADR-016 refines the role, schema, migration, runtime-privilege, and test-environment model used to implement this decision.
