# S001-T09 Snapshot Monorepo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a public, production-governed `AkaDNT/auction-promax` monorepo from reviewed API and web snapshots, without importing legacy Git ancestry, and prove independent builds, contract compatibility, hosted checks, and controlled cutover with rollback.

**Architecture:** The new repository retains its own short Git history. The current root `api/` and `web/` trees are the reviewed snapshot candidates and remain independently built; `api/contracts/` remains the canonical contract registry. The existing local reference copy is preserved unchanged for reference only. No GitHub source repository or prior Git history is used as a migration input. Candidate work runs on `migration/monorepo` while bootstrap `main` remains default; cutover happens only after local and hosted gates pass.

**Tech Stack:** Git/GitHub Actions, PowerShell 7 and Windows PowerShell 5.1, Node.js 24.15.0/npm 11.12.1, Java 21/Maven Wrapper, existing API supply-chain scripts, Next.js 16.2.2.

**Spec:** `docs/superpowers/specs/2026-09-24-s001-t09-snapshot-monorepo-design.md`; ADR-017, BD-007, Blueprint Phase 0, and D-005 in the legacy API documentation.

**Review status:** APPROVED_FOR_EXECUTION — owner approved public snapshot migration and clarified that the local reference copy is not a Git source. Do not access or alter any GitHub source repository or use prior refs as migration inputs.

## Global Constraints

- Destination is the existing **public** `https://github.com/AkaDNT/auction-promax.git`; independently verify visibility before any source push. Keep existing documentation commits, but do not commit additional personal working notes, private backup inventories, or local audit logs. Project-facing source, tests, CI configuration, and reviewed public governance documentation remain eligible after the public-content gate.
- Treat the current root `api/` and `web/` trees as the snapshot candidates. Preserve the existing local reference copy unchanged and do not inspect its remotes or use its file contents/history as migration provenance. A narrow, owner-approved read-only tree-mode lookup is allowed only when the candidate blob hash matches exactly.
- No prior GitHub source repositories, refs, or histories are migration inputs. This plan makes no changes to any other repository.
- Current modified/untracked API content is candidate material only. Review and test each group before explicit staging; never run `git add .` in the monorepo.
- Do not commit `.env*` with real values, credentials, `.worktrees/`, `.vscode/`, `.tools/`, `node_modules/`, `.next/`, `.turbo/`, Maven `target/`, scanner raw reports, logs, or backups.
- `api/contracts/` stays canonical; `api/infra/` is the actual infrastructure path. API and web retain independent build/test/release/deployment boundaries.
- Root `.github/workflows/` is the only active workflow directory. The workflow owning required aggregate checks has no PR-level path filter and always emits a conclusion, including docs-only PRs.
- Reserve `monorepo-required` as the single globally unique required aggregate job/check name across all root workflows. If merge queue is later enabled, add and test `merge_group` before requiring that check for merge-queue events.
- Keep Cycle 6 execution-integrity and release-policy results separate; `POLICY_BLOCKED` is not an implementation failure or a release-ready claim.
- No AWS/ECR/Inspector delivery, OIDC role, application signing, or deployment is introduced here.
- D-005 remains OPEN until the exit evidence is complete. The first snapshot commit is not completion evidence by itself.

## Review Focus

- Candidate files change after local inventory: invalidate the affected path/hash inventory and rerun review and tests before staging (Tasks 1–3).
- A nested `.git`, environment file, cache, build output, or raw report appears in the candidate: stage-allowlist test must reject it before any push (Task 3).
- Destination cannot enforce branch protection/rulesets and required checks: stop before candidate push/cutover and request an owner decision (Task 1).
- A physical nested `.git` or staged index mode `160000` is present: stop before snapshot commit; ignore rules alone are insufficient (Task 3).
- A required component is skipped or fails while an aggregate check reports success: negative workflow fixtures must fail closed (Task 5).
- A contract-only change passes producer validation but breaks web usage: consumer fixture and hosted contract PR must fail (Tasks 5–6).

---

### Task 1: Freeze the local snapshot inputs

**Files:**
- Create locally, never stage: `.worktrees/s001-t09-private-evidence/source-inventory.md`
- Read only: current root `api/` and `web/` candidate trees
- Preserve unchanged: existing local reference copy (do not publish its workstation path)

