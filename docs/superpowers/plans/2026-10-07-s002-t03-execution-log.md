# T03 execution log — 2026-10-07

Status: IN_PROGRESS_LOCAL. No T03 workflow has been published; no PR/merge authority is inferred. T02 is merged at `03f1e7b7af93e68a4a47fbef3ea9c23d351ced24`; this execution branch is isolated at `work/s002-t03-ci-security`, based on that published merge plus the local T02 closeout log and T03 guide. Initial execution HEAD: `24bac533c192f0d98261873bc1dd5d0bce841998`, tree `c67f578ff1c3dd11becf112c803a703e8591a9cb`.

Owner decisions on 2026-10-07 are treated as binding: temporary registry-approved generation only in isolated CI; never regenerate an existing destination; deleted tracked source must fail `SERVICE_SOURCE_REMOVED`; source provenance distinguishes committed/ephemeral. All execution identity is checked-out `git rev-parse HEAD`, with PR head SHA only secondary provenance. Matrix result artifacts are per-service; aggregate must use reviewed `actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333` (v8.0.2), with no merge-multiple and fail-closed identity verification.

## T03-A — initial audit and baseline

- Confirmed the exact T02 published ancestry and isolated execution branch. Planning checkout and primary working tree were not modified by execution setup.
- Existing required-check fixtures: 12/12 PASS. Root workflow repository contract PASS. S002 lifecycle fixtures/repository and S001 T09 complete/closeout regressions PASS.
- Hosted supply-chain contract and hosted evidence regressions PASS before implementation.
- `actions/download-artifact` pin was resolved from the official action repository’s v8.0.2 release/tag to `9000827ccba6bdab643e8b6fd33ac0654aef8333`; official action metadata states Node 24, `merge-multiple` false by default, and digest-mismatch error. The workflow-contract suite now has an exact-pin/isolation contract and mutation negatives for mutable/wrong SHA, merge-multiple, output path and digest policy; observed PASS. Matrix workflow implementation was not started before this pin contract passed.
- Initial Identity SBOM end-to-end baseline could not complete because global Git `core.autocrlf=true` expanded the checked-out 252,625-byte LF Git blob to 258,298 bytes with 5,673 CRLF pairs. Manifest SHA-256 `3e92dd…cafb93` matched the Git blob; transformed working-copy SHA-256 was `c451a6…ecb940`. No trust manifest/schema/checksum was changed.
- T02 generator tests exposed a second host limitation. Node cannot launch the PowerShell 7 WindowsApps execution alias (`spawnSync` returns `EACCES`); the resolver stopped instead of trying its already-listed Windows PowerShell 5.1 fallback. At the owner’s direction, retained the narrow next-approved-host fallback and a regression fixture. The full generator suite now runs 40 fixtures: 32 PASS, 8 FAIL. The failures requiring publication reached `powershell.exe` but it was rejected by the host’s `Restricted` execution policy. No execution-policy override was used. The source-level publisher fixtures must be rerun on an approved PS7/PS5.1 host with permitted script execution before Windows generator acceptance. This is an environment/publisher prerequisite, not a service/business-code change.
- The local T02 generator/conformance/publisher chain did not produce a complete baseline PASS; it is explicitly NOT PASS. Conformance is 30/30; generator is 32/40 because the host denies publisher scripts. Protected Linux T02 gates remain the prior observed evidence for the merged T02 revision only.
- Per owner decision, staged only `.gitattributes` with `api/security/schemas/cyclonedx/1.6/*.json -text`. Verified Git's effective checkout-filter bytes for all three assets equal the manifest hashes; restored those exact assets from Git object bytes without changing the trusted payload. `Test-CycloneDxSchemaTrust.mjs` PASS. After the pinned wrapper clean package build, `Test-IdentitySbomFixtures.mjs` PASS (32 fixtures). These are Identity baseline tests, not T03 service-specific SBOM proof.

## T03-B — selection and exact matrix results

