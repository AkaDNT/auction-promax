# Service foundation source templates

This directory contains the closed registry and source templates used by `api/scripts/foundation/Generate-Service.mjs`. It is not a shared runtime library and does not deliver generated service directories.

## Prerequisites

- Node.js 24.15.0, as pinned by `api/.nvmrc`.
- PowerShell 7 on Windows/Linux, or Windows PowerShell 5.1 on Windows, for the no-overwrite publisher (`System.IO.Directory.Move`). No execution-policy bypass is required or supported.
- Generated relational service builds use Java 21, Spring Boot 3.5.16 and Maven Wrapper 3.3.4 / Maven 3.9.16. Relational integration tests require Docker. The gateway has no datastore and requires no Docker service.

## Use

The public API accepts only `{serviceId, repositoryRoot}`. `ServiceGeneratorCore.mjs` contains an internal IO adapter for fault fixtures; no CLI test/unsafe switches are exposed. The only native wrapper identifiers passed through are `__MVNW_ARG0_NAME__`, `__MVNW_CMD__`, and `__MVNW_ERROR__`, exclusively in `mvnw.cmd`. Wrapper bytes otherwise match Identity after CRLF-to-LF normalization. Inventory destinations may repeat only across disjoint variants.

After interruption, run `node api/scripts/foundation/Inspect-ServiceArtifacts.mjs` to list reserved artifacts using repository-relative paths. It never reads lock contents or deletes anything. Stop generation, verify that no generator is still active and that each reported artifact belongs to the interrupted run, then explicitly remove only those individually verified paths. A prefix alone is not ownership proof. Do not delete a lock or stage belonging to another process, the service destination, or the services parent. There is no automatic stale-artifact cleanup.

From the repository root, run exactly `node api/scripts/foundation/Generate-Service.mjs --service <registered-id>`. The CLI accepts only a new, non-preserved registry ID; it never accepts a destination, package, variant, database, force or overwrite option. Generation is fail-closed and publishes a complete inventory through an owned sibling stage and the PowerShell directory-move helper. An existing destination, case alias, link/reparse path, invalid registry/inventory, unknown token or incomplete source tree is rejected.

`node api/scripts/foundation/Test-ServiceGenerator.mjs` exercises temp-root generation and publication behavior. `node api/scripts/foundation/Test-ServiceConformance.mjs --templates` checks the closed source inventory, token/path/mode rules and variant restrictions. Neither command writes generated services under the repository's `api/services` directory.

The gateway POM/configuration/test source is database-free. T02 source conformance does not establish resolved dependency-graph, Maven/Failsafe execution, database isolation, SBOM or runtime behavior; those remain later generated-service gates. The wrapper properties intentionally contain no `distributionSha256Sum`, so no wrapper-download checksum verification is claimed.
