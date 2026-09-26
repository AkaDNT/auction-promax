# S001-T07 Cycle 6 Hosted Supply-Chain CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the approved S001-T07 supply-chain controls on GitHub-hosted Linux, retain only validated sanitized evidence for 30 days, and expose execution integrity separately from release policy.

**Architecture:** Two dedicated workflows call one repository-owned PowerShell orchestrator. `supply-chain-verification` treats a correctly evaluated `POLICY_BLOCKED` result as execution success, while a separate `release-policy` job fails for unmatched High/Critical or secret findings. A scheduled/manual freshness workflow rebuilds the default branch and reports policy independently from vulnerability delta.

**Tech Stack:** GitHub Actions on `ubuntu-24.04`, PowerShell 7, Node.js 24.15.0, `yaml` 2.9.1, Ajv 8.20.0, Java 21/Maven Wrapper, Docker Buildx, Trivy 0.74.0, Gitleaks 8.30.0, Cosign 3.1.2 for Trivy provenance only.

**Spec:** `docs/superpowers/specs/2026-09-22-s001-t07-cycle-6-hosted-ci-design.md`

## Global Constraints

- Treat existing dirty Cycle 4/6 files as candidate implementations. Never reset, clean, overwrite, or stage an unrelated path.
- Current Cycle 5 state is implementation/integrity PASS and release policy BLOCKED; never summarize Cycle 5 as an unconditional PASS.
- Current `29 High / 0 Critical` is observed evidence, not a test constant. Fresh execution owns all counts.
- PR/push scans the triggered revision. Scheduled and manual freshness explicitly check out `${{ github.event.repository.default_branch }}`.
- Workflow permissions are exactly `contents: read`; all other scopes remain `none`.
- Prohibit `pull_request_target`, AWS credentials/OIDC, ECR login/push, Inspector, application signing/attestation, SARIF, and `security-events: write`.
- Pin external Actions to these reviewed full SHAs: checkout `11d5960a326750d5838078e36cf38b85af677262`, setup-java `cf277c60eb25467037889841efdb72551f06f6c3`, setup-node `49933ea5288caeca8642d1e84afbd3f7d6820020`, upload-artifact `ea165f8d65b6e75b540449e92b4886f43607fa02`.
- Supply-chain verification and freshness execution jobs use `ubuntu-24.04` and `timeout-minutes: 60`; release-policy jobs use `timeout-minutes: 5`.
- Hosted evidence root is `$RUNNER_TEMP/s001-t07-evidence/hosted`; local orchestration tests use `services/identity-profile-service/target/s001-t07-evidence/hosted`. Existing scanners first write their approved sanitized inventories under the ignored service `target` tree; the orchestrator validates and copies only allowlisted fields into hosted evidence. Raw work remains GUID-named under the OS temporary directory.
- Artifact retention is exactly 30 days with `if: always()` and `if-no-files-found: error`.
- A restored cache never replaces checksum, version, provenance, or Trivy `VulnerabilityDB.UpdatedAt` validation.
- Cosign verifies Trivy release provenance only. Never claim application-image signing.
- Do not create or commit a vulnerability delta baseline in Cycle 6. Until an approved source exists, freshness records `BASELINE_UNAVAILABLE`.
- `IMPLEMENTATION_FAILURE` makes verification fail. `POLICY_BLOCKED` makes verification pass and release-policy fail. `REVIEW_REQUIRED` remains visible and does not invalidate a verified immutable digest.

## Review Focus

- A policy exception thrown by a scanner must become `POLICY_BLOCKED`; a malformed report, broken executable, or evaluator crash must remain `IMPLEMENTATION_FAILURE`.
- Checkout/bootstrap failure must still leave an uploadable fallback summary without exposing runner paths or environment values.
- A fork PR or branch name must never influence freshness checkout, artifact paths, artifact names, or shell commands.
- Evidence upload must reject one extra file or field even when every scanner succeeded.
- Artifact reuse between prebuild and image build must bind the exact JAR SHA-256 and SBOM validation result so Cycle 6 never scans one artifact and images another.

---

### Task 0: Audit and freeze the dirty baseline

**Files:**
- Inspect only: `.github/workflows/api-baseline.yml`
- Inspect only: `.github/workflows/security-freshness.yml`
- Inspect only: `scripts/supply-chain/GitleaksScanning.psm1`
- Inspect only: `scripts/supply-chain/Invoke-GitleaksScanning.ps1`
- Inspect only: `scripts/supply-chain/Test-GitleaksScanning.ps1`
- Inspect only: `scripts/supply-chain/Test-GitleaksWorkingTreeSnapshot.ps1`
- Inspect only: `security/schemas/vulnerability-dispositions.schema.json`

