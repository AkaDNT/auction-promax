# Service foundation source templates

Boot 4 tracing uses the managed OpenTelemetry starter. Local profiles keep W3C propagation and disable OTLP trace, metric and log exporters individually until a collector is configured. The post-delivery tracing correction is a reviewed amendment of templates and existing committed source; original CI delivery files record their historical import, not the hashes of later amendments. Source generation remains CI-only for real services.

This directory contains the closed registry and source templates used by `api/scripts/foundation/Generate-Service.mjs`. It is not a shared runtime library and does not deliver generated service directories.

## Prerequisites

- Node.js 24.15.0, as pinned by `api/.nvmrc`.
- PowerShell 7 on Windows/Linux, or Windows PowerShell 5.1 on Windows, for the no-overwrite publisher (`System.IO.Directory.Move`). No execution-policy bypass is required or supported.
- Generated relational service builds use Java 21, Spring Boot 4.0.8 and Maven Wrapper 3.3.4 / Maven 3.9.16. Relational integration tests require Docker. The gateway has no datastore and requires no Docker service.

## Use

The public API accepts only `{serviceId, repositoryRoot}`. `ServiceGeneratorCore.mjs` contains an internal IO adapter for fault fixtures; no CLI test/unsafe switches are exposed. The only native wrapper identifiers passed through are `__MVNW_ARG0_NAME__`, `__MVNW_CMD__`, and `__MVNW_ERROR__`, exclusively in `mvnw.cmd`. Wrapper bytes otherwise match Identity after CRLF-to-LF normalization. Inventory destinations may repeat only across disjoint variants.

After interruption, run `node api/scripts/foundation/Inspect-ServiceArtifacts.mjs` to list reserved artifacts using repository-relative paths. It never reads lock contents or deletes anything. Stop generation, verify that no generator is still active and that each reported artifact belongs to the interrupted run, then explicitly remove only those individually verified paths. A prefix alone is not ownership proof. Do not delete a lock or stage belonging to another process, the service destination, or the services parent. There is no automatic stale-artifact cleanup.

From the repository root, run exactly `node api/scripts/foundation/Generate-Service.mjs --service <registered-id>`. The CLI accepts only a new, non-preserved registry ID; it never accepts a destination, package, variant, database, force or overwrite option. Generation is fail-closed and publishes a complete inventory through an owned sibling stage and the PowerShell directory-move helper. An existing destination, case alias, link/reparse path, invalid registry/inventory, unknown token or incomplete source tree is rejected.

`node api/scripts/foundation/Test-ServiceGenerator.mjs` exercises temp-root generation and publication behavior. `node api/scripts/foundation/Test-ServiceConformance.mjs --templates` checks the closed source inventory, token/path/mode rules and variant restrictions. Neither command writes generated services under the repository's `api/services` directory.

The gateway POM/configuration/test source is database-free. T02 source conformance does not establish resolved dependency-graph, Maven/Failsafe execution, database isolation, SBOM or runtime behavior; those remain later generated-service gates. The wrapper properties intentionally contain no `distributionSha256Sum`, so no wrapper-download checksum verification is claimed.

## Local technical runner

For the step-by-step operator procedure and safety checks, see the [Service Foundation Local Runner runbook](../docs/runbooks/SERVICE_FOUNDATION.md).

`api/scripts/Run-ServiceLocal.ps1` can run an already-present, registry-listed non-preserved service using an ignored configuration file. It validates the service's database and role names from `services.json`, rejects inherited Spring/JVM/Maven overrides and non-selected or generic database credentials/configuration (including PostgreSQL/libpq environment carriers), binds the app only to `127.0.0.1`, and restores the process environment and working directory when Maven exits. It does not generate or modify service source. Do not run `Generate-Service.mjs` in a developer workspace for the four undelivered services; generate them only in the approved isolated CI path. If a registered service directory is absent locally, this runner cannot be used for that service.

For a relational service, create an ignored per-service file such as `api/.env.auction.local` containing only that service's five registered keys, with locally provisioned values:

```text
AUCTION_DB_URL=jdbc:postgresql://localhost:5432/auction_db
AUCTION_DB_APP_USERNAME=auction_app
AUCTION_DB_APP_PASSWORD=<local-secret>
AUCTION_DB_MIGRATOR_USERNAME=auction_migrator
AUCTION_DB_MIGRATOR_PASSWORD=<local-secret>
```

Do not copy example passwords into a real run, commit this file, or pass it to the database-free gateway. For the gateway, use a separate ignored, empty configuration file. Do not place Spring, JVM, or Maven override keys in either local config. Run from the repository root in PowerShell:

```powershell
pwsh -NoProfile -NonInteractive -File api/scripts/Run-ServiceLocal.ps1 `
  -ServiceId auction-service `
  -ConfigurationPath api/.env.auction.local `
  -Port 8080
```

The command runs Maven in the foreground; stop it with Ctrl+C in that same terminal. In another terminal, create the ignored `api/logs` directory if needed and verify the already-running process. This verifier never starts or stops a process and only accepts an HTTP loopback base URI:

```powershell
New-Item -ItemType Directory -Force api/logs | Out-Null
pwsh -NoProfile -NonInteractive -File api/scripts/Test-ServiceHttp.ps1 `
  -ServiceId auction-service `
  -BaseUri http://127.0.0.1:8080 `
  -LogPath api/logs/auction-http.log
```

The verifier appends only fixed result codes to an ignored `.log` file; it does not store response bodies or credentials. These scripts are local operational checks only and do not replace canonical Maven/Failsafe, database-isolation, SBOM, scanner, or hosted evidence gates. Their PowerShell fixtures must run normally under PowerShell 7 and Windows PowerShell 5.1 where supported; do not bypass execution policy.
