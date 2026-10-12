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

## Traceable S002 baseline supersession

The original 2026-08-05 decision above remains historical approval evidence. The separately owner-approved [S002 Spring remediation plan](../../../docs/superpowers/plans/2026-10-10-s002-t03-spring-remediation-phase1.md), its [execution record](../../../docs/superpowers/plans/2026-10-10-s002-t03-spring-remediation-execution.md), and protected integration through PR #21 supersede the Spring Boot 3.5.16 pin with Boot 4.0.8 and its reviewed Framework 7/Jackson 3 ecosystem. Java 21 and the approved Maven Wrapper baseline remain unchanged. This is an explicit scoped supersession, not automatic dependency drift or a rewriting of Sprint 001's historical evidence. Current exact pins and enforcement are recorded in the [build baseline](../runbooks/BUILD_VERSION_BASELINE.md); later upgrades still require their own reviewed authority and runtime/security proof.