**Interfaces:**
- Consumes: current dirty worktree.
- Produces: an explicit list of Cycle 6 candidate paths; no mutation.

- [ ] **Step 1: Record the exact baseline without creating a branch**

  ```powershell
  git status --short
  git branch --show-current
  git log -1 --oneline
  git diff -- .github/workflows/api-baseline.yml .github/workflows/security-freshness.yml
  ```

  Expected: the existing SHA-pin changes and freshness candidate are visible. Do not run `git clean`, `git reset`, `git add .`, `git commit -a`, or `git switch -c` while unrelated dirty files remain.

- [ ] **Step 2: Verify the carry-over fixes Cycle 6 depends on**

  ```powershell
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-GitleaksWorkingTreeSnapshot.ps1
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-GitleaksScanning.ps1
  node .\scripts\supply-chain\Test-VulnerabilityDispositionSchema.mjs
  ```

  Expected: PASS. If one fails, fix and commit that owning cycle separately before continuing; do not hide the repair in a Cycle 6 workflow commit.

### Task 1: Lock hosted-workflow structure with RED fixtures

**Files:**
- Modify: `contracts/package.json`
- Modify: `contracts/package-lock.json`
- Create: `security/tooling/hosted-supply-chain-contract.json`
- Create: `security/schemas/hosted-supply-chain-contract.schema.json`
- Create: `scripts/supply-chain/Test-HostedSupplyChainContract.mjs`
- Verify/modify: `.github/workflows/api-baseline.yml`

**Interfaces:**
- Consumes: YAML text and the repository-owned hosted workflow contract.
- Produces: `validateWorkflowSet({baseline, supplyChain, freshness})`, which returns no value or throws one `HOSTED_WORKFLOW_*` code.

- [ ] **Step 1: Add the exact YAML parser dependency**

  ```powershell
  npm.cmd --prefix .\contracts install --save-dev --save-exact yaml@2.9.1
  ```

  Confirm `package.json` contains `"yaml": "2.9.1"` and the lockfile changes only through npm.

- [ ] **Step 2: Write the contract and strict schema first**

  The contract fixes workflow paths, job/check names, runners, timeouts, action identities/SHAs, triggers, evidence path, retention, and dependency edges. The schema uses `additionalProperties: false` at every object boundary and requires this action map:

  ```json
  {
    "checkout": "11d5960a326750d5838078e36cf38b85af677262",
    "setupJava": "cf277c60eb25467037889841efdb72551f06f6c3",
    "setupNode": "49933ea5288caeca8642d1e84afbd3f7d6820020",
    "uploadArtifact": "ea165f8d65b6e75b540449e92b4886f43607fa02"
  }
  ```

- [ ] **Step 3: Add the RED mutation matrix**

  Independently reject: missing workflow, malformed YAML, duplicate YAML keys, `pull_request_target`, missing push/PR/manual trigger, default-branch checkout in PR/push, non-default checkout in freshness, permissions beyond `contents: read`, `id-token`, packages/security-events write, mutable Action refs, unknown remote Action, container action without digest, shallow checkout, persisted credentials, wrong runner, absent/wrong timeout, unsafe concurrency, `continue-on-error`, AWS or Docker registry actions/commands, SARIF, wildcard upload, wrong retention, missing `always()`, missing `if-no-files-found: error`, branch-controlled artifact name, and each prohibited dependency-edge reversal from the spec.

  The validator identifies stages by stable `id` values and asserts a partial order; it must not assert absolute step indexes.

- [ ] **Step 4: Run the contract fixtures GREEN before creating workflows**

  ```powershell
  npm.cmd --prefix .\contracts ci
  node .\scripts\supply-chain\Test-HostedSupplyChainContract.mjs --fixtures
  ```

  Expected: all synthesized canonical and negative fixture cases PASS without reading repository workflow candidates. Running the same script later with `--repository` validates the real three-file workflow set.

- [ ] **Step 5: Bring only the baseline workflow hardening GREEN**

  Audit the existing full-SHA changes in `api-baseline.yml`; add `persist-credentials: false` to each checkout. Do not add supply-chain jobs to this workflow.

