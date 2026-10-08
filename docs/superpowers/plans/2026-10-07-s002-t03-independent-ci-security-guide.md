# T03 — Independent CI and artifact-aware security: hướng dẫn tự chứa

> Execute task-by-task with the owner-approved DIRECT_SEQUENTIAL_ISOLATED_WORKTREE method using superpowers:executing-plans; scoped independent review remains required. Steps use checkbox syntax. No implementation is authorized by this draft alone.

**Goal:** CI chọn đúng service, build độc lập và supply-chain evidence bind đúng registry artifact/revision, giữ nguyên Identity compatibility và execution PASS khác policy BLOCKED.
**Architecture:** Closed T02 registry là nguồn identity duy nhất. Classifier cung cấp services JSON; matrix build/scan từng target; stable aggregate kiểm tra tập kết quả exact. PowerShell resolver truyền artifact identity xuyên suốt trusted scanner route; Node validator kiểm tra bảy sanitized summaries.
**Tech Stack:** Node 24.15.0, Java 21, Boot 3.5.16, wrapper 3.3.4/Maven 3.9.16, PowerShell 7 hosted Linux và Windows 5.1/7 nơi interface hỗ trợ; existing pinned Actions/tools/images/schema trust.
**Spec:** [Approved design](../specs/2026-10-05-s002-service-foundation-design.md).
**Parent:** [Sprint 002 plan](2026-10-05-s002-phase0-exit-and-service-foundation.md).
**Prerequisite:** [T02 published log](2026-10-07-s002-t02-execution-log.md).

Status: T03_IMPLEMENTATION_IN_PROGRESS_LOCAL. Owner approved Decisions 1 and 2 and Decision 3 with a pin-resolution gate on 2026-10-07. Official release/source review resolved the pin to `actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333` (tag v8.0.2); GitHub API reports signed commit verification `valid`. Its action metadata declares Node 24, `merge-multiple:false` and digest-mismatch `error`. The exact SHA/isolation contract and mutation negatives passed locally and were committed in `3dbe6f8`. On 2026-10-08 the owner approved service-matrix ownership exclusively in `supply-chain.yml` and `security-freshness.yml`, with `api-baseline.yml` and `monorepo-verification.yml` remaining unchanged, and authorized a candidate push/Draft PR solely for hosted Linux evidence after independent review. Initial implementation commit `024b25246cba2f6c097b7303730f9b3b2fc45300` received blocking/important findings; fixes are in progress and require review against the next exact commit SHA. No final candidate has been published or hosted-tested. Merge, branch-protection, deployment, AWS, and release authority are not granted.

## 1. Baseline, authority and explicit decisions

T02 PR20 merged into migration/monorepo: `03f1e7b7af93e68a4a47fbef3ea9c23d351ced24`, parents PR19 `6459baf17ae8a88aeceb5d5d24bc0c601ba6868b` and candidate `569451b129d12d87a86eb1110ee2f4b504f05c2a`, tree `603a369a99340f428c0bac47f89ea870277e336c`. Postmerge monorepo run 37605682647 and supply-chain-verification job in run 37605682664 SUCCESS; release-policy FAILURE/BLOCKED unchanged. Historical read-back is not a promise remote tip is unchanged.

Planning checkout is s002-design on work/s002-foundation-design. Local T02 closeout document commit `4f36b6a` is not published. Before execution create a fresh isolated T03 branch from exact published merge, preserve this planning document and local closeout commit without reset/stash/overwriting primary edits. Record HEAD/tree and dirty state. Do not implement T03 in the historical T02 publication branch.

Parent estimate T03 18–28h; total sprint 72–114h engineering plus 14–22h reserve, maximum136h, maximum4 engineering weeks. Checkpoint forecast after T03; owner/hosted waiting is additional elapsed time. No invented dates.

### Owner decisions — recorded 2026-10-07

1. **Pre-delivery matrix route — APPROVED:** registry-approved not-yet-delivered services may be generated ephemerally in isolated CI checkouts using T02. Generated source is never committed or uploaded as delivered source. Existing destinations are never regenerated. Previously tracked deleted service destinations fail `SERVICE_SOURCE_REMOVED`; absence alone does not justify generation. Service evidence distinguishes committed source from ephemeral generated source.
2. **Revision semantics — APPROVED:** PR build, scan, image, SBOM, service evidence and matrix-result identity bind to the actual checked-out PR merge revision. Push binds to checked-out pushed revision; freshness to resolved checked-out default-branch revision. `git rev-parse HEAD` is canonical execution SHA. PR head SHA may appear only as separately named provenance, never artifact execution identity.
3. **Aggregate protocol — APPROVED WITH PIN RESOLUTION GATE:** each selected service publishes one sanitized result artifact. Exact official pin resolved as above; no workflow implementation before a contract test rejects mutable/wrong SHAs and proves one isolated result directory per artifact with `merge-multiple:false`. Missing/extra/duplicate/wrong-revision/non-success results fail closed. Result schema remains `{schemaVersion:1,serviceId,commit,result}`; missing upload is missing-result failure. Existing upload pin is not a download pin.
4. **Workflow ownership — APPROVED (2026-10-08):** selected-service builds and artifact-aware scans belong only to the `supply-chain-verification` service matrix and the `security-freshness` all-service matrix. Keep API baseline and monorepo workflow responsibilities, check identities and required-check configuration unchanged; do not add duplicate Maven verify/test steps. Contract tests must reject moving/duplicating the matrix and must retain selection, aggregate and separate release-policy gates. Any branch-protection or required-check configuration change requires separate approval.
5. **Candidate validation — AUTHORIZED WITH CONDITIONS (2026-10-08):** after local verification and commit, run independent scoped review on the exact candidate SHA; only then push the isolated branch and open a Draft PR to collect hosted Linux evidence. Fixes require a new revision and rerun of affected checks. No merge/deploy/release authority is implied. T03 is not approved for closure until the listed acceptance gates have exact-revision evidence.

## Global Constraints

- No Identity application/migration changes; no Cognito/PSP/AWS/Valkey/WebSocket/business implementation. No native DB reset/bootstrap or credentials operations.
- No new generated service source committed in T03. Temporary Maven/containers are real test execution, not service delivery.
- Registry exact five IDs: identity-profile-service, auction-service, bidding-service, billing-service, realtime-gateway. Unknown/old transaction/payment identifiers fail closed.
- Gateway must not receive PostgreSQL/JPA/JDBC/Flyway, DB container/network/config/env or false datastore readiness. Relational smoke uses isolated ephemeral PostgreSQL and separate migrator/runtime roles.
- Required names/settings stay unchanged: monorepo-required, supply-chain-verification; preserve separate release-policy BLOCKED and compatibility DEFERRED_NO_PRODUCER_CONTRACT. No protection edits, risk dispositions, skip flags or PATH scanner substitution.
- Keep trust pins, trusted schema hashes, image platform digest, scanners and locked dependencies. A contract shape change is allowed only to express reviewed identity propagation, not bypass scanning.
- Seven sanitized summary basenames remain exact; raw reports, secrets, native paths and env dumps never uploaded. Evidence reuse allowed only repository-wide Gitleaks/infra on exact same commit with explicit origin reference; artifact scans always per service.
- No runtime shared library or root reactor; service build starts in its project with its wrapper. Cache is download cache only, never another service's target/install output.

## Review Focus

1. Missing/duplicate/unknown selected service result, malicious result identity or cancelled matrix leg must fail aggregate.
2. Absent never-delivered destination must not hide deletion of a tracked service, and temp generation must not overwrite existing source.
3. Artifact root/GAV/JAR/image/SBOM/evidence commit mismatches must be rejected before another service's result can substitute.
4. Gateway smoke must run without any database dependency; relational smoke must prove actual DB readiness, not mocked UP.
5. Failed stage/cleanup/upload must produce execution failure; successful scanning with blocked findings must retain execution PASS and policy BLOCKED separately.

## 2. Exact file map and boundaries

Create:

- api/scripts/supply-chain/ServiceArtifact.psm1 — closed registry resolver and per-target contract derivation, filesystem validation.
- api/scripts/supply-chain/Test-ServiceArtifact.ps1 — metadata/path/GAV fixtures, Windows 5.1/7 and Linux PS7.
- api/scripts/supply-chain/Validate-ServiceSupplyChainEvidence.mjs — service+commit-bound evidence wrapper/core; legacy validator remains compatible.
- api/scripts/supply-chain/Test-ServiceSupplyChainEvidence.mjs — seven-summary identity/hash/state/schema negatives.
- scripts/migration/Validate-ServiceMatrixResults.mjs and Test-ServiceMatrixResults.mjs — exact selected/result set and revision validation.
- api/scripts/foundation/Test-GeneratedServiceConformance.mjs — expanded project conformance entry; does not replace Maven/runtime proof.
- api/scripts/foundation/ServiceFailsafeExecution.psm1, Assert-ServiceFailsafeExecution.ps1, Test-ServiceFailsafeExecution.ps1 — parse Failsafe XML securely and require the registered relational/gateway IT class to report tests > 0, failures/errors/skips = 0; fixture harness covers absence, zero, skipped, failed, duplicate and DTD reports.
- api/scripts/foundation/MarkdownContent.mjs and Test-MarkdownContent.mjs — CommonMark-style fenced-block stripping and regression coverage for literal source appendices.
- docs/superpowers/plans/2026-10-07-s002-t03-execution-log.md — future actual RED/GREEN, commands/revisions/not-run gates.

Modify together:

- scripts/migration/MonorepoRequiredChecks.mjs, Test-MonorepoRequiredChecks.mjs, Test-MonorepoWorkflowContracts.mjs — classifier API/CLI services serialization, aggregate compatibility and workflow coupling.
- .github/workflows/supply-chain.yml, security-freshness.yml — own the selected-service and all-registered-service matrices respectively, with post-verify Failsafe proof, execution-SHA-pinned aggregate checkout, per-service artifact/evidence aggregation and separate policy gates.
- api/scripts/supply-chain/Invoke-HostedSupplyChain.ps1, HostedSupplyChain.psm1, Invoke-ContainerPrebuildArtifact.ps1, Invoke-ContainerImageBuild.ps1, Invoke-ContainerTechnicalSmoke.ps1, Invoke-VulnerabilityScanning.ps1, Invoke-ContainerVulnerabilityScanning.ps1, Test-ContainerBaseImageResolution.ps1, Validate-IdentitySbom.mjs, Validate-HostedSupplyChainEvidence.mjs — target propagation/legacy adapters only.
- Matching tests: Test-HostedSupplyChainContract.mjs, Test-HostedSupplyChain.ps1, Test-HostedSupplyChainOrchestration.ps1, Test-HostedSupplyChainEvidence.mjs, Test-IdentitySbom.ps1, Test-IdentitySbomFixtures.mjs, Test-ContainerImageBuildContract.mjs, Test-ContainerTechnicalSmokeContract.mjs, Test-ContainerTechnicalSmokeStatus.ps1, Test-ContainerVulnerabilityScanning.ps1, Test-VulnerabilityScanning.ps1, Test-ContainerBaseImageTrust.mjs, Test-ContainerImageContract.mjs, Test-DockerfilePolicy.mjs, Test-VulnerabilityScanContract.mjs.
- Service-matrix ownership contracts: `ServiceMatrixWorkflowContract.mjs` / `Test-ServiceMatrixWorkflow.mjs` assert matrix selection, aggregate dependencies, and separate release policy in the two owning workflows; they also reject matrix/build duplication in API baseline and monorepo workflows. Both hosted workflows execute the ownership contract, and `Test-MonorepoWorkflowContracts.mjs` protects those invocations.
- api/security/tooling/{hosted-supply-chain-contract,container-image-contract,container-base-images,vulnerability-scan-contract}.json and matching schemas; hosted-supply-chain-evidence.schema.json, supply-chain-run-summary.schema.json — explicit service identity and variant, preserve policy/trust semantics.

Read-only unless audit proves a necessary reviewed interface change: SupplyChainTooling.psm1, VulnerabilityScanning.psm1, Invoke-GitleaksScanning.ps1, Invoke-HostedReleasePolicy.ps1, tool manifests, dispositions, CycloneDX vendor schemas, foundation generator/registry/templates, all Identity source. Any extra modification is a stop-and-review allowlist amendment, not silent scope growth.

Explicitly unchanged by owner decision: `.github/workflows/api-baseline.yml` continues its existing Identity/CDK/contract checks; `.github/workflows/monorepo-verification.yml` continues its existing `monorepo-required` API/web/lifecycle aggregation. They do not generate or matrix-build services. This avoids duplicate Maven work and preserves required check identities; service build/security ownership is enforced by the two workflows above. Contract coverage asserts these boundaries. Do not alter branch protection or required-check configuration under this plan.

## 3. Interfaces and selection contract

`classifyChangedPaths(paths) -> {api:boolean,web:boolean,contracts:boolean,shared:boolean,services:string[]}`; stable ordinal ID ordering. Existing booleans retained until all workflow consumers migrate atomically. CLI writes `services=<compact JSON array>` to GITHUB_OUTPUT, not comma-delimited or [object Object]. Invalid diff/event/path/registry selects all and records classification diagnostic; does not justify skipping.

| Change | Services | Other gates |
| --- | --- | --- |
| api/services/auction-service/** only | auction-service | repository lifecycle/security contracts; api true |
| each other registered service only | that ID | same rule |
| api/contracts/** | none unless mixed with service/shared | contracts, CDK/API compatibility and web |
| api/service-foundation/**, foundation tooling, shared build/security tooling, workflows, root unknown | all five | current conservative shared/API/web behavior |
| docs/**, api/docs/**, web/docs/** only | [] | lifecycle and contract/source checks; no service builds |
| web/** only | [] | web |
| api/infra/** only | [] | infra/CDK plus repository security |
| rename/delete | union of both old/new targets | deletion provenance retained |
| empty/invalid diff or unknown service path | all five | conservative fail-closed behavior |

`validateServiceMatrixResults({selectedServiceIds,commit,results}) -> {serviceIds,commit}` throws sanitized codes for malformed/duplicate/extra/missing IDs, SHA mismatch and any non-success result. Empty selected list requires empty results and skipped service matrix; classifier/lifecycle/contracts/web applicable results remain mandatory. Existing evaluateAggregate supports legacy input with unchanged tests; new workflow invokes explicit service-result validator, never defaults absent results to success.

`Resolve-ServiceArtifact -ServiceId <id>` in ServiceArtifact.psm1 resolves fixed module repository root (api root internally, repo root explicitly named where exposed). Proposed return fields: serviceId, variant, groupId, artifactId, version, projectRelativePath (repository-relative api/services/id), projectPath (internal absolute), dockerfilePath, jarPath, sbomPath, evidencePath. No caller-supplied paths/GAV/image refs; reject unknown ID, missing/malformed registry, linked roots, cross-boundary JAR and mismatched POM. Metadata resolution can describe an absent approved target; execution `-RequireBuiltArtifact` requires ordinary existing JAR/SBOM matching bound identity. Test repository override lives only in internal fixture adapter, not public CLI unsafe flags.

Orchestrator and artifact entry scripts gain `-ServiceId` default identity-profile-service. Paths must come from resolver, not string replacement of identity names. Derived image reference is local-only deterministic service tag; runtime/image trust constants remain exact existing policy. JAR bytes/hash are measured from built canonical path; image ID comes from actual build; no fabricated hashes or unavailable on PASS.

Validator CLI: `node api/scripts/supply-chain/Validate-ServiceSupplyChainEvidence.mjs --service <id> --commit <40hex> --directory <private-dir>`. API `validateServiceEvidence({serviceId,commit,directory}) -> {serviceId,variant,commit,files}`. Exactly seven existing basenames, ordinary files, no links/extra files; strict schema version2 includes serviceId/variant/commit and artifact binding where applicable. Version1 remains accepted only by legacy Identity invocation; cannot be relabeled as service-specific v2. State validation must reject PASS with unavailable image/hash/readiness, incompatible failureCode and policy not evaluated. Policy BLOCKED with execution PASS remains valid evidence, not release approval.

Service evidence v2 includes explicit `sourceProvenance`: `{kind:'committed',executionCommit:<canonical SHA>}` or `{kind:'ephemeral-generated',executionCommit:<canonical SHA>,generatorCommit:<same SHA>,serviceId:<registered ID>}`. All seven summaries must agree on provenance; mixed kinds, mismatched generator revision, forged committed-source claims and missing provenance fail closed. This is a proposed schema encoding of approved Decision 1, not an existing schema. The result artifact remains isolated per service and must reference evidence for the same source provenance and execution SHA.

Repository-wide reuse, if implemented, adds explicit `repositoryEvidenceReference` with same commit + sanitized artifact ID/hash, separate from service artifact identity. Simplest initial implementation rescans repository-wide checks per leg; safe but expensive. Do not invent reuse until its exact schema and tests are approved.

## 4. Task-by-task TDD execution

### T03-A — Published ancestry, audit and feasibility

- [ ] Read spec/parent/this plan and owner decisions; record isolated root/branch/HEAD/tree/status and fresh published read-back; preserve local T02 closeout doc.
- [ ] Run existing required-check/workflow, hosted contract/orchestration/evidence, Identity scanner and lifecycle regressions with immediate exit checks. Record unrelated failure before coding.
- [ ] Hash all 101 tracked Identity paths before work and retain per-file manifest; rerun after implementation.
- [ ] Audit every hardcoded target, root convention, contract/schema consumer and evidence path across appendices; record exact file allowlist and call chain in execution log. No policy/trust change without owner review.
- [ ] Confirm the three draft decisions in section1, especially ephemeral route and reviewed download pin. If not approved, stop before workflow coding with alternatives/cost, no repeated execution-method question.
- [ ] Prove fresh temp generation on Linux with pwsh installed; do not generate into actual workspace destinations. Record absent-vs-deleted detection fixture design.

### T03-B — Selection and exact-result aggregate

- [ ] Add behavioral RED fixtures named auctionOnly, eachRegisteredServiceOnly, contractsOnly, docsOnly, templateAllFive, sharedAllFive, mixedUnion, renameUnion, deletionSelected, invalidDiffAllFive, unknownTargetAllFive; assert literal ID arrays and booleans.
- [ ] Add RED missingSelectedService, duplicateResult, unknownResult, wrongRevision, cancelledLeg, gatewayFailureNotHiddenByIdentitySuccess, emptySelectionRequiresEmptyResults. Example proposal (new modules not existing):

```javascript
assert.deepEqual(classifyChangedPaths(['api/services/auction-service/pom.xml']).services, ['auction-service']);
assert.deepEqual(classifyChangedPaths(['docs/note.md']).services, []);
assert.throws(() => validateServiceMatrixResults({
  selectedServiceIds: ['identity-profile-service', 'realtime-gateway'],
  commit: 'a'.repeat(40),
  results: [{schemaVersion: 1, serviceId: 'identity-profile-service', commit: 'a'.repeat(40), result: 'success'}]
}), {message: 'SERVICE_MATRIX_RESULT_MISSING'});
```

- [ ] Run fixture before implementation; missing module is bootstrap RED only. Implement classifier/validator minimally, then mutate omitted/gateway-failure result and observe behavioral RED/GREEN.
- [ ] Add CLI subprocess test proving compact JSON services output and sanitized bad argument handling, legacy aggregate tests unchanged.
- [ ] Run required-check/workflow suites and commit exact classifier/result-validator paths only after GREEN.

### T03-C — Registry-bound artifact resolver and SBOM

- [ ] Write ServiceArtifact fixtures exact five records, null gateway datastore fields, unknown IDs, forged GAV, link/root escape, wrong JAR basename, absent source vs absent built output, mismatched entry class/manifest. Exercise both Windows hosts and Linux.
- [ ] Implement resolver/derived contracts; default no-ServiceId remains Identity. Preserve existing tool/image/schema hashes, separate fixture IO overrides from public input.
- [ ] Add SBOM RED root.name/group/version/purl mismatch, missing required common dependencies, forbidden gateway JDBC/JPA/Flyway/Postgres including test-scope leakage, relational required deps, copied Identity root. Preserve full CycloneDX trusted schema validation before identity checks.
- [ ] Generalize Validate-IdentitySbom through optional expected registered identity; legacy exported API/CLI signatures remain supported. Do not weaken BOM/license/schema semantics or auto-upgrade pins.
- [ ] Run resolver+Identity SBOM fixtures; record RED/GREEN and exact scoped commit.

### T03-D — Artifact propagation and safe variant smoke

- [ ] Add RED spy/real fixture checks at every caller boundary: -ServiceId survives prebuild/dependency/base/image/smoke/container invocation, evidence copies from correct service target, wrong source path rejected. Mocks may stand in for external docker/network only; inspect real argument/path/hash derivation.
- [ ] Update listed entry points and matching contracts atomically. Existing legacy flags/exit/status-envelope handling remains tested. Prebuild actual wrapper clean verify, then canonical JAR and SBOM checks; -SkipBuild requires matching verified artifact, never previous other-service output.
- [ ] Add gateway smoke RED when any DB env/container/network/config is supplied; implement gateway health/probes/deny-sensitive-endpoint smoke with no PostgreSQL process. Relational smoke keeps real isolated DB/bootstrap/roles and actual readiness.
- [ ] Add service image-reference/hash mismatch and stale DB negative fixtures; no blanket IOException/scan-output fallback or policy bypass. Execute existing Windows/Unix child executable fixtures unchanged.
- [ ] Run all changed script fixture suites and legacy Identity regression; no native local DB operation. Commit exact propagation paths after GREEN.

### T03-E — Seven-summary service evidence

- [ ] Add RED each missing summary, eighth file, symlink, wrong service/variant/commit, unknown schema field, absolute path/secret key, wrong JAR/image hash, unavailable PASS, copied Identity result, failure hidden by policy BLOCKED, DB-dependent gateway summary and mismatched counts.
- [ ] Implement strict v2 writer/validator/schema wiring while legacy v1 Identity validator/tests remain intact. Compare data across seven files, not just separately valid schemas; actual artifact summary identity must agree with registry and execution.
- [ ] Keep executionState/policyState/reviewState/deltaState meanings; prove PASS+BLOCKED accepted for verification and rejected for release. Missing fresh scanner database remains execution failure/not acceptable scan, not invented disposition.
- [ ] Ensure always-run failure validation/upload does not produce a false PASS; failure roots remain sanitized exact file set with explicit unavailable values permitted only for failed execution.
- [ ] Run service evidence and full hosted contract/orchestration/evidence suites; stage schema+writer+validator together and commit GREEN.

### T03-F — Hosted matrix and temporary artifact rehearsal

- [ ] Write workflow-contract RED for omitted service matrix, missing result download, last-output collapse, unchecked selected target deletion, head-labelled merge artifacts, missing freshness coverage and removal of lifecycle foundation tests.
- [ ] Implement approved temporary route: each selected leg owns fresh checkout; Identity untouched; baseline-absent new target generated once with T02; deleted tracked source fails. Generated conformance then project-local wrapper clean verify, real Failsafe XML inspected with no required test skipped, no Maven root reactor/install shortcut.
- [ ] Use matrix fail-fast false, stable aggregate always(), exact result artifacts/revision; missing upload fails. Keep contract/CDK/web/lifecycle gates and pinned actions. Supply-chain aggregate requires every selected artifact's verification; release-policy remains separate and conservative, zero service selection still runs mandatory repository security evidence rather than disappearing.
- [ ] Freshness schedule selects every delivered or approved temporary registry artifact at checked-out default SHA; resolve SHA once and propagate. Record scan costs/timeouts from actual runs; no silent timeout/gate removal.
- [ ] Execute temporary relational and gateway through real trusted build/SBOM/image/smoke/scan route; retain sanitized/private evidence with exact commit, versions, XML, image IDs and hashes. This is real runtime T03 route rehearsal, not T04/T05 committed service acceptance.
- [ ] Protected hosted scenarios: service-only, shared/template all-five, docs-only, contract-only, rename/delete and controlled failing gateway/missing result. Local/source workflow tests do not establish these. Use disposable non-merged branches/PRs only with separately authorized publication; no deliberate failing business code or actual service deletion in delivery branch.

### T03-G — Review, forecast and publication handoff

- [ ] Rerun all changed/legacy suites; compare Identity manifest; check Markdown links, exact staged whitespace, pinned canonical redacted Gitleaks route. Exclude generated source, targets, ignored evidence/raw reports/env files.
- [ ] Independent scoped whole-delta review: five Review Focus cases, coupled workflow/schema changes, deleted-source ambiguity, merge-SHA binding, policy states and actual artifact coverage. Resolve Critical/Important before source acceptance.
- [ ] Record local SHA/tree, tests and explicit NOT RUN/PENDING_HOSTED gates; commit exact reviewed paths. Parent task is not DONE before hosted scenario/real trusted route proof.
- [ ] Report T03 actual engineering effort, remaining T04–T07 forecast/reserve against owner envelope; do not convert hours into invented calendar dates.
- [ ] Obtain separate push/PR and merge authority, fresh protection/read-back, required PR and actual postmerge runs. Preserve release-policy BLOCKED; no current-phase transition or producer compatibility claim.

## 5. Verification commands and evidence rules

Commands for new files are requirements, not observed PASS. Run each independently and check exit immediately; Windows-only PS5.1 omitted on Linux. Existing locked api/contracts node_modules may require npm ci, no upgrade.

```powershell
node scripts/migration/Test-MonorepoRequiredChecks.mjs
if ($LASTEXITCODE -ne 0) { throw 'T03_CLASSIFIER_FAILED' }
node scripts/migration/Test-ServiceMatrixResults.mjs
if ($LASTEXITCODE -ne 0) { throw 'T03_MATRIX_FAILED' }
node scripts/migration/Test-MonorepoWorkflowContracts.mjs --repository
if ($LASTEXITCODE -ne 0) { throw 'T03_WORKFLOW_FAILED' }
pwsh -NoProfile -NonInteractive -File api/scripts/supply-chain/Test-ServiceArtifact.ps1
if ($LASTEXITCODE -ne 0) { throw 'T03_ARTIFACT_FAILED' }
node api/scripts/supply-chain/Test-ServiceSupplyChainEvidence.mjs
if ($LASTEXITCODE -ne 0) { throw 'T03_EVIDENCE_FAILED' }
node api/scripts/supply-chain/Test-HostedSupplyChainContract.mjs --repository
if ($LASTEXITCODE -ne 0) { throw 'HOSTED_CONTRACT_FAILED' }
pwsh -NoProfile -NonInteractive -File api/scripts/supply-chain/Test-HostedSupplyChainOrchestration.ps1
if ($LASTEXITCODE -ne 0) { throw 'HOSTED_ORCHESTRATION_FAILED' }
node api/scripts/supply-chain/Test-HostedSupplyChainEvidence.mjs
if ($LASTEXITCODE -ne 0) { throw 'LEGACY_EVIDENCE_FAILED' }
node api/scripts/supply-chain/Test-IdentitySbomFixtures.mjs
if ($LASTEXITCODE -ne 0) { throw 'LEGACY_SBOM_FAILED' }
node api/scripts/foundation/Test-ServiceGenerator.mjs
if ($LASTEXITCODE -ne 0) { throw 'T02_REGRESSION_FAILED' }
node api/scripts/foundation/Test-ServiceConformance.mjs --templates
if ($LASTEXITCODE -ne 0) { throw 'TEMPLATE_FAILED' }
node api/scripts/decisions/Test-S002-Lifecycle.mjs --repository
if ($LASTEXITCODE -ne 0) { throw 'LIFECYCLE_FAILED' }
git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'WHITESPACE_FAILED' }
```

Also run every matching changed PS/mjs fixture in section2, existing S002 fixture and S001 T09 require-complete/closeout; capture actual commands/counts/exits in log, never replace them with this proposed command list. Canonical secret scan: installed approved `Invoke-GitleaksScanning.ps1`, pinned 8.30.0 verified contract, no PATH substitute. Platform prerequisite failures are NOT EXECUTED and block universal acceptance.

## 6. Context snapshot, completeness and self-review

Appendix is literal full tracked source of directly relevant producer/consumer/workflow/contracts/tests plus registry/build derivation, captured from local HEAD `4f36b6a` (T02 source equals PR20 merge; local closeout log differs). Only CRLF→LF normalized for display. SHA256 below hashes original local bytes; source snapshots are context, not proposed T03 implementation. No ellipses or collapsed code excerpts. Vendored CycloneDX schema corpus and unrelated business source are not copied because they are unchanged trust assets, not T03 behavior; their committed trust manifest is included. Appendix can be large: user explicitly requested every line so size is evidence context, not implementation transcript.

Self-review: parent T03 selection/matrix/resolver/SBOM/smoke/evidence/freshness/hosted scenarios/forecast all mapped to tasks. Public interfaces use registry identity, repository-vs-api-relative paths explicitly distinguished. Main unresolved decisions are listed in section1 rather than assumed approved. Source-vs-real-runtime and execution-vs-policy claims remain separate. No exact new action pin is fabricated. Execute only after owner reviews the detail decisions; preserve direct sequential isolated method and independent scoped review.

## 7. Phụ lục source nguyên văn

### .github/workflows/api-baseline.yml

Original-byte SHA256: 63921b731f565eb08192a4907370f4502a68c9a7cd9709d7fff1a2bb15b03750

````yaml
name: API baseline

on:
  push:
  pull_request:

permissions:
  contents: read

concurrency:
  group: api-baseline-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify-identity-profile-service:
    name: Maven verify (Java 21)
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - name: Check out source
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false

      - name: Set up Temurin Java 21
        uses: actions/setup-java@cf277c60eb25467037889841efdb72551f06f6c3 # v4
        with:
          distribution: temurin
          java-version: "21"
          cache: maven

      - name: Verify identity-profile-service
        shell: bash
        working-directory: api/services/identity-profile-service
        run: |
          chmod +x mvnw
          ./mvnw -B verify

  verify-cdk-toolchain:
    name: CDK v2 toolchain
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - name: Check out source
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false

      - name: Set up Node.js 24.15.0
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version-file: api/.nvmrc
          cache: npm
          cache-dependency-path: api/infra/package-lock.json

      - name: Install pinned CDK dependencies
        working-directory: api/infra
        run: npm ci

      - name: Verify CDK CLI version
        working-directory: api/infra
        run: npm run cdk:version

  verify-contract-registry:
    name: Contract registry (Node 24)
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - name: Check out source
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false

      - name: Set up Node.js 24.15.0
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version-file: api/.nvmrc
          cache: npm
          cache-dependency-path: api/contracts/package-lock.json

      - name: Install pinned contract tooling
        working-directory: api/contracts
        run: npm ci

      - name: Reject malformed schema fixture
        working-directory: api/contracts
        run: npm run test:fixtures

      - name: Reject governance fixtures
        working-directory: api/contracts
        run: npm run test:governance

      - name: Reject prohibited OpenAPI breaking change
        shell: pwsh
        run: ./api/scripts/verify-contracts.ps1 -Mode Fixture

      - name: Verify registered contracts
        shell: pwsh
        run: ./api/scripts/verify-contracts.ps1 -Mode Registry
````


### .github/workflows/monorepo-verification.yml

Original-byte SHA256: 563ff90464de984a2dca75dc9d5b6e472819bda9159c0f5e86ca261b3cc861e0

````yaml
name: Monorepo verification

on:
  pull_request:
  push:

permissions:
  contents: read

jobs:
  classify:
    name: Classify changed paths
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    outputs:
      api: ${{ steps.paths.outputs.api }}
      web: ${{ steps.paths.outputs.web }}
      contracts: ${{ steps.paths.outputs.contracts }}
      shared: ${{ steps.paths.outputs.shared }}
    steps:
      - name: Check out PR merge result or push tip
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          fetch-depth: 0
          persist-credentials: false
      - name: Set up Node.js 24.15.0
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version-file: api/.nvmrc
      - name: Install required-check test tooling
        working-directory: api/contracts
        run: npm ci
      - name: Verify classifier and aggregate regressions
        run: node scripts/migration/Test-MonorepoRequiredChecks.mjs
      - name: Classify PR base/head or push before/after
        id: paths
        run: node scripts/migration/MonorepoRequiredChecks.mjs --classify

  api:
    name: Monorepo API gates
    needs: classify
    if: ${{ needs.classify.outputs.api == 'true' }}
    runs-on: ubuntu-24.04
    timeout-minutes: 35
    steps:
      - name: Check out the same merge result or push tip
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false
      - name: Set up Temurin Java 21
        uses: actions/setup-java@cf277c60eb25467037889841efdb72551f06f6c3 # v4
        with:
          distribution: temurin
          java-version: "21"
          cache: maven
      - name: Verify identity-profile-service
        working-directory: api/services/identity-profile-service
        run: |
          chmod +x mvnw
          ./mvnw -B verify
      - name: Set up Node.js 24.15.0
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version-file: api/.nvmrc
      - name: Verify CDK toolchain
        working-directory: api/infra
        run: |
          npm ci
          npm run cdk:version
      - name: Install canonical contract tooling
        working-directory: api/contracts
        run: npm ci
      - name: Verify canonical producer contracts
        working-directory: api/contracts
        run: |
          npm run lint:openapi
          npm run validate:schemas
          npm run test:fixtures
          npm run test:governance
      - name: Reject breaking producer fixture
        shell: pwsh
        run: ./api/scripts/verify-contracts.ps1 -Mode Fixture
      - name: Verify canonical registry
        shell: pwsh
        run: ./api/scripts/verify-contracts.ps1 -Mode Registry
      - name: Verify Linux PowerShell and tool executable handling
        shell: pwsh
        run: |
          ./api/scripts/supply-chain/Test-LinuxHostedPowerShellExecutable.ps1
          ./api/scripts/supply-chain/Test-LinuxToolExecutablePermission.ps1

  web:
    name: Monorepo web gates
    needs: classify
    if: ${{ needs.classify.outputs.web == 'true' }}
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - name: Check out the same merge result or push tip
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false
      - name: Set up Node.js 24.15.0
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version-file: web/.nvmrc
          cache: npm
          cache-dependency-path: web/package-lock.json
      - name: Install dependencies
        working-directory: web
        run: npm ci
      - name: Lint
        working-directory: web
        run: npm run lint
      - name: Build production application
        working-directory: web
        run: npm run build

  lifecycle:
    name: Monorepo lifecycle gates
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - name: Check out the same merge result or push tip
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false
      - name: Set up Node.js 24.15.0
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version-file: api/.nvmrc
      - name: Verify Sprint 002 lifecycle and Sprint 001 closeout
        run: |
          node api/scripts/decisions/Test-S002-Lifecycle.mjs
          node api/scripts/decisions/Test-S001-T09-Decisions.mjs --require-complete --require-closeout
          node api/scripts/decisions/Test-S002-Lifecycle.mjs --repository
      - name: Verify service foundation generator and publisher
        run: |
          node api/scripts/foundation/Test-ServiceGenerator.mjs
          node api/scripts/foundation/Test-ServiceConformance.mjs --templates
          pwsh -NoProfile -NonInteractive -File api/scripts/foundation/Test-PublishServiceDirectory.ps1

  monorepo-required:
    name: monorepo-required
    needs: [classify, api, web, lifecycle]
    if: ${{ always() }}
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    steps:
      - name: Require every applicable component to succeed
        env:
          CLASSIFY_RESULT: ${{ needs.classify.result }}
          API_REQUIRED: ${{ needs.classify.outputs.api }}
          WEB_REQUIRED: ${{ needs.classify.outputs.web }}
          API_RESULT: ${{ needs.api.result }}
          WEB_RESULT: ${{ needs.web.result }}
          LIFECYCLE_RESULT: ${{ needs.lifecycle.result }}
        run: |
          node -e '
          const { CLASSIFY_RESULT, API_REQUIRED, WEB_REQUIRED, API_RESULT, WEB_RESULT, LIFECYCLE_RESULT } = process.env;
          const ok = CLASSIFY_RESULT === "success" && LIFECYCLE_RESULT === "success" &&
            [[API_REQUIRED, API_RESULT], [WEB_REQUIRED, WEB_RESULT]].every(
              ([required, actual]) =>
                (required === "true" || required === "false") &&
                actual === (required === "true" ? "success" : "skipped")
            );
          if (!ok) {
            console.error("MONOREPO_REQUIRED_GATE_FAILED");
            process.exit(1);
          }
          console.log("MONOREPO_REQUIRED_GATE_PASS");
          '
````


### .github/workflows/security-freshness.yml

Original-byte SHA256: c6f561f6c8125dac33bb4aa59f6cb18ac75324f6e4acf8c6765aa26d8ad1ecc2

````yaml
name: Security freshness

on:
  schedule:
    - cron: '17 3 * * *'
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: security-freshness-${{ github.workflow }}-${{ github.event.repository.default_branch }}
  cancel-in-progress: false

jobs:
  security-freshness:
    name: security-freshness-verification
    runs-on: ubuntu-24.04
    timeout-minutes: 60
    outputs:
      policy_state: ${{ steps.run-hosted.outputs.policy_state }}
      review_state: ${{ steps.run-hosted.outputs.review_state }}
    steps:
      - id: initialize-summary
        name: Initialize fail-closed evidence
        shell: pwsh
        run: |
          $root = Join-Path $env:RUNNER_TEMP 's001-t07-evidence/hosted'
          New-Item -ItemType Directory -Path $root -Force | Out-Null
          $summary = '{"schemaVersion":1,"workflow":"security-freshness","commit":"' + $env:GITHUB_SHA + '","executionState":"IMPLEMENTATION_FAILURE","policyState":"NOT_EVALUATED","reviewState":"NOT_REQUIRED","deltaState":"NOT_APPLICABLE","failureCode":"SUPPLY_CHAIN_NOT_STARTED"}'
          [System.IO.File]::WriteAllText((Join-Path $root 'run-summary.json'), $summary, [System.Text.UTF8Encoding]::new($false))

      - id: checkout
        name: Check out default branch
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          ref: ${{ github.event.repository.default_branch }}
          fetch-depth: 0
          persist-credentials: false

      - id: setup-java
        name: Set up Temurin Java 21
        uses: actions/setup-java@cf277c60eb25467037889841efdb72551f06f6c3 # v4
        with:
          distribution: temurin
          java-version: '21'
          cache: maven

      - id: resolve-default-commit
        name: Resolve checked-out default-branch revision
        shell: bash
        run: echo "commit=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"

      - id: setup-node
        name: Set up Node.js 24
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version-file: api/.nvmrc
          cache: npm
          cache-dependency-path: api/contracts/package-lock.json

      - id: install-contract-tools
        name: Install pinned contract tooling
        working-directory: api/contracts
        run: npm ci

      - id: validate-contract
        name: Validate hosted workflow contract
        run: node ./api/scripts/supply-chain/Test-HostedSupplyChainContract.mjs --repository

      - id: run-hosted
        name: Run default-branch hosted verification
        shell: pwsh
        run: |
          ./api/scripts/supply-chain/Invoke-HostedSupplyChain.ps1 `
            -WorkflowName security-freshness `
            -CommitSha '${{ steps.resolve-default-commit.outputs.commit }}' `
            -EvidenceRoot (Join-Path $env:RUNNER_TEMP 's001-t07-evidence/hosted') `
            -RefreshDatabase

      - id: validate-evidence
        name: Validate sanitized evidence
        if: always()
        run: node ./api/scripts/supply-chain/Validate-HostedSupplyChainEvidence.mjs "${{ runner.temp }}/s001-t07-evidence/hosted" '${{ steps.resolve-default-commit.outputs.commit }}'

      - id: upload-evidence
        name: Upload sanitized evidence
        if: always()
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
        with:
          name: security-freshness-${{ steps.resolve-default-commit.outputs.commit }}
          path: ${{ runner.temp }}/s001-t07-evidence/hosted
          retention-days: 30
          if-no-files-found: error

  freshness-release-policy:
    name: freshness-release-policy
    needs: [security-freshness]
    if: needs.security-freshness.result == 'success'
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    permissions:
      contents: read
    steps:
      - name: Enforce separate release policy
        shell: pwsh
        env:
          POLICY_STATE: ${{ needs.security-freshness.outputs.policy_state }}
        run: |
          if ($env:POLICY_STATE -eq 'PASS') { exit 0 }
          if ($env:POLICY_STATE -eq 'BLOCKED') { exit 1 }
          throw 'HOSTED_RELEASE_POLICY_NOT_EVALUATED'
````


### .github/workflows/supply-chain.yml

Original-byte SHA256: cda7a567ae9cb6f2fb0c206cdd25d2d00b32000bf7e3ab43643b079e999d51f8

````yaml
name: Supply-chain verification

on:
  push:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: supply-chain-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false

jobs:
  supply-chain-verification:
    name: supply-chain-verification
    runs-on: ubuntu-24.04
    timeout-minutes: 60
    env:
      TRIGGERED_SHA: ${{ github.event.pull_request.head.sha || github.sha }}
    outputs:
      policy_state: ${{ steps.run-hosted.outputs.policy_state }}
      review_state: ${{ steps.run-hosted.outputs.review_state }}
    steps:
      - id: initialize-summary
        name: Initialize fail-closed evidence
        shell: pwsh
        run: |
          $root = Join-Path $env:RUNNER_TEMP 's001-t07-evidence/hosted'
          New-Item -ItemType Directory -Path $root -Force | Out-Null
          $summary = '{"schemaVersion":1,"workflow":"supply-chain","commit":"' + $env:TRIGGERED_SHA + '","executionState":"IMPLEMENTATION_FAILURE","policyState":"NOT_EVALUATED","reviewState":"NOT_REQUIRED","deltaState":"NOT_APPLICABLE","failureCode":"SUPPLY_CHAIN_NOT_STARTED"}'
          [System.IO.File]::WriteAllText((Join-Path $root 'run-summary.json'), $summary, [System.Text.UTF8Encoding]::new($false))

      - id: checkout
        name: Check out triggered revision
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          fetch-depth: 0
          persist-credentials: false
          ref: ${{ github.event.pull_request.head.sha || github.sha }}

      - id: setup-java
        name: Set up Temurin Java 21
        uses: actions/setup-java@cf277c60eb25467037889841efdb72551f06f6c3 # v4
        with:
          distribution: temurin
          java-version: '21'
          cache: maven

      - id: setup-node
        name: Set up Node.js 24
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version-file: api/.nvmrc
          cache: npm
          cache-dependency-path: api/contracts/package-lock.json

      - id: install-contract-tools
        name: Install pinned contract tooling
        working-directory: api/contracts
        run: npm ci

      - id: validate-contract
        name: Validate hosted workflow contract
        run: node ./api/scripts/supply-chain/Test-HostedSupplyChainContract.mjs --repository-supply-chain

      - id: run-hosted
        name: Run repository-owned hosted verification
        shell: pwsh
        run: |
          ./api/scripts/supply-chain/Invoke-HostedSupplyChain.ps1 `
            -WorkflowName supply-chain `
            -CommitSha $env:TRIGGERED_SHA `
            -EvidenceRoot (Join-Path $env:RUNNER_TEMP 's001-t07-evidence/hosted') `
            -RefreshDatabase

      - id: validate-evidence
        name: Validate sanitized evidence
        if: always()
        run: node ./api/scripts/supply-chain/Validate-HostedSupplyChainEvidence.mjs "${{ runner.temp }}/s001-t07-evidence/hosted" '${{ env.TRIGGERED_SHA }}'

      - id: upload-evidence
        name: Upload sanitized evidence
        if: always()
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
        with:
          name: supply-chain-${{ env.TRIGGERED_SHA }}
          path: ${{ runner.temp }}/s001-t07-evidence/hosted
          retention-days: 30
          if-no-files-found: error

  release-policy:
    name: release-policy
    needs: [supply-chain-verification]
    if: needs.supply-chain-verification.result == 'success'
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    permissions:
      contents: read
    steps:
      - name: Enforce separate release policy
        shell: pwsh
        env:
          POLICY_STATE: ${{ needs.supply-chain-verification.outputs.policy_state }}
        run: |
          if ($env:POLICY_STATE -eq 'PASS') { exit 0 }
          if ($env:POLICY_STATE -eq 'BLOCKED') { exit 1 }
          throw 'HOSTED_RELEASE_POLICY_NOT_EVALUATED'
````


### api/scripts/foundation/Generate-Service.mjs

Original-byte SHA256: eba0824dd68cdd34568f9b02cd26a821934f4bb8aafb9baeb71481230367bffe

````javascript
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateService as generateInternal } from './ServiceGeneratorCore.mjs';
export { validateInventory } from './ServiceGeneratorCore.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), '../../..');

export function generateService(input) {
  return generateInternal(input);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2 || args[0] !== '--service' || !args[1] || args[1].startsWith('--')) throw new Error('USAGE');
    const result = generateService({ serviceId: args[1], repositoryRoot });
    process.stdout.write(`${result.serviceId} ${result.variant}\n${result.files.join('\n')}\n`);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PUBLICATION_FAILED';
    process.stderr.write(`${/^[A-Z_]+$/.test(code) ? code : 'PUBLICATION_FAILED'}\n`);
    process.exitCode = 1;
  }
}
````


### api/scripts/foundation/ServiceGeneratorCore.mjs

Original-byte SHA256: 85f0bbd717d02cabc9a6e50c5d855f9e042d23e9955648fcad57ac168a5cf27b

````javascript
import { randomBytes } from 'node:crypto';
import {
  closeSync,
  chmodSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIRECTORY = path.dirname(SCRIPT_PATH);
const MODULE_REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, '../../..');
const RECORD_KEYS = [
  'id', 'variant', 'preserved', 'groupId', 'artifactId', 'version', 'packageName',
  'entryClass', 'destination', 'database', 'testDatabase', 'schema', 'environmentPrefix',
];
const EXPECTED_RECORDS = [
  ['identity-profile-service', 'relational', true, 'com.auctionpromax', 'identity-profile-service', '0.0.1-SNAPSHOT', 'com.auctionpromax.identityprofileservice', 'IdentityProfileServiceApplication', 'api/services/identity-profile-service', 'identity_db', 'identity_test_db', 'identity', 'IDENTITY'],
  ['auction-service', 'relational', false, 'com.auctionpromax', 'auction-service', '0.0.1-SNAPSHOT', 'com.auctionpromax.auctionservice', 'AuctionServiceApplication', 'api/services/auction-service', 'auction_db', 'auction_test_db', 'auction', 'AUCTION'],
  ['bidding-service', 'relational', false, 'com.auctionpromax', 'bidding-service', '0.0.1-SNAPSHOT', 'com.auctionpromax.biddingservice', 'BiddingServiceApplication', 'api/services/bidding-service', 'bidding_db', 'bidding_test_db', 'bidding', 'BIDDING'],
  ['billing-service', 'relational', false, 'com.auctionpromax', 'billing-service', '0.0.1-SNAPSHOT', 'com.auctionpromax.billingservice', 'BillingServiceApplication', 'api/services/billing-service', 'billing_db', 'billing_test_db', 'billing', 'BILLING'],
  ['realtime-gateway', 'gateway', false, 'com.auctionpromax', 'realtime-gateway', '0.0.1-SNAPSHOT', 'com.auctionpromax.realtimegateway', 'RealtimeGatewayApplication', 'api/services/realtime-gateway', null, null, null, null],
];
const EXPECTED_IDS = EXPECTED_RECORDS.map(([id]) => id);
const ALLOWED_TOKENS = new Set([
  '__SERVICE_ID__', '__PACKAGE_NAME__', '__PACKAGE_PATH__', '__ENTRY_CLASS__',
  '__DB_NAME__', '__TEST_DB_NAME__', '__SCHEMA_NAME__', '__ENV_PREFIX__',
]);
const RESERVED_WINDOWS_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL', ...Array.from({ length: 9 }, (_, i) => `COM${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `LPT${i + 1}`),
]);

function fail(code) {
  throw new Error(code);
}

function hasExactKeys(value, expected) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === expected.length
    && expected.every(key => Object.hasOwn(value, key));
}

function assertNoLinkedAncestors(absolutePath) {
  const parsed = path.parse(absolutePath);
  let cursor = parsed.root;
  const rest = absolutePath.slice(parsed.root.length).split(path.sep).filter(Boolean);
  for (const part of rest) {
    cursor = path.join(cursor, part);
    let stat;
    try { stat = lstatSync(cursor); } catch { fail('PATH_UNSAFE'); }
    if (stat.isSymbolicLink() || (stat.mode & 0o170000) === 0o120000) fail('LINK_REJECTED');
    if (process.platform === 'win32' && (stat.attributes & 0x400) !== 0) fail('LINK_REJECTED');
  }
}

function canonicalRepositoryRoot(repositoryRoot) {
  if (typeof repositoryRoot !== 'string' || repositoryRoot.length === 0 || !path.isAbsolute(repositoryRoot)) {
    fail('INPUT_INVALID');
  }
  assertNoLinkedAncestors(path.resolve(repositoryRoot));
  let canonical;
  try { canonical = realpathSync(repositoryRoot); } catch { fail('PATH_UNSAFE'); }
  let stat;
  try { stat = lstatSync(canonical); } catch { fail('PATH_UNSAFE'); }
  if (!stat.isDirectory()) fail('PATH_UNSAFE');
  return canonical;
}

function validateRegistry(repositoryRoot) {
  const filename = path.join(repositoryRoot, 'api/service-foundation/services.json');
  assertNoLinkedAncestors(filename);
  let registryStat;
  try { registryStat = lstatSync(filename); } catch { fail('REGISTRY_INVALID'); }
  if (!registryStat.isFile() || registryStat.isSymbolicLink()
      || (process.platform === 'win32' && (registryStat.attributes & 0x400) !== 0)) fail('LINK_REJECTED');
  let parsed;
  try { parsed = JSON.parse(readFileSync(filename, 'utf8')); } catch { fail('REGISTRY_INVALID'); }
  if (!hasExactKeys(parsed, ['schemaVersion', 'services']) || parsed.schemaVersion !== 1
      || !Array.isArray(parsed.services) || parsed.services.length !== EXPECTED_RECORDS.length) {
    fail('REGISTRY_INVALID');
  }

  const byId = new Map();
  for (const record of parsed.services) {
    if (!hasExactKeys(record, RECORD_KEYS) || typeof record.id !== 'string' || byId.has(record.id)) {
      fail('REGISTRY_INVALID');
    }
    byId.set(record.id, record);
  }
  if (EXPECTED_IDS.some(id => !byId.has(id))) fail('REGISTRY_INVALID');

  for (const expected of EXPECTED_RECORDS) {
    const record = byId.get(expected[0]);
    if (RECORD_KEYS.some((key, index) => record[key] !== expected[index])) fail('REGISTRY_INVALID');
  }
  return byId;
}

function validateRelativePath(value, code) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\\') || value.startsWith('/')
      || /^[A-Za-z]:/.test(value) || value.includes(':') || value.endsWith('/')
      || value.split('/').some(part => part === '' || part === '.' || part === '..'
        || part.endsWith('.') || part.endsWith(' ')
        || RESERVED_WINDOWS_NAMES.has(part.split('.')[0].toUpperCase()))) {
    fail(code);
  }
  return value;
}

export function validateInventory(repositoryRoot) {
  const filename = path.join(repositoryRoot, 'api/service-foundation/template-files.json');
  assertNoLinkedAncestors(filename);
  let inventoryStat;
  try { inventoryStat = lstatSync(filename); } catch { fail('INVENTORY_INVALID'); }
  if (!inventoryStat.isFile() || inventoryStat.isSymbolicLink()
      || (process.platform === 'win32' && (inventoryStat.attributes & 0x400) !== 0)) fail('LINK_REJECTED');
  let inventory;
  try { inventory = JSON.parse(readFileSync(filename, 'utf8')); } catch { fail('INVENTORY_INVALID'); }
  if (!hasExactKeys(inventory, ['schemaVersion', 'files']) || inventory.schemaVersion !== 1
      || !Array.isArray(inventory.files) || inventory.files.length === 0) fail('INVENTORY_INVALID');

  const sources = new Set();
  const sourceFolded = new Set();
  const destinationsByVariant = new Map([['relational', new Set()], ['gateway', new Set()]]);
  const entries = [];
  for (const entry of inventory.files) {
    if (!hasExactKeys(entry, ['source', 'destination', 'variants', 'mode', 'provenance'])
        || !Array.isArray(entry.variants) || entry.variants.length === 0
        || typeof entry.provenance !== 'string' || entry.provenance.length === 0
        || ![0o644, 0o755].includes(entry.mode)) fail('INVENTORY_INVALID');
    const source = validateRelativePath(entry.source, 'INVENTORY_INVALID');
    const destination = validateRelativePath(entry.destination, 'INVENTORY_INVALID');
    if (!source.startsWith('templates/')) fail('INVENTORY_INVALID');
    const expectedMode = destination === 'mvnw' ? 0o755 : 0o644;
    if (entry.mode !== expectedMode) fail('INVENTORY_INVALID');
    const sourceKey = source.toLowerCase();
    if (sources.has(source) || sourceFolded.has(sourceKey)) fail('INVENTORY_INVALID');
    sources.add(source);
    sourceFolded.add(sourceKey);
    const uniqueVariants = new Set(entry.variants);
    if (uniqueVariants.size !== entry.variants.length || entry.variants.some(value => !['relational', 'gateway'].includes(value))) {
      fail('INVENTORY_INVALID');
    }
    for (const variant of uniqueVariants) {
      const outputPaths = destinationsByVariant.get(variant);
      const folded = destination.toLowerCase();
      if (outputPaths.has(folded)) fail('INVENTORY_INVALID');
      outputPaths.add(folded);
    }
    entries.push(entry);
  }

  const templateRoot = path.join(repositoryRoot, 'api/service-foundation/templates');
  let templateRootStat;
  try { templateRootStat = lstatSync(templateRoot); } catch { fail('INVENTORY_INVALID'); }
  if (!templateRootStat.isDirectory() || templateRootStat.isSymbolicLink()) fail('LINK_REJECTED');
  assertNoLinkedAncestors(templateRoot);
  const actualSources = [];
  function enumerate(directory, relativeDirectory) {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const relative = relativeDirectory ? `${relativeDirectory}/${item.name}` : item.name;
      const absolute = path.join(directory, item.name);
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink() || (process.platform === 'win32' && (stat.attributes & 0x400) !== 0)) fail('LINK_REJECTED');
      if (item.isDirectory()) enumerate(absolute, relative);
      else if (item.isFile()) actualSources.push(`templates/${relative}`);
      else fail('INVENTORY_INVALID');
    }
  }
  enumerate(templateRoot, '');
  actualSources.sort();
  const registeredSources = [...sources].sort();
  if (actualSources.length !== registeredSources.length
      || actualSources.some((source, index) => source !== registeredSources[index])) fail('INVENTORY_INVALID');
  return entries;
}

function tokenValues(record) {
  const values = {
    __SERVICE_ID__: record.id,
    __PACKAGE_NAME__: record.packageName,
    __PACKAGE_PATH__: record.packageName.replaceAll('.', '/'),
    __ENTRY_CLASS__: record.entryClass,
  };
  if (record.variant === 'relational') {
    values.__DB_NAME__ = record.database;
    values.__TEST_DB_NAME__ = record.testDatabase;
    values.__SCHEMA_NAME__ = record.schema;
    values.__ENV_PREFIX__ = record.environmentPrefix;
  }
  for (const [token, value] of Object.entries(values)) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(value)) fail('INPUT_INVALID');
    if (token === '__SERVICE_ID__' && !/^[a-z][a-z0-9-]{0,62}$/.test(value)) fail('INPUT_INVALID');
  }
  return values;
}

export function expandLiteral(source, values, sourcePath = '') {
  const wrapperPassThrough = sourcePath === 'templates/common/mvnw.cmd'
    ? new Set(['__MVNW_ARG0_NAME__', '__MVNW_CMD__', '__MVNW_ERROR__']) : new Set();
  const recognized = [...ALLOWED_TOKENS, ...wrapperPassThrough]
    .sort((left, right) => right.length - left.length)
    .map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const recognizedPattern = new RegExp(recognized.join('|'), 'g');
  const expanded = source.replace(recognizedPattern, token => {
    if (wrapperPassThrough.has(token)) return token;
    if (!Object.hasOwn(values, token)) fail('TOKEN_UNRESOLVED');
    return values[token];
  });
  const remainingTokens = expanded.match(/__[A-Za-z][A-Za-z0-9_]*__/g) ?? [];
  if (remainingTokens.some(token => !wrapperPassThrough.has(token))) fail('TOKEN_UNKNOWN');
  return expanded;
}

function readTemplate(absolute) {
  let stat;
  try { stat = lstatSync(absolute); } catch { fail('INVENTORY_INVALID'); }
  if (!stat.isFile() || stat.isSymbolicLink() || (process.platform === 'win32' && (stat.attributes & 0x400) !== 0)) {
    fail('LINK_REJECTED');
  }
  const bytes = readFileSync(absolute);
  if (bytes.includes(0) || (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)) {
    fail('INVENTORY_INVALID');
  }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { fail('INVENTORY_INVALID'); }
  text = text.replace(/\r\n/g, '\n');
  if (text.includes('\r')) fail('INVENTORY_INVALID');
  return text;
}

function assertNoDestinationOrCaseAlias(servicesRoot, destination) {
  const desiredName = path.basename(destination);
  for (const entry of readdirSync(servicesRoot, { withFileTypes: true })) {
    if (entry.name.toLowerCase() === desiredName.toLowerCase()) {
      const absolute = path.join(servicesRoot, entry.name);
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink() || (process.platform === 'win32' && (stat.attributes & 0x400) !== 0)) fail('LINK_REJECTED');
      fail('DESTINATION_EXISTS');
    }
  }
}

function findPublisher() {
  const candidates = process.platform === 'win32' ? ['pwsh.exe', 'pwsh', 'powershell.exe'] : ['pwsh'];
  for (const executable of candidates) {
    const probe = spawnSync(executable, ['-NoProfile', '-NonInteractive', '-Command', 'exit 0'], { encoding: 'utf8' });
    if (!probe.error && probe.status === 0) return executable;
    if (probe.error?.code === 'EACCES') return null;
  }
  return null;
}

function safeRemoveOwnedStage(stage, servicesRoot, identity, parentIdentity) {
  try {
    assertNoLinkedAncestors(servicesRoot);
    if (realpathSync(servicesRoot) !== servicesRoot) return;
    const parent = lstatSync(servicesRoot);
    if (parent.dev !== parentIdentity.dev || parent.ino !== parentIdentity.ino) return;
    const stat = lstatSync(stage);
    if (stat.isDirectory() && !stat.isSymbolicLink()
        && identity && stat.dev === identity.dev && stat.ino === identity.ino
        && path.dirname(stage) === servicesRoot
        && path.basename(stage).startsWith('.foundation-stage-')) rmSync(stage, { recursive: true, force: false });
  } catch { /* Cleanup is best-effort and never broadens beyond the owned stage path. */ }
}

export function inspectGenerationArtifacts(repositoryRoot) {
  const root = canonicalRepositoryRoot(repositoryRoot);
  const servicesRoot = path.join(root, 'api/services');
  assertNoLinkedAncestors(servicesRoot);
  return readdirSync(servicesRoot).filter(name => name === '.foundation-generation.lock'
    || /^\.foundation-stage-[0-9a-f]{32}$/.test(name)).sort()
    .map(name => `api/services/${name}`);
}

// Internal IO seam for deterministic fault tests; the public CLI/API never accepts it.
export const nativeGeneratorIo = Object.freeze({ readTemplate, writeFileSync, findPublisher, publish: spawnSync });

export function generateService({ serviceId, repositoryRoot }, io = nativeGeneratorIo) {
  const root = canonicalRepositoryRoot(repositoryRoot);
  if (typeof serviceId !== 'string') fail('INPUT_INVALID');
  const records = validateRegistry(root);
  const record = records.get(serviceId);
  if (!record) fail('SERVICE_UNKNOWN');
  if (record.preserved) fail('SERVICE_PRESERVED');

  const inventory = validateInventory(root);
  const values = tokenValues(record);
  const selected = inventory.filter(entry => entry.variants.includes(record.variant));
  const rendered = selected.map(entry => {
    const source = validateRelativePath(entry.source, 'INVENTORY_INVALID');
    const destination = validateRelativePath(expandLiteral(entry.destination, values), 'PATH_UNSAFE');
    const contents = expandLiteral(io.readTemplate(path.join(root, 'api/service-foundation', ...source.split('/'))), values, source);
    return { source, destination, mode: entry.mode, contents };
  }).sort((left, right) => left.destination < right.destination ? -1 : left.destination > right.destination ? 1 : 0);

  const seenOutputs = new Set();
  for (const item of rendered) {
    const folded = item.destination.toLowerCase();
    if (seenOutputs.has(folded)) fail('INVENTORY_INVALID');
    seenOutputs.add(folded);
  }

  const servicesRelative = path.join('api', 'services');
  const servicesRoot = path.join(root, servicesRelative);
  let servicesStat;
  try { servicesStat = lstatSync(servicesRoot); } catch { fail('PATH_UNSAFE'); }
  if (!servicesStat.isDirectory() || servicesStat.isSymbolicLink()) fail('LINK_REJECTED');
  assertNoLinkedAncestors(servicesRoot);
  const destination = path.join(root, ...record.destination.split('/'));
  assertNoDestinationOrCaseAlias(servicesRoot, destination);

  if (inspectGenerationArtifacts(root).length !== 0) fail('GENERATION_INTERRUPTED');

  const publisher = io.findPublisher();
  if (!publisher) fail('PUBLISH_BACKEND_UNAVAILABLE');

  const lockPath = path.join(servicesRoot, '.foundation-generation.lock');
  const lockNonce = `${process.pid}-${randomBytes(16).toString('hex')}`;
  let lockHandle;
  let lockIdentity;
  try {
    lockHandle = openSync(lockPath, 'wx', 0o600);
    lockIdentity = lstatSync(lockPath);
    writeFileSync(lockHandle, lockNonce, 'utf8');
  } catch (error) {
    if (lockHandle !== undefined) {
      try { closeSync(lockHandle); } catch { /* Preserve original failure. */ }
      try {
        assertNoLinkedAncestors(servicesRoot);
        const stat = lstatSync(lockPath);
        if (lockIdentity && stat.dev === lockIdentity.dev && stat.ino === lockIdentity.ino) rmSync(lockPath);
      } catch { /* Uncertain ownership leaves the artifact for explicit inspection. */ }
    }
    if (error.code === 'EEXIST') fail('GENERATION_INTERRUPTED');
    fail('PUBLICATION_FAILED');
  }

  const stageName = `.foundation-stage-${cryptoRandomId()}`;
  const stage = path.join(servicesRoot, stageName);
  let stageCreated = false;
  let stageIdentity;
  const assertOwnedBoundary = () => {
    assertNoLinkedAncestors(servicesRoot);
    const currentParent = lstatSync(servicesRoot);
    const currentStage = lstatSync(stage);
    if (currentParent.dev !== servicesStat.dev || currentParent.ino !== servicesStat.ino
        || !stageIdentity || currentStage.dev !== stageIdentity.dev || currentStage.ino !== stageIdentity.ino
        || !currentStage.isDirectory() || currentStage.isSymbolicLink()) fail('PATH_UNSAFE');
  };
  try {
    mkdirSync(stage, { mode: 0o700 });
    stageCreated = true;
    stageIdentity = lstatSync(stage);
    for (const item of rendered) {
      assertOwnedBoundary();
      const target = path.join(stage, ...item.destination.split('/'));
      const parent = path.dirname(target);
      mkdirSync(parent, { recursive: true, mode: 0o755 });
      io.writeFileSync(target, item.contents, { encoding: 'utf8', flag: 'wx', mode: item.mode });
      assertOwnedBoundary();
      chmodSync(target, item.mode);
    }
    for (const item of rendered) {
      const target = path.join(stage, ...item.destination.split('/'));
      const stat = lstatSync(target);
      if (!stat.isFile() || stat.isSymbolicLink()) fail('PUBLICATION_FAILED');
      if (readFileSync(target, 'utf8') !== item.contents) fail('PUBLICATION_FAILED');
      if (process.platform !== 'win32' && (stat.mode & 0o777) !== item.mode) fail('PUBLICATION_FAILED');
    }

    const args = [
      '-NoProfile', '-NonInteractive', '-File', path.join(SCRIPT_DIRECTORY, 'Publish-ServiceDirectory.ps1'),
      '-StagePath', stage, '-DestinationPath', destination, '-ServicesRoot', servicesRoot,
    ];
    assertOwnedBoundary();
    assertNoLinkedAncestors(stage);
    assertNoDestinationOrCaseAlias(servicesRoot, destination);
    const result = io.publish(publisher, args, { encoding: 'utf8', windowsHide: true });
    if (result.error) fail('PUBLICATION_FAILED');
    if (result.status !== 0) {
      const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
      const code = ['PATH_UNSAFE', 'LINK_REJECTED', 'DESTINATION_EXISTS', 'PUBLICATION_FAILED'].find(item => output.includes(item));
      fail(code ?? 'PUBLICATION_FAILED');
    }
    stageCreated = false;
    return { serviceId: record.id, variant: record.variant, files: rendered.map(item => item.destination) };
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (/^[A-Z_]+$/.test(code)) throw error;
    fail('PUBLICATION_FAILED');
  } finally {
    if (stageCreated) safeRemoveOwnedStage(stage, servicesRoot, stageIdentity, servicesStat);
    try { closeSync(lockHandle); } catch { /* closed handle cleanup is idempotent */ }
    try {
      assertNoLinkedAncestors(servicesRoot);
      const lockStat = lstatSync(lockPath);
      if (lockStat.isFile() && !lockStat.isSymbolicLink()
          && lockStat.dev === lockIdentity.dev && lockStat.ino === lockIdentity.ino
          && readFileSync(lockPath, 'utf8') === lockNonce) rmSync(lockPath, { force: true });
    } catch { /* Never remove an unowned or replaced lock. */ }
  }
}

function cryptoRandomId() {
  return randomBytes(16).toString('hex');
}
````


### api/scripts/foundation/ServiceTemplateConformance.mjs

Original-byte SHA256: 944863246d1030ebf42c256870e491908f84a0302441db377a9b2b5ada38d3a5

````javascript
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateInventory, expandLiteral } from './ServiceGeneratorCore.mjs';

const referenceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const tokens = new Set(['__SERVICE_ID__', '__PACKAGE_NAME__', '__PACKAGE_PATH__', '__ENTRY_CLASS__',
  '__DB_NAME__', '__TEST_DB_NAME__', '__SCHEMA_NAME__', '__ENV_PREFIX__']);
const wrapperTokens = new Set(['__MVNW_ARG0_NAME__', '__MVNW_CMD__', '__MVNW_ERROR__']);
function requireCondition(value) { if (!value) throw new Error('TEMPLATE_CONFORMANCE_FAILED'); }
function normalized(file) { return readFileSync(file, 'utf8').replace(/\r\n/g, '\n'); }

export function validateTemplateConformance(root) {
  const entries = validateInventory(root);
  const texts = new Map(entries.map(entry => [entry.source,
    normalized(path.join(root, 'api/service-foundation', entry.source))]));
  const logging = texts.get('templates/common/StructuredLoggingTest.java') ?? '';
  for (const pattern of [/new StructuredLogEncoder\(/, /encoder\.encode\(/,
    /STRICT_DUPLICATE_DETECTION/, /@NullSource/, /fixture-correlation/, /outer-correlation/,
    /TechnicalProbeController\.class/, /new CorrelationIdFilter\(\)\.doFilter/,
    /prepareForDeferredProcessing/, /MDC\.getCopyOfContextMap\(\)\)\.isEqualTo\(expectedMdc\)/,
    /doesNotContain\(raw\)/]) requireCondition(pattern.test(logging));
  const architecture = texts.get('templates/common/ArchitectureTest.java') ?? '';
  for (const fixture of ['InvalidAdapterDependency', 'InvalidFrameworkDependency', 'InvalidInboundDependency']) {
    requireCondition(architecture.includes(`.hasMessageContaining("${fixture}")`));
  }
  requireCondition((architecture.match(/\.isInstanceOf\(AssertionError\.class\)/g) ?? []).length === 3);
  requireCondition(architecture.includes('APPLICATION_RULE.check(fixture)') && architecture.includes('INBOUND_RULE.check(fixture)'));
  for (const rule of ['DOMAIN_RULE', 'APPLICATION_RULE', 'PORTS_RULE']) {
    requireCondition(architecture.includes(`${rule}.allowEmptyShould(true).check(PRODUCTION)`));
  }
  requireCondition(!/allowEmptyShould\(true\)\.check\(fixture\)/.test(architecture));
  for (const entry of entries) {
    const text = texts.get(entry.source);
    const values = Object.fromEntries([...tokens].filter(token => !entry.variants.includes('gateway')
      || !/^__(?:DB_NAME|TEST_DB_NAME|SCHEMA_NAME|ENV_PREFIX)__$/.test(token)).map(token => [token, 'fixture']));
    try {
      expandLiteral(entry.destination, values);
      expandLiteral(text, values, entry.source);
    } catch { requireCondition(false); }
    if (['mvnw', 'mvnw.cmd', '.mvn/wrapper/maven-wrapper.properties'].includes(entry.destination)) {
      requireCondition(text === normalized(path.join(referenceRoot, 'api/services/identity-profile-service', entry.destination)));
    }
  }
  const requiredCommon = ['pom.xml', 'mvnw', 'mvnw.cmd', '.mvn/wrapper/maven-wrapper.properties',
    'Dockerfile', 'README.md', 'src/main/resources/application.yaml', 'src/main/resources/application-local.yaml',
    'src/main/java/__PACKAGE_PATH__/__ENTRY_CLASS__.java',
    'src/main/java/__PACKAGE_PATH__/configuration/TechnicalConfiguration.java',
    'src/test/java/__PACKAGE_PATH__/TechnicalHttpTest.java', 'src/test/java/__PACKAGE_PATH__/StructuredLoggingTest.java',
    'src/test/java/__PACKAGE_PATH__/architecture/ArchitectureTest.java'];
  for (const variant of ['relational', 'gateway']) {
    const selected = entries.filter(entry => entry.variants.includes(variant));
    const paths = new Set(selected.map(entry => entry.destination));
    requireCondition(requiredCommon.every(destination => paths.has(destination)));
    const pom = texts.get(selected.find(entry => entry.destination === 'pom.xml').source);
    const selector = variant === 'gateway' ? '**/GatewayNoDatastoreIT.java' : '**/*TestcontainersIT.java';
    requireCondition(pom.includes(`<include>${selector}</include>`) && !/<skipITs>\s*true/.test(pom));
    const className = variant === 'gateway' ? 'GatewayNoDatastoreIT' : 'RelationalBoundaryTestcontainersIT';
    requireCondition(paths.has(`src/test/java/__PACKAGE_PATH__/${className}.java`));
    if (variant === 'gateway') {
      requireCondition(!/spring-boot-starter-(?:data-jpa|jdbc)|<artifactId>spring-jdbc<|org\.postgresql|flyway|<artifactId>postgresql</i.test(pom));
      for (const entry of selected) {
        const text = texts.get(entry.source);
        requireCondition(!/migration|bootstrap|TestcontainersIT/.test(entry.destination));
        if (/\.ya?ml$/.test(entry.destination)) requireCondition(!/datasource|flyway|jdbc|postgres|readinessState,db/i.test(text));
        if (/\.java$/.test(entry.destination)) requireCondition(!/^\s*import\s+(?:static\s+)?(?:java\.sql|javax\.sql|org\.springframework\.jdbc|org\.postgresql|org\.flywaydb|org\.testcontainers)/m.test(text));
      }
    }
  }
  return { files: entries.length, variants: ['relational', 'gateway'] };
}
````


### api/scripts/supply-chain/GitleaksScanning.psm1

Original-byte SHA256: c3538cb8e383f4892f9592fb5bd07b8a100ff731f08f3518c9ba9005a2e6dc8e

````powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Throw-GitleaksScanFailure {
    param([Parameter(Mandatory)][string]$Code)
    throw $Code
}

function Test-PathWithinRoot {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Root
    )

    $resolvedPath = [System.IO.Path]::GetFullPath($Path)
    $resolvedRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    $prefix = $resolvedRoot + [System.IO.Path]::DirectorySeparatorChar
    return $resolvedPath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)
}

function Get-WorkingTreeCandidatePaths {
    param([Parameter(Mandatory)][string]$RepositoryRoot)

    $repositoryRoot = [System.IO.Path]::GetFullPath($RepositoryRoot)
    if (-not (Test-Path -LiteralPath $repositoryRoot -PathType Container)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_REPOSITORY_ROOT_MISSING'
    }

    $insideWorkTree = @(& git -C $repositoryRoot rev-parse --is-inside-work-tree 2>$null)
    if ($LASTEXITCODE -ne 0 -or $insideWorkTree.Count -ne 1 -or "$($insideWorkTree[0])" -ne 'true') {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_REPOSITORY_NOT_A_WORKTREE'
    }

    # This is deliberately Git's candidate set, not an unrestricted filesystem walk.
    # It includes tracked and non-ignored untracked files while excluding .env.local
    # when it follows the repository's ignore rules.
    $candidateOutput = @(& git -C $repositoryRoot ls-files --cached --others --exclude-standard 2>$null)
    if ($LASTEXITCODE -ne 0) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_WORKING_TREE_ENUMERATION_FAILED'
    }

    $candidates = New-Object System.Collections.Generic.List[string]
    foreach ($candidateValue in $candidateOutput) {
        $candidate = "$candidateValue"
        if ([string]::IsNullOrWhiteSpace($candidate)) {
            Throw-GitleaksScanFailure -Code 'GITLEAKS_WORKING_TREE_PATH_UNSAFE'
        }
        # Route groups and dynamic route segments use () and [] as literal
        # filename characters. They are never evaluated as wildcard patterns.
        if ($candidate -notmatch '^[A-Za-z0-9._/()\[\]-]+$' -or $candidate -match '(^|/)\.\.(/|$)' -or $candidate.StartsWith('/') -or $candidate -match '^[A-Za-z]:') {
            Throw-GitleaksScanFailure -Code 'GITLEAKS_WORKING_TREE_PATH_UNSAFE'
        }
        if ($candidate -match '(^|/)\.env\.local$') {
            Throw-GitleaksScanFailure -Code 'GITLEAKS_ENV_LOCAL_CANDIDATE_REJECTED'
        }

        $sourcePath = Join-Path $repositoryRoot ($candidate -replace '/', [System.IO.Path]::DirectorySeparatorChar)
        if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
            # A tracked deletion is not present in the working tree and cannot be
            # copied; the Git-history scan covers its committed content.
            continue
        }
        $item = Get-Item -LiteralPath $sourcePath -Force
        if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            Throw-GitleaksScanFailure -Code 'GITLEAKS_WORKING_TREE_REPARSE_POINT_REJECTED'
        }
        if (-not (Test-PathWithinRoot -Path $sourcePath -Root $repositoryRoot)) {
            Throw-GitleaksScanFailure -Code 'GITLEAKS_WORKING_TREE_PATH_ESCAPES_ROOT'
        }
        $candidates.Add($candidate)
    }

    return @($candidates | Sort-Object -Unique)
}

function New-WorkingTreeSnapshot {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$TemporaryRoot
    )

    $repositoryRoot = [System.IO.Path]::GetFullPath($RepositoryRoot)
    $temporaryRoot = [System.IO.Path]::GetFullPath($TemporaryRoot)
    if (Test-PathWithinRoot -Path $temporaryRoot -Root $repositoryRoot) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_SNAPSHOT_ROOT_INSIDE_REPOSITORY'
    }
    if (Test-Path -LiteralPath $temporaryRoot) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_SNAPSHOT_ROOT_ALREADY_EXISTS'
    }

    New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
    try {
        $candidates = @(Get-WorkingTreeCandidatePaths -RepositoryRoot $repositoryRoot)
        foreach ($candidate in $candidates) {
            $sourcePath = Join-Path $repositoryRoot ($candidate -replace '/', [System.IO.Path]::DirectorySeparatorChar)
            $destinationPath = Join-Path $temporaryRoot ($candidate -replace '/', [System.IO.Path]::DirectorySeparatorChar)
            $destinationDirectory = Split-Path -Parent $destinationPath
            [System.IO.Directory]::CreateDirectory($destinationDirectory) | Out-Null
            if (-not [System.IO.Directory]::Exists($destinationDirectory)) {
                Throw-GitleaksScanFailure -Code 'GITLEAKS_SNAPSHOT_DIRECTORY_CREATION_FAILED'
            }
            [System.IO.File]::Copy($sourcePath, $destinationPath, $true)
        }
        return [pscustomobject]@{
            snapshotRoot = $temporaryRoot
            candidateCount = $candidates.Count
        }
    } catch {
        if (Test-Path -LiteralPath $temporaryRoot) {
            Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
        }
        throw
    }
}

function Get-VerifiedGitleaksExecutable {
    [OutputType([string])]
    param()

    $toolingModulePath = Join-Path $PSScriptRoot 'SupplyChainTooling.psm1'
    if (-not (Test-Path -LiteralPath $toolingModulePath -PathType Leaf)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_BOOTSTRAP_MODULE_MISSING'
    }
    Import-Module $toolingModulePath -Force
    $platform = Resolve-SupportedPlatform
    return Get-VerifiedTool -ToolName 'gitleaks' -Platform $platform -VerifyOnly
}

function Get-GitleaksScanArguments {
    [OutputType([string[]])]
    param(
        [Parameter(Mandatory)]$ScanDefinition,
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$InputPath,
        [Parameter(Mandatory)][string]$OutputPath
    )

    $repositoryRoot = [System.IO.Path]::GetFullPath($RepositoryRoot)
    $outputPath = [System.IO.Path]::GetFullPath($OutputPath)
    $configPath = Join-Path $repositoryRoot 'security\tooling\gitleaks.toml'
    $ignorePath = Join-Path $repositoryRoot 'security\tooling\gitleaks-empty-ignore.txt'
    if (-not (Test-Path -LiteralPath $configPath -PathType Leaf) -or -not (Test-Path -LiteralPath $ignorePath -PathType Leaf)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_CONFIGURATION_MISSING'
    }

    $id = "$($ScanDefinition.id)"
    if ($id -eq 'working-tree') {
        return @('dir', $InputPath, '--config', $configPath, '--gitleaks-ignore-path', $ignorePath, '--ignore-gitleaks-allow', '--redact=100', '--report-format', 'json', '--report-path', $outputPath, '--exit-code', '3', '--log-level', 'error', '--no-banner', '--no-color', '--timeout', '300')
    }
    if ($id -eq 'git-history') {
        $inputPath = [System.IO.Path]::GetFullPath($InputPath)
        return @('git', $inputPath, '--log-opts', '--full-history --all', '--config', $configPath, '--gitleaks-ignore-path', $ignorePath, '--ignore-gitleaks-allow', '--redact=100', '--report-format', 'json', '--report-path', $outputPath, '--exit-code', '3', '--log-level', 'error', '--no-banner', '--no-color', '--timeout', '300')
    }
    Throw-GitleaksScanFailure -Code 'GITLEAKS_SCAN_DEFINITION_UNSUPPORTED'
}

function Invoke-GitleaksScan {
    [OutputType([pscustomobject])]
    param(
        [Parameter(Mandatory)][string]$GitleaksExecutable,
        [Parameter(Mandatory)]$ScanDefinition,
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$InputPath,
        [Parameter(Mandatory)][string]$OutputPath,
        [string]$WorkingDirectory
    )

    if (-not (Test-Path -LiteralPath $GitleaksExecutable -PathType Leaf)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_EXECUTABLE_MISSING'
    }
    $outputDirectory = Split-Path -Parent $OutputPath
    if ([string]::IsNullOrWhiteSpace($outputDirectory)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_REPORT_PATH_INVALID'
    }
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    $arguments = @(Get-GitleaksScanArguments -ScanDefinition $ScanDefinition -RepositoryRoot $RepositoryRoot -InputPath $InputPath -OutputPath $OutputPath)
    if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory) -and -not (Test-Path -LiteralPath $WorkingDirectory -PathType Container)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_WORKING_DIRECTORY_MISSING'
    }
    # Never forward native output: even with --redact=100 it is not evidence.
    if ([string]::IsNullOrWhiteSpace($WorkingDirectory)) {
        $null = @(& $GitleaksExecutable @arguments 2>&1)
        $exitCode = $LASTEXITCODE
    } else {
        Push-Location $WorkingDirectory
        try {
            $null = @(& $GitleaksExecutable @arguments 2>&1)
            $exitCode = $LASTEXITCODE
        } finally {
            Pop-Location
        }
    }
    if ($exitCode -notin @(0, 3)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_SCAN_FAILED'
    }
    return [pscustomobject]@{
        scanId = "$($ScanDefinition.id)"
        exitCode = $exitCode
        reportPath = [System.IO.Path]::GetFullPath($OutputPath)
    }
}

function Get-GitleaksPropertyValue {
    param([Parameter(Mandatory)]$Object, [Parameter(Mandatory)][string]$Name)
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) { return $null }
    return $property.Value
}

function ConvertTo-GitleaksRepositoryRelativePath {
    param(
        [Parameter(Mandatory)][string]$ReportedPath,
        [Parameter(Mandatory)][ValidateSet('dir', 'git')][string]$ScanMode,
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [string]$SnapshotRoot
    )

    if ([string]::IsNullOrWhiteSpace($ReportedPath)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_REPORT_PATH_MISSING'
    }
    if ([System.IO.Path]::IsPathRooted($ReportedPath)) {
        if ($ScanMode -ne 'dir' -or [string]::IsNullOrWhiteSpace($SnapshotRoot) -or -not (Test-PathWithinRoot -Path $ReportedPath -Root $SnapshotRoot)) {
            Throw-GitleaksScanFailure -Code 'GITLEAKS_REPORT_PATH_ABSOLUTE'
        }
        $relative = $ReportedPath.Substring(([System.IO.Path]::GetFullPath($SnapshotRoot).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)).Length).TrimStart([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    } else {
        $relative = $ReportedPath
    }
    $relative = $relative.Replace('\\', '/')
    if ($relative -notmatch '^[A-Za-z0-9._/()\[\]-]+$' -or $relative -match '(^|/)\.\.(/|$)' -or $relative.StartsWith('/') -or $relative -match '^[A-Za-z]:') {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_REPORT_PATH_UNSAFE'
    }
    return $relative
}

function ConvertTo-SanitizedGitleaksInventory {
    [OutputType([object[]])]
    param(
        [Parameter(Mandatory)][string]$ReportPath,
        [Parameter(Mandatory)][ValidateSet('dir', 'git')][string]$ScanMode,
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [string]$SnapshotRoot
    )

    if (-not (Test-Path -LiteralPath $ReportPath -PathType Leaf)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_REPORT_MISSING'
    }
    try {
        $rawJson = Get-Content -LiteralPath $ReportPath -Raw -ErrorAction Stop
    } catch {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_REPORT_MALFORMED'
    }
    try {
        # Do not parse through the pipeline: PowerShell hosts differ in
        # whether a root JSON array is emitted as individual findings or as a
        # single Object[] pipeline item. Parse first, then normalize the
        # result explicitly so the validation loop always receives findings.
        $parsedRaw = ConvertFrom-Json -InputObject $rawJson -ErrorAction Stop
        $raw = @($parsedRaw)
    } catch {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_REPORT_MALFORMED'
    }
    # Windows PowerShell 5.1 unwraps a one-element JSON array when it flows
    # through ConvertFrom-Json. After validating JSON syntax, check the root
    # token and normalize the parsed result for identical 5.1/7 behavior.
    if (-not $rawJson.TrimStart().StartsWith('[')) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_REPORT_SHAPE_INVALID'
    }
    if ($raw.Count -eq 0) { return @() }

    $inventory = New-Object System.Collections.Generic.List[object]
    $seen = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($finding in @($raw)) {
        if ($null -eq $finding) { Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_FINDING_INVALID' }
        $ruleId = "$(Get-GitleaksPropertyValue -Object $finding -Name 'RuleID')"
        $file = "$(Get-GitleaksPropertyValue -Object $finding -Name 'File')"
        $fingerprint = "$(Get-GitleaksPropertyValue -Object $finding -Name 'Fingerprint')"
        if ($ruleId -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$') { Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_RULE_ID_INVALID' }
        if ([string]::IsNullOrWhiteSpace($fingerprint) -or $fingerprint -match '[\r\n]' -or $fingerprint -match '[A-Za-z]:[\\/]') { Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_FINGERPRINT_INVALID' }
        $relativePath = ConvertTo-GitleaksRepositoryRelativePath -ReportedPath $file -ScanMode $ScanMode -RepositoryRoot $RepositoryRoot -SnapshotRoot $SnapshotRoot

        $commitValue = Get-GitleaksPropertyValue -Object $finding -Name 'Commit'
        $commitId = if ($null -eq $commitValue) { '' } else { "$commitValue" }
        if ($ScanMode -eq 'git') {
            if ($commitId -notmatch '^[a-f0-9]{40}$') { Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_COMMIT_INVALID' }
            if ($fingerprint -notmatch ('^' + [regex]::Escape($commitId) + ':' + [regex]::Escape($relativePath) + ':' + [regex]::Escape($ruleId) + ':[0-9]+$')) { Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_FINGERPRINT_INVALID' }
        } else {
            if (-not [string]::IsNullOrWhiteSpace($commitId)) { Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_COMMIT_UNEXPECTED' }
            if ($fingerprint -notmatch ('^' + [regex]::Escape($relativePath) + ':' + [regex]::Escape($ruleId) + ':[0-9]+$')) { Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_FINGERPRINT_INVALID' }
            $commitId = $null
        }
        $key = @($ScanMode, $ruleId, $relativePath, $fingerprint, $commitId) -join "`0"
        if (-not $seen.Add($key)) { Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_FINDING_DUPLICATE' }
        $inventory.Add([pscustomobject]@{
            scanMode = $ScanMode
            ruleId = $ruleId
            repositoryRelativePath = $relativePath
            scannerFingerprint = $fingerprint
            commitId = $commitId
            status = 'observed'
            remediationReference = $null
        })
    }
    return $inventory.ToArray()
}

function ConvertTo-GitleaksUtcTimestamp {
    param([Parameter(Mandatory)][string]$Value, [Parameter(Mandatory)][string]$FailureCode)
    try {
        return [datetimeoffset]::ParseExact($Value, 'yyyy-MM-ddTHH:mm:ssZ', [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::AssumeUniversal).ToUniversalTime()
    } catch {
        Throw-GitleaksScanFailure -Code $FailureCode
    }
}

function Test-GitleaksPolicy {
    [OutputType([object[]])]
    param(
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Inventory,
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Allowlist,
        [Parameter(Mandatory)][datetime]$NowUtc
    )

    $decisions = New-Object System.Collections.Generic.List[object]
    foreach ($finding in $Inventory) {
        $matches = @($Allowlist | Where-Object {
            $_.scanMode -ceq $finding.scanMode -and $_.ruleId -ceq $finding.ruleId -and $_.repositoryRelativePath -ceq $finding.repositoryRelativePath -and $_.scannerFingerprint -ceq $finding.scannerFingerprint -and "$(if ($null -eq $_.commitId) { '' } else { $_.commitId })" -ceq "$(if ($null -eq $finding.commitId) { '' } else { $finding.commitId })"
        })
        if ($matches.Count -gt 1) { Throw-GitleaksScanFailure -Code 'GITLEAKS_ALLOWLIST_AMBIGUOUS' }
        if ($matches.Count -eq 0) { Throw-GitleaksScanFailure -Code 'GITLEAKS_FINDING_REQUIRES_INCIDENT' }
        $entry = $matches[0]
        $approvedAt = ConvertTo-GitleaksUtcTimestamp -Value "$($entry.approvedAt)" -FailureCode 'GITLEAKS_ALLOWLIST_APPROVAL_INVALID'
        $expiresAt = ConvertTo-GitleaksUtcTimestamp -Value "$($entry.expiresAt)" -FailureCode 'GITLEAKS_ALLOWLIST_EXPIRY_INVALID'
        if ($approvedAt.UtcDateTime -gt $NowUtc.ToUniversalTime()) { Throw-GitleaksScanFailure -Code 'GITLEAKS_ALLOWLIST_APPROVAL_IN_FUTURE' }
        if ($expiresAt.UtcDateTime -le $NowUtc.ToUniversalTime()) { Throw-GitleaksScanFailure -Code 'GITLEAKS_ALLOWLIST_EXPIRED' }
        $decisions.Add([pscustomobject]@{
            scanMode = $finding.scanMode
            ruleId = $finding.ruleId
            repositoryRelativePath = $finding.repositoryRelativePath
            scannerFingerprint = $finding.scannerFingerprint
            commitId = $finding.commitId
            status = 'false-positive'
            remediationReference = "$($entry.remediationReference)"
        })
    }
    return $decisions.ToArray()
}

function Assert-ExpectedGitleaksFixtureFinding {
    param(
        [Parameter(Mandatory)]$ScanResult,
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Inventory,
        [Parameter(Mandatory)][ValidateSet('dir', 'git')][string]$ScanMode
    )
    $matches = @($Inventory | Where-Object {
        $_.scanMode -ceq $ScanMode -and $_.ruleId -ceq 'apx-controlled-secret-fixture' -and $_.repositoryRelativePath -ceq 'fixture.txt' -and $_.status -ceq 'observed'
    })
    if ($ScanResult.exitCode -ne 3 -or $matches.Count -ne 1 -or $Inventory.Count -ne 1) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_FIXTURE_NOT_DETECTED'
    }
    return $matches[0]
}

Export-ModuleMember -Function 'Get-WorkingTreeCandidatePaths', 'New-WorkingTreeSnapshot', 'Get-VerifiedGitleaksExecutable', 'Get-GitleaksScanArguments', 'Invoke-GitleaksScan', 'ConvertTo-SanitizedGitleaksInventory', 'Test-GitleaksPolicy', 'Assert-ExpectedGitleaksFixtureFinding'
````


### api/scripts/supply-chain/HostedSupplyChain.psm1

Original-byte SHA256: 110495a1bdbd77c8bae30752ca140ed16559887edbba9f5b201e8c87d1bfcf1f

````powershell
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:AllowedFailureCodes = @(
    'SUPPLY_CHAIN_NOT_STARTED', 'CHECKOUT_FAILED', 'CONTRACT_VALIDATION_FAILED', 'TOOL_BOOTSTRAP_FAILED',
    'SBOM_BUILD_FAILED', 'SBOM_VALIDATION_FAILED', 'DEPENDENCY_SCAN_FAILED', 'SECRET_SCAN_FAILED',
    'BASE_TRUST_FAILED', 'IMAGE_BUILD_FAILED', 'SMOKE_FAILED', 'CONTAINER_SCAN_FAILED',
    'SCANNER_OUTPUT_INVALID', 'POLICY_EVALUATION_FAILED', 'EVIDENCE_SANITIZATION_FAILED',
    'EVIDENCE_VALIDATION_FAILED', 'EVIDENCE_UPLOAD_FAILED', 'CLEANUP_FAILED',
    'TOOL_BOOTSTRAP_COSIGN_FAILED', 'TOOL_BOOTSTRAP_TRIVY_FAILED',
    'TOOL_BOOTSTRAP_PROVENANCE_FAILED', 'TOOL_BOOTSTRAP_TUF_REFRESH_FAILED', 'TOOL_BOOTSTRAP_GITLEAKS_FAILED',
    'TOOL_BOOTSTRAP_MODULE_LOAD_FAILED', 'TOOL_BOOTSTRAP_PLATFORM_RESOLUTION_FAILED', 'TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED', 'TOOL_BOOTSTRAP_WRAPPER_FAILED',
    'TOOL_BOOTSTRAP_SCRIPT_RESOLUTION_FAILED', 'TOOL_BOOTSTRAP_SHELL_RESOLUTION_FAILED', 'TOOL_BOOTSTRAP_CHILD_LAUNCH_FAILED', 'NONE'
)

function Assert-HostedCommit {
    param([Parameter(Mandatory)][string]$CommitSha)
    if ($CommitSha -notmatch '^[a-f0-9]{40}$') { throw 'HOSTED_SUMMARY_COMMIT_INVALID' }
}
function Assert-HostedSummary {
    param([Parameter(Mandatory)]$Summary)
    $names = @('schemaVersion','workflow','commit','executionState','policyState','reviewState','deltaState','failureCode')
    $actual = @($Summary.PSObject.Properties.Name)
    if (@($actual | Where-Object { $_ -notin $names }).Count -ne 0 -or @($names | Where-Object { $_ -notin $actual }).Count -ne 0) { throw 'HOSTED_SUMMARY_SHAPE_INVALID' }
    if ($Summary.schemaVersion -ne 1 -or $Summary.workflow -notin @('supply-chain','security-freshness')) { throw 'HOSTED_SUMMARY_INVALID' }
    Assert-HostedCommit -CommitSha ([string]$Summary.commit)
    if ($Summary.executionState -notin @('IMPLEMENTATION_FAILURE','PASS') -or $Summary.policyState -notin @('NOT_EVALUATED','PASS','BLOCKED') -or $Summary.reviewState -notin @('NOT_REQUIRED','REVIEW_REQUIRED') -or $Summary.deltaState -notin @('NOT_APPLICABLE','UNCHANGED','NEW','REMEDIATED','BASELINE_UNAVAILABLE') -or $Summary.failureCode -notin $script:AllowedFailureCodes) { throw 'HOSTED_SUMMARY_INVALID' }
    if ($Summary.executionState -eq 'IMPLEMENTATION_FAILURE' -and $Summary.policyState -ne 'NOT_EVALUATED') { throw 'HOSTED_SUMMARY_TRANSITION_INVALID' }
    if ($Summary.executionState -eq 'PASS' -and $Summary.failureCode -ne 'NONE') { throw 'HOSTED_SUMMARY_TRANSITION_INVALID' }
}
function New-HostedRunSummary {
    param([Parameter(Mandatory)][ValidateSet('supply-chain','security-freshness')][string]$Workflow, [Parameter(Mandatory)][string]$CommitSha)
    Assert-HostedCommit -CommitSha $CommitSha
    return [pscustomobject][ordered]@{ schemaVersion=1; workflow=$Workflow; commit=$CommitSha; executionState='IMPLEMENTATION_FAILURE'; policyState='NOT_EVALUATED'; reviewState='NOT_REQUIRED'; deltaState='NOT_APPLICABLE'; failureCode='SUPPLY_CHAIN_NOT_STARTED' }
}
function Read-HostedRunSummary {
    param([Parameter(Mandatory)][string]$Path)
    try { $summary = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop } catch { throw 'HOSTED_SUMMARY_READ_INVALID' }
    Assert-HostedSummary -Summary $summary; return $summary
}
function Write-HostedRunSummaryAtomic {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)]$Summary)
    Assert-HostedSummary -Summary $Summary
    $parent = Split-Path -Parent $Path; if ([string]::IsNullOrWhiteSpace($parent)) { throw 'HOSTED_SUMMARY_PATH_INVALID' }
    [void][System.IO.Directory]::CreateDirectory($parent)
    $temporary = Join-Path $parent ('.' + [guid]::NewGuid().ToString('N') + '.tmp')
    try { [System.IO.File]::WriteAllText($temporary, ($Summary | ConvertTo-Json -Depth 5 -Compress), [System.Text.UTF8Encoding]::new($false)); Move-Item -LiteralPath $temporary -Destination $Path -Force } finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force } }
}
function Set-HostedStageResult {
    param([Parameter(Mandatory)]$Summary, [Parameter(Mandatory)][ValidateSet('PASS','BLOCKED','IMPLEMENTATION_FAILURE','REVIEW_REQUIRED')][string]$Result, [string]$FailureCode = 'NONE')
    Assert-HostedSummary -Summary $Summary
    if ($Result -eq 'IMPLEMENTATION_FAILURE') { if ($FailureCode -notin $script:AllowedFailureCodes -or $FailureCode -eq 'NONE') { throw 'HOSTED_SUMMARY_FAILURE_CODE_INVALID' }; $Summary.executionState='IMPLEMENTATION_FAILURE'; $Summary.policyState='NOT_EVALUATED'; $Summary.failureCode=$FailureCode }
    elseif ($Result -eq 'REVIEW_REQUIRED') { $Summary.reviewState='REVIEW_REQUIRED' }
    elseif ($Result -eq 'BLOCKED') { if ($Summary.executionState -ne 'PASS') { throw 'HOSTED_SUMMARY_TRANSITION_INVALID' }; $Summary.policyState='BLOCKED' }
    else { $Summary.executionState='PASS'; $Summary.failureCode='NONE'; if ($Summary.policyState -eq 'NOT_EVALUATED') { $Summary.policyState='PASS' } }
    Assert-HostedSummary -Summary $Summary; return $Summary
}
function Complete-HostedExecution {
    param([Parameter(Mandatory)]$Summary, [ValidateSet('PASS','BLOCKED')][string]$PolicyState = 'PASS')
    $Summary.executionState='PASS'; $Summary.policyState=$PolicyState; $Summary.failureCode='NONE'
    # Freshness has no independently approved comparison baseline in Cycle 6.
    # It must say so explicitly; unchanged findings are never a policy bypass.
    if ($Summary.workflow -eq 'security-freshness' -and $Summary.deltaState -eq 'NOT_APPLICABLE') { $Summary.deltaState='BASELINE_UNAVAILABLE' }
    Assert-HostedSummary -Summary $Summary; return $Summary
}
function Format-HostedRunResult {
    param([Parameter(Mandatory)]$Summary)
    Assert-HostedSummary -Summary $Summary
    return ('Hosted supply-chain result: executionState={0}; policyState={1}; reviewState={2}; failureCode={3}' -f $Summary.executionState, $Summary.policyState, $Summary.reviewState, $Summary.failureCode)
}
function Get-HostedChildPowerShellExecutable {
    $runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
    $commandName = if ($runningOnWindows -and $PSVersionTable.PSEdition -ne 'Core') { 'powershell.exe' } elseif ($runningOnWindows) { 'pwsh.exe' } else { 'pwsh' }
    $command = Get-Command $commandName -ErrorAction Stop
    return $command.Source
}
function Read-HostedToolBootstrapStatus {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw 'TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED' }
    try {
        $status = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -ErrorAction Stop
        $expected = @('schemaVersion', 'state', 'failureCode')
        $actual = @($status.PSObject.Properties.Name)
        if ($actual.Count -ne $expected.Count -or @($actual | Where-Object { $_ -notin $expected }).Count -ne 0) { throw 'invalid' }
        if ($status.schemaVersion -ne 1 -or $status.state -notin @('PASS', 'FAILED')) { throw 'invalid' }
        if ($status.state -eq 'PASS' -and $status.failureCode -ne 'NONE') { throw 'invalid' }
        if ($status.state -eq 'FAILED' -and $status.failureCode -notmatch '^TOOL_BOOTSTRAP_[A-Z_]+_FAILED$') { throw 'invalid' }
        if ($status.state -eq 'FAILED' -and $status.failureCode -notin $script:AllowedFailureCodes) { throw 'invalid' }
        return $status
    } catch {
        if ($_.Exception.Message -match '^TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED$') { throw }
        throw 'TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED'
    }
}
function Read-HostedSmokeStatus {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw 'CONTAINER_SMOKE_WRAPPER_STARTUP_FAILED' }
    try {
        $status = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -ErrorAction Stop
        $actual = @($status.PSObject.Properties.Name)
        if ($status.schemaVersion -ne 1 -or $status.state -notin @('STARTED', 'FAILED', 'PASS') -or [string]$status.phase -notmatch '^[a-z-]+$') { throw 'invalid' }
        $expected = if ($status.state -eq 'FAILED') { @('schemaVersion', 'state', 'phase', 'failureCode', 'exceptionType') } else { @('schemaVersion', 'state', 'phase') }
        if ($actual.Count -ne $expected.Count -or @($actual | Where-Object { $_ -notin $expected }).Count -ne 0 -or @($expected | Where-Object { $_ -notin $actual }).Count -ne 0) { throw 'invalid' }
        if ($status.state -eq 'PASS' -and [string]$status.phase -cne 'complete') { throw 'invalid' }
        if ($status.state -eq 'FAILED' -and ([string]$status.failureCode -notmatch '^CONTAINER_SMOKE_[A-Z_]+$' -or [string]$status.exceptionType -notmatch '^[A-Za-z0-9_.]+$')) { throw 'invalid' }
        return $status
    } catch {
        if ($_.Exception.Message -match '^CONTAINER_SMOKE_WRAPPER_STARTUP_FAILED$') { throw }
        throw 'CONTAINER_SMOKE_WRAPPER_STATUS_INVALID'
    }
}
function Read-HostedContainerScanStatus {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw 'CONTAINER_SCAN_WRAPPER_STARTUP_FAILED' }
    try {
        $status = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -ErrorAction Stop
        $actual = @($status.PSObject.Properties.Name)
        if ($status.schemaVersion -ne 1 -or $status.state -notin @('STARTED', 'FAILED', 'BLOCKED', 'PASS') -or [string]$status.phase -notmatch '^[a-z-]+$') { throw 'invalid' }
        $expected = switch ($status.state) {
            'FAILED' { @('schemaVersion', 'state', 'phase', 'failureCode', 'exceptionType') }
            'BLOCKED' { @('schemaVersion', 'state', 'phase', 'failureCode') }
            default { @('schemaVersion', 'state', 'phase') }
        }
        if ($actual.Count -ne $expected.Count -or @($actual | Where-Object { $_ -notin $expected }).Count -ne 0 -or @($expected | Where-Object { $_ -notin $actual }).Count -ne 0) { throw 'invalid' }
        if ($status.state -eq 'PASS' -and [string]$status.phase -cne 'complete') { throw 'invalid' }
        if ($status.state -eq 'BLOCKED' -and ([string]$status.phase -cne 'evaluate-policy' -or [string]$status.failureCode -cne 'CONTAINER_SCAN_POLICY_BLOCKED')) { throw 'invalid' }
        if ($status.state -eq 'FAILED' -and ([string]$status.failureCode -notmatch '^CONTAINER_SCAN_[A-Z_]+$' -or [string]$status.exceptionType -notmatch '^[A-Za-z0-9_.]+$')) { throw 'invalid' }
        return $status
    } catch {
        if ($_.Exception.Message -match '^CONTAINER_SCAN_WRAPPER_STARTUP_FAILED$') { throw }
        throw 'CONTAINER_SCAN_WRAPPER_STATUS_INVALID'
    }
}
function Test-HostedPolicyBlockedFailure { param([Parameter(Mandatory)]$Summary); Assert-HostedSummary -Summary $Summary; return ($Summary.executionState -eq 'PASS' -and $Summary.policyState -eq 'BLOCKED') }
function Remove-HostedTemporaryRoot { param([Parameter(Mandatory)][string]$Root); if (Test-Path -LiteralPath $Root) { Remove-Item -LiteralPath $Root -Recurse -Force } }

Export-ModuleMember -Function 'New-HostedRunSummary','Read-HostedRunSummary','Write-HostedRunSummaryAtomic','Set-HostedStageResult','Complete-HostedExecution','Format-HostedRunResult','Get-HostedChildPowerShellExecutable','Read-HostedToolBootstrapStatus','Read-HostedSmokeStatus','Read-HostedContainerScanStatus','Test-HostedPolicyBlockedFailure','Remove-HostedTemporaryRoot'
````


### api/scripts/supply-chain/Install-SupplyChainTools.ps1

Original-byte SHA256: 1d51c3c0eb5c315821ef68f506a5ebf4e9a2be2dec09eb96de1a94d1f5f130e5

````powershell
#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$VerifyOnly,
    [switch]$ForceReinstall,
    [string]$StatusPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-ToolBootstrapStatus {
    param([Parameter(Mandatory)][ValidateSet('PASS','FAILED')][string]$State, [Parameter(Mandatory)][string]$FailureCode)
    if ([string]::IsNullOrWhiteSpace($StatusPath)) { return }
    $directory = Split-Path -Parent $StatusPath
    [void][System.IO.Directory]::CreateDirectory($directory)
    $temporaryPath = $StatusPath + '.' + [guid]::NewGuid().ToString('N') + '.tmp'
    $value = [ordered]@{ schemaVersion = 1; state = $State; failureCode = $FailureCode } | ConvertTo-Json -Compress
    try {
        [System.IO.File]::WriteAllText($temporaryPath, $value, [System.Text.UTF8Encoding]::new($false))
        Move-Item -LiteralPath $temporaryPath -Destination $StatusPath -Force
    } finally {
        if (Test-Path -LiteralPath $temporaryPath) { Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue }
    }
}

try {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
    $manifestPath = Join-Path $repoRoot 'security\tooling\supply-chain-tools.json'
    $modulePath = Join-Path $PSScriptRoot 'SupplyChainTooling.psm1'

    try {
        Import-Module $modulePath -Force
    } catch {
        throw 'TOOL_BOOTSTRAP_MODULE_LOAD_FAILED'
    }
    try {
        $platform = Resolve-SupportedPlatform
    } catch {
        throw 'TOOL_BOOTSTRAP_PLATFORM_RESOLUTION_FAILED'
    }
    $common = @{
        Platform = $platform
        ManifestPath = $manifestPath
        VerifyOnly = $VerifyOnly
        ForceReinstall = $ForceReinstall
    }

    # Cosign is checksum- and version-verified before it becomes the trust tool
    # used for Trivy release provenance verification.
    try {
        $cosignPath = Get-VerifiedTool -ToolName 'cosign' @common
    } catch {
        throw 'TOOL_BOOTSTRAP_COSIGN_FAILED'
    }
    try {
        $null = Get-VerifiedTool -ToolName 'trivy' -VerifiedCosignPath $cosignPath @common
    } catch {
        if ($_.Exception.Message -match 'Trivy trusted-root refresh failed') { throw 'TOOL_BOOTSTRAP_TUF_REFRESH_FAILED' }
        if ($_.Exception.Message -match 'Trivy release provenance verification failed') { throw 'TOOL_BOOTSTRAP_PROVENANCE_FAILED' }
        throw 'TOOL_BOOTSTRAP_TRIVY_FAILED'
    }
    try {
        $null = Get-VerifiedTool -ToolName 'gitleaks' @common
    } catch {
        throw 'TOOL_BOOTSTRAP_GITLEAKS_FAILED'
    }

    Write-ToolBootstrapStatus -State 'PASS' -FailureCode 'NONE'
    Write-Output "Supply-chain tool bootstrap: PASS ($platform)"
    Write-Output 'cosign: checksum and version verified'
    Write-Output 'trivy: checksum, Sigstore provenance, and version verified'
    Write-Output 'gitleaks: checksum and version verified'
} catch {
    $message = [string]$_.Exception.Message
    $failureCode = if ($message -match '\b(TOOL_BOOTSTRAP_[A-Z_]+_FAILED)\b') { $Matches[1] } else { 'TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED' }
    Write-ToolBootstrapStatus -State 'FAILED' -FailureCode $failureCode
    throw $failureCode
}
````


### api/scripts/supply-chain/Invoke-ContainerImageBuild.ps1

Original-byte SHA256: 2686819b5a54d23fbfdbca9bafda025dda76f48c6aa22582679ad4b5111b9348

````powershell
#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$UseExistingVerifiedArtifact
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$contractPath = Join-Path $repoRoot 'security\tooling\container-image-contract.json'
$prebuildScriptPath = Join-Path $PSScriptRoot 'Invoke-ContainerPrebuildArtifact.ps1'
$baseResolutionScriptPath = Join-Path $PSScriptRoot 'Test-ContainerBaseImageResolution.ps1'

function Throw-ContainerBuildFailure {
    param([Parameter(Mandatory)][string]$Code)
    throw $Code
}

function Get-ContainerBuildSha256 {
    param([Parameter(Mandatory)][string]$Path)
    try {
        $stream = [System.IO.File]::OpenRead($Path)
        $algorithm = [System.Security.Cryptography.SHA256]::Create()
        try { return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
        finally { $algorithm.Dispose(); $stream.Dispose() }
    } catch { Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_JAR_HASH_INVALID' }
}

function Read-FirstJsonValue {
    param([Parameter(Mandatory)][string]$Json, [Parameter(Mandatory)][string]$FailureCode)

    try {
        $parsed = ConvertFrom-Json -InputObject $Json -ErrorAction Stop
    } catch {
        Throw-ContainerBuildFailure -Code $FailureCode
    }
    if ($parsed -is [System.Array]) {
        if ($parsed.Count -ne 1) { Throw-ContainerBuildFailure -Code $FailureCode }
        return $parsed[0]
    }
    return $parsed
}

function Get-LocalImageInspection {
    param([Parameter(Mandatory)][string]$Reference)

    $output = @(& docker image inspect $Reference 2>&1)
    if ($LASTEXITCODE -ne 0) {
        Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_LOCAL_IMAGE_INSPECTION_FAILED'
    }
    return Read-FirstJsonValue -Json ($output -join [Environment]::NewLine) -FailureCode 'CONTAINER_BUILD_LOCAL_IMAGE_INSPECTION_MALFORMED'
}

foreach ($required in @($contractPath, $prebuildScriptPath, $baseResolutionScriptPath)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
        Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_PREREQUISITE_MISSING'
    }
}

# This is intentionally the default, non-skippable precondition: Maven builds
# the executable JAR outside Docker and validates its SBOM before Docker sees it.
if ($UseExistingVerifiedArtifact) {
    # Hosted orchestration has already performed Maven verification. Re-run all
    # artifact/SBOM/JAR identity checks, but never trust a receipt or skip them.
    & $prebuildScriptPath -SkipBuild
} else {
    & $prebuildScriptPath
}
if ($LASTEXITCODE -ne 0) {
    Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_PREBUILD_FAILED'
}

# Confirm the reviewed tag still resolves to the committed index/platform digest
# and pull only that immutable linux/amd64 platform manifest.
& $baseResolutionScriptPath
if ($LASTEXITCODE -ne 0) {
    Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_BASE_IMAGE_UNVERIFIED'
}

$contract = Get-Content -LiteralPath $contractPath -Raw | ConvertFrom-Json -ErrorAction Stop
$serviceRoot = Join-Path $repoRoot ([string]$contract.build.contextRelativePath).Replace('/', '\')
$dockerfilePath = Join-Path $repoRoot ([string]$contract.build.dockerfileRelativePath).Replace('/', '\')
$jarPath = Join-Path $repoRoot ([string]$contract.build.canonicalJarRelativePath).Replace('/', '\')
$imageReference = [string]$contract.image.localReference

foreach ($required in @($serviceRoot, $dockerfilePath, $jarPath)) {
    if (-not (Test-Path -LiteralPath $required)) {
        Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_INPUT_MISSING'
    }
}
if (-not (Test-Path -LiteralPath $jarPath -PathType Leaf)) {
    Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_JAR_MISSING'
}

$jarHashBefore = Get-ContainerBuildSha256 -Path $jarPath
if ($jarHashBefore -notmatch '^[a-f0-9]{64}$') {
    Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_JAR_HASH_INVALID'
}

Push-Location $serviceRoot
try {
    & docker buildx build `
        --platform $contract.image.platform `
        --pull `
        --load `
        --tag $imageReference `
        --file $dockerfilePath `
        .
    if ($LASTEXITCODE -ne 0) {
        Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_FAILED'
    }
} finally {
    Pop-Location
}

$jarHashAfter = Get-ContainerBuildSha256 -Path $jarPath
if ($jarHashAfter -cne $jarHashBefore) {
    Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_JAR_MUTATED_DURING_BUILD'
}

$image = Get-LocalImageInspection -Reference $imageReference
if ([string]::IsNullOrWhiteSpace([string]$image.Id) -or $image.Os -cne 'linux' -or $image.Architecture -cne 'amd64') {
    Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_LOCAL_IMAGE_IDENTITY_INVALID'
}
if (@($image.RepoTags) -notcontains $imageReference) {
    Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_LOCAL_TAG_DRIFT'
}

[pscustomobject]@{
    image = $imageReference
    imageId = [string]$image.Id
    platform = "$($image.Os)/$($image.Architecture)"
    jarSha256 = $jarHashBefore
} | ConvertTo-Json -Compress
Write-Output 'Container image build: PASS'
````


### api/scripts/supply-chain/Invoke-ContainerPrebuildArtifact.ps1

Original-byte SHA256: 70bf2692ccb9ba1f9a748944a9a8c9dcaccac49da4247c2412a81ec2e6cf7d59

````powershell
#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$serviceRoot = Join-Path $repoRoot 'services\identity-profile-service'
$targetRoot = Join-Path $serviceRoot 'target'
$contractPath = Join-Path $repoRoot 'security\tooling\container-image-contract.json'
$contractTestPath = Join-Path $PSScriptRoot 'Test-ContainerImageContract.mjs'
$dockerfilePolicyTestPath = Join-Path $PSScriptRoot 'Test-DockerfilePolicy.mjs'
$sbomTrustTestPath = Join-Path $PSScriptRoot 'Test-CycloneDxSchemaTrust.mjs'
$sbomValidatorPath = Join-Path $PSScriptRoot 'Validate-IdentitySbom.mjs'
$sbomTrustManifestPath = Join-Path $repoRoot 'security\tooling\cyclonedx-schemas.json'
$sbomSchemaRoot = Join-Path $repoRoot 'security\schemas\cyclonedx\1.6'

function Throw-ContainerPrebuildFailure {
    param([Parameter(Mandatory)][string]$Code)
    throw $Code
}

function Get-ContainerPrebuildSha256 {
    param([Parameter(Mandatory)][string]$Path)
    try {
        $stream = [System.IO.File]::OpenRead($Path)
        $algorithm = [System.Security.Cryptography.SHA256]::Create()
        try { return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
        finally { $algorithm.Dispose(); $stream.Dispose() }
    } catch { Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_JAR_HASH_INVALID' }
}

function Invoke-NodeGate {
    param([Parameter(Mandatory)][string]$Path, [string[]]$Arguments = @(), [Parameter(Mandatory)][string]$FailureCode)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        Throw-ContainerPrebuildFailure -Code $FailureCode
    }
    & node $Path @Arguments
    if ($LASTEXITCODE -ne 0) {
        Throw-ContainerPrebuildFailure -Code $FailureCode
    }
}

function Invoke-MavenVerify {
    $runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
    $wrapperName = if ($runningOnWindows) { 'mvnw.cmd' } else { 'mvnw' }
    $wrapperPath = Join-Path $serviceRoot $wrapperName
    if (-not (Test-Path -LiteralPath $wrapperPath -PathType Leaf)) {
        Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_MAVEN_WRAPPER_MISSING'
    }

    Push-Location $serviceRoot
    try {
        & $wrapperPath -B clean verify
        if ($LASTEXITCODE -ne 0) {
            Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_MAVEN_VERIFY_FAILED'
        }
    } finally {
        Pop-Location
    }
}

function Get-JarManifestAttributes {
    param([Parameter(Mandatory)][string]$JarPath)

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    try {
        $archive = [System.IO.Compression.ZipFile]::OpenRead($JarPath)
    } catch {
        Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_JAR_INVALID'
    }
    try {
        $entry = $archive.GetEntry('META-INF/MANIFEST.MF')
        if ($null -eq $entry) {
            Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_MANIFEST_MISSING'
        }
        $reader = [System.IO.StreamReader]::new($entry.Open())
        try {
            $lines = @($reader.ReadToEnd() -replace "`r`n", "`n" -split "`n")
        } finally {
            $reader.Dispose()
        }

        $attributes = @{}
        $currentName = $null
        foreach ($line in $lines) {
            if ($line.Length -eq 0) { continue }
            if ($line.StartsWith(' ')) {
                if ($null -eq $currentName) { Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_MANIFEST_MALFORMED' }
                $attributes[$currentName] = $attributes[$currentName] + $line.Substring(1)
                continue
            }
            $separator = $line.IndexOf(': ')
            if ($separator -le 0) { Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_MANIFEST_MALFORMED' }
            $currentName = $line.Substring(0, $separator)
            $attributes[$currentName] = $line.Substring($separator + 2)
        }

        foreach ($entryPath in @('BOOT-INF/classes/', 'BOOT-INF/lib/', 'BOOT-INF/layers.idx', 'META-INF/sbom/application.cdx.json')) {
            if ($null -eq $archive.GetEntry($entryPath)) {
                Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_BOOT_LAYOUT_INVALID'
            }
        }
        return $attributes
    } finally {
        $archive.Dispose()
    }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_NODE_MISSING'
}
if (-not (Test-Path -LiteralPath $contractPath -PathType Leaf)) {
    Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_CONTRACT_MISSING'
}

Invoke-NodeGate -Path $contractTestPath -FailureCode 'CONTAINER_PREBUILD_CONTRACT_INVALID'
Invoke-NodeGate -Path $dockerfilePolicyTestPath -FailureCode 'CONTAINER_PREBUILD_DOCKERFILE_POLICY_INVALID'

if (-not $SkipBuild) {
    Invoke-MavenVerify
}

$contract = Get-Content -LiteralPath $contractPath -Raw | ConvertFrom-Json -ErrorAction Stop
$jarRelativePath = [string]$contract.build.canonicalJarRelativePath
$jarPath = Join-Path $repoRoot ($jarRelativePath -replace '/', [System.IO.Path]::DirectorySeparatorChar)
$bomPath = Join-Path $targetRoot 'bom.json'
if (-not (Test-Path -LiteralPath $jarPath -PathType Leaf) -or -not (Test-Path -LiteralPath $bomPath -PathType Leaf)) {
    Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_CANONICAL_ARTIFACT_MISSING'
}

$jarCandidates = @(Get-ChildItem -LiteralPath $targetRoot -Filter '*.jar' -File -ErrorAction Stop)
if ($jarCandidates.Count -ne 1 -or $jarCandidates[0].FullName -cne $jarPath -or $jarCandidates[0].Length -le 0) {
    Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_CANONICAL_JAR_AMBIGUOUS'
}

Invoke-NodeGate -Path $sbomTrustTestPath -FailureCode 'CONTAINER_PREBUILD_SBOM_TRUST_INVALID'
Invoke-NodeGate -Path $sbomValidatorPath -Arguments @('--bom', $bomPath, '--schema-root', $sbomSchemaRoot, '--trust-manifest', $sbomTrustManifestPath) -FailureCode 'CONTAINER_PREBUILD_SBOM_INVALID'

$manifest = Get-JarManifestAttributes -JarPath $jarPath
if ($manifest['Main-Class'] -cne 'org.springframework.boot.loader.launch.JarLauncher') {
    Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_MAIN_CLASS_INVALID'
}
if ($manifest['Start-Class'] -cne 'com.auctionpromax.identityprofileservice.IdentityProfileServiceApplication') {
    Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_START_CLASS_INVALID'
}
if ($manifest['Spring-Boot-Version'] -ne '3.5.16' -or $manifest['Spring-Boot-Layers-Index'] -ne 'BOOT-INF/layers.idx') {
    Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_BOOT_METADATA_INVALID'
}

$hash = Get-ContainerPrebuildSha256 -Path $jarPath
if ($hash -notmatch '^[a-f0-9]{64}$') {
    Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_JAR_HASH_INVALID'
}

[pscustomobject]@{
    artifact = $jarRelativePath
    sha256 = $hash
    byteLength = $jarCandidates[0].Length
    mainClass = $manifest['Main-Class']
    startClass = $manifest['Start-Class']
    sbom = 'validated'
} | ConvertTo-Json -Compress
Write-Output 'Container prebuild artifact: PASS'
````


### api/scripts/supply-chain/Invoke-ContainerTechnicalSmoke.ps1

Original-byte SHA256: b608bb0c1b49352c20797d1ad364ab8726530fbe7804df531b1d76892830eddf

````powershell
#Requires -Version 5.1
[CmdletBinding()]
param([string]$StatusPath, [switch]$ResolverContractTest, [switch]$StatusContractTest, [switch]$StartupEnvelopeContractTest)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-SmokeStatus {
    param(
        [Parameter(Mandatory)][ValidateSet('STARTED','FAILED','PASS')][string]$State,
        [string]$Phase,
        [string]$FailureCode,
        [string]$ExceptionType
    )
    if ([string]::IsNullOrWhiteSpace($StatusPath)) { return }
    $payload = switch ($State) {
        'STARTED' { [ordered]@{ schemaVersion=1; state='STARTED'; phase=$Phase } }
        'FAILED' { [ordered]@{ schemaVersion=1; state='FAILED'; phase=$Phase; failureCode=$FailureCode; exceptionType=$ExceptionType } }
        'PASS' { [ordered]@{ schemaVersion=1; state='PASS'; phase='complete' } }
    }
    $temporaryPath = "$StatusPath.tmp"
    try {
        [System.IO.File]::WriteAllText($temporaryPath, ($payload | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))
        Move-Item -LiteralPath $temporaryPath -Destination $StatusPath -Force
    } finally {
        if (Test-Path -LiteralPath $temporaryPath) { Remove-Item -LiteralPath $temporaryPath -Force }
    }
}

function Resolve-ContainerSmokeDockerExecutable {
    param(
        [Parameter(Mandatory)][bool]$RunningOnWindows,
        [scriptblock]$CommandResolver
    )
    $commandName = if ($RunningOnWindows) { 'docker.exe' } else { 'docker' }
    $command = if ($null -ne $CommandResolver) {
        & $CommandResolver $commandName
    } else {
        Get-Command -Name $commandName -CommandType Application -ErrorAction SilentlyContinue |
            Select-Object -First 1
    }
    if ($null -eq $command) { throw 'CONTAINER_SMOKE_DOCKER_MISSING' }
    $executable = [string]$command.Definition
    if ([string]::IsNullOrWhiteSpace($executable)) { throw 'CONTAINER_SMOKE_DOCKER_MISSING' }
    return $executable
}

function Invoke-ContainerSmokeDockerResolverContractTest {
    $windowsRequests = [System.Collections.Generic.List[string]]::new()
    $windowsResolver = {
        param([string]$Name)
        $null = $windowsRequests.Add($Name)
        [pscustomobject]@{ Definition = 'C:\tools\docker.exe' }
    }.GetNewClosure()
    if ((Resolve-ContainerSmokeDockerExecutable -RunningOnWindows $true -CommandResolver $windowsResolver) -ne 'C:\tools\docker.exe' -or $windowsRequests.Count -ne 1 -or $windowsRequests[0] -ne 'docker.exe') { throw 'CONTAINER_SMOKE_RESOLVER_WINDOWS_INVALID' }
    Write-Output '[PASS] Windows resolver selects docker.exe'

    $linuxRequests = [System.Collections.Generic.List[string]]::new()
    $linuxResolver = {
        param([string]$Name)
        $null = $linuxRequests.Add($Name)
        [pscustomobject]@{ Definition = '/usr/bin/docker' }
    }.GetNewClosure()
    if ((Resolve-ContainerSmokeDockerExecutable -RunningOnWindows $false -CommandResolver $linuxResolver) -ne '/usr/bin/docker' -or $linuxRequests.Count -ne 1 -or $linuxRequests[0] -ne 'docker') { throw 'CONTAINER_SMOKE_RESOLVER_LINUX_INVALID' }
    Write-Output '[PASS] Linux resolver selects docker'

    $definitionResolver = {
        param([string]$Name)
        [pscustomobject]@{ Definition = '/usr/bin/docker' }
    }
    if ((Resolve-ContainerSmokeDockerExecutable -RunningOnWindows $false -CommandResolver $definitionResolver) -ne '/usr/bin/docker') { throw 'CONTAINER_SMOKE_RESOLVER_DEFINITION_INVALID' }
    Write-Output '[PASS] Resolver accepts application Definition'

    $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-smoke-docker-resolver-' + [guid]::NewGuid().ToString('N'))
    $previousPath = $env:PATH
    try {
        [void][System.IO.Directory]::CreateDirectory($temporaryRoot)
        $runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
        if ($runningOnWindows) {
            $fixtureDocker = Join-Path $temporaryRoot 'docker.exe'
            $commandShell = Get-Command -Name 'cmd.exe' -CommandType Application -ErrorAction Stop | Select-Object -First 1
            Copy-Item -LiteralPath ([string]$commandShell.Definition) -Destination $fixtureDocker -ErrorAction Stop
        } else {
            $fixtureDocker = Join-Path $temporaryRoot 'docker'
            [System.IO.File]::WriteAllText($fixtureDocker, "#!/bin/sh`nexit 0`n", [System.Text.UTF8Encoding]::new($false))
            & chmod '+x' $fixtureDocker
            if ($LASTEXITCODE -ne 0) { throw 'CONTAINER_SMOKE_RESOLVER_FIXTURE_EXECUTABLE_INVALID' }
        }
        $env:PATH = $temporaryRoot + [System.IO.Path]::PathSeparator + $previousPath
        $resolvedFixtureDocker = Resolve-ContainerSmokeDockerExecutable -RunningOnWindows $runningOnWindows
        if ([string]::IsNullOrWhiteSpace($resolvedFixtureDocker) -or -not ([System.IO.Path]::GetFullPath($resolvedFixtureDocker) -ieq [System.IO.Path]::GetFullPath($fixtureDocker))) { throw 'CONTAINER_SMOKE_RESOLVER_APPLICATION_INFO_INVALID' }
    } finally {
        $env:PATH = $previousPath
        if (Test-Path -LiteralPath $temporaryRoot) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force }
    }
    Write-Output '[PASS] Resolver accepts real application Definition'

    try {
        $null = Resolve-ContainerSmokeDockerExecutable -RunningOnWindows $false -CommandResolver { param([string]$Name) $null }
        throw 'CONTAINER_SMOKE_RESOLVER_MISSING_ACCEPTED'
    } catch {
        if ($_.Exception.Message -ne 'CONTAINER_SMOKE_DOCKER_MISSING') { throw }
    }
    Write-Output '[PASS] Missing selected Docker executable rejected'
    Write-Output 'Container smoke Docker resolver contract tests: PASS'
}

function Invoke-ContainerSmokeStatusContractTest {
    Import-Module (Join-Path $PSScriptRoot 'HostedSupplyChain.psm1') -Force
    $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-smoke-status-contract-' + [guid]::NewGuid().ToString('N'))
    $originalStatusPath = $script:StatusPath
    try {
        [void][System.IO.Directory]::CreateDirectory($temporaryRoot)
        $script:StatusPath = Join-Path $temporaryRoot 'status.json'
        foreach ($case in @(
            @{ state='STARTED'; phase='startup'; code=$null; type=$null; properties=@('schemaVersion','state','phase') },
            @{ state='FAILED'; phase='inspect-container'; code='CONTAINER_SMOKE_INSPECTION_FAILED'; type='RuntimeException'; properties=@('schemaVersion','state','phase','failureCode','exceptionType') },
            @{ state='PASS'; phase='ignored'; code=$null; type=$null; properties=@('schemaVersion','state','phase') }
        )) {
            Write-SmokeStatus -State $case.state -Phase $case.phase -FailureCode $case.code -ExceptionType $case.type
            $status = Read-HostedSmokeStatus -Path $script:StatusPath
            $actualProperties = (@($status.PSObject.Properties.Name | Sort-Object) -join ',')
            $expectedProperties = (@($case.properties | Sort-Object) -join ',')
            if ($status.state -ne $case.state -or $actualProperties -ne $expectedProperties -or ($case.state -eq 'PASS' -and $status.phase -ne 'complete')) { throw 'CONTAINER_SMOKE_STATUS_ROUND_TRIP_INVALID' }
        }
        $negativeCases = @(
            '{"schemaVersion":1,"state":"PASS","phase":"complete","failureCode":"CONTAINER_SMOKE_START_FAILED"}',
            '{"schemaVersion":1,"state":"PASS","phase":"not-complete"}',
            '{"schemaVersion":1,"state":"FAILED","phase":"start-container","exceptionType":"RuntimeException"}',
            '{"schemaVersion":1,"state":"STARTED","phase":"startup","failureCode":"CONTAINER_SMOKE_START_FAILED"}',
            '{"schemaVersion":1,"state":"PASS","phase":"complete","unexpected":"value"}',
            '{"schemaVersion":2,"state":"PASS","phase":"complete"}',
            '{"schemaVersion":1,"state":"UNKNOWN","phase":"complete"}'
        )
        foreach ($json in $negativeCases) {
            [System.IO.File]::WriteAllText($script:StatusPath, $json, [System.Text.UTF8Encoding]::new($false))
            try { $null = Read-HostedSmokeStatus -Path $script:StatusPath; throw 'CONTAINER_SMOKE_STATUS_INVALID_ACCEPTED' }
            catch { if ($_.Exception.Message -ne 'CONTAINER_SMOKE_WRAPPER_STATUS_INVALID') { throw } }
        }
    } finally {
        $script:StatusPath = $originalStatusPath
        if (Test-Path -LiteralPath $temporaryRoot) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force }
    }
    Write-Output '[PASS] STARTED status round-trips'
    Write-Output '[PASS] FAILED status round-trips'
    Write-Output '[PASS] PASS status round-trips'
    Write-Output '[PASS] Invalid state-dependent status shapes rejected'
    Write-Output 'Container smoke status state contract tests: PASS'
}

if ($ResolverContractTest) { Invoke-ContainerSmokeDockerResolverContractTest; exit 0 }
if ($StatusContractTest) { Invoke-ContainerSmokeStatusContractTest; exit 0 }

$smokePhase = 'startup'
$started = $false
$failureCode = $null
$cleanupFailed = $false
$name = $null
Write-SmokeStatus -State 'STARTED' -Phase 'startup'
function Fail([string]$Code) {
    Write-SmokeStatus -State 'FAILED' -Phase $smokePhase -FailureCode $Code -ExceptionType 'ManagedFailure'
    throw $Code
}
function Invoke-DockerCommand([string[]]$Arguments, [string]$Code) {
    $output = @(& $script:dockerExe @Arguments 2>&1); $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) { Fail $Code }; return ($output -join [Environment]::NewLine)
}
try {
    $smokePhase = 'resolve-docker'
    $runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
    $testCommandResolver = if ($StartupEnvelopeContractTest) { { param([string]$Name) $null } } else { $null }
    $script:dockerExe = Resolve-ContainerSmokeDockerExecutable -RunningOnWindows $runningOnWindows -CommandResolver $testCommandResolver
    $smokePhase = 'load-contract'
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
    $contractPath = Join-Path $repoRoot 'security\tooling\container-image-contract.json'
    $contractTestPath = Join-Path $PSScriptRoot 'Test-ContainerImageContract.mjs'
    if (-not (Test-Path $contractPath -PathType Leaf) -or -not (Test-Path $contractTestPath -PathType Leaf)) { Fail 'CONTAINER_SMOKE_CONTRACT_MISSING' }
    $smokePhase = 'validate-contract'
    & node $contractTestPath
    if ($LASTEXITCODE -ne 0) { Fail 'CONTAINER_SMOKE_CONTRACT_INVALID' }
    try { $contract = Get-Content $contractPath -Raw | ConvertFrom-Json -ErrorAction Stop } catch { Fail 'CONTAINER_SMOKE_CONTRACT_INVALID' }
    $image = [string]$contract.image.localReference; $smoke = $contract.technicalSmoke; $runtimeUser = [string]$contract.runtime.user
    $name = 'apx-s001-t07-smoke-' + [Guid]::NewGuid().ToString('N').Substring(0,12)
    $smokePhase = 'reserve-port'
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,0)
    try { $listener.Start(); $hostPort = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port } catch { Fail 'CONTAINER_SMOKE_PORT_RESERVATION_FAILED' } finally { if ($listener) { $listener.Stop() } }
    $smokePhase = 'validate-image'
    Invoke-DockerCommand @('image','inspect',$image) 'CONTAINER_SMOKE_IMAGE_MISSING' | Out-Null
    $smokePhase = 'start-container'
    Invoke-DockerCommand @('run','--detach','--rm','--name',$name,'--platform',$contract.image.platform,'--user',$runtimeUser,'--read-only','--tmpfs',$smoke.tmpfsPath,'--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit',[string]$smoke.pidsLimit,'--publish',"127.0.0.1:$hostPort`:8080",'--env',"SPRING_PROFILES_ACTIVE=$($smoke.profile)",$image) 'CONTAINER_SMOKE_START_FAILED' | Out-Null
    $started = $true
    $smokePhase = 'inspect-container'
    try { $state = @((Invoke-DockerCommand @('inspect',$name) 'CONTAINER_SMOKE_INSPECTION_FAILED') | ConvertFrom-Json -ErrorAction Stop)[0] } catch { Fail 'CONTAINER_SMOKE_INSPECTION_MALFORMED' }
    $smokePhase = 'validate-hardening'
    $tmpfs = @($state.HostConfig.Tmpfs.PSObject.Properties.Name)
    $nnp = @($state.HostConfig.SecurityOpt | Where-Object { [string]$_ -match '^no-new-privileges(?::true)?$' }).Count -gt 0
    if (-not [bool]$state.HostConfig.ReadonlyRootfs -or [int64]$state.HostConfig.PidsLimit -ne [int64]$smoke.pidsLimit -or [string]$state.Config.User -cne $runtimeUser -or @($state.HostConfig.CapDrop) -notcontains 'ALL' -or -not $nnp -or $tmpfs -notcontains [string]$smoke.tmpfsPath) { Fail 'CONTAINER_SMOKE_HARDENING_DRIFT' }
    $smokePhase = 'validate-binding'
    $binding = @($state.NetworkSettings.Ports.'8080/tcp' | Where-Object { $_.HostIp -eq '127.0.0.1' })
    if ($binding.Count -ne 1 -or [int]$binding[0].HostPort -ne [int]$hostPort) { Fail 'CONTAINER_SMOKE_LOOPBACK_BINDING_INVALID' }
    $uri = "http://127.0.0.1:$hostPort$($smoke.readinessPath)"; $deadline = [DateTime]::UtcNow.AddSeconds([int]$smoke.startupTimeoutSeconds); $ready = $false
    do {
        $smokePhase = 'poll-readiness'
        try {
            $r = Invoke-WebRequest -UseBasicParsing -Uri $uri -TimeoutSec 5
            $content = if ($r.Content -is [byte[]]) { [System.Text.Encoding]::UTF8.GetString($r.Content) } else { [string]$r.Content }
            $smokePhase = 'parse-readiness'
            if ($r.StatusCode -eq 200 -and $content -match '"status"\s*:\s*"UP"') { $ready = $true; break }
        } catch {}
        Start-Sleep 2
    } while ([DateTime]::UtcNow -lt $deadline)
    if (-not $ready) { Fail 'CONTAINER_SMOKE_READINESS_TIMEOUT' }
    Write-Output ('Container technical smoke: PASS (container={0}, readiness={1})' -f $name,$uri)
    Write-SmokeStatus -State 'PASS' -Phase 'complete'
} catch {
    $message = [string]$_.Exception.Message
    $failureCode = if ($message -match '^CONTAINER_SMOKE_[A-Z0-9_]+$') {
        $message
    } else {
        'CONTAINER_SMOKE_UNCLASSIFIED_FAILED'
    }
    Write-SmokeStatus -State 'FAILED' -Phase $smokePhase -FailureCode $failureCode -ExceptionType $_.Exception.GetType().Name
}
finally {
    $smokePhase = 'cleanup'
    if ($started) { & $script:dockerExe rm --force $name 2>$null | Out-Null; if ($LASTEXITCODE -ne 0) { $cleanupFailed=$true } }
}
if ($cleanupFailed -and -not $failureCode) { Fail 'CONTAINER_SMOKE_CLEANUP_FAILED' }
if ($failureCode) { throw $failureCode }
````


### api/scripts/supply-chain/Invoke-ContainerVulnerabilityScanning.ps1

Original-byte SHA256: a18637ee28fc215a1efdc31cbd72ce5dcb4aa90c2fc82344eaa8b10c4b651730

````powershell
#Requires -Version 5.1
[CmdletBinding()]
param([string]$StatusPath, [switch]$SkipExecution, [switch]$StatusContractTest)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-ContainerScanStatus {
    param(
        [Parameter(Mandatory)][ValidateSet('STARTED','FAILED','BLOCKED','PASS')][string]$State,
        [string]$Phase,
        [string]$FailureCode,
        [string]$ExceptionType
    )
    if ([string]::IsNullOrWhiteSpace($StatusPath)) { return }
    $payload = switch ($State) {
        'STARTED' { [ordered]@{ schemaVersion=1; state='STARTED'; phase=$Phase } }
        'FAILED' { [ordered]@{ schemaVersion=1; state='FAILED'; phase=$Phase; failureCode=$FailureCode; exceptionType=$ExceptionType } }
        'BLOCKED' { [ordered]@{ schemaVersion=1; state='BLOCKED'; phase='evaluate-policy'; failureCode='CONTAINER_SCAN_POLICY_BLOCKED' } }
        'PASS' { [ordered]@{ schemaVersion=1; state='PASS'; phase='complete' } }
    }
    $temporaryPath = "$StatusPath.tmp"
    try {
        [System.IO.File]::WriteAllText($temporaryPath, ($payload | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))
        Move-Item -LiteralPath $temporaryPath -Destination $StatusPath -Force
    } finally {
        if (Test-Path -LiteralPath $temporaryPath) { Remove-Item -LiteralPath $temporaryPath -Force }
    }
}

function Throw-ContainerScanFailure { param([Parameter(Mandatory)][string]$Code) throw $Code }

function Get-ContainerScanPaths {
    $root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
    [pscustomobject]@{ Root=$root; Contract=(Join-Path $root 'security\tooling\container-image-contract.json'); VulnerabilityContract=(Join-Path $root 'security\tooling\vulnerability-scan-contract.json'); Dispositions=(Join-Path $root 'security\vulnerability-dispositions.json'); Evidence=(Join-Path $root 'services\identity-profile-service\target\s001-t07-evidence\container-vulnerability-inventory.json') }
}

function Resolve-ContainerScanDockerExecutable {
    param(
        [bool]$RunningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows),
        [scriptblock]$CommandResolver
    )
    $commandName = if ($RunningOnWindows) { 'docker.exe' } else { 'docker' }
    $command = if ($null -ne $CommandResolver) {
        & $CommandResolver $commandName
    } else {
        Get-Command -Name $commandName -CommandType Application -ErrorAction SilentlyContinue |
            Select-Object -First 1
    }
    if ($null -eq $command) { Throw-ContainerScanFailure 'CONTAINER_SCAN_DOCKER_MISSING' }
    $resolvedPath = [string]$command.Definition
    if ([string]::IsNullOrWhiteSpace($resolvedPath)) { Throw-ContainerScanFailure 'CONTAINER_SCAN_DOCKER_MISSING' }
    return $resolvedPath
}

function Get-ContainerImageInspection {
    param([Parameter(Mandatory)][string]$ImageReference)
    $dockerExecutable = Resolve-ContainerScanDockerExecutable
    $raw = @(& $dockerExecutable image inspect $ImageReference '--format' '{{json .}}' 2>&1)
    if ($LASTEXITCODE -ne 0 -or $raw.Count -ne 1) { Throw-ContainerScanFailure 'CONTAINER_SCAN_IMAGE_MISSING' }
    try { $image = ([string]$raw[0] | ConvertFrom-Json -ErrorAction Stop) } catch { Throw-ContainerScanFailure 'CONTAINER_SCAN_IMAGE_INSPECT_MALFORMED' }
    if ([string]::IsNullOrWhiteSpace([string]$image.Id)) { Throw-ContainerScanFailure 'CONTAINER_SCAN_IMAGE_INSPECT_MALFORMED' }
    $image
}

function Assert-ContainerImageIdentity {
    param([Parameter(Mandatory)]$Image, [Parameter(Mandatory)][string]$ExpectedPlatform)
    if ($ExpectedPlatform -ne 'linux/amd64') { Throw-ContainerScanFailure 'CONTAINER_SCAN_PLATFORM_CONTRACT_INVALID' }
    if ($Image.Os -ne 'linux' -or $Image.Architecture -ne 'amd64') { Throw-ContainerScanFailure 'CONTAINER_SCAN_IMAGE_PLATFORM_MISMATCH' }
}

function Assert-ContainerTrivyVector {
    param([Parameter(Mandatory)][string[]]$Arguments)
    $expected = @('--scanners','vuln','--image-src','docker','--platform','linux/amd64','--format','json','--quiet','--exit-code','0','--skip-db-update','--skip-vex-repo-update','--skip-version-check','--timeout','300s')
    if (($Arguments -join [char]31) -ne ($expected -join [char]31) -or $Arguments -contains '--ignore-unfixed' -or $Arguments -contains '--severity') { Throw-ContainerScanFailure 'CONTAINER_SCAN_COMMAND_VECTOR_INVALID' }
}

function Assert-ContainerReportDetections {
    param([Parameter(Mandatory)][string]$ReportPath, [Parameter(Mandatory)][string]$ImageReference)
    $definition = [pscustomobject]@{ input=$ImageReference; targetType='container-image'; expectedEcosystem='maven' }
    try { $validated = Read-TrivyRawReport -ReportPath $ReportPath -ScanDefinition $definition }
    catch {
        if ($_.Exception.Message -match 'TRIVY_ECOSYSTEM_NOT_DETECTED') { Throw-ContainerScanFailure 'CONTAINER_SCAN_JAVA_DETECTION_MISSING' }
        Throw-ContainerScanFailure 'CONTAINER_SCAN_REPORT_INVALID'
    }
    $results = @($validated.Report.Results)
    if (@($results | Where-Object { $_.Class -eq 'os-pkgs' }).Count -lt 1) { Throw-ContainerScanFailure 'CONTAINER_SCAN_OS_DETECTION_MISSING' }
    $java = $false
    foreach ($result in @($results | Where-Object { $_.Class -eq 'lang-pkgs' })) {
        foreach ($package in @($result.Packages) + @($result.Vulnerabilities)) {
            if ($null -eq $package) { continue }
            $identifierProperty = $package.PSObject.Properties['PkgIdentifier']
            if ($null -eq $identifierProperty) { $identifierProperty = $package.PSObject.Properties['Identifier'] }
            $identifier = if ($null -eq $identifierProperty) { $null } else { $identifierProperty.Value }
            $purlProperty = if ($null -eq $identifier) { $null } else { $identifier.PSObject.Properties['PURL'] }
            if ($null -ne $purlProperty -and [string]$purlProperty.Value -match '^pkg:maven/') { $java = $true; break }
        }
        if ($java) { break }
    }
    if (-not $java) { Throw-ContainerScanFailure 'CONTAINER_SCAN_JAVA_DETECTION_MISSING' }
    $definition
}

function Assert-SanitizedContainerInventory {
    param([Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Inventory, [Parameter(Mandatory)][string[]]$ExpectedFields)
    $expected = @($ExpectedFields | Sort-Object)
    foreach ($finding in $Inventory) {
        $actual = @($finding.PSObject.Properties.Name | Sort-Object)
        if (($actual -join [char]31) -ne ($expected -join [char]31)) { Throw-ContainerScanFailure 'CONTAINER_SCAN_SANITIZATION_INVALID' }
        foreach ($value in $finding.PSObject.Properties.Value) { if ($value -is [string] -and ($value -match '(^[A-Za-z]:[\\/]|^/|\\Users\\|/home/)')) { Throw-ContainerScanFailure 'CONTAINER_SCAN_SANITIZATION_INVALID' } }
    }
}

function Write-ContainerInventoryAtomically {
    param([Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Inventory, [Parameter(Mandatory)][string]$Path)
    $Path = [IO.Path]::GetFullPath($Path)
    $directory = Split-Path -Parent $Path; New-Item -ItemType Directory -Path $directory -Force | Out-Null
    $temporary = Join-Path $directory ('.container-vulnerability-' + [guid]::NewGuid().ToString('N') + '.tmp')
    $backup = Join-Path $directory ('.container-vulnerability-' + [guid]::NewGuid().ToString('N') + '.bak')
    try {
        [IO.File]::WriteAllText($temporary, ($Inventory | ConvertTo-Json -Depth 10), [Text.UTF8Encoding]::new($false))
        if (Test-Path -LiteralPath $Path) { [IO.File]::Replace([IO.Path]::GetFullPath($temporary), $Path, $backup) } else { [IO.File]::Move([IO.Path]::GetFullPath($temporary), $Path) }
    } finally {
        if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
        if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Force }
    }
}

function Test-IsPolicyBlockedFailure {
    param([Parameter(Mandatory)][string]$Message)
    $Message -in @('HIGH_OR_CRITICAL_DISPOSITION_REQUIRED','VULNERABILITY_DISPOSITION_AMBIGUOUS','VULNERABILITY_DISPOSITION_INVALID','VULNERABILITY_DISPOSITION_EXACT_MATCH_FAILED','VULNERABILITY_DISPOSITION_APPROVAL_IN_FUTURE','VULNERABILITY_DISPOSITION_EXPIRED','VULNERABILITY_DISPOSITION_VALIDITY_EXCEEDED','VULNERABILITY_DISPOSITION_CRITICAL_ACK_REQUIRED')
}

function Invoke-ContainerVulnerabilityScan {
    $script:containerScanPhase = 'load-contract'
    $paths = Get-ContainerScanPaths
    $contract = Get-Content -LiteralPath $paths.Contract -Raw | ConvertFrom-Json
    $vulnerabilityContract = Get-Content -LiteralPath $paths.VulnerabilityContract -Raw | ConvertFrom-Json
    $dispositions = Get-Content -LiteralPath $paths.Dispositions -Raw | ConvertFrom-Json
    Import-Module (Join-Path $PSScriptRoot 'VulnerabilityScanning.psm1') -Force
    & node (Join-Path $PSScriptRoot 'Test-ContainerImageContract.mjs'); if ($LASTEXITCODE -ne 0) { Throw-ContainerScanFailure 'CONTAINER_SCAN_CONTRACT_INVALID' }
    $imageReference = [string]$contract.image.localReference
    $script:containerScanPhase = 'validate-image'
    $image = Get-ContainerImageInspection -ImageReference $imageReference
    Assert-ContainerImageIdentity -Image $image -ExpectedPlatform ([string]$contract.image.platform)
    $script:containerScanPhase = 'resolve-trivy'
    $trivy = Get-VerifiedTrivyExecutable
    $cache = Join-Path $paths.Root ([string]$vulnerabilityContract.database.cacheRelativePath).Replace('/','\')
    $script:containerScanPhase = 'validate-db'
    try { Confirm-TrivyDatabaseFreshness -TrivyExecutable $trivy -CacheDirectory $cache -NowUtc ([datetime]::UtcNow) -MaxAgeHours $vulnerabilityContract.database.maxAgeHours -FutureClockSkewSeconds $vulnerabilityContract.database.futureClockSkewSeconds | Out-Null } catch { Throw-ContainerScanFailure 'CONTAINER_SCAN_DATABASE_INVALID' }
    $script:containerScanPhase = 'prepare-scan'
    $arguments = @('--scanners','vuln','--image-src','docker','--platform','linux/amd64','--format','json','--quiet','--exit-code','0','--skip-db-update','--skip-vex-repo-update','--skip-version-check','--timeout','300s')
    Assert-ContainerTrivyVector -Arguments $arguments
    $temp = Join-Path ([IO.Path]::GetTempPath()) ('apx-container-' + [guid]::NewGuid().ToString('N')); $raw = Join-Path $temp 'raw.json'
    try {
        New-Item -ItemType Directory -Path $temp -Force | Out-Null
        $script:containerScanPhase = 'run-trivy'
        & $trivy image --cache-dir $cache @arguments --output $raw $imageReference
        if ($LASTEXITCODE -ne 0) { Throw-ContainerScanFailure 'CONTAINER_SCAN_EXECUTION_FAILED' }
        $script:containerScanPhase = 'validate-report'
        $definition = Assert-ContainerReportDetections -ReportPath $raw -ImageReference $imageReference
        $script:containerScanPhase = 'sanitize-inventory'
        try { $inventory = @(ConvertTo-SanitizedVulnerabilityInventory -ReportPath $raw -ScanDefinition $definition) } catch { Throw-ContainerScanFailure 'CONTAINER_SCAN_SANITIZATION_INVALID' }
        Assert-SanitizedContainerInventory -Inventory $inventory -ExpectedFields @($contract.evidence.sanitizedInventoryFields)
        $script:containerScanPhase = 'evaluate-policy'
        try { $decisions = @(Test-VulnerabilityPolicy -Inventory $inventory -Dispositions @($dispositions.dispositions) -NowUtc ([datetime]::UtcNow)) }
        catch {
            if (-not (Test-IsPolicyBlockedFailure -Message $_.Exception.Message)) { Throw-ContainerScanFailure 'CONTAINER_SCAN_POLICY_EVALUATOR_FAILED' }
            $script:containerScanPhase = 'write-evidence'
            Write-ContainerInventoryAtomically -Inventory $inventory -Path $paths.Evidence
            Write-Output 'Container vulnerability policy: BLOCKED (sanitizedInventoryWritten=true)'
            Throw-ContainerScanFailure 'CONTAINER_SCAN_POLICY_BLOCKED'
        }
        $script:containerScanPhase = 'write-evidence'
        Write-ContainerInventoryAtomically -Inventory $decisions -Path $paths.Evidence
        Write-Output ('Container vulnerability policy: PASS (findings={0})' -f $decisions.Count)
    } finally {
        if (Test-Path -LiteralPath $temp) {
            try { Remove-Item -LiteralPath $temp -Recurse -Force }
            catch { $script:containerScanPhase = 'cleanup'; throw }
        }
    }
}

function Invoke-ContainerScanStatusContractTest {
    Import-Module (Join-Path $PSScriptRoot 'HostedSupplyChain.psm1') -Force
    $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-container-scan-status-' + [guid]::NewGuid().ToString('N'))
    $originalStatusPath = $script:StatusPath
    try {
        [void][System.IO.Directory]::CreateDirectory($temporaryRoot)
        $script:StatusPath = Join-Path $temporaryRoot 'status.json'
        foreach ($case in @(
            @{ state='STARTED'; phase='startup'; code=$null; type=$null },
            @{ state='FAILED'; phase='validate-report'; code='CONTAINER_SCAN_REPORT_INVALID'; type='RuntimeException' },
            @{ state='BLOCKED'; phase='ignored'; code=$null; type=$null },
            @{ state='PASS'; phase='ignored'; code=$null; type=$null }
        )) {
            Write-ContainerScanStatus -State $case.state -Phase $case.phase -FailureCode $case.code -ExceptionType $case.type
            $status = Read-HostedContainerScanStatus -Path $script:StatusPath
            if ($status.state -ne $case.state) { throw 'CONTAINER_SCAN_STATUS_ROUND_TRIP_INVALID' }
        }
    } finally {
        $script:StatusPath = $originalStatusPath
        if (Test-Path -LiteralPath $temporaryRoot) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force }
    }
    Write-Output '[PASS] STARTED status round-trips'
    Write-Output '[PASS] FAILED status round-trips'
    Write-Output '[PASS] BLOCKED status round-trips'
    Write-Output '[PASS] PASS status round-trips'
    Write-Output 'Container scan status state contract tests: PASS'
}

if ($StatusContractTest) { Invoke-ContainerScanStatusContractTest; exit 0 }
if (-not $SkipExecution) {
    $script:containerScanPhase = 'startup'
    Write-ContainerScanStatus -State 'STARTED' -Phase $script:containerScanPhase
    try {
        Invoke-ContainerVulnerabilityScan
        Write-ContainerScanStatus -State 'PASS' -Phase 'complete'
    } catch {
        $message = [string]$_.Exception.Message
        if ($message -match '\b(CONTAINER_SCAN_POLICY_BLOCKED)\b') {
            Write-ContainerScanStatus -State 'BLOCKED' -Phase 'evaluate-policy'
            throw 'CONTAINER_SCAN_POLICY_BLOCKED'
        }
        $failureCode = if ($message -match '\b(CONTAINER_SCAN_[A-Z_]+)\b') { $Matches[1] } else { 'CONTAINER_SCAN_UNCLASSIFIED_FAILED' }
        Write-ContainerScanStatus -State 'FAILED' -Phase $script:containerScanPhase -FailureCode $failureCode -ExceptionType $_.Exception.GetType().Name
        throw $failureCode
    }
}
````


### api/scripts/supply-chain/Invoke-GitleaksScanning.ps1

Original-byte SHA256: 21c38ef2ad268cf198ed36a68a290d15f1c0d64bdaaac49f810c3e589f682120

````powershell
#Requires -Version 5.1
[CmdletBinding()]
param([string]$OutputPath)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$contractPath = Join-Path $repoRoot 'security\tooling\gitleaks-scan-contract.json'
$allowlistPath = Join-Path $repoRoot 'security\gitleaks-allowlist.json'
# Keep this unique temporary leaf deliberately short. The repository contains
# deep Java package paths and Windows can otherwise reject the final snapshot
# destination before Gitleaks receives it. New-WorkingTreeSnapshot refuses an
# existing path, so a random collision fails closed rather than sharing data.
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('a' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$evidenceRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot 'services\identity-profile-service\target\s001-t07-evidence'))

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $evidenceRoot 'gitleaks-inventory.json'
} elseif (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath = Join-Path $repoRoot $OutputPath
}
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)
$evidencePrefix = $evidenceRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
if (-not $OutputPath.StartsWith($evidencePrefix, [System.StringComparison]::OrdinalIgnoreCase) -or [System.IO.Path]::GetExtension($OutputPath) -ne '.json') {
    throw 'GITLEAKS_INVENTORY_OUTPUT_UNSAFE'
}

Import-Module (Join-Path $PSScriptRoot 'GitleaksScanning.psm1') -Force

function Invoke-RequiredNodeValidation {
    param([Parameter(Mandatory)][string]$ScriptName, [Parameter(Mandatory)][string]$FailureCode)
    $scriptPath = Join-Path $PSScriptRoot $ScriptName
    if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) { throw $FailureCode }
    $null = @(& node $scriptPath 2>&1)
    if ($LASTEXITCODE -ne 0) { throw $FailureCode }
}

function Confirm-FullReachableHistory {
    $shallow = @(& git -C $repoRoot rev-parse --is-shallow-repository 2>$null)
    if ($LASTEXITCODE -ne 0 -or $shallow.Count -ne 1 -or "$($shallow[0])" -ne 'false') { throw 'GITLEAKS_HISTORY_SHALLOW_OR_UNAVAILABLE' }
    $commitCount = @(& git -C $repoRoot rev-list --all --count 2>$null)
    if ($LASTEXITCODE -ne 0 -or $commitCount.Count -ne 1 -or "$($commitCount[0])" -notmatch '^[1-9][0-9]*$') { throw 'GITLEAKS_HISTORY_UNAVAILABLE' }
}

function Assert-GitleaksExitReportConsistency {
    param([Parameter(Mandatory)]$ScanResult, [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Inventory)
    if ($ScanResult.exitCode -eq 0 -and $Inventory.Count -ne 0) { throw 'GITLEAKS_EXIT_REPORT_MISMATCH' }
    if ($ScanResult.exitCode -eq 3 -and $Inventory.Count -eq 0) { throw 'GITLEAKS_EXIT_REPORT_MISMATCH' }
}

function Write-SanitizedInventory {
    param([Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Inventory)
    $outputDirectory = Split-Path -Parent $OutputPath
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    $stagingPath = Join-Path $outputDirectory ('.gitleaks-inventory-' + [guid]::NewGuid().ToString('N') + '.tmp')
    try {
        ConvertTo-Json -InputObject @($Inventory) -Depth 10 | Set-Content -LiteralPath $stagingPath -Encoding utf8 -NoNewline
        Move-Item -LiteralPath $stagingPath -Destination $OutputPath -Force
    } finally {
        if (Test-Path -LiteralPath $stagingPath) { Remove-Item -LiteralPath $stagingPath -Force -ErrorAction SilentlyContinue }
    }
}

try {
    Invoke-RequiredNodeValidation -ScriptName 'Test-GitleaksScanContract.mjs' -FailureCode 'GITLEAKS_SCAN_CONTRACT_INVALID'
    Invoke-RequiredNodeValidation -ScriptName 'Test-GitleaksConfiguration.mjs' -FailureCode 'GITLEAKS_CONFIGURATION_INVALID'
    Invoke-RequiredNodeValidation -ScriptName 'Test-GitleaksAllowlistSchema.mjs' -FailureCode 'GITLEAKS_ALLOWLIST_INVALID'
    Confirm-FullReachableHistory

    $contract = Get-Content -LiteralPath $contractPath -Raw | ConvertFrom-Json
    $allowlistRegistry = Get-Content -LiteralPath $allowlistPath -Raw | ConvertFrom-Json
    $gitleaksPath = Get-VerifiedGitleaksExecutable
    New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
    $snapshotRoot = Join-Path $temporaryRoot 'working-tree-snapshot'
    $snapshot = New-WorkingTreeSnapshot -RepositoryRoot $repoRoot -TemporaryRoot $snapshotRoot
    $dirResult = Invoke-GitleaksScan -GitleaksExecutable $gitleaksPath -ScanDefinition $contract.scans[0] -RepositoryRoot $repoRoot -InputPath '.' -OutputPath (Join-Path $temporaryRoot 'dir.raw.json') -WorkingDirectory $snapshot.snapshotRoot
    $gitResult = Invoke-GitleaksScan -GitleaksExecutable $gitleaksPath -ScanDefinition $contract.scans[1] -RepositoryRoot $repoRoot -InputPath $repoRoot -OutputPath (Join-Path $temporaryRoot 'git.raw.json')

    $dirInventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath $dirResult.reportPath -ScanMode dir -RepositoryRoot $repoRoot -SnapshotRoot $snapshot.snapshotRoot)
    $gitInventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath $gitResult.reportPath -ScanMode git -RepositoryRoot $repoRoot)
    Assert-GitleaksExitReportConsistency -ScanResult $dirResult -Inventory $dirInventory
    Assert-GitleaksExitReportConsistency -ScanResult $gitResult -Inventory $gitInventory
    $observed = @($dirInventory + $gitInventory | Sort-Object scanMode, ruleId, repositoryRelativePath, scannerFingerprint, commitId)

    try {
        $decisions = @(Test-GitleaksPolicy -Inventory $observed -Allowlist @($allowlistRegistry.entries) -NowUtc ([datetime]::UtcNow))
    } catch {
        Write-SanitizedInventory -Inventory $observed
        Write-Output ('Gitleaks policy: BLOCKED (dirFindings={0}, gitFindings={1}, sanitizedInventoryWritten=true)' -f $dirInventory.Count, $gitInventory.Count)
        throw
    }
    Write-SanitizedInventory -Inventory $decisions
    $falsePositiveCount = @($decisions | Where-Object { $_.status -eq 'false-positive' }).Count
    Write-Output ('Gitleaks scan: PASS (dirFindings={0}, gitFindings={1}, falsePositives={2})' -f $dirInventory.Count, $gitInventory.Count, $falsePositiveCount)
} finally {
    if (Test-Path -LiteralPath $temporaryRoot) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force }
    if (Test-Path -LiteralPath $temporaryRoot) { throw 'GITLEAKS_TEMPORARY_CLEANUP_FAILED' }
}
````


### api/scripts/supply-chain/Invoke-HostedReleasePolicy.ps1

Original-byte SHA256: ebfb4b4346001626e906f0d584cf24a34878b34df4df9714cd30bf3ecb819be4

````powershell
#Requires -Version 5.1
[CmdletBinding()]
param([Parameter(Mandatory)][string]$SummaryPath)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'HostedSupplyChain.psm1') -Force

$summary = Read-HostedRunSummary -Path $SummaryPath
if ($summary.executionState -ne 'PASS' -or $summary.policyState -eq 'NOT_EVALUATED') { throw 'HOSTED_RELEASE_POLICY_NOT_EVALUATED' }
if ($summary.policyState -eq 'PASS') { exit 0 }
if ($summary.policyState -eq 'BLOCKED') { exit 1 }
throw 'HOSTED_RELEASE_POLICY_INVALID'
````


### api/scripts/supply-chain/Invoke-HostedSupplyChain.ps1

Original-byte SHA256: 38d80ea03111fda895cdd3586a46f0686ea7578d5e32738f54463e122dcbd57b

````powershell
#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('supply-chain','security-freshness')][string]$WorkflowName,
    [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{40}$')][string]$CommitSha,
    [Parameter(Mandatory)][string]$EvidenceRoot,
    [switch]$RefreshDatabase,
    [switch]$UseExistingVerifiedArtifact,
    [switch]$NoExit,
    [hashtable]$Adapters
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Import-Module (Join-Path $PSScriptRoot 'HostedSupplyChain.psm1') -Force

function Invoke-HostedStage {
    param([string]$Name, [scriptblock]$DefaultAction, [object[]]$DefaultArguments = @())
    if ($null -ne $Adapters -and $Adapters.ContainsKey($Name)) { return & $Adapters[$Name] }
    return & $DefaultAction @DefaultArguments
}
function Invoke-HostedRepositoryScript {
    param([Parameter(Mandatory)][string]$ScriptName, [string[]]$Arguments = @(), [string]$BootstrapTemporaryRoot, [string]$SmokeTemporaryRoot, [string]$ContainerScanTemporaryRoot)
    $isToolBootstrap = $ScriptName -eq 'Install-SupplyChainTools.ps1'
    $isSmoke = $ScriptName -eq 'Invoke-ContainerTechnicalSmoke.ps1'
    $isContainerScan = $ScriptName -eq 'Invoke-ContainerVulnerabilityScanning.ps1'
    $wrapperPhase = 'initialize'
    try {
        $wrapperPhase = 'resolve-script'
        $scriptPath = Join-Path $PSScriptRoot $ScriptName
        if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
            if ($isToolBootstrap) { throw 'TOOL_BOOTSTRAP_SCRIPT_RESOLUTION_FAILED' }
            throw 'POLICY_EVALUATION_FAILED'
        }
        $wrapperPhase = 'resolve-shell'
        $childPowerShell = Get-HostedChildPowerShellExecutable
    } catch {
        $message = [string]$_.Exception.Message
        if ($isToolBootstrap -and $message -notmatch '^TOOL_BOOTSTRAP_[A-Z_]+_FAILED$') {
            Write-Warning ('Tool bootstrap wrapper diagnostic: phase={0}; exceptionType={1}' -f $wrapperPhase, $_.Exception.GetType().Name)
            throw 'TOOL_BOOTSTRAP_WRAPPER_FAILED'
        }
        throw
    }
    $wrapperPhase = 'build-arguments'
    $previousErrorActionPreference = $ErrorActionPreference
    $runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
    $childArguments = @('-NoProfile')
    if ($runningOnWindows) { $childArguments += @('-ExecutionPolicy', 'Bypass') }
    $childArguments += @('-File', $scriptPath)
    $childArguments += $Arguments
    $bootstrapStatusPath = $null
    $smokeStatusPath = $null
    $containerScanStatusPath = $null
    if ($isToolBootstrap) {
        $wrapperPhase = 'validate-temp-root'
        if ([string]::IsNullOrWhiteSpace($BootstrapTemporaryRoot) -or -not (Test-Path -LiteralPath $BootstrapTemporaryRoot -PathType Container)) {
            Write-Warning ('Tool bootstrap wrapper diagnostic: phase={0}; exceptionType={1}' -f $wrapperPhase, 'ValidationException')
            throw 'TOOL_BOOTSTRAP_WRAPPER_FAILED'
        }
        $wrapperPhase = 'build-status-path'
        try {
            $bootstrapStatusPath = Join-Path $BootstrapTemporaryRoot ('tool-bootstrap-' + [guid]::NewGuid().ToString('N') + '.json')
            $childArguments += @('-StatusPath', $bootstrapStatusPath)
        } catch {
            Write-Warning ('Tool bootstrap wrapper diagnostic: phase={0}; exceptionType={1}' -f $wrapperPhase, $_.Exception.GetType().Name)
            throw 'TOOL_BOOTSTRAP_WRAPPER_FAILED'
        }
    }
    if ($isSmoke) {
        if ([string]::IsNullOrWhiteSpace($SmokeTemporaryRoot) -or -not (Test-Path -LiteralPath $SmokeTemporaryRoot -PathType Container)) {
            throw 'CONTAINER_SMOKE_WRAPPER_STARTUP_FAILED'
        }
        $smokeStatusPath = Join-Path $SmokeTemporaryRoot ('container-smoke-' + [guid]::NewGuid().ToString('N') + '.json')
        $childArguments += @('-StatusPath', $smokeStatusPath)
    }
    if ($isContainerScan) {
        if ([string]::IsNullOrWhiteSpace($ContainerScanTemporaryRoot) -or -not (Test-Path -LiteralPath $ContainerScanTemporaryRoot -PathType Container)) {
            throw 'CONTAINER_SCAN_WRAPPER_STARTUP_FAILED'
        }
        $containerScanStatusPath = Join-Path $ContainerScanTemporaryRoot ('container-scan-' + [guid]::NewGuid().ToString('N') + '.json')
        $childArguments += @('-StatusPath', $containerScanStatusPath)
    }
    $wrapperPhase = 'launch-child'
    try {
        $ErrorActionPreference = 'Continue'
        $output = @(& $childPowerShell @childArguments 2>&1)
        $exitCode = $LASTEXITCODE
    } catch {
        if ($isToolBootstrap) { throw 'TOOL_BOOTSTRAP_CHILD_LAUNCH_FAILED' }
        throw
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($isToolBootstrap) {
        $wrapperPhase = 'read-status'
        try { $bootstrapStatus = Read-HostedToolBootstrapStatus -Path $bootstrapStatusPath } catch {
            Write-Warning ('Tool bootstrap wrapper diagnostic: phase={0}; exceptionType={1}' -f $wrapperPhase, $_.Exception.GetType().Name)
            throw 'TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED'
        }
        $wrapperPhase = 'interpret-status'
        if ($bootstrapStatus.state -eq 'FAILED') { throw $bootstrapStatus.failureCode }
        $wrapperPhase = 'check-child-exit'
        if ($exitCode -ne 0) { throw 'TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED' }
        $wrapperPhase = 'complete'
        return $output
    }
    if ($isSmoke) {
        $smokeStatus = Read-HostedSmokeStatus -Path $smokeStatusPath
        if ($smokeStatus.state -eq 'FAILED') {
            if ($exitCode -eq 0) { throw 'CONTAINER_SMOKE_WRAPPER_STATUS_INVALID' }
            throw ('{0}|phase={1}|exceptionType={2}' -f $smokeStatus.failureCode, $smokeStatus.phase, $smokeStatus.exceptionType)
        }
        if ($smokeStatus.state -eq 'STARTED') {
            if ($exitCode -eq 0) { throw 'CONTAINER_SMOKE_WRAPPER_STATUS_INVALID' }
            throw ('CONTAINER_SMOKE_WRAPPER_UNMANAGED_FAILURE|phase={0}|exceptionType=Unavailable' -f $smokeStatus.phase)
        }
        if ($exitCode -ne 0) {
            throw 'CONTAINER_SMOKE_WRAPPER_STATUS_INVALID'
        }
        return $output
    }
    if ($isContainerScan) {
        $containerScanStatus = Read-HostedContainerScanStatus -Path $containerScanStatusPath
        if ($containerScanStatus.state -eq 'BLOCKED') {
            if ($exitCode -eq 0) { throw 'CONTAINER_SCAN_WRAPPER_STATUS_INVALID' }
            Write-Warning ('Container scan diagnostic: phase={0}; failureCode={1}' -f $containerScanStatus.phase, $containerScanStatus.failureCode)
            return 'POLICY_BLOCKED'
        }
        if ($containerScanStatus.state -eq 'FAILED') {
            if ($exitCode -eq 0) { throw 'CONTAINER_SCAN_WRAPPER_STATUS_INVALID' }
            throw ('{0}|phase={1}|exceptionType={2}' -f $containerScanStatus.failureCode, $containerScanStatus.phase, $containerScanStatus.exceptionType)
        }
        if ($containerScanStatus.state -eq 'PASS' -and $exitCode -eq 0) { return $output }
        throw 'CONTAINER_SCAN_WRAPPER_STATUS_INVALID'
    }
    if ($exitCode -ne 0) {
        $text = $output -join [Environment]::NewLine
        if ($isToolBootstrap) {
            if ($text -match '\b(TOOL_BOOTSTRAP_(?:COSIGN|TRIVY|PROVENANCE|TUF_REFRESH|GITLEAKS|MODULE_LOAD|PLATFORM_RESOLUTION|CHILD_PROCESS|WRAPPER|SCRIPT_RESOLUTION|SHELL_RESOLUTION|CHILD_LAUNCH)_FAILED)\b') { throw $Matches[1] }
            throw 'TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED'
        }
        if ([string]::IsNullOrWhiteSpace($text)) { throw 'POLICY_EVALUATION_FAILED' }
        throw $text
    }
    return $output
}
function Write-HostedJson {
    param([string]$Path, $Value)
    if ($Value -is [System.Collections.IDictionary] -and $Value.Contains('findings')) {
        $findingsValue = $Value['findings']
        if ($null -eq $findingsValue -or ($findingsValue -is [pscustomobject] -and @($findingsValue.PSObject.Properties).Count -eq 0)) {
            $Value['findings'] = [object[]]@()
        }
    }
    [System.IO.File]::WriteAllText($Path, ($Value | ConvertTo-Json -Depth 8 -Compress), [System.Text.UTF8Encoding]::new($false))
}
function Get-HostedSha256 {
    param([Parameter(Mandatory)][string]$Path)
    $stream = [System.IO.File]::OpenRead($Path)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try { return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose(); $stream.Dispose() }
}
function Read-HostedSanitizedInventory {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw 'EVIDENCE_SANITIZATION_FAILED' }
    try {
        $parsed = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -ErrorAction Stop
        $items = @($parsed | ForEach-Object { $_ })
        foreach ($item in $items) {
            foreach ($forbidden in @('Secret','Match','Line','Description','PrimaryURL','References')) {
                if ($item.PSObject.Properties.Name -contains $forbidden) { throw 'EVIDENCE_SANITIZATION_FAILED' }
            }
        }
        return $items
    } catch { throw 'EVIDENCE_SANITIZATION_FAILED' }
}

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-hosted-' + [guid]::NewGuid().ToString('N'))
$summary = New-HostedRunSummary -Workflow $WorkflowName -CommitSha $CommitSha
$policyBlocked = $false
$reviewRequired = $false
$primaryFailure = $null
$currentFailureCode = 'POLICY_EVALUATION_FAILED'
$completedStages = New-Object System.Collections.Generic.HashSet[string]
try {
    [void][System.IO.Directory]::CreateDirectory($EvidenceRoot)
    [void][System.IO.Directory]::CreateDirectory($temporaryRoot)
    $stages = @(
        @{ name='contract'; code='CONTRACT_VALIDATION_FAILED'; action={ node (Join-Path $PSScriptRoot 'Test-HostedSupplyChainContract.mjs') '--repository'; if ($LASTEXITCODE -ne 0) { throw 'CONTRACT_VALIDATION_FAILED' } } },
        @{ name='tools'; code='TOOL_BOOTSTRAP_FAILED'; arguments=@($temporaryRoot); action={ param([string]$BootstrapTemporaryRoot) Invoke-HostedRepositoryScript -ScriptName 'Install-SupplyChainTools.ps1' -BootstrapTemporaryRoot $BootstrapTemporaryRoot | Out-Null } },
        @{ name='prebuild'; code='SBOM_BUILD_FAILED'; action={ if ($UseExistingVerifiedArtifact) { Invoke-HostedRepositoryScript -ScriptName 'Invoke-ContainerPrebuildArtifact.ps1' -Arguments @('-SkipBuild') | Out-Null } else { Invoke-HostedRepositoryScript -ScriptName 'Invoke-ContainerPrebuildArtifact.ps1' | Out-Null } } },
        @{ name='dependency'; code='DEPENDENCY_SCAN_FAILED'; action={ if ($RefreshDatabase) { Invoke-HostedRepositoryScript -ScriptName 'Invoke-VulnerabilityScanning.ps1' | Out-Null } else { Invoke-HostedRepositoryScript -ScriptName 'Invoke-VulnerabilityScanning.ps1' -Arguments @('-SkipDatabaseRefresh') | Out-Null } } },
        @{ name='gitleaks'; code='SECRET_SCAN_FAILED'; action={ Invoke-HostedRepositoryScript -ScriptName 'Invoke-GitleaksScanning.ps1' | Out-Null } },
        @{ name='base'; code='BASE_TRUST_FAILED'; action={ Invoke-HostedRepositoryScript -ScriptName 'Test-ContainerBaseImageResolution.ps1' | Out-Null } },
        @{ name='image'; code='IMAGE_BUILD_FAILED'; action={ Invoke-HostedRepositoryScript -ScriptName 'Invoke-ContainerImageBuild.ps1' -Arguments @('-UseExistingVerifiedArtifact') | Out-Null } },
        @{ name='smoke'; code='SMOKE_FAILED'; arguments=@($temporaryRoot); action={ param([string]$SmokeTemporaryRoot) Invoke-HostedRepositoryScript -ScriptName 'Invoke-ContainerTechnicalSmoke.ps1' -SmokeTemporaryRoot $SmokeTemporaryRoot | Out-Null } },
        @{ name='container'; code='CONTAINER_SCAN_FAILED'; arguments=@($temporaryRoot); action={ param([string]$ContainerScanTemporaryRoot) Invoke-HostedRepositoryScript -ScriptName 'Invoke-ContainerVulnerabilityScanning.ps1' -ContainerScanTemporaryRoot $ContainerScanTemporaryRoot } }
    )
    foreach ($stage in $stages) {
        $currentFailureCode = $stage.code
        try {
            $stageArguments = if ($stage.ContainsKey('arguments')) { @($stage.arguments) } else { @() }
            $result = Invoke-HostedStage -Name $stage.name -DefaultAction $stage.action -DefaultArguments $stageArguments
            $null = $completedStages.Add($stage.name)
            if ($result -eq 'POLICY_BLOCKED') { $policyBlocked = $true }
            if ($result -eq 'REVIEW_REQUIRED') { $reviewRequired = $true }
        } catch {
            $message = [string]$_.Exception.Message
            if ($message -match '\b(TOOL_BOOTSTRAP_(?:COSIGN|TRIVY|PROVENANCE|TUF_REFRESH|GITLEAKS|MODULE_LOAD|PLATFORM_RESOLUTION|CHILD_PROCESS|WRAPPER|SCRIPT_RESOLUTION|SHELL_RESOLUTION|CHILD_LAUNCH)_FAILED)\b') {
                throw $Matches[1]
            }
            if ($stage.name -eq 'tools') {
                Write-Warning ('Tool bootstrap wrapper diagnostic: phase=stage-dispatch; exceptionType={0}' -f $_.Exception.GetType().Name)
                throw 'TOOL_BOOTSTRAP_WRAPPER_FAILED'
            }
            if ($stage.name -eq 'prebuild' -and $message -match '\b(CONTAINER_PREBUILD_[A-Z_]+)\b') {
                Write-Warning ('Container prebuild diagnostic: failureCode={0}' -f $Matches[1])
            }
            if ($stage.name -eq 'base' -and $message -match '\b(CONTAINER_BASE_IMAGE_[A-Z_]+)\b') {
                Write-Warning ('Container base trust diagnostic: failureCode={0}' -f $Matches[1])
            }
            if ($stage.name -eq 'base' -and $message -match 'CONTAINER_BASE_IMAGE_UNCLASSIFIED_FAILED\|phase=([a-z-]+)\|exceptionType=([A-Za-z0-9_.]+)') {
                Write-Warning ('Container base resolution diagnostic: phase={0}; exceptionType={1}' -f $Matches[1], $Matches[2])
            }
            if ($stage.name -eq 'smoke' -and $message -match '(CONTAINER_SMOKE_[A-Z_]+)\|phase=([a-z-]+)\|exceptionType=([A-Za-z0-9_.]+)') {
                Write-Warning ('Container smoke diagnostic: phase={0}; failureCode={1}; exceptionType={2}' -f $Matches[2], $Matches[1], $Matches[3])
            } elseif ($stage.name -eq 'smoke' -and $message -match '\b(CONTAINER_SMOKE_[A-Z_]+)\b') {
                Write-Warning ('Container smoke diagnostic: failureCode={0}' -f $Matches[1])
            } elseif ($stage.name -eq 'smoke') {
                Write-Warning 'Container smoke diagnostic: failureCode=CONTAINER_SMOKE_WRAPPER_UNCLASSIFIED'
            }
            if ($stage.name -eq 'container' -and $message -match '(CONTAINER_SCAN_[A-Z_]+)\|phase=([a-z-]+)\|exceptionType=([A-Za-z0-9_.]+)') {
                Write-Warning ('Container scan diagnostic: phase={0}; failureCode={1}; exceptionType={2}' -f $Matches[2], $Matches[1], $Matches[3])
            } elseif ($stage.name -eq 'container' -and $message -match '\b(CONTAINER_SCAN_[A-Z_]+)\b') {
                Write-Warning ('Container scan diagnostic: failureCode={0}' -f $Matches[1])
            }
            if ($message -match 'HIGH_OR_CRITICAL_DISPOSITION_REQUIRED|CONTAINER_SCAN_POLICY_BLOCKED|VULNERABILITY_POLICY_BLOCKED|GITLEAKS_POLICY_BLOCKED') {
                # A policy block means scanning and sanitization completed; retain its evidence.
                $null = $completedStages.Add($stage.name)
                $policyBlocked = $true
                continue
            }
            throw $stage.code
        }
    }
    $summary = Complete-HostedExecution -Summary $summary -PolicyState $(if ($policyBlocked) { 'BLOCKED' } else { 'PASS' })
    if ($reviewRequired) { $summary = Set-HostedStageResult -Summary $summary -Result 'REVIEW_REQUIRED' }
} catch {
    $primaryFailure = [string]$_.Exception.Message
    if ($primaryFailure -notmatch '^(CHECKOUT_FAILED|CONTRACT_VALIDATION_FAILED|TOOL_BOOTSTRAP_FAILED|TOOL_BOOTSTRAP_COSIGN_FAILED|TOOL_BOOTSTRAP_TRIVY_FAILED|TOOL_BOOTSTRAP_PROVENANCE_FAILED|TOOL_BOOTSTRAP_TUF_REFRESH_FAILED|TOOL_BOOTSTRAP_GITLEAKS_FAILED|TOOL_BOOTSTRAP_MODULE_LOAD_FAILED|TOOL_BOOTSTRAP_PLATFORM_RESOLUTION_FAILED|TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED|TOOL_BOOTSTRAP_WRAPPER_FAILED|TOOL_BOOTSTRAP_SCRIPT_RESOLUTION_FAILED|TOOL_BOOTSTRAP_SHELL_RESOLUTION_FAILED|TOOL_BOOTSTRAP_CHILD_LAUNCH_FAILED|SBOM_BUILD_FAILED|SBOM_VALIDATION_FAILED|DEPENDENCY_SCAN_FAILED|SECRET_SCAN_FAILED|BASE_TRUST_FAILED|IMAGE_BUILD_FAILED|SMOKE_FAILED|CONTAINER_SCAN_FAILED|SCANNER_OUTPUT_INVALID|POLICY_EVALUATION_FAILED|EVIDENCE_SANITIZATION_FAILED|EVIDENCE_VALIDATION_FAILED|EVIDENCE_UPLOAD_FAILED|CLEANUP_FAILED)$') { $primaryFailure = $currentFailureCode }
    $summary = Set-HostedStageResult -Summary $summary -Result 'IMPLEMENTATION_FAILURE' -FailureCode $primaryFailure
} finally {
    try {
        Write-HostedRunSummaryAtomic -Path (Join-Path $EvidenceRoot 'run-summary.json') -Summary $summary
        $serviceEvidence = Join-Path $repoRoot 'services\identity-profile-service\target\s001-t07-evidence'
        $inventoryMap = @{ dependency='vulnerability-inventory.json'; gitleaks='gitleaks-inventory.json'; container='container-vulnerability-inventory.json' }
        $allFindings = @()
        foreach ($stageName in $inventoryMap.Keys) {
            $findings = @()
            if ($summary.executionState -eq 'PASS' -and $completedStages.Contains($stageName)) { $findings = @(Read-HostedSanitizedInventory -Path (Join-Path $serviceEvidence $inventoryMap[$stageName])) }
            $allFindings += $findings
            $destination = switch ($stageName) { 'dependency' { 'vulnerability-inventory.json' } 'gitleaks' { 'gitleaks-inventory.json' } default { 'container-vulnerability-inventory.json' } }
            Write-HostedJson -Path (Join-Path $EvidenceRoot $destination) -Value ([ordered]@{schemaVersion=1;commit=$CommitSha;findings=$findings})
        }
        $imageContract = Get-Content -LiteralPath (Join-Path $repoRoot 'security\tooling\container-image-contract.json') -Raw | ConvertFrom-Json
        $baseTrust = Get-Content -LiteralPath (Join-Path $repoRoot 'security\tooling\container-base-images.json') -Raw | ConvertFrom-Json
        $jarPath = Join-Path $repoRoot ([string]$imageContract.build.canonicalJarRelativePath).Replace('/','\')
        $imageId = if ($null -eq $Adapters -and $summary.executionState -eq 'PASS' -and $completedStages.Contains('image')) { ((& docker image inspect $imageContract.image.localReference --format '{{.Id}}' 2>$null) | Select-Object -First 1) } else { 'unavailable' }
        $jarHash = if (Test-Path -LiteralPath $jarPath) { Get-HostedSha256 -Path $jarPath } else { 'unavailable' }
        Write-HostedJson -Path (Join-Path $EvidenceRoot 'image-identity.json') -Value ([ordered]@{schemaVersion=1;commit=$CommitSha;imageId=$imageId;platform=$imageContract.image.platform;jarSha256=$jarHash;baseManifestDigest=$baseTrust.images[0].platformManifestDigest})
        $smokeReady = if ($summary.executionState -eq 'PASS' -and $completedStages.Contains('smoke')) { 'UP' } else { 'unavailable' }
        Write-HostedJson -Path (Join-Path $EvidenceRoot 'smoke-summary.json') -Value ([ordered]@{schemaVersion=1;commit=$CommitSha;readiness=$smokeReady;platform=$imageContract.image.platform;runtimeUser=$imageContract.runtime.user;readOnlyRootFilesystem=$imageContract.technicalSmoke.readOnlyRootFilesystem;dropAllCapabilities=$imageContract.technicalSmoke.dropAllCapabilities;noNewPrivileges=$imageContract.technicalSmoke.noNewPrivileges})
        $counts = @{}; foreach ($severity in @('CRITICAL','HIGH','MEDIUM','LOW','UNKNOWN')) { $counts[$severity] = @($allFindings | Where-Object { $_.severity -eq $severity }).Count }
        Write-HostedJson -Path (Join-Path $EvidenceRoot 'policy-summary.json') -Value ([ordered]@{schemaVersion=1;commit=$CommitSha;policyState=$summary.policyState;reviewState=$summary.reviewState;deltaState=$summary.deltaState;counts=$counts})
    } finally {
        if (Test-Path -LiteralPath $temporaryRoot) { Remove-HostedTemporaryRoot -Root $temporaryRoot }
    }
}

$summaryHash = Get-HostedSha256 -Path (Join-Path $EvidenceRoot 'run-summary.json')
if (-not [string]::IsNullOrWhiteSpace([string]$env:GITHUB_OUTPUT)) { Add-Content -LiteralPath $env:GITHUB_OUTPUT -Value "policy_state=$($summary.policyState)"; Add-Content -LiteralPath $env:GITHUB_OUTPUT -Value "review_state=$($summary.reviewState)"; Add-Content -LiteralPath $env:GITHUB_OUTPUT -Value "summary_sha256=$summaryHash" }
if ($NoExit) { return $summary }
Write-Output (Format-HostedRunResult -Summary $summary)
if ($summary.executionState -ne 'PASS') { exit 1 }
exit 0
````


### api/scripts/supply-chain/Invoke-VulnerabilityScanning.ps1

Original-byte SHA256: ebe0302ebd4fe5d0826701641c5355025f7f8ddeaa301fd5b02c3bba76f15962

````powershell
#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$OutputPath,
    [switch]$SkipDatabaseRefresh
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$contractPath = Join-Path $repoRoot 'security\tooling\vulnerability-scan-contract.json'
$dispositionsPath = Join-Path $repoRoot 'security\vulnerability-dispositions.json'
$contractTestPath = Join-Path $PSScriptRoot 'Test-VulnerabilityScanContract.mjs'
$dispositionTestPath = Join-Path $PSScriptRoot 'Test-VulnerabilityDispositionSchema.mjs'
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('auction-promax-vulnerability-scan-' + [guid]::NewGuid().ToString('N'))
$evidenceRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot 'services\identity-profile-service\target\s001-t07-evidence'))

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $evidenceRoot 'vulnerability-inventory.json'
} elseif (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath = Join-Path $repoRoot $OutputPath
}
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)
$evidencePrefix = $evidenceRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
if (-not $OutputPath.StartsWith($evidencePrefix, [System.StringComparison]::OrdinalIgnoreCase) -or
    [System.IO.Path]::GetExtension($OutputPath) -ne '.json') {
    throw 'VULNERABILITY_INVENTORY_OUTPUT_UNSAFE'
}

Import-Module (Join-Path $PSScriptRoot 'VulnerabilityScanning.psm1') -Force

function Invoke-RequiredNodeValidation {
    param([Parameter(Mandatory)][string]$ScriptPath, [Parameter(Mandatory)][string]$FailureCode)
    if (-not (Test-Path -LiteralPath $ScriptPath -PathType Leaf)) {
        throw $FailureCode
    }
    $null = @(& node $ScriptPath 2>&1)
    if ($LASTEXITCODE -ne 0) {
        throw $FailureCode
    }
}

function Write-SanitizedInventory {
    param([Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Inventory)
    $outputDirectory = Split-Path -Parent $OutputPath
    if ([string]::IsNullOrWhiteSpace($outputDirectory)) {
        throw 'VULNERABILITY_INVENTORY_OUTPUT_INVALID'
    }
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    $stagingPath = Join-Path $outputDirectory ('.vulnerability-inventory-' + [guid]::NewGuid().ToString('N') + '.tmp')
    try {
        ConvertTo-Json -InputObject @($Inventory) -Depth 10 | Set-Content -LiteralPath $stagingPath -Encoding utf8 -NoNewline
        Move-Item -LiteralPath $stagingPath -Destination $OutputPath -Force
    } finally {
        if (Test-Path -LiteralPath $stagingPath) {
            Remove-Item -LiteralPath $stagingPath -Force -ErrorAction SilentlyContinue
        }
    }
}

try {
    Invoke-RequiredNodeValidation -ScriptPath $contractTestPath -FailureCode 'VULNERABILITY_SCAN_CONTRACT_INVALID'
    Invoke-RequiredNodeValidation -ScriptPath $dispositionTestPath -FailureCode 'VULNERABILITY_DISPOSITION_REGISTRY_INVALID'

    $contract = Get-Content -LiteralPath $contractPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
    $registry = Get-Content -LiteralPath $dispositionsPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
    $cachePath = Join-Path $repoRoot ([string]$contract.database.cacheRelativePath).Replace('/', '\')
    $trivyPath = Get-VerifiedTrivyExecutable

    if ($SkipDatabaseRefresh) {
        $metadataPath = Join-Path $cachePath 'db\metadata.json'
        $databasePath = Join-Path $cachePath 'db\trivy.db'
        Test-TrivyDatabaseFreshness -MetadataPath $metadataPath -DatabasePath $databasePath -NowUtc ([datetime]::UtcNow) -MaxAgeHours $contract.database.maxAgeHours -FutureClockSkewSeconds $contract.database.futureClockSkewSeconds | Out-Null
    } else {
        Confirm-TrivyDatabaseFreshness -TrivyExecutable $trivyPath -CacheDirectory $cachePath -NowUtc ([datetime]::UtcNow) -MaxAgeHours $contract.database.maxAgeHours -FutureClockSkewSeconds $contract.database.futureClockSkewSeconds | Out-Null
    }

    New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null
    $inventory = New-Object System.Collections.Generic.List[object]
    Push-Location $repoRoot
    try {
        foreach ($scan in @($contract.scans)) {
            $rawReportPath = Join-Path $temporaryRoot ($scan.id + '.raw.json')
            Invoke-TrivyScan -TrivyExecutable $trivyPath -ScanDefinition $scan -CacheDirectory $cachePath -OutputPath $rawReportPath | Out-Null
            foreach ($finding in @(ConvertTo-SanitizedVulnerabilityInventory -ReportPath $rawReportPath -ScanDefinition $scan)) {
                $inventory.Add($finding)
            }
        }
    } finally {
        Pop-Location
    }

    $observed = @($inventory | Sort-Object findingId, source, targetType, target, 'package/component', affectedVersion)
    try {
        $decisions = @(Test-VulnerabilityPolicy -Inventory $observed -Dispositions @($registry.dispositions) -NowUtc ([datetime]::UtcNow))
    } catch {
        # Persist only the already-sanitized inventory so a blocking finding can
        # be dispositioned without retaining Trivy's raw report.
        Write-SanitizedInventory -Inventory $observed
        $criticalCount = @($observed | Where-Object { $_.severity -eq 'CRITICAL' }).Count
        $highCount = @($observed | Where-Object { $_.severity -eq 'HIGH' }).Count
        Write-Output ('Vulnerability policy: BLOCKED (critical={0}, high={1}, sanitizedInventoryWritten=true)' -f $criticalCount, $highCount)
        throw
    }
    Write-SanitizedInventory -Inventory $decisions

    $accepted = @($decisions | Where-Object { $_.status -eq 'accepted-risk' }).Count
    Write-Output ('Vulnerability scan: PASS (targets={0}, findings={1}, acceptedRisk={2})' -f @($contract.scans).Count, $decisions.Count, $accepted)
} finally {
    if (Test-Path -LiteralPath $temporaryRoot) {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
````


### api/scripts/supply-chain/SupplyChainTooling.psm1

Original-byte SHA256: b3cce63cab5a154a8bc2beefb058be71ce972a7973823a3a917084394cb2fc9e

````powershell
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ==================================================================================
# SupplyChainTooling.psm1
#
# Repository-owned supply-chain tool bootstrap and integrity verification logic.
# Cycle 1 scope: manifest validation, checksum-verified download cache, Trivy
# Sigstore provenance verification, and the Gitleaks seeded integrity fixture.
# No scanner, image, or CI execution is claimed by this module.
# ==================================================================================

$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$script:DefaultManifestPath = Join-Path $script:RepoRoot 'security\tooling\supply-chain-tools.json'
$script:DefaultToolsRoot = Join-Path $script:RepoRoot '.tools\supply-chain'

$script:PinnedVersions = @{
    trivy    = '0.74.0'
    gitleaks = '8.30.0'
    cosign   = '3.1.2'
}

$script:PinnedRepos = @{
    trivy    = 'aquasecurity/trivy'
    gitleaks = 'gitleaks/gitleaks'
    cosign   = 'sigstore/cosign'
}

$script:SupportedPlatforms = @('windows-x64', 'linux-x64')
$script:SupportedArchiveTypes = @('zip', 'tar.gz', 'binary')
$script:ExpectedTrivyIssuer = 'https://token.actions.githubusercontent.com'

# ----------------------------------------------------------------------------------
# Manifest handling
# ----------------------------------------------------------------------------------

function Read-ToolManifest {
    <#
    .SYNOPSIS
    Reads and parses the repository-owned supply-chain tool manifest.
    #>
    param(
        [string]$ManifestPath = $script:DefaultManifestPath
    )
    if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
        throw 'Manifest path must not be empty.'
    }
    if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
        throw "Supply-chain tool manifest not found: $ManifestPath"
    }
    $raw = Get-Content -LiteralPath $ManifestPath -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) {
        throw 'Supply-chain tool manifest is empty.'
    }
    try {
        $parsed = $raw | ConvertFrom-Json
    } catch {
        throw "Supply-chain tool manifest is not valid JSON: $($_.Exception.Message)"
    }
    if ($null -eq $parsed) {
        throw 'Supply-chain tool manifest parsed to null.'
    }
    return $parsed
}

function Assert-NoExtraProperties {
    param(
        [Parameter(Mandatory)][AllowNull()]$Object,
        [Parameter(Mandatory)][string[]]$Allowed,
        [Parameter(Mandatory)][string]$Context
    )
    if ($null -eq $Object) { return }
    foreach ($p in $Object.PSObject.Properties) {
        if ($p.Name -notin $Allowed) {
            throw "$Context contains unknown property '$($p.Name)' (additionalProperties=false)."
        }
    }
}

function Test-SigstoreDefinition {
    param(
        [Parameter(Mandatory)]$Tool,
        [Parameter(Mandatory)]$Sigstore
    )
    $name = $Tool.name
    Assert-NoExtraProperties -Object $Sigstore -Allowed @('bundleAssetSuffix', 'certificateOidcIssuer', 'certificateIdentity') -Context "Tool '$name' sigstore"
    if ($null -eq $Sigstore.bundleAssetSuffix -or "$($Sigstore.bundleAssetSuffix)" -notmatch '^\.[A-Za-z0-9_.-]+$') {
        throw "Tool '$name' sigstore bundleAssetSuffix is missing or invalid."
    }
    if ("$($Sigstore.certificateOidcIssuer)" -ne $script:ExpectedTrivyIssuer) {
        throw "Tool '$name' certificateOidcIssuer '$($Sigstore.certificateOidcIssuer)' must be exactly '$($script:ExpectedTrivyIssuer)'."
    }
    $identity = "$($Sigstore.certificateIdentity)"
    $expectedIdentity = "https://github.com/$($script:PinnedRepos[$name])/.github/workflows/reusable-release.yaml@refs/tags/v$($script:PinnedVersions[$name])"
    if ($identity -ne $expectedIdentity) {
        throw "Tool '$name' certificateIdentity '$identity' must be exactly '$expectedIdentity'."
    }
}

function Test-PlatformEntry {
    param(
        [Parameter(Mandatory)]$Tool,
        [Parameter(Mandatory)][string]$Platform,
        [Parameter(Mandatory)]$Entry
    )
    $name = $Tool.name
    Assert-NoExtraProperties -Object $Entry -Allowed @('assetName', 'sha256', 'archiveType', 'executableName') -Context "Tool '$name' platform '$Platform'"
    $asset = "$($Entry.assetName)"
    if ([string]::IsNullOrWhiteSpace($asset)) {
        throw "Tool '$name' platform '$Platform' is missing assetName."
    }
    if ($asset -match 'latest') {
        throw "Tool '$name' platform '$Platform' assetName must not reference 'latest'."
    }
    if ($asset -notmatch '^[A-Za-z0-9._-]+$' -or $asset -match '\.\.' -or $asset -match '[\\/:]') {
        throw "Tool '$name' platform '$Platform' assetName '$asset' is unsafe."
    }
    $sha = "$($Entry.sha256)"
    if ($sha -notmatch '^[a-f0-9]{64}$') {
        throw "Tool '$name' platform '$Platform' sha256 must be a lowercase 64-character hex digest."
    }
    if ($sha -eq ('0' * 64)) {
        throw "Tool '$name' platform '$Platform' sha256 is a placeholder and is rejected."
    }
    if ("$($Entry.archiveType)" -notin $script:SupportedArchiveTypes) {
        throw "Tool '$name' platform '$Platform' archiveType '$($Entry.archiveType)' is unsupported."
    }
    $exe = "$($Entry.executableName)"
    if ($exe -notmatch '^[A-Za-z0-9_-]+(\.exe)?$') {
        throw "Tool '$name' platform '$Platform' executableName '$exe' is unsafe."
    }
    if ($Platform -eq 'windows-x64' -and $exe -notmatch '\.exe$') {
        throw "Tool '$name' platform '$Platform' executableName must end in '.exe'."
    }
}

function Test-ToolDefinition {
    param(
        [Parameter(Mandatory)]$Tool
    )
    $name = "$($Tool.name)"
    Assert-NoExtraProperties -Object $Tool -Allowed @('name', 'version', 'officialReleaseBaseUrl', 'versionArguments', 'versionPattern', 'purpose', 'sigstore', 'platforms') -Context "Tool '$name'"

    if ($name -notin $script:PinnedRepos.Keys) {
        throw "Unsupported tool '$name'."
    }
    $version = "$($Tool.version)"
    if ($version -eq 'latest') {
        throw "Tool '$name' uses floating version 'latest'; pinning is mandatory."
    }
    if ($version -notmatch '^[0-9]+\.[0-9]+\.[0-9]+$') {
        throw "Tool '$name' version '$version' is not a pinned semantic version."
    }
    if ($version -ne $script:PinnedVersions[$name]) {
        throw "Tool '$name' version '$version' does not match the pinned version '$($script:PinnedVersions[$name])'."
    }

    $hasPurpose = ($Tool.PSObject.Properties.Name -contains 'purpose')
    if ($hasPurpose) {
        $purpose = "$($Tool.PSObject.Properties['purpose'].Value)"
        if ($purpose -eq 'image-signing') {
            throw "Tool '$name' declares purpose 'image-signing', which is explicitly out of scope for T07."
        }
        if ($purpose -ne 'release-provenance') {
            throw "Tool '$name' has invalid purpose '$purpose'."
        }
        if ($name -ne 'cosign') {
            throw "Only cosign may declare purpose 'release-provenance'."
        }
    }

    $url = "$($Tool.officialReleaseBaseUrl)"
    if ([string]::IsNullOrWhiteSpace($url)) {
        throw "Tool '$name' is missing officialReleaseBaseUrl."
    }
    $uri = $null
    try {
        $uri = [System.Uri]::new($url)
    } catch {
        throw "Tool '$name' release URL '$url' is not a valid URI."
    }
    if ($uri.Scheme -ne 'https') {
        throw "Tool '$name' release URL must use HTTPS."
    }
    if ($uri.Host -ne 'github.com') {
        throw "Tool '$name' release URL host must be exactly 'github.com'."
    }
    $expectedPath = "/$($script:PinnedRepos[$name])/releases/download/v$($script:PinnedVersions[$name])"
    $actualPath = $uri.AbsolutePath.TrimEnd('/')
    if ($actualPath -ne $expectedPath) {
        throw "Tool '$name' release URL path '$actualPath' must be exactly '$expectedPath'."
    }

    $args = @($Tool.versionArguments)
    if ($args.Count -lt 1 -or ($args | Where-Object { "$_" -notmatch '^\S+$' })) {
        throw "Tool '$name' versionArguments must be a non-empty list of single-token strings."
    }
    if ([string]::IsNullOrWhiteSpace("$($Tool.versionPattern)")) {
        throw "Tool '$name' is missing versionPattern."
    }

    $hasSigstore = ($Tool.PSObject.Properties.Name -contains 'sigstore')
    $sigstore = if ($hasSigstore) { $Tool.PSObject.Properties['sigstore'].Value } else { $null }
    if ($name -eq 'trivy') {
        if (-not $hasSigstore) {
            throw "Tool 'trivy' is missing required Sigstore verification metadata."
        }
        Test-SigstoreDefinition -Tool $Tool -Sigstore $sigstore
    } elseif ($hasSigstore) {
        throw "Tool '$name' must not declare Sigstore metadata; only trivy may."
    }

    $hasPlatforms = ($Tool.PSObject.Properties.Name -contains 'platforms')
    if (-not $hasPlatforms) {
        throw "Tool '$name' is missing 'platforms'."
    }
    $platforms = $Tool.PSObject.Properties['platforms'].Value
    Assert-NoExtraProperties -Object $platforms -Allowed $script:SupportedPlatforms -Context "Tool '$name' platforms"
    foreach ($platform in $script:SupportedPlatforms) {
        if ($null -eq $platforms.$platform) {
            throw "Tool '$name' is missing required platform mapping '$platform'."
        }
        Test-PlatformEntry -Tool $Tool -Platform $platform -Entry $platforms.$platform
    }
    return $true
}

function Test-ToolManifest {
    <#
    .SYNOPSIS
    Validates the supply-chain tool manifest against the committed rules
    (security/schemas/supply-chain-tools.schema.json semantics).
    Fails closed on any violation.
    #>
    param(
        [string]$ManifestPath = $script:DefaultManifestPath
    )
    $m = Read-ToolManifest -ManifestPath $ManifestPath
    Assert-NoExtraProperties -Object $m -Allowed @('schemaVersion', 'tools') -Context 'Manifest root'
    if ($m.schemaVersion -ne 1) {
        throw "Unsupported manifest schemaVersion '$($m.schemaVersion)'; expected 1."
    }
    if ($null -eq $m.tools -or @($m.tools).Count -lt 1) {
        throw 'Manifest must contain at least one tool.'
    }
    $names = @($m.tools | ForEach-Object { "$($_.name)" })
    if ($names.Count -ne ($names | Select-Object -Unique).Count) {
        throw 'Duplicate tool names are not allowed in the manifest.'
    }
    foreach ($required in $script:PinnedRepos.Keys) {
        if ($required -notin $names) {
            throw "Required tool '$required' is missing from the manifest."
        }
    }
    foreach ($tool in @($m.tools)) {
        $null = Test-ToolDefinition -Tool $tool
    }
    return $true
}

# ----------------------------------------------------------------------------------
# Platform and tool definition resolution
# ----------------------------------------------------------------------------------

function Resolve-SupportedPlatform {
    <#
    .SYNOPSIS
    Resolves the current OS/architecture to a supported platform id.
    Only windows-x64 and linux-x64 are supported; everything else fails closed.
    #>
    # RuntimeInformation is available in both Windows PowerShell 5.1 and
    # PowerShell 7+.  It avoids depending on the PowerShell 7-only
    # $IsWindows/$IsLinux automatic variables or a caller-provided OS
    # environment variable.
    $runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
    $runningOnLinux = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Linux)
    if (-not ($runningOnWindows -or $runningOnLinux)) {
        throw 'Unsupported operating system for supply-chain tool bootstrap.'
    }
    if ([System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture -ne [System.Runtime.InteropServices.Architecture]::X64) {
        throw 'Only x64 processes are supported for supply-chain tool bootstrap.'
    }
    if ($runningOnWindows) { return 'windows-x64' }
    return 'linux-x64'
}

function Get-ToolCacheDirectory {
    param(
        [Parameter(Mandatory)][string]$ToolsRoot,
        [Parameter(Mandatory)][string]$ToolName,
        [Parameter(Mandatory)][string]$Version,
        [Parameter(Mandatory)][string]$Platform
    )
    return Join-Path (Join-Path (Join-Path $ToolsRoot $ToolName) $Version) $Platform
}

function Get-TarCommand {
    # $IsWindows does not exist in Windows PowerShell 5.1 and StrictMode turns
    # that otherwise harmless probe into a terminating error.
    $runningOnWindows = $env:OS -eq 'Windows_NT'
    if ($PSVersionTable.PSVersion.Major -ge 6) {
        $runningOnWindows = $IsWindows
    }
    $commandName = if ($runningOnWindows) { 'tar.exe' } else { 'tar' }
    $command = Get-Command $commandName -ErrorAction SilentlyContinue
    if ($null -eq $command) {
        throw "$commandName is required to inspect or extract .tar.gz archives."
    }
    return $command.Source
}

function Set-ToolExecutablePermission {
    param(
        [Parameter(Mandatory)][string]$Path
    )
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Executable permission target was not found: $Path"
    }
    $runningOnLinux = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Linux)
    if (-not $runningOnLinux) { return }
    $chmod = Get-Command chmod -ErrorAction SilentlyContinue
    if ($null -eq $chmod) { throw 'chmod is required to prepare Linux tool executables.' }
    & $chmod.Source '+x' '--' $Path
    if ($LASTEXITCODE -ne 0) { throw 'Failed to mark Linux tool executable.' }
}

function Get-ExpectedToolDefinition {
    <#
    .SYNOPSIS
    Returns the validated, resolved tool definition for one tool/platform pair.
    #>
    param(
        [Parameter(Mandatory)][string]$ToolName,
        [Parameter(Mandatory)][string]$Platform,
        [string]$ManifestPath = $script:DefaultManifestPath
    )
    if ($Platform -notin $script:SupportedPlatforms) {
        throw "Unsupported platform '$Platform'."
    }
    $null = Test-ToolManifest -ManifestPath $ManifestPath
    $m = Read-ToolManifest -ManifestPath $ManifestPath
    $tool = @($m.tools) | Where-Object { "$($_.name)" -eq $ToolName } | Select-Object -First 1
    if ($null -eq $tool) {
        throw "Tool '$ToolName' is not present in the manifest."
    }
    $entry = $tool.platforms.$Platform
    $hasSigstore = ($tool.PSObject.Properties.Name -contains 'sigstore')
    $sigstore = if ($hasSigstore) { $tool.PSObject.Properties['sigstore'].Value } else { $null }
    $hasPurpose = ($tool.PSObject.Properties.Name -contains 'purpose')
    $purpose = if ($hasPurpose) { "$($tool.PSObject.Properties['purpose'].Value)" } else { $null }
    $def = [pscustomobject]@{
        Name                    = "$($tool.name)"
        Version                 = "$($tool.version)"
        OfficialReleaseBaseUrl  = "$($tool.officialReleaseBaseUrl)"
        VersionArguments        = @($tool.versionArguments)
        VersionPattern          = "$($tool.versionPattern)"
        Purpose                 = $purpose
        Platform                = $Platform
        AssetName               = "$($entry.assetName)"
        Sha256                  = "$($entry.sha256)"
        ArchiveType             = "$($entry.archiveType)"
        ExecutableName          = "$($entry.executableName)"
        BundleAssetSuffix       = if ($hasSigstore) { "$($sigstore.bundleAssetSuffix)" } else { $null }
        CertificateOidcIssuer   = if ($hasSigstore) { "$($sigstore.certificateOidcIssuer)" } else { $null }
        CertificateIdentity     = if ($hasSigstore) { "$($sigstore.certificateIdentity)" } else { $null }
        ReleaseUrl              = ($tool.officialReleaseBaseUrl.TrimEnd('/') + '/' + $entry.assetName)
    }
    return $def
}

# ----------------------------------------------------------------------------------
# Checksum verification
# ----------------------------------------------------------------------------------

function Get-FileSha256 {
    param(
        [Parameter(Mandatory)][string]$Path
    )
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "File not found for hashing: $Path"
    }
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $stream = [System.IO.File]::OpenRead($Path)
        try {
            $hash = $sha.ComputeHash($stream)
        } finally {
            $stream.Dispose()
        }
    } finally {
        $sha.Dispose()
    }
    return ([System.BitConverter]::ToString($hash)).Replace('-', '').ToLowerInvariant()
}

function Assert-ExpectedSha256 {
    <#
    .SYNOPSIS
    Fails closed when the file does not exist or its SHA-256 differs from the
    committed digest. Nothing is executed on a mismatch.
    #>
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$ExpectedSha256
    )
    if ("$ExpectedSha256" -notmatch '^[a-fA-F0-9]{64}$') {
        throw 'Refusing to verify against a malformed expected SHA-256.'
    }
    $actual = Get-FileSha256 -Path $Path
    if (-not [string]::Equals($actual, "$ExpectedSha256".ToLowerInvariant(), [System.StringComparison]::Ordinal)) {
        throw "Checksum mismatch for '$Path': expected $($ExpectedSha256.ToLowerInvariant()), got $actual."
    }
}

# ----------------------------------------------------------------------------------
# Archive safety
# ----------------------------------------------------------------------------------

function Assert-SafeArchiveEntries {
    <#
    .SYNOPSIS
    Rejects archives with absolute paths, drive-qualified paths, or '..' traversal
    entries before extraction.
    #>
    param(
        [Parameter(Mandatory)][string]$ArchivePath,
        [Parameter(Mandatory)][string]$ArchiveType
    )
    if (-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)) {
        throw "Archive not found: $ArchivePath"
    }
    $entries = New-Object System.Collections.Generic.List[string]
    if ($ArchiveType -eq 'zip') {
        Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop
        $zip = [System.IO.Compression.ZipFile]::OpenRead($ArchivePath)
        try {
            foreach ($entry in $zip.Entries) { $entries.Add($entry.FullName) }
        } finally {
            $zip.Dispose()
        }
    } elseif ($ArchiveType -eq 'tar.gz') {
        $tarPath = Get-TarCommand
        $listed = @(& $tarPath -tzf $ArchivePath 2>$null)
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to list archive entries for '$ArchivePath'."
        }
        foreach ($line in $listed) { $entries.Add([string]$line) }
    } elseif ($ArchiveType -eq 'binary') {
        if ((Get-Item -LiteralPath $ArchivePath).Length -le 0) {
            throw "Binary asset '$ArchivePath' is empty."
        }
        return
    } else {
        throw "Unsupported archive type '$ArchiveType'."
    }
    foreach ($entry in $entries) {
        $normalized = ([string]$entry).Replace('\', '/')
        if ($normalized.StartsWith('/')) {
            throw "Unsafe archive entry '$entry' (absolute path)."
        }
        if ($normalized -match '^[A-Za-z]:') {
            throw "Unsafe archive entry '$entry' (drive-qualified path)."
        }
        foreach ($part in ($normalized -split '/')) {
            if ($part -eq '..') {
                throw "Unsafe archive entry '$entry' (path traversal)."
            }
        }
    }
    if ($entries.Count -lt 1) {
        throw "Archive '$ArchivePath' contains no entries."
    }
}

function Assert-PathWithinRoot {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Root
    )
    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $fullRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd('\', '/')
    if (-not $fullPath.StartsWith($fullRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Resolved path '$fullPath' is outside expected root '$fullRoot'."
    }
}

function Expand-VerifiedToolArchive {
    <#
    .SYNOPSIS
    Validates entries, extracts into a fresh directory, and returns the expected
    executable path only when it resolves strictly inside that directory.
    #>
    param(
        [Parameter(Mandatory)][string]$ArchivePath,
        [Parameter(Mandatory)][string]$ArchiveType,
        [Parameter(Mandatory)][string]$DestinationPath,
        [Parameter(Mandatory)][string]$ExpectedExecutableName
    )
    Assert-SafeArchiveEntries -ArchivePath $ArchivePath -ArchiveType $ArchiveType
    if (Test-Path -LiteralPath $DestinationPath) {
        throw "Extraction destination already exists: $DestinationPath"
    }
    New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
    try {
        if ($ArchiveType -eq 'zip') {
            Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop
            [System.IO.Compression.ZipFile]::ExtractToDirectory($ArchivePath, $DestinationPath)
        } elseif ($ArchiveType -eq 'tar.gz') {
            $tarPath = Get-TarCommand
            & $tarPath -xzf $ArchivePath -C $DestinationPath
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to extract archive '$ArchivePath'."
            }
        } else {
            throw "Archive type '$ArchiveType' cannot be expanded."
        }
        $found = @(Get-ChildItem -LiteralPath $DestinationPath -Recurse -File | Where-Object { $_.Name -eq $ExpectedExecutableName })
        if ($found.Count -lt 1) {
            throw "Archive '$ArchivePath' does not contain expected executable '$ExpectedExecutableName'."
        }
        if ($found.Count -ne 1) {
            throw "Archive '$ArchivePath' contains multiple expected executables named '$ExpectedExecutableName'."
        }
        $executable = $found[0]
        Assert-PathWithinRoot -Path $executable.FullName -Root $DestinationPath
        return $executable.FullName
    } catch {
        Remove-Item -LiteralPath $DestinationPath -Recurse -Force -ErrorAction SilentlyContinue
        throw
    }
}

# ----------------------------------------------------------------------------------
# Executable version verification
# ----------------------------------------------------------------------------------

function Assert-ToolVersion {
    <#
    .SYNOPSIS
    Runs the pinned executable's version command and fails closed when the exit
    code is non-zero or the output does not match the committed version pattern.
    #>
    param(
        [Parameter(Mandatory)][string]$ExecutablePath,
        [Parameter(Mandatory)][string[]]$VersionArguments,
        [Parameter(Mandatory)][string]$VersionPattern
    )
    if (-not (Test-Path -LiteralPath $ExecutablePath -PathType Leaf)) {
        throw "Executable not found: $ExecutablePath"
    }
    $output = (& $ExecutablePath @VersionArguments 2>&1 | Out-String)
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "Executable '$ExecutablePath' exited with code $exitCode during version check."
    }
    if ($output -notmatch $VersionPattern) {
        throw "Executable '$ExecutablePath' version output does not match expected pattern '$VersionPattern'."
    }
}

# ----------------------------------------------------------------------------------
# Verified download cache
# ----------------------------------------------------------------------------------

function Assert-SafeTempPath {
    param(
        [Parameter(Mandatory)][string]$Path
    )
    $full = [System.IO.Path]::GetFullPath($Path)
    $temp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if (-not $full.StartsWith($temp, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove path outside OS temp: '$full'."
    }
    if ($full -notmatch 'auction-promax') {
        throw "Refusing to remove non-auction-promax temp path: '$full'."
    }
}

function Assert-SafeCachePath {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$ToolsRoot
    )
    $full = [System.IO.Path]::GetFullPath($Path)
    $root = [System.IO.Path]::GetFullPath($ToolsRoot)
    if (-not $full.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to delete cache path outside tools root: '$full'."
    }
    $relative = $full.Substring($root.Length).Trim('\', '/')
    $segments = @($relative -split '[\\/]' | Where-Object { $_ -ne '' })
    if ($segments.Count -ne 3 -or
        $segments[0] -notmatch '^[a-z0-9-]+$' -or
        $segments[1] -notmatch '^[0-9]+\.[0-9]+\.[0-9]+$' -or
        $segments[2] -notmatch '^[a-z0-9-]+$') {
        throw "Refusing to delete unexpected cache path '$full'."
    }
}

function Get-VerifiedExecutableSha256FromAsset {
    param(
        [Parameter(Mandatory)]$Definition,
        [Parameter(Mandatory)][string]$AssetPath
    )
    Assert-ExpectedSha256 -Path $AssetPath -ExpectedSha256 $Definition.Sha256
    if ($Definition.ArchiveType -eq 'binary') {
        return Get-FileSha256 -Path $AssetPath
    }

    $workDir = Join-Path ([System.IO.Path]::GetTempPath()) ("auction-promax-cache-verify-" + [guid]::NewGuid().ToString('N'))
    try {
        $executablePath = Expand-VerifiedToolArchive -ArchivePath $AssetPath -ArchiveType $Definition.ArchiveType -DestinationPath $workDir -ExpectedExecutableName $Definition.ExecutableName
        return Get-FileSha256 -Path $executablePath
    } finally {
        if (Test-Path -LiteralPath $workDir) {
            Assert-SafeTempPath -Path $workDir
            Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

function Test-TrivyProvenance {
    param(
        [Parameter(Mandatory)][string]$CosignPath,
        [Parameter(Mandatory)][string]$AssetPath,
        [Parameter(Mandatory)][string]$BundlePath,
        [Parameter(Mandatory)][string]$CertificateOidcIssuer,
        [Parameter(Mandatory)][string]$CertificateIdentity,
        [bool]$RefreshTrustedRoot = $true,
        [ValidateRange(1, 3)][int]$InitializeAttempts = 3
    )
    foreach ($requiredFile in @($CosignPath, $AssetPath, $BundlePath)) {
        if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
            throw 'Trivy provenance verification input was not found.'
        }
    }
    # Cosign stores TUF material below USERPROFILE on Windows and HOME elsewhere.
    # Redirect only the child-process home to ignored repository tooling storage.
    # Production checks refresh the root; deterministic cached-tool tests may
    # verify against an already materialized trusted root without network I/O.
    $sigstoreHome = Join-Path $script:DefaultToolsRoot 'sigstore-home'
    $trustedRoot = Join-Path $sigstoreHome '.sigstore\root\tuf-repo-cdn.sigstore.dev\targets\trusted_root.json'
    $runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
    $previousHome = if ($runningOnWindows) { $env:USERPROFILE } else { $env:HOME }
    New-Item -ItemType Directory -Path $sigstoreHome -Force | Out-Null
    if ($runningOnWindows) { $env:USERPROFILE = $sigstoreHome } else { $env:HOME = $sigstoreHome }
    # Windows PowerShell 5.1 wraps native stderr as ErrorRecord objects. Cosign
    # writes its successful "Verified OK" status to stderr, so Stop would turn a
    # genuine exit-code 0 verification into a false failure. Capture and suppress
    # all native output, then make the fail-closed decision from the exit code.
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $nativeOutput = @()
        if ($RefreshTrustedRoot) {
            $initializeExitCode = 1
            foreach ($attempt in 1..$InitializeAttempts) {
                $nativeOutput += @(& $CosignPath initialize 2>&1)
                $initializeExitCode = $LASTEXITCODE
                if ($initializeExitCode -eq 0 -and (Test-Path -LiteralPath $trustedRoot -PathType Leaf)) { break }
                if ($attempt -lt $InitializeAttempts) { Start-Sleep -Seconds @(2, 5)[$attempt - 1] }
            }
            if ($initializeExitCode -ne 0 -or -not (Test-Path -LiteralPath $trustedRoot -PathType Leaf)) {
                throw 'Trivy trusted-root refresh failed.'
            }
        } elseif (-not (Test-Path -LiteralPath $trustedRoot -PathType Leaf)) {
            throw 'Trivy trusted root is unavailable for offline provenance verification.'
        }
        $nativeOutput += @(& $CosignPath verify-blob $AssetPath --bundle $BundlePath --trusted-root $trustedRoot --certificate-oidc-issuer $CertificateOidcIssuer --certificate-identity $CertificateIdentity 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
        if ($runningOnWindows) { $env:USERPROFILE = $previousHome } else { $env:HOME = $previousHome }
    }
    $null = $nativeOutput
    if ($exitCode -ne 0) {
        throw 'Trivy release provenance verification failed.'
    }
    return [pscustomobject]@{
        Passed = $true
        IssuerMatched = $true
        CertificateIdentityMatched = $true
    }
}

function Assert-CachedTool {
    <#
    .SYNOPSIS
    A cache hit is only valid when the committed archive SHA-256, the executable
    version output, and the recorded executable digest all still match.
    #>
    param(
        [Parameter(Mandatory)]$Definition,
        [Parameter(Mandatory)][string]$CacheDir,
        [switch]$SkipVersion
    )
    if (-not (Test-Path -LiteralPath $CacheDir -PathType Container)) {
        throw "Tool cache directory not found: $CacheDir"
    }
    $partialFiles = @(Get-ChildItem -LiteralPath $CacheDir -Force | Where-Object { $_.Name -match '\.partial$' })
    if ($partialFiles.Count -gt 0) {
        throw "Tool cache contains partial download artifact '$($partialFiles[0].Name)'. Explicit reinstall required."
    }
    $assetPath = Join-Path $CacheDir $Definition.AssetName
    if (-not (Test-Path -LiteralPath $assetPath -PathType Leaf)) {
        throw "Cached asset not found: $assetPath. Explicit reinstall required."
    }
    Assert-ExpectedSha256 -Path $assetPath -ExpectedSha256 $Definition.Sha256
    $exePath = Join-Path $CacheDir $Definition.ExecutableName
    if (-not (Test-Path -LiteralPath $exePath -PathType Leaf)) {
        throw "Cached executable not found: $exePath. Explicit reinstall required."
    }
    $expectedExecutableSha256 = Get-VerifiedExecutableSha256FromAsset -Definition $Definition -AssetPath $assetPath
    $actualExecutableSha256 = Get-FileSha256 -Path $exePath
    if (-not [string]::Equals($expectedExecutableSha256, $actualExecutableSha256, [System.StringComparison]::Ordinal)) {
        throw 'Cached executable integrity does not match the committed, verified release asset.'
    }
    if (-not $SkipVersion) {
        Assert-ToolVersion -ExecutablePath $exePath -VersionArguments $Definition.VersionArguments -VersionPattern $Definition.VersionPattern
    }
    return $exePath
}

function Get-VerifiedTool {
    <#
    .SYNOPSIS
    Downloads a pinned asset from its official release URL, verifies the committed
    SHA-256 before anything is extracted or executed, validates archive entries,
    verifies the executable version, and moves everything into the exact cache
    directory. A corrupted cache fails closed and requires explicit reinstall.
    #>
    param(
        [Parameter(Mandatory)][string]$ToolName,
        [Parameter(Mandatory)][string]$Platform,
        [string]$ManifestPath = $script:DefaultManifestPath,
        [string]$ToolsRoot = $script:DefaultToolsRoot,
        [string]$VerifiedCosignPath,
        [switch]$VerifyOnly,
        [switch]$ForceReinstall
    )
    $def = Get-ExpectedToolDefinition -ToolName $ToolName -Platform $Platform -ManifestPath $ManifestPath
    $cacheDir = Get-ToolCacheDirectory -ToolsRoot $ToolsRoot -ToolName $def.Name -Version $def.Version -Platform $Platform
    if ($VerifyOnly) {
        $cachedExecutable = Assert-CachedTool -Definition $def -CacheDir $cacheDir -SkipVersion:($def.Name -eq 'trivy')
        if ($def.Name -eq 'trivy') {
            if ([string]::IsNullOrWhiteSpace($VerifiedCosignPath)) {
                throw 'Trivy provenance verification is required before execution.'
            }
            $bundlePath = Join-Path $cacheDir ($def.AssetName + $def.BundleAssetSuffix)
            $null = Test-TrivyProvenance -CosignPath $VerifiedCosignPath -AssetPath (Join-Path $cacheDir $def.AssetName) -BundlePath $bundlePath -CertificateOidcIssuer $def.CertificateOidcIssuer -CertificateIdentity $def.CertificateIdentity
            Assert-ToolVersion -ExecutablePath $cachedExecutable -VersionArguments $def.VersionArguments -VersionPattern $def.VersionPattern
        }
        return $cachedExecutable
    }
    if (Test-Path -LiteralPath $cacheDir) {
        if ($ForceReinstall) {
            Assert-SafeCachePath -Path $cacheDir -ToolsRoot $ToolsRoot
            Remove-Item -LiteralPath $cacheDir -Recurse -Force
        } else {
            try {
                $cachedExecutable = Assert-CachedTool -Definition $def -CacheDir $cacheDir -SkipVersion:($def.Name -eq 'trivy')
                if ($def.Name -eq 'trivy') {
                    if ([string]::IsNullOrWhiteSpace($VerifiedCosignPath)) {
                        throw 'Trivy provenance verification is required before execution.'
                    }
                    $bundlePath = Join-Path $cacheDir ($def.AssetName + $def.BundleAssetSuffix)
                    $null = Test-TrivyProvenance -CosignPath $VerifiedCosignPath -AssetPath (Join-Path $cacheDir $def.AssetName) -BundlePath $bundlePath -CertificateOidcIssuer $def.CertificateOidcIssuer -CertificateIdentity $def.CertificateIdentity
                    Assert-ToolVersion -ExecutablePath $cachedExecutable -VersionArguments $def.VersionArguments -VersionPattern $def.VersionPattern
                }
                return $cachedExecutable
            } catch {
                throw "Cached tool '$($def.Name)' failed integrity checks: $($_.Exception.Message) Explicit reinstall required (-ForceReinstall)."
            }
        }
    }
    $workDir = Join-Path ([System.IO.Path]::GetTempPath()) ("auction-promax-tool-install-" + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $workDir -Force | Out-Null
    try {
        $downloadPath = Join-Path $workDir ($def.AssetName + '.partial')
        $finalPath = Join-Path $workDir $def.AssetName
        Invoke-WebRequest -Uri $def.ReleaseUrl -OutFile $downloadPath
        if ((Get-Item -LiteralPath $downloadPath).Length -le 0) {
            throw "Downloaded asset is empty: $($def.AssetName)"
        }
        # Fail-closed checksum verification happens BEFORE anything is extracted or executed.
        Assert-ExpectedSha256 -Path $downloadPath -ExpectedSha256 $def.Sha256
        Move-Item -LiteralPath $downloadPath -Destination $finalPath -Force
        $bundlePath = $null
        if ($def.BundleAssetSuffix) {
            if ([string]::IsNullOrWhiteSpace($VerifiedCosignPath)) {
                throw 'Trivy provenance verification is required before execution.'
            }
            $bundleName = $def.AssetName + $def.BundleAssetSuffix
            $bundlePath = Join-Path $workDir $bundleName
            Invoke-WebRequest -Uri ($def.OfficialReleaseBaseUrl.TrimEnd('/') + '/' + $bundleName) -OutFile $bundlePath
            if ((Get-Item -LiteralPath $bundlePath).Length -le 0) {
                throw "Downloaded Sigstore bundle is empty: $bundleName"
            }
            $null = Test-TrivyProvenance -CosignPath $VerifiedCosignPath -AssetPath $finalPath -BundlePath $bundlePath -CertificateOidcIssuer $def.CertificateOidcIssuer -CertificateIdentity $def.CertificateIdentity
        }
        $exePath = $null
        if ($def.ArchiveType -eq 'binary') {
            $exePath = Join-Path $workDir $def.ExecutableName
            Copy-Item -LiteralPath $finalPath -Destination $exePath
        } else {
            $extractDir = Join-Path $workDir 'extract'
            $exePath = Expand-VerifiedToolArchive -ArchivePath $finalPath -ArchiveType $def.ArchiveType -DestinationPath $extractDir -ExpectedExecutableName $def.ExecutableName
        }
        Set-ToolExecutablePermission -Path $exePath
        Assert-ToolVersion -ExecutablePath $exePath -VersionArguments $def.VersionArguments -VersionPattern $def.VersionPattern
        New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
        Move-Item -LiteralPath $finalPath -Destination (Join-Path $cacheDir $def.AssetName) -Force
        Move-Item -LiteralPath $exePath -Destination (Join-Path $cacheDir $def.ExecutableName) -Force
        if ($bundlePath) {
            Move-Item -LiteralPath $bundlePath -Destination (Join-Path $cacheDir (Split-Path -Leaf $bundlePath)) -Force
        }
        $metadata = [pscustomobject]@{
            tool = $def.Name
            version = $def.Version
            platform = $def.Platform
            assetName = $def.AssetName
            assetSha256 = $def.Sha256
            executableName = $def.ExecutableName
            executableSha256 = (Get-FileSha256 -Path (Join-Path $cacheDir $def.ExecutableName))
            installedAtUtc = [System.DateTime]::UtcNow.ToString('o')
        }
        $metadata | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $cacheDir 'cache-metadata.json') -Encoding ascii -NoNewline
        return Assert-CachedTool -Definition $def -CacheDir $cacheDir
    } finally {
        if (Test-Path -LiteralPath $workDir) {
            Assert-SafeTempPath -Path $workDir
            Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Export-ModuleMember -Function @(
    'Read-ToolManifest',
    'Test-ToolManifest',
    'Test-ToolDefinition',
    'Test-PlatformEntry',
    'Test-SigstoreDefinition',
    'Resolve-SupportedPlatform',
    'Get-ToolCacheDirectory',
    'Get-TarCommand',
    'Set-ToolExecutablePermission',
    'Get-ExpectedToolDefinition',
    'Get-FileSha256',
    'Assert-ExpectedSha256',
    'Assert-SafeArchiveEntries',
    'Assert-PathWithinRoot',
    'Expand-VerifiedToolArchive',
    'Assert-ToolVersion',
    'Assert-SafeTempPath',
    'Assert-SafeCachePath',
    'Get-VerifiedExecutableSha256FromAsset',
    'Test-TrivyProvenance',
    'Assert-CachedTool',
    'Get-VerifiedTool'
)
````


### api/scripts/supply-chain/Test-ContainerBaseImageResolution.ps1

Original-byte SHA256: b6ebce392307381f5b47578733788ea11b5e0c85b604a03bd736470cd34fee7b

````powershell
#Requires -Version 5.1
[CmdletBinding()]
param([Alias('SelfTest')][switch]$ContractTest, [string[]]$ContractTestCase)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$manifestPath = Join-Path $repoRoot 'security\tooling\container-base-images.json'
$schemaTestPath = Join-Path $PSScriptRoot 'Test-ContainerBaseImageTrust.mjs'

function Invoke-ContainerBaseImageResolutionContractTest {
    $temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-container-base-image-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $temporaryDirectory -Force | Out-Null
    try {
        @'
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$DockerArguments)
$scenario = $env:APX_CONTAINER_BASE_IMAGE_SCENARIO
$joined = $DockerArguments -join ' '
$index = 'sha256:9d84285ae8bf9d4251bbdf4881a598240bd6908817096b64de246ce022ec7d86'
$manifest = 'sha256:82eb6e99cb91fb87f5a65a933750ae5bb23cab4ab396e4bba4a5b0b07dcd32ff'
$source = 'https://github.com/corretto/corretto-docker.git#a2028380492e3f5128dca6b06c1e26b10e9b8f04:21/headless/al2023'
if ($joined -match '^buildx imagetools inspect --format') {
  if ($scenario -eq 'wrong-index') { 'sha256:' + ('a' * 64) } else { $index }; exit 0
}
if ($joined -match '^buildx imagetools inspect --raw') {
  if ($scenario -eq 'malformed-index') { '{'; exit 0 }
  $items = @(@{ digest = $manifest; mediaType = 'application/vnd.oci.image.manifest.v1+json'; platform = @{ os = 'linux'; architecture = 'amd64' }; annotations = @{ 'org.opencontainers.image.source' = $source } })
  if ($scenario -eq 'zero-platform') { $items = @() }
  if ($scenario -eq 'two-platform') { $items += $items[0] }
  if ($scenario -eq 'wrong-platform-digest') { $items[0].digest = 'sha256:' + ('b' * 64) }
  if ($scenario -eq 'wrong-media-type') { $items[0].mediaType = 'application/vnd.docker.distribution.manifest.v2+json' }
  if ($scenario -eq 'wrong-source') { $items[0].annotations.'org.opencontainers.image.source' = 'https://example.invalid/source' }
  @{ schemaVersion = 2; mediaType = 'application/vnd.oci.image.index.v1+json'; manifests = $items } | ConvertTo-Json -Depth 8 -Compress; exit 0
}
if ($joined -match '^pull ') { if ($scenario -eq 'pull-failure') { exit 1 }; exit 0 }
if ($joined -match '^image inspect ') {
  if ($scenario -eq 'pull-failure') { exit 1 }
  if ($scenario -eq 'malformed-local-inspect') { '{'; exit 0 }
  $repoDigest = "amazoncorretto@$manifest"
  if ($scenario -eq 'descriptor-absent-valid-repo-digest') { @{ Os = 'linux'; Architecture = 'amd64'; RepoDigests = @($repoDigest) } | ConvertTo-Json -Compress; exit 0 }
  if ($scenario -eq 'missing-repo-digests') { @{ Os = 'linux'; Architecture = 'amd64'; Descriptor = @{ digest = $manifest } } | ConvertTo-Json -Compress; exit 0 }
  if ($scenario -eq 'empty-repo-digests') { @{ Os = 'linux'; Architecture = 'amd64'; RepoDigests = @(); Descriptor = @{ digest = $manifest } } | ConvertTo-Json -Compress; exit 0 }
  if ($scenario -eq 'wrong-repo-digest') { @{ Os = 'linux'; Architecture = 'amd64'; RepoDigests = @('amazoncorretto@sha256:' + ('d' * 64)); Descriptor = @{ digest = $manifest } } | ConvertTo-Json -Compress; exit 0 }
  if ($scenario -eq 'wrong-local-os') { @{ Os = 'windows'; Architecture = 'amd64'; RepoDigests = @($repoDigest); Descriptor = @{ digest = $manifest } } | ConvertTo-Json -Compress; exit 0 }
  if ($scenario -eq 'wrong-local-architecture') { @{ Os = 'linux'; Architecture = 'arm64'; RepoDigests = @($repoDigest); Descriptor = @{ digest = $manifest } } | ConvertTo-Json -Compress; exit 0 }
  $descriptorDigest = if ($scenario -eq 'descriptor-digest-mismatch') { 'sha256:' + ('c' * 64) } else { $manifest }
  @{ Os = 'linux'; Architecture = 'amd64'; RepoDigests = @($repoDigest); Descriptor = @{ digest = $descriptorDigest } } | ConvertTo-Json -Compress; exit 0
}
exit 1
'@ | Set-Content -LiteralPath (Join-Path $temporaryDirectory 'fake-docker.ps1') -NoNewline
        "@echo off`r`npowershell.exe -NoProfile -ExecutionPolicy Bypass -File `"%~dp0fake-docker.ps1`" %*`r`nexit /b %ERRORLEVEL%`r`n" | Set-Content -LiteralPath (Join-Path $temporaryDirectory 'docker.cmd') -NoNewline

        $cases = @(
            @{ Name = 'Canonical base image resolution accepted'; Scenario = 'canonical'; Pass = $true },
            @{ Name = 'Upstream index drift classified as REVIEW_REQUIRED'; Scenario = 'wrong-index'; Review = $true },
            @{ Name = 'Malformed upstream index classified as REVIEW_REQUIRED'; Scenario = 'malformed-index'; Review = $true },
            @{ Name = 'Upstream platform ambiguity classified as REVIEW_REQUIRED'; Scenario = 'zero-platform'; Review = $true },
            @{ Name = 'Multiple upstream platform manifests classified as REVIEW_REQUIRED'; Scenario = 'two-platform'; Review = $true },
            @{ Name = 'Upstream platform digest drift classified as REVIEW_REQUIRED'; Scenario = 'wrong-platform-digest'; Review = $true },
            @{ Name = 'Upstream media type drift classified as REVIEW_REQUIRED'; Scenario = 'wrong-media-type'; Review = $true },
            @{ Name = 'Upstream source drift classified as REVIEW_REQUIRED'; Scenario = 'wrong-source'; Review = $true },
            @{ Name = 'Approved digest pull failure rejected'; Scenario = 'pull-failure'; Code = 'CONTAINER_BASE_IMAGE_PULL_FAILED' },
            @{ Name = 'Malformed local inspect rejected'; Scenario = 'malformed-local-inspect'; Code = 'CONTAINER_BASE_IMAGE_LOCAL_INSPECTION_MALFORMED' },
            @{ Name = 'Descriptor absent with matching RepoDigests accepted'; Scenario = 'descriptor-absent-valid-repo-digest'; Pass = $true },
            @{ Name = 'Missing RepoDigests rejected'; Scenario = 'missing-repo-digests'; Code = 'CONTAINER_BASE_IMAGE_LOCAL_INSPECT_INVALID' },
            @{ Name = 'Empty RepoDigests rejected'; Scenario = 'empty-repo-digests'; Code = 'CONTAINER_BASE_IMAGE_LOCAL_DIGEST_MISMATCH' },
            @{ Name = 'Wrong RepoDigests manifest rejected'; Scenario = 'wrong-repo-digest'; Code = 'CONTAINER_BASE_IMAGE_LOCAL_DIGEST_MISMATCH' },
            @{ Name = 'Wrong local OS rejected'; Scenario = 'wrong-local-os'; Code = 'CONTAINER_BASE_IMAGE_LOCAL_PLATFORM_MISMATCH' },
            @{ Name = 'Wrong local architecture rejected'; Scenario = 'wrong-local-architecture'; Code = 'CONTAINER_BASE_IMAGE_LOCAL_PLATFORM_MISMATCH' },
            @{ Name = 'Descriptor manifest mismatch rejected'; Scenario = 'descriptor-digest-mismatch'; Code = 'CONTAINER_BASE_IMAGE_LOCAL_DIGEST_MISMATCH' }
        )
        if ($null -ne $ContractTestCase -and $ContractTestCase.Count -gt 0) {
            $selectedCases = @($ContractTestCase | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
            $cases = @($cases | Where-Object { $_.Scenario -in $selectedCases })
            if ($cases.Count -eq 0) { throw 'CONTAINER_BASE_IMAGE_ADAPTER_CASE_UNKNOWN' }
        }
        foreach ($case in $cases) {
            $previousPath = $env:PATH; $previousScenario = $env:APX_CONTAINER_BASE_IMAGE_SCENARIO
            try {
                $env:PATH = "$temporaryDirectory;$previousPath"; $env:APX_CONTAINER_BASE_IMAGE_SCENARIO = $case.Scenario
                try {
                    $output = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath 2>&1)
                    $childExitCode = $LASTEXITCODE
                } catch {
                    $output = @($_.Exception.Message)
                    $childExitCode = if ($LASTEXITCODE -eq 0) { 1 } else { $LASTEXITCODE }
                }
                $text = $output -join "`n"
                if ($case.ContainsKey('Pass') -and $case.Pass) {
                    if ($childExitCode -ne 0 -or $text -notmatch 'Container base image integrity gate: PASS' -or $text -match 'CONTAINER_BASE_IMAGE_UPSTREAM_REVIEW_REQUIRED') { throw "CONTAINER_BASE_IMAGE_ADAPTER_CASE_FAILED" }
                } elseif ($case.ContainsKey('Review') -and $case.Review) {
                    if ($childExitCode -ne 0 -or $text -notmatch 'CONTAINER_BASE_IMAGE_UPSTREAM_REVIEW_REQUIRED') { throw "CONTAINER_BASE_IMAGE_ADAPTER_CASE_FAILED" }
                } elseif ($childExitCode -eq 0 -or ($text -notmatch [regex]::Escape($case.Code)) -or ($case.ContainsKey('Diagnostic') -and $text -notmatch [regex]::Escape($case.Diagnostic))) { throw "CONTAINER_BASE_IMAGE_ADAPTER_CASE_FAILED" }
                Write-Output "[PASS] $($case.Name)"
            } finally { $env:PATH = $previousPath; $env:APX_CONTAINER_BASE_IMAGE_SCENARIO = $previousScenario }
        }
        Write-Output 'Container base image resolution adapter tests: PASS'
    } finally { Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force -ErrorAction SilentlyContinue }
}

if ($ContractTest) { Invoke-ContainerBaseImageResolutionContractTest; exit 0 }

function Throw-ContainerBaseImageFailure {
    param([Parameter(Mandatory)][string]$Code)
    throw $Code
}

function Invoke-DockerRequired {
    param([Parameter(Mandatory)][string[]]$Arguments, [Parameter(Mandatory)][string]$FailureCode)

    # The contract adapter supplies a fake `docker.cmd`. Production must use the
    # native Windows client when running under Windows, while hosted Linux keeps
    # the standard `docker` command.
    $dockerCommand = if (-not [string]::IsNullOrWhiteSpace($env:APX_CONTAINER_BASE_IMAGE_SCENARIO)) {
        'docker'
    } elseif ($env:OS -eq 'Windows_NT') {
        'docker.exe'
    } else {
        'docker'
    }
    $output = @(& $dockerCommand @Arguments 2>&1)
    if ($LASTEXITCODE -ne 0) {
        Throw-ContainerBaseImageFailure -Code $FailureCode
    }
    return ($output -join [Environment]::NewLine)
}

$resolutionPhase = 'initialize'
try {
    $resolutionPhase = 'load-contract'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf) -or -not (Test-Path -LiteralPath $schemaTestPath -PathType Leaf)) {
    Throw-ContainerBaseImageFailure -Code 'CONTAINER_BASE_IMAGE_CONTRACT_MISSING'
}

$resolutionPhase = 'validate-offline-contract'
& node $schemaTestPath
if ($LASTEXITCODE -ne 0) {
    Throw-ContainerBaseImageFailure -Code 'CONTAINER_BASE_IMAGE_CONTRACT_INVALID'
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json -ErrorAction Stop
$image = @($manifest.images)[0]
$tagReference = "$($image.repository):$($image.reviewedTag)"
$digestReference = "$($image.repository)@$($image.platformManifestDigest)"

$upstreamReviewRequired = @()
try {
    $resolutionPhase = 'resolve-index-digest'
    $resolvedIndexDigest = (Invoke-DockerRequired -Arguments @('buildx', 'imagetools', 'inspect', '--format', '{{.Manifest.Digest}}', $tagReference) -FailureCode 'CONTAINER_BASE_IMAGE_INDEX_INSPECTION_FAILED').Trim()
    if ($resolvedIndexDigest -cne $image.indexDigest) { $upstreamReviewRequired += 'INDEX_DIGEST_DRIFT' }
    $resolutionPhase = 'resolve-index-json'
    $indexRaw = Invoke-DockerRequired -Arguments @('buildx', 'imagetools', 'inspect', '--raw', $tagReference) -FailureCode 'CONTAINER_BASE_IMAGE_INDEX_INSPECTION_FAILED'
    $index = $indexRaw | ConvertFrom-Json -ErrorAction Stop
    $resolutionPhase = 'select-amd64'
    $matches = @($index.manifests | Where-Object { $_.platform.os -ceq $image.platform.os -and $_.platform.architecture -ceq $image.platform.architecture })
    $resolutionPhase = 'validate-platform-digest'
    if ($index.schemaVersion -ne 2 -or $index.mediaType -notin @('application/vnd.oci.image.index.v1+json', 'application/vnd.docker.distribution.manifest.list.v2+json') -or $matches.Count -ne 1) { $upstreamReviewRequired += 'INDEX_SHAPE_OR_PLATFORM_AMBIGUITY' }
    elseif ($matches[0].digest -cne $image.platformManifestDigest -or $matches[0].mediaType -cne $image.manifestMediaType) { $upstreamReviewRequired += 'PLATFORM_MANIFEST_DRIFT' }
    else {
        $resolutionPhase = 'validate-source'
        if ($matches[0].annotations.'org.opencontainers.image.source' -cne $image.officialSource) { $upstreamReviewRequired += 'SOURCE_DRIFT' }
    }
} catch { $upstreamReviewRequired += 'INDEX_UNAVAILABLE_OR_MALFORMED' }

$resolutionPhase = 'pull-platform-image'
Invoke-DockerRequired -Arguments @('pull', '--platform', "$($image.platform.os)/$($image.platform.architecture)", $digestReference) -FailureCode 'CONTAINER_BASE_IMAGE_PULL_FAILED' | Out-Null
$resolutionPhase = 'inspect-local-image'
$inspectRaw = Invoke-DockerRequired -Arguments @('image', 'inspect', $digestReference) -FailureCode 'CONTAINER_BASE_IMAGE_LOCAL_INSPECTION_FAILED'
try {
    $localImage = @($inspectRaw | ConvertFrom-Json -ErrorAction Stop)[0]
} catch {
    Throw-ContainerBaseImageFailure -Code 'CONTAINER_BASE_IMAGE_LOCAL_INSPECTION_MALFORMED'
}
$resolutionPhase = 'validate-local-platform'
$osProperty = $localImage.PSObject.Properties['Os']
$architectureProperty = $localImage.PSObject.Properties['Architecture']
$repoDigestsProperty = $localImage.PSObject.Properties['RepoDigests']
if ($null -eq $osProperty -or $null -eq $architectureProperty -or $null -eq $repoDigestsProperty) {
    Throw-ContainerBaseImageFailure -Code 'CONTAINER_BASE_IMAGE_LOCAL_INSPECT_INVALID'
}
if ([string]$osProperty.Value -cne [string]$image.platform.os -or [string]$architectureProperty.Value -cne [string]$image.platform.architecture) {
    Throw-ContainerBaseImageFailure -Code 'CONTAINER_BASE_IMAGE_LOCAL_PLATFORM_MISMATCH'
}

$expectedManifestDigest = [string]$image.platformManifestDigest
$repoDigests = @($repoDigestsProperty.Value | Where-Object { $null -ne $_ -and -not [string]::IsNullOrWhiteSpace([string]$_) })
$matchingRepoDigests = @($repoDigests | Where-Object {
    $value = [string]$_
    $value -match '@(?<digest>sha256:[a-f0-9]{64})$' -and $Matches['digest'] -ceq $expectedManifestDigest
})
if ($matchingRepoDigests.Count -lt 1) {
    Throw-ContainerBaseImageFailure -Code 'CONTAINER_BASE_IMAGE_LOCAL_DIGEST_MISMATCH'
}

$descriptorProperty = $localImage.PSObject.Properties['Descriptor']
if ($null -ne $descriptorProperty -and $null -ne $descriptorProperty.Value) {
    $descriptorDigestProperty = $descriptorProperty.Value.PSObject.Properties['digest']
    if ($null -ne $descriptorDigestProperty -and -not [string]::IsNullOrWhiteSpace([string]$descriptorDigestProperty.Value) -and [string]$descriptorDigestProperty.Value -cne $expectedManifestDigest) {
        Throw-ContainerBaseImageFailure -Code 'CONTAINER_BASE_IMAGE_LOCAL_DIGEST_MISMATCH'
    }
}

if ($upstreamReviewRequired.Count -gt 0) { Write-Output ('[REVIEW_REQUIRED] CONTAINER_BASE_IMAGE_UPSTREAM_REVIEW_REQUIRED ({0})' -f ($upstreamReviewRequired -join ',')) }
$resolutionPhase = 'complete'
Write-Output ('Container base image integrity gate: PASS (platformDigest={0}, platform={1}/{2})' -f $image.platformManifestDigest, $image.platform.os, $image.platform.architecture)
} catch {
    $message = [string]$_.Exception.Message
    if ($message -match '\bCONTAINER_BASE_IMAGE_[A-Z_]+\b') { throw }
    throw ('CONTAINER_BASE_IMAGE_UNCLASSIFIED_FAILED|phase={0}|exceptionType={1}' -f $resolutionPhase, $_.Exception.GetType().Name)
}
````


### api/scripts/supply-chain/Test-ContainerBaseImageTrust.mjs

Original-byte SHA256: 20df204948e3b8564ee3f543b77c343b64bf5f03c00fa06294a082df72112ae8

````javascript
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const ajvPath = path.join(repoRoot, "contracts/node_modules/ajv/dist/2020.js");
const schemaPath = path.join(repoRoot, "security/schemas/container-base-images.schema.json");
const manifestPath = path.join(repoRoot, "security/tooling/container-base-images.json");
const dockerfilePath = path.join(repoRoot, "services/identity-profile-service/Dockerfile");

if (!fs.existsSync(ajvPath)) {
  throw new Error("Pinned Ajv is missing; run npm ci in api/contracts before Cycle 5 schema tests.");
}

const { default: Ajv2020 } = await import(pathToFileURL(ajvPath).href);

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} is missing.`);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(`${label} is malformed JSON.`);
  }
}

function readText(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} is missing.`);
  return fs.readFileSync(filePath, "utf8");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertResult(validate, name, mutate, expectedValid) {
  const candidate = clone(manifest);
  mutate(candidate);
  const valid = validate(candidate);
  if (valid !== expectedValid) {
    const errors = (validate.errors ?? []).map(({ instancePath, keyword }) => ({ instancePath, keyword }));
    throw new Error(`${name}: expected valid=${expectedValid}, got valid=${valid}; errors=${JSON.stringify(errors)}`);
  }
  process.stdout.write(`[PASS] ${name}\n`);
}

function validateDockerfileBaseImage(dockerfileText, trustManifest = manifest) {
  if (!Array.isArray(trustManifest.images) || trustManifest.images.length !== 1) {
    return false;
  }

  const image = trustManifest.images[0];
  const expectedReference = `${image.repository}:${image.reviewedTag}@${image.platformManifestDigest}`;
  const fromLines = dockerfileText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => /^FROM(?:\s|$)/iu.test(line));

  if (fromLines.length !== 1) return false;

  const match = fromLines[0].match(/^FROM\s+([^\s]+)\s*$/iu);
  return match !== null && match[1] === expectedReference;
}

function assertDockerfileResult(name, mutate, expectedValid) {
  const valid = validateDockerfileBaseImage(mutate(dockerfile));
  if (valid !== expectedValid) {
    throw new Error(`${name}: expected valid=${expectedValid}, got valid=${valid}`);
  }
  process.stdout.write(`[PASS] ${name}\n`);
}

const schema = readJson(schemaPath, "Container base image trust schema");
const manifest = readJson(manifestPath, "Container base image trust manifest");
const dockerfile = readText(dockerfilePath, "Identity service Dockerfile");
const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
if (!ajv.validateSchema(schema)) {
  throw new Error(`Container base image trust schema is invalid: ${JSON.stringify(ajv.errors)}`);
}
const validate = ajv.compile(schema);

assertResult(validate, "Canonical container base image manifest accepted", () => {}, true);
assertResult(validate, "Mutable runtime tag rejected", (value) => { value.images[0].reviewedTag = "21-al2023-headless"; }, false);
assertResult(validate, "Wrong official repository rejected", (value) => { value.images[0].repository = "docker.io/library/eclipse-temurin"; }, false);
assertResult(validate, "Missing index digest rejected", (value) => { delete value.images[0].indexDigest; }, false);
assertResult(validate, "Missing platform manifest digest rejected", (value) => { delete value.images[0].platformManifestDigest; }, false);
assertResult(validate, "Floating index digest rejected", (value) => { value.images[0].indexDigest = "latest"; }, false);
assertResult(validate, "Floating platform manifest digest rejected", (value) => { value.images[0].platformManifestDigest = "latest"; }, false);
assertResult(validate, "Index digest drift rejected", (value) => { value.images[0].indexDigest = "sha256:" + "a".repeat(64); }, false);
assertResult(validate, "Platform manifest digest drift rejected", (value) => { value.images[0].platformManifestDigest = "sha256:" + "b".repeat(64); }, false);
assertResult(validate, "Placeholder checksum rejected", (value) => { value.images[0].indexDigest = "sha256:" + "0".repeat(64); }, false);
assertResult(validate, "Malformed checksum rejected", (value) => { value.images[0].platformManifestDigest = "sha256:abc"; }, false);
assertResult(validate, "Non-amd64 platform rejected", (value) => { value.images[0].platform.architecture = "arm64"; }, false);
assertResult(validate, "Non-Linux platform rejected", (value) => { value.images[0].platform.os = "windows"; }, false);
assertResult(validate, "Non-headless distribution rejected", (value) => { value.images[0].runtime.distribution = "full"; }, false);
assertResult(validate, "Non-AL2023 runtime rejected", (value) => { value.images[0].runtime.operatingSystem = "alpine"; }, false);
assertResult(validate, "Wrong Java major rejected", (value) => { value.images[0].runtime.javaMajor = 17; }, false);
assertResult(validate, "Official source drift rejected", (value) => { value.images[0].officialSource = "https://example.invalid/source"; }, false);
assertResult(validate, "Additional image rejected", (value) => { value.images.push(clone(value.images[0])); }, false);
assertResult(validate, "Unexpected property rejected", (value) => { value.images[0].mutable = true; }, false);

assertDockerfileResult("Canonical Dockerfile base image binding accepted", (value) => value, true);
assertDockerfileResult("Dockerfile mutable tag drift rejected", (value) => value.replace(manifest.images[0].reviewedTag, "21-al2023-headless"), false);
assertDockerfileResult("Dockerfile index digest substitution rejected", (value) => value.replace(manifest.images[0].platformManifestDigest, manifest.images[0].indexDigest), false);
assertDockerfileResult("Dockerfile platform manifest digest drift rejected", (value) => value.replace(manifest.images[0].platformManifestDigest, "sha256:" + "c".repeat(64)), false);
assertDockerfileResult("Dockerfile digest removal rejected", (value) => value.replace(`@${manifest.images[0].platformManifestDigest}`, ""), false);

process.stdout.write("Container base image trust schema and Dockerfile binding tests: PASS\n");
````


### api/scripts/supply-chain/Test-ContainerImageBuildContract.mjs

Original-byte SHA256: 872fc47afde7149956b7b98e8b13ee09f2faf5647e348e3863f63f46e74e9f0f

````javascript
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const scriptPath = path.join(repoRoot, "scripts/supply-chain/Invoke-ContainerImageBuild.ps1");
if (!fs.existsSync(scriptPath)) throw new Error("Container image build orchestrator is missing.");
const source = fs.readFileSync(scriptPath, "utf8");

function assertIncludes(name, expected) {
  if (!source.includes(expected)) throw new Error(`${name}: missing '${expected}'.`);
  process.stdout.write(`[PASS] ${name}\n`);
}

function assertExcludes(name, forbidden) {
  if (source.includes(forbidden)) throw new Error(`${name}: forbidden '${forbidden}' is present.`);
  process.stdout.write(`[PASS] ${name}\n`);
}

assertIncludes("Repository-owned prebuild gate is mandatory", "& $prebuildScriptPath");
assertIncludes("Existing artifact reuse revalidates prebuild", "& $prebuildScriptPath -SkipBuild");
assertIncludes("Verified artifact reuse is explicit", "[switch]$UseExistingVerifiedArtifact");
assertIncludes("Base image resolution is mandatory", "& $baseResolutionScriptPath");
assertIncludes("Buildx target platform is contract-owned", "--platform $contract.image.platform");
assertIncludes("Buildx always refreshes base manifest", "--pull");
assertIncludes("Buildx loads only local image store", "--load");
assertIncludes("Buildx local tag is contract-owned", "--tag $imageReference");
assertIncludes("Buildx Dockerfile path is contract-owned", "--file $dockerfilePath");
assertIncludes("JAR hash is captured before build", "$jarHashBefore");
assertIncludes("JAR mutation fails closed", "CONTAINER_BUILD_JAR_MUTATED_DURING_BUILD");
assertIncludes("Local image identity is inspected", "Get-LocalImageInspection");
assertIncludes("Linux amd64 is asserted after build", "CONTAINER_BUILD_LOCAL_IMAGE_IDENTITY_INVALID");
assertExcludes("Registry push is forbidden", "--push");
assertExcludes("Registry login is forbidden", "docker login");
assertExcludes("Build secrets are forbidden", "--secret");
assertExcludes("Build SSH forwarding is forbidden", "--ssh");
assertExcludes("Build arguments are forbidden", "--build-arg");
assertExcludes("Blind build skip is forbidden", "SkipBuild = $true");

process.stdout.write("Container image build orchestration contract tests: PASS\n");
````


### api/scripts/supply-chain/Test-ContainerImageContract.mjs

Original-byte SHA256: 33007b3a41f9ba36fcae5664d4ff24253bd825b1728ddb600ded82f1b0abdfa2

````javascript
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const ajvPath = path.join(repoRoot, "contracts/node_modules/ajv/dist/2020.js");
const schemaPath = path.join(repoRoot, "security/schemas/container-image-contract.schema.json");
const contractPath = path.join(repoRoot, "security/tooling/container-image-contract.json");

if (!fs.existsSync(ajvPath)) throw new Error("Pinned Ajv is missing; run npm ci in api/contracts before Cycle 5 contract tests.");
const { default: Ajv2020 } = await import(pathToFileURL(ajvPath).href);

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} is missing.`);
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { throw new Error(`${label} is malformed JSON.`); }
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function assertResult(validate, name, mutate, expectedValid) {
  const candidate = clone(contract);
  mutate(candidate);
  const valid = validate(candidate);
  if (valid !== expectedValid) {
    const errors = (validate.errors ?? []).map(({ instancePath, keyword }) => ({ instancePath, keyword }));
    throw new Error(`${name}: expected valid=${expectedValid}, got valid=${valid}; errors=${JSON.stringify(errors)}`);
  }
  process.stdout.write(`[PASS] ${name}\n`);
}

const schema = readJson(schemaPath, "Container image execution schema");
const contract = readJson(contractPath, "Container image execution contract");
const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
if (!ajv.validateSchema(schema)) throw new Error(`Container image execution schema is invalid: ${JSON.stringify(ajv.errors)}`);
const validate = ajv.compile(schema);

assertResult(validate, "Canonical container image contract accepted", () => {}, true);
assertResult(validate, "Mutable local image tag rejected", (value) => { value.image.localReference = "auction-promax/identity-profile-service:latest"; }, false);
assertResult(validate, "Non-amd64 build platform rejected", (value) => { value.image.platform = "linux/arm64"; }, false);
assertResult(validate, "Docker Maven build rejected", (value) => { value.build.mavenBuildLocation = "inside-docker"; }, false);
assertResult(validate, "Docker dependency resolution rejected", (value) => { value.build.dependencyResolution = "allowed-in-docker"; }, false);
assertResult(validate, "Docker credentials rejected", (value) => { value.build.credentials = "allowed-in-docker"; }, false);
assertResult(validate, "Root runtime rejected", (value) => { value.runtime.user = "root"; }, false);
assertResult(validate, "Wrong container port rejected", (value) => { value.runtime.exposedPort = "80/tcp"; }, false);
assertResult(validate, "Shell entrypoint rejected", (value) => { value.runtime.entrypoint = ["sh", "-c", "java -jar /app/app.jar"]; }, false);
assertResult(validate, "Docker healthcheck rejected", (value) => { value.runtime.healthcheck = "required"; }, false);
assertResult(validate, "Production profile smoke rejected", (value) => { value.technicalSmoke.profile = "default"; }, false);
assertResult(validate, "Public smoke binding rejected", (value) => { value.technicalSmoke.loopbackOnly = false; }, false);
assertResult(validate, "Writable root filesystem rejected", (value) => { value.technicalSmoke.readOnlyRootFilesystem = false; }, false);
assertResult(validate, "Capability retention rejected", (value) => { value.technicalSmoke.dropAllCapabilities = false; }, false);
assertResult(validate, "Image source fallback rejected", (value) => { value.scan.arguments = ["--scanners", "vuln", "--format", "json"]; }, false);
assertResult(validate, "Database freshness contract bypass rejected", (value) => { value.scan.databaseContractRelativePath = ""; }, false);
assertResult(validate, "Severity filtering rejected", (value) => { value.scan.arguments.splice(2, 0, "--severity", "HIGH,CRITICAL"); }, false);
assertResult(validate, "Ignore unfixed rejected", (value) => { value.policy.ignoreUnfixed = true; }, false);
assertResult(validate, "Missing Java detection rejected", (value) => { value.scan.requiredDetections = ["os"]; }, false);
assertResult(validate, "Raw report retention rejected", (value) => { value.evidence.rawReports = "committed"; }, false);
assertResult(validate, "Policy bypass rejected", (value) => { value.policy.mustRun = false; }, false);
assertResult(validate, "Unexpected property rejected", (value) => { value.runtime.userName = "application"; }, false);

process.stdout.write("Container image execution contract tests: PASS\n");
````


### api/scripts/supply-chain/Test-ContainerTechnicalSmokeContract.mjs

Original-byte SHA256: fd44ae15f5636d796a84ab92329a5a13c896a26b9740e356cc9730a7c4e3e334

````javascript
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const scriptPath = path.join(repoRoot, "scripts/supply-chain/Invoke-ContainerTechnicalSmoke.ps1");
if (!fs.existsSync(scriptPath)) throw new Error("Container technical smoke runner is missing.");
const source = fs.readFileSync(scriptPath, "utf8");
for (const [name, expected] of [
  ["Contract validation is mandatory", "CONTAINER_SMOKE_CONTRACT_INVALID"],
  ["Image presence is mandatory", "CONTAINER_SMOKE_IMAGE_MISSING"],
  ["Loopback-only publishing is mandatory", "127.0.0.1:$hostPort`:8080"],
  ["Read-only root filesystem is mandatory", "'--read-only'"],
  ["Tmpfs is mandatory", "'--tmpfs'"],
  ["Capability drop is mandatory", "'--cap-drop','ALL'"],
  ["No-new-privileges is mandatory", "'no-new-privileges'"],
  ["PIDs limit is mandatory", "'--pids-limit'"],
  ["Technical profile is mandatory", "SPRING_PROFILES_ACTIVE"],
  ["Readiness timeout fails closed", "CONTAINER_SMOKE_READINESS_TIMEOUT"],
  ["Hardening drift fails closed", "CONTAINER_SMOKE_HARDENING_DRIFT"],
  ["Explicit Docker executable is mandatory", "$script:dockerExe"],
  ["Cleanup is mandatory", "rm --force $name"],
  ["Smoke phases are classified", "$smokePhase = 'startup'"],
  ["Unknown smoke failures are sanitized", "CONTAINER_SMOKE_UNCLASSIFIED_FAILED"],
]) {
  if (!source.includes(expected)) throw new Error(`${name}: missing ${expected}`);
  process.stdout.write(`[PASS] ${name}\n`);
}
process.stdout.write("Container technical smoke contract tests: PASS\n");
````


### api/scripts/supply-chain/Test-ContainerTechnicalSmokeStatus.ps1

Original-byte SHA256: 11191769c9a160ab6b8295b2391629d27c27648d9ce3d2a51698c54c37a03d88

````powershell
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'Invoke-ContainerTechnicalSmoke.ps1'
Import-Module (Join-Path $PSScriptRoot 'HostedSupplyChain.psm1') -Force
$resolverOutput = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath -ResolverContractTest 2>&1)
if ($LASTEXITCODE -ne 0 -or ($resolverOutput -join "`n") -notmatch 'Container smoke Docker resolver contract tests: PASS') { throw 'CONTAINER_SMOKE_DOCKER_RESOLVER_CONTRACT_FAILED' }
$stateContractOutput = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath -StatusContractTest 2>&1)
if ($LASTEXITCODE -ne 0 -or ($stateContractOutput -join "`n") -notmatch 'Container smoke status state contract tests: PASS') { throw 'CONTAINER_SMOKE_STATUS_STATE_CONTRACT_FAILED' }
$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$errors) | Out-Null
if ($errors.Count -ne 0) { throw 'CONTAINER_SMOKE_SCRIPT_PARSE_INVALID' }
$ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$errors)
$protectedAutomaticVariables = @('IsWindows','IsLinux','IsMacOS','IsCoreCLR')
$protectedUsages = @()
foreach ($functionAst in @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $true))) {
    $paramBlock = $functionAst.Body.ParamBlock
    if ($null -eq $paramBlock) { continue }
    foreach ($parameterAst in @($paramBlock.Parameters)) {
        if ($parameterAst.Name.VariablePath.UserPath -in $protectedAutomaticVariables) { $protectedUsages += $parameterAst.Name.VariablePath.UserPath }
    }
}
foreach ($assignmentAst in @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.AssignmentStatementAst] }, $true))) {
    if ($assignmentAst.Left -is [System.Management.Automation.Language.VariableExpressionAst] -and $assignmentAst.Left.VariablePath.UserPath -in $protectedAutomaticVariables) { $protectedUsages += $assignmentAst.Left.VariablePath.UserPath }
}
if ($protectedUsages.Count -ne 0) { throw 'CONTAINER_SMOKE_PROTECTED_AUTOMATIC_VARIABLE_COLLISION' }

$source = Get-Content -LiteralPath $scriptPath -Raw
foreach ($required in @(
    '[string]$StatusPath',
    'function Write-SmokeStatus',
    "-State 'STARTED'",
    "-State 'FAILED'",
    "-State 'PASS'",
    'CONTAINER_SMOKE_UNCLASSIFIED_FAILED'
)) {
    if (-not $source.Contains($required)) { throw 'CONTAINER_SMOKE_STATUS_CONTRACT_MISSING' }
}

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-smoke-status-' + [guid]::NewGuid().ToString('N'))
try {
    [void][System.IO.Directory]::CreateDirectory($temporaryRoot)
    $statusPath = Join-Path $temporaryRoot 'smoke.json'
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $startupOutput = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath -StatusPath $statusPath -StartupEnvelopeContractTest 2>&1)
        $startupExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($startupExitCode -eq 0) { throw 'CONTAINER_SMOKE_STARTUP_ENVELOPE_ACCEPTED_RESOLVER_FAILURE' }
    $startupStatus = Read-HostedSmokeStatus -Path $statusPath
    if ($startupStatus.state -ne 'FAILED' -or $startupStatus.phase -ne 'resolve-docker' -or $startupStatus.failureCode -ne 'CONTAINER_SMOKE_DOCKER_MISSING') { throw 'CONTAINER_SMOKE_STARTUP_ENVELOPE_STATUS_INVALID' }
    [System.IO.File]::WriteAllText($statusPath, '{"schemaVersion":1,"state":"FAILED","phase":"inspect-container","failureCode":"CONTAINER_SMOKE_INSPECTION_FAILED","exceptionType":"RuntimeException"}', [System.Text.UTF8Encoding]::new($false))
    $status = Read-HostedSmokeStatus -Path $statusPath
    if ($status.state -ne 'FAILED' -or $status.phase -ne 'inspect-container' -or $status.failureCode -ne 'CONTAINER_SMOKE_INSPECTION_FAILED') { throw 'CONTAINER_SMOKE_STATUS_READER_INVALID' }
} finally {
    if (Test-Path -LiteralPath $temporaryRoot) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force }
}

Write-Host '[PASS] Container smoke script parses'
Write-Host '[PASS] Container smoke does not bind protected automatic variables'
Write-Host '[PASS] Container smoke Docker resolver is portable'
Write-Host '[PASS] Container smoke status states round-trip'
Write-Host '[PASS] Container smoke status contract is present'
Write-Host '[PASS] Resolver failure is captured by managed startup envelope'
Write-Host '[PASS] Sanitized failed smoke status is accepted'
Write-Host 'Container technical smoke status tests: PASS'
````


### api/scripts/supply-chain/Test-ContainerVulnerabilityScanning.ps1

Original-byte SHA256: cf88dba3d17014f6c172c6e5ea2c504197b648b19df9e378b7a75cacc1142d0a

````powershell
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'Invoke-ContainerVulnerabilityScanning.ps1') -SkipExecution
$scanScriptPath = Join-Path $PSScriptRoot 'Invoke-ContainerVulnerabilityScanning.ps1'
Import-Module (Join-Path $PSScriptRoot 'HostedSupplyChain.psm1') -Force
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('apx-container-scan-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
$results = New-Object System.Collections.Generic.List[string]

function Assert-Fails {
    param([string]$Name,[string]$Code,[scriptblock]$Action)
    try { & $Action; throw 'NO_FAILURE' } catch { if ($_.Exception.Message -notmatch [regex]::Escape($Code)) { throw "$Name expected $Code" } }
    $results.Add($Name)
}
function Write-Fixture { param($Value) $path=Join-Path $testRoot ([guid]::NewGuid().ToString('N')+'.json'); $Value|ConvertTo-Json -Depth 12|Set-Content -LiteralPath $path -Encoding utf8; $path }
function New-Report {
    param([switch]$NoOs,[switch]$NoJava,[string]$Severity='HIGH')
    $result=@()
    if(-not $NoOs){$result+=@{Target='al2023';Class='os-pkgs';Type='amazon';Vulnerabilities=@()}}
    if(-not $NoJava){$result+=@{Target='app.jar';Class='lang-pkgs';Type='jar';Packages=@(@{Identifier=@{PURL='pkg:maven/com.example/demo@1.0.0'}});Vulnerabilities=@(@{VulnerabilityID='CVE-2099-1';PkgName='demo';InstalledVersion='1.0.0';Severity=$Severity;SeveritySource='nvd';Status='affected';DataSource=@{ID='nvd'}})}}
    @{SchemaVersion=2;Results=$result}
}

try {
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $statusContractOutput = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scanScriptPath -StatusContractTest 2>&1)
        $statusContractExit = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($statusContractExit -ne 0 -or ($statusContractOutput -join "`n") -notmatch 'Container scan status state contract tests: PASS') { throw 'CONTAINER_SCAN_STATUS_STATE_CONTRACT_FAILED' }

    $windowsRequests = [System.Collections.Generic.List[string]]::new()
    $windowsResolver = {
        param([string]$Name)
        $null = $windowsRequests.Add($Name)
        [pscustomobject]@{ Definition = 'C:\tools\docker.exe' }
    }.GetNewClosure()
    if ((Resolve-ContainerScanDockerExecutable -RunningOnWindows $true -CommandResolver $windowsResolver) -ne 'C:\tools\docker.exe' -or $windowsRequests.Count -ne 1 -or $windowsRequests[0] -ne 'docker.exe') { throw 'CONTAINER_SCAN_RESOLVER_WINDOWS_INVALID' }

    $linuxRequests = [System.Collections.Generic.List[string]]::new()
    $linuxResolver = {
        param([string]$Name)
        $null = $linuxRequests.Add($Name)
        [pscustomobject]@{ Definition = '/usr/bin/docker' }
    }.GetNewClosure()
    if ((Resolve-ContainerScanDockerExecutable -RunningOnWindows $false -CommandResolver $linuxResolver) -ne '/usr/bin/docker' -or $linuxRequests.Count -ne 1 -or $linuxRequests[0] -ne 'docker') { throw 'CONTAINER_SCAN_RESOLVER_LINUX_INVALID' }

    if ((Resolve-ContainerScanDockerExecutable -RunningOnWindows $false -CommandResolver { param([string]$Name) [pscustomobject]@{ Definition = '/usr/bin/docker' } }) -ne '/usr/bin/docker') { throw 'CONTAINER_SCAN_RESOLVER_DEFINITION_INVALID' }
    Assert-Fails 'Missing selected Docker executable rejected' 'CONTAINER_SCAN_DOCKER_MISSING' { Resolve-ContainerScanDockerExecutable -RunningOnWindows $false -CommandResolver { param([string]$Name) $null } }
    $resolverFixtureRoot = Join-Path $testRoot 'docker-resolver'
    $previousPath = $env:PATH
    try {
        [void][System.IO.Directory]::CreateDirectory($resolverFixtureRoot)
        $runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
        if ($runningOnWindows) {
            $fixtureDocker = Join-Path $resolverFixtureRoot 'docker.exe'
            $commandShell = Get-Command -Name 'cmd.exe' -CommandType Application -ErrorAction Stop | Select-Object -First 1
            Copy-Item -LiteralPath ([string]$commandShell.Definition) -Destination $fixtureDocker -ErrorAction Stop
        } else {
            $fixtureDocker = Join-Path $resolverFixtureRoot 'docker'
            [System.IO.File]::WriteAllText($fixtureDocker, "#!/bin/sh`nexit 0`n", [System.Text.UTF8Encoding]::new($false))
            & chmod '+x' $fixtureDocker
            if ($LASTEXITCODE -ne 0) { throw 'CONTAINER_SCAN_RESOLVER_FIXTURE_EXECUTABLE_INVALID' }
        }
        $env:PATH = $resolverFixtureRoot + [System.IO.Path]::PathSeparator + $previousPath
        $resolvedFixtureDocker = Resolve-ContainerScanDockerExecutable -RunningOnWindows $runningOnWindows
        if ([string]::IsNullOrWhiteSpace($resolvedFixtureDocker) -or -not ([System.IO.Path]::GetFullPath($resolvedFixtureDocker) -ieq [System.IO.Path]::GetFullPath($fixtureDocker))) { throw 'CONTAINER_SCAN_RESOLVER_APPLICATION_INFO_INVALID' }
    } finally {
        $env:PATH = $previousPath
    }
    $results.Add('Portable Docker resolver accepts application Definition')

    Import-Module (Join-Path $PSScriptRoot 'VulnerabilityScanning.psm1') -Force
    $vector=@('--scanners','vuln','--image-src','docker','--platform','linux/amd64','--format','json','--quiet','--exit-code','0','--skip-db-update','--skip-vex-repo-update','--skip-version-check','--timeout','300s')
    Assert-ContainerTrivyVector -Arguments $vector; $results.Add('Exact local-Docker Trivy vector accepted')
    Assert-Fails 'Ignore-unfixed rejected' 'CONTAINER_SCAN_COMMAND_VECTOR_INVALID' { Assert-ContainerTrivyVector -Arguments ($vector + '--ignore-unfixed') }
    Assert-Fails 'Non-Docker source rejected' 'CONTAINER_SCAN_COMMAND_VECTOR_INVALID' { Assert-ContainerTrivyVector -Arguments ($vector -replace 'docker','registry') }
    Assert-Fails 'Wrong image platform rejected' 'CONTAINER_SCAN_IMAGE_PLATFORM_MISMATCH' { Assert-ContainerImageIdentity -Image ([pscustomobject]@{Os='linux';Architecture='arm64'}) -ExpectedPlatform 'linux/amd64' }
    $image='auction-promax/identity-profile-service:s001-t07'
    Assert-ContainerReportDetections -ReportPath (Write-Fixture (New-Report)) -ImageReference $image | Out-Null; $results.Add('OS and Java detections accepted')
    Assert-Fails 'Missing OS detection rejected' 'CONTAINER_SCAN_OS_DETECTION_MISSING' { Assert-ContainerReportDetections -ReportPath (Write-Fixture (New-Report -NoOs)) -ImageReference $image }
    Assert-Fails 'Missing Java detection rejected' 'CONTAINER_SCAN_JAVA_DETECTION_MISSING' { Assert-ContainerReportDetections -ReportPath (Write-Fixture (New-Report -NoJava)) -ImageReference $image }
    Assert-Fails 'Missing report rejected' 'CONTAINER_SCAN_REPORT_INVALID' { Assert-ContainerReportDetections -ReportPath (Join-Path $testRoot 'missing.json') -ImageReference $image }
    $fields=@('scanner','findingId','source','targetType','target','package/component','affectedVersion','fixedVersion','severity','severitySource','status','dispositionId')
    $inventory=@([pscustomobject]@{scanner='trivy';findingId='CVE-1';source='nvd';targetType='container-image';target=$image;'package/component'='demo';affectedVersion='1';fixedVersion=$null;severity='HIGH';severitySource='nvd';status='observed';dispositionId=$null})
    Assert-SanitizedContainerInventory -Inventory $inventory -ExpectedFields $fields; $results.Add('Twelve-field inventory accepted')
    Assert-Fails 'Inventory leak rejected' 'CONTAINER_SCAN_SANITIZATION_INVALID' { Assert-SanitizedContainerInventory -Inventory @([pscustomobject]@{scanner='trivy';leak='C:\\Users\\secret'}) -ExpectedFields $fields }
    if(-not (Test-IsPolicyBlockedFailure 'HIGH_OR_CRITICAL_DISPOSITION_REQUIRED') -or (Test-IsPolicyBlockedFailure 'UNKNOWN_SEVERITY_FAIL_CLOSED')) { throw 'POLICY_CLASSIFICATION_INVALID' }; $results.Add('Policy block and evaluator failure remain distinct')
    $results.Add('Container scan status states round-trip')
    foreach($name in $results){Write-Output "[PASS] $name"}
    Write-Output 'Container vulnerability scanning fixture tests: PASS'
} finally { if(Test-Path -LiteralPath $testRoot){Remove-Item -LiteralPath $testRoot -Recurse -Force} }
````


### api/scripts/supply-chain/Test-ControlledGitleaksFixture.ps1

Original-byte SHA256: 6586d479b8ce3bd94d48edb8c1136477fd0bacb3d4ab541ebd7d6a769204c239

````powershell
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Import-Module (Join-Path $PSScriptRoot 'GitleaksScanning.psm1') -Force
$contract = Get-Content -LiteralPath (Join-Path $repoRoot 'security\tooling\gitleaks-scan-contract.json') -Raw | ConvertFrom-Json
$fixtureRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-gitleaks-fixture-' + [Guid]::NewGuid().ToString('N'))
$fixtureRepository = Join-Path $fixtureRoot 'repository'

try {
    New-Item -ItemType Directory -Path $fixtureRepository -Force | Out-Null
    & git -C $fixtureRepository init --quiet
    if ($LASTEXITCODE -ne 0) { throw 'GITLEAKS_FIXTURE_GIT_INIT_FAILED' }
    & git -C $fixtureRepository config user.email 'cycle4-fixture@example.invalid'
    & git -C $fixtureRepository config user.name 'Cycle 4 Fixture'
    if ($LASTEXITCODE -ne 0) { throw 'GITLEAKS_FIXTURE_GIT_CONFIG_FAILED' }

    # The complete synthetic value only exists in this temporary repository and
    # must never be written to terminal output or retained evidence.
    $fixtureValue = 'APX_FIXTURE_SECRET_' + ('A' * 24)
    $fixturePath = Join-Path $fixtureRepository 'fixture.txt'
    Set-Content -LiteralPath $fixturePath -Value $fixtureValue -NoNewline
    & git -C $fixtureRepository add fixture.txt
    & git -C $fixtureRepository commit --quiet -m 'controlled gitleaks fixture'
    if ($LASTEXITCODE -ne 0) { throw 'GITLEAKS_FIXTURE_GIT_COMMIT_FAILED' }

    $gitleaksPath = Get-VerifiedGitleaksExecutable
    $dirRawReport = Join-Path $fixtureRoot 'dir.raw.json'
    $gitRawReport = Join-Path $fixtureRoot 'git.raw.json'
    $dirResult = Invoke-GitleaksScan -GitleaksExecutable $gitleaksPath -ScanDefinition $contract.scans[0] -RepositoryRoot $repoRoot -InputPath '.' -OutputPath $dirRawReport -WorkingDirectory $fixtureRepository
    $gitResult = Invoke-GitleaksScan -GitleaksExecutable $gitleaksPath -ScanDefinition $contract.scans[1] -RepositoryRoot $repoRoot -InputPath $fixtureRepository -OutputPath $gitRawReport
    if ($dirResult.exitCode -ne 3 -or $gitResult.exitCode -ne 3) { throw 'GITLEAKS_FIXTURE_EXIT_MAPPING_INVALID' }

    $dirInventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath $dirRawReport -ScanMode dir -RepositoryRoot $repoRoot -SnapshotRoot $fixtureRepository)
    $gitInventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath $gitRawReport -ScanMode git -RepositoryRoot $repoRoot)
    Assert-ExpectedGitleaksFixtureFinding -ScanResult $dirResult -Inventory $dirInventory -ScanMode 'dir' | Out-Null
    Assert-ExpectedGitleaksFixtureFinding -ScanResult $gitResult -Inventory $gitInventory -ScanMode 'git' | Out-Null

    $capturedArtifacts = @($dirRawReport, $gitRawReport)
    foreach ($artifactPath in $capturedArtifacts) {
        $rawContent = Get-Content -LiteralPath $artifactPath -Raw
        if ($rawContent.Contains($fixtureValue)) { throw 'GITLEAKS_FIXTURE_RAW_VALUE_RETAINED' }
    }
    $sanitizedContent = @($dirInventory + $gitInventory | ConvertTo-Json -Depth 10) -join "`n"
    if ($sanitizedContent.Contains($fixtureValue)) { throw 'GITLEAKS_FIXTURE_RAW_VALUE_RETAINED' }

    $fakeScanner = Join-Path $fixtureRoot 'fake-gitleaks.cmd'
    Set-Content -LiteralPath $fakeScanner -Value '@exit /b 0' -Encoding ascii -NoNewline
    $fakeResult = Invoke-GitleaksScan -GitleaksExecutable $fakeScanner -ScanDefinition $contract.scans[0] -RepositoryRoot $repoRoot -InputPath '.' -OutputPath (Join-Path $fixtureRoot 'fake.raw.json') -WorkingDirectory $fixtureRepository
    $fakeScannerRejected = $false
    try { Assert-ExpectedGitleaksFixtureFinding -ScanResult $fakeResult -Inventory @() -ScanMode 'dir' | Out-Null }
    catch { if ($_.Exception.Message -eq 'GITLEAKS_FIXTURE_NOT_DETECTED') { $fakeScannerRejected = $true } else { throw } }
    if (-not $fakeScannerRejected) { throw 'GITLEAKS_FIXTURE_INTEGRITY_ASSERTION_MISSING' }

    Write-Output 'Controlled Gitleaks fixture: PASS (scanModes=dir,git; ruleId=apx-controlled-secret-fixture)'
} finally {
    if (Test-Path -LiteralPath $fixtureRoot) { Remove-Item -LiteralPath $fixtureRoot -Recurse -Force }
}

if (@(Get-ChildItem -Path ([System.IO.Path]::GetTempPath()) -Directory -Filter 'apx-gitleaks-fixture-*').Count -ne 0) {
    throw 'GITLEAKS_FIXTURE_CLEANUP_FAILED'
}
Write-Output 'Controlled Gitleaks fixture cleanup: PASS'
````


### api/scripts/supply-chain/Test-ControlledVulnerableFixture.ps1

Original-byte SHA256: 70ff34fda80a9c37582962ba4ce5ff6fed1bb3910805b22e865df960baea1a4b

````powershell
#Requires -Version 5.1
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$fixturePath = Join-Path $repoRoot 'security\fixtures\vulnerable-sbom\bom.json'
$expectationPath = Join-Path $repoRoot 'security\fixtures\vulnerable-sbom\fixture-expectation.json'
$cachePath = Join-Path $repoRoot '.tools\supply-chain\trivy-cache'
$metadataPath = Join-Path $cachePath 'db\metadata.json'
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('auction-promax-trivy-fixture-' + [guid]::NewGuid().ToString('N'))

Import-Module (Join-Path $PSScriptRoot 'VulnerabilityScanning.psm1') -Force

try {
    foreach ($path in @($fixturePath, $expectationPath)) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            throw 'TRIVY_FIXTURE_INPUT_MISSING'
        }
    }
    $expectation = Get-Content -LiteralPath $expectationPath -Raw | ConvertFrom-Json
    if ($expectation.scanner -ne 'trivy' -or $expectation.schemaVersion -ne 1) {
        throw 'TRIVY_FIXTURE_EXPECTATION_INVALID'
    }

    Test-TrivyDatabaseFreshness -MetadataPath $metadataPath -NowUtc ([datetime]::UtcNow) -MaxAgeHours 24 -FutureClockSkewSeconds 300 | Out-Null
    New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null
    $reportPath = Join-Path $temporaryRoot 'trivy-fixture-report.json'
    $scanDefinition = [pscustomobject]@{
        command = 'sbom'
        input = 'security/fixtures/vulnerable-sbom/bom.json'
        targetType = 'sbom'
        expectedEcosystem = 'npm'
        arguments = @('--scanners', 'vuln', '--format', 'json', '--quiet', '--exit-code', '0', '--skip-db-update')
    }

    Push-Location $repoRoot
    try {
        $trivyPath = Get-VerifiedTrivyExecutable
        Invoke-TrivyScan -TrivyExecutable $trivyPath -ScanDefinition $scanDefinition -CacheDirectory $cachePath -OutputPath $reportPath | Out-Null
    } finally {
        Pop-Location
    }
    $match = Assert-ExpectedTrivyFixtureFinding -ReportPath $reportPath -ExpectedFindingId $expectation.findingId -ExpectedPackage $expectation.package -ExpectedAffectedVersion $expectation.affectedVersion -ExpectedSource $expectation.source -ExpectedSeverity $expectation.severity -ExpectedFixedVersion $expectation.fixedVersion
    Write-Output ('Controlled Trivy fixture: PASS (findingId={0}, package={1}, affectedVersion={2}, severity={3})' -f $match.findingId, $match.package, $match.affectedVersion, $match.severity)
} finally {
    if (Test-Path -LiteralPath $temporaryRoot) {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
````


### api/scripts/supply-chain/Test-CycloneDxSchemaTrust.mjs

Original-byte SHA256: 90cd9ab7f04a960ee08852ad7e0b8a45a745f532ac8301a956500fc9dea7b625

````javascript
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const nodeModulesRoot = path.join(repoRoot, "contracts/node_modules/ajv/dist");
const ajv2020Path = path.join(nodeModulesRoot, "2020.js");
const ajvDraft07Path = path.join(nodeModulesRoot, "ajv.js");
if (!fs.existsSync(ajv2020Path) || !fs.existsSync(ajvDraft07Path)) {
  throw new Error("Pinned Ajv is missing; run npm ci in api/contracts before Cycle 2 schema trust tests.");
}

const { default: Ajv2020 } = await import(pathToFileURL(ajv2020Path).href);
const { default: Ajv } = await import(pathToFileURL(ajvDraft07Path).href);
const manifestPath = path.join(repoRoot, "security/tooling/cyclonedx-schemas.json");
const manifestSchemaPath = path.join(repoRoot, "security/schemas/cyclonedx-schemas.schema.json");
const schemaRoot = path.join(repoRoot, "security/schemas/cyclonedx/1.6");

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} is missing.`);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(`${label} is malformed JSON.`);
  }
}

function sha256(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertResult(validate, name, mutate, expectedValid) {
  const candidate = clone(manifest);
  mutate(candidate);
  const valid = validate(candidate);
  if (valid !== expectedValid) {
    const errors = (validate.errors ?? []).map(({ instancePath, keyword }) => ({ instancePath, keyword }));
    throw new Error(`${name}: expected valid=${expectedValid}, got valid=${valid}; errors=${JSON.stringify(errors)}`);
  }
  process.stdout.write(`[PASS] ${name}\n`);
}

function assertLocalSchemaResolution(schemas, name, expectedValid = true) {
  const candidateBomSchema = schemas.get("bom-1.6.schema.json");
  const candidateSpdxSchema = schemas.get("spdx.schema.json");
  const candidateJsfSchema = schemas.get("jsf-0.82.schema.json");
  let valid = false;
  try {
    if (!candidateBomSchema || !candidateSpdxSchema || !candidateJsfSchema) throw new Error("local trust set incomplete");
    const sbomAjv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
    sbomAjv.addSchema(candidateSpdxSchema);
    sbomAjv.addSchema(candidateJsfSchema);
    sbomAjv.compile(candidateBomSchema);
    valid = true;
  } catch {
    valid = false;
  }
  if (valid !== expectedValid) throw new Error(`${name}: expected local resolution valid=${expectedValid}, got valid=${valid}.`);
  process.stdout.write(`[PASS] ${name}\n`);
}

const manifestSchema = readJson(manifestSchemaPath, "CycloneDX schema trust manifest schema");
const manifest = readJson(manifestPath, "CycloneDX schema trust manifest");
const contractAjv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
if (!contractAjv.validateSchema(manifestSchema)) {
  throw new Error(`CycloneDX trust manifest schema is invalid: ${JSON.stringify(contractAjv.errors)}`);
}
const validateManifest = contractAjv.compile(manifestSchema);

assertResult(validateManifest, "Canonical CycloneDX schema trust manifest accepted", () => {}, true);
assertResult(validateManifest, "Wrong official source rejected", (value) => { value.officialSchemaBaseUrl = "https://example.invalid/schema"; }, false);
assertResult(validateManifest, "Placeholder checksum rejected", (value) => { value.assets[0].sha256 = "0".repeat(64); }, false);
assertResult(validateManifest, "Wrong root schema checksum rejected", (value) => { value.assets[0].sha256 = "a".repeat(64); }, false);
assertResult(validateManifest, "Schema asset order drift rejected", (value) => { [value.assets[0], value.assets[1]] = [value.assets[1], value.assets[0]]; }, false);
assertResult(validateManifest, "Extra schema asset rejected", (value) => { value.assets.push({ name: "extra.schema.json", sha256: "b".repeat(64) }); }, false);

const localSchemas = new Map();
for (const asset of manifest.assets) {
  const assetPath = path.join(schemaRoot, asset.name);
  const actual = sha256(assetPath);
  if (actual !== asset.sha256) throw new Error(`Vendored schema checksum mismatch: ${asset.name}.`);
  localSchemas.set(asset.name, readJson(assetPath, asset.name));
  process.stdout.write(`[PASS] Vendored schema checksum: ${asset.name}\n`);
}

const bomSchema = localSchemas.get("bom-1.6.schema.json");
if (bomSchema.$schema !== "http://json-schema.org/draft-07/schema#") {
  throw new Error("CycloneDX BOM schema must declare JSON Schema draft-07.");
}
assertLocalSchemaResolution(localSchemas, "Canonical CycloneDX schema trust set");
const missingSpdxSchemas = new Map(localSchemas);
missingSpdxSchemas.delete("spdx.schema.json");
assertLocalSchemaResolution(missingSpdxSchemas, "Missing SPDX schema", false);
const missingJsfSchemas = new Map(localSchemas);
missingJsfSchemas.delete("jsf-0.82.schema.json");
assertLocalSchemaResolution(missingJsfSchemas, "Missing JSF schema", false);
process.stdout.write("[PASS] CycloneDX BOM external references resolve from local trust set\n");
process.stdout.write("CycloneDX schema trust tests: PASS\n");
````


### api/scripts/supply-chain/Test-DockerfilePolicy.mjs

Original-byte SHA256: 4f12d83389dcc690188bc37e2f1d5e5daad551fb30fe38e6e688b715ad02f772

````javascript
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const imageContractPath = path.join(repoRoot, "security/tooling/container-image-contract.json");
const baseManifestPath = path.join(repoRoot, "security/tooling/container-base-images.json");

function fail(code) {
  throw new Error(code);
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) fail(`${label}_MISSING`);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    fail(`${label}_MALFORMED`);
  }
}

function normalizeLines(value) {
  if (value.includes("\\\n") || value.includes("\\\r")) fail("DOCKERFILE_LINE_CONTINUATION_FORBIDDEN");
  return value.replace(/\r\n/g, "\n").split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
}

function parseInstruction(line) {
  const match = /^([A-Z]+)(?:\s+(.+))?$/.exec(line);
  if (!match) fail("DOCKERFILE_INSTRUCTION_SYNTAX_INVALID");
  return { instruction: match[1], argument: match[2] ?? "" };
}

function assertDockerfilePolicy(dockerfile, imageContract, baseImage) {
  const instructions = normalizeLines(dockerfile).map(parseInstruction);
  const expectedKinds = ["FROM", "WORKDIR", "COPY", "USER", "EXPOSE", "ENTRYPOINT"];
  if (instructions.length !== expectedKinds.length || instructions.some((value, index) => value.instruction !== expectedKinds[index])) {
    fail("DOCKERFILE_INSTRUCTION_SET_OR_ORDER_INVALID");
  }

  const expectedFrom = `${baseImage.repository}:${baseImage.reviewedTag}@${baseImage.platformManifestDigest}`;
  if (instructions[0].argument !== expectedFrom) fail("DOCKERFILE_BASE_IMAGE_DRIFT");
  if (!instructions[0].argument.includes("@sha256:")) fail("DOCKERFILE_BASE_IMAGE_UNPINNED");
  if (/\s+AS\s+/i.test(instructions[0].argument)) fail("DOCKERFILE_MULTI_STAGE_FORBIDDEN");

  if (instructions[1].argument !== imageContract.runtime.workingDirectory) fail("DOCKERFILE_WORKDIR_DRIFT");
  const expectedJarFromContext = path.posix.relative(
    imageContract.build.contextRelativePath,
    imageContract.build.canonicalJarRelativePath,
  );
  const expectedCopy = `--chown=${imageContract.runtime.user} ${expectedJarFromContext} ${imageContract.runtime.applicationJarPath}`;
  if (instructions[2].argument !== expectedCopy) fail("DOCKERFILE_COPY_DRIFT");
  if (instructions[3].argument !== imageContract.runtime.user) fail("DOCKERFILE_USER_DRIFT");
  if (instructions[4].argument !== imageContract.runtime.exposedPort.replace("/tcp", "")) fail("DOCKERFILE_EXPOSE_DRIFT");
  let entrypoint;
  try {
    entrypoint = JSON.parse(instructions[5].argument);
  } catch {
    fail("DOCKERFILE_ENTRYPOINT_DRIFT");
  }
  if (!Array.isArray(entrypoint) || JSON.stringify(entrypoint) !== JSON.stringify(imageContract.runtime.entrypoint)) {
    fail("DOCKERFILE_ENTRYPOINT_DRIFT");
  }
}

function assertDockerignorePolicy(dockerignore, imageContract) {
  const lines = dockerignore.replace(/\r\n/g, "\n").split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  const expectedJarFromContext = path.posix.relative(
    imageContract.build.contextRelativePath,
    imageContract.build.canonicalJarRelativePath,
  );
  const expected = ["**", "!Dockerfile", `!${expectedJarFromContext}`];
  if (lines.length !== expected.length || lines.some((line, index) => line !== expected[index])) {
    fail("DOCKERIGNORE_ALLOWLIST_DRIFT");
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertRejected(name, mutate) {
  let dockerfile = canonicalDockerfile;
  let dockerignore = canonicalDockerignore;
  const imageContract = clone(contract);
  const baseImage = clone(base);
  ({ dockerfile, dockerignore } = mutate({ dockerfile, dockerignore, imageContract, baseImage }));
  try {
    assertDockerfilePolicy(dockerfile, imageContract, baseImage);
    assertDockerignorePolicy(dockerignore, imageContract);
  } catch {
    process.stdout.write(`[PASS] ${name}\n`);
    return;
  }
  fail(`${name}_NOT_REJECTED`);
}

const contract = readJson(imageContractPath, "CONTAINER_IMAGE_CONTRACT");
const baseManifest = readJson(baseManifestPath, "CONTAINER_BASE_IMAGE_MANIFEST");
const base = Array.isArray(baseManifest.images) ? baseManifest.images[0] : null;
if (!base) fail("CONTAINER_BASE_IMAGE_MANIFEST_SHAPE_INVALID");

const dockerfilePath = path.join(repoRoot, contract.build.dockerfileRelativePath);
const dockerignorePath = path.join(repoRoot, contract.build.contextRelativePath, ".dockerignore");
if (!fs.existsSync(dockerfilePath)) fail("DOCKERFILE_MISSING");
if (!fs.existsSync(dockerignorePath)) fail("DOCKERIGNORE_MISSING");
const canonicalDockerfile = fs.readFileSync(dockerfilePath, "utf8");
const canonicalDockerignore = fs.readFileSync(dockerignorePath, "utf8");

assertDockerfilePolicy(canonicalDockerfile, contract, base);
assertDockerignorePolicy(canonicalDockerignore, contract);
process.stdout.write("[PASS] Canonical Dockerfile and .dockerignore accepted\n");

assertRejected("Unpinned base image rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace(/@sha256:[a-f0-9]{64}/, ""), dockerignore }));
assertRejected("Wrong base repository rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("docker.io/library/amazoncorretto", "docker.io/library/eclipse-temurin"), dockerignore }));
assertRejected("Wrong platform manifest digest rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace(/sha256:[a-f0-9]{64}/, `sha256:${"a".repeat(64)}`), dockerignore }));
assertRejected("Multi-stage build rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("WORKDIR /app", "FROM docker.io/library/amazoncorretto:21.0.12-al2023-headless@sha256:5cf1cc34a03ac4ae6e41cb84d9fda24bd6200f6e051e984c1131a409f1e2c05c AS build\nWORKDIR /app"), dockerignore }));
assertRejected("Maven command in Dockerfile rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("WORKDIR /app", "WORKDIR /app\nRUN ./mvnw package"), dockerignore }));
assertRejected("Package installation rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("WORKDIR /app", "WORKDIR /app\nRUN dnf install -y curl"), dockerignore }));
assertRejected("Remote ADD rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("WORKDIR /app", "ADD https://example.invalid/file /app/file\nWORKDIR /app"), dockerignore }));
assertRejected("Broad COPY rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace(/COPY .+/, "COPY . /app"), dockerignore }));
assertRejected("Missing COPY ownership rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("COPY --chown=10001:10001", "COPY"), dockerignore }));
assertRejected("Root user rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("USER 10001:10001", "USER root"), dockerignore }));
assertRejected("Docker healthcheck rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("EXPOSE 8080", "HEALTHCHECK CMD true\nEXPOSE 8080"), dockerignore }));
assertRejected("Shell entrypoint rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace('ENTRYPOINT ["java", "-jar", "/app/app.jar"]', "ENTRYPOINT java -jar /app/app.jar"), dockerignore }));
assertRejected("Build credential argument rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("WORKDIR /app", "ARG REGISTRY_PASSWORD\nWORKDIR /app"), dockerignore }));
assertRejected("Expanded Docker context rejected", ({ dockerfile, dockerignore }) => ({ dockerfile, dockerignore: `${dockerignore}\n!pom.xml` }));
assertRejected("Missing canonical JAR allowlist rejected", ({ dockerfile, dockerignore }) => ({ dockerfile, dockerignore: dockerignore.replace("!target/identity-profile-service-0.0.1-SNAPSHOT.jar", "") }));

process.stdout.write("Dockerfile static policy tests: PASS\n");
````


### api/scripts/supply-chain/Test-GitleaksAllowlistSchema.mjs

Original-byte SHA256: ff561f56ea0c769e8dbd76fab58068e5cc338e460f033e2027b09c9be0ad3c61

````javascript
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const ajvPath = path.join(repoRoot, "contracts/node_modules/ajv/dist/2020.js");
const schemaPath = path.join(repoRoot, "security/schemas/gitleaks-allowlist.schema.json");
const registryPath = path.join(repoRoot, "security/gitleaks-allowlist.json");

if (!fs.existsSync(ajvPath)) throw new Error("Pinned Ajv is missing; run npm ci in api/contracts before Cycle 4 registry tests.");
const { default: Ajv2020 } = await import(pathToFileURL(ajvPath).href);

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(label + " is missing.");
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { throw new Error(label + " is malformed JSON."); }
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function validEntry(scanMode = "dir") {
  return {
    id: "GL-FP-001",
    scanMode,
    ruleId: "fixture-rule",
    repositoryRelativePath: "fixtures/example.txt",
    scannerFingerprint: scanMode === "git" ? "a".repeat(40) + ":fixtures/example.txt:fixture-rule:1" : "fixtures/example.txt:fixture-rule:1",
    commitId: scanMode === "git" ? "a".repeat(40) : null,
    status: "false-positive",
    owner: "Repository Owner",
    rationale: "Synthetic schema-only false-positive fixture.",
    remediationReference: "TEST-GL-001",
    approvedBy: "Repository Owner",
    approvedAt: "2026-09-13T00:00:00Z",
    expiresAt: "2026-10-13T00:00:00Z"
  };
}

function assertResult(validate, name, mutate, expectedValid) {
  const candidate = clone(registry);
  mutate(candidate);
  const valid = validate(candidate);
  if (valid !== expectedValid) throw new Error(name + ": expected valid=" + expectedValid + ", got valid=" + valid + "; errors=" + JSON.stringify(validate.errors));
  process.stdout.write("[PASS] " + name + "\n");
}

function assertUniqueExactEntries(entries) {
  const seenIds = new Set();
  const seenMatches = new Set();
  for (const entry of entries) {
    if (seenIds.has(entry.id)) throw new Error("Duplicate Gitleaks false-positive ID: " + entry.id);
    seenIds.add(entry.id);
    const match = [entry.scanMode, entry.ruleId, entry.repositoryRelativePath, entry.scannerFingerprint, entry.commitId ?? ""].join("\u0000");
    if (seenMatches.has(match)) throw new Error("Duplicate Gitleaks exact match tuple.");
    seenMatches.add(match);
  }
}

const schema = readJson(schemaPath, "Gitleaks allowlist schema");
const registry = readJson(registryPath, "Gitleaks allowlist registry");
const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
if (!ajv.validateSchema(schema)) throw new Error("Gitleaks allowlist schema is invalid: " + JSON.stringify(ajv.errors));
const validate = ajv.compile(schema);

assertResult(validate, "Canonical empty false-positive registry accepted", () => {}, true);
assertResult(validate, "Valid exact directory false-positive accepted", (value) => { value.entries.push(validEntry("dir")); }, true);
assertResult(validate, "Valid exact Git false-positive accepted", (value) => { value.entries.push(validEntry("git")); }, true);
assertResult(validate, "Accepted-risk status rejected", (value) => { const entry = validEntry(); entry.status = "accepted-risk"; value.entries.push(entry); }, false);
assertResult(validate, "Absolute path rejected", (value) => { const entry = validEntry(); entry.repositoryRelativePath = "C:/secret.txt"; value.entries.push(entry); }, false);
assertResult(validate, "Traversal path rejected", (value) => { const entry = validEntry(); entry.repositoryRelativePath = "fixtures/../secret.txt"; value.entries.push(entry); }, false);
assertResult(validate, "Directory finding commit rejected", (value) => { const entry = validEntry(); entry.commitId = "a".repeat(40); value.entries.push(entry); }, false);
assertResult(validate, "Git finding missing commit rejected", (value) => { const entry = validEntry("git"); entry.commitId = null; value.entries.push(entry); }, false);
assertResult(validate, "Missing fingerprint rejected", (value) => { const entry = validEntry(); delete entry.scannerFingerprint; value.entries.push(entry); }, false);
assertResult(validate, "Missing approval rejected", (value) => { const entry = validEntry(); delete entry.approvedAt; value.entries.push(entry); }, false);
assertResult(validate, "Wildcard rule ID rejected", (value) => { const entry = validEntry(); entry.ruleId = "*"; value.entries.push(entry); }, false);

assertUniqueExactEntries([validEntry("dir")]);
process.stdout.write("[PASS] Unique exact entry accepted\n");
assertUniqueExactEntries(registry.entries);
process.stdout.write("[PASS] Canonical registry IDs and match tuples are unique\n");
try {
  assertUniqueExactEntries([validEntry("dir"), validEntry("dir")]);
  throw new Error("Duplicate exact entry was accepted.");
} catch (error) {
  if (!String(error.message).includes("Duplicate Gitleaks")) throw error;
  process.stdout.write("[PASS] Duplicate exact entry rejected\n");
}

process.stdout.write("Gitleaks false-positive registry schema tests: PASS\n");
````


### api/scripts/supply-chain/Test-GitleaksConfiguration.mjs

Original-byte SHA256: 521296aea2340954f388c9f23e33de011f01c3a651fef64ee1aab0f3bfda3bcc

````javascript
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const configPath = path.join(repoRoot, "security/tooling/gitleaks.toml");
const ignorePath = path.join(repoRoot, "security/tooling/gitleaks-empty-ignore.txt");

function assert(condition, message) {
  if (!condition) throw new Error(message);
  process.stdout.write("[PASS] " + message + "\n");
}

if (!fs.existsSync(configPath)) throw new Error("Gitleaks configuration is missing.");
if (!fs.existsSync(ignorePath)) throw new Error("Canonical empty Gitleaks ignore file is missing.");

const config = fs.readFileSync(configPath, "utf8");
const ignore = fs.readFileSync(ignorePath, "utf8");

assert(/^title\s*=\s*"Auction Pro Max API Gitleaks configuration"\s*$/m.test(config), "Configuration title is pinned");
assert(/^\[extend\]\s*$/m.test(config) && /^useDefault\s*=\s*true\s*$/m.test(config), "Built-in Gitleaks rules are extended");
assert(/^id\s*=\s*"apx-controlled-secret-fixture"\s*$/m.test(config), "Controlled fixture rule is present");
assert(/^regex\s*=\s*'''APX_FIXTURE_SECRET_\[A-Z0-9_\]\{24,\}'''\s*$/m.test(config), "Controlled fixture regex is constrained");
assert(/^keywords\s*=\s*\["APX_FIXTURE_SECRET_"\]\s*$/m.test(config), "Controlled fixture keyword prefilter is pinned");
assert(!/disabledRules\s*=|\[\[?allowlists?\]?\]/.test(config), "Scanner-side rule disabling and allowlists are absent");
assert(!/APX_FIXTURE_SECRET_[A-Z0-9_]{24,}/.test(config), "Configuration contains no raw fixture value");
assert(ignore.split(/\r?\n/).every((line) => line.trim() === "" || line.trim().startsWith("#")), "Scanner-side ignore file contains comments only");

process.stdout.write("Gitleaks configuration contract tests: PASS\n");
````


### api/scripts/supply-chain/Test-GitleaksScanAdapters.ps1

Original-byte SHA256: 739fb5867771e4654cf585686921560e2a3516a7ec541001c6a99fc2ea3f7291

````powershell
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Import-Module (Join-Path $PSScriptRoot 'GitleaksScanning.psm1') -Force
$contract = Get-Content -LiteralPath (Join-Path $repoRoot 'security\tooling\gitleaks-scan-contract.json') -Raw | ConvertFrom-Json
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-gitleaks-adapter-' + [Guid]::NewGuid().ToString('N'))
$failures = New-Object System.Collections.Generic.List[string]

function Invoke-TestCase {
    param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][scriptblock]$Body)
    try { & $Body; Write-Output "[PASS] $Name" }
    catch { $script:failures.Add("${Name}: $($_.Exception.Message)"); Write-Output "[FAIL] $Name" }
}

function Assert-EqualArray {
    param([string[]]$Actual, [string[]]$Expected, [string]$Message)
    if ($Actual.Count -ne $Expected.Count) { throw "$Message (different argument count)" }
    for ($index = 0; $index -lt $Actual.Count; $index++) {
        if ($Actual[$index] -cne $Expected[$index]) { throw "$Message (index $index)" }
    }
}

function Assert-ThrowsCode {
    param([Parameter(Mandatory)][scriptblock]$Body, [Parameter(Mandatory)][string]$Code)
    try { & $Body } catch { if ($_.Exception.Message -eq $Code) { return }; throw "Expected '$Code', got '$($_.Exception.Message)'." }
    throw "Expected '$Code', but no failure was raised."
}

try {
    New-Item -ItemType Directory -Path $testRoot | Out-Null
    $inputDirectory = Join-Path $testRoot 'input'
    New-Item -ItemType Directory -Path $inputDirectory | Out-Null
    $outputPath = Join-Path $testRoot 'reports\report.json'
    $configPath = Join-Path $repoRoot 'security\tooling\gitleaks.toml'
    $ignorePath = Join-Path $repoRoot 'security\tooling\gitleaks-empty-ignore.txt'

    Invoke-TestCase -Name 'Directory adapter uses exact production command vector' -Body {
        $actual = @(Get-GitleaksScanArguments -ScanDefinition $contract.scans[0] -RepositoryRoot $repoRoot -InputPath $inputDirectory -OutputPath $outputPath)
        $expected = @('dir', [System.IO.Path]::GetFullPath($inputDirectory), '--config', $configPath, '--gitleaks-ignore-path', $ignorePath, '--ignore-gitleaks-allow', '--redact=100', '--report-format', 'json', '--report-path', [System.IO.Path]::GetFullPath($outputPath), '--exit-code', '3', '--log-level', 'error', '--no-banner', '--no-color', '--timeout', '300')
        Assert-EqualArray -Actual $actual -Expected $expected -Message 'Directory adapter drifted'
    }
    Invoke-TestCase -Name 'Git adapter uses full reachable-history command vector' -Body {
        $actual = @(Get-GitleaksScanArguments -ScanDefinition $contract.scans[1] -RepositoryRoot $repoRoot -InputPath $repoRoot -OutputPath $outputPath)
        $expected = @('git', [System.IO.Path]::GetFullPath($repoRoot), '--log-opts', '--full-history --all', '--config', $configPath, '--gitleaks-ignore-path', $ignorePath, '--ignore-gitleaks-allow', '--redact=100', '--report-format', 'json', '--report-path', [System.IO.Path]::GetFullPath($outputPath), '--exit-code', '3', '--log-level', 'error', '--no-banner', '--no-color', '--timeout', '300')
        Assert-EqualArray -Actual $actual -Expected $expected -Message 'Git adapter drifted'
    }
    Invoke-TestCase -Name 'Unsupported scan definition is rejected' -Body {
        $unsupported = [pscustomobject]@{ id = 'unknown' }
        Assert-ThrowsCode -Code 'GITLEAKS_SCAN_DEFINITION_UNSUPPORTED' -Body { Get-GitleaksScanArguments -ScanDefinition $unsupported -RepositoryRoot $repoRoot -InputPath $inputDirectory -OutputPath $outputPath | Out-Null }
    }
    $fakeScanner = Join-Path $testRoot 'fake-gitleaks.cmd'
    Set-Content -LiteralPath $fakeScanner -Value '@exit /b 0' -Encoding ascii -NoNewline
    Invoke-TestCase -Name 'Scanner exit zero is accepted' -Body {
        $result = Invoke-GitleaksScan -GitleaksExecutable $fakeScanner -ScanDefinition $contract.scans[0] -RepositoryRoot $repoRoot -InputPath $inputDirectory -OutputPath $outputPath
        if ($result.exitCode -ne 0) { throw 'Exit zero was not retained.' }
    }
    Set-Content -LiteralPath $fakeScanner -Value '@exit /b 3' -Encoding ascii -NoNewline
    Invoke-TestCase -Name 'Scanner finding exit code is retained for policy evaluation' -Body {
        $result = Invoke-GitleaksScan -GitleaksExecutable $fakeScanner -ScanDefinition $contract.scans[0] -RepositoryRoot $repoRoot -InputPath $inputDirectory -OutputPath $outputPath
        if ($result.exitCode -ne 3) { throw 'Finding exit code was not retained.' }
    }
    Set-Content -LiteralPath $fakeScanner -Value '@exit /b 7' -Encoding ascii -NoNewline
    Invoke-TestCase -Name 'Unexpected scanner exit code fails closed' -Body {
        Assert-ThrowsCode -Code 'GITLEAKS_SCAN_FAILED' -Body { Invoke-GitleaksScan -GitleaksExecutable $fakeScanner -ScanDefinition $contract.scans[0] -RepositoryRoot $repoRoot -InputPath $inputDirectory -OutputPath $outputPath | Out-Null }
    }
} finally {
    if (Test-Path -LiteralPath $testRoot) { Remove-Item -LiteralPath $testRoot -Recurse -Force }
}

Write-Output "Tests: $($failures.Count + 6)"
Write-Output "Failures: $($failures.Count)"
if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Output "[DETAIL] $_" }
    exit 1
}
Write-Output 'Gitleaks scan adapter tests: PASS'
````


### api/scripts/supply-chain/Test-GitleaksScanContract.mjs

Original-byte SHA256: 1168ba166af9cc066e65b90a3740713a1354092d474c4c1200f36dcf389a6779

````javascript
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const ajvPath = path.join(repoRoot, "contracts/node_modules/ajv/dist/2020.js");
const schemaPath = path.join(repoRoot, "security/schemas/gitleaks-scan-contract.schema.json");
const contractPath = path.join(repoRoot, "security/tooling/gitleaks-scan-contract.json");

if (!fs.existsSync(ajvPath)) {
  throw new Error("Pinned Ajv is missing; run npm ci in api/contracts before Cycle 4 contract tests.");
}

const { default: Ajv2020 } = await import(pathToFileURL(ajvPath).href);

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(label + " is missing.");
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(label + " is malformed JSON.");
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertResult(validate, name, mutate, expectedValid) {
  const candidate = clone(contract);
  mutate(candidate);
  const valid = validate(candidate);
  if (valid !== expectedValid) {
    const errors = (validate.errors ?? []).map(({ instancePath, keyword }) => ({ instancePath, keyword }));
    throw new Error(name + ": expected valid=" + expectedValid + ", got valid=" + valid + "; errors=" + JSON.stringify(errors));
  }
  process.stdout.write("[PASS] " + name + "\n");
}

const schema = readJson(schemaPath, "Gitleaks scan contract schema");
const contract = readJson(contractPath, "Gitleaks scan contract");
const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
if (!ajv.validateSchema(schema)) {
  throw new Error("Gitleaks scan contract schema is invalid: " + JSON.stringify(ajv.errors));
}
const validate = ajv.compile(schema);

assertResult(validate, "Canonical Gitleaks scan contract accepted", () => {}, true);
assertResult(validate, "Wrong scanner version rejected", (value) => { value.scanner.version = "8.30.1"; }, false);
assertResult(validate, "Global Gitleaks installation rejected", (value) => { value.scanner.installation = "global-path"; }, false);
assertResult(validate, "Unsafe working-tree enumeration rejected", (value) => { value.workingTree.candidateCommand = ["Get-ChildItem", "-Recurse"]; }, false);
assertResult(validate, "Persistent snapshot rejected", (value) => { value.workingTree.snapshot = "repository-cache"; }, false);
assertResult(validate, "Env-local read protection rejected", (value) => { value.workingTree.neverReadPaths = []; }, false);
assertResult(validate, "Missing directory scan rejected", (value) => { value.scans.splice(0, 1); }, false);
assertResult(validate, "Git history scan mode drift rejected", (value) => { value.scans[1].command = "dir"; }, false);
assertResult(validate, "Partial history rejected", (value) => { value.scans[1].arguments[1] = "--all"; }, false);
assertResult(validate, "Inline allow comment suppression rejected", (value) => { value.scans[0].arguments = value.scans[0].arguments.filter((argument) => argument !== "--ignore-gitleaks-allow"); }, false);
assertResult(validate, "Partial redaction rejected", (value) => { value.scans[0].arguments[5] = "--redact=20"; }, false);
assertResult(validate, "Standard finding exit code rejected", (value) => { value.scans[0].arguments[11] = "1"; }, false);
assertResult(validate, "Missing scanner timeout rejected", (value) => { value.scans[0].arguments.splice(-2, 2); }, false);
assertResult(validate, "Unbounded scanner timeout rejected", (value) => { value.scans[1].arguments[value.scans[1].arguments.length - 1] = "0"; }, false);
assertResult(validate, "Raw report retention rejected", (value) => { value.reportHandling.rawReports = "uploaded"; }, false);
assertResult(validate, "Sensitive inventory field rejected", (value) => { value.reportHandling.sanitizedInventoryFields.push("Secret"); }, false);
assertResult(validate, "Policy bypass rejected", (value) => { value.policy.mustRun = false; }, false);
assertResult(validate, "Accepted-risk secret disposition rejected", (value) => { value.policy.realSecretDisposition = "accepted-risk"; }, false);

process.stdout.write("Gitleaks scan execution contract tests: PASS\n");
````


### api/scripts/supply-chain/Test-GitleaksScanning.ps1

Original-byte SHA256: 3052b4f74c83ba5c4ef9151a3fba54b23f3f64f1c2ad9d08e6059b3c26661737

````powershell
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Import-Module (Join-Path $PSScriptRoot 'GitleaksScanning.psm1') -Force
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-gitleaks-sanitizer-' + [Guid]::NewGuid().ToString('N'))
$failures = New-Object System.Collections.Generic.List[string]
$nowUtc = [datetime]::Parse('2026-09-13T12:00:00Z').ToUniversalTime()

function Invoke-TestCase { param([string]$Name, [scriptblock]$Body) try { & $Body; Write-Output "[PASS] $Name" } catch { $script:failures.Add("${Name}: $($_.Exception.Message)"); Write-Output "[FAIL] $Name" } }
function Assert-ThrowsCode { param([scriptblock]$Body, [string]$Code) try { & $Body } catch { if ($_.Exception.Message -eq $Code) { return }; throw "Expected '$Code', got '$($_.Exception.Message)'." }; throw "Expected '$Code', but no failure was raised." }
function Write-TestReport {
    param([Parameter(Mandatory)][object[]]$Value)

    # Gitleaks emits a JSON array even for one finding. Keep fixtures in that
    # exact shape so Windows PowerShell and PowerShell 7 exercise the same
    # parser path as the production adapter.
    $path = Join-Path $testRoot ([guid]::NewGuid().ToString('N') + '.json')
    ConvertTo-Json -InputObject @($Value) -Depth 10 | Set-Content -LiteralPath $path -Encoding utf8 -NoNewline
    return $path
}
function New-Finding { param([string]$Mode = 'dir') $path = 'fixtures/example.txt'; $rule = 'fixture-rule'; $commit = if ($Mode -eq 'git') { 'a' * 40 } else { '' }; [pscustomobject]@{ RuleID = $rule; File = $path; Fingerprint = if ($Mode -eq 'git') { "$commit`:$path`:$rule`:1" } else { "$path`:$rule`:1" }; Commit = $commit; Secret = 'redacted'; Match = 'redacted'; Line = 'redacted' } }
function New-AllowlistEntry { param([string]$Mode = 'dir') $finding = New-Finding -Mode $Mode; [pscustomobject]@{ id = 'GL-FP-001'; scanMode = $Mode; ruleId = $finding.RuleID; repositoryRelativePath = $finding.File; scannerFingerprint = $finding.Fingerprint; commitId = if ($Mode -eq 'git') { $finding.Commit } else { $null }; status = 'false-positive'; owner = 'Repository Owner'; rationale = 'Synthetic unit-test false positive.'; remediationReference = 'TEST-GL-001'; approvedBy = 'Repository Owner'; approvedAt = '2026-09-12T00:00:00Z'; expiresAt = '2026-09-14T00:00:00Z' } }

try {
    New-Item -ItemType Directory -Path $testRoot | Out-Null
    Invoke-TestCase -Name 'Valid directory report is sanitized to approved fields only' -Body {
        $inventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @((New-Finding -Mode 'dir'))) -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot)
        if ($inventory.Count -ne 1) { throw 'Expected one finding.' }
        $fields = @($inventory[0].PSObject.Properties.Name)
        $expected = @('scanMode', 'ruleId', 'repositoryRelativePath', 'scannerFingerprint', 'commitId', 'status', 'remediationReference')
        if (($fields -join ',') -ne ($expected -join ',')) { throw 'Sanitized finding field set drifted.' }
        if ($inventory[0].commitId -ne $null -or $inventory[0].status -ne 'observed') { throw 'Directory finding was not normalized.' }
    }
    Invoke-TestCase -Name 'Valid Git report preserves only commit identifier' -Body {
        $inventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @((New-Finding -Mode 'git'))) -ScanMode git -RepositoryRoot $testRoot)
        if ($inventory[0].commitId -ne ('a' * 40)) { throw 'Git commit was not retained.' }
    }
    Invoke-TestCase -Name 'Web route paths are sanitized literally in directory and Git reports' -Body {
        foreach ($mode in @('dir', 'git')) {
            $finding = New-Finding -Mode $mode
            $finding.File = 'web/app/(admin)/auctions/[id]/page.tsx'
            $finding.Fingerprint = if ($mode -eq 'git') { "$($finding.Commit):$($finding.File):fixture-rule:1" } else { "$($finding.File):fixture-rule:1" }
            $inventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @($finding)) -ScanMode $mode -RepositoryRoot $testRoot -SnapshotRoot $testRoot)
            if ($inventory.Count -ne 1 -or $inventory[0].repositoryRelativePath -cne $finding.File -or $inventory[0].scannerFingerprint -cne $finding.Fingerprint) { throw 'Route identity changed during sanitization.' }
        }
    }
    Invoke-TestCase -Name 'Unsafe report paths remain rejected with route characters present' -Body {
        foreach ($unsafe in @('web/(admin)/../secret.txt', 'web/[id]/../../secret.txt', 'web/(admin)/file:stream', 'web/(admin)/file*.txt', 'web/(admin)/file?.txt')) {
            $finding = New-Finding
            $finding.File = $unsafe
            Assert-ThrowsCode -Code 'GITLEAKS_REPORT_PATH_UNSAFE' -Body { ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @($finding)) -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot | Out-Null }
        }
    }
    Invoke-TestCase -Name 'Malformed raw report rejected' -Body {
        $path = Join-Path $testRoot 'malformed.json'; Set-Content -LiteralPath $path -Value '{not-json' -NoNewline
        Assert-ThrowsCode -Code 'GITLEAKS_RAW_REPORT_MALFORMED' -Body { ConvertTo-SanitizedGitleaksInventory -ReportPath $path -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot | Out-Null }
    }
    Invoke-TestCase -Name 'Raw report missing fingerprint rejected' -Body {
        $finding = New-Finding; $finding.PSObject.Properties.Remove('Fingerprint')
        Assert-ThrowsCode -Code 'GITLEAKS_RAW_FINGERPRINT_INVALID' -Body { ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @($finding)) -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot | Out-Null }
    }
    Invoke-TestCase -Name 'Absolute fingerprint rejected' -Body {
        $finding = New-Finding; $finding.Fingerprint = 'C:\temp\fixture.txt:fixture-rule:1'
        Assert-ThrowsCode -Code 'GITLEAKS_RAW_FINGERPRINT_INVALID' -Body { ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @($finding)) -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot | Out-Null }
    }
    Invoke-TestCase -Name 'Git finding without commit rejected' -Body {
        $finding = New-Finding -Mode git; $finding.Commit = ''
        Assert-ThrowsCode -Code 'GITLEAKS_RAW_COMMIT_INVALID' -Body { ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @($finding)) -ScanMode git -RepositoryRoot $testRoot | Out-Null }
    }
    Invoke-TestCase -Name 'Unallowlisted finding fails as an incident' -Body {
        $inventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @((New-Finding))) -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot)
        Assert-ThrowsCode -Code 'GITLEAKS_FINDING_REQUIRES_INCIDENT' -Body { Test-GitleaksPolicy -Inventory $inventory -Allowlist @() -NowUtc $nowUtc | Out-Null }
    }
    Invoke-TestCase -Name 'Exact valid false-positive entry is retained as sanitized policy output' -Body {
        $inventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @((New-Finding))) -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot)
        $decisions = @(Test-GitleaksPolicy -Inventory $inventory -Allowlist @((New-AllowlistEntry)) -NowUtc $nowUtc)
        if ($decisions.Count -ne 1 -or $decisions[0].status -ne 'false-positive' -or $decisions[0].remediationReference -ne 'TEST-GL-001') { throw 'Exact false-positive policy result is invalid.' }
    }
    Invoke-TestCase -Name 'Expired false-positive entry rejected' -Body {
        $inventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @((New-Finding))) -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot)
        $entry = New-AllowlistEntry; $entry.expiresAt = '2026-09-13T11:59:59Z'
        Assert-ThrowsCode -Code 'GITLEAKS_ALLOWLIST_EXPIRED' -Body { Test-GitleaksPolicy -Inventory $inventory -Allowlist @($entry) -NowUtc $nowUtc | Out-Null }
    }
    Invoke-TestCase -Name 'Case-drifted exact match is rejected' -Body {
        $inventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @((New-Finding))) -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot)
        $entry = New-AllowlistEntry; $entry.repositoryRelativePath = 'Fixtures/example.txt'
        Assert-ThrowsCode -Code 'GITLEAKS_FINDING_REQUIRES_INCIDENT' -Body { Test-GitleaksPolicy -Inventory $inventory -Allowlist @($entry) -NowUtc $nowUtc | Out-Null }
    }
    Invoke-TestCase -Name 'Empty finding inventory passes without disposition' -Body {
        $decisions = @(Test-GitleaksPolicy -Inventory @() -Allowlist @() -NowUtc $nowUtc)
        if ($decisions.Count -ne 0) { throw 'Empty policy result was not empty.' }
    }
} finally { if (Test-Path -LiteralPath $testRoot) { Remove-Item -LiteralPath $testRoot -Recurse -Force } }

Write-Output 'Tests: 13'
Write-Output "Failures: $($failures.Count)"
if ($failures.Count -gt 0) { $failures | ForEach-Object { Write-Output "[DETAIL] $_" }; exit 1 }
Write-Output 'Gitleaks scanning sanitizer and policy tests: PASS'
````


### api/scripts/supply-chain/Test-GitleaksWorkingTreeSnapshot.ps1

Original-byte SHA256: bc81b7a849d935a53ca560c850b1052e37d08cfe472d42c952d455028088d2cb

````powershell
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Import-Module (Join-Path $PSScriptRoot 'GitleaksScanning.psm1') -Force

$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-gitleaks-snapshot-' + [Guid]::NewGuid().ToString('N'))
$testRepository = Join-Path $testRoot 'repository'
$snapshotRoot = Join-Path $testRoot 'snapshot'
$failures = New-Object System.Collections.Generic.List[string]

function Invoke-TestCase {
    param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][scriptblock]$Body)
    try {
        & $Body
        Write-Output "[PASS] $Name"
    } catch {
        $script:failures.Add("${Name}: $($_.Exception.Message)")
        Write-Output "[FAIL] $Name"
    }
}

function Assert-Equal {
    param($Actual, $Expected, [string]$Message)
    if ($Actual -ne $Expected) { throw "$Message (actual='$Actual', expected='$Expected')" }
}

function Assert-ThrowsCode {
    param([Parameter(Mandatory)][scriptblock]$Body, [Parameter(Mandatory)][string]$Code)
    try {
        & $Body
    } catch {
        if ($_.Exception.Message -eq $Code) { return }
        throw "Expected failure code '$Code', got '$($_.Exception.Message)'."
    }
    throw "Expected failure code '$Code', but no failure was raised."
}

try {
    New-Item -ItemType Directory -Path $testRepository -Force | Out-Null
    & git -C $testRepository init --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Unable to initialize temporary Git repository.' }
    & git -C $testRepository config user.email 'cycle4-fixture@example.invalid'
    & git -C $testRepository config user.name 'Cycle 4 Fixture'

    Set-Content -LiteralPath (Join-Path $testRepository '.gitignore') -Value ".env.local`nignored/" -NoNewline
    Set-Content -LiteralPath (Join-Path $testRepository 'tracked.txt') -Value 'tracked-original' -NoNewline
    $nestedTrackedDirectory = Join-Path $testRepository 'nested\tracked'
    New-Item -ItemType Directory -Path $nestedTrackedDirectory -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $nestedTrackedDirectory 'baseline.txt') -Value 'nested-tracked-file' -NoNewline
    & git -C $testRepository add .gitignore tracked.txt nested/tracked/baseline.txt
    & git -C $testRepository commit --quiet -m 'fixture baseline'
    if ($LASTEXITCODE -ne 0) { throw 'Unable to commit temporary Git fixture.' }

    Set-Content -LiteralPath (Join-Path $testRepository 'tracked.txt') -Value 'tracked-working-tree-change' -NoNewline
    Set-Content -LiteralPath (Join-Path $testRepository 'untracked.txt') -Value 'untracked-working-tree-file' -NoNewline
    Set-Content -LiteralPath (Join-Path $testRepository '.env.local') -Value 'must-not-be-copied' -NoNewline
    New-Item -ItemType Directory -Path (Join-Path $testRepository 'ignored') | Out-Null
    Set-Content -LiteralPath (Join-Path $testRepository 'ignored/ignored.txt') -Value 'must-not-be-copied' -NoNewline

    Invoke-TestCase -Name 'Candidate set includes tracked and non-ignored untracked files' -Body {
        $candidates = @(Get-WorkingTreeCandidatePaths -RepositoryRoot $testRepository)
        if ('tracked.txt' -notin $candidates -or 'untracked.txt' -notin $candidates) { throw 'Expected working-tree files were absent.' }
    }
    Invoke-TestCase -Name 'Ignored env-local is excluded before snapshot creation' -Body {
        $candidates = @(Get-WorkingTreeCandidatePaths -RepositoryRoot $testRepository)
        if ('.env.local' -in $candidates) { throw 'Ignored .env.local was a scan candidate.' }
    }
    Invoke-TestCase -Name 'Snapshot retains working-tree modifications and excludes ignored files' -Body {
        $result = New-WorkingTreeSnapshot -RepositoryRoot $testRepository -TemporaryRoot $snapshotRoot
        Assert-Equal $result.candidateCount 4 'Unexpected snapshot candidate count'
        Assert-Equal (Get-Content -LiteralPath (Join-Path $snapshotRoot 'tracked.txt') -Raw) 'tracked-working-tree-change' 'Tracked working-tree content was not retained'
        Assert-Equal (Get-Content -LiteralPath (Join-Path $snapshotRoot 'untracked.txt') -Raw) 'untracked-working-tree-file' 'Untracked working-tree content was not retained'
        Assert-Equal (Get-Content -LiteralPath (Join-Path $snapshotRoot 'nested/tracked/baseline.txt') -Raw) 'nested-tracked-file' 'Nested tracked content was not retained'
        if (Test-Path -LiteralPath (Join-Path $snapshotRoot '.env.local')) { throw '.env.local was copied into snapshot.' }
        if (Test-Path -LiteralPath (Join-Path $snapshotRoot 'ignored/ignored.txt')) { throw 'Ignored file was copied into snapshot.' }
    }
    Invoke-TestCase -Name 'Tracked and untracked web route paths are copied literally' -Body {
        $routePaths = @('web/app/(admin)/auctions/[id]/page.tsx', 'web/app/(public)/layout.tsx')
        foreach ($route in $routePaths) {
            $target = Join-Path $testRepository $route
            [void][System.IO.Directory]::CreateDirectory((Split-Path -Parent $target))
            [System.IO.File]::WriteAllText($target, 'route-fixture')
        }
        & git --literal-pathspecs -C $testRepository add -- $routePaths[0]
        if ($LASTEXITCODE -ne 0) { throw 'Unable to stage route fixture.' }
        $routeSnapshot = Join-Path $testRoot 'route-snapshot'
        $result = New-WorkingTreeSnapshot -RepositoryRoot $testRepository -TemporaryRoot $routeSnapshot
        Assert-Equal $result.candidateCount 6 'Web route candidates were omitted'
        foreach ($route in $routePaths) {
            Assert-Equal ([System.IO.File]::ReadAllText((Join-Path $routeSnapshot $route))) 'route-fixture' 'Route path was not copied literally'
        }
    }
    Invoke-TestCase -Name 'Tracked env-local candidate fails closed before content copy' -Body {
        & git -C $testRepository add -f .env.local
        if ($LASTEXITCODE -ne 0) { throw 'Unable to stage env-local rejection fixture.' }
        Assert-ThrowsCode -Code 'GITLEAKS_ENV_LOCAL_CANDIDATE_REJECTED' -Body { Get-WorkingTreeCandidatePaths -RepositoryRoot $testRepository | Out-Null }
    }
    Invoke-TestCase -Name 'Nested tracked env-local candidate also fails closed' -Body {
        $nestedDirectory = Join-Path $testRepository 'config'
        New-Item -ItemType Directory -Path $nestedDirectory -Force | Out-Null
        Set-Content -LiteralPath (Join-Path $nestedDirectory '.env.local') -Value 'must-not-be-read' -NoNewline
        & git -C $testRepository add -f config/.env.local
        if ($LASTEXITCODE -ne 0) { throw 'Unable to stage nested env-local rejection fixture.' }
        Assert-ThrowsCode -Code 'GITLEAKS_ENV_LOCAL_CANDIDATE_REJECTED' -Body { Get-WorkingTreeCandidatePaths -RepositoryRoot $testRepository | Out-Null }
    }
} finally {
    if (Test-Path -LiteralPath $testRoot) { Remove-Item -LiteralPath $testRoot -Recurse -Force }
}

Write-Output 'Tests: 6'
Write-Output "Failures: $($failures.Count)"
if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Output "[DETAIL] $_" }
    exit 1
}
Write-Output 'Gitleaks working-tree snapshot tests: PASS'
````


### api/scripts/supply-chain/Test-HostedSupplyChain.ps1

Original-byte SHA256: 4c7ffed49e7a06f013ec579d52c0950880387cbd1ee716e1b780141ff2c83dfd

````powershell
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$modulePath = Join-Path $PSScriptRoot 'HostedSupplyChain.psm1'
if (-not (Test-Path -LiteralPath $modulePath -PathType Leaf)) {
    throw 'HOSTED_SUPPLY_CHAIN_MODULE_MISSING'
}

Import-Module $modulePath -Force
$commit = '0123456789abcdef0123456789abcdef01234567'
$root = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-hosted-state-' + [guid]::NewGuid().ToString('N'))
try {
    $summary = New-HostedRunSummary -Workflow 'supply-chain' -CommitSha $commit
    if ($summary.executionState -ne 'IMPLEMENTATION_FAILURE' -or $summary.failureCode -ne 'SUPPLY_CHAIN_NOT_STARTED') { throw 'TEST_INITIAL_STATE_FAILED' }
    Write-Host '[PASS] Initial summary is fail-closed'
    $path = Join-Path $root 'run-summary.json'
    Write-HostedRunSummaryAtomic -Path $path -Summary $summary
    $read = Read-HostedRunSummary -Path $path
    if ($read.commit -ne $commit) { throw 'TEST_ATOMIC_WRITE_FAILED' }
    Write-Host '[PASS] Atomic summary write/read accepted'
    $blocked = Complete-HostedExecution -Summary $read -PolicyState 'BLOCKED'
    if (-not (Test-HostedPolicyBlockedFailure -Summary $blocked)) { throw 'TEST_POLICY_BLOCK_FAILED' }
    Write-Host '[PASS] Completed policy block is not implementation failure'
    $freshness = New-HostedRunSummary -Workflow 'security-freshness' -CommitSha $commit
    $freshness = Complete-HostedExecution -Summary $freshness -PolicyState 'BLOCKED'
    if ($freshness.deltaState -ne 'BASELINE_UNAVAILABLE' -or $freshness.policyState -ne 'BLOCKED') { throw 'TEST_FRESHNESS_DELTA_STATE_FAILED' }
    Write-Host '[PASS] Freshness baseline unavailable does not downgrade policy block'
    $invalid = New-HostedRunSummary -Workflow 'supply-chain' -CommitSha $commit
    $invalid.policyState = 'PASS'
    $rejected = $false; try { Write-HostedRunSummaryAtomic -Path $path -Summary $invalid } catch { $rejected = $true }
    if (-not $rejected) { throw 'TEST_INVALID_TRANSITION_ACCEPTED' }
    Write-Host '[PASS] Invalid implementation-failure to policy-PASS transition rejected'
    $notComplete = New-HostedRunSummary -Workflow 'supply-chain' -CommitSha $commit
    $rejected = $false; try { Set-HostedStageResult -Summary $notComplete -Result 'BLOCKED' | Out-Null } catch { $rejected = $true }
    if (-not $rejected) { throw 'TEST_EARLY_POLICY_BLOCK_ACCEPTED' }
    Write-Host '[PASS] Policy block before completed execution rejected'
    $badCommit = $false; try { New-HostedRunSummary -Workflow 'supply-chain' -CommitSha 'short' } catch { $badCommit = $true }
    if (-not $badCommit) { throw 'TEST_BAD_COMMIT_ACCEPTED' }
    Write-Host '[PASS] Invalid commit rejected'
} finally {
    if (Test-Path -LiteralPath $root) { Remove-HostedTemporaryRoot -Root $root }
}
Write-Host 'Hosted supply-chain state-machine tests: PASS'
````


### api/scripts/supply-chain/Test-HostedSupplyChainContract.mjs

Original-byte SHA256: 1b05159abf46e42c12a122ca095282e11a4e768e8d3533b647bfd5bac9d2742a

````javascript
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import YAML from "../../contracts/node_modules/yaml/dist/index.js";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const monorepoRoot = path.resolve(repoRoot, "..");
const contractPath = path.join(repoRoot, "security/tooling/hosted-supply-chain-contract.json");
const schemaPath = path.join(repoRoot, "security/schemas/hosted-supply-chain-contract.schema.json");
const ajvPath = path.join(repoRoot, "contracts/node_modules/ajv/dist/2020.js");
const triggeredRevision = "${{ github.event.pull_request.head.sha || github.sha }}";

function fail(code) { throw new Error(code); }
function readJson(file, code) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { fail(code); } }
function parse(text) {
  const document = YAML.parseDocument(text, { prettyErrors: false, strict: true, uniqueKeys: true });
  if (document.errors.length || document.warnings.length) fail("HOSTED_WORKFLOW_YAML_INVALID");
  return document.toJS({ maxAliasCount: 0 });
}
function uses(step, action) { return typeof step?.uses === "string" && step.uses === action; }
function steps(job) { return Array.isArray(job?.steps) ? job.steps : []; }
function stepById(job, id) { return steps(job).find((step) => step?.id === id); }
function assertCode(condition, code) { if (!condition) fail(code); }

const contract = readJson(contractPath, "HOSTED_WORKFLOW_CONTRACT_INVALID");
const { default: Ajv2020 } = await import(pathToFileURL(ajvPath).href);
const ajv = new Ajv2020({ allErrors: true, strict: true });
const schema = readJson(schemaPath, "HOSTED_WORKFLOW_SCHEMA_INVALID");
assertCode(ajv.validateSchema(schema), "HOSTED_WORKFLOW_SCHEMA_INVALID");
assertCode(ajv.compile(schema)(contract), "HOSTED_WORKFLOW_CONTRACT_INVALID");

function validateCheckout(job, freshness) {
  const checkout = stepById(job, "checkout");
  assertCode(uses(checkout, `actions/checkout@${contract.actions.checkout}`), "HOSTED_WORKFLOW_CHECKOUT_UNPINNED");
  assertCode(checkout.with?.["fetch-depth"] === 0, "HOSTED_WORKFLOW_SHALLOW_CHECKOUT");
  assertCode(checkout.with?.["persist-credentials"] === false, "HOSTED_WORKFLOW_CHECKOUT_CREDENTIALS");
  if (freshness) assertCode(checkout.with?.ref === "${{ github.event.repository.default_branch }}", "HOSTED_WORKFLOW_FRESHNESS_REF");
  else assertCode(checkout.with?.ref === triggeredRevision, "HOSTED_WORKFLOW_TRIGGER_REF");
}
function validateSafeSteps(job) {
  for (const step of steps(job)) {
    assertCode(step?.["continue-on-error"] !== true, "HOSTED_WORKFLOW_CONTINUE_ON_ERROR");
    const remote = step?.uses;
    if (typeof remote === "string") {
      assertCode(!remote.startsWith("docker://") || /@sha256:[a-f0-9]{64}$/i.test(remote), "HOSTED_WORKFLOW_CONTAINER_ACTION_MUTABLE");
      const allowed = Object.values(contract.actions).some((sha) => remote.endsWith(`@${sha}`));
      assertCode(allowed, "HOSTED_WORKFLOW_ACTION_UNAPPROVED");
    }
    const command = String(step?.run ?? "").toLowerCase();
    assertCode(!/(aws |aws\n|docker login|docker push|gh api|upload-sarif|sarif)/.test(command), "HOSTED_WORKFLOW_PROHIBITED_OPERATION");
  }
}
function validateEvidence(job, expectedArtifactName) {
  const upload = stepById(job, "upload-evidence");
  assertCode(uses(upload, `actions/upload-artifact@${contract.actions.uploadArtifact}`), "HOSTED_WORKFLOW_EVIDENCE_UPLOAD");
  assertCode(upload.if === "always()", "HOSTED_WORKFLOW_EVIDENCE_ALWAYS");
  assertCode(upload.with?.["retention-days"] === contract.evidence.retentionDays, "HOSTED_WORKFLOW_EVIDENCE_RETENTION");
  assertCode(upload.with?.["if-no-files-found"] === "error", "HOSTED_WORKFLOW_EVIDENCE_MISSING_ERROR");
  const artifactName = upload.with?.name;
  assertCode(artifactName === expectedArtifactName, "HOSTED_WORKFLOW_EVIDENCE_NAME");
  assertCode(upload.with?.path === "${{ runner.temp }}/s001-t07-evidence/hosted", "HOSTED_WORKFLOW_EVIDENCE_PATH");
}
function validateTriggeredRevision(job) {
  assertCode(job.env?.TRIGGERED_SHA === triggeredRevision, "HOSTED_WORKFLOW_TRIGGER_REF");
  const initialized = stepById(job, "initialize-summary");
  const hosted = stepById(job, "run-hosted");
  const evidence = stepById(job, "validate-evidence");
  assertCode(String(initialized?.run ?? "").includes("$env:TRIGGERED_SHA"), "HOSTED_WORKFLOW_TRIGGER_REF");
  assertCode(String(hosted?.run ?? "").includes("-CommitSha $env:TRIGGERED_SHA"), "HOSTED_WORKFLOW_TRIGGER_REF");
  assertCode(String(evidence?.run ?? "").includes("${{ env.TRIGGERED_SHA }}"), "HOSTED_WORKFLOW_TRIGGER_REF");
}
function validateDatabaseRefresh(job) {
  const hosted = stepById(job, "run-hosted");
  assertCode(String(hosted?.run ?? "").includes("-RefreshDatabase"), "HOSTED_WORKFLOW_DATABASE_REFRESH_REQUIRED");
}
function validateWorkflowSet({ baseline, supplyChain, freshness }) {
  assertCode(baseline && supplyChain && freshness, "HOSTED_WORKFLOW_MISSING");
  assertCode(!Object.hasOwn(supplyChain.on ?? {}, "pull_request_target"), "HOSTED_WORKFLOW_PULL_REQUEST_TARGET");
  for (const trigger of ["pull_request", "push", "workflow_dispatch"]) assertCode(Object.hasOwn(supplyChain.on ?? {}, trigger), "HOSTED_WORKFLOW_TRIGGER_MISSING");
  for (const trigger of ["schedule", "workflow_dispatch"]) assertCode(Object.hasOwn(freshness.on ?? {}, trigger), "HOSTED_WORKFLOW_FRESHNESS_TRIGGER_MISSING");
  for (const workflow of [baseline, supplyChain, freshness]) {
    assertCode(workflow.permissions?.contents === "read" && Object.keys(workflow.permissions ?? {}).length === 1, "HOSTED_WORKFLOW_PERMISSIONS");
  }
  assertCode(typeof baseline.concurrency?.["cancel-in-progress"] === "boolean", "HOSTED_WORKFLOW_CONCURRENCY");
  assertCode(supplyChain.concurrency?.["cancel-in-progress"] === false && freshness.concurrency?.["cancel-in-progress"] === false, "HOSTED_WORKFLOW_CONCURRENCY");
  const verification = supplyChain.jobs?.[contract.jobs.verification];
  const release = supplyChain.jobs?.[contract.jobs.releasePolicy];
  const fresh = freshness.jobs?.[contract.jobs.freshness];
  const freshnessRelease = freshness.jobs?.["freshness-release-policy"];
  assertCode(verification && release && fresh && freshnessRelease, "HOSTED_WORKFLOW_JOB_MISSING");
  assertCode(verification["runs-on"] === contract.runners.hostedLinux && verification["timeout-minutes"] === contract.timeouts.verificationMinutes, "HOSTED_WORKFLOW_VERIFICATION_JOB");
  assertCode(release["runs-on"] === contract.runners.hostedLinux && release["timeout-minutes"] === contract.timeouts.releasePolicyMinutes, "HOSTED_WORKFLOW_RELEASE_JOB");
  assertCode(fresh["runs-on"] === contract.runners.hostedLinux && fresh["timeout-minutes"] === contract.timeouts.freshnessMinutes, "HOSTED_WORKFLOW_FRESHNESS_JOB");
  validateCheckout(verification, false); validateCheckout(fresh, true); validateTriggeredRevision(verification); validateDatabaseRefresh(verification);
  validateSafeSteps(verification); validateSafeSteps(fresh); validateEvidence(verification, "supply-chain-${{ env.TRIGGERED_SHA }}"); validateEvidence(fresh, "security-freshness-${{ steps.resolve-default-commit.outputs.commit }}");
  const ids = steps(verification).map((step) => step.id);
  // Build and scanning stages live in the Task 3 orchestrator. The workflow
  // validates its own trust-boundary ordering without duplicating that logic.
  const required = ["validate-contract", "validate-evidence", "upload-evidence"];
  const hostedBoundary = ids.includes("run-hosted") || ["install-tools", "build-image", "technical-smoke", "container-scan"].every((id) => ids.includes(id));
  assertCode(hostedBoundary, "HOSTED_WORKFLOW_STAGE_MISSING");
  for (const id of required) assertCode(ids.includes(id), "HOSTED_WORKFLOW_STAGE_MISSING");
  for (let index = 1; index < required.length; index += 1) assertCode(ids.indexOf(required[index - 1]) < ids.indexOf(required[index]), "HOSTED_WORKFLOW_STAGE_ORDER");
  assertCode(release.needs?.includes(contract.jobs.verification) && release.if === "needs.supply-chain-verification.result == 'success'", "HOSTED_WORKFLOW_POLICY_SEPARATION");
  assertCode(freshnessRelease.needs?.includes(contract.jobs.freshness) && freshnessRelease.if === "needs.security-freshness.result == 'success'" && freshnessRelease["timeout-minutes"] === contract.timeouts.releasePolicyMinutes, "HOSTED_WORKFLOW_POLICY_SEPARATION");
}

function canonical() {
  const pins = contract.actions;
  const common = `permissions:\n  contents: read\nconcurrency:\n  group: cycle6\n  cancel-in-progress: false\n`;
  const verification = `name: Supply chain\non:\n  pull_request: {}\n  push: {}\n  workflow_dispatch: {}\n${common}jobs:\n  supply-chain-verification:\n    runs-on: ubuntu-24.04\n    timeout-minutes: 60\n    env:\n      TRIGGERED_SHA: '\${{ github.event.pull_request.head.sha || github.sha }}'\n    steps:\n      - id: initialize-summary\n        run: echo $env:TRIGGERED_SHA\n      - id: checkout\n        uses: actions/checkout@${pins.checkout}\n        with: { fetch-depth: 0, persist-credentials: false, ref: '\${{ github.event.pull_request.head.sha || github.sha }}' }\n      - id: validate-contract\n        uses: actions/setup-node@${pins.setupNode}\n      - id: run-hosted\n        run: Invoke -CommitSha $env:TRIGGERED_SHA\n      - id: validate-evidence\n        run: echo '\${{ env.TRIGGERED_SHA }}'\n      - id: upload-evidence\n        if: always()\n        uses: actions/upload-artifact@${pins.uploadArtifact}\n        with:\n          name: supply-chain-\${{ env.TRIGGERED_SHA }}\n          path: \${{ runner.temp }}/s001-t07-evidence/hosted\n          retention-days: 30\n          if-no-files-found: error\n  release-policy:\n    needs: [supply-chain-verification]\n    if: always()\n    runs-on: ubuntu-24.04\n    timeout-minutes: 5\n    steps: []\n`;
  const fresh = `name: Freshness\non:\n  schedule: [{ cron: '0 3 * * *' }]\n  workflow_dispatch: {}\n${common}jobs:\n  security-freshness:\n    runs-on: ubuntu-24.04\n    timeout-minutes: 60\n    steps:\n      - id: resolve-default-commit\n        run: echo resolve\n      - id: checkout\n        uses: actions/checkout@${pins.checkout}\n        with: { fetch-depth: 0, persist-credentials: false, ref: '\${{ github.event.repository.default_branch }}' }\n      - id: validate-contract\n        uses: actions/setup-node@${pins.setupNode}\n      - id: install-tools\n        uses: actions/setup-java@${pins.setupJava}\n      - id: build-image\n        run: echo build\n      - id: technical-smoke\n        run: echo smoke\n      - id: container-scan\n        run: echo scan\n      - id: validate-evidence\n        run: echo validate\n      - id: upload-evidence\n        if: always()\n        uses: actions/upload-artifact@${pins.uploadArtifact}\n        with:\n          name: security-freshness-\${{ steps.resolve-default-commit.outputs.commit }}\n          path: \${{ runner.temp }}/s001-t07-evidence/hosted\n          retention-days: 30\n          if-no-files-found: error\n`;
  const result = { baseline: parse(common), supplyChain: parse(verification), freshness: parse(fresh) };
  result.supplyChain.jobs[contract.jobs.verification].steps.find((step) => step.id === "run-hosted").run += " -RefreshDatabase";
  result.supplyChain.jobs[contract.jobs.releasePolicy].if = "needs.supply-chain-verification.result == 'success'";
  result.freshness.jobs["freshness-release-policy"] = { needs: ["security-freshness"], if: "needs.security-freshness.result == 'success'", "runs-on": "ubuntu-24.04", "timeout-minutes": 5, steps: [] };
  return result;
}
function clone(value) { return structuredClone(value); }
function runFixtures() {
  const base = canonical();
  validateWorkflowSet(base); process.stdout.write("[PASS] Canonical workflow set accepted\n");
  const cases = [
    ["Missing workflow rejected", (v) => { v.freshness = undefined; }],
    ["pull_request_target rejected", (v) => { v.supplyChain.on.pull_request_target = {}; }],
    ["Missing trigger rejected", (v) => { delete v.supplyChain.on.push; }],
    ["Broad permissions rejected", (v) => { v.supplyChain.permissions["id-token"] = "write"; }],
    ["Mutable action rejected", (v) => { stepById(v.supplyChain.jobs[contract.jobs.verification], "checkout").uses = "actions/checkout@v4"; }],
    ["Shallow checkout rejected", (v) => { stepById(v.supplyChain.jobs[contract.jobs.verification], "checkout").with["fetch-depth"] = 1; }],
    ["Credential persistence rejected", (v) => { stepById(v.supplyChain.jobs[contract.jobs.verification], "checkout").with["persist-credentials"] = true; }],
    ["PR head SHA drift rejected", (v) => { stepById(v.supplyChain.jobs[contract.jobs.verification], "checkout").with.ref = "${{ github.sha }}"; }],
    ["Hosted commit SHA drift rejected", (v) => { stepById(v.supplyChain.jobs[contract.jobs.verification], "run-hosted").run = "Invoke -CommitSha $env:GITHUB_SHA"; }],
    ["Hosted database refresh omission rejected", (v) => { stepById(v.supplyChain.jobs[contract.jobs.verification], "run-hosted").run = "Invoke -CommitSha $env:TRIGGERED_SHA"; }],
    ["Freshness ref drift rejected", (v) => { stepById(v.freshness.jobs[contract.jobs.freshness], "checkout").with.ref = "main"; }],
    ["Unsafe concurrency rejected", (v) => { v.supplyChain.concurrency["cancel-in-progress"] = true; }],
    ["Wrong retention rejected", (v) => { stepById(v.supplyChain.jobs[contract.jobs.verification], "upload-evidence").with["retention-days"] = 7; }],
    ["Missing evidence always rejected", (v) => { delete stepById(v.supplyChain.jobs[contract.jobs.verification], "upload-evidence").if; }],
    ["Stage reversal rejected", (v) => { const s = v.supplyChain.jobs[contract.jobs.verification].steps; const validation = s.findIndex((x) => x.id === "validate-evidence"); const upload = s.findIndex((x) => x.id === "upload-evidence"); [s[validation], s[upload]] = [s[upload], s[validation]]; }]
  ];
  for (const [name, mutate] of cases) {
    let rejected = false;
    try { const value = clone(base); mutate(value); validateWorkflowSet(value); } catch { rejected = true; }
    assertCode(rejected, "HOSTED_WORKFLOW_FIXTURE_ACCEPTED"); process.stdout.write(`[PASS] ${name}\n`);
  }
  let malformed = false; try { parse("jobs: ["); } catch { malformed = true; }
  assertCode(malformed, "HOSTED_WORKFLOW_FIXTURE_ACCEPTED"); process.stdout.write("[PASS] Malformed YAML rejected\n");
  let duplicate = false; try { parse("name: a\nname: b"); } catch { duplicate = true; }
  assertCode(duplicate, "HOSTED_WORKFLOW_FIXTURE_ACCEPTED"); process.stdout.write("[PASS] Duplicate YAML key rejected\n");
}
function runRepository() {
  const paths = contract.workflowPaths;
  const readWorkflow = (relativePath) => { assertCode(fs.existsSync(path.join(monorepoRoot, relativePath)), "HOSTED_WORKFLOW_MISSING"); return parse(fs.readFileSync(path.join(monorepoRoot, relativePath), "utf8")); };
  validateWorkflowSet({ baseline: readWorkflow(paths.baseline), supplyChain: readWorkflow(paths.supplyChain), freshness: readWorkflow(paths.freshness) });
  process.stdout.write("Hosted workflow repository contract: PASS\n");
}
function runRepositorySupplyChain() {
  const paths = contract.workflowPaths;
  const readWorkflow = (relativePath) => { assertCode(fs.existsSync(path.join(monorepoRoot, relativePath)), "HOSTED_WORKFLOW_MISSING"); return parse(fs.readFileSync(path.join(monorepoRoot, relativePath), "utf8")); };
  const fixture = canonical();
  validateWorkflowSet({ baseline: readWorkflow(paths.baseline), supplyChain: readWorkflow(paths.supplyChain), freshness: fixture.freshness });
  process.stdout.write("Hosted supply-chain PR/push workflow contract: PASS\n");
}

if (process.argv.includes("--fixtures")) { runFixtures(); process.stdout.write("Hosted workflow contract fixtures: PASS\n"); }
else if (process.argv.includes("--repository")) runRepository();
else if (process.argv.includes("--repository-supply-chain")) runRepositorySupplyChain();
else fail("HOSTED_WORKFLOW_MODE_REQUIRED");

export { validateWorkflowSet };
````


### api/scripts/supply-chain/Test-HostedSupplyChainEvidence.mjs

Original-byte SHA256: fd814a43b84db8d7511677db07d4cdeb84366472d207a5d6850e56dfdd580782

````javascript
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { allowedFiles, validateEvidenceRoot } from "./Validate-HostedSupplyChainEvidence.mjs";

const commit = "0123456789abcdef0123456789abcdef01234567";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "apx-hosted-evidence-"));
const summary = { schemaVersion: 1, workflow: "supply-chain", commit, executionState: "PASS", policyState: "BLOCKED", reviewState: "NOT_REQUIRED", deltaState: "NOT_APPLICABLE", failureCode: "NONE" };
const sanitizedFinding = {
  scanner: "trivy", findingId: "CVE-2026-0001", source: "ghsa", targetType: "sbom",
  target: "services/identity-profile-service/target/bom.json", "package/component": "example:component",
  affectedVersion: "1.0.0", fixedVersion: null, severity: "HIGH", severitySource: "ghsa",
  status: "observed", dispositionId: null
};
try {
  for (const file of allowedFiles) {
    const value = file === "run-summary.json"
      ? summary
      : ["vulnerability-inventory.json", "gitleaks-inventory.json", "container-vulnerability-inventory.json"].includes(file)
        ? { schemaVersion: 1, commit, findings: [] }
        : { schemaVersion: 1, commit };
    fs.writeFileSync(path.join(root, file), JSON.stringify(value));
  }
  validateEvidenceRoot(root, commit);
  process.stdout.write("[PASS] Exact sanitized evidence allowlist accepted\n");
  fs.writeFileSync(path.join(root, "raw.json"), "{}");
  let rejected = false; try { validateEvidenceRoot(root, commit); } catch { rejected = true; }
  if (!rejected) throw new Error("TEST_UNEXPECTED_EVIDENCE_ACCEPTED");
  fs.unlinkSync(path.join(root, "raw.json"));
  const inventory = path.join(root, "vulnerability-inventory.json");
  fs.writeFileSync(inventory, JSON.stringify({ schemaVersion: 1, commit, Description: "raw scanner text" }));
  rejected = false; try { validateEvidenceRoot(root, commit); } catch { rejected = true; }
  if (!rejected) throw new Error("TEST_RAW_FIELD_ACCEPTED");
  fs.writeFileSync(inventory, JSON.stringify({ schemaVersion: 1, commit: "abcdefabcdefabcdefabcdefabcdefabcdefabcd" }));
  rejected = false; try { validateEvidenceRoot(root, commit); } catch { rejected = true; }
  if (!rejected) throw new Error("TEST_COMMIT_MISMATCH_ACCEPTED");
  fs.writeFileSync(inventory, JSON.stringify({ schemaVersion: 1, commit, path: "C:\\Users\\admin\\secret.txt" }));
  rejected = false; try { validateEvidenceRoot(root, commit); } catch { rejected = true; }
  if (!rejected) throw new Error("TEST_ABSOLUTE_PATH_ACCEPTED");
  fs.writeFileSync(inventory, JSON.stringify({ schemaVersion: 1, commit, findings: [sanitizedFinding] }));
  validateEvidenceRoot(root, commit);
  fs.writeFileSync(inventory, JSON.stringify({ schemaVersion: 1, commit, findings: [{ ...sanitizedFinding, unexpected: "scanner-private" }] }));
  rejected = false; try { validateEvidenceRoot(root, commit); } catch { rejected = true; }
  if (!rejected) throw new Error("TEST_UNEXPECTED_FINDING_FIELD_ACCEPTED");
  process.stdout.write("[PASS] Unexpected files, raw scanner fields, commit mismatch, and absolute paths rejected\n");
  process.stdout.write("[PASS] Only the approved twelve vulnerability finding fields are accepted\n");
} finally { fs.rmSync(root, { recursive: true, force: true }); }

process.stdout.write("Hosted supply-chain evidence tests: PASS\n");
````


### api/scripts/supply-chain/Test-HostedSupplyChainOrchestration.ps1

Original-byte SHA256: 8d7a5b47dff609981117c4f8e6beefdf752383d067354692293512defcf6f0a2

````powershell
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$orchestrator = Join-Path $PSScriptRoot 'Invoke-HostedSupplyChain.ps1'
$releasePolicy = Join-Path $PSScriptRoot 'Invoke-HostedReleasePolicy.ps1'
Import-Module (Join-Path $PSScriptRoot 'HostedSupplyChain.psm1') -Force
if (-not (Test-Path -LiteralPath $orchestrator -PathType Leaf) -or -not (Test-Path -LiteralPath $releasePolicy -PathType Leaf)) {
    throw 'HOSTED_ORCHESTRATOR_MISSING'
}
$orchestratorSource = Get-Content -LiteralPath $orchestrator -Raw
if ($orchestratorSource -notmatch '\[object\[\]\]\$DefaultArguments' -or $orchestratorSource -notmatch 'return & \$DefaultAction @DefaultArguments' -or $orchestratorSource -notmatch 'arguments\s*=\s*@\(\$temporaryRoot\)' -or $orchestratorSource -notmatch 'param\(\[string\]\$BootstrapTemporaryRoot\)') {
    throw 'HOSTED_BOOTSTRAP_STAGE_ARGUMENT_BINDING_NOT_EXPLICIT'
}
if ($orchestratorSource -notmatch '\$wrapperPhase = ''initialize''' -or $orchestratorSource -notmatch '\$wrapperPhase = ''read-status''' -or $orchestratorSource -notmatch 'Tool bootstrap wrapper diagnostic: phase=\{0\}; exceptionType=\{1\}') {
    throw 'HOSTED_BOOTSTRAP_PHASE_DIAGNOSTIC_MISSING'
}
if ($orchestratorSource -notmatch '\$stage\.name -eq ''prebuild''' -or $orchestratorSource -notmatch 'Container prebuild diagnostic: failureCode=\{0\}' -or $orchestratorSource -notmatch '\\b\(CONTAINER_PREBUILD_\[A-Z_\]\+\)\\b') {
    throw 'HOSTED_PREBUILD_SANITIZED_DIAGNOSTIC_MISSING'
}
if ($orchestratorSource -notmatch '\$stage\.name -eq ''base''' -or $orchestratorSource -notmatch 'Container base trust diagnostic: failureCode=\{0\}' -or $orchestratorSource -notmatch '\\b\(CONTAINER_BASE_IMAGE_\[A-Z_\]\+\)\\b') {
    throw 'HOSTED_BASE_TRUST_SANITIZED_DIAGNOSTIC_MISSING'
}
if ($orchestratorSource -notmatch 'Container base resolution diagnostic: phase=\{0\}; exceptionType=\{1\}') {
    throw 'HOSTED_BASE_RESOLUTION_PHASE_DIAGNOSTIC_MISSING'
}
if ($orchestratorSource -notmatch '\$stage\.name -eq ''smoke''' -or $orchestratorSource -notmatch 'Container smoke diagnostic: failureCode=\{0\}' -or $orchestratorSource -notmatch '\\b\(CONTAINER_SMOKE_\[A-Z_\]\+\)\\b') {
    throw 'HOSTED_SMOKE_SANITIZED_DIAGNOSTIC_MISSING'
}
if ($orchestratorSource -notmatch 'Container smoke diagnostic: phase=\{0\}; failureCode=\{1\}; exceptionType=\{2\}') {
    throw 'HOSTED_SMOKE_PHASE_DIAGNOSTIC_MISSING'
}
if ($orchestratorSource -notmatch 'container-smoke-' -or $orchestratorSource -notmatch 'Read-HostedSmokeStatus' -or $orchestratorSource -notmatch 'CONTAINER_SMOKE_WRAPPER_STARTUP_FAILED' -or $orchestratorSource -notmatch '\$smokeStatus\.state -eq ''FAILED''' -or $orchestratorSource -notmatch '\$smokeStatus\.state -eq ''STARTED''' -or $orchestratorSource -notmatch 'CONTAINER_SMOKE_WRAPPER_STATUS_INVALID') {
    throw 'HOSTED_SMOKE_STATUS_TRANSPORT_MISSING'
}
if ($orchestratorSource -notmatch 'container-scan-' -or $orchestratorSource -notmatch 'Read-HostedContainerScanStatus' -or $orchestratorSource -notmatch 'CONTAINER_SCAN_WRAPPER_STARTUP_FAILED' -or $orchestratorSource -notmatch '\$containerScanStatus\.state -eq ''BLOCKED''' -or $orchestratorSource -notmatch 'CONTAINER_SCAN_WRAPPER_STATUS_INVALID') {
    throw 'HOSTED_CONTAINER_SCAN_STATUS_TRANSPORT_MISSING'
}
$boundRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-hosted-bootstrap-binding-' + [guid]::NewGuid().ToString('N'))
try {
    [void][System.IO.Directory]::CreateDirectory($boundRoot)
    $action = { param([string]$BootstrapTemporaryRoot) if ([string]::IsNullOrWhiteSpace($BootstrapTemporaryRoot) -or -not (Test-Path -LiteralPath $BootstrapTemporaryRoot -PathType Container)) { throw 'TEST_BOOTSTRAP_ROOT_NOT_BOUND' }; return 'PASS' }
    if ((& $action @($boundRoot)) -ne 'PASS') { throw 'TEST_BOOTSTRAP_ARGUMENT_BINDING_FAILED' }
} finally {
    if (Test-Path -LiteralPath $boundRoot) { Remove-Item -LiteralPath $boundRoot -Recurse -Force }
}

$commit = '0123456789abcdef0123456789abcdef01234567'
$root = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-hosted-orchestrator-' + [guid]::NewGuid().ToString('N'))
$serviceEvidence = Join-Path $PSScriptRoot '..\..\services\identity-profile-service\target\s001-t07-evidence'
$vulnerabilityInventory = Join-Path $serviceEvidence 'vulnerability-inventory.json'
$gitleaksInventory = Join-Path $serviceEvidence 'gitleaks-inventory.json'
$containerInventory = Join-Path $serviceEvidence 'container-vulnerability-inventory.json'
$inventoryStates = @(
    foreach ($path in @($vulnerabilityInventory, $gitleaksInventory, $containerInventory)) {
        $existed = Test-Path -LiteralPath $path -PathType Leaf
        [pscustomobject]@{
            Path = $path
            Existed = $existed
            Bytes = if ($existed) { [System.IO.File]::ReadAllBytes($path) } else { $null }
        }
    }
)
$emptyInventory = '[]'
$fixtureFinding = '[{"scanner":"trivy","findingId":"CVE-2026-0001","source":"ghsa","targetType":"image","target":"auction-promax/identity-profile-service:s001-t07","package/component":"example:component","affectedVersion":"1.0.0","fixedVersion":null,"severity":"HIGH","severitySource":"ghsa","status":"observed","dispositionId":null}]'
function New-Adapters([hashtable]$Overrides = @{}) {
    $items = @{}
    foreach ($stage in @('contract','tools','prebuild','dependency','gitleaks','base','image','smoke','container')) { $items[$stage] = { 'PASS' } }
    foreach ($key in $Overrides.Keys) { $items[$key] = $Overrides[$key] }
    return $items
}
try {
    [void][System.IO.Directory]::CreateDirectory($root)
    $bootstrapStatusPath = Join-Path $root 'bootstrap-status.json'
    [System.IO.File]::WriteAllText($bootstrapStatusPath, '{"schemaVersion":1,"state":"FAILED","failureCode":"TOOL_BOOTSTRAP_TUF_REFRESH_FAILED"}', [System.Text.UTF8Encoding]::new($false))
    $bootstrapStatus = Read-HostedToolBootstrapStatus -Path $bootstrapStatusPath
    if ($bootstrapStatus.state -ne 'FAILED' -or $bootstrapStatus.failureCode -ne 'TOOL_BOOTSTRAP_TUF_REFRESH_FAILED') { throw 'TEST_BOOTSTRAP_STATUS_VALID_REJECTED' }
    Write-Host '[PASS] Sanitized bootstrap status is accepted'

    $failureSummary = New-HostedRunSummary -Workflow 'supply-chain' -CommitSha $commit
    $failureSummary = Set-HostedStageResult -Summary $failureSummary -Result 'IMPLEMENTATION_FAILURE' -FailureCode 'SMOKE_FAILED'
    $failureLine = Format-HostedRunResult -Summary $failureSummary
    if ($failureLine -ne 'Hosted supply-chain result: executionState=IMPLEMENTATION_FAILURE; policyState=NOT_EVALUATED; reviewState=NOT_REQUIRED; failureCode=SMOKE_FAILED') { throw 'TEST_FAILURE_RESULT_OUTPUT_INVALID' }
    Write-Host '[PASS] Failure result line contains only classified state'

    [void][System.IO.Directory]::CreateDirectory($serviceEvidence)
    # These are the exact empty-array formats emitted by the production
    # vulnerability and Gitleaks inventory writers for zero findings.
    [System.IO.File]::WriteAllText($vulnerabilityInventory, $emptyInventory, [System.Text.UTF8Encoding]::new($false))
    [System.IO.File]::WriteAllText($gitleaksInventory, $emptyInventory, [System.Text.UTF8Encoding]::new($false))
    [System.IO.File]::WriteAllText($containerInventory, $fixtureFinding, [System.Text.UTF8Encoding]::new($false))
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters) -NoExit
    if ($result.executionState -ne 'PASS' -or $result.policyState -ne 'PASS') { throw 'TEST_PASS_SCENARIO_FAILED' }
    Write-Host '[PASS] All adapter stages pass as execution PASS'
    $gitleaksEvidence = Get-Content -LiteralPath (Join-Path $root 'gitleaks-inventory.json') -Raw
    if ($gitleaksEvidence -notmatch '"findings":\[\]') { throw 'TEST_EMPTY_GITLEAKS_EVIDENCE_NOT_ARRAY' }
    Write-Host '[PASS] Empty sanitized inventories retain JSON-array shape'

    Remove-Item -LiteralPath $root -Recurse -Force
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ container = { 'POLICY_BLOCKED' }; base = { 'REVIEW_REQUIRED' } }) -NoExit
    if ($result.executionState -ne 'PASS' -or $result.policyState -ne 'BLOCKED' -or $result.reviewState -ne 'REVIEW_REQUIRED') { throw 'TEST_COMBINED_POLICY_REVIEW_FAILED' }
    Write-Host '[PASS] Policy block and mutable-review states remain independent'

    Remove-Item -LiteralPath $root -Recurse -Force
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ container = { throw 'CONTAINER_SCAN_POLICY_BLOCKED' } }) -NoExit
    $containerEvidence = Get-Content -LiteralPath (Join-Path $root 'container-vulnerability-inventory.json') -Raw | ConvertFrom-Json
    if ($result.executionState -ne 'PASS' -or $result.policyState -ne 'BLOCKED' -or @($containerEvidence.findings).Count -ne 1 -or $null -eq $containerEvidence.findings[0].scanner) { throw 'TEST_POLICY_BLOCKED_CONTAINER_EVIDENCE_MISSING' }
    Write-Host '[PASS] Policy-blocked container scan retains flat sanitized evidence'

    Remove-Item -LiteralPath $root -Recurse -Force
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ smoke = { throw 'SMOKE_FAILED' } }) -NoExit
    if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.failureCode -ne 'SMOKE_FAILED') { throw 'TEST_IMPLEMENTATION_FAILURE_FAILED' }
    Write-Host '[PASS] Unknown/pipeline failures remain implementation failures'

    Remove-Item -LiteralPath $root -Recurse -Force
    $smokeWarning = @()
    $childErrorRecord = "Exception: /repo/scripts/supply-chain/Invoke-ContainerTechnicalSmoke.ps1:123`nLine |`n 123 | throw 'CONTAINER_SMOKE_START_FAILED'`n     | CONTAINER_SMOKE_START_FAILED"
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ smoke = { throw $childErrorRecord } }) -NoExit -WarningVariable +smokeWarning
    if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.failureCode -ne 'SMOKE_FAILED' -or (@($smokeWarning) -join "`n") -notmatch 'Container smoke diagnostic: failureCode=CONTAINER_SMOKE_START_FAILED') { throw 'TEST_SMOKE_ERROR_RECORD_DIAGNOSTIC_LOST' }
    Write-Host '[PASS] ErrorRecord-formatted smoke failure remains diagnosable'

    Remove-Item -LiteralPath $root -Recurse -Force
    $smokeWarning = @()
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ smoke = { throw 'child process failed before smoke payload' } }) -NoExit -WarningVariable +smokeWarning
    if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.failureCode -ne 'SMOKE_FAILED' -or (@($smokeWarning) -join "`n") -notmatch 'Container smoke diagnostic: failureCode=CONTAINER_SMOKE_WRAPPER_UNCLASSIFIED') { throw 'TEST_SMOKE_WRAPPER_FALLBACK_DIAGNOSTIC_LOST' }
    Write-Host '[PASS] Unclassified smoke wrapper failure remains diagnosable'

    Remove-Item -LiteralPath $root -Recurse -Force
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ tools = { throw 'TOOL_BOOTSTRAP_PROVENANCE_FAILED' } }) -NoExit
    if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.failureCode -ne 'TOOL_BOOTSTRAP_PROVENANCE_FAILED') { throw 'TEST_TOOL_BOOTSTRAP_DETAIL_LOST' }
    Write-Host '[PASS] Tool bootstrap failure classification remains sanitized and specific'

    Remove-Item -LiteralPath $root -Recurse -Force
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ tools = { throw 'TOOL_BOOTSTRAP_TUF_REFRESH_FAILED' } }) -NoExit
    if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.failureCode -ne 'TOOL_BOOTSTRAP_TUF_REFRESH_FAILED') { throw 'TEST_TUF_REFRESH_DETAIL_LOST' }
    Write-Host '[PASS] Trusted-root refresh failures remain separately classified'

    foreach ($failureCode in @('TOOL_BOOTSTRAP_MODULE_LOAD_FAILED', 'TOOL_BOOTSTRAP_PLATFORM_RESOLUTION_FAILED', 'TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED', 'TOOL_BOOTSTRAP_WRAPPER_FAILED', 'TOOL_BOOTSTRAP_SCRIPT_RESOLUTION_FAILED', 'TOOL_BOOTSTRAP_SHELL_RESOLUTION_FAILED', 'TOOL_BOOTSTRAP_CHILD_LAUNCH_FAILED')) {
        Remove-Item -LiteralPath $root -Recurse -Force
        $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ tools = { throw $failureCode } }) -NoExit
        if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.failureCode -ne $failureCode) { throw "TEST_BOOTSTRAP_BOUNDARY_DETAIL_LOST:$failureCode" }
    }
    Write-Host '[PASS] Bootstrap boundary failures remain separately classified'

    if (-not (Test-Path -LiteralPath (Join-Path $root 'run-summary.json') -PathType Leaf)) { throw 'TEST_EVIDENCE_MISSING' }
    Write-Host '[PASS] Sanitized hosted evidence is written for failure paths'
} finally {
    if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
    foreach ($state in $inventoryStates) {
        if ($state.Existed) { [System.IO.File]::WriteAllBytes($state.Path, $state.Bytes) }
        elseif (Test-Path -LiteralPath $state.Path -PathType Leaf) { Remove-Item -LiteralPath $state.Path -Force }
    }
}
Write-Host 'Hosted supply-chain orchestration tests: PASS'
````


### api/scripts/supply-chain/Test-IdentityMavenWrapper.ps1

Original-byte SHA256: 58ec67a2cc11fcfadbb71c3bfd61fc129209ddbf538481b5fd8029583a2e4ff7

````powershell
#Requires -Version 5.1
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$serviceRoot = Join-Path $repoRoot 'services\identity-profile-service'
$wrapperPath = Join-Path $serviceRoot 'mvnw.cmd'
$temporaryMavenUserHome = Join-Path ([System.IO.Path]::GetTempPath()) ('auction-promax-maven-wrapper-' + [guid]::NewGuid().ToString('N'))

if (-not (Test-Path -LiteralPath $wrapperPath -PathType Leaf)) {
    throw 'Identity Maven Wrapper is missing.'
}

$previousMavenUserHome = $env:MAVEN_USER_HOME
try {
    New-Item -ItemType Directory -Path $temporaryMavenUserHome | Out-Null
    $env:MAVEN_USER_HOME = $temporaryMavenUserHome
    Push-Location $serviceRoot
    try {
        $output = @(& $env:ComSpec /d /c 'mvnw.cmd -v' 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }

    if ($exitCode -ne 0) {
        throw "Identity Maven Wrapper version command failed with exit code $exitCode."
    }
    if (-not ($output -match '^Apache Maven ')) {
        throw 'Identity Maven Wrapper did not report an Apache Maven version.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $temporaryMavenUserHome 'wrapper\dists') -PathType Container)) {
        throw 'Identity Maven Wrapper did not place its distribution below MAVEN_USER_HOME\wrapper\dists.'
    }

    Write-Output 'Identity Maven Wrapper: PASS'
} finally {
    $env:MAVEN_USER_HOME = $previousMavenUserHome
    if ((Split-Path -Leaf $temporaryMavenUserHome) -match '^auction-promax-maven-wrapper-[a-f0-9]{32}$' -and (Test-Path -LiteralPath $temporaryMavenUserHome)) {
        Remove-Item -LiteralPath $temporaryMavenUserHome -Recurse -Force
    }
}
````


### api/scripts/supply-chain/Test-IdentitySbom.ps1

Original-byte SHA256: fcf63f9802db6b329962445f0ca06d2361956b95db5d63ac02562a9a5fac84be

````powershell
#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$serviceRoot = Join-Path $repoRoot 'services\identity-profile-service'
$bomPath = Join-Path $serviceRoot 'target\bom.json'
$schemaRoot = Join-Path $repoRoot 'security\schemas\cyclonedx\1.6'
$trustManifestPath = Join-Path $repoRoot 'security\tooling\cyclonedx-schemas.json'
$trustTestPath = Join-Path $PSScriptRoot 'Test-CycloneDxSchemaTrust.mjs'
$fixtureTestPath = Join-Path $PSScriptRoot 'Test-IdentitySbomFixtures.mjs'
$validatorPath = Join-Path $PSScriptRoot 'Validate-IdentitySbom.mjs'

function Assert-RequiredFile {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$Name)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "$Name is missing."
    }
}

function Invoke-NodeGate {
    param(
        [Parameter(Mandatory)][string]$ScriptPath,
        [string[]]$Arguments = @(),
        [Parameter(Mandatory)][string]$Name
    )
    & node $ScriptPath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE."
    }
}

function Invoke-IdentityPackage {
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        Push-Location $serviceRoot
        try {
            if ($env:OS -eq 'Windows_NT') {
                $null = @(& cmd.exe /d /c 'mvnw.cmd -B clean package -DskipTests' 2>&1)
            } else {
                $null = @(& ./mvnw -B clean package -DskipTests 2>&1)
            }
            $exitCode = $LASTEXITCODE
        } finally {
            Pop-Location
        }
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($exitCode -ne 0) {
        throw "Maven Wrapper package build failed with exit code $exitCode."
    }
    if (-not (Test-Path -LiteralPath $bomPath -PathType Leaf)) {
        throw 'Maven Wrapper package build did not produce the canonical SBOM.'
    }
}

function Invoke-IdentitySbomValidator {
    param([string]$ReferenceBomPath)
    $arguments = @(
        '--bom', $bomPath,
        '--schema-root', $schemaRoot,
        '--trust-manifest', $trustManifestPath
    )
    if ($ReferenceBomPath) {
        $arguments += @('--reference-bom', $ReferenceBomPath)
    }
    Invoke-NodeGate -ScriptPath $validatorPath -Arguments $arguments -Name 'Identity SBOM validator'
}

function Get-Sha256Hex {
    param([Parameter(Mandatory)][string]$Path)

    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($stream)
        return -join ($hash | ForEach-Object { $_.ToString('x2') })
    } finally {
        $stream.Dispose()
    }
}

function New-SafeTemporaryDirectory {
    $directory = Join-Path ([System.IO.Path]::GetTempPath()) ('auction-promax-sbom-cycle2-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    return $directory
}

function Remove-SafeTemporaryDirectory {
    param([Parameter(Mandatory)][string]$Path)
    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $tempPath = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if (-not $fullPath.StartsWith($tempPath, [System.StringComparison]::OrdinalIgnoreCase) -or
        (Split-Path -Leaf $fullPath) -notmatch '^auction-promax-sbom-cycle2-[a-f0-9]{32}$') {
        throw 'Refusing to clean a path outside the Cycle 2 temporary directory convention.'
    }
    if (Test-Path -LiteralPath $fullPath) {
        Remove-Item -LiteralPath $fullPath -Recurse -Force -ErrorAction SilentlyContinue
    }
}

foreach ($required in @(
    @{ Path = $trustTestPath; Name = 'CycloneDX schema trust test' },
    @{ Path = $fixtureTestPath; Name = 'Identity SBOM fixture test' },
    @{ Path = $validatorPath; Name = 'Identity SBOM validator' },
    @{ Path = $trustManifestPath; Name = 'CycloneDX schema trust manifest' }
)) {
    Assert-RequiredFile -Path $required.Path -Name $required.Name
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js is required for Cycle 2 SBOM validation.'
}

Invoke-NodeGate -ScriptPath $trustTestPath -Name 'CycloneDX schema trust test'

if ($SkipBuild) {
    Assert-RequiredFile -Path $bomPath -Name 'Canonical SBOM for -SkipBuild'
    Invoke-IdentitySbomValidator
    Invoke-NodeGate -ScriptPath $fixtureTestPath -Name 'Identity SBOM fixture test'
    Write-Output 'Identity SBOM existing-artifact validation: PASS (no clean-build reproducibility claim)'
    exit 0
}

$temporaryRoot = New-SafeTemporaryDirectory
try {
    Invoke-IdentityPackage
    Invoke-IdentitySbomValidator
    Invoke-NodeGate -ScriptPath $fixtureTestPath -Name 'Identity SBOM fixture test'

    $buildOneBomPath = Join-Path $temporaryRoot 'build-1.json'
    Copy-Item -LiteralPath $bomPath -Destination $buildOneBomPath
    if ((Get-Sha256Hex -Path $bomPath) -ne (Get-Sha256Hex -Path $buildOneBomPath)) {
        throw 'Build-1 SBOM snapshot integrity verification failed.'
    }

    Invoke-IdentityPackage
    Invoke-IdentitySbomValidator -ReferenceBomPath $buildOneBomPath
    Write-Output 'Identity SBOM clean-build reproducibility: PASS'
} finally {
    Remove-SafeTemporaryDirectory -Path $temporaryRoot
}
````


### api/scripts/supply-chain/Test-IdentitySbomFixtures.mjs

Original-byte SHA256: faa27e6326afed6a8d0640ac8d1aac87eb6deb0ede05601a39c6800a44f64417

````javascript
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const canonicalBomPath = path.join(repoRoot, "services/identity-profile-service/target/bom.json");
const validatorPath = path.join(import.meta.dirname, "Validate-IdentitySbom.mjs");
const trustedSchemaRoot = path.join(repoRoot, "security/schemas/cyclonedx/1.6");
const trustedManifestPath = path.join(repoRoot, "security/tooling/cyclonedx-schemas.json");

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} is missing.`);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(`${label} is malformed JSON.`);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function writeJson(root, name, value) {
  const target = path.join(root, name);
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return target;
}

function writeFixture(root, name, mutate) {
  const value = clone(canonicalBom);
  mutate(value);
  return writeJson(root, `${name}.json`, value);
}

function rootDependencyIndex(value) {
  const rootRef = value.metadata?.component?.["bom-ref"];
  const index = value.dependencies?.findIndex((entry) => entry.ref === rootRef) ?? -1;
  if (!rootRef || index < 0) throw new Error("Canonical fixture does not contain the root dependency graph entry.");
  return index;
}

function assertScenario(name, bomPath, expectedValid, options = {}, expectedFailureCode) {
  const args = [
    validatorPath,
    "--bom", bomPath,
    "--schema-root", options.schemaRoot ?? fixtureSchemaRoot,
    "--trust-manifest", options.trustManifest ?? fixtureManifestPath,
  ];
  if (options.referenceBom) args.push("--reference-bom", options.referenceBom);
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  const valid = result.status === 0;
  if (valid !== expectedValid) {
    throw new Error(`${name}: expected valid=${expectedValid}, got valid=${valid}.`);
  }
  if (!expectedValid) {
    const expectedOutput = "Identity SBOM validation: FAIL (" + expectedFailureCode + ")";
    if (!expectedFailureCode || !result.stderr.includes(expectedOutput)) {
      throw new Error(name + ": expected failure code " + expectedFailureCode + ", got " + JSON.stringify(result.stderr) + ".");
    }
  }
  process.stdout.write(`[PASS] ${name}\n`);
}

function assertArgumentFailure(name, args, expectedFailureCode) {
  const result = spawnSync(process.execPath, [validatorPath, ...args], { encoding: "utf8" });
  const expectedOutput = "Identity SBOM validation: FAIL (" + expectedFailureCode + ")";
  if (result.status === 0 || !result.stderr.includes(expectedOutput)) {
    throw new Error(name + ": expected failure code " + expectedFailureCode + ", got " + JSON.stringify(result.stderr) + ".");
  }
  process.stdout.write(`[PASS] ${name}\n`);
}

const canonicalBom = readJson(canonicalBomPath, "Canonical generated SBOM fixture source");
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "auction-promax-sbom-fixture-"));
const fixtureSchemaRoot = path.join(temporaryRoot, "schemas");
const fixtureManifestPath = path.join(temporaryRoot, "cyclonedx-schemas.json");

try {
  fs.cpSync(trustedSchemaRoot, fixtureSchemaRoot, { recursive: true, errorOnExist: true });
  fs.copyFileSync(trustedManifestPath, fixtureManifestPath);

  const canonicalFixture = writeJson(temporaryRoot, "canonical.json", canonicalBom);
  const emptyFixture = path.join(temporaryRoot, "empty.json");
  const malformedFixture = path.join(temporaryRoot, "malformed.json");
  fs.writeFileSync(emptyFixture, "", "utf8");
  fs.writeFileSync(malformedFixture, "{ not valid json", "utf8");

  const fixtures = [
    ["Canonical SBOM accepted", canonicalFixture, true],
    ["Missing SBOM rejected", path.join(temporaryRoot, "does-not-exist.json"), false],
    ["Empty SBOM rejected", emptyFixture, false],
    ["Malformed SBOM rejected", malformedFixture, false],
    ["Wrong bomFormat rejected", writeFixture(temporaryRoot, "wrong-bom-format", (value) => { value.bomFormat = "SPDX"; }), false],
    ["Wrong specVersion rejected", writeFixture(temporaryRoot, "wrong-spec-version", (value) => { value.specVersion = "1.5"; }), false],
    ["Missing root component rejected", writeFixture(temporaryRoot, "missing-root", (value) => { delete value.metadata.component; }), false],
    ["Wrong root type rejected", writeFixture(temporaryRoot, "wrong-root-type", (value) => { value.metadata.component.type = "library"; }), false],
    ["Wrong root group rejected", writeFixture(temporaryRoot, "wrong-root-group", (value) => { value.metadata.component.group = "example.invalid"; }), false],
    ["Wrong root name rejected", writeFixture(temporaryRoot, "wrong-root-name", (value) => { value.metadata.component.name = "wrong-service"; }), false],
    ["Wrong root version rejected", writeFixture(temporaryRoot, "wrong-root-version", (value) => { value.metadata.component.version = "9.9.9"; }), false],
    ["Missing component inventory rejected", writeFixture(temporaryRoot, "missing-components", (value) => { delete value.components; }), false],
    ["Empty component inventory rejected", writeFixture(temporaryRoot, "empty-components", (value) => { value.components = []; }), false],
    ["Missing dependency graph rejected", writeFixture(temporaryRoot, "missing-dependencies", (value) => { delete value.dependencies; }), false],
    ["Empty dependency graph rejected", writeFixture(temporaryRoot, "empty-dependencies", (value) => { value.dependencies = []; }), false],
    ["Missing root dependency rejected", writeFixture(temporaryRoot, "missing-root-dependency", (value) => { value.dependencies.splice(rootDependencyIndex(value), 1); }), false],
    ["Duplicate component reference rejected", writeFixture(temporaryRoot, "duplicate-component-ref", (value) => { value.components[1]["bom-ref"] = value.components[0]["bom-ref"]; }), false],
    ["Duplicate dependency reference rejected", writeFixture(temporaryRoot, "duplicate-dependency-ref", (value) => { value.dependencies[1].ref = value.dependencies[0].ref; }), false],
    ["Unknown dependency reference rejected", writeFixture(temporaryRoot, "unknown-dependency-ref", (value) => {
      const index = rootDependencyIndex(value) === 0 ? 1 : 0;
      value.dependencies[index].ref = "pkg:maven/example.invalid/missing@1.0.0?type=jar";
    }), false],
    ["Known test-only component rejected", writeFixture(temporaryRoot, "test-only-component", (value) => {
      const component = clone(value.components[0]);
      component.group = "org.junit.jupiter";
      component.name = "junit-jupiter";
      component.version = "5.12.0";
      component["bom-ref"] = "pkg:maven/org.junit.jupiter/junit-jupiter@5.12.0?type=jar";
      component.purl = "pkg:maven/org.junit.jupiter/junit-jupiter@5.12.0?type=jar";
      value.components.push(component);
    }), false],
    ["Testcontainers component rejected", writeFixture(temporaryRoot, "testcontainers-component", (value) => {
      const component = clone(value.components[0]);
      component.group = "org.testcontainers";
      component.name = "postgresql";
      component.version = "1.21.0";
      component["bom-ref"] = "pkg:maven/org.testcontainers/postgresql@1.21.0?type=jar";
      component.purl = component["bom-ref"];
      value.components.push(component);
    }), false],
    ["ArchUnit component rejected", writeFixture(temporaryRoot, "archunit-component", (value) => {
      const component = clone(value.components[0]);
      component.group = "com.tngtech.archunit";
      component.name = "archunit-junit5";
      component.version = "1.4.1";
      component["bom-ref"] = "pkg:maven/com.tngtech.archunit/archunit-junit5@1.4.1?type=jar";
      component.purl = component["bom-ref"];
      value.components.push(component);
    }), false]
  ];

  const missingReferenceRoot = path.join(temporaryRoot, "schemas-missing-spdx");
  fs.cpSync(fixtureSchemaRoot, missingReferenceRoot, { recursive: true });
  fs.rmSync(path.join(missingReferenceRoot, "spdx.schema.json"));
  fixtures.push(["Missing referenced schema rejected", canonicalFixture, false, { schemaRoot: missingReferenceRoot }]);

  const missingJsfReferenceRoot = path.join(temporaryRoot, "schemas-missing-jsf");
  fs.cpSync(fixtureSchemaRoot, missingJsfReferenceRoot, { recursive: true });
  fs.rmSync(path.join(missingJsfReferenceRoot, "jsf-0.82.schema.json"));
  fixtures.push(["Missing JSF referenced schema rejected", canonicalFixture, false, { schemaRoot: missingJsfReferenceRoot }]);

  const alteredManifest = readJson(fixtureManifestPath, "Fixture trust manifest");
  alteredManifest.assets[0].sha256 = "a".repeat(64);
  const alteredManifestPath = writeJson(temporaryRoot, "tampered-trust-manifest.json", alteredManifest);
  fixtures.push(["Trust manifest checksum mismatch rejected", canonicalFixture, false, { trustManifest: alteredManifestPath }]);

  const volatileReference = clone(canonicalBom);
  volatileReference.serialNumber = "urn:uuid:00000000-0000-0000-0000-000000000001";
  volatileReference.metadata.timestamp = "2000-01-01T00:00:00Z";
  const volatileReferencePath = writeJson(temporaryRoot, "volatile-reference.json", volatileReference);
  fixtures.push(["Serial and timestamp-only difference accepted", canonicalFixture, true, { referenceBom: volatileReferencePath }]);

  const semanticDrift = clone(canonicalBom);
  semanticDrift.components[0].version = "9999.0.0";
  const semanticDriftPath = writeJson(temporaryRoot, "semantic-drift.json", semanticDrift);
  fixtures.push(["Component version drift rejected", canonicalFixture, false, { referenceBom: semanticDriftPath }]);

  const reorderedReference = clone(canonicalBom);
  reorderedReference.components.reverse();
  reorderedReference.dependencies.reverse();
  for (const dependency of reorderedReference.dependencies) dependency.dependsOn?.reverse();
  const reorderedReferencePath = writeJson(temporaryRoot, "reordered-reference.json", reorderedReference);
  fixtures.push(["Order-only difference accepted", canonicalFixture, true, { referenceBom: reorderedReferencePath }]);

  const dependencyEdgeDrift = clone(canonicalBom);
  const dependencyWithChildren = dependencyEdgeDrift.dependencies.find((dependency) => Array.isArray(dependency.dependsOn));
  if (!dependencyWithChildren) throw new Error("Canonical fixture does not contain a dependency edge.");
  dependencyWithChildren.dependsOn.push("pkg:maven/example.invalid/missing-edge@1.0.0?type=jar");
  const dependencyEdgeDriftPath = writeJson(temporaryRoot, "dependency-edge-drift.json", dependencyEdgeDrift);
  fixtures.push(["Unknown dependency edge rejected", dependencyEdgeDriftPath, false]);

  const semanticDependencyEdgeDrift = clone(canonicalBom);
  const semanticDependency = semanticDependencyEdgeDrift.dependencies.find((dependency) => dependency.dependsOn?.length > 0);
  if (!semanticDependency) throw new Error("Canonical fixture does not contain a dependency edge for semantic comparison.");
  const alternateReference = semanticDependencyEdgeDrift.components
    .map((component) => component["bom-ref"])
    .find((reference) => reference !== semanticDependency.dependsOn[0]);
  if (!alternateReference) throw new Error("Canonical fixture does not contain an alternate component reference.");
  semanticDependency.dependsOn[0] = alternateReference;
  const semanticDependencyEdgeDriftPath = writeJson(temporaryRoot, "semantic-dependency-edge-drift.json", semanticDependencyEdgeDrift);
  fixtures.push(["Dependency edge semantic drift rejected", canonicalFixture, false, { referenceBom: semanticDependencyEdgeDriftPath }]);

  if (!fs.existsSync(validatorPath)) {
    throw new Error("RED: Validate-IdentitySbom.mjs is not implemented; Cycle 2 fixtures are ready for the validator step.");
  }

  const expectedFailureCodes = new Map([
    ["Missing SBOM rejected", "SBOM_MISSING_OR_EMPTY"],
    ["Empty SBOM rejected", "SBOM_MISSING_OR_EMPTY"],
    ["Malformed SBOM rejected", "SBOM_MALFORMED"],
    ["Wrong bomFormat rejected", "SBOM_SCHEMA_VALIDATION_FAILED"],
    ["Wrong specVersion rejected", "INVALID_SPEC_VERSION"],
    ["Missing root component rejected", "ROOT_COMPONENT_MISSING"],
    ["Wrong root type rejected", "ROOT_COMPONENT_TYPE_INVALID"],
    ["Wrong root group rejected", "ROOT_COMPONENT_GROUP_INVALID"],
    ["Wrong root name rejected", "ROOT_COMPONENT_NAME_INVALID"],
    ["Wrong root version rejected", "ROOT_COMPONENT_VERSION_INVALID"],
    ["Missing component inventory rejected", "COMPONENT_INVENTORY_EMPTY"],
    ["Empty component inventory rejected", "COMPONENT_INVENTORY_EMPTY"],
    ["Missing dependency graph rejected", "DEPENDENCY_GRAPH_EMPTY"],
    ["Empty dependency graph rejected", "DEPENDENCY_GRAPH_EMPTY"],
    ["Missing root dependency rejected", "ROOT_DEPENDENCY_MISSING"],
    ["Duplicate component reference rejected", "DUPLICATE_COMPONENT_REFERENCE"],
    ["Duplicate dependency reference rejected", "DUPLICATE_DEPENDENCY_REFERENCE"],
    ["Unknown dependency reference rejected", "DEPENDENCY_REFERENCE_UNKNOWN"],
    ["Known test-only component rejected", "TEST_SCOPE_COMPONENT_PRESENT"],
    ["Testcontainers component rejected", "TEST_SCOPE_COMPONENT_PRESENT"],
    ["ArchUnit component rejected", "TEST_SCOPE_COMPONENT_PRESENT"],
    ["Missing referenced schema rejected", "REFERENCED_SCHEMA_MISSING"],
    ["Missing JSF referenced schema rejected", "REFERENCED_SCHEMA_MISSING"],
    ["Trust manifest checksum mismatch rejected", "TRUST_MANIFEST_INVALID"],
    ["Component version drift rejected", "SBOM_SEMANTIC_REPRODUCIBILITY_FAILED"],
    ["Unknown dependency edge rejected", "DEPENDENCY_EDGE_REFERENCE_UNKNOWN"],
    ["Dependency edge semantic drift rejected", "SBOM_SEMANTIC_REPRODUCIBILITY_FAILED"]
  ]);
  for (const [name, bomPath, expectedValid, options] of fixtures) {
    assertScenario(name, bomPath, expectedValid, options, expectedFailureCodes.get(name));
  }
  const canonicalArguments = ["--bom", canonicalFixture, "--schema-root", fixtureSchemaRoot, "--trust-manifest", fixtureManifestPath];
  assertArgumentFailure("Duplicate CLI argument rejected", [...canonicalArguments, "--bom", canonicalFixture], "INVALID_ARGUMENTS");
  assertArgumentFailure("Unsupported CLI argument rejected", [...canonicalArguments, "--unexpected", "value"], "UNSUPPORTED_ARGUMENT");
  process.stdout.write("Identity SBOM fixture tests: PASS\n");
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
````


### api/scripts/supply-chain/Test-LinuxHostedPowerShellExecutable.ps1

Original-byte SHA256: 698174543a48d164fdb4d1649a93d7109e04eabea6e3b681f69cfd2c9bad77ea

````powershell
#Requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Linux)) {
    throw 'LINUX_TEST_REQUIRED'
}

Import-Module (Join-Path $PSScriptRoot 'HostedSupplyChain.psm1') -Force
$powerShell = Get-HostedChildPowerShellExecutable
if ([System.IO.Path]::GetFileName($powerShell) -ne 'pwsh') { throw 'HOSTED_LINUX_PWSH_RESOLUTION_INVALID' }

$output = @(& $powerShell -NoProfile -Command '$PSVersionTable.PSEdition')
if ($LASTEXITCODE -ne 0 -or $output -notcontains 'Core') { throw 'HOSTED_LINUX_PWSH_EXECUTION_INVALID' }

Write-Output 'Linux hosted child PowerShell resolution test: PASS'
````


### api/scripts/supply-chain/Test-LinuxToolExecutablePermission.ps1

Original-byte SHA256: 141b2b866c59fe5123e24b00f61500c8a179020e68dd5feeeaa28e67729cc950

````powershell
#Requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Linux)) {
    throw 'LINUX_TEST_REQUIRED'
}

Import-Module (Join-Path $PSScriptRoot 'SupplyChainTooling.psm1') -Force
$root = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-linux-tool-permission-' + [guid]::NewGuid().ToString('N'))
try {
    [void][System.IO.Directory]::CreateDirectory($root)
    $tool = Join-Path $root 'fixture-tool'
    [System.IO.File]::WriteAllText($tool, "#!/bin/sh`necho fixture-tool`n", [System.Text.UTF8Encoding]::new($false))
    & chmod -x -- $tool
    if ($LASTEXITCODE -ne 0) { throw 'TEST_FIXTURE_PERMISSION_SETUP_FAILED' }

    Set-ToolExecutablePermission -Path $tool
    $output = @(& $tool)
    if ($LASTEXITCODE -ne 0 -or $output -ne 'fixture-tool') { throw 'TEST_EXECUTABLE_PERMISSION_NOT_APPLIED' }
    Write-Output 'Linux tool executable permission test: PASS'
} finally {
    if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
}
````


### api/scripts/supply-chain/Test-SupplyChainToolSchema.mjs

Original-byte SHA256: b8ec8d71d4b195e9818f944a5398da7f69f3e1a1281f67be9d202a412250a6da

````javascript
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const ajvPath = path.join(repoRoot, "contracts/node_modules/ajv/dist/2020.js");
if (!fs.existsSync(ajvPath)) {
  throw new Error("Pinned Ajv is missing; run npm ci in api/contracts before Cycle 1 schema tests.");
}
const { default: Ajv2020 } = await import(pathToFileURL(ajvPath).href);
const schemaPath = path.join(repoRoot, "security/schemas/supply-chain-tools.schema.json");
const manifestPath = path.join(repoRoot, "security/tooling/supply-chain-tools.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertSchemaResult(validate, name, mutate, expectedValid) {
  const candidate = clone(canonicalManifest);
  mutate(candidate);
  const actualValid = validate(candidate);
  if (actualValid !== expectedValid) {
    const errors = (validate.errors ?? []).map(({ instancePath, keyword }) => ({ instancePath, keyword }));
    throw new Error(`${name}: expected valid=${expectedValid}, got valid=${actualValid}; errors=${JSON.stringify(errors)}`);
  }
  process.stdout.write(`[PASS] ${name}\n`);
}

const schema = readJson(schemaPath);
const canonicalManifest = readJson(manifestPath);
const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
if (!ajv.validateSchema(schema)) {
  throw new Error(`Supply-chain schema is invalid: ${JSON.stringify(ajv.errors)}`);
}
const validate = ajv.compile(schema);

assertSchemaResult(validate, "Canonical manifest accepted by JSON Schema", () => {}, true);
assertSchemaResult(validate, "Gitleaks 8.30.1 rejected by JSON Schema", (m) => { m.tools[1].version = "8.30.1"; }, false);
assertSchemaResult(validate, "Placeholder SHA-256 rejected by JSON Schema", (m) => { m.tools[0].platforms["windows-x64"].sha256 = "0".repeat(64); }, false);
assertSchemaResult(validate, "Duplicate tool identity rejected by JSON Schema", (m) => { m.tools[1].name = "trivy"; }, false);
assertSchemaResult(validate, "Wrong Gitleaks release repository rejected by JSON Schema", (m) => { m.tools[1].officialReleaseBaseUrl = "https://github.com/evilcorp/evil/releases/download/v8.30.0"; }, false);
assertSchemaResult(validate, "Missing Cosign purpose rejected by JSON Schema", (m) => { delete m.tools[2].purpose; }, false);
assertSchemaResult(validate, "Trivy purpose rejected by JSON Schema", (m) => { m.tools[0].purpose = "release-provenance"; }, false);
assertSchemaResult(validate, "Missing Trivy Sigstore metadata rejected by JSON Schema", (m) => { delete m.tools[0].sigstore; }, false);
assertSchemaResult(validate, "Gitleaks Sigstore metadata rejected by JSON Schema", (m) => { m.tools[1].sigstore = clone(m.tools[0].sigstore); }, false);
assertSchemaResult(validate, "Wrong Sigstore bundle suffix rejected by JSON Schema", (m) => { m.tools[0].sigstore.bundleAssetSuffix = ".foo"; }, false);
assertSchemaResult(validate, "Wrong Sigstore certificate identity rejected by JSON Schema", (m) => { m.tools[0].sigstore.certificateIdentity = "https://github.com/other/repo/.github/workflows/release.yml@refs/tags/v9.9.9"; }, false);
assertSchemaResult(validate, "Wrong version command rejected by JSON Schema", (m) => { m.tools[1].versionArguments = ["nonsense"]; }, false);
assertSchemaResult(validate, "Permissive version pattern rejected by JSON Schema", (m) => { m.tools[1].versionPattern = "."; }, false);
assertSchemaResult(validate, "Partial-match Trivy version pattern rejected by JSON Schema", (m) => { m.tools[0].versionPattern = "Version: 0\\.74\\.0"; }, false);
assertSchemaResult(validate, "Partial-match Gitleaks version pattern rejected by JSON Schema", (m) => { m.tools[1].versionPattern = "^8\\.30\\.0"; }, false);
assertSchemaResult(validate, "Partial-match Cosign version pattern rejected by JSON Schema", (m) => { m.tools[2].versionPattern = "GitVersion:\\s*v3\\.1\\.2"; }, false);
assertSchemaResult(validate, "Wrong Trivy archive mapping rejected by JSON Schema", (m) => { m.tools[0].platforms["windows-x64"].archiveType = "binary"; }, false);
assertSchemaResult(validate, "Tool order drift rejected by JSON Schema", (m) => { [m.tools[0], m.tools[1]] = [m.tools[1], m.tools[0]]; }, false);

process.stdout.write("Supply-chain JSON Schema contract tests: PASS\n");
````


### api/scripts/supply-chain/Test-SupplyChainTooling.ps1

Original-byte SHA256: 0a2baf30cb0b3a669d34ed68d7f9a48e97f07bad76fc32a1ac0059f1a1204e99

````powershell
#Requires -Version 5.1
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:ModulePath = Join-Path $PSScriptRoot 'SupplyChainTooling.psm1'
$script:SchemaTestPath = Join-Path $PSScriptRoot 'Test-SupplyChainToolSchema.mjs'
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$script:CanonicalManifest = Join-Path $script:RepoRoot 'security\tooling\supply-chain-tools.json'
$script:Results = New-Object System.Collections.Generic.List[object]

# --- RED guard: module must exist before any case can be validated -----------------
if (-not (Test-Path -LiteralPath $script:ModulePath -PathType Leaf)) {
    Write-Output 'Expected manifest validation failures were not enforced.'
    exit 1
}

Import-Module $script:ModulePath -Force

$script:TestTempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("auction-promax-tool-test-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $script:TestTempRoot -Force | Out-Null

function Add-TestResult {
    param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][string]$Result, [string]$Detail)
    $script:Results.Add([pscustomobject]@{ Name = $Name; Result = $Result; Detail = $Detail })
}

function Invoke-TestCase {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][scriptblock]$Body,
        [switch]$Skip,
        [string]$SkipReason
    )
    if ($Skip) {
        Add-TestResult -Name $Name -Result 'SKIP' -Detail $SkipReason
        return
    }
    try {
        & $Body
        Add-TestResult -Name $Name -Result 'PASS'
    } catch {
        Add-TestResult -Name $Name -Result 'FAIL' -Detail $_.Exception.Message
    }
}

function Assert-Throws {
    param(
        [Parameter(Mandatory)][scriptblock]$Body,
        [string]$MatchPattern
    )
    $threw = $false
    try {
        & $Body | Out-Null
    } catch {
        $threw = $true
        if ($MatchPattern -and $_.Exception.Message -notmatch $MatchPattern) {
            throw "Expected an error matching '$MatchPattern' but got: $($_.Exception.Message)"
        }
    }
    if (-not $threw) {
        throw 'Expected an error but none was thrown.'
    }
}

function New-MutatedManifest {
    param([Parameter(Mandatory)][scriptblock]$Mutate, [Parameter(Mandatory)][string]$Tag)
    $m = Read-ToolManifest -ManifestPath $script:CanonicalManifest
    & $Mutate $m
    $tmp = Join-Path $script:TestTempRoot ("manifest-" + $Tag + ".json")
    ($m | ConvertTo-Json -Depth 24) | Set-Content -LiteralPath $tmp -Encoding ascii -NoNewline
    return $tmp
}

function Get-ToolIndex {
    param([Parameter(Mandatory)]$Manifest, [Parameter(Mandatory)][string]$ToolName)
    $idx = -1
    for ($i = 0; $i -lt @($Manifest.tools).Count; $i++) {
        if ($Manifest.tools[$i].name -eq $ToolName) { $idx = $i; break }
    }
    if ($idx -lt 0) { throw "Fixture helper: tool '$ToolName' not found." }
    return $idx
}

function New-TestFile {
    param([Parameter(Mandatory)][string]$RelativePath, [string]$Content = 'test-content')
    $full = Join-Path $script:TestTempRoot $RelativePath
    $parent = Split-Path -Parent $full
    if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    Set-Content -LiteralPath $full -Value $Content -Encoding ascii -NoNewline
    return $full
}

function New-TestZip {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][hashtable]$Entries
    )
    $parent = Split-Path -Parent $Path
    if ($parent -and -not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    Add-Type -AssemblyName System.IO.Compression -ErrorAction Stop
    $fs = [System.IO.File]::Open($Path, [System.IO.FileMode]::Create)
    try {
        $zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
        try {
            foreach ($key in $Entries.Keys) {
                $entry = $zip.CreateEntry($key)
                $writer = New-Object System.IO.StreamWriter($entry.Open())
                try { $writer.Write([string]$Entries[$key]) } finally { $writer.Dispose() }
            }
        } finally {
            $zip.Dispose()
        }
    } finally {
        $fs.Dispose()
    }
}

function Get-PowershellExecutablePath {
    $cmd = Get-Command powershell.exe -ErrorAction Stop
    return $cmd.Source
}

function New-VersionFixtureExecutable {
    param([string]$Output = 'Version: 9.9.9')
    $suffix = [guid]::NewGuid().ToString('N')
    if ($env:OS -eq 'Windows_NT') {
        $path = Join-Path $script:TestTempRoot ("version-fixture-$suffix.cmd")
        "@echo $Output" | Set-Content -LiteralPath $path -Encoding ascii
        return $path
    }
    $path = Join-Path $script:TestTempRoot ("version-fixture-$suffix.sh")
    "#!/bin/sh`nprintf '%s\n' '$Output'" | Set-Content -LiteralPath $path -Encoding ascii
    & chmod +x $path
    if ($LASTEXITCODE -ne 0) { throw 'Could not make version fixture executable.' }
    return $path
}

function New-FakeToolDefinition {
    param(
        [string]$AssetName = 'fake-asset.zip',
        [string]$AssetSha256,
        [string]$ExecutableName = 'powershell.exe',
        [string[]]$VersionArguments = @('-NoProfile', '-Command', 'Write-Output "Version: 9.9.9"'),
        [string]$VersionPattern = 'Version: 9\.9\.9'
    )
    return [pscustomobject]@{
        Name = 'fake-tool'
        Version = '9.9.9'
        Platform = 'windows-x64'
        AssetName = $AssetName
        Sha256 = $AssetSha256
        ArchiveType = 'zip'
        ExecutableName = $ExecutableName
        VersionArguments = $VersionArguments
        VersionPattern = $VersionPattern
    }
}

# ==================================================================================
# Test cases
# ==================================================================================

# --- Manifest validation ----------------------------------------------------------

Invoke-TestCase -Name 'PowerShell Core platform automatic variables are not shadowed' -Body {
    $violations = @(Get-ChildItem -LiteralPath $PSScriptRoot -File -Include '*.ps1','*.psm1' | ForEach-Object {
        $source = Get-Content -LiteralPath $_.FullName -Raw
        if ($source -match '(?i)\$(isWindows|isLinux|isMacOS|isCoreCLR)\s*=') { $_.Name }
    })
    if ($violations.Count -ne 0) { throw ('Automatic-variable assignments found in: ' + ($violations -join ', ')) }
}

Invoke-TestCase -Name 'Container prebuild selects Maven Wrapper for its host platform' -Body {
    $prebuildPath = Join-Path $PSScriptRoot 'Invoke-ContainerPrebuildArtifact.ps1'
    if (-not (Test-Path -LiteralPath $prebuildPath -PathType Leaf)) {
        throw 'Container prebuild script is missing.'
    }

    $prebuildSource = Get-Content -LiteralPath $prebuildPath -Raw
    if ($prebuildSource -match '\bJoin-Path\s+\$serviceRoot\s+''mvnw\.cmd''') {
        throw 'Container prebuild hard-codes the Windows Maven Wrapper.'
    }
    if ($prebuildSource -notmatch '\$wrapperName\s*=\s*if\s*\(\$runningOnWindows\)\s*\{\s*''mvnw\.cmd''\s*\}\s*else\s*\{\s*''mvnw''\s*\}') {
        throw 'Container prebuild does not select Maven Wrapper by host platform.'
    }
    if ($prebuildSource -notmatch '&\s+\$wrapperPath\s+-B\s+clean\s+verify') {
        throw 'Container prebuild does not invoke the selected Maven Wrapper.'
    }
}

Invoke-TestCase -Name 'Container prebuild preserves Unix Maven Wrapper execute mode' -Body {
    $indexEntry = @(& git -c "safe.directory=$script:RepoRoot" -C $script:RepoRoot ls-files -s -- 'services/identity-profile-service/mvnw')
    if ($LASTEXITCODE -ne 0 -or $indexEntry.Count -ne 1 -or $indexEntry[0] -notmatch '^100755\s+[a-f0-9]{40}\s+0\s+services/identity-profile-service/mvnw$') {
        throw 'Maven Wrapper is not tracked with Unix executable mode 100755.'
    }
}

Invoke-TestCase -Name 'Canonical manifest validation' -Body {
    $null = Test-ToolManifest -ManifestPath $script:CanonicalManifest
}

Invoke-TestCase -Name 'Pinned JSON Schema contract validation' -Body {
    if (-not (Test-Path -LiteralPath $script:SchemaTestPath -PathType Leaf)) {
        throw 'Supply-chain JSON Schema contract test is missing.'
    }
    & node $script:SchemaTestPath
    if ($LASTEXITCODE -ne 0) {
        throw "Supply-chain JSON Schema contract test failed with exit code $LASTEXITCODE."
    }
}

Invoke-TestCase -Name 'Missing manifest rejected' -Body {
    $missing = Join-Path $script:TestTempRoot 'does-not-exist.json'
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $missing } -MatchPattern 'not found'
}

Invoke-TestCase -Name 'Empty manifest rejected' -Body {
    $empty = Join-Path $script:TestTempRoot 'empty-manifest.json'
    '' | Set-Content -LiteralPath $empty -Encoding ascii -NoNewline
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $empty } -MatchPattern 'empty'
}

Invoke-TestCase -Name 'Malformed JSON manifest rejected' -Body {
    $bad = Join-Path $script:TestTempRoot 'malformed-manifest.json'
    '{ this is not json' | Set-Content -LiteralPath $bad -Encoding ascii
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $bad } -MatchPattern 'not valid JSON'
}

Invoke-TestCase -Name 'Missing checksum rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'missing-checksum' -Mutate {
        param($m)
        $null = $m.tools[(Get-ToolIndex $m 'trivy')].platforms.'windows-x64'.PSObject.Properties.Remove('sha256')
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'sha256'
}

Invoke-TestCase -Name 'Short checksum rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'short-checksum' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].platforms.'windows-x64'.sha256 = 'a' * 63
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'sha256'
}

Invoke-TestCase -Name 'Non-hex checksum rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'nonhex-checksum' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].platforms.'windows-x64'.sha256 = ('g' * 63) + 'a'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'sha256'
}

Invoke-TestCase -Name 'Placeholder checksum rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'placeholder-checksum' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].platforms.'windows-x64'.sha256 = '0' * 64
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'placeholder'
}

Invoke-TestCase -Name 'Floating version rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'floating-version' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].version = 'latest'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'latest|version'
}

Invoke-TestCase -Name 'Unpinned Gitleaks version rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'gitleaks-8-30-1' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'gitleaks')].version = '8.30.1'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'pinned'
}

Invoke-TestCase -Name 'HTTP release URL rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'http-url' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].officialReleaseBaseUrl = $m.tools[(Get-ToolIndex $m 'trivy')].officialReleaseBaseUrl -replace '^https://', 'http://'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'HTTPS'
}

Invoke-TestCase -Name 'Non-GitHub release host rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'bad-host' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].officialReleaseBaseUrl = 'https://example.com/aquasecurity/trivy/releases/download/v0.74.0'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'github\.com'
}

Invoke-TestCase -Name 'Mismatched repository path rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'bad-repo-path' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].officialReleaseBaseUrl = 'https://github.com/evil-org/trivy/releases/download/v0.74.0'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'path'
}

Invoke-TestCase -Name 'Unsupported platform rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'bad-platform' -Mutate {
        param($m)
        $copy = $m.tools[(Get-ToolIndex $m 'trivy')].platforms.'windows-x64'
        $m.tools[(Get-ToolIndex $m 'trivy')].platforms | Add-Member -NotePropertyName 'darwin-arm64' -NotePropertyValue $copy
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'platform'
}

Invoke-TestCase -Name 'Traversal asset name rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'traversal-asset' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].platforms.'windows-x64'.assetName = '../evil.zip'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'assetName'
}

Invoke-TestCase -Name 'Trivy missing Sigstore metadata rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'trivy-no-sigstore' -Mutate {
        param($m)
        $null = $m.tools[(Get-ToolIndex $m 'trivy')].PSObject.Properties.Remove('sigstore')
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'Sigstore|sigstore'
}

Invoke-TestCase -Name 'Trivy wrong issuer rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'trivy-bad-issuer' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].sigstore.certificateOidcIssuer = 'https://token.actions.evil.example.com'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'certificateOidcIssuer'
}

Invoke-TestCase -Name 'Trivy wrong identity rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'trivy-bad-identity' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].sigstore.certificateIdentity = 'https://github.com/aquasecurity/trivy/.github/workflows/reusable-release.yaml@refs/tags/v0.73.0'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'certificateIdentity'
}

Invoke-TestCase -Name 'Trivy latest-tag identity rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'trivy-latest-identity' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].sigstore.certificateIdentity = 'https://github.com/aquasecurity/trivy/.github/workflows/reusable-release.yaml@refs/tags/latest'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'certificateIdentity'
}

Invoke-TestCase -Name 'Cosign image-signing purpose rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'cosign-image-signing' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'cosign')].purpose = 'image-signing'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'purpose'
}

Invoke-TestCase -Name 'Extra property rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'extra-property' -Mutate {
        param($m)
        $m | Add-Member -NotePropertyName 'unexpectedField' -NotePropertyValue 'x'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'unknown property'
}

# --- Checksum, extraction, version, and cache -------------------------------------

Invoke-TestCase -Name 'Correct hash accepted' -Body {
    $file = New-TestFile -RelativePath 'hash\correct.bin' -Content 'correct-content'
    $hash = Get-FileSha256 -Path $file
    Assert-ExpectedSha256 -Path $file -ExpectedSha256 $hash
}

Invoke-TestCase -Name 'Wrong hash rejected before execution' -Body {
    $file = New-TestFile -RelativePath 'hash\wrong.bin' -Content 'correct-content'
    $wrong = 'a' * 64
    Assert-Throws -Body { Assert-ExpectedSha256 -Path $file -ExpectedSha256 $wrong } -MatchPattern 'Checksum mismatch'
}

Invoke-TestCase -Name 'Missing file rejected' -Body {
    $missing = Join-Path $script:TestTempRoot 'hash\does-not-exist.bin'
    Assert-Throws -Body { Assert-ExpectedSha256 -Path $missing -ExpectedSha256 ('a' * 64) } -MatchPattern 'not found'
}

Invoke-TestCase -Name 'Partial download cache rejected' -Body {
    $cacheDir = Join-Path $script:TestTempRoot 'cache\partial'
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
    $null = New-TestFile -RelativePath 'cache\partial\fake-asset.zip.partial' -Content ''
    $goodContent = 'real-asset-content'
    $assetFile = New-TestFile -RelativePath 'hash\partial-asset.bin' -Content $goodContent
    $def = New-FakeToolDefinition -AssetSha256 (Get-FileSha256 -Path $assetFile)
    Assert-Throws -Body { Assert-CachedTool -Definition $def -CacheDir $cacheDir } -MatchPattern 'partial'
}

Invoke-TestCase -Name 'Corrupted cache rejected' -Body {
    $cacheDir = Join-Path $script:TestTempRoot 'cache\corrupt'
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $cacheDir 'fake-asset.zip') -Value 'tampered-content' -Encoding ascii -NoNewline
    Set-Content -LiteralPath (Join-Path $cacheDir 'powershell.exe') -Value 'fake-executable' -Encoding ascii -NoNewline
    $expectedHash = Get-FileSha256 -Path (New-TestFile -RelativePath 'hash\corrupt-expected.bin' -Content 'expected-content')
    $def = New-FakeToolDefinition -AssetSha256 $expectedHash
    Assert-Throws -Body { Assert-CachedTool -Definition $def -CacheDir $cacheDir } -MatchPattern 'Checksum mismatch|integrity'
}

Invoke-TestCase -Name 'Archive missing executable rejected' -Body {
    $zip = Join-Path $script:TestTempRoot 'archive\no-executable.zip'
    New-TestZip -Path $zip -Entries @{ 'readme.txt' = 'no executable here' }
    $dest = Join-Path $script:TestTempRoot 'archive\no-executable-out'
    Assert-Throws -Body {
        Expand-VerifiedToolArchive -ArchivePath $zip -ArchiveType 'zip' -DestinationPath $dest -ExpectedExecutableName 'trivy.exe'
    } -MatchPattern 'does not contain expected executable'
}

Invoke-TestCase -Name 'Unsafe archive entry rejected (traversal)' -Body {
    $zip = Join-Path $script:TestTempRoot 'archive\traversal.zip'
    New-TestZip -Path $zip -Entries @{ '../evil.txt' = 'evil' }
    Assert-Throws -Body { Assert-SafeArchiveEntries -ArchivePath $zip -ArchiveType 'zip' } -MatchPattern 'traversal|Unsafe'
}

Invoke-TestCase -Name 'Unsafe archive entry rejected (drive path)' -Body {
    $zip = Join-Path $script:TestTempRoot 'archive\drivepath.zip'
    New-TestZip -Path $zip -Entries @{ 'C:/evil.txt' = 'evil' }
    Assert-Throws -Body { Assert-SafeArchiveEntries -ArchivePath $zip -ArchiveType 'zip' } -MatchPattern 'Unsafe'
}

Invoke-TestCase -Name 'Resolved executable outside expected root rejected' -Body {
    $root = Join-Path $script:TestTempRoot 'pathcheck\root'
    New-Item -ItemType Directory -Path $root -Force | Out-Null
    $outside = Join-Path $script:TestTempRoot 'pathcheck\evil.exe'
    Assert-Throws -Body { Assert-PathWithinRoot -Path $outside -Root $root } -MatchPattern 'outside expected root'
}

Invoke-TestCase -Name 'Wrong executable version rejected' -Body {
    $versionFixture = New-VersionFixtureExecutable
    Assert-Throws -Body {
        Assert-ToolVersion -ExecutablePath $versionFixture -VersionArguments @('--version') -VersionPattern 'Version: 0\.74\.0'
    } -MatchPattern 'does not match expected pattern'
}

Invoke-TestCase -Name 'Trivy version suffix rejected' -Body {
    $versionFixture = New-VersionFixtureExecutable -Output 'Version: 0.74.01'
    Assert-Throws -Body {
        Assert-ToolVersion -ExecutablePath $versionFixture -VersionArguments @('--version') -VersionPattern '(?m)^Version:[ \t]*0\.74\.0[ \t]*\r?$'
    } -MatchPattern 'does not match expected pattern'
}

Invoke-TestCase -Name 'Gitleaks version qualifier rejected' -Body {
    $versionFixture = New-VersionFixtureExecutable -Output '8.30.0-dev'
    Assert-Throws -Body {
        Assert-ToolVersion -ExecutablePath $versionFixture -VersionArguments @('--version') -VersionPattern '(?m)^8\.30\.0[ \t]*\r?$'
    } -MatchPattern 'does not match expected pattern'
}

Invoke-TestCase -Name 'Cosign version suffix rejected' -Body {
    $versionFixture = New-VersionFixtureExecutable -Output 'GitVersion:    v3.1.20'
    Assert-Throws -Body {
        Assert-ToolVersion -ExecutablePath $versionFixture -VersionArguments @('--version') -VersionPattern '(?m)^GitVersion:[ \t]*v3\.1\.2[ \t]*\r?$'
    } -MatchPattern 'does not match expected pattern'
}

Invoke-TestCase -Name 'Archive with duplicate executable names rejected' -Body {
    $zip = Join-Path $script:TestTempRoot 'archive\duplicate-executable.zip'
    New-TestZip -Path $zip -Entries @{
        'first/tool.exe' = 'first'
        'second/tool.exe' = 'second'
    }
    $dest = Join-Path $script:TestTempRoot 'archive\duplicate-executable-out'
    Assert-Throws -Body {
        Expand-VerifiedToolArchive -ArchivePath $zip -ArchiveType 'zip' -DestinationPath $dest -ExpectedExecutableName 'tool.exe'
    } -MatchPattern 'multiple expected executables'
}

Invoke-TestCase -Name 'Cached executable matching verified archive accepted' -Body {
    $cacheDir = Join-Path $script:TestTempRoot 'cache\executable-match'
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
    $asset = Join-Path $cacheDir 'fake-asset.zip'
    New-TestZip -Path $asset -Entries @{ 'bin/tool.cmd' = '@echo Version: 9.9.9' }
    Set-Content -LiteralPath (Join-Path $cacheDir 'tool.cmd') -Value '@echo Version: 9.9.9' -Encoding ascii -NoNewline
    $def = New-FakeToolDefinition -AssetSha256 (Get-FileSha256 -Path $asset) -ExecutableName 'tool.cmd' -VersionArguments @('--version')
    $resolved = Assert-CachedTool -Definition $def -CacheDir $cacheDir
    if ($resolved -ne (Join-Path $cacheDir 'tool.cmd')) { throw 'Unexpected cached executable path.' }
}

Invoke-TestCase -Name 'Cached executable tampering rejected' -Body {
    $cacheDir = Join-Path $script:TestTempRoot 'cache\executable-tamper'
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
    $asset = Join-Path $cacheDir 'fake-asset.zip'
    New-TestZip -Path $asset -Entries @{ 'bin/tool.cmd' = '@echo Version: 9.9.9' }
    Set-Content -LiteralPath (Join-Path $cacheDir 'tool.cmd') -Value '@echo Version: 9.9.9 & rem tampered' -Encoding ascii -NoNewline
    $def = New-FakeToolDefinition -AssetSha256 (Get-FileSha256 -Path $asset) -ExecutableName 'tool.cmd' -VersionArguments @('--version')
    Assert-Throws -Body { Assert-CachedTool -Definition $def -CacheDir $cacheDir } -MatchPattern 'integrity'
}

Invoke-TestCase -Name 'Correct executable version accepted' -Body {
    $versionFixture = New-VersionFixtureExecutable
    Assert-ToolVersion -ExecutablePath $versionFixture -VersionArguments @('--version') -VersionPattern 'Version: 9\.9\.9'
}

Invoke-TestCase -Name 'Unsupported archive type rejected' -Body {
    $file = New-TestFile -RelativePath 'archive\bad-type.bin' -Content 'x'
    Assert-Throws -Body { Assert-SafeArchiveEntries -ArchivePath $file -ArchiveType '7z' } -MatchPattern 'Unsupported archive type'
}

# --- Trivy Sigstore provenance ------------------------------------------------------

$script:Platform = Resolve-SupportedPlatform
$script:ToolsRoot = Join-Path $script:RepoRoot '.tools\supply-chain'
$script:TrivyDef = Get-ExpectedToolDefinition -ToolName 'trivy' -Platform $script:Platform -ManifestPath $script:CanonicalManifest
$script:CosignDef = Get-ExpectedToolDefinition -ToolName 'cosign' -Platform $script:Platform -ManifestPath $script:CanonicalManifest

$script:TrivyCacheDir = Get-ToolCacheDirectory -ToolsRoot $script:ToolsRoot -ToolName $script:TrivyDef.Name -Version $script:TrivyDef.Version -Platform $script:Platform
$script:CosignCacheDir = Get-ToolCacheDirectory -ToolsRoot $script:ToolsRoot -ToolName $script:CosignDef.Name -Version $script:CosignDef.Version -Platform $script:Platform
$script:CachedTrivyAsset = Join-Path $script:TrivyCacheDir $script:TrivyDef.AssetName
$script:CachedTrivyBundle = Join-Path $script:TrivyCacheDir ($script:TrivyDef.AssetName + $script:TrivyDef.BundleAssetSuffix)
$script:CachedCosign = Join-Path $script:CosignCacheDir $script:CosignDef.ExecutableName
$script:CachedTrustedRoot = Join-Path $script:ToolsRoot 'sigstore-home\.sigstore\root\tuf-repo-cdn.sigstore.dev\targets\trusted_root.json'
$script:ProvenanceCacheReady = (Test-Path -LiteralPath $script:CachedTrivyAsset) -and (Test-Path -LiteralPath $script:CachedTrivyBundle) -and (Test-Path -LiteralPath $script:CachedCosign) -and (Test-Path -LiteralPath $script:CachedTrustedRoot)

function Flip-ByteInFile {
    param(
        [Parameter(Mandatory)][string]$SourcePath,
        [Parameter(Mandatory)][string]$TargetPath
    )
    $bytes = [System.IO.File]::ReadAllBytes($SourcePath)
    if ($bytes.Length -lt 1) { throw 'Cannot tamper an empty file.' }
    $mid = [int]($bytes.Length / 2)
    $bytes[$mid] = $bytes[$mid] -bxor 0xFF
    [System.IO.File]::WriteAllBytes($TargetPath, $bytes)
}

Invoke-TestCase -Name 'Missing cosign executable rejected' -Body {
    $fakeAsset = New-TestFile -RelativePath 'provenance\asset.bin' -Content 'asset'
    $fakeBundle = New-TestFile -RelativePath 'provenance\bundle.json' -Content '{}'
    $missingCosign = Join-Path $script:TestTempRoot 'provenance\no-cosign.exe'
    Assert-Throws -Body {
        Test-TrivyProvenance -CosignPath $missingCosign -AssetPath $fakeAsset -BundlePath $fakeBundle -CertificateOidcIssuer $script:TrivyDef.CertificateOidcIssuer -CertificateIdentity $script:TrivyDef.CertificateIdentity
    } -MatchPattern 'not found'
}

Invoke-TestCase -Name 'Missing Trivy bundle rejected' -Body {
    $fakeAsset = New-TestFile -RelativePath 'provenance\asset2.bin' -Content 'asset'
    $missingBundle = Join-Path $script:TestTempRoot 'provenance\no-bundle.json'
    $existingExe = New-TestFile -RelativePath 'provenance\cosign-stub.exe' -Content 'stub'
    Assert-Throws -Body {
        Test-TrivyProvenance -CosignPath $existingExe -AssetPath $fakeAsset -BundlePath $missingBundle -CertificateOidcIssuer $script:TrivyDef.CertificateOidcIssuer -CertificateIdentity $script:TrivyDef.CertificateIdentity
    } -MatchPattern 'not found'
}

Invoke-TestCase -Name 'Trivy provenance verification PASS (cached tools)' -Skip:(-not $script:ProvenanceCacheReady) -SkipReason 'Trivy/cosign bootstrap cache not present yet' -Body {
    $result = Test-TrivyProvenance -CosignPath $script:CachedCosign -AssetPath $script:CachedTrivyAsset -BundlePath $script:CachedTrivyBundle -CertificateOidcIssuer $script:TrivyDef.CertificateOidcIssuer -CertificateIdentity $script:TrivyDef.CertificateIdentity -RefreshTrustedRoot:$false
    if (-not $result.Passed) { throw 'Provenance verification returned a non-passing result.' }
}

Invoke-TestCase -Name 'Modified Trivy asset rejected' -Skip:(-not $script:ProvenanceCacheReady) -SkipReason 'Trivy/cosign bootstrap cache not present yet' -Body {
    $tampered = Join-Path $script:TestTempRoot 'provenance\tampered-asset.bin'
    Flip-ByteInFile -SourcePath $script:CachedTrivyAsset -TargetPath $tampered
    Assert-Throws -Body {
        Test-TrivyProvenance -CosignPath $script:CachedCosign -AssetPath $tampered -BundlePath $script:CachedTrivyBundle -CertificateOidcIssuer $script:TrivyDef.CertificateOidcIssuer -CertificateIdentity $script:TrivyDef.CertificateIdentity -RefreshTrustedRoot:$false
    } -MatchPattern 'failed'
}

Invoke-TestCase -Name 'Tampered Trivy bundle rejected' -Skip:(-not $script:ProvenanceCacheReady) -SkipReason 'Trivy/cosign bootstrap cache not present yet' -Body {
    $tampered = Join-Path $script:TestTempRoot 'provenance\tampered-bundle.json'
    Flip-ByteInFile -SourcePath $script:CachedTrivyBundle -TargetPath $tampered
    Assert-Throws -Body {
        Test-TrivyProvenance -CosignPath $script:CachedCosign -AssetPath $script:CachedTrivyAsset -BundlePath $tampered -CertificateOidcIssuer $script:TrivyDef.CertificateOidcIssuer -CertificateIdentity $script:TrivyDef.CertificateIdentity -RefreshTrustedRoot:$false
    } -MatchPattern 'failed'
}

Invoke-TestCase -Name 'Wrong Trivy issuer rejected' -Skip:(-not $script:ProvenanceCacheReady) -SkipReason 'Trivy/cosign bootstrap cache not present yet' -Body {
    Assert-Throws -Body {
        Test-TrivyProvenance -CosignPath $script:CachedCosign -AssetPath $script:CachedTrivyAsset -BundlePath $script:CachedTrivyBundle -CertificateOidcIssuer 'https://token.actions.evil.example.com' -CertificateIdentity $script:TrivyDef.CertificateIdentity -RefreshTrustedRoot:$false
    } -MatchPattern 'failed'
}

Invoke-TestCase -Name 'Wrong Trivy identity rejected' -Skip:(-not $script:ProvenanceCacheReady) -SkipReason 'Trivy/cosign bootstrap cache not present yet' -Body {
    Assert-Throws -Body {
        Test-TrivyProvenance -CosignPath $script:CachedCosign -AssetPath $script:CachedTrivyAsset -BundlePath $script:CachedTrivyBundle -CertificateOidcIssuer $script:TrivyDef.CertificateOidcIssuer -CertificateIdentity 'https://github.com/aquasecurity/trivy/.github/workflows/reusable-release.yaml@refs/tags/v0.73.0' -RefreshTrustedRoot:$false
    } -MatchPattern 'failed'
}

# ==================================================================================
# Report
# ==================================================================================

$failures = @($script:Results | Where-Object { $_.Result -eq 'FAIL' })
$skipped = @($script:Results | Where-Object { $_.Result -eq 'SKIP' })
foreach ($r in $script:Results) {
    Write-Output ("[{0}] {1}" -f $r.Result, $r.Name)
    if ($r.Detail) { Write-Output ("       " + $r.Detail) }
}
Write-Output ('Supply-chain tooling tests: ' + $(if ($failures.Count -gt 0) { 'FAIL' } else { 'PASS' }))
Write-Output ("Tests: $($script:Results.Count)")
Write-Output ("Failures: $($failures.Count)")
Write-Output ("Skipped: $($skipped.Count)")

try {
    if (Test-Path -LiteralPath $script:TestTempRoot) {
        $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
        $fullTestTemp = [System.IO.Path]::GetFullPath($script:TestTempRoot)
        if ($fullTestTemp.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and $fullTestTemp -match 'auction-promax-tool-test-') {
            Remove-Item -LiteralPath $script:TestTempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
} catch {
    Write-Warning "Cleanup of test temp root failed: $($_.Exception.Message)"
}

if ($failures.Count -gt 0) { exit 1 }
exit 0
````


### api/scripts/supply-chain/Test-VulnerabilityDispositionSchema.mjs

Original-byte SHA256: 1fae0c2d64687a423dad198d25f6cb4343c9d870ef2653edbeb7b5d640bc080f

````javascript
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const ajvPath = path.join(repoRoot, "contracts/node_modules/ajv/dist/2020.js");
const schemaPath = path.join(repoRoot, "security/schemas/vulnerability-dispositions.schema.json");
const registryPath = path.join(repoRoot, "security/vulnerability-dispositions.json");

if (!fs.existsSync(ajvPath)) {
  throw new Error("Pinned Ajv is missing; run npm ci in api/contracts before Cycle 3 disposition schema tests.");
}

const { default: Ajv2020 } = await import(pathToFileURL(ajvPath).href);

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(label + " is missing.");
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(label + " is malformed JSON.");
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertResult(validate, name, mutate, expectedValid) {
  const candidate = clone(registry);
  mutate(candidate);
  const schemaValid = validate(candidate);
  const ids = schemaValid ? candidate.dispositions.map(({ id }) => id) : [];
  const valid = schemaValid && new Set(ids).size === ids.length;
  if (valid !== expectedValid) {
    const errors = (validate.errors ?? []).map(({ instancePath, keyword }) => ({ instancePath, keyword }));
    throw new Error(name + ": expected valid=" + expectedValid + ", got valid=" + valid + "; errors=" + JSON.stringify(errors));
  }
  process.stdout.write("[PASS] " + name + "\n");
}

const highDisposition = {
  id: "VD-TRIVY-HIGH-001",
  scanner: "trivy",
  findingId: "CVE-2099-0001",
  source: "nvd",
  targetType: "sbom",
  target: "services/identity-profile-service/target/bom.json",
  componentOrPackage: "fixture-package",
  affectedVersion: "1.0.0",
  severity: "HIGH",
  owner: "Repository Owner",
  rationale: "Test-only disposition fixture.",
  exploitabilityAssessment: "Not exploitable in this test fixture.",
  compensatingControl: "Fixture is not deployed.",
  remediationTarget: "Remove fixture after test.",
  ticketReference: "TEST-001",
  approvedBy: "Repository Owner",
  approvalReference: "TEST-APPROVAL-001",
  approvedAt: "2026-09-11T00:00:00Z",
  expiresAt: "2026-09-12T00:00:00Z"
};

const schema = readJson(schemaPath, "Vulnerability disposition schema");
const registry = readJson(registryPath, "Vulnerability disposition registry");
const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
if (!ajv.validateSchema(schema)) {
  throw new Error("Vulnerability disposition schema is invalid: " + JSON.stringify(ajv.errors));
}
const validate = ajv.compile(schema);

assertResult(validate, "Canonical empty disposition registry accepted", () => {}, true);
assertResult(validate, "Valid High disposition accepted", (value) => { value.dispositions.push(clone(highDisposition)); }, true);
assertResult(validate, "Wildcard finding match rejected", (value) => { const item = clone(highDisposition); item.findingId = "CVE-*"; value.dispositions.push(item); }, false);
assertResult(validate, "Absolute target rejected", (value) => { const item = clone(highDisposition); item.target = "C:/private/report.json"; value.dispositions.push(item); }, false);
assertResult(validate, "Traversal target rejected", (value) => { const item = clone(highDisposition); item.target = "../private/report.json"; value.dispositions.push(item); }, false);
assertResult(validate, "Missing High approval metadata rejected", (value) => { const item = clone(highDisposition); delete item.approvalReference; value.dispositions.push(item); }, false);
assertResult(validate, "Invalid expiry timestamp rejected", (value) => { const item = clone(highDisposition); item.expiresAt = "tomorrow"; value.dispositions.push(item); }, false);
assertResult(validate, "Critical acknowledgement required", (value) => { const item = clone(highDisposition); item.id = "VD-TRIVY-CRITICAL-001"; item.severity = "CRITICAL"; value.dispositions.push(item); }, false);
assertResult(validate, "Critical acknowledgement accepted", (value) => { const item = clone(highDisposition); item.id = "VD-TRIVY-CRITICAL-001"; item.severity = "CRITICAL"; item.criticalRiskAcknowledgement = "Repository Owner accepts the temporary Critical risk."; value.dispositions.push(item); }, true);
assertResult(validate, "High Critical acknowledgement rejected", (value) => { const item = clone(highDisposition); item.criticalRiskAcknowledgement = "Not applicable"; value.dispositions.push(item); }, false);
assertResult(validate, "Extra property rejected", (value) => { const item = clone(highDisposition); item.wildcard = true; value.dispositions.push(item); }, false);
assertResult(validate, "Duplicate disposition ID rejected", (value) => {
  const first = clone(highDisposition);
  const second = clone(highDisposition);
  second.findingId = "CVE-2099-0002";
  value.dispositions.push(first, second);
}, false);

process.stdout.write("Vulnerability disposition schema tests: PASS\n");
````


### api/scripts/supply-chain/Test-VulnerabilityScanContract.mjs

Original-byte SHA256: 2bab6884e3184640e3597c19baeaa2920347bf6143de530a63f92993467d36c7

````javascript
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const ajvPath = path.join(repoRoot, "contracts/node_modules/ajv/dist/2020.js");
const schemaPath = path.join(repoRoot, "security/schemas/vulnerability-scan-contract.schema.json");
const contractPath = path.join(repoRoot, "security/tooling/vulnerability-scan-contract.json");

if (!fs.existsSync(ajvPath)) {
  throw new Error("Pinned Ajv is missing; run npm ci in api/contracts before Cycle 3 contract tests.");
}

const { default: Ajv2020 } = await import(pathToFileURL(ajvPath).href);

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(label + " is missing.");
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(label + " is malformed JSON.");
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertResult(validate, name, mutate, expectedValid) {
  const candidate = clone(contract);
  mutate(candidate);
  const valid = validate(candidate);
  if (valid !== expectedValid) {
    const errors = (validate.errors ?? []).map(({ instancePath, keyword }) => ({ instancePath, keyword }));
    throw new Error(name + ": expected valid=" + expectedValid + ", got valid=" + valid + "; errors=" + JSON.stringify(errors));
  }
  process.stdout.write("[PASS] " + name + "\n");
}

const schema = readJson(schemaPath, "Vulnerability scan contract schema");
const contract = readJson(contractPath, "Vulnerability scan contract");
const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
if (!ajv.validateSchema(schema)) {
  throw new Error("Vulnerability scan contract schema is invalid: " + JSON.stringify(ajv.errors));
}
const validate = ajv.compile(schema);

assertResult(validate, "Canonical vulnerability scan contract accepted", () => {}, true);
assertResult(validate, "Wrong scanner version rejected", (value) => { value.scanner.version = "latest"; }, false);
assertResult(validate, "Global Trivy installation rejected", (value) => { value.scanner.installation = "global-path"; }, false);
assertResult(validate, "Wrong DB age limit rejected", (value) => { value.database.maxAgeHours = 48; }, false);
assertResult(validate, "Scanner DB update bypass rejected", (value) => { value.database.scannerArgumentsAfterFreshnessVerification = []; }, false);
assertResult(validate, "Identity scanner mode drift rejected", (value) => { value.scans[0].command = "filesystem"; }, false);
assertResult(validate, "Identity severity filtering rejected", (value) => { value.scans[0].arguments = ["--scanners", "vuln", "--severity", "HIGH,CRITICAL"]; }, false);
assertResult(validate, "Infra dev dependency exclusion rejected", (value) => { value.scans[1].arguments = ["--scanners", "vuln", "--format", "json", "--quiet", "--exit-code", "0", "--skip-db-update"]; }, false);
assertResult(validate, "Nonzero scanner finding exit rejected", (value) => { value.scans[0].arguments[6] = "1"; }, false);
assertResult(validate, "Raw report retention rejected", (value) => { value.reportHandling.rawReports = "committed"; }, false);
assertResult(validate, "Missing sanitized field rejected", (value) => { value.reportHandling.sanitizedInventoryFields.pop(); }, false);
assertResult(validate, "Policy bypass rejected", (value) => { value.policy.mustRun = false; }, false);
assertResult(validate, "Ignore unfixed rejected", (value) => { value.policy.ignoreUnfixed = true; }, false);
assertResult(validate, "Unknown non-blocking policy rejected", (value) => { value.policy.unknown = "report-non-blocking"; }, false);

process.stdout.write("Vulnerability scan execution contract tests: PASS\n");
````


### api/scripts/supply-chain/Test-VulnerabilityScanning.ps1

Original-byte SHA256: aecb6e41f022d235f9823ad4967e28c549de53651750c59d29bc777788c9b326

````powershell
#Requires -Version 5.1
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$script:ModulePath = Join-Path $PSScriptRoot 'VulnerabilityScanning.psm1'
$script:ContractPath = Join-Path $script:RepoRoot 'security\tooling\vulnerability-scan-contract.json'
$script:Results = New-Object System.Collections.Generic.List[object]

# RED guard: Cycle 3 implementation must provide this repository-owned module.
if (-not (Test-Path -LiteralPath $script:ModulePath -PathType Leaf)) {
    Write-Output 'RED: VulnerabilityScanning.psm1 is not implemented; Cycle 3 fixture matrix is ready.'
    exit 1
}

Import-Module $script:ModulePath -Force

$script:TestTempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('auction-promax-vulnerability-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $script:TestTempRoot -Force | Out-Null
# Freshness tests use a non-empty stand-in for the database payload. They never
# ask Trivy to open it; the contract only proves metadata cannot mask a missing
# or empty database file.
Set-Content -LiteralPath (Join-Path $script:TestTempRoot 'trivy.db') -Value 'fixture-db' -Encoding ascii -NoNewline

function Add-TestResult {
    param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][string]$Result, [string]$Detail)
    $script:Results.Add([pscustomobject]@{ Name = $Name; Result = $Result; Detail = $Detail })
}

function Invoke-TestCase {
    param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][scriptblock]$Body)
    try {
        & $Body
        Add-TestResult -Name $Name -Result 'PASS'
    } catch {
        Add-TestResult -Name $Name -Result 'FAIL' -Detail $_.Exception.Message
    }
}

function Assert-Throws {
    param([Parameter(Mandatory)][scriptblock]$Body, [Parameter(Mandatory)][string]$FailureCode)
    try {
        & $Body | Out-Null
    } catch {
        if ($_.Exception.Message -match [regex]::Escape($FailureCode)) {
            return
        }
        throw "Expected failure code '$FailureCode' but got: $($_.Exception.Message)"
    }
    throw "Expected failure code '$FailureCode' but no exception was thrown."
}

function Write-TestJson {
    param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)]$Value)
    $path = Join-Path $script:TestTempRoot $Name
    $Value | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $path -Encoding utf8 -NoNewline
    return $path
}

function New-DatabaseMetadata {
    param([datetime]$UpdatedAt)
    return @{
        VulnerabilityDB = @{
            Version = 2
            UpdatedAt = $UpdatedAt.ToUniversalTime().ToString('o')
            DownloadedAt = $UpdatedAt.ToUniversalTime().ToString('o')
            NextUpdate = $UpdatedAt.ToUniversalTime().AddHours(24).ToString('o')
        }
    }
}

function New-RawReport {
    param(
        [Parameter(Mandatory)][string]$Target,
        [Parameter(Mandatory)][string]$Ecosystem,
        [string]$Severity = 'HIGH',
        [switch]$WithoutFinding
    )
    $result = @{
        Target = $Target
        Class = 'lang-pkgs'
        Type = 'language'
        Vulnerabilities = @()
    }
    if (-not $WithoutFinding) {
        $result.Vulnerabilities = @(
            @{
                VulnerabilityID = 'CVE-2099-0001'
                PkgName = 'fixture-package'
                InstalledVersion = '1.0.0'
                FixedVersion = '1.0.1'
                Severity = $Severity
                SeveritySource = 'nvd'
                Status = 'affected'
                DataSource = @{ ID = 'nvd'; Name = 'National Vulnerability Database' }
                PkgIdentifier = @{ PURL = "pkg:$Ecosystem/fixture-package@1.0.0" }
            }
        )
    }
    return @{
        SchemaVersion = 2
        ArtifactName = $Target
        ArtifactType = 'filesystem'
        Results = @($result)
    }
}

try {
    $contract = Get-Content -LiteralPath $script:ContractPath -Raw | ConvertFrom-Json
    $nowUtc = [datetime]::Parse('2026-09-11T00:00:00Z').ToUniversalTime()
    $identityScan = @($contract.scans | Where-Object { $_.id -eq 'identity-sbom' })[0]
    $infraScan = @($contract.scans | Where-Object { $_.id -eq 'infra-package-lock' })[0]
    $adapterCachePath = Join-Path $script:TestTempRoot 'trivy-cache'
    $adapterOutputPath = Join-Path $script:TestTempRoot 'raw-report.json'

    Invoke-TestCase -Name 'Identity adapter uses exact SBOM command vector' -Body {
        $actual = @(Get-TrivyScanArguments -ScanDefinition $identityScan -CacheDirectory $adapterCachePath -OutputPath $adapterOutputPath)
        $expected = @('sbom', '--cache-dir', $adapterCachePath) + @($identityScan.arguments) + @('--output', $adapterOutputPath, $identityScan.input)
        if (($actual -join [char]31) -ne ($expected -join [char]31)) {
            throw 'TRIVY_IDENTITY_COMMAND_VECTOR_DRIFT'
        }
    }
    Invoke-TestCase -Name 'Infra adapter preserves development dependency flag' -Body {
        $actual = @(Get-TrivyScanArguments -ScanDefinition $infraScan -CacheDirectory $adapterCachePath -OutputPath $adapterOutputPath)
        if ($actual -notcontains '--include-dev-deps' -or $actual -notcontains '--skip-db-update') {
            throw 'TRIVY_INFRA_COMMAND_VECTOR_DRIFT'
        }
    }
    Invoke-TestCase -Name 'Adapter rejects ignore-unfixed filtering' -Body {
        $invalidScan = [pscustomobject]@{
            command = 'sbom'; input = 'services/identity-profile-service/target/bom.json'
            arguments = @('--scanners', 'vuln', '--ignore-unfixed', '--format', 'json', '--quiet', '--exit-code', '0', '--skip-db-update')
        }
        Assert-Throws -FailureCode 'TRIVY_SCAN_FILTERING_FORBIDDEN' -Body {
            Get-TrivyScanArguments -ScanDefinition $invalidScan -CacheDirectory $adapterCachePath -OutputPath $adapterOutputPath
        }
    }

    Invoke-TestCase -Name 'Fresh Trivy DB metadata accepted' -Body {
        $metadataPath = Write-TestJson -Name 'fresh-db.json' -Value (New-DatabaseMetadata -UpdatedAt $nowUtc.AddHours(-23))
        Test-TrivyDatabaseFreshness -MetadataPath $metadataPath -NowUtc $nowUtc -MaxAgeHours 24 -FutureClockSkewSeconds 300 | Out-Null
    }
    Invoke-TestCase -Name 'Fresh native Trivy cache metadata accepted' -Body {
        $metadata = (New-DatabaseMetadata -UpdatedAt $nowUtc.AddHours(-23)).VulnerabilityDB
        $metadataPath = Write-TestJson -Name 'fresh-native-cache-db.json' -Value $metadata
        Test-TrivyDatabaseFreshness -MetadataPath $metadataPath -NowUtc $nowUtc -MaxAgeHours 24 -FutureClockSkewSeconds 300 | Out-Null
    }
    Invoke-TestCase -Name 'Missing Trivy DB metadata rejected' -Body {
        Assert-Throws -FailureCode 'TRIVY_DB_METADATA_MISSING' -Body {
            Test-TrivyDatabaseFreshness -MetadataPath (Join-Path $script:TestTempRoot 'missing-db.json') -NowUtc $nowUtc -MaxAgeHours 24 -FutureClockSkewSeconds 300
        }
    }
    Invoke-TestCase -Name 'Metadata cannot mask missing Trivy DB payload' -Body {
        $missingPayloadRoot = Join-Path $script:TestTempRoot 'missing-db-payload'
        New-Item -ItemType Directory -Path $missingPayloadRoot -Force | Out-Null
        $metadataPath = Join-Path $missingPayloadRoot 'metadata.json'
        (New-DatabaseMetadata -UpdatedAt $nowUtc) | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $metadataPath -Encoding utf8 -NoNewline
        Assert-Throws -FailureCode 'TRIVY_DB_MISSING' -Body {
            Test-TrivyDatabaseFreshness -MetadataPath $metadataPath -NowUtc $nowUtc -MaxAgeHours 24 -FutureClockSkewSeconds 300
        }
    }
    Invoke-TestCase -Name 'Malformed Trivy DB metadata rejected' -Body {
        $path = Join-Path $script:TestTempRoot 'malformed-db.json'
        Set-Content -LiteralPath $path -Value '{not-json' -Encoding utf8 -NoNewline
        Assert-Throws -FailureCode 'TRIVY_DB_METADATA_MALFORMED' -Body {
            Test-TrivyDatabaseFreshness -MetadataPath $path -NowUtc $nowUtc -MaxAgeHours 24 -FutureClockSkewSeconds 300
        }
    }
    Invoke-TestCase -Name 'Missing DB UpdatedAt rejected' -Body {
        $metadata = New-DatabaseMetadata -UpdatedAt $nowUtc
        $metadata.VulnerabilityDB.Remove('UpdatedAt')
        $path = Write-TestJson -Name 'missing-updated-at.json' -Value $metadata
        Assert-Throws -FailureCode 'TRIVY_DB_UPDATED_AT_MISSING' -Body {
            Test-TrivyDatabaseFreshness -MetadataPath $path -NowUtc $nowUtc -MaxAgeHours 24 -FutureClockSkewSeconds 300
        }
    }
    Invoke-TestCase -Name 'Malformed DB UpdatedAt rejected' -Body {
        $metadata = New-DatabaseMetadata -UpdatedAt $nowUtc
        $metadata.VulnerabilityDB.UpdatedAt = 'not-a-timestamp'
        $path = Write-TestJson -Name 'malformed-updated-at.json' -Value $metadata
        Assert-Throws -FailureCode 'TRIVY_DB_UPDATED_AT_MALFORMED' -Body {
            Test-TrivyDatabaseFreshness -MetadataPath $path -NowUtc $nowUtc -MaxAgeHours 24 -FutureClockSkewSeconds 300
        }
    }
    Invoke-TestCase -Name 'Stale Trivy DB rejected' -Body {
        $path = Write-TestJson -Name 'stale-db.json' -Value (New-DatabaseMetadata -UpdatedAt $nowUtc.AddHours(-24.01))
        Assert-Throws -FailureCode 'TRIVY_DB_STALE' -Body {
            Test-TrivyDatabaseFreshness -MetadataPath $path -NowUtc $nowUtc -MaxAgeHours 24 -FutureClockSkewSeconds 300
        }
    }
    Invoke-TestCase -Name 'Future Trivy DB metadata rejected' -Body {
        $path = Write-TestJson -Name 'future-db.json' -Value (New-DatabaseMetadata -UpdatedAt $nowUtc.AddSeconds(301))
        Assert-Throws -FailureCode 'TRIVY_DB_UPDATED_AT_FUTURE' -Body {
            Test-TrivyDatabaseFreshness -MetadataPath $path -NowUtc $nowUtc -MaxAgeHours 24 -FutureClockSkewSeconds 300
        }
    }
    Invoke-TestCase -Name 'Missing Trivy DB is refreshed then revalidated' -Body {
        $cacheRoot = Join-Path $script:TestTempRoot 'refresh-missing-cache'
        $refreshCount = [ref]0
        $refresh = {
            param($Executable, $CacheDirectory)
            $refreshCount.Value++
            $dbRoot = Join-Path $CacheDirectory 'db'
            New-Item -ItemType Directory -Path $dbRoot -Force | Out-Null
            Set-Content -LiteralPath (Join-Path $dbRoot 'trivy.db') -Value 'fixture-db' -Encoding ascii -NoNewline
            (New-DatabaseMetadata -UpdatedAt $nowUtc).VulnerabilityDB | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $dbRoot 'metadata.json') -Encoding utf8 -NoNewline
        }
        $result = Confirm-TrivyDatabaseFreshness -TrivyExecutable (Join-Path $PSHOME 'powershell.exe') -CacheDirectory $cacheRoot -NowUtc $nowUtc -MaxAgeHours 24 -FutureClockSkewSeconds 300 -RefreshAction $refresh
        if (-not $result.IsFresh -or $refreshCount.Value -ne 1) {
            throw 'TRIVY_DB_REFRESH_NOT_EXECUTED_EXACTLY_ONCE'
        }
    }
    Invoke-TestCase -Name 'Invalid refreshed Trivy DB rejected' -Body {
        $cacheRoot = Join-Path $script:TestTempRoot 'refresh-invalid-cache'
        $refresh = {
            param($Executable, $CacheDirectory)
            $dbRoot = Join-Path $CacheDirectory 'db'
            New-Item -ItemType Directory -Path $dbRoot -Force | Out-Null
            Set-Content -LiteralPath (Join-Path $dbRoot 'trivy.db') -Value 'fixture-db' -Encoding ascii -NoNewline
            (New-DatabaseMetadata -UpdatedAt $nowUtc.AddHours(-25)).VulnerabilityDB | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $dbRoot 'metadata.json') -Encoding utf8 -NoNewline
        }
        Assert-Throws -FailureCode 'TRIVY_DB_REFRESH_RESULT_INVALID' -Body {
            Confirm-TrivyDatabaseFreshness -TrivyExecutable (Join-Path $PSHOME 'powershell.exe') -CacheDirectory $cacheRoot -NowUtc $nowUtc -MaxAgeHours 24 -FutureClockSkewSeconds 300 -RefreshAction $refresh
        }
    }

    Invoke-TestCase -Name 'Valid Maven SBOM raw report accepted' -Body {
        $path = Write-TestJson -Name 'maven-report.json' -Value (New-RawReport -Target 'services/identity-profile-service/target/bom.json' -Ecosystem 'maven')
        Read-TrivyRawReport -ReportPath $path -ScanDefinition $identityScan | Out-Null
    }
    Invoke-TestCase -Name 'Maven ecosystem detected from package inventory without findings' -Body {
        $report = New-RawReport -Target 'services/identity-profile-service/target/bom.json' -Ecosystem 'maven' -WithoutFinding
        $report.Results[0].Packages = @(
            @{
                Name = 'fixture-package'
                Version = '1.0.0'
                PkgIdentifier = @{ PURL = 'pkg:maven/com.example/fixture-package@1.0.0' }
            }
        )
        $path = Write-TestJson -Name 'maven-package-only-report.json' -Value $report
        Read-TrivyRawReport -ReportPath $path -ScanDefinition $identityScan | Out-Null
    }
    Invoke-TestCase -Name 'Native Trivy package Identifier detects clean npm ecosystem' -Body {
        $report = New-RawReport -Target 'infra/package-lock.json' -Ecosystem 'npm' -WithoutFinding
        $report.Results[0].Type = 'npm'
        $report.Results[0].Packages = @(
            @{
                Name = 'aws-cdk-lib'
                Version = '2.269.0'
                Identifier = @{ PURL = 'pkg:npm/aws-cdk-lib@2.269.0' }
            }
        )
        $path = Write-TestJson -Name 'npm-native-package-report.json' -Value $report
        Read-TrivyRawReport -ReportPath $path -ScanDefinition $infraScan | Out-Null
    }
    Invoke-TestCase -Name 'Malformed raw report rejected' -Body {
        $path = Join-Path $script:TestTempRoot 'malformed-report.json'
        Set-Content -LiteralPath $path -Value '{not-json' -Encoding utf8 -NoNewline
        Assert-Throws -FailureCode 'TRIVY_REPORT_MALFORMED' -Body {
            Read-TrivyRawReport -ReportPath $path -ScanDefinition $identityScan
        }
    }
    Invoke-TestCase -Name 'Missing Results rejected' -Body {
        $path = Write-TestJson -Name 'missing-results.json' -Value @{ SchemaVersion = 2 }
        Assert-Throws -FailureCode 'TRIVY_REPORT_RESULTS_MISSING' -Body {
            Read-TrivyRawReport -ReportPath $path -ScanDefinition $identityScan
        }
    }
    Invoke-TestCase -Name 'Maven ecosystem mismatch rejected' -Body {
        $path = Write-TestJson -Name 'wrong-maven-ecosystem.json' -Value (New-RawReport -Target 'services/identity-profile-service/target/bom.json' -Ecosystem 'npm')
        Assert-Throws -FailureCode 'TRIVY_ECOSYSTEM_NOT_DETECTED' -Body {
            Read-TrivyRawReport -ReportPath $path -ScanDefinition $identityScan
        }
    }
    Invoke-TestCase -Name 'Npm ecosystem mismatch rejected' -Body {
        $path = Write-TestJson -Name 'wrong-npm-ecosystem.json' -Value (New-RawReport -Target 'infra/package-lock.json' -Ecosystem 'maven')
        Assert-Throws -FailureCode 'TRIVY_ECOSYSTEM_NOT_DETECTED' -Body {
            Read-TrivyRawReport -ReportPath $path -ScanDefinition $infraScan
        }
    }
    Invoke-TestCase -Name 'Missing vulnerability ID rejected' -Body {
        $report = New-RawReport -Target 'services/identity-profile-service/target/bom.json' -Ecosystem 'maven'
        $report.Results[0].Vulnerabilities[0].Remove('VulnerabilityID')
        $path = Write-TestJson -Name 'missing-finding-id.json' -Value $report
        Assert-Throws -FailureCode 'TRIVY_FINDING_ID_MISSING' -Body {
            ConvertTo-SanitizedVulnerabilityInventory -ReportPath $path -ScanDefinition $identityScan
        }
    }
    Invoke-TestCase -Name 'Missing severity source rejected' -Body {
        $report = New-RawReport -Target 'services/identity-profile-service/target/bom.json' -Ecosystem 'maven'
        $report.Results[0].Vulnerabilities[0].Remove('SeveritySource')
        $path = Write-TestJson -Name 'missing-severity-source.json' -Value $report
        Assert-Throws -FailureCode 'TRIVY_SEVERITY_SOURCE_MISSING' -Body {
            ConvertTo-SanitizedVulnerabilityInventory -ReportPath $path -ScanDefinition $identityScan
        }
    }
    Invoke-TestCase -Name 'Sanitized inventory excludes absolute paths and raw detail' -Body {
        $report = New-RawReport -Target 'D:\private\identity\bom.json' -Ecosystem 'maven'
        $report.Results[0].Vulnerabilities[0].Description = 'private raw vulnerability detail'
        $path = Write-TestJson -Name 'sanitize-report.json' -Value $report
        $inventory = ConvertTo-SanitizedVulnerabilityInventory -ReportPath $path -ScanDefinition $identityScan
        $serialized = $inventory | ConvertTo-Json -Depth 20
        if ($serialized -match 'D:\\private|Description|private raw vulnerability detail') {
            throw 'SANITIZED_INVENTORY_LEAKED_RAW_DATA'
        }
        $expectedFields = @($contract.reportHandling.sanitizedInventoryFields | Sort-Object)
        $actualFields = @($inventory[0].PSObject.Properties.Name | Sort-Object)
        if (($actualFields -join [char]31) -ne ($expectedFields -join [char]31)) {
            throw 'SANITIZED_INVENTORY_FIELD_CONTRACT_DRIFT'
        }
    }
    Invoke-TestCase -Name 'Expected controlled fixture finding required' -Body {
        $report = New-RawReport -Target 'fixture/bom.json' -Ecosystem 'maven' -WithoutFinding
        $path = Write-TestJson -Name 'fixture-without-finding.json' -Value $report
        Assert-Throws -FailureCode 'TRIVY_FIXTURE_FINDING_MISSING' -Body {
            Assert-ExpectedTrivyFixtureFinding -ReportPath $path -ExpectedFindingId 'CVE-2099-0001' -ExpectedPackage 'fixture-package' -ExpectedAffectedVersion '1.0.0'
        }
    }

    $highFinding = [pscustomobject]@{
        scanner = 'trivy'; findingId = 'CVE-2099-0001'; source = 'nvd'; targetType = 'sbom'; target = 'services/identity-profile-service/target/bom.json'
        'package/component' = 'fixture-package'; affectedVersion = '1.0.0'; fixedVersion = '1.0.1'; severity = 'HIGH'; severitySource = 'nvd'; status = 'observed'; dispositionId = $null
    }
    Invoke-TestCase -Name 'High finding without disposition rejected' -Body {
        Assert-Throws -FailureCode 'HIGH_OR_CRITICAL_DISPOSITION_REQUIRED' -Body {
            Test-VulnerabilityPolicy -Inventory @($highFinding) -Dispositions @() -NowUtc $nowUtc
        }
    }
    Invoke-TestCase -Name 'Exact valid High disposition accepted' -Body {
        $disposition = [pscustomobject]@{
            id = 'VD-TRIVY-HIGH-001'; scanner = 'trivy'; findingId = 'CVE-2099-0001'; source = 'nvd'
            targetType = 'sbom'; target = 'services/identity-profile-service/target/bom.json'; componentOrPackage = 'fixture-package'
            affectedVersion = '1.0.0'; severity = 'HIGH'; owner = 'Repository Owner'; rationale = 'Fixture-only acceptance test.'
            exploitabilityAssessment = 'Not deployed.'; compensatingControl = 'Test fixture isolation.'; remediationTarget = 'Remove fixture.'
            ticketReference = 'TEST-001'; approvedBy = 'Repository Owner'; approvalReference = 'TEST-APPROVAL-001'
            approvedAt = '2026-09-10T00:00:00Z'; expiresAt = '2026-09-20T00:00:00Z'
        }
        $decisions = @(Test-VulnerabilityPolicy -Inventory @($highFinding) -Dispositions @($disposition) -NowUtc $nowUtc)
        if ($decisions.Count -ne 1 -or $decisions[0].status -ne 'accepted-risk' -or $decisions[0].dispositionId -ne 'VD-TRIVY-HIGH-001') {
            throw 'VALID_HIGH_DISPOSITION_NOT_ACCEPTED'
        }
    }
    Invoke-TestCase -Name 'Expired High disposition rejected' -Body {
        $disposition = [pscustomobject]@{
            id = 'VD-TRIVY-HIGH-EXPIRED'; scanner = 'trivy'; findingId = 'CVE-2099-0001'; source = 'nvd'
            targetType = 'sbom'; target = 'services/identity-profile-service/target/bom.json'; componentOrPackage = 'fixture-package'
            affectedVersion = '1.0.0'; severity = 'HIGH'; owner = 'Repository Owner'; rationale = 'Fixture-only expiry test.'
            exploitabilityAssessment = 'Not deployed.'; compensatingControl = 'Test fixture isolation.'; remediationTarget = 'Remove fixture.'
            ticketReference = 'TEST-002'; approvedBy = 'Repository Owner'; approvalReference = 'TEST-APPROVAL-002'
            approvedAt = '2026-09-01T00:00:00Z'; expiresAt = '2026-09-10T00:00:00Z'
        }
        Assert-Throws -FailureCode 'VULNERABILITY_DISPOSITION_EXPIRED' -Body {
            Test-VulnerabilityPolicy -Inventory @($highFinding) -Dispositions @($disposition) -NowUtc $nowUtc
        }
    }
    Invoke-TestCase -Name 'High disposition exceeding 30 days rejected' -Body {
        $disposition = [pscustomobject]@{
            id = 'VD-TRIVY-HIGH-LONG'; scanner = 'trivy'; findingId = 'CVE-2099-0001'; source = 'nvd'
            targetType = 'sbom'; target = 'services/identity-profile-service/target/bom.json'; componentOrPackage = 'fixture-package'
            affectedVersion = '1.0.0'; severity = 'HIGH'; owner = 'Repository Owner'; rationale = 'Fixture-only validity test.'
            exploitabilityAssessment = 'Not deployed.'; compensatingControl = 'Test fixture isolation.'; remediationTarget = 'Remove fixture.'
            ticketReference = 'TEST-003'; approvedBy = 'Repository Owner'; approvalReference = 'TEST-APPROVAL-003'
            approvedAt = '2026-09-10T00:00:00Z'; expiresAt = '2026-10-11T00:00:00Z'
        }
        Assert-Throws -FailureCode 'VULNERABILITY_DISPOSITION_VALIDITY_EXCEEDED' -Body {
            Test-VulnerabilityPolicy -Inventory @($highFinding) -Dispositions @($disposition) -NowUtc $nowUtc
        }
    }
    Invoke-TestCase -Name 'Future approval timestamp rejected' -Body {
        $disposition = [pscustomobject]@{
            id = 'VD-TRIVY-HIGH-FUTURE'; scanner = 'trivy'; findingId = 'CVE-2099-0001'; source = 'nvd'
            targetType = 'sbom'; target = 'services/identity-profile-service/target/bom.json'; componentOrPackage = 'fixture-package'
            affectedVersion = '1.0.0'; severity = 'HIGH'; owner = 'Repository Owner'; rationale = 'Fixture-only time validation.'
            exploitabilityAssessment = 'Not deployed.'; compensatingControl = 'Test fixture isolation.'; remediationTarget = 'Remove fixture.'
            ticketReference = 'TEST-005'; approvedBy = 'Repository Owner'; approvalReference = 'TEST-APPROVAL-005'
            approvedAt = '2026-09-12T00:00:00Z'; expiresAt = '2026-09-13T00:00:00Z'
        }
        Assert-Throws -FailureCode 'VULNERABILITY_DISPOSITION_APPROVAL_IN_FUTURE' -Body {
            Test-VulnerabilityPolicy -Inventory @($highFinding) -Dispositions @($disposition) -NowUtc $nowUtc
        }
    }
    Invoke-TestCase -Name 'Critical disposition without acknowledgement rejected' -Body {
        $criticalFinding = $highFinding.psobject.Copy()
        $criticalFinding.severity = 'CRITICAL'
        $disposition = [pscustomobject]@{
            id = 'VD-TRIVY-CRITICAL-001'; scanner = 'trivy'; findingId = 'CVE-2099-0001'; source = 'nvd'
            targetType = 'sbom'; target = 'services/identity-profile-service/target/bom.json'; componentOrPackage = 'fixture-package'
            affectedVersion = '1.0.0'; severity = 'CRITICAL'; owner = 'Repository Owner'; rationale = 'Fixture-only Critical test.'
            exploitabilityAssessment = 'Not deployed.'; compensatingControl = 'Test fixture isolation.'; remediationTarget = 'Remove fixture.'
            ticketReference = 'TEST-004'; approvedBy = 'Repository Owner'; approvalReference = 'TEST-APPROVAL-004'
            approvedAt = '2026-09-10T00:00:00Z'; expiresAt = '2026-09-12T00:00:00Z'
        }
        Assert-Throws -FailureCode 'VULNERABILITY_DISPOSITION_CRITICAL_ACK_REQUIRED' -Body {
            Test-VulnerabilityPolicy -Inventory @($criticalFinding) -Dispositions @($disposition) -NowUtc $nowUtc
        }
    }
    Invoke-TestCase -Name 'Unknown finding rejected fail-closed' -Body {
        $unknownFinding = $highFinding.psobject.Copy()
        $unknownFinding.severity = 'UNKNOWN'
        Assert-Throws -FailureCode 'UNKNOWN_SEVERITY_FAIL_CLOSED' -Body {
            Test-VulnerabilityPolicy -Inventory @($unknownFinding) -Dispositions @() -NowUtc $nowUtc
        }
    }
    Invoke-TestCase -Name 'Medium finding remains non-blocking' -Body {
        $mediumFinding = $highFinding.psobject.Copy()
        $mediumFinding.severity = 'MEDIUM'
        Test-VulnerabilityPolicy -Inventory @($mediumFinding) -Dispositions @() -NowUtc $nowUtc | Out-Null
    }
    Invoke-TestCase -Name 'Empty finding inventory is a valid clean result' -Body {
        $decisions = @(Test-VulnerabilityPolicy -Inventory @() -Dispositions @() -NowUtc $nowUtc)
        if ($decisions.Count -ne 0) {
            throw 'EMPTY_INVENTORY_RESULT_INVALID'
        }
    }
} finally {
    if (Test-Path -LiteralPath $script:TestTempRoot) {
        Remove-Item -LiteralPath $script:TestTempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}

$failures = @($script:Results | Where-Object { $_.Result -eq 'FAIL' })
$script:Results | ForEach-Object {
    if ($_.Result -eq 'PASS') {
        Write-Output "[PASS] $($_.Name)"
    } else {
        Write-Output "[FAIL] $($_.Name): $($_.Detail)"
    }
}
Write-Output "Tests: $($script:Results.Count)"
Write-Output "Failures: $($failures.Count)"
if ($failures.Count -gt 0) {
    exit 1
}
Write-Output 'Vulnerability scanning fixture tests: PASS'
````


### api/scripts/supply-chain/Validate-HostedSupplyChainEvidence.mjs

Original-byte SHA256: 333c9750099990183f7c4503f885f8a823b0a3632d1a6cea30e06f4a5ef347fa

````javascript
import fs from "node:fs";
import path from "node:path";

const allowedFiles = new Set([
  "run-summary.json", "vulnerability-inventory.json", "gitleaks-inventory.json", "container-vulnerability-inventory.json",
  "image-identity.json", "smoke-summary.json", "policy-summary.json"
]);
const forbiddenKeys = new Set(["Secret", "Match", "Line", "Description", "PrimaryURL", "References"]);
const vulnerabilityFindingFields = new Set([
  "scanner", "findingId", "source", "targetType", "target", "package/component",
  "affectedVersion", "fixedVersion", "severity", "severitySource", "status", "dispositionId"
]);
const gitleaksFindingFields = new Set([
  "scanMode", "ruleId", "repositoryRelativePath", "scannerFingerprint", "commitId", "status", "remediationReference"
]);
const safeString = (value) => typeof value !== "string" || (!path.isAbsolute(value) && !/^[A-Za-z]:[\\/]/.test(value) && !/(-----BEGIN|ghp_|github_pat_|AKIA)/.test(value));

function fail(code) { throw new Error(code); }
function validateValue(value) {
  if (typeof value === "string") { if (!safeString(value)) fail("HOSTED_EVIDENCE_UNSANITIZED"); return; }
  if (Array.isArray(value)) { value.forEach(validateValue); return; }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) { if (forbiddenKeys.has(key)) fail("HOSTED_EVIDENCE_UNSANITIZED"); validateValue(nested); }
  }
}
function readJson(file) {
  let value; try { value = JSON.parse(fs.readFileSync(file, "utf8")); } catch { fail("HOSTED_EVIDENCE_JSON_INVALID"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("HOSTED_EVIDENCE_JSON_INVALID");
  validateValue(value); return value;
}
function validateFindings(evidence, fields) {
  if (!Array.isArray(evidence.findings)) fail("HOSTED_EVIDENCE_FINDINGS_INVALID");
  for (const finding of evidence.findings) {
    if (!finding || typeof finding !== "object" || Array.isArray(finding)) fail("HOSTED_EVIDENCE_FINDINGS_INVALID");
    const keys = Object.keys(finding);
    if (keys.length !== fields.size || keys.some((key) => !fields.has(key))) fail("HOSTED_EVIDENCE_FINDING_FIELD_INVALID");
  }
}
function validateEvidenceRoot(root, commit) {
  if (!/^[a-f0-9]{40}$/.test(commit)) fail("HOSTED_EVIDENCE_COMMIT_INVALID");
  let entries; try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { fail("HOSTED_EVIDENCE_ROOT_MISSING"); }
  if (entries.length !== allowedFiles.size) fail("HOSTED_EVIDENCE_FILESET_INVALID");
  for (const entry of entries) {
    if (!entry.isFile() || entry.isSymbolicLink() || !allowedFiles.has(entry.name)) fail("HOSTED_EVIDENCE_FILESET_INVALID");
    const evidence = readJson(path.join(root, entry.name));
    if (evidence.commit !== commit) fail("HOSTED_EVIDENCE_COMMIT_MISMATCH");
    const allowed = entry.name === "run-summary.json"
      ? new Set(["schemaVersion", "workflow", "commit", "executionState", "policyState", "reviewState", "deltaState", "failureCode"])
      : new Set(["schemaVersion", "commit", "findings", "counts", "dispositions", "imageId", "platform", "jarSha256", "baseManifestDigest", "readiness", "runtimeUser", "readOnlyRootFilesystem", "dropAllCapabilities", "noNewPrivileges", "policyState", "reviewState", "deltaState"]);
    if (Object.keys(evidence).some((key) => !allowed.has(key))) fail("HOSTED_EVIDENCE_FIELD_INVALID");
    if (entry.name === "vulnerability-inventory.json" || entry.name === "container-vulnerability-inventory.json") validateFindings(evidence, vulnerabilityFindingFields);
    if (entry.name === "gitleaks-inventory.json") validateFindings(evidence, gitleaksFindingFields);
  }
  const summary = readJson(path.join(root, "run-summary.json"));
  const required = ["schemaVersion","workflow","commit","executionState","policyState","reviewState","deltaState","failureCode"];
  if (Object.keys(summary).length !== required.length || required.some((key) => !(key in summary))) fail("HOSTED_EVIDENCE_SUMMARY_INVALID");
  return { files: [...allowedFiles].sort(), commit };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const [root, commit] = process.argv.slice(2);
  if (!root || !commit) fail("HOSTED_EVIDENCE_ARGUMENT_INVALID");
  process.stdout.write(`${JSON.stringify(validateEvidenceRoot(root, commit))}\n`);
}

export { validateEvidenceRoot, allowedFiles };
````


### api/scripts/supply-chain/Validate-IdentitySbom.mjs

Original-byte SHA256: 459a47fb47094f38cd9a7a781018f3e80574d0bb1cd3c8abc61c8882f96065a4

````javascript
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

class ValidationFailure extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const repoRoot = path.resolve(import.meta.dirname, "../..");
const ajvRoot = path.join(repoRoot, "contracts/node_modules/ajv/dist");
const ajv2020Path = path.join(ajvRoot, "2020.js");
const ajvDraft07Path = path.join(ajvRoot, "ajv.js");
const trustManifestSchemaPath = path.join(repoRoot, "security/schemas/cyclonedx-schemas.schema.json");

function fail(code) {
  throw new ValidationFailure(code);
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value || values.has(key)) fail("INVALID_ARGUMENTS");
    values.set(key, value);
  }
  for (const required of ["--bom", "--schema-root", "--trust-manifest"]) {
    if (!values.has(required)) fail("MISSING_REQUIRED_ARGUMENT");
  }
  for (const key of values.keys()) {
    if (!new Set(["--bom", "--schema-root", "--trust-manifest", "--reference-bom"]).has(key)) fail("UNSUPPORTED_ARGUMENT");
  }
  return {
    bomPath: path.resolve(values.get("--bom")),
    schemaRoot: path.resolve(values.get("--schema-root")),
    trustManifestPath: path.resolve(values.get("--trust-manifest")),
    referenceBomPath: values.has("--reference-bom") ? path.resolve(values.get("--reference-bom")) : undefined,
  };
}

function readJson(filePath, missingCode, malformedCode) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile() || fs.statSync(filePath).size === 0) {
    fail(missingCode);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    fail(malformedCode);
  }
}

function sha256(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

async function loadAjv() {
  if (!fs.existsSync(ajv2020Path) || !fs.existsSync(ajvDraft07Path)) fail("AJV_NOT_INSTALLED");
  const { default: Ajv2020 } = await import(pathToFileURL(ajv2020Path).href);
  const { default: Ajv } = await import(pathToFileURL(ajvDraft07Path).href);
  return { Ajv2020, Ajv };
}

function validateTrustManifest(Ajv2020, manifestPath) {
  const contract = readJson(trustManifestSchemaPath, "TRUST_MANIFEST_SCHEMA_MISSING", "TRUST_MANIFEST_SCHEMA_MALFORMED");
  const manifest = readJson(manifestPath, "TRUST_MANIFEST_MISSING", "TRUST_MANIFEST_MALFORMED");
  const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
  try {
    if (!ajv.validateSchema(contract)) fail("TRUST_MANIFEST_SCHEMA_INVALID");
    const validate = ajv.compile(contract);
    if (!validate(manifest)) fail("TRUST_MANIFEST_INVALID");
  } catch (error) {
    if (error instanceof ValidationFailure) throw error;
    fail("TRUST_MANIFEST_SCHEMA_INVALID");
  }
  return manifest;
}

function loadTrustedSchemas(manifest, schemaRoot) {
  if (!fs.existsSync(schemaRoot) || !fs.statSync(schemaRoot).isDirectory()) fail("SCHEMA_ROOT_MISSING");
  const schemas = new Map();
  for (const asset of manifest.assets) {
    const assetPath = path.join(schemaRoot, asset.name);
    if (path.dirname(assetPath) !== schemaRoot) fail("SCHEMA_ASSET_NAME_UNSAFE");
    if (!fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) fail("REFERENCED_SCHEMA_MISSING");
    if (sha256(assetPath) !== asset.sha256) fail("SCHEMA_CHECKSUM_MISMATCH");
    schemas.set(asset.name, readJson(assetPath, "REFERENCED_SCHEMA_MISSING", "REFERENCED_SCHEMA_MALFORMED"));
  }
  return schemas;
}

function compileCycloneDxSchema(Ajv, schemas) {
  const bomSchema = schemas.get("bom-1.6.schema.json");
  const spdxSchema = schemas.get("spdx.schema.json");
  const jsfSchema = schemas.get("jsf-0.82.schema.json");
  if (!bomSchema || !spdxSchema || !jsfSchema) fail("REFERENCED_SCHEMA_MISSING");
  if (bomSchema.$schema !== "http://json-schema.org/draft-07/schema#") fail("UNEXPECTED_SBOM_SCHEMA_DRAFT");
  try {
    const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
    ajv.addSchema(spdxSchema);
    ajv.addSchema(jsfSchema);
    return ajv.compile(bomSchema);
  } catch {
    fail("LOCAL_SCHEMA_RESOLUTION_FAILED");
  }
}

function requireExact(value, expected, code) {
  if (value !== expected) fail(code);
}

function requireNonEmptyArray(value, code) {
  if (!Array.isArray(value) || value.length === 0) fail(code);
}

function assertUnique(values, code) {
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0 || seen.has(value)) fail(code);
    seen.add(value);
  }
}

function validateIdentitySemantics(bom) {
  requireExact(bom.bomFormat, "CycloneDX", "INVALID_BOM_FORMAT");
  requireExact(bom.specVersion, "1.6", "INVALID_SPEC_VERSION");
  const root = bom.metadata?.component;
  if (!root || typeof root !== "object") fail("ROOT_COMPONENT_MISSING");
  requireExact(root.type, "application", "ROOT_COMPONENT_TYPE_INVALID");
  requireExact(root.group, "com.auctionpromax", "ROOT_COMPONENT_GROUP_INVALID");
  requireExact(root.name, "identity-profile-service", "ROOT_COMPONENT_NAME_INVALID");
  requireExact(root.version, "0.0.1-SNAPSHOT", "ROOT_COMPONENT_VERSION_INVALID");
  if (typeof root["bom-ref"] !== "string" || root["bom-ref"].length === 0) fail("ROOT_COMPONENT_REFERENCE_MISSING");

  requireNonEmptyArray(bom.components, "COMPONENT_INVENTORY_EMPTY");
  requireNonEmptyArray(bom.dependencies, "DEPENDENCY_GRAPH_EMPTY");
  assertUnique(bom.components.map((component) => component?.["bom-ref"]), "DUPLICATE_COMPONENT_REFERENCE");
  assertUnique(bom.dependencies.map((dependency) => dependency?.ref), "DUPLICATE_DEPENDENCY_REFERENCE");
  if (!bom.dependencies.some((dependency) => dependency.ref === root["bom-ref"])) fail("ROOT_DEPENDENCY_MISSING");
  const knownReferences = new Set([root["bom-ref"], ...bom.components.map((component) => component["bom-ref"])]);
  for (const dependency of bom.dependencies) {
    if (!knownReferences.has(dependency.ref)) fail("DEPENDENCY_REFERENCE_UNKNOWN");
    for (const reference of dependency.dependsOn ?? []) {
      if (!knownReferences.has(reference)) fail("DEPENDENCY_EDGE_REFERENCE_UNKNOWN");
    }
  }

  const testOnlyCoordinates = new Set([
    "org.junit.jupiter:junit-jupiter",
    "org.testcontainers:junit-jupiter",
    "org.testcontainers:postgresql",
    "com.tngtech.archunit:archunit-junit5"
  ]);
  for (const component of bom.components) {
    if (testOnlyCoordinates.has(`${component?.group}:${component?.name}`)) fail("TEST_SCOPE_COMPONENT_PRESENT");
  }
}

function normalize(value, key = "", isBomRoot = false) {
  if (Array.isArray(value)) {
    const normalized = value.map((entry) => normalize(entry));
    if (["components", "dependencies", "dependsOn"].includes(key)) {
      normalized.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    }
    return normalized;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((property) => !((isBomRoot && property === "serialNumber") || (key === "metadata" && property === "timestamp")))
        .sort()
        .map((property) => [property, normalize(value[property], property)])
    );
  }
  return value;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const { Ajv2020, Ajv } = await loadAjv();
  const trustManifest = validateTrustManifest(Ajv2020, args.trustManifestPath);
  const schemas = loadTrustedSchemas(trustManifest, args.schemaRoot);
  const validateSchema = compileCycloneDxSchema(Ajv, schemas);
  const bom = readJson(args.bomPath, "SBOM_MISSING_OR_EMPTY", "SBOM_MALFORMED");
  if (!validateSchema(bom)) fail("SBOM_SCHEMA_VALIDATION_FAILED");
  validateIdentitySemantics(bom);

  if (args.referenceBomPath) {
    const reference = readJson(args.referenceBomPath, "REFERENCE_SBOM_MISSING_OR_EMPTY", "REFERENCE_SBOM_MALFORMED");
    if (!validateSchema(reference)) fail("REFERENCE_SBOM_SCHEMA_VALIDATION_FAILED");
    validateIdentitySemantics(reference);
    if (JSON.stringify(normalize(bom, "", true)) !== JSON.stringify(normalize(reference, "", true))) fail("SBOM_SEMANTIC_REPRODUCIBILITY_FAILED");
  }

  process.stdout.write(`Identity SBOM validation: PASS (components=${bom.components.length}, dependencies=${bom.dependencies.length})\n`);
}

try {
  await main();
} catch (error) {
  const code = error instanceof ValidationFailure ? error.code : "UNEXPECTED_VALIDATION_FAILURE";
  process.stderr.write(`Identity SBOM validation: FAIL (${code})\n`);
  process.exitCode = 1;
}
````


### api/scripts/supply-chain/VulnerabilityScanning.psm1

Original-byte SHA256: 5980a8f10f9d8b598579ecdaa57c145bc58ce4ce9c2525437f79ab34043ff975

````powershell
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Throw-VulnerabilityScanFailure {
    param([Parameter(Mandatory)][string]$Code)
    throw $Code
}

function ConvertTo-UtcDateTimeOffset {
    param([Parameter(Mandatory)][string]$Value, [Parameter(Mandatory)][string]$FailureCode)

    $parsed = [datetimeoffset]::MinValue
    $styles = [System.Globalization.DateTimeStyles]::AllowWhiteSpaces -bor [System.Globalization.DateTimeStyles]::AssumeUniversal
    if (-not [datetimeoffset]::TryParse($Value, [System.Globalization.CultureInfo]::InvariantCulture, $styles, [ref]$parsed)) {
        Throw-VulnerabilityScanFailure -Code $FailureCode
    }
    return $parsed.ToUniversalTime()
}

function Read-TrivyDatabaseMetadata {
    param([Parameter(Mandatory)][string]$MetadataPath)

    if (-not (Test-Path -LiteralPath $MetadataPath -PathType Leaf)) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_DB_METADATA_MISSING'
    }
    try {
        $content = Get-Content -LiteralPath $MetadataPath -Raw -ErrorAction Stop
        if ([string]::IsNullOrWhiteSpace($content)) {
            Throw-VulnerabilityScanFailure -Code 'TRIVY_DB_METADATA_MALFORMED'
        }
        return $content | ConvertFrom-Json -ErrorAction Stop
    } catch {
        if ($_.Exception.Message -match '^TRIVY_DB_METADATA_') {
            throw
        }
        Throw-VulnerabilityScanFailure -Code 'TRIVY_DB_METADATA_MALFORMED'
    }
}

function Test-TrivyDatabaseFreshness {
    [OutputType([pscustomobject])]
    param(
        [Parameter(Mandatory)][string]$MetadataPath,
        [string]$DatabasePath,
        [Parameter(Mandatory)][datetime]$NowUtc,
        [Parameter(Mandatory)][int]$MaxAgeHours,
        [Parameter(Mandatory)][int]$FutureClockSkewSeconds
    )

    if ($MaxAgeHours -le 0 -or $FutureClockSkewSeconds -lt 0) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_DB_FRESHNESS_ARGUMENT_INVALID'
    }

    if ([string]::IsNullOrWhiteSpace($DatabasePath)) {
        $DatabasePath = Join-Path (Split-Path -Parent $MetadataPath) 'trivy.db'
    }
    if (-not (Test-Path -LiteralPath $DatabasePath -PathType Leaf) -or (Get-Item -LiteralPath $DatabasePath).Length -le 0) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_DB_MISSING'
    }

    $metadata = Read-TrivyDatabaseMetadata -MetadataPath $MetadataPath
    $databaseMetadata = Get-OptionalPropertyValue -Object $metadata -Name 'VulnerabilityDB'
    if ($null -eq $databaseMetadata) {
        # Trivy's local db/metadata.json represents the logical
        # VulnerabilityDB object directly, while server/version output wraps it.
        $databaseMetadata = $metadata
    }
    $updatedAtProperty = $databaseMetadata.PSObject.Properties['UpdatedAt']
    if ($null -eq $updatedAtProperty -or [string]::IsNullOrWhiteSpace([string]$updatedAtProperty.Value)) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_DB_UPDATED_AT_MISSING'
    }

    $updatedAt = ConvertTo-UtcDateTimeOffset -Value ([string]$updatedAtProperty.Value) -FailureCode 'TRIVY_DB_UPDATED_AT_MALFORMED'
    $now = [datetimeoffset]::new($NowUtc.ToUniversalTime())
    if ($updatedAt -gt $now.AddSeconds($FutureClockSkewSeconds)) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_DB_UPDATED_AT_FUTURE'
    }

    $age = $now - $updatedAt
    if ($age.TotalHours -gt $MaxAgeHours) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_DB_STALE'
    }

    return [pscustomobject]@{
        UpdatedAtUtc = $updatedAt.UtcDateTime
        AgeHours = [math]::Round($age.TotalHours, 6)
        IsFresh = $true
    }
}

function Update-TrivyDatabase {
    param(
        [Parameter(Mandatory)][string]$TrivyExecutable,
        [Parameter(Mandatory)][string]$CacheDirectory
    )

    if (-not (Test-Path -LiteralPath $TrivyExecutable -PathType Leaf)) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_EXECUTABLE_MISSING'
    }
    if ([string]::IsNullOrWhiteSpace($CacheDirectory)) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_SCAN_PATH_INVALID'
    }
    New-Item -ItemType Directory -Path $CacheDirectory -Force | Out-Null
    $null = @(& $TrivyExecutable image --cache-dir $CacheDirectory --download-db-only --quiet 2>&1)
    if ($LASTEXITCODE -ne 0) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_DB_REFRESH_FAILED'
    }
}

function Confirm-TrivyDatabaseFreshness {
    [OutputType([pscustomobject])]
    param(
        [Parameter(Mandatory)][string]$TrivyExecutable,
        [Parameter(Mandatory)][string]$CacheDirectory,
        [Parameter(Mandatory)][datetime]$NowUtc,
        [Parameter(Mandatory)][int]$MaxAgeHours,
        [Parameter(Mandatory)][int]$FutureClockSkewSeconds,
        [scriptblock]$RefreshAction
    )

    $metadataPath = Join-Path $CacheDirectory 'db\metadata.json'
    $databasePath = Join-Path $CacheDirectory 'db\trivy.db'
    try {
        return Test-TrivyDatabaseFreshness -MetadataPath $metadataPath -DatabasePath $databasePath -NowUtc $NowUtc -MaxAgeHours $MaxAgeHours -FutureClockSkewSeconds $FutureClockSkewSeconds
    } catch {
        if ($_.Exception.Message -notin @('TRIVY_DB_MISSING', 'TRIVY_DB_METADATA_MISSING', 'TRIVY_DB_STALE')) {
            throw
        }
    }

    if ($null -eq $RefreshAction) {
        Update-TrivyDatabase -TrivyExecutable $TrivyExecutable -CacheDirectory $CacheDirectory
    } else {
        & $RefreshAction $TrivyExecutable $CacheDirectory
    }
    try {
        return Test-TrivyDatabaseFreshness -MetadataPath $metadataPath -DatabasePath $databasePath -NowUtc $NowUtc -MaxAgeHours $MaxAgeHours -FutureClockSkewSeconds $FutureClockSkewSeconds
    } catch {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_DB_REFRESH_RESULT_INVALID'
    }
}

function Get-OptionalPropertyValue {
    param($Object, [Parameter(Mandatory)][string]$Name)
    if ($null -eq $Object) {
        return $null
    }
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }
    return $property.Value
}

function Read-TrivyRawReport {
    [OutputType([pscustomobject])]
    param(
        [Parameter(Mandatory)][string]$ReportPath,
        [Parameter(Mandatory)]$ScanDefinition
    )

    if (-not (Test-Path -LiteralPath $ReportPath -PathType Leaf)) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_REPORT_MISSING'
    }
    try {
        $content = Get-Content -LiteralPath $ReportPath -Raw -ErrorAction Stop
        if ([string]::IsNullOrWhiteSpace($content)) {
            Throw-VulnerabilityScanFailure -Code 'TRIVY_REPORT_MALFORMED'
        }
        $report = $content | ConvertFrom-Json -ErrorAction Stop
    } catch {
        if ($_.Exception.Message -match '^TRIVY_REPORT_') {
            throw
        }
        Throw-VulnerabilityScanFailure -Code 'TRIVY_REPORT_MALFORMED'
    }

    if ((Get-OptionalPropertyValue -Object $report -Name 'SchemaVersion') -ne 2) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_REPORT_SCHEMA_VERSION_INVALID'
    }
    $rawResults = Get-OptionalPropertyValue -Object $report -Name 'Results'
    if ($null -eq $rawResults) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_REPORT_RESULTS_MISSING'
    }
    $results = @($rawResults)
    if ($results.Count -eq 0) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_REPORT_RESULTS_MISSING'
    }
    $expectedEcosystem = [string](Get-OptionalPropertyValue -Object $ScanDefinition -Name 'expectedEcosystem')
    if ([string]::IsNullOrWhiteSpace($expectedEcosystem)) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_SCAN_DEFINITION_INVALID'
    }

    $ecosystemPurlPrefix = 'pkg:' + [regex]::Escape($expectedEcosystem) + '/'
    $ecosystemDetected = $false
    foreach ($result in $results) {
        if ([string]::IsNullOrWhiteSpace([string](Get-OptionalPropertyValue -Object $result -Name 'Target'))) {
            Throw-VulnerabilityScanFailure -Code 'TRIVY_REPORT_TARGET_MISSING'
        }
        if ((Get-OptionalPropertyValue -Object $result -Name 'Class') -ne 'lang-pkgs') {
            continue
        }

        $packages = @(Get-OptionalPropertyValue -Object $result -Name 'Packages')
        $findings = @(Get-OptionalPropertyValue -Object $result -Name 'Vulnerabilities')
        foreach ($package in @($packages) + @($findings)) {
            $identifier = Get-OptionalPropertyValue -Object $package -Name 'PkgIdentifier'
            if ($null -eq $identifier) {
                # Trivy 0.74 uses Identifier for the all-packages inventory and
                # PkgIdentifier for vulnerability records.
                $identifier = Get-OptionalPropertyValue -Object $package -Name 'Identifier'
            }
            $purl = [string](Get-OptionalPropertyValue -Object $identifier -Name 'PURL')
            if ($purl -match ('^' + $ecosystemPurlPrefix)) {
                $ecosystemDetected = $true
                break
            }
        }
        if ($ecosystemDetected) {
            break
        }
    }
    if (-not $ecosystemDetected) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_ECOSYSTEM_NOT_DETECTED'
    }

    return [pscustomobject]@{
        Report = $report
        ResultCount = $results.Count
        ExpectedEcosystem = $expectedEcosystem
    }
}

function Get-RequiredString {
    param([Parameter(Mandatory)]$Object, [Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][string]$FailureCode)
    $value = Get-OptionalPropertyValue -Object $Object -Name $Name
    if ([string]::IsNullOrWhiteSpace([string]$value)) {
        Throw-VulnerabilityScanFailure -Code $FailureCode
    }
    return [string]$value
}

function ConvertTo-SanitizedVulnerabilityInventory {
    [OutputType([object[]])]
    param(
        [Parameter(Mandatory)][string]$ReportPath,
        [Parameter(Mandatory)]$ScanDefinition
    )

    $validated = Read-TrivyRawReport -ReportPath $ReportPath -ScanDefinition $ScanDefinition
    $target = Get-RequiredString -Object $ScanDefinition -Name 'input' -FailureCode 'TRIVY_SCAN_DEFINITION_INVALID'
    $targetType = Get-RequiredString -Object $ScanDefinition -Name 'targetType' -FailureCode 'TRIVY_SCAN_DEFINITION_INVALID'
    if ($target -match '(^[A-Za-z]:|^/|^\\|(^|/)\.\.(/|$))') {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_SCAN_DEFINITION_TARGET_UNSAFE'
    }

    $inventory = New-Object System.Collections.Generic.List[object]
    foreach ($result in @($validated.Report.Results)) {
        foreach ($finding in @(Get-OptionalPropertyValue -Object $result -Name 'Vulnerabilities')) {
            if ($null -eq $finding) { continue }
            $findingId = Get-RequiredString -Object $finding -Name 'VulnerabilityID' -FailureCode 'TRIVY_FINDING_ID_MISSING'
            $package = Get-RequiredString -Object $finding -Name 'PkgName' -FailureCode 'TRIVY_COMPONENT_MISSING'
            $affectedVersion = Get-RequiredString -Object $finding -Name 'InstalledVersion' -FailureCode 'TRIVY_AFFECTED_VERSION_MISSING'
            $severity = (Get-RequiredString -Object $finding -Name 'Severity' -FailureCode 'TRIVY_SEVERITY_MISSING').ToUpperInvariant()
            if (@('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL') -notcontains $severity) {
                Throw-VulnerabilityScanFailure -Code 'TRIVY_SEVERITY_INVALID'
            }
            $severitySource = Get-RequiredString -Object $finding -Name 'SeveritySource' -FailureCode 'TRIVY_SEVERITY_SOURCE_MISSING'
            $status = Get-RequiredString -Object $finding -Name 'Status' -FailureCode 'TRIVY_STATUS_MISSING'
            $dataSource = Get-OptionalPropertyValue -Object $finding -Name 'DataSource'
            $source = Get-RequiredString -Object $dataSource -Name 'ID' -FailureCode 'TRIVY_SOURCE_MISSING'
            $fixedVersion = Get-OptionalPropertyValue -Object $finding -Name 'FixedVersion'

            $inventory.Add([pscustomobject]@{
                scanner = 'trivy'
                findingId = $findingId
                source = $source
                targetType = $targetType
                target = $target
                'package/component' = $package
                affectedVersion = $affectedVersion
                fixedVersion = if ([string]::IsNullOrWhiteSpace([string]$fixedVersion)) { $null } else { [string]$fixedVersion }
                severity = $severity
                severitySource = $severitySource
                status = 'observed'
                dispositionId = $null
            })
        }
    }

    return @($inventory | Sort-Object findingId, source, targetType, target, 'package/component', affectedVersion)
}

function ConvertTo-PolicyUtcTimestamp {
    param([Parameter(Mandatory)]$Value, [Parameter(Mandatory)][string]$FailureCode)
    if ([string]::IsNullOrWhiteSpace([string]$Value)) {
        Throw-VulnerabilityScanFailure -Code $FailureCode
    }
    return ConvertTo-UtcDateTimeOffset -Value ([string]$Value) -FailureCode $FailureCode
}

function Assert-ValidDispositionForFinding {
    param(
        [Parameter(Mandatory)]$Disposition,
        [Parameter(Mandatory)]$Finding,
        [Parameter(Mandatory)][datetimeoffset]$NowUtc
    )

    $requiredFields = @(
        'id', 'scanner', 'findingId', 'source', 'targetType', 'target', 'componentOrPackage',
        'affectedVersion', 'severity', 'owner', 'rationale', 'exploitabilityAssessment',
        'compensatingControl', 'remediationTarget', 'ticketReference', 'approvedBy',
        'approvalReference', 'approvedAt', 'expiresAt'
    )
    foreach ($field in $requiredFields) {
        $null = Get-RequiredString -Object $Disposition -Name $field -FailureCode 'VULNERABILITY_DISPOSITION_INVALID'
    }

    $component = Get-RequiredString -Object $Finding -Name 'package/component' -FailureCode 'VULNERABILITY_FINDING_INVALID'
    $matches = (
        $Disposition.scanner -eq $Finding.scanner -and
        $Disposition.findingId -eq $Finding.findingId -and
        $Disposition.source -eq $Finding.source -and
        $Disposition.targetType -eq $Finding.targetType -and
        $Disposition.target -eq $Finding.target -and
        $Disposition.componentOrPackage -eq $component -and
        $Disposition.affectedVersion -eq $Finding.affectedVersion -and
        $Disposition.severity -eq $Finding.severity
    )
    if (-not $matches) {
        Throw-VulnerabilityScanFailure -Code 'VULNERABILITY_DISPOSITION_EXACT_MATCH_FAILED'
    }

    $approvedAt = ConvertTo-PolicyUtcTimestamp -Value $Disposition.approvedAt -FailureCode 'VULNERABILITY_DISPOSITION_INVALID'
    $expiresAt = ConvertTo-PolicyUtcTimestamp -Value $Disposition.expiresAt -FailureCode 'VULNERABILITY_DISPOSITION_INVALID'
    if ($approvedAt -gt $NowUtc) {
        Throw-VulnerabilityScanFailure -Code 'VULNERABILITY_DISPOSITION_APPROVAL_IN_FUTURE'
    }
    if ($expiresAt -le $approvedAt -or $expiresAt -le $NowUtc) {
        Throw-VulnerabilityScanFailure -Code 'VULNERABILITY_DISPOSITION_EXPIRED'
    }
    $maximumValidityDays = if ($Finding.severity -eq 'CRITICAL') { 7 } else { 30 }
    if (($expiresAt - $approvedAt).TotalDays -gt $maximumValidityDays) {
        Throw-VulnerabilityScanFailure -Code 'VULNERABILITY_DISPOSITION_VALIDITY_EXCEEDED'
    }
    if ($Finding.severity -eq 'CRITICAL') {
        $null = Get-RequiredString -Object $Disposition -Name 'criticalRiskAcknowledgement' -FailureCode 'VULNERABILITY_DISPOSITION_CRITICAL_ACK_REQUIRED'
    }
}

function Test-VulnerabilityPolicy {
    [OutputType([object[]])]
    param(
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Inventory,
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Dispositions,
        [Parameter(Mandatory)][datetime]$NowUtc
    )

    $now = [datetimeoffset]::new($NowUtc.ToUniversalTime())
    $decisions = New-Object System.Collections.Generic.List[object]
    foreach ($finding in $Inventory) {
        $severity = (Get-RequiredString -Object $finding -Name 'severity' -FailureCode 'VULNERABILITY_FINDING_INVALID').ToUpperInvariant()
        if (@('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL') -notcontains $severity) {
            Throw-VulnerabilityScanFailure -Code 'VULNERABILITY_FINDING_INVALID'
        }
        if ($severity -eq 'UNKNOWN') {
            Throw-VulnerabilityScanFailure -Code 'UNKNOWN_SEVERITY_FAIL_CLOSED'
        }

        $decisionStatus = 'observed'
        $dispositionId = $null
        if (@('HIGH', 'CRITICAL') -contains $severity) {
            $component = Get-RequiredString -Object $finding -Name 'package/component' -FailureCode 'VULNERABILITY_FINDING_INVALID'
            $matches = @($Dispositions | Where-Object {
                $_.scanner -eq $finding.scanner -and
                $_.findingId -eq $finding.findingId -and
                $_.source -eq $finding.source -and
                $_.targetType -eq $finding.targetType -and
                $_.target -eq $finding.target -and
                $_.componentOrPackage -eq $component -and
                $_.affectedVersion -eq $finding.affectedVersion -and
                $_.severity -eq $severity
            })
            if ($matches.Count -eq 0) {
                Throw-VulnerabilityScanFailure -Code 'HIGH_OR_CRITICAL_DISPOSITION_REQUIRED'
            }
            if ($matches.Count -ne 1) {
                Throw-VulnerabilityScanFailure -Code 'VULNERABILITY_DISPOSITION_AMBIGUOUS'
            }
            Assert-ValidDispositionForFinding -Disposition $matches[0] -Finding $finding -NowUtc $now
            $decisionStatus = 'accepted-risk'
            $dispositionId = [string]$matches[0].id
        }
        $decisions.Add([pscustomobject]@{
            scanner = $finding.scanner
            findingId = $finding.findingId
            source = $finding.source
            targetType = $finding.targetType
            target = $finding.target
            'package/component' = $finding.'package/component'
            affectedVersion = $finding.affectedVersion
            fixedVersion = $finding.fixedVersion
            severity = $severity
            severitySource = $finding.severitySource
            status = $decisionStatus
            dispositionId = $dispositionId
        })
    }
    return $decisions.ToArray()
}

function Get-VerifiedTrivyExecutable {
    [OutputType([string])]
    param()

    $toolingModulePath = Join-Path $PSScriptRoot 'SupplyChainTooling.psm1'
    if (-not (Test-Path -LiteralPath $toolingModulePath -PathType Leaf)) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_BOOTSTRAP_MODULE_MISSING'
    }
    Import-Module $toolingModulePath -Force
    $platform = Resolve-SupportedPlatform
    $cosignPath = Get-VerifiedTool -ToolName 'cosign' -Platform $platform -VerifyOnly
    return Get-VerifiedTool -ToolName 'trivy' -Platform $platform -VerifiedCosignPath $cosignPath -VerifyOnly
}

function Get-TrivyScanArguments {
    [OutputType([string[]])]
    param(
        [Parameter(Mandatory)]$ScanDefinition,
        [Parameter(Mandatory)][string]$CacheDirectory,
        [Parameter(Mandatory)][string]$OutputPath
    )

    $command = Get-RequiredString -Object $ScanDefinition -Name 'command' -FailureCode 'TRIVY_SCAN_DEFINITION_INVALID'
    $input = Get-RequiredString -Object $ScanDefinition -Name 'input' -FailureCode 'TRIVY_SCAN_DEFINITION_INVALID'
    if ($command -notin @('sbom', 'filesystem')) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_SCAN_COMMAND_INVALID'
    }
    if ([string]::IsNullOrWhiteSpace($CacheDirectory) -or [string]::IsNullOrWhiteSpace($OutputPath)) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_SCAN_PATH_INVALID'
    }
    $configuredArguments = @((Get-OptionalPropertyValue -Object $ScanDefinition -Name 'arguments'))
    if ($configuredArguments.Count -eq 0 -or $configuredArguments -notcontains '--skip-db-update') {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_SCAN_FRESHNESS_CONTRACT_MISSING'
    }
    if ($configuredArguments -contains '--ignore-unfixed' -or $configuredArguments -contains '--severity') {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_SCAN_FILTERING_FORBIDDEN'
    }

    return @($command, '--cache-dir', $CacheDirectory) + $configuredArguments + @('--output', $OutputPath, $input)
}

function Invoke-TrivyScan {
    [OutputType([string])]
    param(
        [Parameter(Mandatory)][string]$TrivyExecutable,
        [Parameter(Mandatory)]$ScanDefinition,
        [Parameter(Mandatory)][string]$CacheDirectory,
        [Parameter(Mandatory)][string]$OutputPath
    )

    if (-not (Test-Path -LiteralPath $TrivyExecutable -PathType Leaf)) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_EXECUTABLE_MISSING'
    }
    $input = Get-RequiredString -Object $ScanDefinition -Name 'input' -FailureCode 'TRIVY_SCAN_DEFINITION_INVALID'
    if (-not (Test-Path -LiteralPath $input -PathType Leaf)) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_SCAN_INPUT_MISSING'
    }
    $outputDirectory = Split-Path -Parent $OutputPath
    if ([string]::IsNullOrWhiteSpace($outputDirectory)) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_SCAN_PATH_INVALID'
    }
    New-Item -ItemType Directory -Path $CacheDirectory -Force | Out-Null
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

    $arguments = Get-TrivyScanArguments -ScanDefinition $ScanDefinition -CacheDirectory $CacheDirectory -OutputPath $OutputPath
    $null = @(& $TrivyExecutable @arguments 2>&1)
    if ($LASTEXITCODE -ne 0) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_SCAN_FAILED'
    }
    if (-not (Test-Path -LiteralPath $OutputPath -PathType Leaf) -or (Get-Item -LiteralPath $OutputPath).Length -le 0) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_REPORT_MISSING'
    }
    return $OutputPath
}

function Assert-ExpectedTrivyFixtureFinding {
    param(
        [Parameter(Mandatory)][string]$ReportPath,
        [Parameter(Mandatory)][string]$ExpectedFindingId,
        [Parameter(Mandatory)][string]$ExpectedPackage,
        [Parameter(Mandatory)][string]$ExpectedAffectedVersion,
        [string]$ExpectedSource,
        [string]$ExpectedSeverity,
        [string]$ExpectedFixedVersion
    )

    if (-not (Test-Path -LiteralPath $ReportPath -PathType Leaf)) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_FIXTURE_REPORT_MISSING'
    }
    try {
        $report = (Get-Content -LiteralPath $ReportPath -Raw -ErrorAction Stop) | ConvertFrom-Json -ErrorAction Stop
    } catch {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_FIXTURE_REPORT_MALFORMED'
    }

    $matches = New-Object System.Collections.Generic.List[object]
    foreach ($result in @(Get-OptionalPropertyValue -Object $report -Name 'Results')) {
        foreach ($finding in @(Get-OptionalPropertyValue -Object $result -Name 'Vulnerabilities')) {
            if ($null -eq $finding) { continue }
            $source = Get-OptionalPropertyValue -Object (Get-OptionalPropertyValue -Object $finding -Name 'DataSource') -Name 'ID'
            if (
                (Get-OptionalPropertyValue -Object $finding -Name 'VulnerabilityID') -eq $ExpectedFindingId -and
                (Get-OptionalPropertyValue -Object $finding -Name 'PkgName') -eq $ExpectedPackage -and
                (Get-OptionalPropertyValue -Object $finding -Name 'InstalledVersion') -eq $ExpectedAffectedVersion -and
                ([string]::IsNullOrWhiteSpace($ExpectedSource) -or $source -eq $ExpectedSource) -and
                ([string]::IsNullOrWhiteSpace($ExpectedSeverity) -or (Get-OptionalPropertyValue -Object $finding -Name 'Severity') -eq $ExpectedSeverity) -and
                ([string]::IsNullOrWhiteSpace($ExpectedFixedVersion) -or (Get-OptionalPropertyValue -Object $finding -Name 'FixedVersion') -eq $ExpectedFixedVersion)
            ) {
                $matches.Add($finding)
            }
        }
    }
    if ($matches.Count -ne 1) {
        Throw-VulnerabilityScanFailure -Code 'TRIVY_FIXTURE_FINDING_MISSING'
    }
    return [pscustomobject]@{
        findingId = $ExpectedFindingId
        package = $ExpectedPackage
        affectedVersion = $ExpectedAffectedVersion
        fixedVersion = $ExpectedFixedVersion
        source = $ExpectedSource
        severity = $ExpectedSeverity
    }
}

Export-ModuleMember -Function 'Test-TrivyDatabaseFreshness', 'Update-TrivyDatabase', 'Confirm-TrivyDatabaseFreshness', 'Read-TrivyRawReport', 'ConvertTo-SanitizedVulnerabilityInventory', 'Test-VulnerabilityPolicy', 'Get-VerifiedTrivyExecutable', 'Get-TrivyScanArguments', 'Invoke-TrivyScan', 'Assert-ExpectedTrivyFixtureFinding'
````


### api/security/schemas/container-base-images.schema.json

Original-byte SHA256: 6f2c23798b5479ce86954e8be3a5fe2f7e8d5ec21a8b919497f63b7d580a0250

````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/auction-promax/api/security/schemas/container-base-images.schema.json",
  "title": "Container Base Image Trust Manifest",
  "description": "Cycle 5 fail-closed trust contract for the Identity service runtime base image. The reviewed tag, multi-platform index digest, linux/amd64 platform manifest digest, runtime family, and official source are all repository-owned immutable values. A tag alone is never a trust anchor.",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "images"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "images": {
      "type": "array",
      "minItems": 1,
      "maxItems": 1,
      "prefixItems": [{ "$ref": "#/$defs/identityRuntimeImage" }],
      "items": false
    }
  },
  "$defs": {
    "digest": {
      "type": "string",
      "pattern": "^sha256:[a-f0-9]{64}$"
    },
    "identityRuntimeImage": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "repository", "reviewedTag", "indexDigest", "platform", "platformManifestDigest", "manifestMediaType", "runtime", "officialSource", "reviewedAtUtc"],
      "properties": {
        "id": { "const": "identity-profile-service-runtime" },
        "repository": { "const": "docker.io/library/amazoncorretto" },
        "reviewedTag": { "const": "21.0.12-al2023-headless" },
        "indexDigest": { "allOf": [{ "$ref": "#/$defs/digest" }, { "const": "sha256:9d84285ae8bf9d4251bbdf4881a598240bd6908817096b64de246ce022ec7d86" }] },
        "platform": { "$ref": "#/$defs/linuxAmd64" },
        "platformManifestDigest": { "allOf": [{ "$ref": "#/$defs/digest" }, { "const": "sha256:82eb6e99cb91fb87f5a65a933750ae5bb23cab4ab396e4bba4a5b0b07dcd32ff" }] },
        "manifestMediaType": { "const": "application/vnd.oci.image.manifest.v1+json" },
        "runtime": { "$ref": "#/$defs/correttoAl2023Headless" },
        "officialSource": { "const": "https://github.com/corretto/corretto-docker.git#a2028380492e3f5128dca6b06c1e26b10e9b8f04:21/headless/al2023" },
        "reviewedAtUtc": { "const": "2026-09-22T07:00:00Z" }
      }
    },
    "linuxAmd64": {
      "type": "object",
      "additionalProperties": false,
      "required": ["os", "architecture"],
      "properties": {
        "os": { "const": "linux" },
        "architecture": { "const": "amd64" }
      }
    },
    "correttoAl2023Headless": {
      "type": "object",
      "additionalProperties": false,
      "required": ["javaMajor", "operatingSystem", "distribution"],
      "properties": {
        "javaMajor": { "const": 21 },
        "operatingSystem": { "const": "amazon-linux-2023" },
        "distribution": { "const": "headless" }
      }
    }
  }
}
````


### api/security/schemas/container-image-contract.schema.json

Original-byte SHA256: e20297b18aa80ca9673b6f4ef5160df193026d4412ff3ea54bbb0b708450f031

````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/auction-promax/api/security/schemas/container-image-contract.schema.json",
  "title": "Cycle 5 Container Image Execution Contract",
  "description": "Fail-closed contract for the Identity service local container image. It fixes the prebuilt-JAR build boundary, linux/amd64 non-root runtime, technical smoke hardening, Trivy image command vector, required OS/Java detection, sanitized evidence, and the existing Critical/High disposition policy.",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "image", "build", "runtime", "technicalSmoke", "scan", "evidence", "policy"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "image": { "$ref": "#/$defs/image" },
    "build": { "$ref": "#/$defs/build" },
    "runtime": { "$ref": "#/$defs/runtime" },
    "technicalSmoke": { "$ref": "#/$defs/technicalSmoke" },
    "scan": { "$ref": "#/$defs/scan" },
    "evidence": { "$ref": "#/$defs/evidence" },
    "policy": { "$ref": "#/$defs/policy" }
  },
  "$defs": {
    "image": {
      "type": "object", "additionalProperties": false,
      "required": ["id", "localReference", "platform", "baseImageManifestId"],
      "properties": {
        "id": { "const": "identity-profile-service" },
        "localReference": { "const": "auction-promax/identity-profile-service:s001-t07" },
        "platform": { "const": "linux/amd64" },
        "baseImageManifestId": { "const": "identity-profile-service-runtime" }
      }
    },
    "build": {
      "type": "object", "additionalProperties": false,
      "required": ["dockerfileRelativePath", "contextRelativePath", "canonicalJarRelativePath", "mavenBuildLocation", "dependencyResolution", "credentials"],
      "properties": {
        "dockerfileRelativePath": { "const": "services/identity-profile-service/Dockerfile" },
        "contextRelativePath": { "const": "services/identity-profile-service" },
        "canonicalJarRelativePath": { "const": "services/identity-profile-service/target/identity-profile-service-0.0.1-SNAPSHOT.jar" },
        "mavenBuildLocation": { "const": "outside-docker" },
        "dependencyResolution": { "const": "forbidden-in-docker" },
        "credentials": { "const": "forbidden-in-docker" }
      }
    },
    "runtime": {
      "type": "object", "additionalProperties": false,
      "required": ["user", "workingDirectory", "applicationJarPath", "exposedPort", "entrypoint", "healthcheck"],
      "properties": {
        "user": { "const": "10001:10001" },
        "workingDirectory": { "const": "/app" },
        "applicationJarPath": { "const": "/app/app.jar" },
        "exposedPort": { "const": "8080/tcp" },
        "entrypoint": { "const": ["java", "-jar", "/app/app.jar"] },
        "healthcheck": { "const": "absent" }
      }
    },
    "technicalSmoke": {
      "type": "object", "additionalProperties": false,
      "required": ["profile", "readinessPath", "loopbackOnly", "readOnlyRootFilesystem", "tmpfsPath", "dropAllCapabilities", "noNewPrivileges", "pidsLimit", "startupTimeoutSeconds"],
      "properties": {
        "profile": { "const": "technical-local" },
        "readinessPath": { "const": "/actuator/health/readiness" },
        "loopbackOnly": { "const": true },
        "readOnlyRootFilesystem": { "const": true },
        "tmpfsPath": { "const": "/tmp" },
        "dropAllCapabilities": { "const": true },
        "noNewPrivileges": { "const": true },
        "pidsLimit": { "const": 256 },
        "startupTimeoutSeconds": { "const": 120 }
      }
    },
    "scan": {
      "type": "object", "additionalProperties": false,
      "required": ["scanner", "command", "targetType", "databaseContractRelativePath", "requiredDetections", "arguments"],
      "properties": {
        "scanner": { "$ref": "#/$defs/scanner" },
        "command": { "const": "image" },
        "targetType": { "const": "container-image" },
        "databaseContractRelativePath": { "const": "security/tooling/vulnerability-scan-contract.json" },
        "requiredDetections": { "const": ["os", "java-library"] },
        "arguments": { "const": ["--scanners", "vuln", "--image-src", "docker", "--platform", "linux/amd64", "--format", "json", "--quiet", "--exit-code", "0", "--skip-db-update", "--skip-vex-repo-update", "--skip-version-check", "--timeout", "300s"] }
      }
    },
    "scanner": {
      "type": "object", "additionalProperties": false,
      "required": ["name", "version", "installation"],
      "properties": {
        "name": { "const": "trivy" },
        "version": { "const": "0.74.0" },
        "installation": { "const": "cycle-1-verified-bootstrap" }
      }
    },
    "evidence": {
      "type": "object", "additionalProperties": false,
      "required": ["rawReports", "sanitizedInventoryRelativePath", "sanitizedInventoryFields"],
      "properties": {
        "rawReports": { "const": "temporary-only" },
        "sanitizedInventoryRelativePath": { "const": "services/identity-profile-service/target/s001-t07-evidence/container-vulnerability-inventory.json" },
        "sanitizedInventoryFields": { "const": ["scanner", "findingId", "source", "targetType", "target", "package/component", "affectedVersion", "fixedVersion", "severity", "severitySource", "status", "dispositionId"] }
      }
    },
    "policy": {
      "type": "object", "additionalProperties": false,
      "required": ["mustRun", "highAndCritical", "mediumAndLow", "unknown", "ignoreUnfixed"],
      "properties": {
        "mustRun": { "const": true },
        "highAndCritical": { "const": "fail-unless-exact-valid-disposition" },
        "mediumAndLow": { "const": "report-non-blocking" },
        "unknown": { "const": "fail-closed" },
        "ignoreUnfixed": { "const": false }
      }
    }
  }
}
````


### api/security/schemas/cyclonedx-schemas.schema.json

Original-byte SHA256: 1078c3283623d9bed711d0adb0cc61088ba6606b0df3c8c2196aac23eebb8259

````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/auction-promax/api/security/schemas/cyclonedx-schemas.schema.json",
  "title": "CycloneDX 1.6 Schema Trust Manifest",
  "description": "Fail-closed Cycle 2 contract for the reviewed CycloneDX 1.6 JSON Schema trust set. Schema files are vendored only after each official tag asset matches this committed SHA-256 value.",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "specVersion", "officialSchemaBaseUrl", "assets"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "specVersion": { "const": "1.6" },
    "officialSchemaBaseUrl": { "const": "https://raw.githubusercontent.com/CycloneDX/specification/1.6/schema" },
    "assets": {
      "type": "array",
      "minItems": 3,
      "maxItems": 3,
      "prefixItems": [
        { "$ref": "#/$defs/bomSchema" },
        { "$ref": "#/$defs/spdxSchema" },
        { "$ref": "#/$defs/jsfSchema" }
      ],
      "items": false
    }
  },
  "$defs": {
    "sha256": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "not": { "const": "0000000000000000000000000000000000000000000000000000000000000000" }
    },
    "asset": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "sha256"],
      "properties": {
        "name": { "type": "string" },
        "sha256": { "$ref": "#/$defs/sha256" }
      }
    },
    "bomSchema": {
      "type": "object",
      "$ref": "#/$defs/asset",
      "properties": {
        "name": { "const": "bom-1.6.schema.json" },
        "sha256": { "const": "3e92dddbc30cf7f6a02b80f0942b1a4cfd4fb1c26f1dfc4310afa9d613cafb93" }
      }
    },
    "spdxSchema": {
      "type": "object",
      "$ref": "#/$defs/asset",
      "properties": {
        "name": { "const": "spdx.schema.json" },
        "sha256": { "const": "baa9d3bd1ed57b6751b0887edead6b5063ff53ff7429cf85d476c6c94af0166e" }
      }
    },
    "jsfSchema": {
      "type": "object",
      "$ref": "#/$defs/asset",
      "properties": {
        "name": { "const": "jsf-0.82.schema.json" },
        "sha256": { "const": "8bae002c25e723db7ee1f26afde680ae1a2b1a8f6b4b4b0fd65dc3becb090aae" }
      }
    }
  }
}
````


### api/security/schemas/hosted-supply-chain-contract.schema.json

Original-byte SHA256: 2b7d8bbcf1666e13c52fb4eb8e14be7422e9735a9f2a726d8660cef29a67fa7e

````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/auction-promax/api/security/schemas/hosted-supply-chain-contract.schema.json",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "workflowPaths", "actions", "runners", "timeouts", "jobs", "evidence"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "workflowPaths": { "$ref": "#/$defs/workflowPaths" },
    "actions": { "$ref": "#/$defs/actions" },
    "runners": { "$ref": "#/$defs/runners" },
    "timeouts": { "$ref": "#/$defs/timeouts" },
    "jobs": { "$ref": "#/$defs/jobs" },
    "evidence": { "$ref": "#/$defs/evidence" }
  },
  "$defs": {
    "workflowPaths": { "type": "object", "additionalProperties": false, "required": ["baseline", "supplyChain", "freshness"], "properties": { "baseline": { "const": ".github/workflows/api-baseline.yml" }, "supplyChain": { "const": ".github/workflows/supply-chain.yml" }, "freshness": { "const": ".github/workflows/security-freshness.yml" } } },
    "actions": { "type": "object", "additionalProperties": false, "required": ["checkout", "setupJava", "setupNode", "uploadArtifact"], "properties": { "checkout": { "const": "11d5960a326750d5838078e36cf38b85af677262" }, "setupJava": { "const": "cf277c60eb25467037889841efdb72551f06f6c3" }, "setupNode": { "const": "49933ea5288caeca8642d1e84afbd3f7d6820020" }, "uploadArtifact": { "const": "ea165f8d65b6e75b540449e92b4886f43607fa02" } } },
    "runners": { "type": "object", "additionalProperties": false, "required": ["hostedLinux"], "properties": { "hostedLinux": { "const": "ubuntu-24.04" } } },
    "timeouts": { "type": "object", "additionalProperties": false, "required": ["verificationMinutes", "releasePolicyMinutes", "freshnessMinutes"], "properties": { "verificationMinutes": { "const": 60 }, "releasePolicyMinutes": { "const": 5 }, "freshnessMinutes": { "const": 60 } } },
    "jobs": { "type": "object", "additionalProperties": false, "required": ["verification", "releasePolicy", "freshness"], "properties": { "verification": { "const": "supply-chain-verification" }, "releasePolicy": { "const": "release-policy" }, "freshness": { "const": "security-freshness" } } },
    "evidence": { "type": "object", "additionalProperties": false, "required": ["relativePath", "retentionDays", "files"], "properties": { "relativePath": { "const": "s001-t07-evidence/hosted" }, "retentionDays": { "const": 30 }, "files": { "const": ["run-summary.json", "vulnerability-inventory.json", "gitleaks-inventory.json", "container-vulnerability-inventory.json", "image-identity.json", "smoke-summary.json", "policy-summary.json"] } } }
  }
}
````


### api/security/schemas/hosted-supply-chain-evidence.schema.json

Original-byte SHA256: 92cefe2c2a3743efe1eaa51fc6af894fc61726be184d3a42b9ba76d74ae85079

````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/auction-promax/api/security/schemas/hosted-supply-chain-evidence.schema.json",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "commit"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "commit": { "type": "string", "pattern": "^[a-f0-9]{40}$" }
  }
}
````


### api/security/schemas/supply-chain-run-summary.schema.json

Original-byte SHA256: 8a88eea84f9101b9e7fd4b4276a2f8a8b69404cc14fdf780ef06298a44c3f9b3

````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/auction-promax/api/security/schemas/supply-chain-run-summary.schema.json",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "workflow", "commit", "executionState", "policyState", "reviewState", "deltaState", "failureCode"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "workflow": { "enum": ["supply-chain", "security-freshness"] },
    "commit": { "type": "string", "pattern": "^[a-f0-9]{40}$" },
    "executionState": { "enum": ["IMPLEMENTATION_FAILURE", "PASS"] },
    "policyState": { "enum": ["NOT_EVALUATED", "PASS", "BLOCKED"] },
    "reviewState": { "enum": ["NOT_REQUIRED", "REVIEW_REQUIRED"] },
    "deltaState": { "enum": ["NOT_APPLICABLE", "UNCHANGED", "NEW", "REMEDIATED", "BASELINE_UNAVAILABLE"] },
    "failureCode": { "enum": ["SUPPLY_CHAIN_NOT_STARTED", "CHECKOUT_FAILED", "CONTRACT_VALIDATION_FAILED", "TOOL_BOOTSTRAP_FAILED", "SBOM_BUILD_FAILED", "SBOM_VALIDATION_FAILED", "DEPENDENCY_SCAN_FAILED", "SECRET_SCAN_FAILED", "BASE_TRUST_FAILED", "IMAGE_BUILD_FAILED", "SMOKE_FAILED", "CONTAINER_SCAN_FAILED", "SCANNER_OUTPUT_INVALID", "POLICY_EVALUATION_FAILED", "EVIDENCE_SANITIZATION_FAILED", "EVIDENCE_VALIDATION_FAILED", "EVIDENCE_UPLOAD_FAILED", "CLEANUP_FAILED", "NONE"] }
  }
}
````


### api/security/schemas/supply-chain-tools.schema.json

Original-byte SHA256: 11584244d4778323a7ef682df062c566f6f4a0cd263971156a62158f28688acd

````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/auction-promax/api/security/schemas/supply-chain-tools.schema.json",
  "title": "Supply-Chain Tool Bootstrap Manifest",
  "description": "Cycle 1 fail-closed contract for the reviewed Trivy, Gitleaks, and Cosign release assets. Tool identity, version, release URL, version command, provenance metadata, platform asset mapping, and archive semantics are fixed. SHA-256 values are manifest-owned trust anchors and must be lowercase, non-placeholder digests; their actual values are verified at bootstrap execution.",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "tools"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "tools": {
      "type": "array",
      "minItems": 3,
      "maxItems": 3,
      "prefixItems": [
        { "$ref": "#/$defs/trivyTool" },
        { "$ref": "#/$defs/gitleaksTool" },
        { "$ref": "#/$defs/cosignTool" }
      ],
      "items": false
    }
  },
  "$defs": {
    "sha256": {
      "type": "string",
      "pattern": "^[a-f0-9]{64}$",
      "not": { "const": "0000000000000000000000000000000000000000000000000000000000000000" }
    },
    "trivyTool": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "version", "officialReleaseBaseUrl", "versionArguments", "versionPattern", "sigstore", "platforms"],
      "properties": {
        "name": { "const": "trivy" },
        "version": { "const": "0.74.0" },
        "officialReleaseBaseUrl": { "const": "https://github.com/aquasecurity/trivy/releases/download/v0.74.0" },
        "versionArguments": { "const": ["--version"] },
        "versionPattern": { "const": "(?m)^Version:[ \\t]*0\\.74\\.0[ \\t]*\\r?$" },
        "sigstore": { "$ref": "#/$defs/trivySigstore" },
        "platforms": { "$ref": "#/$defs/trivyPlatforms" }
      }
    },
    "gitleaksTool": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "version", "officialReleaseBaseUrl", "versionArguments", "versionPattern", "platforms"],
      "properties": {
        "name": { "const": "gitleaks" },
        "version": { "const": "8.30.0" },
        "officialReleaseBaseUrl": { "const": "https://github.com/gitleaks/gitleaks/releases/download/v8.30.0" },
        "versionArguments": { "const": ["version"] },
        "versionPattern": { "const": "(?m)^8\\.30\\.0[ \\t]*\\r?$" },
        "platforms": { "$ref": "#/$defs/gitleaksPlatforms" }
      }
    },
    "cosignTool": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "version", "officialReleaseBaseUrl", "versionArguments", "versionPattern", "purpose", "platforms"],
      "properties": {
        "name": { "const": "cosign" },
        "version": { "const": "3.1.2" },
        "officialReleaseBaseUrl": { "const": "https://github.com/sigstore/cosign/releases/download/v3.1.2" },
        "versionArguments": { "const": ["version"] },
        "versionPattern": { "const": "(?m)^GitVersion:[ \\t]*v3\\.1\\.2[ \\t]*\\r?$" },
        "purpose": { "const": "release-provenance" },
        "platforms": { "$ref": "#/$defs/cosignPlatforms" }
      }
    },
    "trivySigstore": {
      "type": "object",
      "additionalProperties": false,
      "required": ["bundleAssetSuffix", "certificateOidcIssuer", "certificateIdentity"],
      "properties": {
        "bundleAssetSuffix": { "const": ".sigstore.json" },
        "certificateOidcIssuer": { "const": "https://token.actions.githubusercontent.com" },
        "certificateIdentity": { "const": "https://github.com/aquasecurity/trivy/.github/workflows/reusable-release.yaml@refs/tags/v0.74.0" }
      }
    },
    "trivyPlatforms": {
      "type": "object", "additionalProperties": false, "required": ["windows-x64", "linux-x64"],
      "properties": { "windows-x64": { "$ref": "#/$defs/trivyWindows" }, "linux-x64": { "$ref": "#/$defs/trivyLinux" } }
    },
    "gitleaksPlatforms": {
      "type": "object", "additionalProperties": false, "required": ["windows-x64", "linux-x64"],
      "properties": { "windows-x64": { "$ref": "#/$defs/gitleaksWindows" }, "linux-x64": { "$ref": "#/$defs/gitleaksLinux" } }
    },
    "cosignPlatforms": {
      "type": "object", "additionalProperties": false, "required": ["windows-x64", "linux-x64"],
      "properties": { "windows-x64": { "$ref": "#/$defs/cosignWindows" }, "linux-x64": { "$ref": "#/$defs/cosignLinux" } }
    },
    "trivyWindows": { "type": "object", "$ref": "#/$defs/platform", "properties": { "assetName": { "const": "trivy_0.74.0_windows-64bit.zip" }, "sha256": { "$ref": "#/$defs/sha256" }, "archiveType": { "const": "zip" }, "executableName": { "const": "trivy.exe" } } },
    "trivyLinux": { "type": "object", "$ref": "#/$defs/platform", "properties": { "assetName": { "const": "trivy_0.74.0_Linux-64bit.tar.gz" }, "sha256": { "$ref": "#/$defs/sha256" }, "archiveType": { "const": "tar.gz" }, "executableName": { "const": "trivy" } } },
    "gitleaksWindows": { "type": "object", "$ref": "#/$defs/platform", "properties": { "assetName": { "const": "gitleaks_8.30.0_windows_x64.zip" }, "sha256": { "$ref": "#/$defs/sha256" }, "archiveType": { "const": "zip" }, "executableName": { "const": "gitleaks.exe" } } },
    "gitleaksLinux": { "type": "object", "$ref": "#/$defs/platform", "properties": { "assetName": { "const": "gitleaks_8.30.0_linux_x64.tar.gz" }, "sha256": { "$ref": "#/$defs/sha256" }, "archiveType": { "const": "tar.gz" }, "executableName": { "const": "gitleaks" } } },
    "cosignWindows": { "type": "object", "$ref": "#/$defs/platform", "properties": { "assetName": { "const": "cosign-windows-amd64.exe" }, "sha256": { "$ref": "#/$defs/sha256" }, "archiveType": { "const": "binary" }, "executableName": { "const": "cosign.exe" } } },
    "cosignLinux": { "type": "object", "$ref": "#/$defs/platform", "properties": { "assetName": { "const": "cosign-linux-amd64" }, "sha256": { "$ref": "#/$defs/sha256" }, "archiveType": { "const": "binary" }, "executableName": { "const": "cosign" } } },
    "platform": {
      "type": "object",
      "additionalProperties": false,
      "required": ["assetName", "sha256", "archiveType", "executableName"],
      "properties": {
        "assetName": true,
        "sha256": true,
        "archiveType": true,
        "executableName": true
      }
    }
  }
}
````


### api/security/schemas/vulnerability-scan-contract.schema.json

Original-byte SHA256: db8b5498a5de9d3eec4fc4ecc35736926c67f2bb3106bc3c82d61c2d0c198ea1

````json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/auction-promax/api/security/schemas/vulnerability-scan-contract.schema.json",
  "title": "Cycle 3 Vulnerability Scan Execution Contract",
  "description": "Fail-closed contract for direct Trivy 0.74.0 SBOM and npm lockfile vulnerability scans. Database freshness is verified before scanner invocation; raw reports are temporary only and policy evaluation is mandatory.",
  "type": "object",
  "additionalProperties": false,
  "required": ["schemaVersion", "scanner", "database", "scans", "reportHandling", "policy"],
  "properties": {
    "schemaVersion": { "const": 1 },
    "scanner": { "$ref": "#/$defs/scanner" },
    "database": { "$ref": "#/$defs/database" },
    "scans": {
      "type": "array",
      "prefixItems": [
        { "$ref": "#/$defs/identityScan" },
        { "$ref": "#/$defs/infraScan" }
      ],
      "minItems": 2,
      "maxItems": 2,
      "items": false
    },
    "reportHandling": { "$ref": "#/$defs/reportHandling" },
    "policy": { "$ref": "#/$defs/policy" }
  },
  "$defs": {
    "scanner": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "version", "installation"],
      "properties": {
        "name": { "const": "trivy" },
        "version": { "const": "0.74.0" },
        "installation": { "const": "cycle-1-verified-bootstrap" }
      }
    },
    "database": {
      "type": "object",
      "additionalProperties": false,
      "required": ["cacheRelativePath", "authoritativeUpdatedAt", "maxAgeHours", "futureClockSkewSeconds", "refreshBeforeScanWhenStale", "scannerArgumentsAfterFreshnessVerification"],
      "properties": {
        "cacheRelativePath": { "const": ".tools/supply-chain/trivy-cache" },
        "authoritativeUpdatedAt": { "const": "VulnerabilityDB.UpdatedAt" },
        "maxAgeHours": { "const": 24 },
        "futureClockSkewSeconds": { "const": 300 },
        "refreshBeforeScanWhenStale": { "const": true },
        "scannerArgumentsAfterFreshnessVerification": { "const": ["--skip-db-update"] }
      }
    },
    "identityScan": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "command", "input", "targetType", "expectedEcosystem", "arguments"],
      "properties": {
        "id": { "const": "identity-sbom" },
        "command": { "const": "sbom" },
        "input": { "const": "services/identity-profile-service/target/bom.json" },
        "targetType": { "const": "sbom" },
        "expectedEcosystem": { "const": "maven" },
        "arguments": { "const": ["--scanners", "vuln", "--format", "json", "--quiet", "--exit-code", "0", "--skip-db-update"] }
      }
    },
    "infraScan": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "command", "input", "targetType", "expectedEcosystem", "arguments"],
      "properties": {
        "id": { "const": "infra-package-lock" },
        "command": { "const": "filesystem" },
        "input": { "const": "infra/package-lock.json" },
        "targetType": { "const": "filesystem" },
        "expectedEcosystem": { "const": "npm" },
        "arguments": { "const": ["--scanners", "vuln", "--include-dev-deps", "--format", "json", "--quiet", "--exit-code", "0", "--skip-db-update"] }
      }
    },
    "reportHandling": {
      "type": "object",
      "additionalProperties": false,
      "required": ["rawReports", "sanitizedInventoryFields"],
      "properties": {
        "rawReports": { "const": "temporary-only" },
        "sanitizedInventoryFields": {
          "const": ["scanner", "findingId", "source", "targetType", "target", "package/component", "affectedVersion", "fixedVersion", "severity", "severitySource", "status", "dispositionId"]
        }
      }
    },
    "policy": {
      "type": "object",
      "additionalProperties": false,
      "required": ["mustRun", "highAndCritical", "mediumAndLow", "unknown", "ignoreUnfixed"],
      "properties": {
        "mustRun": { "const": true },
        "highAndCritical": { "const": "fail-unless-exact-valid-disposition" },
        "mediumAndLow": { "const": "report-non-blocking" },
        "unknown": { "const": "fail-closed" },
        "ignoreUnfixed": { "const": false }
      }
    }
  }
}
````


### api/security/tooling/container-base-images.json

Original-byte SHA256: 216e8463ffcc6576128043f51ee5b563f14ccacbce013f4ec15762fbb413eba0

````json
{
  "schemaVersion": 1,
  "images": [
    {
      "id": "identity-profile-service-runtime",
      "repository": "docker.io/library/amazoncorretto",
      "reviewedTag": "21.0.12-al2023-headless",
      "indexDigest": "sha256:9d84285ae8bf9d4251bbdf4881a598240bd6908817096b64de246ce022ec7d86",
      "platform": {
        "os": "linux",
        "architecture": "amd64"
      },
      "platformManifestDigest": "sha256:82eb6e99cb91fb87f5a65a933750ae5bb23cab4ab396e4bba4a5b0b07dcd32ff",
      "manifestMediaType": "application/vnd.oci.image.manifest.v1+json",
      "runtime": {
        "javaMajor": 21,
        "operatingSystem": "amazon-linux-2023",
        "distribution": "headless"
      },
      "officialSource": "https://github.com/corretto/corretto-docker.git#a2028380492e3f5128dca6b06c1e26b10e9b8f04:21/headless/al2023",
      "reviewedAtUtc": "2026-09-22T07:00:00Z"
    }
  ]
}
````


### api/security/tooling/container-image-contract.json

Original-byte SHA256: 902cd9faeb2bc1b2633976ec05545c5139d5391c1bb143126ac671db4528864d

````json
{
  "schemaVersion": 1,
  "image": {
    "id": "identity-profile-service",
    "localReference": "auction-promax/identity-profile-service:s001-t07",
    "platform": "linux/amd64",
    "baseImageManifestId": "identity-profile-service-runtime"
  },
  "build": {
    "dockerfileRelativePath": "services/identity-profile-service/Dockerfile",
    "contextRelativePath": "services/identity-profile-service",
    "canonicalJarRelativePath": "services/identity-profile-service/target/identity-profile-service-0.0.1-SNAPSHOT.jar",
    "mavenBuildLocation": "outside-docker",
    "dependencyResolution": "forbidden-in-docker",
    "credentials": "forbidden-in-docker"
  },
  "runtime": {
    "user": "10001:10001",
    "workingDirectory": "/app",
    "applicationJarPath": "/app/app.jar",
    "exposedPort": "8080/tcp",
    "entrypoint": ["java", "-jar", "/app/app.jar"],
    "healthcheck": "absent"
  },
  "technicalSmoke": {
    "profile": "technical-local",
    "readinessPath": "/actuator/health/readiness",
    "loopbackOnly": true,
    "readOnlyRootFilesystem": true,
    "tmpfsPath": "/tmp",
    "dropAllCapabilities": true,
    "noNewPrivileges": true,
    "pidsLimit": 256,
    "startupTimeoutSeconds": 120
  },
  "scan": {
    "scanner": {
      "name": "trivy",
      "version": "0.74.0",
      "installation": "cycle-1-verified-bootstrap"
    },
    "command": "image",
    "targetType": "container-image",
    "databaseContractRelativePath": "security/tooling/vulnerability-scan-contract.json",
    "requiredDetections": ["os", "java-library"],
    "arguments": [
      "--scanners", "vuln",
      "--image-src", "docker",
      "--platform", "linux/amd64",
      "--format", "json",
      "--quiet",
      "--exit-code", "0",
      "--skip-db-update",
      "--skip-vex-repo-update",
      "--skip-version-check",
      "--timeout", "300s"
    ]
  },
  "evidence": {
    "rawReports": "temporary-only",
    "sanitizedInventoryRelativePath": "services/identity-profile-service/target/s001-t07-evidence/container-vulnerability-inventory.json",
    "sanitizedInventoryFields": [
      "scanner",
      "findingId",
      "source",
      "targetType",
      "target",
      "package/component",
      "affectedVersion",
      "fixedVersion",
      "severity",
      "severitySource",
      "status",
      "dispositionId"
    ]
  },
  "policy": {
    "mustRun": true,
    "highAndCritical": "fail-unless-exact-valid-disposition",
    "mediumAndLow": "report-non-blocking",
    "unknown": "fail-closed",
    "ignoreUnfixed": false
  }
}
````


### api/security/tooling/cyclonedx-schemas.json

Original-byte SHA256: f3457d56bb27f41d0abfc21602b21371811e5f6057cee67e45c5b0021fe32902

````json
{
  "schemaVersion": 1,
  "specVersion": "1.6",
  "officialSchemaBaseUrl": "https://raw.githubusercontent.com/CycloneDX/specification/1.6/schema",
  "assets": [
    {
      "name": "bom-1.6.schema.json",
      "sha256": "3e92dddbc30cf7f6a02b80f0942b1a4cfd4fb1c26f1dfc4310afa9d613cafb93"
    },
    {
      "name": "spdx.schema.json",
      "sha256": "baa9d3bd1ed57b6751b0887edead6b5063ff53ff7429cf85d476c6c94af0166e"
    },
    {
      "name": "jsf-0.82.schema.json",
      "sha256": "8bae002c25e723db7ee1f26afde680ae1a2b1a8f6b4b4b0fd65dc3becb090aae"
    }
  ]
}
````


### api/security/tooling/hosted-supply-chain-contract.json

Original-byte SHA256: dcad730240ca6c3f9441e974f85f7adf32403e51e7c34d31ac6d6e232005ed35

````json
{
  "schemaVersion": 1,
  "workflowPaths": {
    "baseline": ".github/workflows/api-baseline.yml",
    "supplyChain": ".github/workflows/supply-chain.yml",
    "freshness": ".github/workflows/security-freshness.yml"
  },
  "actions": {
    "checkout": "11d5960a326750d5838078e36cf38b85af677262",
    "setupJava": "cf277c60eb25467037889841efdb72551f06f6c3",
    "setupNode": "49933ea5288caeca8642d1e84afbd3f7d6820020",
    "uploadArtifact": "ea165f8d65b6e75b540449e92b4886f43607fa02"
  },
  "runners": { "hostedLinux": "ubuntu-24.04" },
  "timeouts": { "verificationMinutes": 60, "releasePolicyMinutes": 5, "freshnessMinutes": 60 },
  "jobs": {
    "verification": "supply-chain-verification",
    "releasePolicy": "release-policy",
    "freshness": "security-freshness"
  },
  "evidence": {
    "relativePath": "s001-t07-evidence/hosted",
    "retentionDays": 30,
    "files": [
      "run-summary.json",
      "vulnerability-inventory.json",
      "gitleaks-inventory.json",
      "container-vulnerability-inventory.json",
      "image-identity.json",
      "smoke-summary.json",
      "policy-summary.json"
    ]
  }
}
````


### api/security/tooling/supply-chain-tools.json

Original-byte SHA256: b9da13d465e1fd4c8c0fdcf53ab3381c2f5b8362542c08702bc693a4840bbf42

````json
{
  "schemaVersion": 1,
  "tools": [
    {
      "name": "trivy",
      "version": "0.74.0",
      "officialReleaseBaseUrl": "https://github.com/aquasecurity/trivy/releases/download/v0.74.0",
      "versionArguments": ["--version"],
      "versionPattern": "(?m)^Version:[ \\t]*0\\.74\\.0[ \\t]*\\r?$",
      "sigstore": {
        "bundleAssetSuffix": ".sigstore.json",
        "certificateOidcIssuer": "https://token.actions.githubusercontent.com",
        "certificateIdentity": "https://github.com/aquasecurity/trivy/.github/workflows/reusable-release.yaml@refs/tags/v0.74.0"
      },
      "platforms": {
        "windows-x64": {
          "assetName": "trivy_0.74.0_windows-64bit.zip",
          "sha256": "94c40e0696e4b907a74b7b2e1438d5d72ebaca83115817407f568a002d520842",
          "archiveType": "zip",
          "executableName": "trivy.exe"
        },
        "linux-x64": {
          "assetName": "trivy_0.74.0_Linux-64bit.tar.gz",
          "sha256": "2ae6fe3ee734b7fdf11335663e18c75ea12dccc76062f09f164a3b0f8be4371a",
          "archiveType": "tar.gz",
          "executableName": "trivy"
        }
      }
    },
    {
      "name": "gitleaks",
      "version": "8.30.0",
      "officialReleaseBaseUrl": "https://github.com/gitleaks/gitleaks/releases/download/v8.30.0",
      "versionArguments": ["version"],
      "versionPattern": "(?m)^8\\.30\\.0[ \\t]*\\r?$",
      "platforms": {
        "windows-x64": {
          "assetName": "gitleaks_8.30.0_windows_x64.zip",
          "sha256": "54fe94f644b832dd08e8c3a5915efb3bfa862386d59fb27ca0792cb687a83573",
          "archiveType": "zip",
          "executableName": "gitleaks.exe"
        },
        "linux-x64": {
          "assetName": "gitleaks_8.30.0_linux_x64.tar.gz",
          "sha256": "79a3ab579b53f71efd634f3aaf7e04a0fa0cf206b7ed434638d1547a2470a66e",
          "archiveType": "tar.gz",
          "executableName": "gitleaks"
        }
      }
    },
    {
      "name": "cosign",
      "version": "3.1.2",
      "officialReleaseBaseUrl": "https://github.com/sigstore/cosign/releases/download/v3.1.2",
      "versionArguments": ["version"],
      "versionPattern": "(?m)^GitVersion:[ \\t]*v3\\.1\\.2[ \\t]*\\r?$",
      "purpose": "release-provenance",
      "platforms": {
        "windows-x64": {
          "assetName": "cosign-windows-amd64.exe",
          "sha256": "fe4d621d7ae5e900ee62089837c00f996ae9acb82027d573d1d157b6ee875cb2",
          "archiveType": "binary",
          "executableName": "cosign.exe"
        },
        "linux-x64": {
          "assetName": "cosign-linux-amd64",
          "sha256": "f7622ed3cf22e55e1ae6377c080979ff77a22da9981c11df222a2e444991e7cf",
          "archiveType": "binary",
          "executableName": "cosign"
        }
      }
    }
  ]
}
````


### api/security/tooling/vulnerability-scan-contract.json

Original-byte SHA256: 7ce3495ecbfff341445628f0e28913e1233afe1ccba85d75286d1f365bef1bbd

````json
{
  "schemaVersion": 1,
  "scanner": {
    "name": "trivy",
    "version": "0.74.0",
    "installation": "cycle-1-verified-bootstrap"
  },
  "database": {
    "cacheRelativePath": ".tools/supply-chain/trivy-cache",
    "authoritativeUpdatedAt": "VulnerabilityDB.UpdatedAt",
    "maxAgeHours": 24,
    "futureClockSkewSeconds": 300,
    "refreshBeforeScanWhenStale": true,
    "scannerArgumentsAfterFreshnessVerification": [
      "--skip-db-update"
    ]
  },
  "scans": [
    {
      "id": "identity-sbom",
      "command": "sbom",
      "input": "services/identity-profile-service/target/bom.json",
      "targetType": "sbom",
      "expectedEcosystem": "maven",
      "arguments": [
        "--scanners",
        "vuln",
        "--format",
        "json",
        "--quiet",
        "--exit-code",
        "0",
        "--skip-db-update"
      ]
    },
    {
      "id": "infra-package-lock",
      "command": "filesystem",
      "input": "infra/package-lock.json",
      "targetType": "filesystem",
      "expectedEcosystem": "npm",
      "arguments": [
        "--scanners",
        "vuln",
        "--include-dev-deps",
        "--format",
        "json",
        "--quiet",
        "--exit-code",
        "0",
        "--skip-db-update"
      ]
    }
  ],
  "reportHandling": {
    "rawReports": "temporary-only",
    "sanitizedInventoryFields": [
      "scanner",
      "findingId",
      "source",
      "targetType",
      "target",
      "package/component",
      "affectedVersion",
      "fixedVersion",
      "severity",
      "severitySource",
      "status",
      "dispositionId"
    ]
  },
  "policy": {
    "mustRun": true,
    "highAndCritical": "fail-unless-exact-valid-disposition",
    "mediumAndLow": "report-non-blocking",
    "unknown": "fail-closed",
    "ignoreUnfixed": false
  }
}
````


### api/service-foundation/services.json

Original-byte SHA256: 9e901f5d97a837cdba3060d391b26bb327d3fe16a70c5bf83ffc738f08ed03ea

````json
{
  "schemaVersion": 1,
  "services": [
    {
      "id": "identity-profile-service",
      "variant": "relational",
      "preserved": true,
      "groupId": "com.auctionpromax",
      "artifactId": "identity-profile-service",
      "version": "0.0.1-SNAPSHOT",
      "packageName": "com.auctionpromax.identityprofileservice",
      "entryClass": "IdentityProfileServiceApplication",
      "destination": "api/services/identity-profile-service",
      "database": "identity_db",
      "testDatabase": "identity_test_db",
      "schema": "identity",
      "environmentPrefix": "IDENTITY"
    },
    {
      "id": "auction-service",
      "variant": "relational",
      "preserved": false,
      "groupId": "com.auctionpromax",
      "artifactId": "auction-service",
      "version": "0.0.1-SNAPSHOT",
      "packageName": "com.auctionpromax.auctionservice",
      "entryClass": "AuctionServiceApplication",
      "destination": "api/services/auction-service",
      "database": "auction_db",
      "testDatabase": "auction_test_db",
      "schema": "auction",
      "environmentPrefix": "AUCTION"
    },
    {
      "id": "bidding-service",
      "variant": "relational",
      "preserved": false,
      "groupId": "com.auctionpromax",
      "artifactId": "bidding-service",
      "version": "0.0.1-SNAPSHOT",
      "packageName": "com.auctionpromax.biddingservice",
      "entryClass": "BiddingServiceApplication",
      "destination": "api/services/bidding-service",
      "database": "bidding_db",
      "testDatabase": "bidding_test_db",
      "schema": "bidding",
      "environmentPrefix": "BIDDING"
    },
    {
      "id": "billing-service",
      "variant": "relational",
      "preserved": false,
      "groupId": "com.auctionpromax",
      "artifactId": "billing-service",
      "version": "0.0.1-SNAPSHOT",
      "packageName": "com.auctionpromax.billingservice",
      "entryClass": "BillingServiceApplication",
      "destination": "api/services/billing-service",
      "database": "billing_db",
      "testDatabase": "billing_test_db",
      "schema": "billing",
      "environmentPrefix": "BILLING"
    },
    {
      "id": "realtime-gateway",
      "variant": "gateway",
      "preserved": false,
      "groupId": "com.auctionpromax",
      "artifactId": "realtime-gateway",
      "version": "0.0.1-SNAPSHOT",
      "packageName": "com.auctionpromax.realtimegateway",
      "entryClass": "RealtimeGatewayApplication",
      "destination": "api/services/realtime-gateway",
      "database": null,
      "testDatabase": null,
      "schema": null,
      "environmentPrefix": null
    }
  ]
}
````


### api/service-foundation/template-files.json

Original-byte SHA256: 76a7590ddbfcb881189dc08d306f8f85b07fb9ba664f85388d00ac533336cfb7

````json
{
  "schemaVersion": 1,
  "files": [
    { "source": "templates/common/mvnw", "destination": "mvnw", "variants": ["relational", "gateway"], "mode": 493, "provenance": "Apache Maven Wrapper 3.3.4 from Identity; LF normalization only" },
    { "source": "templates/common/mvnw.cmd", "destination": "mvnw.cmd", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Apache Maven Wrapper 3.3.4 from Identity; LF normalization only" },
    { "source": "templates/common/maven-wrapper.properties", "destination": ".mvn/wrapper/maven-wrapper.properties", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Wrapper 3.3.4 and Maven 3.9.16 pins from Identity" },
    { "source": "templates/common/Dockerfile", "destination": "Dockerfile", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Pinned baseline image from Identity; artifact name tokenized" },
    { "source": "templates/common/README.md", "destination": "README.md", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Neutral generated-service guidance" },
    { "source": "templates/common/Application.java", "destination": "src/main/java/__PACKAGE_PATH__/__ENTRY_CLASS__.java", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Technical Spring Boot entrypoint pattern from Identity" },
    { "source": "templates/common/TechnicalConfiguration.java", "destination": "src/main/java/__PACKAGE_PATH__/configuration/TechnicalConfiguration.java", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Minimal production probe and deny-by-default security from Identity" },
    { "source": "templates/common/CorrelationIdFilter.java", "destination": "src/main/java/__PACKAGE_PATH__/adapter/in/web/CorrelationIdFilter.java", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Bounded correlation and scoped MDC pattern from Identity" },
    { "source": "templates/common/TechnicalProblemAdvice.java", "destination": "src/main/java/__PACKAGE_PATH__/adapter/in/web/TechnicalProblemAdvice.java", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Sanitized RFC 9457 technical errors; business exception mapping excluded" },
    { "source": "templates/common/TechnicalProbeController.java", "destination": "src/main/java/__PACKAGE_PATH__/adapter/in/web/TechnicalProbeController.java", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Technical validation endpoint and safe structured log fields" },
    { "source": "templates/common/TechnicalValidationRequest.java", "destination": "src/main/java/__PACKAGE_PATH__/adapter/in/web/TechnicalValidationRequest.java", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Validation DTO boundary from Identity snapshot" },
    { "source": "templates/common/TechnicalValidationResponse.java", "destination": "src/main/java/__PACKAGE_PATH__/adapter/in/web/TechnicalValidationResponse.java", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Technical validation response DTO" },
    { "source": "templates/common/application.yaml", "destination": "src/main/resources/application.yaml", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Common Boot health/probe baseline; database settings excluded" },
    { "source": "templates/relational/application-local.yaml", "destination": "src/main/resources/application-local.yaml", "variants": ["relational"], "mode": 420, "provenance": "Relational local environment mapping from Identity, names tokenized" },
    { "source": "templates/gateway/application-local.yaml", "destination": "src/main/resources/application-local.yaml", "variants": ["gateway"], "mode": 420, "provenance": "Database-free gateway local configuration" },
    { "source": "templates/common/TechnicalHttpTest.java", "destination": "src/test/java/__PACKAGE_PATH__/TechnicalHttpTest.java", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Technical HTTP validation and deny-by-default regression" },
    { "source": "templates/common/StructuredLoggingTest.java", "destination": "src/test/java/__PACKAGE_PATH__/StructuredLoggingTest.java", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Real Spring Boot ECS encoder behavior with strict JSON duplicate detection" },
    { "source": "templates/common/ArchitectureTest.java", "destination": "src/test/java/__PACKAGE_PATH__/architecture/ArchitectureTest.java", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Production boundaries plus deliberate test-fixture rejection" },
    { "source": "templates/common/FoundationApplicationFixture.java", "destination": "src/test/java/com/auctionpromax/foundationfixtures/application/FoundationApplicationFixture.java", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Neutral test-only inbound-boundary fixture type" },
    { "source": "templates/common/InvalidAdapterDependency.java", "destination": "src/test/java/com/auctionpromax/foundationfixtures/application/InvalidAdapterDependency.java", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Deliberate test-only application-to-adapter violation" },
    { "source": "templates/common/InvalidFrameworkDependency.java", "destination": "src/test/java/com/auctionpromax/foundationfixtures/application/InvalidFrameworkDependency.java", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Deliberate test-only application framework leak" },
    { "source": "templates/common/InvalidInboundDependency.java", "destination": "src/test/java/com/auctionpromax/foundationfixtures/adapter/in/InvalidInboundDependency.java", "variants": ["relational", "gateway"], "mode": 420, "provenance": "Deliberate test-only inbound adapter-to-application violation" },
    { "source": "templates/relational/pom.xml", "destination": "pom.xml", "variants": ["relational"], "mode": 420, "provenance": "Curated relational technical POM derived from Identity pins; business dependencies removed" },
    { "source": "templates/relational/RelationalBoundaryTestcontainersIT.java", "destination": "src/test/java/__PACKAGE_PATH__/RelationalBoundaryTestcontainersIT.java", "variants": ["relational"], "mode": 420, "provenance": "Ephemeral PostgreSQL boundary proof; no Identity domain/sample code" },
    { "source": "templates/relational/technical-probe.sql", "destination": "src/main/resources/db/migration/V1__create_technical_probe.sql", "variants": ["relational"], "mode": 420, "provenance": "Technical-only probe schema and runtime grants" },
    { "source": "templates/relational/bootstrap.sql", "destination": "src/test/resources/db/testcontainers/bootstrap.sql", "variants": ["relational"], "mode": 420, "provenance": "Ephemeral Testcontainers roles and cross-boundary denial" },
    { "source": "templates/gateway/pom.xml", "destination": "pom.xml", "variants": ["gateway"], "mode": 420, "provenance": "Curated database-free gateway POM" },
    { "source": "templates/gateway/GatewayNoDatastoreIT.java", "destination": "src/test/java/__PACKAGE_PATH__/GatewayNoDatastoreIT.java", "variants": ["gateway"], "mode": 420, "provenance": "Gateway Failsafe proof with no datastore dependency/configuration" }
  ]
}
````


### scripts/migration/MonorepoRequiredChecks.mjs

Original-byte SHA256: 8b4c104ab6044d1335804f7a876b2911597245759d8f04b4bdba83c8027ddcf8

````javascript
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const all = () => ({ api: true, web: true, contracts: true, shared: true });
const validSha = (value) => typeof value === "string" && /^[0-9a-f]{40}$/.test(value) && !/^0{40}$/.test(value);

export function classifyChangedPaths(paths) {
  const result = { api: false, web: false, contracts: false, shared: false };
  if (paths.length === 0) return all();
  for (const name of paths) {
    if (typeof name !== "string" || !name || name.startsWith("/") || name.includes("\\") || name.split("/").includes("..")) return all();
    if (name.startsWith("api/contracts/")) {
      result.api = result.web = result.contracts = true;
    } else if (name.startsWith("api/docs/") || name.startsWith("web/docs/") || name.startsWith("docs/")) {
      // Project documentation does not require component builds.
    } else if (name.startsWith("api/")) {
      result.api = true;
    } else if (name.startsWith("web/")) {
      result.web = true;
    } else {
      result.api = result.web = result.shared = true;
    }
  }
  return result;
}

export function parseNameStatus(bytes) {
  const parts = bytes.toString("utf8").split("\0");
  if (parts.pop() !== "" || parts.length === 0) throw new Error("DIFF_STATUS_INVALID");
  const paths = [];
  for (let index = 0; index < parts.length;) {
    const status = parts[index++];
    if (!/^(?:[AMDT]|R[0-9]{1,3}|C[0-9]{1,3})$/.test(status)) throw new Error("DIFF_STATUS_INVALID");
    const count = /^[RC]/.test(status) ? 2 : 1;
    for (let offset = 0; offset < count; offset++) {
      const name = parts[index++];
      if (!name) throw new Error("DIFF_PATH_INVALID");
      paths.push(name);
    }
  }
  return paths;
}

export function selectDiff(eventName, event, githubSha, git) {
  try {
    if (!validSha(githubSha)) return all();
    let base;
    let head;
    if (eventName === "pull_request") {
      base = event?.pull_request?.base?.sha;
      head = event?.pull_request?.head?.sha;
      if (!validSha(base) || !validSha(head)) return all();
      const mergeBase = git("merge-base", base, head);
      if (!validSha(mergeBase)) return all();
      base = mergeBase;
    } else if (eventName === "push") {
      base = event?.before;
      head = event?.after;
      if (!validSha(base) || !validSha(head) || head !== githubSha) return all();
    } else {
      return all();
    }
    return classifyChangedPaths(parseNameStatus(git("diff", base, head)));
  } catch {
    return all();
  }
}

export function evaluateAggregate({ classify, apiRequired, webRequired, apiResult, webResult, lifecycleResult }) {
  if (classify !== "success" || lifecycleResult !== "success") return false;
  for (const [required, actual] of [[apiRequired, apiResult], [webRequired, webResult]]) {
    if (required !== "true" && required !== "false") return false;
    if (actual !== (required === "true" ? "success" : "skipped")) return false;
  }
  return true;
}

function runGit(kind, base, head) {
  const args = kind === "merge-base" ? ["merge-base", base, head] : ["diff", "--name-status", "-z", "-M", base, head, "--"];
  const result = spawnSync("git", args, { encoding: kind === "merge-base" ? "utf8" : "buffer", maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0 || result.error) throw new Error("GIT_DIFF_UNAVAILABLE");
  return kind === "merge-base" ? result.stdout.trim() : result.stdout;
}

function main() {
  if (process.argv[2] !== "--classify") throw new Error("USAGE: --classify");
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const result = selectDiff(process.env.GITHUB_EVENT_NAME, event, process.env.GITHUB_SHA, runGit);
  if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT_UNAVAILABLE");
  fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(result).map(([key, value]) => `${key}=${value}\n`).join(""));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
````


### scripts/migration/Test-MonorepoRequiredChecks.mjs

Original-byte SHA256: 0c8b40f47ba64af0827329dedb1bf99ff4f429a36d6698cbd5cea4aca7afa546

````javascript
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";
import YAML from "../../api/contracts/node_modules/yaml/dist/index.js";
import {
  classifyChangedPaths,
  parseNameStatus,
  selectDiff,
  evaluateAggregate,
} from "./MonorepoRequiredChecks.mjs";

const sha = (digit) => digit.repeat(40);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("API-only and web-only paths select only their component", () => {
  assert.deepEqual(classifyChangedPaths(["api/services/identity-profile-service/pom.xml"]), { api: true, web: false, contracts: false, shared: false });
  assert.deepEqual(classifyChangedPaths(["web/features/auction/index.ts"]), { api: false, web: true, contracts: false, shared: false });
});

test("contract and shared CI paths select both components", () => {
  assert.deepEqual(classifyChangedPaths(["api/contracts/README.md"]), { api: true, web: true, contracts: true, shared: false });
  assert.deepEqual(classifyChangedPaths([".github/workflows/monorepo-verification.yml"]), { api: true, web: true, contracts: false, shared: true });
});

test("docs-only changes skip expensive components while mixed and unknown paths run both", () => {
  assert.deepEqual(classifyChangedPaths(["docs/readme.md", "api/docs/guide.md"]), { api: false, web: false, contracts: false, shared: false });
  assert.deepEqual(classifyChangedPaths(["api/src/file.java", "web/src/file.ts"]), { api: true, web: true, contracts: false, shared: false });
  assert.deepEqual(classifyChangedPaths(["new-root-policy.txt"]), { api: true, web: true, contracts: false, shared: true });
});

test("NUL status records classify both sides of rename and the deleted path", () => {
  const records = parseNameStatus(Buffer.from("R100\0api/old.java\0web/new.ts\0D\0api/contracts/old.yaml\0"));
  assert.deepEqual(records, ["api/old.java", "web/new.ts", "api/contracts/old.yaml"]);
  assert.deepEqual(classifyChangedPaths(records), { api: true, web: true, contracts: true, shared: false });
});

test("PR classification uses base and head while execution revision stays the merge commit", () => {
  const calls = [];
  const event = { pull_request: { base: { sha: sha("a") }, head: { sha: sha("b") } } };
  const result = selectDiff("pull_request", event, sha("c"), (...args) => { calls.push(args); return args[0] === "merge-base" ? sha("d") : Buffer.from("M\0web/app/page.tsx\0"); });
  assert.deepEqual(result, { api: false, web: true, contracts: false, shared: false });
  assert.deepEqual(calls, [["merge-base", sha("a"), sha("b")], ["diff", sha("d"), sha("b")]]);
  assert.deepEqual(selectDiff("pull_request", event, sha("c"), () => { throw new Error("missing PR head object"); }), { api: true, web: true, contracts: true, shared: true });
});

test("normal push uses before and after; new branch and untrusted diff run all", () => {
  const calls = [];
  const git = (...args) => { calls.push(args); return Buffer.from("M\0api/infra/package.json\0"); };
  assert.deepEqual(selectDiff("push", { before: sha("a"), after: sha("b") }, sha("b"), git), { api: true, web: false, contracts: false, shared: false });
  assert.deepEqual(calls, [["diff", sha("a"), sha("b")]]);
  assert.deepEqual(selectDiff("push", { before: sha("0"), after: sha("b") }, sha("b"), git), { api: true, web: true, contracts: true, shared: true });
  assert.deepEqual(selectDiff("push", { before: sha("a"), after: sha("b") }, sha("b"), () => { throw new Error("missing object"); }), { api: true, web: true, contracts: true, shared: true });
  assert.deepEqual(selectDiff("push", { before: "bad", after: sha("b") }, sha("b"), git), { api: true, web: true, contracts: true, shared: true });
  assert.deepEqual(selectDiff("push", { before: sha("a"), after: sha("b") }, sha("c"), git), { api: true, web: true, contracts: true, shared: true });
});

test("CLI classifies a real push diff and writes exact GitHub job outputs", (t) => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "s001-t09-classifier-"));
  t.after(() => {
    const resolved = fs.realpathSync(fixture);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith("s001-t09-classifier-"));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const git = (...args) => {
    const result = spawnSync("git", args, { cwd: fixture, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git("init", "-q");
  fs.writeFileSync(path.join(fixture, "README.md"), "baseline\n");
  git("add", "--", "README.md");
  git("-c", "user.name=Task5 Test", "-c", "user.email=task5@example.invalid", "commit", "-qm", "baseline");
  const before = git("rev-parse", "HEAD");
  fs.mkdirSync(path.join(fixture, "web"));
  fs.writeFileSync(path.join(fixture, "web", "page.ts"), "export const value = 1;\n");
  git("add", "--", "web/page.ts");
  git("-c", "user.name=Task5 Test", "-c", "user.email=task5@example.invalid", "commit", "-qm", "web change");
  const after = git("rev-parse", "HEAD");
  const eventPath = path.join(fixture, "event.json");
  const outputPath = path.join(fixture, "outputs.txt");
  fs.writeFileSync(eventPath, JSON.stringify({ before, after }));
  const result = spawnSync(process.execPath, [path.join(root, "scripts/migration/MonorepoRequiredChecks.mjs"), "--classify"], {
    cwd: fixture,
    env: { ...process.env, GITHUB_EVENT_NAME: "push", GITHUB_EVENT_PATH: eventPath, GITHUB_SHA: after, GITHUB_OUTPUT: outputPath },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(outputPath, "utf8"), "api=false\nweb=true\ncontracts=false\nshared=false\n");
});

test("aggregate accepts applicable success and justified skips only", () => {
  assert.equal(evaluateAggregate({ classify: "success", apiRequired: "true", webRequired: "false", apiResult: "success", webResult: "skipped", lifecycleResult: "success" }), true);
  assert.equal(evaluateAggregate({ classify: "success", apiRequired: "false", webRequired: "false", apiResult: "skipped", webResult: "skipped", lifecycleResult: "success" }), true);
  for (const result of ["failure", "cancelled", "skipped", "", "timed_out"]) {
    assert.equal(evaluateAggregate({ classify: "success", apiRequired: "true", webRequired: "false", apiResult: result, webResult: "skipped", lifecycleResult: "success" }), false, result);
  }
  assert.equal(evaluateAggregate({ classify: "failure", apiRequired: "true", webRequired: "true", apiResult: "success", webResult: "success", lifecycleResult: "success" }), false);
  assert.equal(evaluateAggregate({ classify: "success", apiRequired: "", webRequired: "true", apiResult: "skipped", webResult: "success", lifecycleResult: "success" }), false);
  assert.equal(evaluateAggregate({ classify: "success", apiRequired: "false", webRequired: "false", apiResult: "success", webResult: "skipped", lifecycleResult: "success" }), false);
  for (const lifecycleResult of ["failure", "cancelled", "skipped", ""]) {
    assert.equal(evaluateAggregate({ classify: "success", apiRequired: "false", webRequired: "false", apiResult: "skipped", webResult: "skipped", lifecycleResult }), false);
  }
});

test("unconditional lifecycle gate runs T02 source suites and Linux publisher fixtures", () => {
  const workflow = YAML.parse(fs.readFileSync(path.join(root, ".github/workflows/monorepo-verification.yml"), "utf8"));
  const lifecycle = workflow.jobs.lifecycle;
  const commands = lifecycle.steps.map((step) => step.run ?? "").join("\n");
  assert.match(commands, /node api\/scripts\/foundation\/Test-ServiceGenerator\.mjs/);
  assert.match(commands, /node api\/scripts\/foundation\/Test-ServiceConformance\.mjs --templates/);
  assert.match(commands, /pwsh -NoProfile -NonInteractive -File api\/scripts\/foundation\/Test-PublishServiceDirectory\.ps1/);
  assert.equal(lifecycle["runs-on"], "ubuntu-24.04");
  assert.equal(lifecycle.if, undefined);
});

test("required workflow owns one unique always-concluding check without PR path filters", () => {
  const directory = path.join(root, ".github/workflows");
  const names = fs.readdirSync(directory).filter((name) => /\.ya?ml$/.test(name));
  const workflows = names.map((name) => YAML.parse(fs.readFileSync(path.join(directory, name), "utf8")));
  const requiredOwners = (items) => items.flatMap((item) => Object.entries(item.jobs ?? {}).filter(([jobId, job]) => (job.name ?? jobId) === "monorepo-required"));
  const owners = requiredOwners(workflows);
  assert.equal(owners.length, 1);
  const duplicateById = { jobs: { "monorepo-required": { steps: [] } } };
  assert.equal(requiredOwners([...workflows, duplicateById]).length, 2);
  const workflow = YAML.parse(fs.readFileSync(path.join(directory, "monorepo-verification.yml"), "utf8"));
  assert.deepEqual(Object.keys(workflow.on).sort(), ["pull_request", "push"]);
  assert.equal(workflow.on.pull_request?.paths, undefined);
  assert.equal(workflow.on.pull_request?.["paths-ignore"], undefined);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(workflow.jobs["monorepo-required"].if, "${{ always() }}");
  assert.deepEqual(workflow.jobs["monorepo-required"].needs, ["classify", "api", "web", "lifecycle"]);
  assert.ok(workflow.jobs.lifecycle, "always-run lifecycle job is required");
  assert.equal(workflow.jobs.lifecycle.if, undefined);
  assert.ok(workflow.jobs.lifecycle.steps.some((step) => step.run?.includes("Test-S002-Lifecycle.mjs --repository")));
  assert.ok(workflow.jobs["monorepo-required"].steps.every((step) => !step.uses));
  assert.equal(workflow.jobs.classify.steps[0].with["fetch-depth"], 0);
  assert.equal(workflow.jobs.classify.steps[0].with.ref, undefined);
  assert.ok(workflow.jobs.classify.steps.some((step) => step.run === "npm ci" && step["working-directory"] === "api/contracts"));
  assert.ok(workflow.jobs.classify.steps.some((step) => step.run === "node scripts/migration/Test-MonorepoRequiredChecks.mjs"));
  assert.equal(workflow.jobs.api.steps[0].with.ref, undefined);
  assert.equal(workflow.jobs.web.steps[0].with.ref, undefined);
  for (const [jobName, job] of Object.entries(workflow.jobs)) {
    assert.equal(job["runs-on"], "ubuntu-24.04", jobName);
    assert.ok(Number.isInteger(job["timeout-minutes"]) && job["timeout-minutes"] > 0, jobName);
    for (const step of job.steps) {
      assert.notEqual(step["continue-on-error"], true, jobName);
      if (step.uses) {
        assert.match(step.uses, /^actions\/(?:checkout|setup-node|setup-java)@[0-9a-f]{40}$/);
        if (step.uses.startsWith("actions/checkout@")) assert.equal(step.with?.["persist-credentials"], false);
      }
    }
  }
  const codeownersText = fs.readFileSync(path.join(root, ".github/CODEOWNERS"), "utf8");
  for (const pathname of ["/api/**", "/api/contracts/**", "/api/infra/**", "/web/**", "/.github/workflows/**", "/.github/CODEOWNERS"]) {
    assert.ok(codeownersText.split(/\r?\n/).includes(`${pathname} @AkaDNT`), pathname);
  }
});

test("API job runs both Linux-hosted PowerShell and executable-permission proofs", () => {
  const workflow = YAML.parse(fs.readFileSync(path.join(root, ".github/workflows/monorepo-verification.yml"), "utf8"));
  const step = workflow.jobs.api.steps.find((candidate) => candidate.name === "Verify Linux PowerShell and tool executable handling");
  assert.ok(step, "Task 6 Linux proof step is required in the API job");
  assert.equal(step.shell, "pwsh");
  assert.match(step.run, /\.\/api\/scripts\/supply-chain\/Test-LinuxHostedPowerShellExecutable\.ps1/);
  assert.match(step.run, /\.\/api\/scripts\/supply-chain\/Test-LinuxToolExecutablePermission\.ps1/);
});

test("the actual aggregate job command rejects required failures and accepts docs-only skips", () => {
  const workflow = YAML.parse(fs.readFileSync(path.join(root, ".github/workflows/monorepo-verification.yml"), "utf8"));
  const command = workflow.jobs["monorepo-required"].steps[0].run;
  const source = command.match(/^node -e '\n([\s\S]*?)\n'\s*$/)?.[1];
  assert.ok(source, "aggregate command must be executable Node.js with no checkout");
  const run = (env) => spawnSync(process.execPath, ["-e", source], { env: { ...process.env, ...env }, encoding: "utf8" }).status;
  const baseline = { CLASSIFY_RESULT: "success", API_REQUIRED: "false", WEB_REQUIRED: "false", API_RESULT: "skipped", WEB_RESULT: "skipped", LIFECYCLE_RESULT: "success" };
  assert.equal(run(baseline), 0);
  for (const result of ["failure", "cancelled", "skipped", ""]) {
    assert.equal(run({ ...baseline, LIFECYCLE_RESULT: result }), 1, result);
  }
  assert.equal(run({ ...baseline, API_REQUIRED: "true", API_RESULT: "skipped" }), 1);
  assert.equal(run({ ...baseline, CLASSIFY_RESULT: "failure" }), 1);
  assert.equal(run({ ...baseline, WEB_RESULT: "success" }), 1);
  assert.equal(run({ ...baseline, API_REQUIRED: "" }), 1);
});
````


### scripts/migration/Test-MonorepoWorkflowContracts.mjs

Original-byte SHA256: eb40928dcb4d8a5d52226fec60a3e1de89208d83c508fe7c49e6ea902d7ec308

````javascript
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "../../api/contracts/node_modules/yaml/dist/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const names = ["api-baseline.yml", "web-baseline.yml", "supply-chain.yml", "security-freshness.yml"];
const pins = Object.freeze({
  "actions/checkout": "11d5960a326750d5838078e36cf38b85af677262",
  "actions/setup-java": "cf277c60eb25467037889841efdb72551f06f6c3",
  "actions/setup-node": "49933ea5288caeca8642d1e84afbd3f7d6820020",
  "actions/upload-artifact": "ea165f8d65b6e75b540449e92b4886f43607fa02",
});

function check(ok, code) { assert.ok(ok, code); }
function step(job, idOrName) { return job.steps.find((item) => item.id === idOrName || item.name === idOrName); }

function validateWorkflowSet(workflows) {
  check(Object.keys(workflows).sort().join("|") === [...names].sort().join("|"), "ROOT_WORKFLOW_SET_INVALID");
  for (const [file, workflow] of Object.entries(workflows)) {
    const triggers = Object.keys(workflow.on ?? {}).sort();
    const expected = file === "security-freshness.yml" ? ["schedule", "workflow_dispatch"] : file === "supply-chain.yml" ? ["pull_request", "push", "workflow_dispatch"] : ["pull_request", "push"];
    check(triggers.join("|") === expected.sort().join("|"), `TRIGGER_DRIFT: ${file}`);
    for (const event of Object.values(workflow.on ?? {})) {
      check(!event || (!Object.hasOwn(event, "paths") && !Object.hasOwn(event, "paths-ignore")), `PATH_FILTER_FORBIDDEN: ${file}`);
    }
    check(JSON.stringify(workflow.permissions) === JSON.stringify({ contents: "read" }), `PERMISSIONS_INVALID: ${file}`);
    check(!workflow.defaults?.run?.["working-directory"], `WORKFLOW_DEFAULT_DIRECTORY_FORBIDDEN: ${file}`);
    check(!JSON.stringify(workflow).includes("monorepo-required"), `TASK5_AGGREGATE_EARLY: ${file}`);
    for (const [jobId, job] of Object.entries(workflow.jobs ?? {})) {
      check(job["runs-on"] === "ubuntu-24.04" && Number.isInteger(job["timeout-minutes"]) && job["timeout-minutes"] > 0, `JOB_BASELINE_INVALID: ${file}:${jobId}`);
      check(!job.defaults?.run?.["working-directory"], `JOB_DEFAULT_DIRECTORY_FORBIDDEN: ${file}:${jobId}`);
      check(Array.isArray(job.steps) && job.steps.length > 0, `JOB_STEPS_MISSING: ${file}:${jobId}`);
      for (const item of job.steps) {
        check(item["continue-on-error"] !== true, `CONTINUE_ON_ERROR: ${file}:${jobId}`);
        if (item.uses) {
          const [action, sha, extra] = item.uses.split("@");
          check(!extra && /^[0-9a-f]{40}$/.test(sha ?? "") && pins[action] === sha, `ACTION_PIN_INVALID: ${file}:${jobId}`);
          if (action === "actions/checkout") check(item.with?.["persist-credentials"] === false, `CHECKOUT_CREDENTIALS: ${file}:${jobId}`);
          if (action === "actions/upload-artifact") {
            check(item.if === "always()" && item.with?.path === "${{ runner.temp }}/s001-t07-evidence/hosted" && item.with?.["retention-days"] === 30 && item.with?.["if-no-files-found"] === "error", `EVIDENCE_UPLOAD_INVALID: ${file}:${jobId}`);
          }
          if (action === "actions/setup-node") {
            const component = file === "web-baseline.yml" ? "web" : "api";
            check(item.with?.["node-version-file"] === `${component}/.nvmrc`, `NODE_VERSION_PATH_INVALID: ${file}:${jobId}`);
            const expectedLock = file === "web-baseline.yml" ? "web/package-lock.json" : jobId === "verify-cdk-toolchain" ? "api/infra/package-lock.json" : "api/contracts/package-lock.json";
            check(item.with?.["cache-dependency-path"] === expectedLock, `LOCKFILE_PATH_INVALID: ${file}:${jobId}`);
          }
        }
        if (item["working-directory"]) {
          const expectedDir = file === "web-baseline.yml" ? "web" : jobId === "verify-cdk-toolchain" ? "api/infra" : jobId === "verify-identity-profile-service" ? "api/services/identity-profile-service" : "api/contracts";
          check(item["working-directory"] === expectedDir, `WORKING_DIRECTORY_INVALID: ${file}:${jobId}`);
        }
        const command = String(item.run ?? "");
        check(!/(^|[\s'"`])\.\/scripts\//m.test(command), `STALE_SCRIPT_PATH: ${file}:${jobId}`);
        check(!/(^|[\s'"`])(services\/identity-profile-service|infra\/package-lock\.json|contracts\/package-lock\.json)(?=[\s'"`]|$)/m.test(command), `STALE_COMMAND_PATH: ${file}:${jobId}`);
        const pathEnv = Object.entries(item.env ?? {}).concat(Object.entries(job.env ?? {})).filter(([key]) => /(?:PATH|FILE|ROOT|DIR)$/i.test(key));
        for (const [, value] of pathEnv) check(!/^(?:contracts|infra|services)\//.test(String(value)), `STALE_ENV_PATH: ${file}:${jobId}`);
      }
    }
  }
  const api = workflows["api-baseline.yml"].jobs;
  check(Object.keys(api).sort().join("|") === ["verify-identity-profile-service", "verify-cdk-toolchain", "verify-contract-registry"].sort().join("|"), "API_JOB_SET_INVALID");
  check(step(api["verify-contract-registry"], "Reject prohibited OpenAPI breaking change")?.run === "./api/scripts/verify-contracts.ps1 -Mode Fixture", "API_FIXTURE_COMMAND_INVALID");
  check(step(api["verify-contract-registry"], "Verify registered contracts")?.run === "./api/scripts/verify-contracts.ps1 -Mode Registry", "API_REGISTRY_COMMAND_INVALID");
  const web = workflows["web-baseline.yml"].jobs;
  check(Object.keys(web).join("|") === "lint-and-build", "WEB_JOB_SET_INVALID");
  for (const [name, run] of [["Install dependencies", "npm ci"], ["Lint", "npm run lint"], ["Build production application", "npm run build"]]) {
    check(step(web["lint-and-build"], name)?.run === run && step(web["lint-and-build"], name)?.["working-directory"] === "web", `WEB_COMMAND_INVALID: ${name}`);
  }
  for (const [file, mainId, policyId, mode] of [["supply-chain.yml", "supply-chain-verification", "release-policy", "--repository-supply-chain"], ["security-freshness.yml", "security-freshness", "freshness-release-policy", "--repository"]]) {
    const jobs = workflows[file].jobs;
    check(Object.keys(jobs).sort().join("|") === [mainId, policyId].sort().join("|"), `POLICY_JOB_SET_INVALID: ${file}`);
    const main = jobs[mainId];
    const policy = jobs[policyId];
    check(policy.needs?.includes(mainId) && policy.if === `needs.${mainId}.result == 'success'`, `POLICY_SEPARATION_INVALID: ${file}`);
    check(String(step(policy, "Enforce separate release policy")?.run ?? "").includes("if ($env:POLICY_STATE -eq 'BLOCKED') { exit 1 }"), `BLOCKED_POLICY_INVALID: ${file}`);
    check(step(main, "validate-contract")?.run === `node ./api/scripts/supply-chain/Test-HostedSupplyChainContract.mjs ${mode}`, `HOSTED_CONTRACT_PATH_INVALID: ${file}`);
    check(String(step(main, "run-hosted")?.run ?? "").includes("./api/scripts/supply-chain/Invoke-HostedSupplyChain.ps1"), `HOSTED_RUN_PATH_INVALID: ${file}`);
    check(String(step(main, "validate-evidence")?.run ?? "").includes("./api/scripts/supply-chain/Validate-HostedSupplyChainEvidence.mjs"), `HOSTED_EVIDENCE_PATH_INVALID: ${file}`);
    check(step(main, "upload-evidence")?.uses === `actions/upload-artifact@${pins["actions/upload-artifact"]}`, `HOSTED_ARTIFACT_MISSING: ${file}`);
  }
}

function expectRejected(name, mutate) {
  const workflows = loadRootWorkflows();
  validateWorkflowSet(workflows);
  mutate(workflows);
  assert.throws(() => validateWorkflowSet(workflows), undefined, name);
  process.stdout.write(`[PASS] ${name}\n`);
}

function loadRootWorkflows() {
  return Object.fromEntries(names.map((file) => {
    const document = YAML.parseDocument(fs.readFileSync(path.join(root, ".github/workflows", file), "utf8"), { uniqueKeys: true, strict: true });
    check(document.errors.length === 0 && document.warnings.length === 0, `YAML_INVALID: ${file}`);
    return [file, document.toJS({ maxAliasCount: 0 })];
  }));
}

function runFixtures() {
  expectRejected("mutable web checkout rejected", (w) => { w["web-baseline.yml"].jobs["lint-and-build"].steps[0].uses = "actions/checkout@v4"; });
  expectRejected("stale web lock path rejected", (w) => { w["web-baseline.yml"].jobs["lint-and-build"].steps[1].with["cache-dependency-path"] = "package-lock.json"; });
  expectRejected("PR path skip rejected", (w) => { w["api-baseline.yml"].on.pull_request = { paths: ["api/**"] }; });
  expectRejected("broad permission rejected", (w) => { w["supply-chain.yml"].permissions["id-token"] = "write"; });
  expectRejected("missing timeout rejected", (w) => { delete w["api-baseline.yml"].jobs["verify-cdk-toolchain"]["timeout-minutes"]; });
  expectRejected("raw artifact path rejected", (w) => { w["supply-chain.yml"].jobs["supply-chain-verification"].steps.find((s) => s.id === "upload-evidence").with.path = "api/target"; });
  expectRejected("stale API script path rejected", (w) => { w["supply-chain.yml"].jobs["supply-chain-verification"].steps.find((s) => s.id === "validate-contract").run = "node ./scripts/supply-chain/Test-HostedSupplyChainContract.mjs --repository-supply-chain"; });
  expectRejected("missing credential guard rejected", (w) => { delete w["api-baseline.yml"].jobs["verify-cdk-toolchain"].steps[0].with["persist-credentials"]; });
  expectRejected("stale API node version path rejected", (w) => { w["api-baseline.yml"].jobs["verify-cdk-toolchain"].steps[1].with["node-version-file"] = ".nvmrc"; });
  expectRejected("local action stale root rejected", (w) => { w["api-baseline.yml"].jobs["verify-cdk-toolchain"].steps[0].uses = "./.github/actions/old"; });
  expectRejected("hashFiles stale root rejected", (w) => { w["api-baseline.yml"].jobs["verify-cdk-toolchain"].steps[1].with["cache-dependency-path"] = "${{ hashFiles('contracts/package-lock.json') }}"; });
  expectRejected("path-valued env stale root rejected", (w) => { w["api-baseline.yml"].jobs["verify-cdk-toolchain"].env = { LOCKFILE_PATH: "infra/package-lock.json" }; });
  expectRejected("working directory default stale root rejected", (w) => { w["api-baseline.yml"].defaults = { run: { "working-directory": "contracts" } }; });
  expectRejected("release policy merged into verification rejected", (w) => { delete w["supply-chain.yml"].jobs["release-policy"]; });
  process.stdout.write("Root workflow negative fixtures: PASS\n");
}

function runRepository() {
  for (const old of ["api/.github/workflows/api-baseline.yml", "api/.github/workflows/supply-chain.yml", "api/.github/workflows/security-freshness.yml", "web/.github/workflows/web-baseline.yml"]) {
    check(!fs.existsSync(path.join(root, old)), `NESTED_WORKFLOW_RETAINED: ${old}`);
  }
  const workflows = loadRootWorkflows();
  validateWorkflowSet(workflows);
  process.stdout.write("Root workflow repository contract: PASS\n");
}

if (process.argv.includes("--fixtures")) runFixtures();
else if (process.argv.includes("--repository")) runRepository();
else { runFixtures(); runRepository(); }
````
