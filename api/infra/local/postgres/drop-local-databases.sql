-- Guarded cleanup reference for local integration-test databases only.
-- Prefer scripts/local-db-reset.ps1, which supplies the explicit acknowledgement.
-- Never run this against a shared, alpha, or production PostgreSQL cluster.
-- Example: psql -X -v ON_ERROR_STOP=1 -v allow_local_test_reset=1 -f drop-local-databases.sql postgres
\set ON_ERROR_STOP on
\pset pager off

\if :{?allow_local_test_reset}
\else
  \warn 'Refusing cleanup: set allow_local_test_reset=1 explicitly.'
  \quit
\endif

\if :allow_local_test_reset
  SELECT format('DROP DATABASE IF EXISTS %I WITH (FORCE)', datname)
  FROM pg_database
  WHERE datname IN ('identity_test_db', 'auction_test_db', 'transaction_test_db', 'payment_test_db')
  ORDER BY datname
  \gexec
\else
  \warn 'Refusing cleanup: allow_local_test_reset must be boolean true/1.'
  \quit
\endif
