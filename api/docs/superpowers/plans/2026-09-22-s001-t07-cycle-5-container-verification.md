# S001-T07 Cycle 5 Container Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Identity service runtime image from the Maven-produced JAR, prove the reviewed Corretto 21/AL2023 `linux/amd64` base identity, validate the hardened runtime, and execute a fail-closed Trivy container scan with sanitized policy evidence.

**Architecture:** Cycle 5 is a local container verification pipeline with four sequential boundaries: repository-owned base-image trust, prebuilt artifact and image construction, hardened technical smoke, and container vulnerability policy. Every boundary consumes a strict JSON contract and emits only sanitized PASS/BLOCKED evidence. Existing uncommitted Cycle 5 files are treated as candidate implementation to audit with RED→GREEN tests, not as accepted evidence.

**Tech Stack:** Docker Engine/Buildx, OCI image manifests, Amazon Corretto 21 on Amazon Linux 2023 headless, Java 21/Maven Wrapper, PowerShell 5.1+, Node.js/Ajv, Trivy CLI `0.74.0` from the verified Cycle 1 bootstrap.

**Spec:** `docs/decisions/S001-T07_SUPPLY_CHAIN_DECISIONS.md`, sections 6, 8, 9, 11, 12, and 16; `docs/sprints/SPRINT_001.md`, S001-T07 acceptance criteria.

## Global Constraints

- Runtime family is official Amazon Corretto 21, Amazon Linux 2023, headless, `linux/amd64` only.
- Reviewed tag is `21.0.12-al2023-headless`; reviewed index digest is `sha256:de70a7b6495e70cc86d96d01c7352873827a277e5ac196d28e1bf6dcf254e62d`; reviewed platform manifest digest is `sha256:ff3ca8adea989f1402dc3c28f2b74fce5db173cf2f0999f3e5c667fe4ce62d76`.
- Stop if the reviewed official image no longer satisfies family, platform, digest inspectability, or Trivy OS-package detection. Do not substitute Alpine, Ubuntu, distroless, or another vendor.
- Maven Wrapper builds the executable JAR before Docker; Docker must not run Maven, resolve dependencies, receive credentials, build arguments, SSH forwarding, or secrets.
- Canonical local image is `auction-promax/identity-profile-service:s001-t07`.
- Runtime UID/GID is `10001:10001`; working directory `/app`; application `/app/app.jar`; port `8080`.
- Dockerfile has no shell/curl healthcheck and no Docker `HEALTHCHECK` in Phase 0.
- Technical smoke uses `technical-local`, readiness `/actuator/health/readiness`, loopback-only publishing, read-only root filesystem, `/tmp` tmpfs, all capabilities dropped, `no-new-privileges`, and PID limit `256`.
- Trivy is exactly `0.74.0`; scan uses the local Docker image source and requires both OS-package and Java-library detection.
- Trivy DB freshness continues to use `VulnerabilityDB.UpdatedAt` with a maximum age of 24 hours; no filesystem timestamp shortcut.
- Raw Trivy JSON is temporary-only. Retained evidence is the sanitized inventory under `services/identity-profile-service/target/s001-t07-evidence/`.
- High/Critical findings block unless an exact, approved, unexpired disposition exists. Never add a blanket or convenience disposition to make Cycle 5 green.
- A successful scanner invocation followed by policy `BLOCKED` proves enforcement; it is not a scanner PASS or release-ready claim.
- Cycle 5 must not modify `.github/workflows/api-baseline.yml`, `.github/workflows/security-freshness.yml`, AWS/ECR/Inspector configuration, or hosted-CI evidence. Those belong to Cycle 6.
- Preserve all unrelated dirty Cycle 4/6 files and stage Cycle 5 paths explicitly.

## Review Focus