- Added behavioral tests for all five registry identities, auction-only, contract/docs-only, shared/template all-five, mixed selection, rename union, deletion provenance, unknown/invalid selection, exact result set, empty selection, duplicate/extra/missing result, wrong revision, and non-success (including gateway failure despite identity success).
- Observed RED first from the absent result-validator export. Implemented the closed service selection and `validateServiceMatrixResults` fail-closed validator while preserving the legacy enumerable component-classification shape.
- CLI now writes compact `services=[...]` and `removedServices=[...]` outputs. Name-status records preserve deletion/rename provenance. Deleted service paths are selected but are not silently re-generated; workflow enforcement of `SERVICE_SOURCE_REMOVED` remains pending.
- `node --test scripts/migration/Test-MonorepoRequiredChecks.mjs`: 14/14 PASS after implementation.
- `node scripts/migration/Test-MonorepoWorkflowContracts.mjs --fixtures`: PASS, including the exact action SHA and no-collapse/digest-error mutation contract.
- `node api/scripts/supply-chain/Test-CycloneDxSchemaTrust.mjs`: PASS; `node api/scripts/supply-chain/Test-IdentitySbomFixtures.mjs`: PASS (32 fixtures) after canonical wrapper build.

## T03 continuation — user-supplied host evidence and local commits

The owner supplied a fresh Windows result for the previously blocked T02 prerequisite: branch `work/s002-t03-ci-security`, HEAD `24bac533c192f0d98261873bc1dd5d0bce841998`; generator 40/40 PASS; PowerShell 7 and Windows PowerShell 5.1 publisher fixtures each `executed=11`; the discovery-fallback regression passed. Treat this as user-reported evidence, not as a run independently reproduced by this sandbox.

My fresh sandbox rerun on the same working tree did not reproduce that host acceptance: the generator was 32/40 because calls requiring publication returned sanitized `PUBLICATION_FAILED`; direct PowerShell 7 launch of the WindowsApps alias returned Access is denied, and Windows PowerShell 5.1 reported that script execution is disabled by its enforced `Restricted` policy. No ExecutionPolicy override was attempted. The fallback-specific Node test passes 1/1. These outcomes are retained separately; the mismatch requires an approved runner when validating the PowerShell resolver.

Local commits on the isolated branch, none pushed:

- `f01e36c` — byte-preserving vendored CycloneDX `.gitattributes` rule, owner-approved.
- `42919ec` — focused approved T02 publisher discovery fallback and its test.
- `3dbe6f8` — service classifier/result validation plus the exact-SHA download-artifact isolation contract test.
- `751e332` — registry-bound CycloneDX service identity/dependency validation while preserving legacy Identity defaults.
- `9ef8f54` — service SBOM fixtures for valid relational/database-free gateway, forged GAV/PURL, missing dependency, and independent JDBC/PostgreSQL/Flyway/JPA/Hibernate gateway rejection.

T03-B latest local verification: required-check fixtures 15/15; workflow repository contract PASS; exact-pin fixture PASS; `git diff --check` PASS. The classifier reads service IDs/variants from `api/service-foundation/services.json`; malformed service registry aborts classifier module initialization with sanitized `SERVICE_REGISTRY_INVALID`, so no required workflow can silently skip due to an unreadable registry.

T03-C Node SBOM evidence: `Test-IdentitySbomFixtures.mjs` PASS with the expanded service fixtures; `Test-CycloneDxSchemaTrust.mjs` PASS; canonical Identity BOM validator PASS both with implicit legacy Identity selection and explicit `--service identity-profile-service`. The full schema/trust checks remain ahead of service semantics. This does not prove a real generated service Maven build, resolved graph, or Windows/Linux PowerShell resolver execution.

## Owner rulings applied during execution

- Keep the focused T02 PowerShell candidate fallback fix.
- Add the narrow byte-preserving CycloneDX vendored-schema `.gitattributes` rule. Do not edit the approved schema bytes, manifest digests, or trust semantics.

## T03 continuation — artifact resolution, evidence, workflows, and local verification

Status remains `IN_PROGRESS_LOCAL`. Implementation for T03-D through T03-F now exists in this isolated worktree; static/unit/fixture verification below passes. No workflow was published or run on a protected hosted candidate, no service matrix Maven/Testcontainers execution was observed, and no independent scoped review or publication handoff is complete. Therefore T03 is not accepted/DONE.

Artifact resolution and supply-chain propagation:

