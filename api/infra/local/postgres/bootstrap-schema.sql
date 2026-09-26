-- Included by bootstrap.sql after connecting as the bootstrap administrator to
-- exactly one managed database.
--
-- Required psql variables:
--   active_database_name
--   active_schema_name
--   active_owner_role
--   active_migrator_role
--   active_app_role
--
-- Ownership model:
--   database owner  -> NOLOGIN and owns the database/public schema
--   migrator        -> owns the application schema and Flyway-created objects
--   application     -> runtime LOGIN role; owns no database/schema/object
--
-- Object-level privileges are intentionally default-deny. Each Flyway migration
-- must explicitly grant the runtime role only the privileges required by the
-- objects introduced in that migration. This prevents accidental runtime access
-- to flyway_schema_history, immutable ledger tables, audit tables, routines, and
-- future objects.

\set ON_ERROR_STOP on
\set ECHO none
\pset pager off

SELECT current_database() = :'active_database_name'
  AS connected_to_expected_database
\gset

\if :connected_to_expected_database
\else
  \echo 'ERROR: bootstrap-schema.sql is connected to the wrong database'
  \quit 20
\endif
\unset connected_to_expected_database

SELECT pg_advisory_lock(
  hashtext(
    'auction-promax:adr-016:schema-bootstrap:' || current_database()
  )::bigint
) AS schema_lock_acquired
\gset

SELECT count(*) = 3 AS active_roles_exist
FROM pg_roles
WHERE rolname IN (
  :'active_owner_role',
  :'active_migrator_role',
  :'active_app_role'
)
\gset

\if :active_roles_exist
\else
  \echo 'ERROR: one or more active database roles do not exist'
  \quit 21
\endif
\unset active_roles_exist

-- Harden public schema.
SELECT format('ALTER SCHEMA public OWNER TO %I', :'active_owner_role')
\gexec

SELECT format(
  'REVOKE ALL PRIVILEGES ON SCHEMA public FROM PUBLIC, %I, %I',
  :'active_migrator_role',
  :'active_app_role'
)
\gexec

-- Dedicated application schema.
SELECT format(
  'CREATE SCHEMA %I AUTHORIZATION %I',
  :'active_schema_name',
  :'active_migrator_role'
)
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_namespace
  WHERE nspname = :'active_schema_name'
)
\gexec

SELECT format(
  'ALTER SCHEMA %I OWNER TO %I',
  :'active_schema_name',
  :'active_migrator_role'
)
\gexec

SELECT format(
  'REVOKE ALL PRIVILEGES ON SCHEMA %I FROM PUBLIC, %I, %I',
  :'active_schema_name',
  :'active_migrator_role',
  :'active_app_role'
)
\gexec

SELECT format(
  'GRANT USAGE, CREATE ON SCHEMA %I TO %I',
  :'active_schema_name',
  :'active_migrator_role'
)
\gexec

SELECT format(
  'GRANT USAGE ON SCHEMA %I TO %I',
  :'active_schema_name',
  :'active_app_role'
)
\gexec

-- Fail on unexpected object ownership instead of silently reassigning objects.
WITH unexpected_owner AS (
  SELECT
    'relation' AS object_kind,
    relation_catalog.relname AS object_name,
    pg_get_userbyid(relation_catalog.relowner) AS actual_owner
  FROM pg_class relation_catalog
  JOIN pg_namespace namespace_catalog
    ON namespace_catalog.oid = relation_catalog.relnamespace
  WHERE namespace_catalog.nspname = :'active_schema_name'
    AND relation_catalog.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
    AND pg_get_userbyid(relation_catalog.relowner) <> :'active_migrator_role'

  UNION ALL

  SELECT
    'routine',
    routine_catalog.proname,
    pg_get_userbyid(routine_catalog.proowner)
  FROM pg_proc routine_catalog
  JOIN pg_namespace namespace_catalog
    ON namespace_catalog.oid = routine_catalog.pronamespace
  WHERE namespace_catalog.nspname = :'active_schema_name'
    AND pg_get_userbyid(routine_catalog.proowner) <> :'active_migrator_role'

  UNION ALL

  SELECT
    'type',
    type_catalog.typname,
    pg_get_userbyid(type_catalog.typowner)
  FROM pg_type type_catalog
  JOIN pg_namespace namespace_catalog
    ON namespace_catalog.oid = type_catalog.typnamespace
  WHERE namespace_catalog.nspname = :'active_schema_name'
    AND pg_get_userbyid(type_catalog.typowner) <> :'active_migrator_role'
)
SELECT EXISTS (
  SELECT 1 FROM unexpected_owner
) AS unexpected_object_owner
\gset

\if :unexpected_object_owner
  \echo 'ERROR: an application-schema object is not owned by the migrator role'
  \quit 22
\endif
\unset unexpected_object_owner

-- Remove PUBLIC privileges from existing objects. Explicit application grants
-- created by Flyway migrations are intentionally preserved.
SELECT format(
  'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I FROM PUBLIC',
  :'active_schema_name'
)
\gexec