- A tag that resolves to a changed index/platform digest, multiple `linux/amd64` manifests, or a mismatched source annotation must stop before build; Task 1 pins each failure.
- Build context leakage, Docker-side Maven resolution, credentials, build args, SSH forwarding, registry login, or push must fail contract tests; Task 2 pins the boundary.
- A stale, non-executable, malformed, extra, or build-mutated JAR must never become an image; Task 2 pins artifact identity and mutation handling.
- Smoke failure, readiness timeout, non-loopback binding, missing hardening, or interrupted execution must still remove the exact random container; Task 3 pins cleanup and runtime inspection.
- Missing/stale DB metadata, malformed/empty report, absent OS or Java detection, unknown severity, raw-report retention, or unmatched High/Critical findings must fail closed; Task 4 pins the scan/policy boundary.

---

### Task 1: Lock and resolve the official base-image trust anchor

**Files:**
- Verify/create: `security/tooling/container-base-images.json`
- Verify/create: `security/schemas/container-base-images.schema.json`
- Test: `scripts/supply-chain/Test-ContainerBaseImageTrust.mjs`
- Verify/create: `scripts/supply-chain/Test-ContainerBaseImageResolution.ps1`

**Interfaces:**
- Consumes: Docker Buildx with registry access and the committed trust manifest.
- Produces: a verified `docker.io/library/amazoncorretto@sha256:ff3ca8adea989f1402dc3c28f2b74fce5db173cf2f0999f3e5c667fe4ce62d76` local `linux/amd64` image, or one sanitized `CONTAINER_BASE_IMAGE_*` failure code.

- [ ] **Step 1: Freeze the current trust values before network resolution**

  Confirm the manifest/schema pair binds all of these literal values and rejects extra properties:

  ```text
  repository=docker.io/library/amazoncorretto
  tag=21.0.12-al2023-headless
  index=sha256:de70a7b6495e70cc86d96d01c7352873827a277e5ac196d28e1bf6dcf254e62d
  platform=linux/amd64
  manifest=sha256:ff3ca8adea989f1402dc3c28f2b74fce5db173cf2f0999f3e5c667fe4ce62d76
  source=https://github.com/corretto/corretto-docker.git#85388f73163b37cdacf26cb463711739b9705e8c:21/headless/al2023
  ```

- [ ] **Step 2: Add the RED trust-contract matrix**

  `Test-ContainerBaseImageTrust.mjs` must independently reject: floating/missing digest, wrong repository, non-headless tag, non-AL2023 runtime, wrong Java major, non-amd64 platform, changed official source, placeholder checksum, changed asset order/extra image, and Dockerfile `FROM` drift. Every negative case asserts a sanitized case name only.

- [ ] **Step 3: Run the offline trust test**

  ```powershell
  node .\scripts\supply-chain\Test-ContainerBaseImageTrust.mjs
  ```

  Expected: each negative fixture is observed and the canonical contract passes. If a newly added case passes unexpectedly, keep it RED and fix the schema/validator rather than weakening the case.

- [ ] **Step 4: Pin live-resolution failure behavior**

  Test the adapter boundary with deterministic fake Docker outputs for: wrong index digest, malformed index JSON, zero/two `linux/amd64` entries, wrong platform digest/media type/source annotation, pull failure, malformed local inspect, and local descriptor/platform drift. The production adapter must use these exact external calls:

  ```text
  docker buildx imagetools inspect --format {{.Manifest.Digest}} docker.io/library/amazoncorretto:21.0.12-al2023-headless
  docker buildx imagetools inspect --raw docker.io/library/amazoncorretto:21.0.12-al2023-headless
  docker pull --platform linux/amd64 docker.io/library/amazoncorretto@sha256:ff3ca8adea989f1402dc3c28f2b74fce5db173cf2f0999f3e5c667fe4ce62d76
  docker image inspect docker.io/library/amazoncorretto@sha256:ff3ca8adea989f1402dc3c28f2b74fce5db173cf2f0999f3e5c667fe4ce62d76
  ```

- [ ] **Step 5: Execute the online stop-condition gate**

  ```powershell
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-ContainerBaseImageResolution.ps1
  ```

  Expected: PASS only when the tag still resolves to the committed index and exactly one matching platform manifest. Any drift is a stop condition: do not update digests automatically.

- [ ] **Step 6: Commit only Task 1 paths**

  ```powershell
  git add security/tooling/container-base-images.json security/schemas/container-base-images.schema.json scripts/supply-chain/Test-ContainerBaseImageTrust.mjs scripts/supply-chain/Test-ContainerBaseImageResolution.ps1
  git commit -m "feat(supply-chain): verify container base image trust"
  ```

