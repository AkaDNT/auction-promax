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

## Follow-up review correction — preserved Identity path — 2026-10-08

Independent review of `67ec90d954682f12e1b7d165f6e55fcabec1ce5d` found two connected blocking defects in the all-service freshness matrix: it includes preserved `identity-profile-service`, but generated-only conformance rejected preserved sources and the Failsafe validator accepted only the four new service IDs/classes. The reviewer also clarified that template conformance is appropriate only for ephemeral generated trees; committed trees are governed by their own Maven and artifact/evidence contracts. The issue was deterministic workflow failure, not ambiguity about product/business behavior.

Corrective working-tree changes now:

- Gate expanded-template conformance on `source_kind == ephemeral-generated` in both matrix workflows. The workflow contracts reject removing this provenance condition.
- Keep Failsafe proof active after successful Maven for every service, including Identity. Extend the closed selector/mapping to Identity's real class `com.auctionpromax.identityprofileservice.IdentityProfileServiceApplicationTestcontainersIT`; generated relational and gateway mappings remain unchanged. Add a passing Identity fixture plus workflow mutation negatives that reject excluding Identity.
- Update the T03 guide's file map and execution route to explain the ownership split and Identity-specific Failsafe suite. `api-baseline.yml`, `monorepo-verification.yml`, build count, required checks and release-policy semantics remain untouched.

Observed in the current uncommitted worktree based on `67ec90d954682f12e1b7d165f6e55fcabec1ce5d`:

| Verification | Result |
| --- | --- |
| Required-check + matrix-result/evidence tests | PASS 24/24 |
| Supply-chain workflow contract and mutation fixtures | PASS, including generated provenance and Identity Failsafe mutations |
| Freshness workflow contract and mutation fixtures | PASS, including generated provenance and Identity Failsafe mutations |
| Both owning workflow repository contracts; root workflow ownership contract | PASS |
| Generated-service conformance fixtures | PASS 8/8 |
| Service evidence fixtures | PASS 15 cases |
| Service artifact propagation | PASS all assertions |
| CycloneDX trust and Identity/service SBOM fixtures | PASS |
| Identity/handoff check | PASS, 101 tracked files unchanged, SHA256 `52387fed2968047f5f2dffae14b0457c1f02f4df189ab578beb55348ba6e9a63` |
| Markdown fence regression | PASS 1/1 |
| Failsafe PowerShell files | PASS parser-only check; no local runtime claim |
| `git diff --check` | PASS; autocrlf notices only |

PowerShell runtime fixture execution remains for the owning hosted Linux jobs; parser-only success is not Failsafe runtime proof. These corrections are uncommitted at log time. The next sequence is commit scoped T03 source/docs, independent re-review at the resulting exact SHA, then use the existing authorization to push that reviewed isolated candidate and create/continue its Draft PR. Do not reuse review or hosted evidence from earlier revisions.

## Independent review corrections — pending new exact-SHA review

Reviewer inspected commit `024b25246cba2f6c097b7303730f9b3b2fc45300` against the preceding T03 base and found three issues: downloaded matrix result directories retain artifact names `s002-service-result-<id>` while the collector expected `service-result-<id>`; both workflows lacked a required named Failsafe report assertion after Maven; and freshness aggregate checked out the mutable default-branch name instead of the resolved execution SHA. The reviewer reproduced the first defect with 6/8 result/evidence tests passing and two failing. This invalidates the earlier 8/8 local claim for the old test shape; it did not exercise a realistic downloaded directory layout.

The corrections were committed as `d479ddad6857e3730f19db31f7f36599a99b42eb`: result collector and both relevant fixtures use the exact isolated `s002-service-result-<id>` directory names produced by the workflows; both matrix jobs invoke a secure XML Failsafe report checker after `mvnw verify`, requiring the registered relational or gateway IT suite to have tests > 0 and failures/errors/skips all zero; a PowerShell fixture harness covers valid relational/gateway, absent, zero-test, skipped, failed, duplicate and DTD reports. Both aggregate jobs now checkout the SHA emitted by their resolver and compare `git rev-parse HEAD` to that SHA before running aggregation. Workflow mutation contracts reject missing/altered Failsafe proof and mutable/wrong aggregate revisions. `api-baseline.yml`, `monorepo-verification.yml`, their required gates, and branch protection remain untouched.

