-- ADR-016 reference queries for manual investigation.
-- Automated allow/deny verification is implemented by scripts/local-db-verify.ps1.
-- Run only with psql -X and an administrative connection.  This file never receives passwords.
\set ON_ERROR_STOP on

-- Database owner and grants visible to PUBLIC.
SELECT database.datname AS database_name,
       owner.rolname AS database_owner,
       has_database_privilege('PUBLIC', database.datname, 'CONNECT') AS public_connect,
       has_database_privilege('PUBLIC', database.datname, 'CREATE') AS public_create,
       has_database_privilege('PUBLIC', database.datname, 'TEMPORARY') AS public_temporary
FROM pg_database database
JOIN pg_roles owner ON owner.oid = database.datdba
WHERE database.datname IN ('identity_db', 'identity_test_db', 'auction_db', 'auction_test_db',
                           'bidding_db', 'bidding_test_db', 'billing_db', 'billing_test_db')
ORDER BY database.datname;

-- Service role attributes and any inherited membership (must return no membership rows).
SELECT role.rolname, role.rolcanlogin, role.rolsuper, role.rolcreatedb, role.rolcreaterole,
       role.rolreplication, role.rolbypassrls, role.rolinherit, parent.rolname AS member_of
FROM pg_roles role
LEFT JOIN pg_auth_members membership ON membership.member = role.oid
LEFT JOIN pg_roles parent ON parent.oid = membership.roleid
WHERE role.rolname ~ '^(identity|auction|bidding|billing)(_test)?_(owner|migrator|app)$'
ORDER BY role.rolname;

-- Per-database schema grants are intentionally verified by the automated script while connected
-- as each role.  psql cannot change credentials safely in one SQL session.