### Task 2: Verify the prebuilt artifact and construct the local image

**Files:**
- Verify/create: `security/tooling/container-image-contract.json`
- Verify/create: `security/schemas/container-image-contract.schema.json`
- Test: `scripts/supply-chain/Test-ContainerImageContract.mjs`
- Verify/create: `scripts/supply-chain/Invoke-ContainerPrebuildArtifact.ps1`
- Test: `scripts/supply-chain/Test-ContainerImageBuildContract.mjs`
- Verify/create: `scripts/supply-chain/Invoke-ContainerImageBuild.ps1`
- Verify/create: `services/identity-profile-service/Dockerfile`
- Verify/create: `services/identity-profile-service/.dockerignore`

**Interfaces:**
- Consumes: Task 1 trust gate and Cycle 2 SBOM validator.
- Produces: local image `auction-promax/identity-profile-service:s001-t07`, its immutable local image ID, platform identity, and source JAR SHA-256.

- [ ] **Step 1: Pin the image contract before build code**

  Contract tests must reject drift in image name/platform, Dockerfile/context/JAR paths, outside-Docker build requirement, runtime user/path/port/entrypoint, absent healthcheck, smoke hardening, exact Trivy vector, evidence fields, and policy. The contract must set:

  ```text
  dockerfile=services/identity-profile-service/Dockerfile
  context=services/identity-profile-service
  jar=services/identity-profile-service/target/identity-profile-service-0.0.1-SNAPSHOT.jar
  image=auction-promax/identity-profile-service:s001-t07
  ```

- [ ] **Step 2: Make prebuild validation fail closed**

  Add RED fixtures/adapters for Maven failure, missing/multiple executable JARs, missing/invalid `target/bom.json`, invalid ZIP/JAR, missing Spring Boot launcher metadata, wrong `Start-Class`, missing layers index, and invalid hash. The prebuild command is:

  ```powershell
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Invoke-ContainerPrebuildArtifact.ps1
  ```

  Expected success output includes repository-relative artifact path, lowercase SHA-256, byte length, Spring Boot launcher/start class, `sbom=validated`, and `Container prebuild artifact: PASS`; it contains no absolute user path.

- [ ] **Step 3: Enforce a minimal runtime-only Dockerfile**

  Dockerfile policy tests must prove the effective behavior below and reject additional stages/instructions that introduce package managers, shell/curl, Maven/Gradle, remote downloads, build arguments, secrets, credentials, `HEALTHCHECK`, root runtime, or mutable `FROM`:

  ```dockerfile
  FROM docker.io/library/amazoncorretto:21.0.12-al2023-headless@sha256:ff3ca8adea989f1402dc3c28f2b74fce5db173cf2f0999f3e5c667fe4ce62d76
  WORKDIR /app
  COPY --chown=10001:10001 target/identity-profile-service-0.0.1-SNAPSHOT.jar /app/app.jar
  USER 10001:10001
  EXPOSE 8080
  ENTRYPOINT ["java", "-jar", "/app/app.jar"]
  ```

- [ ] **Step 4: Prove the build context contains only required inputs**

  `.dockerignore` must default-deny with `**` and re-include only `Dockerfile` and the canonical JAR. A context fixture must fail when source, `.git`, Maven caches, settings, credentials, environment files, SBOMs, or another JAR would be sent.

- [ ] **Step 5: Run static/contract gates before Docker**

  ```powershell
  node .\scripts\supply-chain\Test-ContainerImageContract.mjs
  node .\scripts\supply-chain\Test-DockerfilePolicy.mjs
  node .\scripts\supply-chain\Test-ContainerImageBuildContract.mjs
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Invoke-ContainerPrebuildArtifact.ps1
  ```

  Expected: all contract cases PASS and one validated executable JAR is produced outside Docker.