**Interfaces:** Consumes the approved public snapshot direction and current root candidate trees. Produces a local-only inventory of the repository baseline, candidate paths/counts, ignored sensitive/generated paths, and destination visibility/capability evidence. It does not use private source remotes or Git histories. No candidate source files are staged.

- [x] **Step 1: Confirm the repository baseline.** Recorded the root branch/HEAD, destination identity and public visibility; verified `api/` and `web/` have no nested `.git` and no staged files. `.env.local` contents were not read.
- [x] **Step 2: Inventory candidate paths without opening secrets.** Recorded file counts and top-level groups locally. Excluded `.env*` (except reviewed examples), `.git`, `.worktrees`, `.vscode`, `.tools`, dependency directories, `.turbo`, caches, generated output, and raw reports. Task 2 will classify each candidate file. The local reference copy was not traversed or changed.
- [x] **Step 3: Verify destination capability.** Confirmed public visibility and GitHub documentation support for branch protection/rulesets and required status checks on public repositories. This verifies capability only; no rules have been configured.
- [x] **Step 4: Record the local snapshot baseline.** Saved the root HEAD and candidate counts/top-level groups under `.worktrees/s001-t09-private-evidence/source-inventory.md`. Task 2 owns the detailed file allowlist. No workstation path, environment value, or credential was added to public Git history.
- [x] **Step 5: Review and validate the inventory.** `git diff --check` passes; the local inventory is ignored. No candidate files were staged.

### Task 2: Classify and verify the candidate source trees

**Files:**
- Create locally, never stage: `.worktrees/s001-t09-private-evidence/file-review.md`
- Create: `scripts/migration/Test-SnapshotFileReview.mjs`
- Read only: current root `api/` and `web/` candidate trees

**Interfaces:** Consumes Task 1 frozen provenance. Produces an explicit included/excluded path review and local test results; no root source snapshot commit yet.

- [x] **Step 1: Write RED review-manifest tests.** Require every candidate top-level path to be classified `INCLUDE` or `EXCLUDE` with reason and reviewer, and every included modified/untracked API path to belong to an explicit group. Reject an unclassified path, `.git`, `.env.local`, caches, `node_modules`, `.next`, `target`, raw reports, or an included file absent from disk. Run `node scripts/migration/Test-SnapshotFileReview.mjs`; require RED then GREEN.
- [x] **Step 2: Review API changes by group.** Review the current root `api/` tree by explicit path groups; no old Git commit comparison is part of this scope. Review Gitleaks module/runner/tests and vulnerability disposition schema together; run their existing `api/scripts/supply-chain/Test-GitleaksScanning.ps1`, `Test-GitleaksWorkingTreeSnapshot.ps1`, and `Test-VulnerabilityDispositionSchema.mjs`. Review unrelated API changes individually; a failing test or unclear intent stops that group rather than silently including it.
- [x] **Step 3: Review web snapshot.** Review the current root `web/` tree by explicit path groups and classify every candidate file. Run `npm --prefix web ci`, `npm --prefix web run lint`, and `npm --prefix web run build` under Node `24.15.0`/npm `11.12.1`. Do not include local environment files or generated output.
- [x] **Step 4: Review migration documentation separately.** The old subtree plan contradicts the approved snapshot design. Exclude `api/docs/superpowers/plans/2026-09-24-s001-t09-monorepo-migration.md` from the candidate snapshot, recording the exclusion in the local review inventory. Keep the local reference copy unchanged. Do not ship the old plan as `APPROVED_FOR_EXECUTION` beside the replacement plan.
- [x] **Step 5: Confirm full candidate testability.** Run API Maven Wrapper build/tests, API contract tests, infrastructure tests, web lint/build, and current supply-chain regression suites from their actual directories. Record command, exit code, and sanitized result for each group. For regression assertions whose precondition is the destination Git index (for example, checking the executable mode returned by `git ls-files --stage`), record `DEFERRED_TO_TASK3` with the missing precondition; do not stage early or report PASS. Where an owner-approved local reference is used solely to check mode metadata, first verify the candidate blob matches the referenced blob and do not use that repository's content, refs, or history as migration provenance. Record platform-specific tests as `NOT_APPLICABLE_LOCAL_PLATFORM` when the host is incompatible; require their execution on a matching runner in Task 6. If a required gate is unavailable, classify the snapshot `BLOCKED`, not PASS.
- [x] **Step 6: Retain the review evidence locally; do not commit it.** Store the file-review inventory under `.worktrees/s001-t09-private-evidence/`. Leave `scripts/migration/Test-SnapshotFileReview.mjs` uncommitted until the reviewed code snapshot in Task 3. No workstation-specific details, environment values, credentials, or personal review log are staged.