- Added `ServiceArtifact.psm1` and its PowerShell fixture harness. The resolver derives paths and expected Maven coordinates from the closed registry; rejects malformed registry entries, links/reparse points, wrong POM GAV, wrong executable-JAR manifest/main class, and unknown identifiers. Owner-reported PS7 result: `SERVICE_ARTIFACT_FIXTURES_PASS cases=13`, `HARNESS_EXIT=0` on 2026-10-08. This is user-supplied evidence, not sandbox-reproduced evidence. PS5.1 parse-only checks passed earlier; PS5.1 execution remains unverified.
- Added generated-project conformance checks for all four undelivered registered services. They validate closed output inventory, UTF-8/LF/no-BOM, token closure and gateway database exclusion. `node --test api/scripts/foundation/Test-GeneratedServiceConformanceFixtures.mjs`: 8/8 PASS. These fixtures use temporary generated trees and are not Maven runtime evidence.
- Added seven-file service evidence v2 validation bound to registry service, variant, checked-out commit, source provenance and artifact identity. It rejects missing/extra/raw evidence, inconsistent provenance, historical source deletion, and invalid PASS/policy combinations. `node api/scripts/supply-chain/Test-ServiceSupplyChainEvidence.mjs`: 15 cases PASS.
- Added exact per-service matrix result writer/collector and evidence aggregator. They bind result JSON to actual `git rev-parse HEAD`, disallow overwrite, require exact isolated artifact directories, reject missing/extra/duplicate/wrong-revision/non-success results, and keep execution failure separate from policy `BLOCKED`. `node --test scripts/migration/Test-ServiceMatrixResults.mjs scripts/migration/Test-ServiceMatrixEvidence.mjs`: 8/8 PASS.
- Added repository-only scanning mode so the repository Gitleaks/infra checks do not require or accidentally consume a service-built artifact. Existing service scan/build/smoke stages now take service identity from the registry resolver; generated relational smoke starts its ephemeral PostgreSQL path, while gateway smoke has no datastore container/configuration.
- Reworked supply-chain and security-freshness workflows around the actual checked-out execution SHA. Each selected service is independently generated only when its registered destination is absent and has no historical tracked addition; pre-existing destinations are not regenerated and deleted tracked sources fail closed. Each matrix leg builds/verifies and uploads one sanitized service result plus isolated evidence. Aggregation uses the reviewed exact downloader SHA, does not merge artifact directories, and validates exact service/revision/result identity. Release-policy remains a separate job and preserves `BLOCKED` semantics.

Observed local regressions on 2026-10-08 (all from the current uncommitted worktree at the original base HEAD `9ef8f5414e9f3160f3c08e9b904a03112eb87179`; no new commit was created):

| Command | Result |
| --- | --- |
| `node --test scripts/migration/Test-MonorepoRequiredChecks.mjs` | PASS 16/16 |
| `node --test scripts/migration/Test-ServiceMatrixResults.mjs scripts/migration/Test-ServiceMatrixEvidence.mjs` | PASS 8/8 |
| `node --test api/scripts/foundation/Test-GeneratedServiceConformanceFixtures.mjs` | PASS 8/8 |
| `node api/scripts/supply-chain/Test-ServiceArtifactPropagation.mjs` | PASS all propagation assertions |
| `node api/scripts/supply-chain/Test-ServiceSupplyChainEvidence.mjs` | PASS 15 cases |
| `node api/scripts/supply-chain/Test-ServiceMatrixWorkflow.mjs --repository` / `--freshness` | PASS both workflow contracts |
| Same workflow test `--fixtures` / `--freshness-fixtures` | PASS 6 + 4 mutation negatives |
| `node api/scripts/supply-chain/Test-HostedSupplyChainContract.mjs --repository` / `--fixtures` | PASS repository contract and all mutations |
| `node scripts/migration/Test-MonorepoWorkflowContracts.mjs --repository` / `--fixtures` | PASS repository contract, exact artifact pin and mutations |
| `node api/scripts/supply-chain/Test-CycloneDxSchemaTrust.mjs` | PASS |
| `node api/scripts/supply-chain/Test-IdentitySbomFixtures.mjs` | PASS all Identity and service-coordinate/gateway exclusions |
| Image build, image contract, Dockerfile policy, technical smoke, vulnerability and Gitleaks contract tests | PASS all individually |
| S002 lifecycle fixtures/repository and S001 T09 complete/closeout | PASS |
| `git diff --check` | PASS (Git emitted expected autocrlf notices; no whitespace errors) |

One attempted lifecycle command used the wrong path (`scripts/migration/Test-S002-Lifecycle.mjs`) and returned `MODULE_NOT_FOUND`; rerunning the correct `api/scripts/decisions/Test-S002-Lifecycle.mjs` fixture and repository commands passed. This was a command-path mistake, not a product failure.