- [ ] **Step 6: Commit the contract foundation**

  ```powershell
  git add contracts/package.json contracts/package-lock.json security/tooling/hosted-supply-chain-contract.json security/schemas/hosted-supply-chain-contract.schema.json scripts/supply-chain/Test-HostedSupplyChainContract.mjs .github/workflows/api-baseline.yml
  git commit -m "test(supply-chain): lock hosted workflow contract"
  ```

  This commit must be GREEN in `--fixtures` mode. Repository mode remains intentionally unavailable until Task 4 supplies the first new workflow.

### Task 2: Implement the run-summary state machine and evidence validator

**Files:**
- Create: `security/schemas/supply-chain-run-summary.schema.json`
- Create: `security/schemas/hosted-supply-chain-evidence.schema.json`
- Create: `scripts/supply-chain/HostedSupplyChain.psm1`
- Create: `scripts/supply-chain/Test-HostedSupplyChain.ps1`
- Create: `scripts/supply-chain/Validate-HostedSupplyChainEvidence.mjs`
- Create: `scripts/supply-chain/Test-HostedSupplyChainEvidence.mjs`

**Interfaces:**
- Produces: `Read-HostedRunSummary`, `Write-HostedRunSummaryAtomic`, `Set-HostedStageResult`, `Complete-HostedExecution`, `Test-HostedPolicyBlockedFailure`, and `Remove-HostedTemporaryRoot`.
- Summary enums: `executionState=IMPLEMENTATION_FAILURE|PASS`, `policyState=NOT_EVALUATED|PASS|BLOCKED`, `reviewState=NOT_REQUIRED|REVIEW_REQUIRED`, `deltaState=NOT_APPLICABLE|UNCHANGED|NEW|REMEDIATED|BASELINE_UNAVAILABLE`.

- [ ] **Step 1: Write RED state-transition tests**

  Cover invalid initial PASS, short/nonhex commit, unknown workflow/state/failure code, path leakage, unknown property, direct `IMPLEMENTATION_FAILURE -> policy PASS`, policy block before completed scans, REVIEW_REQUIRED clearing immutable verification, non-atomic partial JSON, unexpected evidence filename/field, symlink/reparse evidence entry, raw scanner field, absolute path, secret/source content, commit mismatch, and missing required evidence.

- [ ] **Step 2: Run RED**

  ```powershell
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-HostedSupplyChain.ps1
  node .\scripts\supply-chain\Test-HostedSupplyChainEvidence.mjs
  ```

  Expected: fail because the module and validators are absent.

- [ ] **Step 3: Implement the minimal state machine**

  Initial summary is exactly:

  ```json
  {"schemaVersion":1,"workflow":"supply-chain","commit":"0123456789abcdef0123456789abcdef01234567","executionState":"IMPLEMENTATION_FAILURE","policyState":"NOT_EVALUATED","reviewState":"NOT_REQUIRED","deltaState":"NOT_APPLICABLE","failureCode":"SUPPLY_CHAIN_NOT_STARTED"}
  ```

  Allowed sanitized failure codes are fixed in the JSON schema: `SUPPLY_CHAIN_NOT_STARTED`, `CHECKOUT_FAILED`, `CONTRACT_VALIDATION_FAILED`, `TOOL_BOOTSTRAP_FAILED`, `SBOM_BUILD_FAILED`, `SBOM_VALIDATION_FAILED`, `DEPENDENCY_SCAN_FAILED`, `SECRET_SCAN_FAILED`, `BASE_TRUST_FAILED`, `IMAGE_BUILD_FAILED`, `SMOKE_FAILED`, `CONTAINER_SCAN_FAILED`, `SCANNER_OUTPUT_INVALID`, `POLICY_EVALUATION_FAILED`, `EVIDENCE_SANITIZATION_FAILED`, `EVIDENCE_VALIDATION_FAILED`, `EVIDENCE_UPLOAD_FAILED`, and `CLEANUP_FAILED`.

- [ ] **Step 4: Implement exact evidence allowlisting**

  Allow only these files beneath the hosted evidence root:

  ```text
  run-summary.json
  vulnerability-inventory.json
  gitleaks-inventory.json
  container-vulnerability-inventory.json
  image-identity.json
  smoke-summary.json
  policy-summary.json
  ```

  Reject subdirectories, symlinks/reparse points, empty/malformed JSON, an unexpected field, absolute path, raw scanner keys (`Secret`, `Match`, `Line`, `Description`, `PrimaryURL`, `References`), and commit mismatch.

