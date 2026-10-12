# Sprint 002 isolated local PostgreSQL cluster

- Status: APPROVED by the Project Owner in this session on 2026-10-12.
- Reference: OWNER-DECISION-2026-10-12-S002-ISOLATED-POSTGRES.
- Scope: Local engineering verification only; no cloud or production deployment.

The existing native PostgreSQL cluster contains `transaction_db`, `transaction_test_db`, `payment_db`, `payment_test_db` and their twelve historical roles. Read-only metadata inventory found no non-system tables in these four databases, but this is not authorization to delete them or a complete backup. The [local topology runbook](../../infra/local/postgres/README.md) prohibits automatically replacing that installation with the revised topology.

The owner selected preserving that cluster and creating a separate PostgreSQL 17 cluster for Identity/Auction/Bidding/Billing. The new instance binds only `127.0.0.1:55432`, uses SCRAM-SHA-256 and separate locally generated credentials in ignored configuration. Gateway has no database. The primary checkout's original configuration, legacy databases, roles and data remain intact.

The installed native executable is PostgreSQL 17.9. It provides supplementary local evidence only; canonical integration tests still use the committed PostgreSQL 17.11 digest through Testcontainers. Do not equate native 17.9 execution with the pinned-container proof or alter its pin.

Execution created the new dedicated data directory, initialized and started it, then ran the approved convergent bootstrap twice. Both runs passed the complete eight-database ownership/default-deny/explicit-DML/DDL-denial/cross-database matrix; the status read-back reported eight databases and 24 least-privilege roles. Exact commands and private log references are in the [completion log](../../../docs/superpowers/plans/2026-10-12-s002-phase0-completion-log.md).

This decision does not authorize migrating, renaming, resetting or dropping the old cluster. Stop only the verified new instance using its dedicated data directory when maintenance requires it; retain the data and ignored configuration for diagnosis. No Windows service registration or production availability claim is made.