Observed after these worktree corrections: result/evidence tests 8/8 PASS; required-check fixtures 16/16 PASS; supply-chain and freshness matrix workflow contracts and negative fixtures PASS; root workflow repository contract and negative fixtures PASS; PowerShell 5.1 parser-only validation of the new checker/module/harness PASS; `git diff --check` PASS. PowerShell runtime execution of the new XML fixture harness is not available in this local sandbox, so it is not claimed; both owning Ubuntu workflows now run that harness and then execute the report checker on actual Failsafe XML. No push, Draft PR, merge, release, or branch-protection change has occurred.

## Exact-SHA review and publication preflight — 2026-10-08

The Identity correction was committed as `ef507d339a7ce991f45ca2ce5d711e695ebb1cd0` (`fix(ci): preserve Identity in service matrix`). Independent reviewer `/root/t03_independent_review` reviewed that exact SHA against `67ec90d954682f12e1b7d165f6e55fcabec1ce5d` and reported no blocking or important code findings. The reviewer independently reran result/evidence tests (8/8), required checks (16/16), generated conformance (8/8), both workflow/ownership contracts and mutation fixtures, root workflow contracts, and Markdown regression; all passed. Reviewer could not runtime-execute the PowerShell Failsafe harness because `pwsh.exe` was inaccessible and Windows PowerShell script execution was disabled. This is explicitly not hosted Failsafe or service-matrix evidence.

Publication preflight: `gh auth status` reports the active GitHub token invalid; a read-only `gh pr list` call was also blocked by sandbox network permissions. No push, PR creation, merge, or protected-branch operation occurred. Candidate publication remains pending usable authenticated GitHub access. This log update changes the candidate revision; refresh independent review on the resulting commit before publication and do not reuse review/hosted evidence from prior SHAs.

## Hosted candidate follow-up and corrective work — 2026-10-08

Owner reauthenticated GitHub CLI. Candidate branch was published and Draft PR #21 opened under the existing authorization: https://github.com/AkaDNT/auction-promax/pull/21. The published candidate tested in the first hosted runs was `e86a90013351a6275583886e5ed821d0c03a0aef`. This is distinct from the pre-existing review evidence for `ef507d3`; any corrective commit requires a fresh exact-SHA review.

Observed hosted runs at candidate SHA `e86a90013351a6275583886e5ed821d0c03a0aef`:

- Supply-chain PR run `37729108150` and push run `37729091173` failed in service-matrix validation. API baseline, web baseline and monorepo verification succeeded; `release-policy` did not run because its upstream aggregate failed. These outcomes are not T03 acceptance.
- The four ephemeral relational/gateway services failed Maven compilation with the same template defect: `TechnicalProblemAdvice.java:[40,23] incompatible types: ResponseEntity<Object> cannot be converted to ResponseEntity<ProblemDetail>`. The exception handler returns the shared `ResponseEntity<Object>` problem helper while declaring `ResponseEntity<ProblemDetail>`. This is technical HTTP-template code, not business/domain logic.
- The preserved Identity service completed Maven `verify` and its Failsafe report assertion: suite `IdentityProfileServiceApplicationTestcontainersIT`, 10 tests, zero failures/errors/skips. Its following artifact-aware stage failed as `SBOM_BUILD_FAILED`; the hosted log exposed no underlying `CONTAINER_PREBUILD_*` code or exception type, so the validator/build root cause is still unknown and no SBOM implementation fix is inferred.
- The independent repository-only security scan completed with `executionState=PASS`, `policyState=BLOCKED`, `failureCode=NONE`. This records successful scan execution with a policy block, not a policy pass. Evidence validation then failed `HOSTED_EVIDENCE_COMMIT_MISMATCH`: the bootstrap summary used `github.sha`, while validation compared all evidence to the SHA from the checked-out execution revision.
- Manually dispatched freshness run `37729879797` from `work/s002-t03-ci-security` was also unsuccessful and did not execute any matrix legs. Its workflow intentionally checked out `migration/monorepo`; that default-branch checkout's `MonorepoRequiredChecks.mjs` accepts only `--classify`, while the candidate workflow requested `--list-services`. The resolver therefore failed before emitting `execution_sha`; aggregate correctly failed closed on empty `EXPECTED_SHA`. This confirms a revision-skew/ownership boundary, not a candidate scan result.

