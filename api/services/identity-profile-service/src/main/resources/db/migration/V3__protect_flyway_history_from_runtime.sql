-- The runtime role must never inspect or mutate Flyway's migration history.
-- V2 grants DML on all existing identity tables so the service can operate its
-- sample-flow tables; explicitly restore the T05 Flyway-history boundary.
REVOKE ALL PRIVILEGES
    ON TABLE identity.flyway_schema_history
    FROM PUBLIC, ${runtimeRole};