### Task 3: Build the default-deny snapshot locally

**Files:**
- Create: `.gitignore`
- Create locally, never stage: `.worktrees/s001-t09-private-evidence/snapshot-manifest.json`
- Create: `scripts/migration/Test-SnapshotStage.mjs`
- Stage selectively: reviewed `api/`, `web/`, root governance files

**Interfaces:** Consumes the Task 2 allowlist and local snapshot hashes. Produces a root Git commit with reviewed current trees and no nested Git metadata or local-only material.

- [ ] **Step 1: Write RED stage-guard tests.** Test a staged `.env.local`, physical nested `api/.git` or `web/.git`, staged gitlink/submodule mode `160000`, `.worktrees`, `.vscode`, `.tools`, `node_modules`, `.next`, `target`, scanner raw JSON, and unexpectedly large binary; each must cause a nonzero exit. Test a reviewed source file and `.env.example` exception to pass. Implement `Test-SnapshotStage.mjs` to read `git diff --cached --name-only -z` and `git ls-files --stage -z`, reject any index entry with mode `160000`, inspect staged blobs with `git cat-file`, and compare every staged source path to the Task 2 allowlist, SHA-256, and expected Git mode. The snapshot manifest records `gitMode` (`100644` or `100755`) for each included regular file; reject unsupported file types unless separately reviewed. Add a regression proving executable-mode mismatch fails. After explicit allowlist staging, verify `api/services/identity-profile-service/mvnw` is `100755`; if and only if it is `100644`, correct the index with `git update-index --chmod=+x -- <path>`, then rerun the stage guard and the full supply-chain tooling suite.
- [ ] **Step 2: Install root ignore rules before staging.** Ignore `.worktrees/`, `.vscode/`, `**/.git/`, `**/.env*`, `**/.turbo/` while explicitly allowing reviewed `**/.env.example`, `**/.tools/`, `**/node_modules/`, `**/.next/`, `**/target/`, caches, local logs, backups, and raw reports. `git check-ignore -v` must identify each real local secret/cache path as ignored; do not rely on ignore rules alone as the stage guard.
- [ ] **Step 3: Generate deterministic local snapshot provenance.** Store the bootstrap root HEAD, included relative paths with SHA-256 hashes and expected Git modes (`100644`/`100755`), excluded-path categories/counts, and the review-manifest hash under `.worktrees/s001-t09-private-evidence/`, never in the staged tree. Do not include the old reference folder's path, source remote URLs, or prior repository ref IDs. Reject absolute paths, duplicate paths, unsupported modes, and mismatched file hashes. Any candidate tree change invalidates its file hashes and requires Tasks 1–2 refresh.
- [ ] **Step 4: Create the isolated candidate branch and stage by reviewed pathspec only.** Run `git switch -c migration/monorepo` from the bootstrap `main` only after Tasks 1–2 pass. Before staging, require `Test-Path -LiteralPath api/.git` and `Test-Path -LiteralPath web/.git` to both be false; if either is true, stop and materialize only reviewed allowlisted files into a clean destination worktree without copying `.git`, then repeat the review/hash checks. The current root `api/` and `web/` are candidate material, not evidence of this preflight passing. Use explicit `git add -- <approved-paths>` generated from the review manifest, never `git add .` or `git add -A`. Inspect `git diff --cached --name-status`, `git ls-files --stage` for mode `160000`, stage-size totals, sensitive extensions, `git diff --cached --check`, and the stage guard. Run a verified Gitleaks scan over the complete candidate/staged content; a finding or scanner failure stops the commit/push.
- [ ] **Step 5: Run clean-checkout baselines against the staged tree before the real commit.** After stage guard and secret scan PASS, run `git write-tree` and require a valid tree OID. Create an **unreferenced temporary commit object** with `git commit-tree <tree-oid> -p HEAD -m 'snapshot preflight only'` using task-scoped author/committer identity; do not update `main` or `migration/monorepo`. Add a detached worktree at a verified new path under ignored `.worktrees/` with `git worktree add --detach <path> <temporary-commit-oid>`. Confirm its `HEAD^{tree}` equals the staged tree OID, then run independent API Maven, API contracts, `api/infra` tests, web lint/build, and applicable security tests there. Remove only that exact disposable worktree with `git worktree remove <path>` after checking its resolved path lies under `.worktrees/`; keep the original index intact. A failed gate stops the real commit and push.
- [ ] **Step 6: Commit the reviewed snapshot.** Commit only the staged allowlist with `feat(migration): add reviewed API and web snapshots`. Verify `git ls-files` has no prohibited path or local-only evidence. Confirm the candidate commit descends only from this monorepo's bootstrap history; no source repository commits are fetched or merged. Root `main` may contain existing design/governance commits, but snapshot work remains on `migration/monorepo` until cutover.

