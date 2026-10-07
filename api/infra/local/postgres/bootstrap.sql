-- Production-grade local PostgreSQL bootstrap baseline for ADR-016.
--
-- Scope:
--   * Local developer PostgreSQL and local integration-test PostgreSQL only.
--   * AWS/RDS infrastructure remains managed by CDK and controlled deployment jobs.
--   * Flyway migrations own tables, indexes, constraints, and object-level grants.
--
-- Invocation contract:
--   * Invoke psql with -X and an administrator connection to the `postgres` database.
--   * The wrapper validates all identifier variables against:
--       ^[a-z][a-z0-9_]{0,62}$
--   * Identifier values may be passed using psql -v.
--   * Passwords must NOT be command-line arguments. The wrapper writes:
--       \set ECHO none
--       \set <password_variable> '<base64-value>'
--       \ir '<absolute-path-to-this-file>'
--     to psql standard input.
--   * Base64 is transport encoding, not encryption.
--   * Server-side statement/audit logging can still capture password-bearing
--     CREATE ROLE or ALTER ROLE statements. Run this only against an approved
--     local cluster whose logging policy is safe for secret-bearing DDL.
--
-- Required psql variables for each target:
--   <target>_name
--   <target>_schema
--   <target>_owner
--   <target>_migrator_username
--   <target>_migrator_password_b64
--   <target>_app_username
--   <target>_app_password_b64
--
-- Targets:
--   identity_db, identity_test_db,
--   auction_db, auction_test_db,
--   bidding_db, bidding_test_db,
--   billing_db, billing_test_db
--
-- This script is convergent but intentionally non-atomic because CREATE DATABASE
-- cannot execute inside a transaction. A failed run may leave partial local
-- state; correct the cause and run the script again.

\set ON_ERROR_STOP on
\set ECHO none
\pset pager off

SELECT pg_advisory_lock(
  hashtext('auction-promax:adr-016:local-postgresql-bootstrap')::bigint
) AS bootstrap_lock_acquired
\gset

SET password_encryption = 'scram-sha-256';

CREATE TEMP TABLE bootstrap_targets (
  database_name text PRIMARY KEY
    CHECK (
      database_name ~ '^[a-z][a-z0-9_]{0,62}$'
      AND database_name !~ '^pg_'
      AND database_name NOT IN ('postgres', 'template0', 'template1')
    ),
  schema_name text NOT NULL
    CHECK (
      schema_name ~ '^[a-z][a-z0-9_]{0,62}$'
      AND schema_name !~ '^pg_'
      AND schema_name NOT IN ('public', 'information_schema')
    ),
  owner_role text NOT NULL
    CHECK (
      owner_role ~ '^[a-z][a-z0-9_]{0,62}$'
      AND owner_role !~ '^pg_'
      AND owner_role NOT IN ('postgres', 'public')
    ),
  migrator_role text NOT NULL
    CHECK (
      migrator_role ~ '^[a-z][a-z0-9_]{0,62}$'
      AND migrator_role !~ '^pg_'
      AND migrator_role NOT IN ('postgres', 'public')
    ),
  migrator_password text NOT NULL
    CHECK (char_length(migrator_password) >= 8 AND octet_length(migrator_password) <= 256),
  app_role text NOT NULL
    CHECK (
      app_role ~ '^[a-z][a-z0-9_]{0,62}$'
      AND app_role !~ '^pg_'
      AND app_role NOT IN ('postgres', 'public')
    ),
  app_password text NOT NULL
    CHECK (char_length(app_password) >= 8 AND octet_length(app_password) <= 256),
  CHECK (owner_role <> migrator_role),
  CHECK (owner_role <> app_role),
  CHECK (migrator_role <> app_role)
);

