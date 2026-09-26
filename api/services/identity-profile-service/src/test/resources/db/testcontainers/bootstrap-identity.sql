-- TEST ONLY. Credentials and roles exist only inside an ephemeral Testcontainer.
-- Never reuse these values outside the canonical integration test.

CREATE ROLE identity_test_owner
    NOLOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    NOREPLICATION
    NOBYPASSRLS;

CREATE ROLE identity_test_migrator
    LOGIN
    PASSWORD 'test-only-identity-migrator-not-a-secret'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    NOREPLICATION
    NOBYPASSRLS
    CONNECTION LIMIT 5;

CREATE ROLE identity_test_app
    LOGIN
    PASSWORD 'test-only-identity-app-not-a-secret'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    NOREPLICATION
    NOBYPASSRLS
    CONNECTION LIMIT 20;

ALTER DATABASE identity_test_db OWNER TO identity_test_owner;

REVOKE ALL PRIVILEGES
    ON DATABASE identity_test_db
    FROM PUBLIC, identity_test_migrator, identity_test_app;

GRANT CONNECT
    ON DATABASE identity_test_db
    TO identity_test_migrator, identity_test_app;

REVOKE ALL PRIVILEGES
    ON SCHEMA public
    FROM PUBLIC, identity_test_migrator, identity_test_app;

CREATE SCHEMA identity AUTHORIZATION identity_test_migrator;

REVOKE ALL PRIVILEGES
    ON SCHEMA identity
    FROM PUBLIC, identity_test_migrator, identity_test_app;

GRANT USAGE, CREATE
    ON SCHEMA identity
    TO identity_test_migrator;

GRANT USAGE
    ON SCHEMA identity
    TO identity_test_app;

ALTER ROLE identity_test_migrator
    IN DATABASE identity_test_db
    SET search_path TO identity, pg_catalog;

ALTER ROLE identity_test_app
    IN DATABASE identity_test_db
    SET search_path TO identity, pg_catalog;

ALTER DEFAULT PRIVILEGES
    FOR ROLE identity_test_migrator
    IN SCHEMA identity
    REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, identity_test_app;

ALTER DEFAULT PRIVILEGES
    FOR ROLE identity_test_migrator
    IN SCHEMA identity
    REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, identity_test_app;

ALTER DEFAULT PRIVILEGES
    FOR ROLE identity_test_migrator
    REVOKE EXECUTE ON ROUTINES FROM PUBLIC;

ALTER DEFAULT PRIVILEGES
    FOR ROLE identity_test_migrator
    REVOKE USAGE ON TYPES FROM PUBLIC;