- [ ] **Step 5: Run GREEN and commit**

  ```powershell
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-HostedSupplyChain.ps1
  node .\scripts\supply-chain\Test-HostedSupplyChainEvidence.mjs
  git add security/schemas/supply-chain-run-summary.schema.json security/schemas/hosted-supply-chain-evidence.schema.json scripts/supply-chain/HostedSupplyChain.psm1 scripts/supply-chain/Test-HostedSupplyChain.ps1 scripts/supply-chain/Validate-HostedSupplyChainEvidence.mjs scripts/supply-chain/Test-HostedSupplyChainEvidence.mjs
  git commit -m "feat(supply-chain): classify hosted verification outcomes"
  ```

### Task 3: Build the hosted orchestrator with deterministic adapters

**Files:**
- Create: `scripts/supply-chain/Invoke-HostedSupplyChain.ps1`
- Create: `scripts/supply-chain/Test-HostedSupplyChainOrchestration.ps1`
- Create: `scripts/supply-chain/Invoke-HostedReleasePolicy.ps1`
- Modify: `scripts/supply-chain/Invoke-ContainerImageBuild.ps1`
- Modify: `scripts/supply-chain/Test-ContainerImageBuildContract.mjs`

**Interfaces:**
- `Invoke-HostedSupplyChain.ps1` accepts mandatory `WorkflowName` (`supply-chain` or `security-freshness`), mandatory lowercase 40-hex `CommitSha`, mandatory `EvidenceRoot`, and optional `RefreshDatabase`.
- Exit `0`: machinery complete with policy PASS or BLOCKED, or immutable trust PASS with REVIEW_REQUIRED.
- Exit nonzero: implementation failure only.
- When `$env:GITHUB_OUTPUT` exists, emit only `policy_state`, `review_state`, and `summary_sha256`.
- `Invoke-HostedReleasePolicy.ps1` accepts mandatory `SummaryPath`, exits `0` only for policy PASS, and exits `1` for BLOCKED; NOT_EVALUATED is an implementation failure.

- [ ] **Step 1: Write the fake-adapter RED matrix**

  Tests must not call Docker, GitHub, Maven, registry, Trivy, Gitleaks, or network. Inject adapters for each existing Cycle 1–5 command and cover: bootstrap fail, SBOM build/validation fail, dependency scanner process fail, dependency policy block, Gitleaks execution fail, secret-policy block, immutable base failure, mutable drift review, image build/hash mismatch, smoke fail, container scanner fail, container policy block, sanitizer fail, evidence extra file, cleanup fail, PASS, and combined REVIEW_REQUIRED plus POLICY_BLOCKED.

- [ ] **Step 2: Run RED**

  ```powershell
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-HostedSupplyChainOrchestration.ps1
  ```

- [ ] **Step 3: Add verified-artifact reuse to image build**

  Add `-UseExistingVerifiedArtifact` to `Invoke-ContainerImageBuild.ps1`. In that mode it reruns prebuild validation without Maven, recomputes the canonical JAR SHA-256, validates `target/bom.json`, and rejects any mismatch before Docker. The build still hashes the JAR before and after Docker. The contract test must reject a blind skip-build mode or a receipt/JAR mismatch.

- [ ] **Step 4: Implement the orchestrator using existing entrypoints**

  Invoke, in order:

  ```text
  Test-HostedSupplyChainContract.mjs
  Install-SupplyChainTools.ps1
  Invoke-ContainerPrebuildArtifact.ps1
  Invoke-VulnerabilityScanning.ps1 with a refreshed and freshness-validated database (PR/push and freshness)
  Invoke-GitleaksScanning.ps1
  Test-ContainerBaseImageResolution.ps1
  Invoke-ContainerImageBuild.ps1 -UseExistingVerifiedArtifact
  Invoke-ContainerTechnicalSmoke.ps1
  Invoke-ContainerVulnerabilityScanning.ps1
  Validate-HostedSupplyChainEvidence.mjs
  ```

  Catch only exact repository-owned policy codes as `POLICY_BLOCKED`. All unknown errors are implementation failures. Always remove the exact GUID temporary root; cleanup failure overrides execution PASS but preserves the primary sanitized failure code in `policy-summary.json`.