- [ ] **Step 6: Build and inspect the image**

  The orchestrator must invoke exactly:

  ```text
  docker buildx build --platform linux/amd64 --pull --load --tag auction-promax/identity-profile-service:s001-t07 --file services/identity-profile-service/Dockerfile services/identity-profile-service
  ```

  Hash the canonical JAR before and after Docker and fail if it changes. Inspect the result and assert local tag, `linux/amd64`, `10001:10001`, `/app`, exposed `8080/tcp`, exact entrypoint, no healthcheck, and no unexpected environment/config drift.

- [ ] **Step 7: Execute the image build gate**

  ```powershell
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Invoke-ContainerImageBuild.ps1
  ```

  Expected: JSON summary containing local reference, image ID, platform, and unchanged JAR SHA-256, followed by `Container image build: PASS`.

- [ ] **Step 8: Commit only Task 2 paths**

  ```powershell
  git add security/tooling/container-image-contract.json security/schemas/container-image-contract.schema.json scripts/supply-chain/Test-ContainerImageContract.mjs scripts/supply-chain/Invoke-ContainerPrebuildArtifact.ps1 scripts/supply-chain/Test-ContainerImageBuildContract.mjs scripts/supply-chain/Invoke-ContainerImageBuild.ps1 scripts/supply-chain/Test-DockerfilePolicy.mjs services/identity-profile-service/Dockerfile services/identity-profile-service/.dockerignore
  git commit -m "feat(supply-chain): build verified identity runtime image"
  ```

### Task 3: Prove hardened technical runtime behavior

**Files:**
- Test: `scripts/supply-chain/Test-ContainerTechnicalSmokeContract.mjs`
- Verify/create: `scripts/supply-chain/Invoke-ContainerTechnicalSmoke.ps1`

**Interfaces:**
- Consumes: Task 2 local image and `technicalSmoke` contract.
- Produces: readiness PASS plus inspected hardening evidence; always removes the exact random smoke container.

- [ ] **Step 1: Add RED adapter scenarios before runtime changes**

  Cover missing image, start failure, malformed inspect, user/read-only/tmpfs/capability/security/PID drift, non-loopback/ambiguous binding, readiness non-200, body not `UP`, timeout, container early exit, occupied-port race, and cleanup failure. Tests must execute an adapter or fake Docker boundary and assert exit behavior, not only grep source text.

- [ ] **Step 2: Reserve a loopback port without widening exposure**

  The implementation may reserve an ephemeral port but must bind Docker only as:

  ```text
  --publish 127.0.0.1:$hostPort`:8080
  ```

  If the reservation is lost before Docker binds and start fails, return `CONTAINER_SMOKE_START_FAILED`; do not retry on a wildcard interface.

- [ ] **Step 3: Start with the complete hardening vector**

  ```text
  docker run --detach --rm --name $containerName --platform linux/amd64
    --user 10001:10001 --read-only --tmpfs /tmp
    --cap-drop ALL --security-opt no-new-privileges --pids-limit 256
    --publish 127.0.0.1:$hostPort`:8080
    --env SPRING_PROFILES_ACTIVE=technical-local
    auction-promax/identity-profile-service:s001-t07
  ```

- [ ] **Step 4: Inspect before polling readiness**

  Assert the created container matches all runtime/hardening fields in the contract, including tmpfs `/tmp` and exact loopback binding. Poll `/actuator/health/readiness` for at most 120 seconds; accept only HTTP 200 with JSON `status` exactly `UP`. Check container state during polling so an early exit fails immediately with a sanitized code.

- [ ] **Step 5: Guarantee exact cleanup**

  In `finally`, remove only the generated name matching `^apx-s001-t07-smoke-[a-f0-9]{12}$`. Cleanup failure is reported after preserving the primary failure code; never enumerate or remove unrelated containers.

- [ ] **Step 6: Execute smoke gate**

  ```powershell
  node .\scripts\supply-chain\Test-ContainerTechnicalSmokeContract.mjs
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Invoke-ContainerTechnicalSmoke.ps1
  ```

  Expected: contract fixtures PASS; runtime returns readiness `UP`; post-run `docker ps -a --filter name=apx-s001-t07-smoke-` contains no Cycle 5 container.

