# S001-T07 Cycle 2 Identity SBOM Implementation and Re-verification Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate the Identity service CycloneDX 1.6 JSON SBOM on the canonical Maven build path, validate it against an offline checksummed trust set, enforce service-specific semantics, and prove two clean builds are semantically reproducible.

**Architecture:** Maven remains the only SBOM producer and writes `services/identity-profile-service/target/bom.json`. Repository-owned Node validators verify the committed CycloneDX schema trust set, JSON Schema validity, Identity-specific invariants, and approved semantic normalization; a PowerShell orchestrator provides one fail-closed local/CI entry point. The repository already contains a Cycle 2 implementation in commit `ecfd72e`, so this plan is also the authoritative independent re-verification path: change code only when a RED gate exposes drift.

**Tech Stack:** Java 21, Maven Wrapper, CycloneDX Maven Plugin `2.9.2`, CycloneDX JSON Schema `1.6`, Node.js, Ajv from `contracts/node_modules`, PowerShell 7/Windows PowerShell 5.1-compatible orchestration.

**Spec:** `docs/decisions/S001-T07_SUPPLY_CHAIN_DECISIONS.md`, section 5; task acceptance criteria and evidence in `docs/sprints/SPRINT_001.md`, S001-T07.

## Global Constraints

- Canonical SBOM path is `services/identity-profile-service/target/bom.json`.
- CycloneDX Maven Plugin is pinned to `2.9.2`; CycloneDX schema is pinned to `1.6`.
- Use the Maven Wrapper; do not introduce a global Maven dependency.
- The Maven execution must use `makeBom`, JSON output named `bom`, `${project.build.directory}`, and `includeTestScope=false`.
- Root identity is exactly `com.auctionpromax:identity-profile-service:0.0.1-SNAPSHOT`, type `application`.
- Components and dependency graph must both be non-empty; the root dependency node must exist.
- Generated SBOMs, temporary fixtures, and raw evidence are never committed.
- Schema validation is offline and fail-closed against the three committed, checksummed CycloneDX assets only.
- Reproducibility compares two independent `clean package` outputs semantically; only root `serialNumber` and `metadata.timestamp` may be ignored.
- `-SkipBuild` validates an existing artifact and must never claim clean-build reproducibility.
- Cycle 2 does not run Trivy, Gitleaks, container scans, image signing, SARIF upload, or AWS deployment work.
- Do not modify unrelated dirty Cycle 4/5 files in the working tree.

## Review Focus

- A valid-looking manifest with a changed source URL, checksum, asset order, extra asset, or placeholder checksum must fail before any SBOM is trusted; Task 1 pins these cases.
- Missing locally referenced SPDX/JSF schemas must fail without network fallback; Task 1 removes each reference in fixtures and expects failure.
- Duplicate component/dependency references and a missing root dependency node must fail; Task 2 pins graph integrity.
- Reordering arrays must not cause false drift, while any component version or dependency-edge change must fail; Task 2 pins both sides of normalization.
- Test-only JUnit, Testcontainers, and ArchUnit components must fail even if the document is schema-valid; Task 2 pins scope leakage.

---

### Task 1: Lock the offline CycloneDX 1.6 trust set

**Files:**
- Verify/create: `security/tooling/cyclonedx-schemas.json`
- Verify/create: `security/schemas/cyclonedx-schemas.schema.json`
- Verify/vendor: `security/schemas/cyclonedx/1.6/bom-1.6.schema.json`
- Verify/vendor: `security/schemas/cyclonedx/1.6/spdx.schema.json`
- Verify/vendor: `security/schemas/cyclonedx/1.6/jsf-0.82.schema.json`
- Test: `scripts/supply-chain/Test-CycloneDxSchemaTrust.mjs`

**Interfaces:**
- Consumes: pinned Ajv installed by `npm --prefix .\contracts ci`.
- Produces: a validated manifest with `schemaVersion=1`, `specVersion=1.6`, the official `1.6/schema` source URL, and exactly three trusted assets available to Task 2.

