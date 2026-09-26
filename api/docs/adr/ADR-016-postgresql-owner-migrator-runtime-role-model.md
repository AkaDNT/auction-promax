# ADR-016: PostgreSQL Owner, Migrator, and Runtime Application Role Model

- Status: APPROVED
- Date: 2026-08-05
- Owner: Product Owner / Project Owner
- Approved by: Product Owner / Project Owner
- Blueprint reference: Sections 1, 2 (P-01, P-03), 3.1, 6.1, 12, 14, 16, and 19
- Refines: ADR-004

## Context

PostgreSQL ownership confers object-altering powers that cannot be removed through ordinary grants. A role that owns a database or schema is not a least-privilege runtime application role. The initial local bootstrap simplification used one login role for ownership, Flyway, and runtime access; that does not meet the approved production privilege baseline.

## Decision

Each relational service uses separate, non-member roles:

| Role | LOGIN | Ownership / purpose |
| ---- | ----- | ------------------- |
| `<service>_owner` | NOLOGIN | Owns the database only. |
| `<service>_migrator` | LOGIN | Owns the dedicated application schema and Flyway-created objects; used only by controlled migration execution. |
| `<service>_app` | LOGIN | Runtime DML only; owns no database, schema, table, sequence, or Flyway history object. |
| `<service>_readonly` | Optional LOGIN | Explicit reporting/operator read access only when approved. |

The Identity/Profile, Auction, Transaction Core, and Payment services use dedicated database/schema/role mappings. Local integration tests use separate test databases and separate owner/migrator/runtime roles. Realtime Gateway and Notification Service do not receive PostgreSQL roles merely for uniformity.

All service roles are `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, `NOBYPASSRLS`, and `NOINHERIT`; they have no cross-service membership. `PUBLIC` receives no database or application-schema privilege. Runtime application roles do not receive `TEMPORARY`, DDL, or schema `CREATE` by default.

Flyway receives its own datasource credentials. Production migration runs as a controlled one-off deployment step; runtime service containers never receive migrator credentials.

## Consequences

- Bootstrap scripts must create database, schema, role, ownership, direct grants, and default privileges convergently.
- Local development is a scripted fast path; Testcontainers is the canonical clean-environment verification path for CI and pre-deploy checks.
- Runtime DML privileges must be explicitly granted after existing migrations and as default privileges for future migrator-created objects.
- Financial tables require narrower permissions than the generic DML baseline; later Transaction Core migrations must revoke update/delete/truncate from immutable ledger/audit records.
- The local bootstrap and verifier must never pass passwords on command lines or print them in logs.