- [ ] **Step 7: Commit only Task 3 paths**

  ```powershell
  git add scripts/supply-chain/Test-ContainerTechnicalSmokeContract.mjs scripts/supply-chain/Invoke-ContainerTechnicalSmoke.ps1
  git commit -m "test(supply-chain): prove hardened container runtime"
  ```

### Task 4: Scan the image and enforce vulnerability policy

**Files:**
- Create: `scripts/supply-chain/Test-ContainerVulnerabilityScanning.ps1`
- Verify/create: `scripts/supply-chain/Invoke-ContainerVulnerabilityScanning.ps1`
- Reuse without broadening: `scripts/supply-chain/VulnerabilityScanning.psm1`
- Reuse: `security/tooling/vulnerability-scan-contract.json`
- Reuse: `security/vulnerability-dispositions.json`

**Interfaces:**
- Consumes: Task 2 local image, verified Trivy `0.74.0`, fresh Cycle 3 DB contract, and existing disposition registry.
- Produces: sanitized container finding inventory plus policy PASS or BLOCKED. A BLOCKED result is the expected control outcome when unmatched High/Critical findings exist.

- [ ] **Step 1: Write the RED scan/policy fixture matrix**

  Cover missing local image, wrong image ID/platform, missing/old/malformed/future DB metadata, refresh failure, wrong command vector, scanner non-zero exit, missing/empty/malformed raw JSON, missing `os-pkgs`, missing Java `lang-pkgs`, wrong target type, unknown severity, unsanitized fields, unmatched High/Critical, expired/mismatched disposition, policy-evaluator failure, and raw/temp cleanup on PASS and BLOCKED paths.

- [ ] **Step 2: Keep scanner execution separate from release policy**

  Invoke Trivy with exit code 0 so it always emits the complete raw report, then apply repository-owned policy:

  ```text
  $trivy = Get-VerifiedTrivyExecutable
  $cacheDirectory = Join-Path $repoRoot '.tools\supply-chain\trivy-cache'
  & $trivy image --cache-dir $cacheDirectory
    --scanners vuln --image-src docker --platform linux/amd64
    --format json --quiet --exit-code 0
    --skip-db-update --skip-vex-repo-update --skip-version-check
    --timeout 300s --output $temporaryRawReport
    auction-promax/identity-profile-service:s001-t07
  ```

  Do not use `--ignore-unfixed`. Do not conflate Trivy process success with policy success.

- [ ] **Step 3: Validate required detections structurally**

  Require at least one `Results[].Class == "os-pkgs"` result and at least one Java-language `Results[].Class == "lang-pkgs"` result for the executable Spring Boot JAR. Do not accept arbitrary language results as proof of Java detection.

- [ ] **Step 4: Sanitize before retaining evidence**

  Convert the raw report through `ConvertTo-SanitizedVulnerabilityInventory`; retain only the approved twelve fields. Write evidence atomically to:

  ```text
  services/identity-profile-service/target/s001-t07-evidence/container-vulnerability-inventory.json
  ```

  Remove raw JSON and the exact GUID-named temporary directory in `finally` on PASS, BLOCKED, and unexpected error.

- [ ] **Step 5: Preserve honest policy outcomes**

  If unmatched High/Critical findings exist, write the sanitized inventory, emit `Container vulnerability policy: BLOCKED`, and return non-zero. Do not create dispositions automatically. If no blocking findings remain, emit PASS with exact finding counts by severity and disposition status.

- [ ] **Step 6: Run deterministic fixtures and the actual scan**

  ```powershell
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-ContainerVulnerabilityScanning.ps1
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Invoke-ContainerVulnerabilityScanning.ps1
  ```

  Expected actual outcome is determined by current scanner data. Both PASS and policy BLOCKED are valid Cycle 5 execution evidence; scanner failure, missing detection, stale DB, or malformed output are implementation failures.

- [ ] **Step 7: Commit only Task 4 paths**

  ```powershell
  git add scripts/supply-chain/Test-ContainerVulnerabilityScanning.ps1 scripts/supply-chain/Invoke-ContainerVulnerabilityScanning.ps1
  git commit -m "feat(supply-chain): enforce container vulnerability policy"
  ```

### Task 5: Run regressions and record Cycle 5 evidence