Corrective working-tree changes, based on `e86a90013351a6275583886e5ed821d0c03a0aef`, currently uncommitted:

- Changed only the common technical exception handler return type to `ResponseEntity<Object>` and added a source-conformance assertion plus an incompatible-return-type mutation negative.
- Changed repository-only fail-closed summary initialization in both workflows to consume the resolved checkout SHA (`needs.classify-services.outputs.execution_sha` for supply-chain and `needs.resolve-services.outputs.execution_sha` for freshness), rather than the event/dispatch SHA. Added root and service workflow contracts and negative mutations to prevent future SHA-source drift.
- Added a sanitized fallback diagnostic for an unclassified prebuild failure that reports only `phase=stage-dispatch` and exception type; known `CONTAINER_PREBUILD_*` codes retain precedence. Added a PowerShell harness assertion to verify the fallback while preserving generic `SBOM_BUILD_FAILED` as the outward state. It does not dump exception content, paths, or environment data.
- No generated service, production Identity source, business/domain code, database, policy disposition, branch protection, required-check selection, or release semantics changed.

Fresh local verification on the uncommitted worktree: template conformance 32/32; generated-service conformance fixtures 8/8; matrix result/evidence Node tests 8/8; supply-chain and freshness workflow repository contracts PASS; service/freshness workflow mutation fixtures PASS including evidence-SHA negatives; ownership fixtures 5/5; root workflow repository contract and mutation fixtures PASS; hosted-workflow contract fixtures PASS; Identity preservation/handoff PASS (101 tracked files, digest `52387fed2968047f5f2dffae14b0457c1f02f4df189ab578beb55348ba6e9a63`); PowerShell 5.1 parser-only check PASS; `git diff --check` exit 0 (expected autocrlf notices only). PowerShell runtime could not be executed locally: PowerShell 7 executable access is denied by the host and Windows PowerShell script execution is restricted; no policy bypass was used. Local Maven compile remains unverified because this sandbox cannot reach Maven Central; the next hosted run is required to verify the template compiler fix.

### Decision required — pre-merge freshness proof

The existing T03 ruling binds `security-freshness` to the checked-out default-branch revision. The candidate-dispatched workflow definition is from the T03 branch, but its jobs check out and execute scripts from `migration/monorepo`, which does not yet contain T03 matrix code. Running candidate scripts against candidate code would change the freshness target/provenance; running the current default-branch checkout cannot exercise T03's new matrix. No workaround has been implemented. Await owner direction on whether to preserve default-branch semantics and defer freshness runtime proof until after merge, or authorize a separate pre-merge candidate-validation route. T03 remains IN_PROGRESS; no merge authorization is implied.

## Hosted candidate run 37736602298 and follow-up corrections — 2026-10-08

The owner reauthenticated `gh` and authorized continuing the already-approved candidate workflow validation. Candidate PR #21 remained Draft; no merge or protected-branch change was authorized. The exact PR head at run start was `1564e80e3ce62095f192fc6eb178f125653018f9`; GitHub checked out the PR merge execution revision `0053bc643c46989af7405850cb7edce7c627fe94`, which is the revision recorded by the classifier and per-service matrix-result artifacts. Run URL: https://github.com/AkaDNT/auction-promax/actions/runs/37736602298.

Hosted observations from that run:

- The service selection and template/source generation checks passed, but the generated service Maven legs failed compilation in `StructuredLoggingTest.java`: the test is in the root package and directly calls `TechnicalProbeController.validate`, which was package-private in the shared template. Identity `mvnw verify` and its named Failsafe execution completed successfully; generated service compilation did not.
- Identity then failed the artifact-aware prebuild/SBOM stage with outward `SBOM_BUILD_FAILED`. The initial sanitized diagnostic only showed `phase=stage-dispatch; exceptionType=RuntimeException`, which was insufficient to classify the child script failure. Its evidence validator independently rejected the valid Identity POM at `SERVICE_EVIDENCE_ARTIFACT_MISMATCH` line 125 because the coordinate extractor read Maven parent coordinates before project coordinates.
- Repository-only shared scans completed with execution `PASS` and policy `BLOCKED` (the separate policy outcome is preserved), but hosted evidence validation failed with `HOSTED_EVIDENCE_COMMIT_MISMATCH`. Downloaded sanitized evidence showed that the repository-mode evidence writer omitted `commit` from inventory/image/policy records, while the validator correctly requires every evidence document to bind to the checked-out execution SHA. The run's release-policy job was skipped because the aggregate verification failed; no aggregate PASS is claimed.
- All five per-service matrix result artifacts were present and bound to the checked-out execution revision; each recorded `failure`, so exact result aggregation failed closed as intended.

