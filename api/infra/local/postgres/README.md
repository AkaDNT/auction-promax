# Local PostgreSQL baseline

This directory provisions the ADR-016 local development and local-integration
PostgreSQL baseline. It is not AWS infrastructure and does not provision RDS.

## Ownership model

For each relational service and its separate test database, the scripts create:

- a `*_owner` **NOLOGIN** database owner;
- a `*_migrator` login role that owns the application schema and Flyway objects;
- a `*_app` login role with runtime DML only.

Application roles do not own a database, schema, table, or Flyway history object.
`PUBLIC` receives no database or application-schema privileges. The four
development databases and four local-integration databases use distinct roles.

## Prerequisites

1. Install PostgreSQL 16 or 17 locally and make `psql` available on `PATH`.
2. Copy `api/.env.local.example` to `api/.env.local`.
3. Replace every `replace-me` password in `.env.local`. Do not commit that file.

The bootstrap script validates the approved database, schema, and role names.
Passwords are supplied to `psql` only through the process environment or
standard input; they are never passed with `-v`, a command-line argument, or
printed by the scripts.

## Commands

Run from `api/`:

```powershell
.\scripts\local-db-bootstrap.ps1
.\scripts\local-db-status.ps1
.\scripts\local-db-verify.ps1
```

`local-db-bootstrap.ps1` is idempotent and invokes verification after it has
converged roles, databases, schemas, grants, and default privileges. It is not
atomic across PostgreSQL databases: if it fails, correct the reported cause and
run it again. Existing roles/databases are inspected and converged rather than
silently skipped.

To remove only local integration-test databases (not development databases and
not roles), use the explicit acknowledgement:

```powershell
.\scripts\local-db-reset.ps1 -IUnderstandThisDeletesLocalTestDatabases
```

Re-run bootstrap after reset. Never point these scripts at a shared, alpha, or
production PostgreSQL instance.

## Verification coverage

`local-db-verify.ps1` checks role attributes and membership, database owner and
`PUBLIC` grants, schema ownership/rights, migrator DDL, runtime DML, runtime DDL
denial, and cross-database connection denial for development and test roles.
`verify-isolation.sql` provides safe administrator queries for manual diagnosis.

## Scope boundary

Local daily development uses its local database. `mvn -Pit-local verify` uses a
separate local test database. Canonical `mvn verify` is reserved for the clean
Testcontainers path; no command silently swaps one backend for another.
