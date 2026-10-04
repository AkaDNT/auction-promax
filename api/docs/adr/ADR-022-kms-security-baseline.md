# ADR-022: KMS and Security Baseline

- Status: APPROVED
- Date: 2026-10-03
- Owner: Project Owner / Repository Owner
- Approved by: AkaDNT (Project Owner / Repository Owner)
- Approval date: 2026-10-03
- Blueprint reference: Sections 12 and 34, item 15
- Refines: [ADR-015](ADR-015-low-cost-private-alpha-vs-managed-production.md), [ADR-016](ADR-016-postgresql-owner-migrator-runtime-role-model.md)
- Matrix: [S001-T09](../decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md)

## Context

The blueprint requires encryption and managed security controls, but the current repository has no approved per-resource key ownership policy or provisioned production accounts. Key policy, IAM permission, recovery and audit have to be designed together.

## Proposed decision

Classify data stores, queues, secrets, logs, and backup vaults before selecting service-managed or customer-managed keys; use customer-managed keys when control, cross-account access, or audit requirements justify their operational burden. Name a key owner and recovery operator for each key class. Grant only required operations to named workload roles and service principals, constrain grants with resource and encryption context where supported, and review key policy plus IAM policy together. Define rotation, audit, deletion protection, break-glass access, and restoration procedures before production use. Never place key material or credentials in Git.

## Alternatives

- AWS-owned/service-managed keys reduce management but may not satisfy cross-account or dedicated access needs.
- One shared customer-managed key is operationally simple but enlarges blast radius and access coupling.

## Consequences

Customer-managed keys require lifecycle, incident and availability ownership. This ADR does not invent key ARNs, account IDs, retention periods or compliance claims; those require environment design and approval.

## Later implementation evidence

Phase 1+ needs threat-model review, IaC policy tests, key-access denial tests, audit visibility, rotation and recovery drills. No KMS key or security service deployment is claimed here.