- [ ] **Step 1: Establish the RED trust-contract matrix**

  Add/verify deterministic cases in `Test-CycloneDxSchemaTrust.mjs` for canonical acceptance and rejection of wrong source, zero checksum, wrong checksum, changed order, an extra asset, a missing asset file, and missing `spdx.schema.json` or `jsf-0.82.schema.json`. Every failure assertion must use sanitized identifiers, never raw schema contents.

- [ ] **Step 2: Run the trust test before changing production files**

  ```powershell
  npm --prefix .\contracts ci
  node .\scripts\supply-chain\Test-CycloneDxSchemaTrust.mjs
  ```

  Expected on a clean current branch: PASS. If a newly added case fails, preserve the exact failing case as the RED test and continue; do not weaken the assertion.

- [ ] **Step 3: Pin the exact trust manifest**

  The canonical values are:

  ```text
  bom-1.6.schema.json  3e92dddbc30cf7f6a02b80f0942b1a4cfd4fb1c26f1dfc4310afa9d613cafb93
  spdx.schema.json     baa9d3bd1ed57b6751b0887edead6b5063ff53ff7429cf85d476c6c94af0166e
  jsf-0.82.schema.json 8bae002c25e723db7ee1f26afde680ae1a2b1a8f6b4b4b0fd65dc3becb090aae
  ```

  `cyclonedx-schemas.schema.json` must reject additional properties, require this order, and bind every filename to its reviewed SHA-256. Never download schemas during validation.

- [ ] **Step 4: Compile the vendored root schema offline**

  Register the vendored SPDX and JSF documents with draft-07 Ajv, then compile `bom-1.6.schema.json`. An unresolved `$ref` is a hard failure. Do not add an HTTP resolver or fallback.

- [ ] **Step 5: Re-run and commit only if Task 1 changed files**

  ```powershell
  node .\scripts\supply-chain\Test-CycloneDxSchemaTrust.mjs
  git diff --check
  git add security/tooling/cyclonedx-schemas.json security/schemas/cyclonedx-schemas.schema.json security/schemas/cyclonedx/1.6 scripts/supply-chain/Test-CycloneDxSchemaTrust.mjs
  git commit -m "test(supply-chain): harden CycloneDX schema trust"
  ```

  Expected: `CycloneDX schema trust tests: PASS`. Skip the commit when the current implementation already satisfies every gate.

### Task 2: Enforce Identity SBOM schema, semantics, and normalization

**Files:**
- Test: `scripts/supply-chain/Test-IdentitySbomFixtures.mjs`
- Verify/create: `scripts/supply-chain/Validate-IdentitySbom.mjs`

**Interfaces:**
- Consumes CLI: `node Validate-IdentitySbom.mjs --bom <path> --schema-root <dir> --trust-manifest <path> [--reference-bom <path>]`.
- Produces exit `0` with `Identity SBOM validation: PASS (components=N, dependencies=N)`, or exit `1` with exactly one sanitized `Identity SBOM validation: FAIL (<CODE>)` message.

- [ ] **Step 1: Pin the fixture matrix before validator changes**

  Cover at least these cases with an exact expected failure code: missing/empty/malformed BOM; wrong `bomFormat`/`specVersion`; missing or wrong root type/group/name/version; missing/empty components or dependencies; missing root dependency; duplicate component/dependency refs; each forbidden test family (`org.junit.jupiter`, `org.testcontainers`, `com.tngtech.archunit`); missing referenced schema; altered trust checksum; serial/timestamp-only difference accepted; array reorder accepted; component-version drift rejected; dependency-edge drift rejected; duplicate and unsupported CLI arguments rejected.

- [ ] **Step 2: Run fixtures to prove any newly required behavior is RED**

  ```powershell
  node .\scripts\supply-chain\Test-IdentitySbomFixtures.mjs
  ```

  The test requires a canonical generated BOM. If it is absent, first run:

  ```powershell
  .\services\identity-profile-service\mvnw.cmd -B -f .\services\identity-profile-service\pom.xml clean package -DskipTests
  ```

