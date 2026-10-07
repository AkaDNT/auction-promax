# __SERVICE_ID__

Generated from the repository-owned service foundation. This directory is an independent service build; it does not depend on a shared application runtime library.

Use Java 21 and the checked-in Maven Wrapper (3.3.4 / Maven 3.9.16). Run `./mvnw -B verify` on Unix or `mvnw.cmd -B verify` on Windows. Relational integration tests require Docker. The gateway has no datastore and uses its database-free Failsafe integration test.

The generated HTTP surface is a technical foundation probe, not a product contract. Configure only the registered local database variables for relational services. Do not add credentials to this file or commit local secret files.