INSERT INTO bootstrap_targets (
  database_name,
  schema_name,
  owner_role,
  migrator_role,
  migrator_password,
  app_role,
  app_password
)
VALUES
  (:'identity_db_name', :'identity_db_schema', :'identity_db_owner', :'identity_db_migrator_username', convert_from(decode(:'identity_db_migrator_password_b64', 'base64'), 'UTF8'), :'identity_db_app_username', convert_from(decode(:'identity_db_app_password_b64', 'base64'), 'UTF8')),
  (:'identity_test_db_name', :'identity_test_db_schema', :'identity_test_db_owner', :'identity_test_db_migrator_username', convert_from(decode(:'identity_test_db_migrator_password_b64', 'base64'), 'UTF8'), :'identity_test_db_app_username', convert_from(decode(:'identity_test_db_app_password_b64', 'base64'), 'UTF8')),
  (:'auction_db_name', :'auction_db_schema', :'auction_db_owner', :'auction_db_migrator_username', convert_from(decode(:'auction_db_migrator_password_b64', 'base64'), 'UTF8'), :'auction_db_app_username', convert_from(decode(:'auction_db_app_password_b64', 'base64'), 'UTF8')),
  (:'auction_test_db_name', :'auction_test_db_schema', :'auction_test_db_owner', :'auction_test_db_migrator_username', convert_from(decode(:'auction_test_db_migrator_password_b64', 'base64'), 'UTF8'), :'auction_test_db_app_username', convert_from(decode(:'auction_test_db_app_password_b64', 'base64'), 'UTF8')),
  (:'bidding_db_name', :'bidding_db_schema', :'bidding_db_owner', :'bidding_db_migrator_username', convert_from(decode(:'bidding_db_migrator_password_b64', 'base64'), 'UTF8'), :'bidding_db_app_username', convert_from(decode(:'bidding_db_app_password_b64', 'base64'), 'UTF8')),
  (:'bidding_test_db_name', :'bidding_test_db_schema', :'bidding_test_db_owner', :'bidding_test_db_migrator_username', convert_from(decode(:'bidding_test_db_migrator_password_b64', 'base64'), 'UTF8'), :'bidding_test_db_app_username', convert_from(decode(:'bidding_test_db_app_password_b64', 'base64'), 'UTF8')),
  (:'billing_db_name', :'billing_db_schema', :'billing_db_owner', :'billing_db_migrator_username', convert_from(decode(:'billing_db_migrator_password_b64', 'base64'), 'UTF8'), :'billing_db_app_username', convert_from(decode(:'billing_db_app_password_b64', 'base64'), 'UTF8')),
  (:'billing_test_db_name', :'billing_test_db_schema', :'billing_test_db_owner', :'billing_test_db_migrator_username', convert_from(decode(:'billing_test_db_migrator_password_b64', 'base64'), 'UTF8'), :'billing_test_db_app_username', convert_from(decode(:'billing_test_db_app_password_b64', 'base64'), 'UTF8'));

WITH managed_roles AS (
  SELECT owner_role AS role_name FROM bootstrap_targets
  UNION ALL
  SELECT migrator_role FROM bootstrap_targets
  UNION ALL
  SELECT app_role FROM bootstrap_targets
)
SELECT count(*) <> count(DISTINCT role_name) AS duplicate_managed_role
FROM managed_roles
\gset

\if :duplicate_managed_role
  \echo 'ERROR: every owner, migrator, and application role must be globally unique'
  \quit 3
\endif


-- NOLOGIN database owners.
SELECT format(
  'CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT -1 PASSWORD NULL',
  owner_role
)
FROM bootstrap_targets target
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles role_catalog
  WHERE role_catalog.rolname = target.owner_role
)
ORDER BY owner_role
\gexec

SELECT format(
  'ALTER ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT -1 PASSWORD NULL',
  owner_role
)
FROM bootstrap_targets
ORDER BY owner_role
\gexec

-- Flyway migrators. Local connection limit only; production requires a measured budget.
SELECT format(
  'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 5 VALID UNTIL %L PASSWORD %L',
  migrator_role,
  'infinity',
  migrator_password
)
FROM bootstrap_targets target
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles role_catalog
  WHERE role_catalog.rolname = target.migrator_role
)
ORDER BY migrator_role
\gexec

SELECT format(
  'ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 5 VALID UNTIL %L PASSWORD %L',
  migrator_role,
  'infinity',
  migrator_password
)
FROM bootstrap_targets
ORDER BY migrator_role
\gexec

-- Runtime application roles.
SELECT format(
  'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 20 VALID UNTIL %L PASSWORD %L',
  app_role,
  'infinity',
  app_password
)
FROM bootstrap_targets target
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles role_catalog
  WHERE role_catalog.rolname = target.app_role
)
ORDER BY app_role
\gexec

SELECT format(
  'ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 20 VALID UNTIL %L PASSWORD %L',
  app_role,
  'infinity',
  app_password
)
FROM bootstrap_targets
ORDER BY app_role
\gexec

-- Remove stale global role configuration.
WITH managed_roles AS (
  SELECT owner_role AS role_name FROM bootstrap_targets
  UNION
  SELECT migrator_role FROM bootstrap_targets
  UNION
  SELECT app_role FROM bootstrap_targets
)
SELECT format('ALTER ROLE %I RESET ALL', role_name)
FROM managed_roles
ORDER BY role_name
\gexec