- [ ] **Step 5: Generate summaries from sanitized inputs only**

  `image-identity.json` contains schemaVersion, commit, local image ID, platform, base manifest digest, JAR SHA-256. `smoke-summary.json` contains schemaVersion, commit, readiness status, runtime UID/GID, platform, and hardening booleans. `policy-summary.json` contains counts by severity/status and no finding detail.

- [ ] **Step 6: Run GREEN and existing Cycle 5 contracts**

  ```powershell
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-HostedSupplyChainOrchestration.ps1
  node .\scripts\supply-chain\Test-ContainerImageBuildContract.mjs
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-ContainerVulnerabilityScanning.ps1
  ```

- [ ] **Step 7: Commit**

  ```powershell
  git add scripts/supply-chain/Invoke-HostedSupplyChain.ps1 scripts/supply-chain/Test-HostedSupplyChainOrchestration.ps1 scripts/supply-chain/Invoke-HostedReleasePolicy.ps1 scripts/supply-chain/Invoke-ContainerImageBuild.ps1 scripts/supply-chain/Test-ContainerImageBuildContract.mjs
  git commit -m "feat(supply-chain): orchestrate hosted verification"
  ```

### Task 4: Implement the PR/push supply-chain workflow

**Files:**
- Create: `.github/workflows/supply-chain.yml`
- Modify: `scripts/supply-chain/Test-HostedSupplyChainContract.mjs`

**Interfaces:**
- Produces checks named exactly `supply-chain-verification` and `release-policy`.

- [ ] **Step 1: Prove repository mode is RED**

  ```powershell
  node .\scripts\supply-chain\Test-HostedSupplyChainContract.mjs --repository
  ```

  Expected: `HOSTED_WORKFLOW_SUPPLY_CHAIN_MISSING`.

- [ ] **Step 2: Add the workflow and keep the contract RED until complete**

  Use triggers `push`, `pull_request`, and `workflow_dispatch`; `permissions: contents: read`; concurrency `supply-chain-${{ github.workflow }}-${{ github.ref }}` with cancellation; verification timeout 60; release timeout 5.

  The verification job must:

  1. Initialize `$RUNNER_TEMP/s001-t07-evidence/hosted/run-summary.json` before checkout using only `GITHUB_SHA` and fixed literals.
  2. Checkout the triggered revision with full history and no persisted credentials.
  3. Setup Java/Node using the pinned SHAs.
  4. Run `npm ci` in `contracts`.
  5. Run workflow contract validation.
  6. Execute `Invoke-HostedSupplyChain.ps1` with the triggered SHA.
  7. Validate evidence.
  8. Upload the exact evidence directory using upload-artifact SHA `ea165f8d65b6e75b540449e92b4886f43607fa02`, `if: always()`, retention 30, and missing-files error.

  The final verification step fails if upload or validation failed. Policy BLOCKED alone must not fail it.

- [ ] **Step 3: Implement the separate release-policy job**

  It uses `needs: supply-chain-verification`, runs only when verification succeeded, consumes the sanitized `policy_state` job output, and exits nonzero for BLOCKED. It does not checkout source, download artifacts, or receive credentials.

- [ ] **Step 4: Run the workflow contract GREEN**

  ```powershell
  node .\scripts\supply-chain\Test-HostedSupplyChainContract.mjs --repository
  ```

  Expected: supply-chain workflow PASS; freshness candidate may remain RED until Task 5.

- [ ] **Step 5: Commit**

  ```powershell
  git add .github/workflows/supply-chain.yml scripts/supply-chain/Test-HostedSupplyChainContract.mjs
  git commit -m "ci(supply-chain): add hosted verification gate"
  ```

### Task 5: Implement default-branch freshness verification

**Files:**
- Verify/modify: `.github/workflows/security-freshness.yml`
- Modify: `scripts/supply-chain/Test-HostedSupplyChainContract.mjs`
- Modify: `scripts/supply-chain/HostedSupplyChain.psm1`
- Modify: `scripts/supply-chain/Test-HostedSupplyChain.ps1`

**Interfaces:**
- Produces checks `security-freshness-verification` and `freshness-release-policy`.
- Produces `deltaState=BASELINE_UNAVAILABLE` until an independently approved comparison source exists.

- [ ] **Step 1: Prove the candidate is RED**

  ```powershell
  node .\scripts\supply-chain\Test-HostedSupplyChainContract.mjs --repository
  ```

  Expected: a sanitized freshness contract failure such as `HOSTED_WORKFLOW_FRESHNESS_DEFAULT_BRANCH_REQUIRED`; never accept the existing candidate merely because it parses as YAML.