**Files:**
- Modify after fresh execution: `docs/guides/S001-T07-cycle-5-container.md`
- Modify after fresh execution: `docs/sprints/SPRINT_001.md`

**Interfaces:**
- Consumes: Tasks 1–4, Cycle 1 tooling, Cycle 2 SBOM, and Cycle 3 vulnerability-policy regressions.
- Produces: a reproducible local runbook and honest evidence without claiming CI or release readiness.

- [ ] **Step 1: Run static and deterministic gates**

  ```powershell
  npm.cmd --prefix .\contracts ci
  node .\scripts\supply-chain\Test-ContainerBaseImageTrust.mjs
  node .\scripts\supply-chain\Test-ContainerImageContract.mjs
  node .\scripts\supply-chain\Test-DockerfilePolicy.mjs
  node .\scripts\supply-chain\Test-ContainerImageBuildContract.mjs
  node .\scripts\supply-chain\Test-ContainerTechnicalSmokeContract.mjs
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-ContainerVulnerabilityScanning.ps1
  ```

- [ ] **Step 2: Run the canonical live sequence**

  ```powershell
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-ContainerBaseImageResolution.ps1
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Invoke-ContainerImageBuild.ps1
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Invoke-ContainerTechnicalSmoke.ps1
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Invoke-ContainerVulnerabilityScanning.ps1
  ```

  Record the actual image ID/digest, platform, JAR hash, smoke result, Trivy DB `UpdatedAt`, detection classes, severity counts, disposition counts, and final policy result. Do not paste raw reports or absolute paths.

- [ ] **Step 3: Run prior-cycle regressions**

  ```powershell
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-SupplyChainTooling.ps1
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-IdentitySbom.ps1 -SkipBuild
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-VulnerabilityScanning.ps1
  git diff --check
  ```

- [ ] **Step 4: Apply the Cycle 5 exit gate**

  ```text
  [PASS] Reviewed Corretto tag/index/platform/source still match committed trust
  [PASS] Prebuilt executable JAR and Cycle 2 SBOM validate before Docker
  [PASS] Docker build context contains only Dockerfile and canonical JAR
  [PASS] Local image is linux/amd64 and matches runtime contract
  [PASS] Hardened smoke reaches readiness UP and leaves no container behind
  [PASS] Trivy DB freshness and scanner execution complete
  [PASS] OS-package and Java-library detections are present
  [PASS] Raw report/temp artifacts are removed; sanitized inventory only
  [PASS or BLOCKED] High/Critical policy evaluates honestly
  [PASS] Cycle 1–3 regressions and diff checks pass
  [PASS] No Cycle 6 workflow files are included in Cycle 5 commits
  ```

- [ ] **Step 5: Record non-claims explicitly**

  The guide and sprint evidence must state that Cycle 5 does not claim hosted CI, ECR publishing, Inspector, image signing, AWS deployment, global platform security, or release readiness when policy is BLOCKED.

- [ ] **Step 6: Commit documentation separately**

  ```powershell
  git add docs/guides/S001-T07-cycle-5-container.md docs/sprints/SPRINT_001.md
  git commit -m "docs(supply-chain): record Cycle 5 container evidence"
  ```

## Production Rulings Carried by This Plan

- Docker documentation confirms `.dockerignore` rules govern the full build context and `buildx --load` imports a single-platform result into the local daemon; Cycle 5 therefore uses a default-deny context and `--platform linux/amd64 --load`.
- Trivy documentation shows `--skip-db-update` alone does not disable every network path; Cycle 5 also pins `--skip-vex-repo-update`, `--skip-version-check`, uses the local Docker image source, and relies on the repository DB-freshness gate. Any remaining unexpected network dependency is a fail-closed investigation, not permission to broaden access silently.
- The current uncommitted guide's `29 High / 37 Medium` values are not trusted as plan inputs. They may be recorded only if a fresh Cycle 5 execution reproduces them.
- Cycle 5 may finish implementation with policy BLOCKED. T07 remains `IN_PROGRESS` until Cycle 6 supplies hosted-CI execution evidence and all S001-T07 acceptance criteria are reconciled.