### Task 4: Move API and web workflows to the GitHub root

**Files:**
- Create/modify: `.github/workflows/api-baseline.yml`, `.github/workflows/web-baseline.yml`, `.github/workflows/supply-chain.yml`, `.github/workflows/security-freshness.yml`
- Create: `scripts/migration/Test-MonorepoWorkflowContracts.mjs`
- Retire as active workflow locations: `api/.github/workflows/`, `web/.github/workflows/`

**Interfaces:** Consumes Task 3 snapshot. Produces rooted, immutable-SHA-pinned workflows with explicit `api/` and `web/` paths. This task does not claim hosted execution yet.

- [ ] **Step 1: Write RED workflow fixtures.** Reject workflows that remain only under nested `.github`, use mutable `uses:`, broad permissions, missing timeouts, PR path filters on required-check owner, wrong working directory, or artifact paths outside allowlisted evidence. Include API-only, web-only, contracts-only, docs-only, and mixed path scenarios.
- [ ] **Step 2: Move and adapt workflows.** Place active YAML at root `.github/workflows/`. Prefix API Maven, contract, CDK, Docker context, cache, and evidence paths with `api/`; point web npm commands and caches at `web/`. Keep `api/contracts/` canonical and existing tool/version/security contracts intact. Preserve `security-freshness` default-branch behavior; do not invoke `workflow_dispatch` as a Task 6 candidate-branch proof because GitHub requires the workflow file on default for that event.
- [ ] **Step 3: Preserve Cycle 6 separation.** `supply-chain-verification` proves machinery/evidence and can PASS when release policy is BLOCKED; `release-policy` remains separately visible and fails on BLOCKED. Do not add `continue-on-error`, bypass a scanner, or upload raw reports.
- [ ] **Step 4: Run contracts and local command rehearsal.** Parse all root workflows, run the new negative fixtures and existing API hosted-workflow contracts adapted for root paths, then run each workflow's shell command from a clean monorepo checkout. Recheck SHA pins, `contents: read` permissions, `persist-credentials: false`, timeouts, and 30-day sanitized artifact retention.
- [ ] **Step 5: Commit the workflow move only.** Stage root workflows, retirement of nested active copies, and their tests explicitly; commit `ci(migration): root independent monorepo workflows`.

### Task 5: Establish stable checks, ownership, and consumer compatibility

**Files:**
- Create: `.github/CODEOWNERS`
- Create: `.github/workflows/monorepo-verification.yml`
- Create: `scripts/migration/Test-MonorepoRequiredChecks.mjs`
- Modify: `api/contracts/README.md`
- Create or modify: `web/scripts/verify-api-contract.mjs`, `web/scripts/verify-api-contract.test.mjs`

**Interfaces:** Consumes Task 4 root workflows. Produces path-classified component jobs and an always-concluding required aggregate; web consumer validation reads `api/contracts/` within the same revision.