- [ ] **Step 2: Audit the candidate instead of overwriting it**

  Preserve its reviewed cron `17 3 * * *`, action SHAs, runner, and direct repository script approach where compatible. Replace the incomplete container-only job with the hosted orchestrator.

- [ ] **Step 3: Force canonical checkout for both triggers**

  Configure checkout with:

  ```yaml
  ref: ${{ github.event.repository.default_branch }}
  fetch-depth: 0
  persist-credentials: false
  ```

  Concurrency is `security-freshness-${{ github.workflow }}-${{ github.event.repository.default_branch }}` with `cancel-in-progress: false`.

- [ ] **Step 4: Refresh and validate the DB, then run the complete flow**

  Invoke the orchestrator with `-WorkflowName security-freshness -RefreshDatabase`. The summary must retain policy PASS/BLOCKED independently from `deltaState=BASELINE_UNAVAILABLE`; unchanged findings never imply policy PASS.

- [ ] **Step 5: Add separate freshness release-policy and evidence upload**

  Mirror the PR workflow separation and evidence constraints. Artifact name is `security-freshness-${{ github.sha }}`; no branch/ref name is accepted.

- [ ] **Step 6: Run GREEN and commit**

  ```powershell
  node .\scripts\supply-chain\Test-HostedSupplyChainContract.mjs --repository
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-HostedSupplyChain.ps1
  git add .github/workflows/security-freshness.yml scripts/supply-chain/Test-HostedSupplyChainContract.mjs scripts/supply-chain/HostedSupplyChain.psm1 scripts/supply-chain/Test-HostedSupplyChain.ps1
  git commit -m "ci(supply-chain): add default-branch freshness gate"
  ```

### Task 6: Run local Cycle 1–6 regression and publish the runbook

**Files:**
- Create: `docs/guides/S001-T07-cycle-6-hosted-ci.md`
- Modify after actual execution: `docs/sprints/SPRINT_001.md`

**Interfaces:**
- Produces: local implementation evidence and an honest hosted-execution checklist.

- [ ] **Step 1: Run deterministic Cycle 6 gates**

  ```powershell
  npm.cmd --prefix .\contracts ci
  node .\scripts\supply-chain\Test-HostedSupplyChainContract.mjs --fixtures
  node .\scripts\supply-chain\Test-HostedSupplyChainContract.mjs --repository
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-HostedSupplyChain.ps1
  node .\scripts\supply-chain\Test-HostedSupplyChainEvidence.mjs
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-HostedSupplyChainOrchestration.ps1
  ```

- [ ] **Step 2: Run Cycle 1–5 regressions**

  ```powershell
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-SupplyChainTooling.ps1
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-IdentitySbom.ps1 -SkipBuild
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-VulnerabilityScanning.ps1
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-GitleaksWorkingTreeSnapshot.ps1
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-GitleaksScanAdapters.ps1
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-GitleaksScanning.ps1
  node .\scripts\supply-chain\Test-ContainerBaseImageTrust.mjs
  node .\scripts\supply-chain\Test-ContainerImageContract.mjs
  node .\scripts\supply-chain\Test-DockerfilePolicy.mjs
  node .\scripts\supply-chain\Test-ContainerImageBuildContract.mjs
  node .\scripts\supply-chain\Test-ContainerTechnicalSmokeContract.mjs
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-ContainerVulnerabilityScanning.ps1
  git diff --check
  ```

- [ ] **Step 3: Run one local end-to-end classification**

  Invoke `Invoke-HostedSupplyChain.ps1` with the current full commit SHA and an ignored hosted evidence root. Expected today: exit 0, `executionState=PASS`, actual policy PASS or BLOCKED, exact inventory-derived counts, no raw/temp leftovers. Do not assert 29.

- [ ] **Step 4: Write the runbook and local evidence**

  Document exact commands, state semantics, evidence allowlist, expected branch checks, default-branch freshness behavior, action SHAs, current actual counts, and non-claims. Do not claim hosted execution yet.

- [ ] **Step 5: Commit documentation separately**

  ```powershell
  git add docs/guides/S001-T07-cycle-6-hosted-ci.md docs/sprints/SPRINT_001.md
  git commit -m "docs(supply-chain): document Cycle 6 hosted gates"
  ```

### Task 7: Collect real hosted evidence