The planned service handoff check then found its Markdown fence stripper only recognized three-backtick fences. The self-contained T03 guide wraps literal source snapshots in four-backtick fences so their embedded triple-backtick snippets remain intact; the old stripper exposed PowerShell source as prose and misread `($bytes.Length / 2)` as a Markdown file link. Added a small shared Markdown-content helper supporting backtick/tilde fences and variable fence lengths, plus a regression fixture for a four-backtick appendix containing an embedded triple fence. RED was observed first (`actual` retained the closing four-backtick delimiter); after the fix `node --test api/scripts/foundation/Test-MarkdownContent.mjs` passed 1/1. `node api/scripts/foundation/Test-ServiceHandoff.mjs` then passed: 101 Identity files matched raw/filter baselines (manifest `52387fed2968047f5f2dffae14b0457c1f02f4df189ab578beb55348ba6e9a63`), and the two changed Markdown documents had three checked links. This changes only the repository handoff-check utility, not product behavior.

Fresh final local rerun after that fix: combined required-check/matrix-result/evidence Node tests passed 24/24; supply-chain and freshness workflow repository contracts and their 6+4 mutation fixtures passed; root workflow repository/fixture contracts passed; Markdown regression passed 1/1; handoff passed with the Identity digest and 3 links above; `git diff --check` exited 0. These are local working-tree results based on HEAD `9ef8f5414e9f3160f3c08e9b904a03112eb87179`; the implementation changes remain uncommitted.

The owner supplied PS7 resolver result above. Local PS execution constraints still prevent this sandbox from executing the publisher/orchestration scripts, and no execution-policy override was used. Parser-only evidence is not counted as execution. Required next checks are: owner-run `pwsh -NoProfile -NonInteractive -File api/scripts/supply-chain/Test-HostedSupplyChainOrchestration.ps1`; PS5.1 resolver/orchestration execution if that host is in acceptance; then publish only under the owner’s prior T03 workflow-publication authorization and observe both protected Linux matrix workflows at the exact candidate SHA. Hosted run must prove generated canonical Maven `verify`/Failsafe execution, actual ephemeral PostgreSQL relational tests, database-free gateway tests, per-service scanner/evidence uploads, aggregate identity, and separate release policy. A local synthetic SBOM or source conformance PASS cannot substitute for these runtime gates.

## Workflow ownership decision and final local regression — 2026-10-08

The owner approved retaining the service matrix only in `supply-chain-verification` and `security-freshness`. The T03 guide/file map now assigns generation, service Maven/Failsafe, SBOM, image/smoke, scanner and per-service artifact work to those two workflows. `api-baseline.yml` remains responsible for its existing Identity baseline and API/security checks; `monorepo-verification.yml` retains its existing component/lifecycle/required aggregate gates. Neither receives a service matrix or duplicate Maven verify. No branch protection or required-check configuration was changed. Owner separately authorized an isolated candidate push and Draft PR after an independent exact-SHA review; this is not merge authorization.

Added an explicit workflow-ownership contract and mutation fixtures. They reject moving the matrix into API baseline or monorepo verification, duplicate Maven verify steps, weakening the unconditional `monorepo-required` aggregate, or removing either hosted workflow's ownership fixture command. RED was observed before the ownership validator/contract checks were added; the corrected suites pass.

Final local rerun from the uncommitted T03 worktree based on `9ef8f5414e9f3160f3c08e9b904a03112eb87179`:

| Verification | Result |
| --- | --- |
| Required-check + service matrix result/evidence Node tests | PASS 24/24 |
| Supply-chain matrix contract and mutation fixtures | PASS; ownership/no-ownership mutations included |
| Freshness matrix contract and mutation fixtures | PASS; ownership/no-ownership mutations included |
| Workflow ownership contract | PASS; 5 ownership assertions |
| Root workflow repository and negative fixtures | PASS; stable aggregate and no-matrix boundaries asserted |
| Service handoff / Identity preservation | PASS; 101 tracked Identity files, SHA256 `52387fed2968047f5f2dffae14b0457c1f02f4df189ab578beb55348ba6e9a63`; two Markdown files, three links |
| Markdown fence regression | PASS 1/1 |
| Artifact propagation contract | PASS all assertions |
| Service evidence | PASS 15 cases |
| Generated-service source conformance | PASS 8/8 |
| Hosted supply-chain repository/mutation contracts | PASS |
| CycloneDX schema trust | PASS |
| Identity/service SBOM fixtures | PASS, including forged service identity and independent gateway JDBC/PostgreSQL/Flyway/JPA/Hibernate negatives |
| S002 lifecycle fixture/repository; S001 T09 closeout | PASS |
| `git diff --check` | PASS; expected `core.autocrlf` notices only |