The implementation correction remains scoped to technical test accessibility and CI evidence handling; no auction/domain behavior was changed:

- Added a template contract assertion and mutation fixture for public access to the controller handler, observed RED, then made `TechnicalProbeController.validate` public. This is the web handler's normal public endpoint method and permits the cross-package structured-logging test to compile.
- Extended the service evidence fixture POM with deliberately different parent GAV values, observed `SERVICE_EVIDENCE_ARTIFACT_MISMATCH`, and changed coordinate extraction to exclude the parent block before checking project GAV.
- Legacy/repository evidence records now include the resolved checked-out commit. The PowerShell orchestration fixture asserts all seven repository evidence documents carry that exact SHA, in addition to retaining the empty-container inventory assertion.
- The prebuild helper now emits only its fixed classified failure code to the child-process output before throwing. The parent wrapper can therefore surface an approved `CONTAINER_PREBUILD_*` code without exposing raw command output, paths, or exception text. Added a sanitized-classification orchestration fixture alongside the unclassified fallback fixture.

Fresh local verification from the working tree based on `1564e80e3ce62095f192fc6eb178f125653018f9`:

| Verification | Result |
| --- | --- |
| Template conformance and corruption fixtures | PASS 33/33 |
| Generated service conformance fixtures | PASS 8/8 |
| Service evidence fixtures, including Maven parent coordinates | PASS 15 cases |
| Hosted evidence validator fixtures | PASS |
| Artifact propagation contracts | PASS all assertions |
| Matrix result/evidence tests | PASS 8/8 |
| Hosted supply-chain repository contract | PASS |
| Supply-chain/freshness workflow contracts and mutation fixtures | PASS |
| Workflow ownership mutation fixtures | PASS 5 assertions |
| Root required-workflow repository and negative fixtures | PASS |
| PowerShell 5.1 parse-only validation of modified scripts | PASS 3 files |
| `git diff --check` | PASS; expected `core.autocrlf` notices only |

PowerShell orchestration runtime was not available in this local sandbox; the updated harness must execute on the next Ubuntu workflow run. No execution-policy override was used. The separate owner-dispatched `security-freshness.yml` run `37729879797` checked out the default branch by design, where the candidate T03 `--list-services` interface was not present, and failed before service execution. This confirms the still-open validation-route decision: do not change default-branch freshness semantics or add a pre-merge candidate mode without separate owner approval. The owner-defined acceptance gates remain incomplete.

At log time these corrections are uncommitted. Next: repeat affected local checks, review and commit the full scoped change including this execution log, obtain a fresh independent review of that exact commit SHA, push only the reviewed isolated candidate to `work/s002-t03-ci-security`, then inspect fresh hosted results for compile/Failsafe, service SBOM/scanner/evidence, repository evidence identity, aggregate gating, and separate release policy. Do not reuse run `37736602298` as PASS evidence for the corrected revision.

## Exact-SHA review finding and XML identity correction — 2026-10-08

Independent reviewer `/root/t03_independent_review` reviewed `1ab0e3f1875b150f1caf49f30c8ce1971d03ae47` against `1564e80e3ce62095f192fc6eb178f125653018f9`. The reviewer reported one IMPORTANT finding: regex-based project GAV extraction could accept expected coordinate elements inside an XML comment before mismatched actual coordinates. Other requested changes passed review; reviewer independently reran template conformance 33/33, service evidence 15 cases, hosted evidence, artifact propagation, both workflow repository contracts, matrix result/evidence 8/8, PowerShell parser-only validation of three scripts, and `git diff --check`. The PowerShell orchestration harness was not runtime-executed by the reviewer.