- [ ] **Step 3: Keep validator responsibilities explicit**

  Implement/verify this sequence in `Validate-IdentitySbom.mjs`: strict CLI parsing; trust-manifest schema validation; SHA-256 verification of all three local schemas; offline schema compilation; BOM schema validation; Identity semantic checks; optional reference validation; normalized comparison. Unknown exceptions map to `UNEXPECTED_VALIDATION_FAILURE`; paths, schema bodies, and dependency contents are not printed.

- [ ] **Step 4: Constrain normalization to approved volatility**

  Deep-clone the BOM, remove only root `serialNumber` and `metadata.timestamp`, recursively sort object keys, sort `components` by `bom-ref`, sort `dependencies` by `ref`, and sort each `dependsOn` array. Do not remove hashes, licenses, versions, purls, properties, dependency edges, tool metadata, or component timestamps.

- [ ] **Step 5: Run Task 2 gates and commit only if changed**

  ```powershell
  node .\scripts\supply-chain\Test-IdentitySbomFixtures.mjs
  node .\scripts\supply-chain\Validate-IdentitySbom.mjs --bom .\services\identity-profile-service\target\bom.json --schema-root .\security\schemas\cyclonedx\1.6 --trust-manifest .\security\tooling\cyclonedx-schemas.json
  git diff --check
  git add scripts/supply-chain/Test-IdentitySbomFixtures.mjs scripts/supply-chain/Validate-IdentitySbom.mjs
  git commit -m "feat(supply-chain): validate identity SBOM semantics"
  ```

  Expected: every fixture passes and the canonical BOM reports non-zero component/dependency counts.

### Task 3: Prove Maven generation and two-build semantic reproducibility

**Files:**
- Verify: `services/identity-profile-service/pom.xml`
- Verify/create: `scripts/supply-chain/Test-IdentitySbom.ps1`
- Verify: `.gitignore`

**Interfaces:**
- Consumes: Maven Wrapper, Task 1 trust set, Task 2 validator.
- Produces: `Test-IdentitySbom.ps1 [-SkipBuild]`; normal mode proves two clean builds, while `-SkipBuild` validates one existing artifact without a reproducibility claim.

- [ ] **Step 1: Verify the Maven producer rather than adding a second producer**

  Confirm plugin `org.cyclonedx:cyclonedx-maven-plugin:2.9.2` executes `makeBom` during `package` with `schemaVersion=1.6`, `projectType=application`, `includeBomSerialNumber=true`, compile/provided/runtime/system scopes enabled as intended, `includeTestScope=false`, `outputFormat=json`, `outputName=bom`, and `outputDirectory=${project.build.directory}`. Keep `skipAttach=false` only if install/deploy attachment is intentional; it does not change canonical `target/bom.json` generation.

- [ ] **Step 2: Verify generated-output hygiene**

  ```powershell
  git check-ignore -v .\services\identity-profile-service\target\bom.json
  git ls-files --error-unmatch services/identity-profile-service/target/bom.json
  ```

  Expected: the first command identifies an ignore rule; the second exits non-zero because the generated SBOM is not tracked.

- [ ] **Step 3: Implement/verify fail-closed orchestration**

  In normal mode: require Node and Maven Wrapper; run Task 1; create an exact GUID-named temp directory; run first `clean package -DskipTests`; validate and copy the first BOM; run fixtures; run a second `clean package -DskipTests`; validate the second BOM using the first as `--reference-bom`; remove only the exact temp directory in `finally`. On either build failure, propagate non-zero status and do not reuse an older BOM.

- [ ] **Step 4: Pin `-SkipBuild` semantics**

  `-SkipBuild` must require an existing non-empty canonical BOM, run trust/schema/semantic/fixture validation, and print an explicit statement that no clean-build reproducibility claim was made. It must not silently build or compare the same file to itself.

