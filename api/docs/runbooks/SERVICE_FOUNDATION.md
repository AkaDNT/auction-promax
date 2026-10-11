# Service Foundation Local Runner

This runbook describes local technical checks for an already-present service. It does not deliver a service, prove production readiness, or replace the isolated CI acceptance path.

## Safety boundaries

- Use a reviewed checkout and a service directory that already exists. The local runner does not generate, repair, or overwrite a service. The four undelivered registered services must be generated only by the approved isolated CI workflow; do not run the generator locally for them.
- The runner accepts only a registered, non-preserved service and its canonical source path. It derives database and role names from `api/service-foundation/services.json`, rejects inherited Spring/JVM/Maven overrides and non-selected or generic database environment carriers, and binds the application to loopback. It restores the caller's environment and working directory after Maven exits.
- Use a dedicated local database and locally provisioned least-privilege service roles. Do not point a service at shared, production, or another service's database. Do not reset or drop databases as part of this runbook.
- Keep credentials in an ignored per-service config file. Never paste real secrets into commands, logs, screenshots, or this document. The HTTP verifier records only fixed result codes in the ignored log path; it does not write response bodies or credentials.
- Do not change PowerShell execution policy or use `-ExecutionPolicy Bypass`. Run fixtures in the host's normal supported PowerShell environment.

## Prerequisites

- PowerShell 7 on Windows/Linux, or Windows PowerShell 5.1 on Windows where supported by the runner.
- Java 21 and the repository's Maven Wrapper; Node.js 24.15.0 for the repository contract/conformance checks.
- For a relational service, a reachable dedicated PostgreSQL instance and the exact service database/roles registered in `services.json`.
- For gateway, no database configuration or database process is used.

From the repository root, check the registry and source templates before starting:

```powershell
node api/scripts/foundation/Test-ServiceRegistry.mjs
node api/scripts/foundation/Test-ServiceConformance.mjs --templates
```

These checks do not generate service directories. To test generation itself, use the documented temp-root generator fixtures; do not set a destination under `api/services`.

## Configure a relational service

Create an ignored file for the selected service, for example `api/.env.auction.local`. Use only that service's five registry-defined keys and real locally provisioned values:

```text
AUCTION_DB_URL=jdbc:postgresql://127.0.0.1:5432/auction_db
AUCTION_DB_APP_USERNAME=auction_app
AUCTION_DB_APP_PASSWORD=<locally-provisioned-secret>
AUCTION_DB_MIGRATOR_USERNAME=auction_migrator
AUCTION_DB_MIGRATOR_PASSWORD=<locally-provisioned-secret>
```

Replace placeholders in your local editor; never use the placeholder text as a credential. Verify the file is ignored before entering secrets:

```powershell
git check-ignore api/.env.auction.local
```

If that command does not confirm the path is ignored, stop and fix the local ignore/configuration issue before storing any secret. Do not add Spring profile, JSON, JVM, Maven, or other-service database settings to the file.

For another relational service, use only the matching registry keys and that service's dedicated database/roles. Do not copy the Auction key names or values to another service.

## Start and verify an existing service

Start the service from the repository root in a foreground terminal. The runner invokes the existing service's Maven wrapper; it does not start or manage PostgreSQL.

```powershell
pwsh -NoProfile -NonInteractive -File api/scripts/Run-ServiceLocal.ps1 `
  -ServiceId auction-service `
  -ConfigurationPath api/.env.auction.local `
  -Port 8080
```

Keep that terminal open. In a second terminal, verify only the loopback endpoint of the process you just launched:

```powershell
New-Item -ItemType Directory -Force api/logs | Out-Null
pwsh -NoProfile -NonInteractive -File api/scripts/Test-ServiceHttp.ps1 `
  -ServiceId auction-service `
  -BaseUri http://127.0.0.1:8080 `
  -LogPath api/logs/auction-http.log
```

The verifier checks readiness, service information/metrics, the successful technical validation route, and malformed/invalid request Problem Details including correlation fields. It refuses non-loopback targets, redirects, malformed UTF-8, incomplete error contracts, and unsafe log paths. A successful local check is only a local technical smoke result, not a security-policy or hosted acceptance result.

For the database-free gateway, create a separate ignored empty config file and pass `-ServiceId realtime-gateway`; do not provide datasource keys. The runner and gateway checks must remain usable without PostgreSQL running.

## Stop and troubleshoot safely

- Stop the foreground Maven process with `Ctrl+C` in the terminal where the runner started it. The runner restores environment variables and the original working directory in its cleanup path.
- If the process remains after interruption, identify the exact process ancestry and verify it belongs to this invocation before stopping anything. Do not use broad process-kill commands.
- A runner rejection is fail-closed. Correct the local config or inherited environment explicitly; do not bypass the guard by adding Spring/JVM/Maven overrides or generic PostgreSQL variables.
- The verifier's ignored log contains fixed status codes only. Keep diagnostic response payloads and credentials out of shared logs and issue reports.

## Required validation beyond this runbook

Local runner fixtures and HTTP smoke do not substitute for T04/T05/T06 evidence. Acceptance still requires the canonical standalone Maven `clean verify`, named non-skipped Failsafe/Testcontainers proof, relational database-boundary tests, gateway database-free proof, service-specific SBOM and dependency/container scans, schema-valid sanitized evidence, exact service/revision aggregation, independent review, and the applicable protected hosted workflow results. The separate `release-policy` gate remains authoritative and may remain `BLOCKED` for vulnerabilities; never relabel it or weaken scanner thresholds to make a local run appear accepted.