Reproduced the issue with a regression fixture containing commented expected GAV followed by attacker-controlled project GAV; before correction the validator accepted it (observed RED). Replaced regex-based coordinate lookup with a bounded XML reader for the Maven POM structure used by this validator. It ignores comments, requires a single `project` document root and exactly one direct child for each GAV coordinate, rejects mismatched/malformed tags and DTD/entity declarations, and does not interpret parent or nested dependency coordinates as project identity. The fixture now rejects commented coordinate spoofing. This adds no dependency and does not modify Maven build inputs.

Fresh local `Test-ServiceSupplyChainEvidence.mjs` passed 16 cases at that point, including the parent-coordinate success fixture and comment-spoof rejection. The next exact-SHA reviewer pass found a further namespace gap, recorded and corrected below.


## Hosted candidate run and follow-up corrections — 2026-10-08

Candidate `fa1846f9beb10317c1fa330d62bce0b753e93784` was pushed to the isolated branch and reviewed independently with no blocking/important findings. Draft PR #21 triggered hosted run `37738343559` (`security-freshness.yml`; run URL https://github.com/AkaDNT/auction-promax/actions/runs/37738343559). User-supplied run output identifies the checked-out/merge revision as `76bed2c19d6af86a04488fed225402d195e29014`; it is not a passing acceptance run. GitHub API re-query from this sandbox is blocked by network policy, so the run observations here are attributed to the supplied output and downloaded sanitized artifacts, not independently queried live status.

Observed hosted outcomes:

- Resolver/classification passed. All four ephemeral generated service Maven legs failed the shared `StructuredLoggingTest.ecsEncoderWritesOneCorrelationFieldAndNoRawValue(String)[1]` assertion: expected `null`, actual `{}` for the empty MDC map. This is the Java logging API's empty-state representation; no raw MDC value was shown. Identity's Maven verify and named Failsafe proof passed, but its later artifact-aware prebuild failed closed as `CONTAINER_PREBUILD_CANONICAL_ARTIFACT_MISSING` / `SBOM_BUILD_FAILED`. The aggregate failed closed and release-policy was skipped; neither is counted PASS.
- Repository-only scans completed with execution `PASS` and policy `BLOCKED`, kept as separate states. Hosted evidence validation then failed `HOSTED_EVIDENCE_FIELD_INVALID`: the sanitized `image-identity.json` correctly included registry-derived `imageReference`, but the validator's non-summary field allowlist omitted it. This was distinct from the earlier commit-field omission, which had already been fixed and was verified in downloaded evidence.
- The five per-service artifacts were isolated and revision-bound; result collection rejected their failed execution states. No full service matrix, aggregate, or release-policy acceptance is claimed.

TDD corrections in the current uncommitted worktree, based on `fa1846f9beb10317c1fa330d62bce0b753e93784`:

- Normalized nullable MDC maps to empty maps in the shared generated logging test, retaining exact equality checks for populated correlation fields. Added a conformance assertion for both normalization sites and a mutation that removes both; observed RED before the fixture correction and GREEN after. No runtime logging/filter/business behavior changed. `node api/scripts/foundation/Test-ServiceConformance.mjs --templates`: PASS 34/34.
- Added `imageReference` to the closed sanitized hosted-evidence field allowlist and to the realistic image evidence fixture. The new fixture failed before the allowlist change (`HOSTED_EVIDENCE_FIELD_INVALID`) and passes after. `node api/scripts/supply-chain/Test-HostedSupplyChainEvidence.mjs`: PASS; the downloaded repository evidence directory also validated at commit `76bed2c19d6af86a04488fed225402d195e29014` after this correction.
- Improved prebuild's sanitized failure classification. It now distinguishes a missing canonical JAR, missing canonical SBOM, and a present-but-invalid canonical artifact using fixed code strings only; it does not expose paths or exception text. Added propagation contract assertions for all three classifications. This is diagnostic/fail-closed behavior; the underlying Identity artifact discrepancy remains to be identified by the next hosted run and must not be represented as fixed yet.