**Files:**
- Modify after verified runs: `docs/guides/S001-T07-cycle-6-hosted-ci.md`
- Modify after verified runs: `docs/sprints/SPRINT_001.md`

**Interfaces:**
- Consumes: GitHub-hosted run UI/API controlled by the repository owner.
- Produces: run IDs/URLs or private references, check outcomes, artifact audit, and current counts. Never fabricate these values.

- [ ] **Step 1: Push the reviewed branch and open a PR**

  Do this only after the user authorizes external GitHub changes. The PR/push run must scan its triggered SHA.

- [ ] **Step 2: Verify the hosted PR/push run**

  Record runner OS, triggered SHA, full-history result, execution state, policy state, review state, actual severity counts, OS/Java detection, and the two check outcomes. Expected semantics with unresolved findings are verification PASS and release-policy FAIL.

- [ ] **Step 3: Audit the downloaded artifact**

  Confirm the exact seven-file allowlist, schema validity, commit binding, 30-day retention, no raw reports, no absolute paths, no secret/source content, and no unexpected files.

- [ ] **Step 4: Run freshness manually from the default branch**

  The workflow definition must already exist on the default branch. Confirm checkout resolved to the default branch head even if the dispatch UI selected another ref. Record fresh DB `UpdatedAt`, policy state, `deltaState`, detections, and artifact audit.

- [ ] **Step 5: Commit only real hosted evidence references**

  ```powershell
  git add docs/guides/S001-T07-cycle-6-hosted-ci.md docs/sprints/SPRINT_001.md
  git commit -m "docs(supply-chain): record Cycle 6 hosted evidence"
  ```

### Task 8: Configure or hand off branch protection and reconcile S001-T07

**Files:**
- Create when configuration is unavailable: `docs/governance/S001-T07_BRANCH_PROTECTION_HANDOFF.md`
- Modify: `docs/sprints/SPRINT_001.md`
- Modify: `docs/DELIVERY_STATE.md`

**Interfaces:**
- Produces: confirmed required check `supply-chain-verification`, or an owner-operated handoff naming that exact check.

- [ ] **Step 1: Configure the ruleset only with explicit repository authority**

  Require `supply-chain-verification`. Do not require `release-policy` in Phase 0. If authority/API access is unavailable, write the handoff instead and state that branch protection is not configured.

- [ ] **Step 2: Apply the final exit gate**

  ```text
  [PASS] Local workflow contracts and negative fixtures
  [PASS] Full-SHA Action pins and least privilege
  [PASS] Hosted PR/push execution for the triggered revision
  [PASS] Default-branch manual/scheduled freshness execution
  [PASS] Execution/integrity check
  [PASS or BLOCKED] Separate release policy
  [PASS] OS-package and Java-library detections
  [PASS] Seven-file sanitized artifact and 30-day retention
  [PASS] Raw/temp cleanup
  [PASS] Cycle 1–5 regressions
  [PASS or HANDOFF] Branch protection requirement
  [PASS] AWS/ECR/Inspector/signing/SARIF non-claims
  ```

- [ ] **Step 3: Reconcile task status honestly**

  Mark S001-T07 complete only when hosted evidence and all acceptance criteria are present. A completed Cycle 6 may coexist with `release-policy=BLOCKED`; documentation must still say release-ready `NO`.

- [ ] **Step 4: Commit closeout paths explicitly**

  ```powershell
  git add docs/sprints/SPRINT_001.md docs/DELIVERY_STATE.md
  if (Test-Path .\docs\governance\S001-T07_BRANCH_PROTECTION_HANDOFF.md) { git add docs/governance/S001-T07_BRANCH_PROTECTION_HANDOFF.md }
  git commit -m "docs(supply-chain): reconcile S001-T07 hosted evidence"
  ```

## Production Rulings Carried by This Plan

- The execution-integrity check is the Phase 0 required check; policy remains separately visible and blocks release, not ordinary source integration, while the approved upstream base is unresolved.
- `upload-artifact` is a transport after validation, not a sanitizer. One unexpected file prevents upload.
- GitHub caches are untrusted performance inputs and are revalidated before use.
- A manual freshness dispatch cannot make an arbitrary branch canonical by selecting it in the UI.
- Delta is supplementary. Without an approved comparison source it is `BASELINE_UNAVAILABLE`; current findings still determine policy.
- Hosted run IDs, artifact contents, branch rules, and check outcomes are external evidence and may only be recorded after direct verification.