- [ ] **Step 1: Write RED path/aggregate fixtures.** API-only runs API; web-only runs web; `api/contracts/**` runs producer and consumer; docs-only permits both expensive jobs to skip; mixed runs both. Renames/deletes and `.github/**` changes fail closed to all applicable gates. A component `failure` (including timeout), `cancelled`, missing output, or unjustified `skipped` must fail the aggregate; `needs.<job>.result` is tested against only GitHub's `success`, `failure`, `cancelled`, and `skipped` values. Assert the `monorepo-required` job/check name appears in exactly one root workflow and no other workflow uses it. The aggregate job has `if: always()` and no workflow-level PR `paths` filter.
- [ ] **Step 2: Implement deterministic classification and aggregate.** The classifier reads changed paths from the PR base/head with full-history checkout, emits booleans for API, web, contracts, and shared CI, and treats unavailable diff data as all applicable. The aggregate consumes explicit job results; only non-applicable skipped jobs are accepted. Pin all external Actions to full reviewed SHAs.
- [ ] **Step 3: Write RED web-consumer fixtures.** Additive OpenAPI changes pass; malformed schema, removed/renamed endpoint used by web, incompatible response shape, or unavailable canonical registry fails. Use the existing API contract validator for producer validity and an explicit web usage fixture for consumer expectations; do not infer compatibility from successful TypeScript compile alone.
- [ ] **Step 4: Implement producer/consumer gate and ownership.** Web verification reads `api/contracts/` in the same checkout. CODEOWNERS uses `@AkaDNT` for `/api/**`, `/api/contracts/**`, `/api/infra/**`, `/web/**`, and `/.github/workflows/**`. Required automated checks stay mandatory; required approving reviews and Code Owner approval remain disabled for the sole-maintainer project.
- [ ] **Step 5: Verify and commit.** Run fixtures, API producer tests, web consumer tests, lint/build, and `git diff --check`; commit exact paths with `ci(migration): require stable monorepo and contract checks`.

### Task 6: Validate the public candidate on GitHub without cutover

**Files:**
- Create locally, never stage: `.worktrees/s001-t09-private-evidence/candidate-verification.md`
- No default-branch, source-repository, or branch-protection mutation yet

**Interfaces:** Consumes Tasks 1–5. Produces hosted run IDs, check names/conclusions, sanitized artifact checks, and rollback rehearsal evidence.

- [ ] **Step 1: Push `migration/monorepo` only after all local gates pass.** Derive it from the root bootstrap `main`; keep `main` default and non-canonical for API/web writes. Push with a non-force refspec to the public destination only after confirming its visibility and reviewing the entire pushed commit range for secrets, personal notes, local-only evidence, env files, backups, nested Git dirs, generated output, and raw reports. A clean current tree is insufficient if a prior commit in that range contains prohibited content.
- [ ] **Step 2: Test hosted PR/push behavior against the candidate branch.** Create disposable API-only, web-only, contract-only, docs-only, and mixed branches targeting `migration/monorepo`; record exact commits/run IDs and required-check conclusions. On a Linux runner with PowerShell 7, also run `api/scripts/supply-chain/Test-LinuxHostedPowerShellExecutable.ps1` and `Test-LinuxToolExecutablePermission.ps1`; a Windows `LINUX_TEST_REQUIRED` result is not a pass. Do not merge test branches. Task 6 uses PR/push events only, not `workflow_dispatch` on the non-default branch.
- [ ] **Step 3: Run negative hosted cases.** A controlled web consumer incompatibility and a controlled component failure must make the aggregate check fail. A docs-only PR must still conclude the required aggregate, never remain pending because of path filters.
- [ ] **Step 4: Inspect sanitized supply-chain evidence.** Require execution-integrity PASS when tooling succeeds, separate release-policy PASS/BLOCKED, validated artifact allowlist and 30-day retention, and no raw reports. `release-policy=BLOCKED` remains honest; do not change policy to make the candidate appear green.
- [ ] **Step 5: Rehearse rollback.** In a disposable branch, abandon the candidate and return to the unchanged bootstrap `main`; record the rollback commands/result and exact hosted evidence locally.
- [ ] **Step 6: Keep the candidate report private.** Save sanitized run identifiers/check conclusions under `.worktrees/s001-t09-private-evidence/`; do not stage or commit the personal verification report.

### Task 7: Execute the single-writer cutover and close the topology gate