Verification performed after these edits: template conformance 34/34; hosted evidence fixtures PASS; service artifact propagation contract PASS; matrix result/evidence 8/8; supply-chain and freshness workflow repository contracts PASS; hosted supply-chain repository contract PASS; CycloneDX schema trust PASS. GitHub-hosted PowerShell orchestration has not yet rerun on these edits. The edits and this log entry are uncommitted, and no exact-SHA independent review or hosted result applies to them yet.

Next: run the remaining impacted local gates, inspect/clean the exact temporary downloaded artifact directory created for run `37738343559`, commit the scoped changes plus this log, request independent review on that exact SHA, push only after review PASS, then trigger/inspect new hosted runs. The next run must explicitly establish whether Identity is missing its canonical JAR, its canonical SBOM, or has an invalid artifact; verify all four generated Maven/Failsafe legs; and show repository evidence validation, isolated artifact aggregation and separate release-policy behavior. Keep PR #21 Draft. T03 remains IN_PROGRESS_LOCAL.

## Hosted run at `e073abd` and second runtime corrections — 2026-10-08

Commit `e073abd1d2f6fb0dcbd8e8f44f75f1c0d20b1229` was independently reviewed against `fa1846f9beb10317c1fa330d62bce0b753e93784` (scoped PASS, no blocking or important findings) and pushed only to `work/s002-t03-ci-security`. GitHub Actions run `37739182141` was started at that exact SHA: https://github.com/AkaDNT/auction-promax/actions/runs/37739182141. This run completed FAILURE; it is not acceptance evidence. Live status and per-job output were read from GitHub with `gh`; no PAT was placed in commands or files.

Observed results:

- Service classification passed. Repository security scans completed successfully as execution; policy was reported separately as `BLOCKED`, which remains non-PASS. All five per-service legs were selected at `e073abd`.
- All generated-service unit suites passed, including the previously failing empty-MDC test. The three relational Failsafe legs then failed during Testcontainers initialization, before PostgreSQL started. The exception names pinned image `postgres:17.11-bookworm@sha256:84560e3…` as incompatible with the PostgreSQL module alias `postgres`. This means relational database execution is still unproven; the infrastructure/image container did not get as far as DB assertions.
- Gateway Maven/Failsafe progressed to artifact-aware checks, but its artifact stage failed with sanitized `CONTAINER_PREBUILD_CANONICAL_ARTIFACT_INVALID`. Identity's Maven/Failsafe also completed but artifact-aware prebuild reported the same invalid-artifact category. The separate aggregate failed closed and `release-policy` was skipped.
- The per-job sanitized error did not identify which JAR invariant failed. Source tracing found `ServiceArtifact.psm1` extracts `Start-Class` from one physical manifest line, whereas JAR manifests fold values after 72 bytes using a newline followed by one leading space. Registry class names are 74 bytes for Identity and 60 for realtime-gateway; with the `Start-Class: ` attribute prefix those exceed the 72-byte line limit (87 and 73 bytes respectively). The source-level evidence strongly implicates failure to unfold these two long values; confirmation is intentionally deferred to the next hosted result using the more specific fixed diagnostic. Auction/bidding/billing have shorter values and did not reach prebuild because their relational Failsafe failed first.

Second-round changes currently uncommitted on top of `e073abd`:

- Added the Testcontainers-supported explicit compatibility declaration `.asCompatibleSubstituteFor("postgres")` to the shared digest-pinned relational IT template. Added a conformance invariant and a mutation that removes this declaration. The regression is now in `Test-ServiceConformance.mjs`; the template suite passes 35/35. The reported API matches Testcontainers Java docs (`DockerImageName.asCompatibleSubstituteFor(String)`); this marks the already digest-pinned official PostgreSQL image as the alias expected by `PostgreSQLContainer`, it does not change the selected image or digest.
- Added a PowerShell resolver fixture with a standards-compliant folded long `Start-Class` for `identity-profile-service`; this fixture is test-first and will run in the next Ubuntu PowerShell harness. The current one-line extraction algorithm was reproduced as RED in a local equivalent (`actual` length 59 vs expected 74). Updated resolver parsing to unfold continuation lines before validating `Main-Class` and `Start-Class`; a local equivalent un-folding check passed. PowerShell parser-only validation passes, but the actual PowerShell fixture harness is not executable in this sandbox; no execution-policy override was used.
- Split artifact failure classification by the existing fixed resolver code: a JAR manifest identity mismatch now emits `CONTAINER_PREBUILD_CANONICAL_JAR_IDENTITY_INVALID`, a POM GAV mismatch emits `CONTAINER_PREBUILD_POM_IDENTITY_INVALID`, and other invalid artifact cases remain generic. The output remains a closed code token only; raw exception detail/path is not emitted. This should make the next hosted failure evidence actionable without weakening validation.

