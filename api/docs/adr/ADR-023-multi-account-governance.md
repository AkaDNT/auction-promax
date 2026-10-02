# ADR-023: Multi-Account Governance

- Status: APPROVED
- Date: 2026-10-03
- Owner: Project Owner / Repository Owner
- Approved by: AkaDNT (Project Owner / Repository Owner)
- Approval date: 2026-10-03
- Blueprint reference: Sections 12, 31 and 34, item 18
- Refines: [ADR-015](ADR-015-low-cost-private-alpha-vs-managed-production.md)
- Matrix: [S001-T09](../decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md)

## Context

The production blueprint separates application environments from security and log-archive duties. The current Phase 0 repository does not constitute AWS account provisioning or an approved account inventory.

## Proposed decision

Plan separate Dev, Staging and Production workload accounts and security/log-archive responsibilities under central governance. Production deployment roles should be distinct from human break-glass access; workforce access uses federation and least privilege. Organization guardrails and service-control policies must preserve audit, backup and incident-response paths without silently blocking recovery. Central CloudTrail/log retention and cross-account access are designed with named owners, tested access boundaries, and cost controls. Exact account layout and IDs are approved during the platform implementation phase, not invented in this ADR.

## Alternatives

- One account for all environments lowers early cost but expands blast radius and weakens production isolation.
- Separate account for every small service adds governance complexity without current evidence of benefit.

## Consequences

Cross-account deployment, logging, keys, and backups become explicit interfaces. Account vending, organization policy and access recovery need rehearsal before production; this decision does not claim they exist.

## Later implementation evidence

Phase 11 requires approved account inventory, workforce access tests, organization/guardrail review, central audit verification and recovery exercises. No account or SCP is provisioned here.