These are local source/contract results, not hosted service runtime evidence. The owner-supplied PowerShell artifact resolver (13 cases) and hosted orchestration (15 assertions) remain explicitly attributed to the owner; this sandbox has not independently executed those PowerShell scripts. No commit, push, Draft PR, independent review, or protected Linux service matrix run has yet occurred for the current candidate. Next: commit the exact scoped T03 changes, request independent review on that commit SHA, then—only after review is clear—push the authorized isolated candidate and open/continue a Draft PR for both hosted workflows. T03 remains `IN_PROGRESS_LOCAL` until every owner-defined closure gate is evidenced at the same proposed final revision.

No business/domain implementation was changed. No generated service directory, Maven target/cache, real credential, native database, release disposition, branch protection, PR, or merge was created/modified by these local steps.

## PowerShell orchestration harness follow-up — 2026-10-08

Owner ran `Test-ServiceArtifact.ps1` in the T03 worktree at `9ef8f5414e9f3160f3c08e9b904a03112eb87179`: 13 cases PASS. The first run of `Test-HostedSupplyChainOrchestration.ps1` passed its first five cases then failed at line 118 with `TEST_REPOSITORY_ONLY_CONTAINER_INVENTORY_NOT_EMPTY`.

Root cause from tracing the fixture and writer: repository-only mode correctly serializes the sanitized inventory document as `{ "findings": [] }`; after `ConvertFrom-Json`, the fixture counted the enclosing object (`1`) instead of its empty `findings` array (`0`). Updated only the fixture assertion to count `$repositoryOnlyContainer.findings`; production behavior was not changed. The owner reran the full harness in the same T03 worktree/revision and supplied the complete output: all 15 named assertions passed, including repository-only execution, policy-blocked evidence, smoke-failure classification and sanitized failure evidence; final marker `Hosted supply-chain orchestration tests: PASS`, `HARNESS_EXIT=0`. The sandbox still cannot launch its PowerShell 7 WindowsApps executable (`file cannot be accessed by the system`), so this remains owner-supplied runtime evidence. No execution-policy override was used. PowerShell 5.1 parser validation of the corrected harness and `git diff --check` also passed locally. The earlier five PASS lines alone were not counted as acceptance.

This log remains open pending exact-SHA independent review and hosted Linux acceptance.

## Independent review corrections — pending new exact-SHA review

Reviewer inspected commit `024b25246cba2f6c097b7303730f9b3b2fc45300` against the preceding T03 base and found three issues: downloaded matrix result directories retain artifact names `s002-service-result-<id>` while the collector expected `service-result-<id>`; both workflows lacked a required named Failsafe report assertion after Maven; and freshness aggregate checked out the mutable default-branch name instead of the resolved execution SHA. The reviewer reproduced the first defect with 6/8 result/evidence tests passing and two failing. This invalidates the earlier 8/8 local claim for the old test shape; it did not exercise a realistic downloaded directory layout.

The corrections were committed as `d479ddad6857e3730f19db31f7f36599a99b42eb`: result collector and both relevant fixtures use the exact isolated `s002-service-result-<id>` directory names produced by the workflows; both matrix jobs invoke a secure XML Failsafe report checker after `mvnw verify`, requiring the registered relational or gateway IT suite to have tests > 0 and failures/errors/skips all zero; a PowerShell fixture harness covers valid relational/gateway, absent, zero-test, skipped, failed, duplicate and DTD reports. Both aggregate jobs now checkout the SHA emitted by their resolver and compare `git rev-parse HEAD` to that SHA before running aggregation. Workflow mutation contracts reject missing/altered Failsafe proof and mutable/wrong aggregate revisions. `api-baseline.yml`, `monorepo-verification.yml`, their required gates, and branch protection remain untouched.

Observed after these worktree corrections: result/evidence tests 8/8 PASS; required-check fixtures 16/16 PASS; supply-chain and freshness matrix workflow contracts and negative fixtures PASS; root workflow repository contract and negative fixtures PASS; PowerShell 5.1 parser-only validation of the new checker/module/harness PASS; `git diff --check` PASS. PowerShell runtime execution of the new XML fixture harness is not available in this local sandbox, so it is not claimed; both owning Ubuntu workflows now run that harness and then execute the report checker on actual Failsafe XML. New exact-SHA independent review and protected hosted Linux evidence are still required before candidate publication. No push, Draft PR, merge, release, or branch-protection change has occurred.