Observed local checks after these second-round edits: shared template conformance PASS 35/35; artifact propagation contract PASS with new JAR-identity classification assertion; service evidence PASS 19; hosted evidence PASS; PowerShell parser-only checks PASS for modified resolver and prebuild scripts; `git diff --check` PASS. Generated-project conformance and workflow matrix/root contracts are rerun before commit. The PowerShell artifact and orchestration runtime harnesses have not been independently executed after these edits.

Exact-SHA implications: reviewer PASS applies only to `e073abd`; hosted run `37739182141` also applies only to `e073abd`, and is failed runtime evidence. These second-round edits need their own commit and independent exact-SHA review before push, then fresh hosted runs. `security-freshness.yml` currently supports schedule/dispatch only and explicitly checks out the repository default branch, not PR candidate. A separate owner choice is pending on whether to add a narrow PR-candidate mode while preserving default-branch scheduled/dispatch semantics, or keep default-branch-only and defer candidate freshness proof. No workflow semantics, triggers, branch protection, merge, or release have been changed under this pending choice. PR #21 remains Draft; T03 remains IN_PROGRESS_LOCAL.

### Diagnostic detail and follow-up test coverage

Read-only `gh run view --log-failed` inspection after the summary above confirmed that auction, bidding and billing all fail in `RelationalBoundaryTestcontainersIT` with Testcontainers' exact compatibility guard for the pinned PostgreSQL image. Their structured logging, architecture and HTTP unit tests passed. The gateway's named Failsafe execution got through; its later service artifact-aware stage failed with the same `CONTAINER_PREBUILD_CANONICAL_ARTIFACT_INVALID` as Identity. Repository scan job itself completed successfully; release-policy remains skipped due to failed aggregate.

TDD additions now present in the worktree:

- The shared relational integration test template now declares `.asCompatibleSubstituteFor("postgres")` on the already digest-pinned PostgreSQL image. The template conformance check requires the declaration and a mutation removes it. Observed RED when the declaration was removed (`TEMPLATE_CONFORMANCE_FAILED`); GREEN after restore: template conformance 35/35. This uses Testcontainers Java's documented compatibility API; it changes neither image name nor digest.
- The PowerShell service-artifact fixture now emits a standards-compliant folded manifest line and exercises the long Identity `Start-Class`. This is 1 added fixture. The previous resolver's one-line extraction was independently reproduced as RED (only 59 of 74 class-name characters were captured). `ServiceArtifact.psm1` now unfolds continuation lines before fixed-identity comparison. Local PowerShell parser-only validation passed; runtime execution of the actual harness remains pending hosted Ubuntu because local PS script execution is unavailable/restricted. The currently diagnosed Identity/gateway artifact failure remains a source-level attribution until the next run reports the new JAR-identity fixed code or passes.
- Prebuild maps the resolver's fixed `SERVICE_JAR_MANIFEST_MISMATCH` and `SERVICE_POM_IDENTITY_MISMATCH` codes to distinct safe `CONTAINER_PREBUILD_*` codes; no arbitrary exception text or artifact path is emitted. Added a propagation assertion for the JAR-manifest code, which was RED before and passes after.

Latest local verification after these changes: template conformance 35/35; generated-service conformance 8/8; artifact propagation PASS; service evidence 19; hosted evidence PASS; image/Dockerfile contracts PASS; both matrix workflow repository contracts PASS; both workflow mutation suites PASS; hosted supply-chain repository contract PASS; root workflow repository contract PASS; PowerShell parser-only validation of modified PowerShell files PASS; `git diff --check` PASS. These do not replace the unrun PowerShell runtime fixture, actual PostgreSQL integration, or hosted matrix checks. All second-round changes and this execution-log update remain uncommitted on top of `e073abd` and require exact-SHA review/hosted rerun.
