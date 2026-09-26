# ADR-013: PostgreSQL Search First; OpenSearch by Evidence

- Status: APPROVED
- Date: 2026-08-05
- Owner: Product owner
- Approved by: Product Owner / Project Owner
- Blueprint reference: Sections 1, 11.2, and 19

## Context

Dedicated search infrastructure adds operational cost and consistency work.

## Decision

Use PostgreSQL FTS/trigram search first. Introduce OpenSearch only after at least two documented blueprint triggers are met.

## Consequences

Search changes require benchmark/SLO evidence, query and dataset justification, and complete reindex/index-version tooling before adoption.