-- Remove stale database-specific role configuration from existing databases.
WITH managed_roles AS (
  SELECT owner_role AS role_name FROM bootstrap_targets
  UNION
  SELECT migrator_role FROM bootstrap_targets
  UNION
  SELECT app_role FROM bootstrap_targets
)
SELECT format(
  'ALTER ROLE %I IN DATABASE %I RESET ALL',
  role_catalog.rolname,
  database_catalog.datname
)
FROM pg_db_role_setting role_setting
JOIN pg_roles role_catalog ON role_catalog.oid = role_setting.setrole
JOIN pg_database database_catalog ON database_catalog.oid = role_setting.setdatabase
JOIN managed_roles ON managed_roles.role_name = role_catalog.rolname
WHERE role_setting.setrole <> 0
  AND role_setting.setdatabase <> 0
ORDER BY role_catalog.rolname, database_catalog.datname
\gexec

-- Managed roles must not participate in role memberships.
WITH managed_roles AS (
  SELECT owner_role AS role_name FROM bootstrap_targets
  UNION
  SELECT migrator_role FROM bootstrap_targets
  UNION
  SELECT app_role FROM bootstrap_targets
)
SELECT EXISTS (
  SELECT 1
  FROM pg_auth_members membership
  JOIN pg_roles granted_role ON granted_role.oid = membership.roleid
  JOIN pg_roles member_role ON member_role.oid = membership.member
  WHERE granted_role.rolname IN (SELECT role_name FROM managed_roles)
     OR member_role.rolname IN (SELECT role_name FROM managed_roles)
) AS forbidden_role_membership
\gset

\if :forbidden_role_membership
  \echo 'ERROR: managed roles must not participate in role memberships'
  \quit 4
\endif

-- Databases.
SELECT format(
  'CREATE DATABASE %I OWNER %I TEMPLATE template0 ENCODING %L',
  database_name,
  owner_role,
  'UTF8'
)
FROM bootstrap_targets target
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database database_catalog
  WHERE database_catalog.datname = target.database_name
)
ORDER BY database_name
\gexec

SELECT format('ALTER DATABASE %I OWNER TO %I', database_name, owner_role)
FROM bootstrap_targets
ORDER BY database_name
\gexec

SELECT format('ALTER DATABASE %I ALLOW_CONNECTIONS true CONNECTION LIMIT -1', database_name)
FROM bootstrap_targets
ORDER BY database_name
\gexec

SELECT EXISTS (
  SELECT 1
  FROM bootstrap_targets target
  JOIN pg_database database_catalog
    ON database_catalog.datname = target.database_name
  WHERE pg_encoding_to_char(database_catalog.encoding) <> 'UTF8'
     OR pg_get_userbyid(database_catalog.datdba) <> target.owner_role
     OR NOT database_catalog.datallowconn
) AS invalid_database_baseline
\gset

\if :invalid_database_baseline
  \echo 'ERROR: a target database has invalid owner, encoding, or connection state'
  \quit 5
\endif

-- Remove default PUBLIC access.
SELECT format('REVOKE ALL PRIVILEGES ON DATABASE %I FROM PUBLIC', database_name)
FROM bootstrap_targets
ORDER BY database_name
\gexec

-- Remove all managed-role database grants except inherent privileges of each DB owner.
WITH managed_roles AS (
  SELECT owner_role AS role_name FROM bootstrap_targets
  UNION
  SELECT migrator_role FROM bootstrap_targets
  UNION
  SELECT app_role FROM bootstrap_targets
)
SELECT format(
  'REVOKE ALL PRIVILEGES ON DATABASE %I FROM %I',
  target.database_name,
  managed_roles.role_name
)
FROM bootstrap_targets target
CROSS JOIN managed_roles
WHERE managed_roles.role_name <> target.owner_role
ORDER BY target.database_name, managed_roles.role_name
\gexec

SELECT format(
  'GRANT CONNECT ON DATABASE %I TO %I, %I',
  database_name,
  migrator_role,
  app_role
)
FROM bootstrap_targets
ORDER BY database_name
\gexec