- [ ] **Step 5: Run the canonical Cycle 2 gate**

  ```powershell
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-IdentitySbom.ps1
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-IdentitySbom.ps1 -SkipBuild
  ```

  Expected: trust tests PASS, fixture tests PASS, both clean builds validate, normalized outputs are equal, and `-SkipBuild` includes the non-reproducibility disclaimer.

- [ ] **Step 6: Commit only if Task 3 changed files**

  ```powershell
  git diff --check
  git add services/identity-profile-service/pom.xml scripts/supply-chain/Test-IdentitySbom.ps1 .gitignore
  git commit -m "feat(supply-chain): prove identity SBOM reproducibility"
  ```

### Task 4: Run regression gates and record honest evidence

**Files:**
- Modify only after fresh execution: `docs/sprints/SPRINT_001.md`
- Optional guide: `docs/guides/S001-T07-cycle-2-identity-sbom.md`

**Interfaces:**
- Consumes: Tasks 1–3 plus Cycle 1 tooling verification.
- Produces: reviewable evidence that states platform, commands, counts, and non-claims without committing the raw SBOM.

- [ ] **Step 1: Run the complete local verification sequence**

  ```powershell
  npm --prefix .\contracts ci
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-IdentitySbom.ps1
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-IdentitySbom.ps1 -SkipBuild
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-SupplyChainTooling.ps1
  git diff --check
  git status --short
  ```

  Expected: Cycle 2 and Cycle 1 gates PASS. `git status` may show the owner's pre-existing later-cycle work, but must not show `target/bom.json`, raw fixtures, or temp snapshots.

- [ ] **Step 2: Record evidence from this execution only**

  Add the execution date, OS/architecture, exact commands, component/dependency counts, fixture count, trust-set result, two-build semantic result, `-SkipBuild` disclaimer, and Cycle 1 regression result. State explicitly that byte equality is not claimed and that Linux/hosted CI, Trivy, Gitleaks, container scanning, policy disposition, and SARIF are later gates unless they were independently executed in their own cycles.

- [ ] **Step 3: Apply the Cycle 2 exit gate**

  Cycle 2 is complete only when all of the following are true:

  ```text
  [PASS] Maven package produces target/bom.json
  [PASS] Generated SBOM is ignored and untracked
  [PASS] Checksummed offline trust set passes and network fallback is impossible
  [PASS] JSON Schema and Identity semantic validation pass
  [PASS] Negative fixtures fail with their expected sanitized codes
  [PASS] Two independent clean builds are semantically equal after the two-field normalization
  [PASS] -SkipBuild validates without making a reproducibility claim
  [PASS] Cycle 1 regression and git diff checks pass
  [PASS] Evidence contains no raw SBOM, secrets, absolute user paths, or unsupported claims
  ```

- [ ] **Step 4: Commit evidence separately**

  ```powershell
  git add docs/sprints/SPRINT_001.md docs/guides/S001-T07-cycle-2-identity-sbom.md
  git commit -m "docs(supply-chain): record Cycle 2 SBOM evidence"
  ```

  Omit the guide path from `git add` if no guide was created. Never bundle unrelated Cycle 4/5 working-tree changes into this commit.

## Production Notes

- CycloneDX Maven Plugin `2.9.x` supports schema `1.6`; `makeBom` is the per-module goal. The plugin attaches BOM artifacts by default when `skipAttach=false`, but the canonical verification input remains `target/bom.json`.
- Counts such as 119 components and 120 dependencies are evidence from one dependency graph, not permanent policy constants. The invariant is non-empty, valid, test-scope-clean inventory plus reviewed semantic drift.
- A dependency upgrade that changes the normalized BOM should fail the comparison until both builds use the same resolved graph; it must not be hidden by expanding normalization.
- If a schema upgrade is desired, create a new approved decision record and a new checksummed trust set. Do not overwrite the `1.6` trust anchor silently.