SELECT format(
  'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA %I FROM PUBLIC',
  :'active_schema_name'
)
\gexec

SELECT format(
  'REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA %I FROM PUBLIC',
  :'active_schema_name'
)
\gexec

-- PostgreSQL has no ALL TYPES IN SCHEMA form. Reconcile common application
-- types individually: domains, enums, and standalone composite types.
SELECT format(
  'REVOKE ALL PRIVILEGES ON TYPE %I.%I FROM PUBLIC',
  namespace_catalog.nspname,
  type_catalog.typname
)
FROM pg_type type_catalog
JOIN pg_namespace namespace_catalog
  ON namespace_catalog.oid = type_catalog.typnamespace
LEFT JOIN pg_class composite_relation
  ON composite_relation.oid = type_catalog.typrelid
WHERE namespace_catalog.nspname = :'active_schema_name'
  AND (
    type_catalog.typtype IN ('d', 'e')
    OR (
      type_catalog.typtype = 'c'
      AND composite_relation.relkind = 'c'
    )
  )
ORDER BY type_catalog.typname
\gexec

-- Future objects are default-deny for PUBLIC and runtime. Flyway migrations
-- explicitly grant each required table/sequence/routine/type privilege.
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, %I',
  :'active_migrator_role',
  :'active_schema_name',
  :'active_app_role'
)
\gexec

SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, %I',
  :'active_migrator_role',
  :'active_schema_name',
  :'active_app_role'
)
\gexec

-- EXECUTE on routines and USAGE on types are PUBLIC defaults. These must be
-- revoked globally for the dedicated migrator role; a per-schema revoke cannot
-- override a global/default PUBLIC grant.
SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE EXECUTE ON ROUTINES FROM PUBLIC',
  :'active_migrator_role'
)
\gexec

SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE USAGE ON TYPES FROM PUBLIC',
  :'active_migrator_role'
)
\gexec

SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL PRIVILEGES ON ROUTINES FROM %I',
  :'active_migrator_role',
  :'active_schema_name',
  :'active_app_role'
)
\gexec

SELECT format(
  'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL PRIVILEGES ON TYPES FROM %I',
  :'active_migrator_role',
  :'active_schema_name',
  :'active_app_role'
)
\gexec

-- Runtime must never access Flyway metadata.
SELECT format(
  'REVOKE ALL PRIVILEGES ON TABLE %I.flyway_schema_history FROM %I',
  :'active_schema_name',
  :'active_app_role'
)
WHERE to_regclass(
  format('%I.%I', :'active_schema_name', 'flyway_schema_history')
) IS NOT NULL
\gexec

-- Secure search paths; public is intentionally absent.
SELECT format(
  'ALTER ROLE %I IN DATABASE %I SET search_path TO %I, pg_catalog',
  :'active_migrator_role',
  :'active_database_name',
  :'active_schema_name'
)
\gexec

SELECT format(
  'ALTER ROLE %I IN DATABASE %I SET search_path TO %I, pg_catalog',
  :'active_app_role',
  :'active_database_name',
  :'active_schema_name'
)
\gexec

-- Baseline verification.
SELECT
  has_database_privilege(:'active_migrator_role', current_database(), 'CONNECT')
  AND NOT has_database_privilege(:'active_migrator_role', current_database(), 'CREATE')
  AND NOT has_database_privilege(:'active_migrator_role', current_database(), 'TEMPORARY')
  AND has_schema_privilege(:'active_migrator_role', :'active_schema_name', 'USAGE')
  AND has_schema_privilege(:'active_migrator_role', :'active_schema_name', 'CREATE')
  AS migrator_privileges_valid
\gset

\if :migrator_privileges_valid
\else
  \echo 'ERROR: migrator database/schema privileges do not match the baseline'
  \quit 23
\endif
\unset migrator_privileges_valid

SELECT
  has_database_privilege(:'active_app_role', current_database(), 'CONNECT')
  AND NOT has_database_privilege(:'active_app_role', current_database(), 'CREATE')
  AND NOT has_database_privilege(:'active_app_role', current_database(), 'TEMPORARY')
  AND has_schema_privilege(:'active_app_role', :'active_schema_name', 'USAGE')
  AND NOT has_schema_privilege(:'active_app_role', :'active_schema_name', 'CREATE')
  AS application_privileges_valid
\gset

\if :application_privileges_valid
\else
  \echo 'ERROR: runtime application database/schema privileges do not match the baseline'
  \quit 24
\endif
\unset application_privileges_valid

SELECT pg_advisory_unlock(
  hashtext(
    'auction-promax:adr-016:schema-bootstrap:' || current_database()
  )::bigint
) AS schema_lock_released
\gset

\if :schema_lock_released
\else
  \echo 'ERROR: failed to release schema-bootstrap advisory lock'
  \quit 25
\endif
\unset schema_lock_released