**Files:**
- Modify: destination GitHub default branch/rulesets only during owner-approved cutover
- Modify only reviewed public project-governance files when necessary: `api/docs/DELIVERY_STATE.md`, `api/docs/sprints/SPRINT_001.md`, ADR-017/D-005; keep the detailed migration report local-only

**Interfaces:** Consumes a fully verified Task 6 candidate and owner go/no-go. Produces the public monorepo as the project's canonical repository; this task does not alter unrelated private repositories.

- [ ] **Step 1: Obtain explicit owner cutover approval.** Present the local snapshot inventory, file-stage and secret-scan results, local clean-checkout gates, hosted PR checks, exact required-check names, and rollback rehearsal. Missing evidence is NO-GO; this approval is distinct from approval of this plan.
- [ ] **Step 2: Freeze the candidate tree.** Confirm the reviewed `api/` and `web/` file hashes have not changed since hosted verification. If they changed, rerun affected local and hosted gates.
- [ ] **Step 3: Promote the candidate.** Promote the verified candidate to destination default `main` by reviewed fast-forward or branch/default change; no force-push. Configure required aggregate checks, least-privilege Actions, and solo-owner review settings. Keep normal merges closed.
- [ ] **Step 4: Verify protected default from a fresh clone.** Run independent API Maven, `api/contracts`, `api/infra`, web lint/build, consumer compatibility, supply-chain regression and artifact validation; run docs/API/web/contract/mixed PR check scenarios against the proposed default. If a gate fails, keep writes frozen and execute rollback.
- [ ] **Step 5: Open monorepo writes last.** Update contributor guidance, then enable normal merges in the destination after all gates pass.
- [ ] **Step 6: Record truthful completion evidence.** Update only public-safe ADR/matrix/Blueprint wording to describe the reviewed local snapshot; keep detailed inventory, run IDs, hashes, and recovery logs in local-only evidence. Preserve decision audit trail and close D-005 only after all exit evidence is reviewed. Do not claim release readiness when `release-policy=BLOCKED`.

### Task 8: Restore the prior topology if a cutover gate fails

**Files:**
- Modify: GitHub settings only in the approved rollback window
- Modify locally only: `.worktrees/s001-t09-private-evidence/candidate-verification.md`

**Interfaces:** Consumes a failed Task 7 gate. Restores the destination's bootstrap `main` as the working baseline and leaves the reviewed candidate branch available for diagnosis.

- [ ] **Step 1: Stop destination writes.** Freeze merges and retain the candidate branch for diagnosis; do not force-reset it.
- [ ] **Step 2: Verify the candidate remains isolated.** Confirm bootstrap `main` and the local reference copy remain unchanged; do not interact with other repository settings.
- [ ] **Step 3: Restore destination protections/settings.** Reapply the recorded destination default branch and required checks, then verify with disposable PRs before enabling normal work.
- [ ] **Step 4: Record any candidate-only work.** Keep failed candidate commits on the migration branch for diagnosis; map any later accepted changes explicitly before applying them to the project.

## Production Exit Gate

- [ ] The existing local reference copy remains unchanged and is not used as a Git or remote source.
- [ ] Every included snapshot path was reviewed, hashed, staged explicitly, secret-scanned, and built; excluded local material is absent from Git history.
- [ ] API, web, producer/consumer contracts, infrastructure, and supply-chain checks run independently from a clean monorepo checkout.
- [ ] Root workflows and stable required aggregate conclude correctly for API-only, web-only, contract-only, docs-only, mixed, and negative cases.
- [ ] Hosted evidence is sanitized; execution integrity and release policy remain distinct.
- [ ] The public monorepo's required checks, branch settings, and rollback path are verified.
- [ ] D-005 closes only with recorded proof; no AWS delivery or release-ready claim is inferred.

## External documentation used to pin behavior

- [GitHub Actions workflow location](https://docs.github.com/en/actions/get-started/quickstart).
- [Skipped required checks and path filtering](https://docs.github.com/en/enterprise-cloud@latest/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).
- [GitHub event/default-branch requirements](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).
- [GitHub Actions `needs` result values](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts).
- [Branch protection support for public repositories and unique job names](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
- [Git staged-index tree creation](https://git-scm.com/docs/git-write-tree) and [detached verification worktrees](https://git-scm.com/docs/git-worktree).
