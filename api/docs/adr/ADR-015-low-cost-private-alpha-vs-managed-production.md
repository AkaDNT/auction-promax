# ADR-015: Low-Cost Private Alpha versus Managed Public Production

- Status: APPROVED
- Date: 2026-08-05
- Owner: Product owner
- Approved by: Product Owner / Project Owner
- Blueprint reference: Sections 5, 5.3, 16, and 19

## Context

The project needs affordable early delivery while preserving a safe migration path to public production.

## Decision

Use a production-shaped, low-cost single-host EC2/container topology for development, demonstration, and limited private alpha; use the managed ECS/RDS/ElastiCache/WAF topology for public production.

## Consequences

The low-cost topology accepts downtime and shared-host failure and must never be represented as HA production. Domain contracts and migrations must permit later infrastructure migration without a domain rewrite.
