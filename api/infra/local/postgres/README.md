# Local PostgreSQL baseline

This directory provisions the ADR-016 local development and local-integration
PostgreSQL baseline. It is not AWS infrastructure and does not provision RDS.

## V1 topology reconciliation (ADR-027)

Canonical pairs are identity_db/identity_test_db, auction_db/auction_test_db,
bidding_db/bidding_test_db and billing_db/billing_test_db. Bidding uses schema
`bidding`, BIDDING_DB/BIDDING_TEST_DB environment prefixes and bidding[_test]_
owner/migrator/app roles. Billing uses the equivalent `billing` names.
The gateway has no PostgreSQL database. `scripts/LocalDbTopology.psm1` supplies
the bootstrap/verifier's shared fixed metadata; Identity/Auction are unchanged.

This source reconciliation does not migrate existing installations. If local
transaction_db/payment_db databases, their test databases or old roles exist,
STOP before bootstrap. Preserve data and obtain a separately reviewed inventory,
backup and migration decision. Do not create another four databases alongside
them, reuse old financial names, rename/drop/reset them or automatically replace
your existing .env.local. The example contains placeholders only.

Reset/drop tooling remains the historical allowlist and is NOT reconciled or
authorized by this change. Do not use the reset command below as a migration.
No real database bootstrap/isolation result is implied by metadata tests.

## Ownership model

For each relational service and its separate test database, the scripts create:

- a `*_owner` **NOLOGIN** database owner;
- a `*_migrator` login role that owns the application schema and Flyway objects;
- a `*_app` login role with runtime DML only.

Application roles do not own a database, schema, table, or Flyway history object.
`PUBLIC` receives no database or application-schema privileges. The four
development databases and four local-integration databases use distinct roles.

## Prerequisites

1. Install PostgreSQL server 17 locally and make `psql` available on `PATH`. The bootstrap validates the connected server major version, not just the client version.
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
