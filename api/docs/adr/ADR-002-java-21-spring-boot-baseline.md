# ADR-002: Java 21 and Spring Boot 3.5.x Exact-Version Baseline

- Status: APPROVED
- Date: 2026-08-05
- Owner: Product owner
- Approved by: Product Owner / Project Owner
- Blueprint reference: Section 1 and Section 19

## Context

Reproducible service builds require a consistent runtime and framework baseline.

## Decision

Use Java 21 LTS, Spring Boot 3.5.16, Spring MVC, virtual threads where appropriate, and Maven Wrapper. Repository-wide version verification and enforcement are delivered by S001-T02.

## Consequences

Unsupported JDK/framework combinations fail the build baseline. Upgrades are deliberate ADR changes, not unreviewed dependency drift.