-- Fail on unexpected explicit DB ACLs or excess migrator/app privileges.
WITH expanded_acl AS (
  SELECT
    target.database_name,
    target.owner_role,
    target.migrator_role,
    target.app_role,
    acl_entry.grantee,
    acl_entry.privilege_type,
    grantee_role.rolname AS grantee_role_name
  FROM bootstrap_targets target
  JOIN pg_database database_catalog
    ON database_catalog.datname = target.database_name
  CROSS JOIN LATERAL aclexplode(
    COALESCE(database_catalog.datacl, acldefault('d', database_catalog.datdba))
  ) acl_entry
  LEFT JOIN pg_roles grantee_role
    ON grantee_role.oid = acl_entry.grantee
)
SELECT EXISTS (
  SELECT 1
  FROM expanded_acl
  WHERE grantee = 0
     OR grantee_role_name NOT IN (owner_role, migrator_role, app_role)
     OR (
       grantee_role_name IN (migrator_role, app_role)
       AND privilege_type <> 'CONNECT'
     )
) AS unexpected_database_acl
\gset

\if :unexpected_database_acl
  \echo 'ERROR: a target database contains an unexpected explicit ACL'
  \quit 6
\endif

-- Plaintext passwords are no longer needed after role reconciliation.
DROP TABLE bootstrap_targets;

\unset identity_db_migrator_password_b64
\unset identity_db_app_password_b64
\unset identity_test_db_migrator_password_b64
\unset identity_test_db_app_password_b64
\unset auction_db_migrator_password_b64
\unset auction_db_app_password_b64
\unset auction_test_db_migrator_password_b64
\unset auction_test_db_app_password_b64
\unset bidding_db_migrator_password_b64
\unset bidding_db_app_password_b64
\unset bidding_test_db_migrator_password_b64
\unset bidding_test_db_app_password_b64
\unset billing_db_migrator_password_b64
\unset billing_db_app_password_b64
\unset billing_test_db_migrator_password_b64
\unset billing_test_db_app_password_b64

RESET password_encryption;

SELECT pg_advisory_unlock(
  hashtext('auction-promax:adr-016:local-postgresql-bootstrap')::bigint
) AS bootstrap_lock_released
\gset

\if :bootstrap_lock_released
\else
  \echo 'ERROR: failed to release PostgreSQL bootstrap advisory lock'
  \quit 7
\endif
\unset bootstrap_lock_released

-- Per-database schema baseline.
\set active_database_name :identity_db_name
\set active_schema_name :identity_db_schema
\set active_owner_role :identity_db_owner
\set active_migrator_role :identity_db_migrator_username
\set active_app_role :identity_db_app_username
\connect :identity_db_name
\ir bootstrap-schema.sql

\set active_database_name :identity_test_db_name
\set active_schema_name :identity_test_db_schema
\set active_owner_role :identity_test_db_owner
\set active_migrator_role :identity_test_db_migrator_username
\set active_app_role :identity_test_db_app_username
\connect :identity_test_db_name
\ir bootstrap-schema.sql

\set active_database_name :auction_db_name
\set active_schema_name :auction_db_schema
\set active_owner_role :auction_db_owner
\set active_migrator_role :auction_db_migrator_username
\set active_app_role :auction_db_app_username
\connect :auction_db_name
\ir bootstrap-schema.sql

\set active_database_name :auction_test_db_name
\set active_schema_name :auction_test_db_schema
\set active_owner_role :auction_test_db_owner
\set active_migrator_role :auction_test_db_migrator_username
\set active_app_role :auction_test_db_app_username
\connect :auction_test_db_name
\ir bootstrap-schema.sql

\set active_database_name :bidding_db_name
\set active_schema_name :bidding_db_schema
\set active_owner_role :bidding_db_owner
\set active_migrator_role :bidding_db_migrator_username
\set active_app_role :bidding_db_app_username
\connect :bidding_db_name
\ir bootstrap-schema.sql

\set active_database_name :bidding_test_db_name
\set active_schema_name :bidding_test_db_schema
\set active_owner_role :bidding_test_db_owner
\set active_migrator_role :bidding_test_db_migrator_username
\set active_app_role :bidding_test_db_app_username
\connect :bidding_test_db_name
\ir bootstrap-schema.sql

\set active_database_name :billing_db_name
\set active_schema_name :billing_db_schema
\set active_owner_role :billing_db_owner
\set active_migrator_role :billing_db_migrator_username
\set active_app_role :billing_db_app_username
\connect :billing_db_name
\ir bootstrap-schema.sql

\set active_database_name :billing_test_db_name
\set active_schema_name :billing_test_db_schema
\set active_owner_role :billing_test_db_owner
\set active_migrator_role :billing_test_db_migrator_username
\set active_app_role :billing_test_db_app_username
\connect :billing_test_db_name
\ir bootstrap-schema.sql

\connect postgres

\unset active_database_name
\unset active_schema_name
\unset active_owner_role
\unset active_migrator_role
\unset active_app_role
