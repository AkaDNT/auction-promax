# ADR-010: ECS Fargate and ALB Production Runtime

- Status: APPROVED
- Date: 2026-08-05
- Owner: Product owner
- Approved by: Product Owner / Project Owner
- Blueprint reference: Sections 1, 4, 5.3, and 19

## Context

Public production requires managed compute, ingress, private service communication, and controlled deployments.

## Decision

Use AWS CDK v2 TypeScript, ECS Fargate, ALB, CloudFront, WAF, ECS Service Connect, RDS PostgreSQL, and ElastiCache for the managed public-production target topology. This is an approved target decision, not an implementation claim for Sprint 001.

## Consequences

Services must remain stateless, externally configured, health-checked, and graceful on termination. The lower-cost topology is not HA production.
