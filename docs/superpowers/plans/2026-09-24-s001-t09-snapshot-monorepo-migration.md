# S001-T09 Snapshot Monorepo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a private, production-governed `AkaDNT/auction-promax` monorepo from reviewed API and web snapshots, without importing legacy Git ancestry, and prove independent builds, contract compatibility, hosted checks, backup recovery, and single-writer cutover.

**Architecture:** The new repository retains its own short Git history. `api/` and `web/` are independently built; `api/contracts/` remains the canonical contract registry. Two private legacy repositories plus verified off-machine archive/backup storage retain old history. Candidate work runs on `migration/monorepo` while bootstrap `main` remains default; cutover happens only after local and hosted gates pass.

**Tech Stack:** Git/GitHub Actions, PowerShell 7 and Windows PowerShell 5.1, Node.js 24.15.0/npm 11.12.1, Java 21/Maven Wrapper, existing API supply-chain scripts, Next.js 16.2.2.

**Spec:** `docs/superpowers/specs/2026-09-24-s001-t09-snapshot-monorepo-design.md`; ADR-017, BD-007, Blueprint Phase 0, and D-005 in the legacy API documentation.

**Review status:** AWAITING_OWNER_REVIEW. This plan supersedes the history-preserving `api/docs/superpowers/plans/2026-09-24-s001-t09-monorepo-migration.md` only after owner approval. Do not execute source import, remote pushes, or GitHub setting changes from this draft.

## Global Constraints

- Destination is the existing **private** `https://github.com/AkaDNT/auction-promax.git`; do not make it public during migration.
- Preserve old API/web commit history in the private source repositories and independently verified backup media. Do not import Git ancestry into the new repository, delete old repositories, or force-push source refs.
- The API backup copy contains local-only history through `21a7db42d18609838cfa866de65b0d36d62c2f7c`; preserve it on a private archive ref before treating that copy as disposable. Revalidate the exact ancestor chain and remote state at execution time.
- The final frozen ref inventory is captured **after** creating the private API archive ref. Before that push, record canonical default-branch heads separately as a pre-archive baseline; the expected archive addition alone does not count as unexpected canonical drift.
- Current modified/untracked API content is candidate material only. Review and test each group before explicit staging; never run `git add .` in the monorepo.
- Do not commit `.env*` with real values, credentials, `.worktrees/`, `.vscode/`, `.tools/`, `node_modules/`, `.next/`, Maven `target/`, scanner raw reports, logs, or backups.
- `api/contracts/` stays canonical; `api/infra/` is the actual infrastructure path. API and web retain independent build/test/release/deployment boundaries.
- Root `.github/workflows/` is the only active workflow directory. The workflow owning required aggregate checks has no PR-level path filter and always emits a conclusion, including docs-only PRs.
- Reserve `monorepo-required` as the single globally unique required aggregate job/check name across all root workflows. If merge queue is later enabled, add and test `merge_group` before requiring that check for merge-queue events.
- Keep Cycle 6 execution-integrity and release-policy results separate; `POLICY_BLOCKED` is not an implementation failure or a release-ready claim.
- No AWS/ECR/Inspector delivery, OIDC role, application signing, or deployment is introduced here.
- D-005 remains OPEN until the exit evidence is complete. The first snapshot commit is not completion evidence by itself.

## Review Focus

- A source ref advances between inventory, archive, and snapshot: reject the stale manifest, refresh it, and rerun affected gates (Tasks 1–3 tests).
- A nested `.git`, environment file, cache, build output, or raw report appears in the candidate: stage-allowlist test must reject it before any push (Task 3).
- A local-only API commit is absent from the private archive or the backup cannot restore: stop cutover, even if current source files build (Task 1).
- Private destination cannot enforce branch protection/rulesets and required checks under the owner's GitHub plan: stop before candidate push/cutover and request an owner decision (Task 1).
- A physical nested `.git` or staged index mode `160000` is present: stop before snapshot commit; ignore rules alone are insufficient (Task 3).
- A required component is skipped or fails while an aggregate check reports success: negative workflow fixtures must fail closed (Task 5).
- A contract-only change passes producer validation but breaks web usage: consumer fixture and hosted contract PR must fail (Tasks 5–6).

---

### Task 1: Freeze provenance and preserve local-only source history

**Files:**
- Create: `docs/migrations/s001-t09-snapshot-source-inventory.md`
- Create: `docs/migrations/s001-t09-snapshot-backup-manifest.json`
- Create: `scripts/migration/Test-SnapshotBackupManifest.mjs`
- Read only: legacy `D:\projects\auction-promax - Copy\api\.git`, `D:\projects\auction-promax - Copy\web\.git`

**Interfaces:** Consumes approved design and the owner's choice to use a private API archive branch. Produces frozen source commit/ref identifiers, verified backup hashes, and a recoverable local-only API archive. No candidate source files are staged.

- [ ] **Step 1: Write RED backup-manifest fixtures.** The Node test accepts exactly `schemaVersion:1`, `sources.api` and `sources.web`, HTTPS repository URLs without credentials, 40-hex frozen heads, ref arrays with `name/objectId`, `archiveRef` for API, `bundleSha256` (64 hex), and `lfsState` (`NO_LFS` or `VERIFIED`). Reject missing web, duplicate refs, empty/placeholder hashes, absolute local paths, and unexpected fields. Run `node scripts/migration/Test-SnapshotBackupManifest.mjs`; require failure before validator implementation, then PASS after it.
- [ ] **Step 2: Record pre-archive refs and check destination capability.** Record `git ls-remote --symref <source-url> HEAD` and `git ls-remote <source-url> 'refs/heads/*' 'refs/tags/*'` for both private sources, including their canonical default-branch OIDs; from each backup Git directory record `git status --short`, `git show-ref`, `git rev-parse HEAD`, `git rev-parse --is-shallow-repository`, and `git lfs env` availability. This is a pre-archive comparison baseline, not the final freeze. If the backup API HEAD is not `21a7db42d18609838cfa866de65b0d36d62c2f7c`, stop and reconcile. Verify read-only, through GitHub settings or API, that the private destination can configure branch protection/rulesets **and required status checks** under the owner's account plan; record `SUPPORTED` or `UNAVAILABLE` without exposing account details. `UNAVAILABLE` is a no-go requiring an explicit owner decision, not permission to omit required checks.
- [ ] **Step 3: Preserve the seven local-only API commits off-machine.** In the legacy API backup checkout, verify `git merge-base --is-ancestor b201a2d5d9d13e095a132f57e930dab3e9118888 21a7db42d18609838cfa866de65b0d36d62c2f7c` and count/review `git log --oneline <remote-feature-head>..21a7db42d18609838cfa866de65b0d36d62c2f7c`. Scan commit contents for secrets using verified Gitleaks before upload. Push only the explicit immutable source commit to a new private ref `refs/heads/archive/s001-t09-api-local-20260924` using a non-force refspec; first assert that ref is absent remotely. Re-read it with `git ls-remote`, require exact OID equality, and record the result. If the ref already exists with a different OID, stop; do not force-push.
- [ ] **Step 4: Re-freeze the final source refs after the archive push.** Capture `git ls-remote --symref <source-url> HEAD` plus `git ls-remote <source-url> 'refs/heads/*' 'refs/tags/*'` for both private sources. Diff against Step 2's complete pre-archive ref inventory: the **only** permitted delta is the new API archive ref at `21a7db42d18609838cfa866de65b0d36d62c2f7c`; default heads and every other branch/tag must be unchanged. This final inventory is the single authority consumed by mirror/bundle backups and the snapshot manifest. If any other ref advanced, stop and reconcile/re-freeze before proceeding.
- [ ] **Step 5: Back up complete old histories.** Create `git clone --mirror` copies and `git bundle create ... --all` for both sources in owner-controlled storage outside the monorepo. For each mirror run `git fsck --full --strict`; in disposable clones run `git bundle verify`, compare every final frozen ref (including the API archive), and verify both frozen default HEAD objects. Hash each bundle with SHA-256. If LFS is enabled, clone a non-bare working tree from the verified mirror for Git refs, add a dedicated `source-lfs` remote using the exact frozen original GitHub source URL, run `git lfs fetch --all source-lfs`, and verify LFS pointers/objects for every inventoried commit/ref. Archive/checksum the actual local LFS media directory separately; restore it into a disposable clone with LFS network access disabled and rerun per-ref verification. Never assume the local mirror's `origin` supplies LFS payloads; a Git bundle does not back up LFS payloads.
- [ ] **Step 6: Record recovery proof.** Restore both bundles into disposable directories, verify the archived API commit and frozen web commit, compare refs, and record `PASS` plus counts/hashes in the sanitized manifest. No absolute workstation path or credential appears in committed evidence. Do not proceed if a backup, LFS payload, or private archive cannot be recovered.
- [ ] **Step 7: Commit only inventory/validator evidence.** Run the validator, `git diff --check`, inspect exact staged names, and commit the three Task 1 paths with `docs(migration): freeze snapshot sources and backups`. Do not stage `api/` or `web/` yet.

### Task 2: Classify and verify the candidate source trees

**Files:**
- Create: `docs/migrations/s001-t09-snapshot-file-review.md`
- Create: `scripts/migration/Test-SnapshotFileReview.mjs`
- Read only: `api/`, `web/`, and the legacy source status/history

**Interfaces:** Consumes Task 1 frozen provenance. Produces an explicit included/excluded path review and local test results; no root source snapshot commit yet.

- [ ] **Step 1: Write RED review-manifest tests.** Require every candidate top-level path to be classified `INCLUDE` or `EXCLUDE` with reason and reviewer, and every included modified/untracked API path to belong to an explicit group. Reject an unclassified path, `.git`, `.env.local`, caches, `node_modules`, `.next`, `target`, raw reports, or an included file absent from disk. Run `node scripts/migration/Test-SnapshotFileReview.mjs`; require RED then GREEN.
- [ ] **Step 2: Review API changes by group.** Compare current `api/` files against the frozen API commit using the legacy backup tree plus a read-only file inventory. Review Gitleaks module/runner/tests and vulnerability disposition schema together; run their existing `api/scripts/supply-chain/Test-GitleaksScanning.ps1`, `Test-GitleaksWorkingTreeSnapshot.ps1`, and `Test-VulnerabilityDispositionSchema.mjs`. Review unrelated API changes individually; a failing test or unclear intent stops that group rather than silently including it.
- [ ] **Step 3: Review web snapshot.** Compare `web/` with the frozen web commit, classify every changed/untracked file, run `npm --prefix web ci`, `npm --prefix web run lint`, and `npm --prefix web run build` under Node `24.15.0`/npm `11.12.1`. Do not include local environment files or generated output.
- [ ] **Step 4: Review legacy migration documentation separately.** The old subtree plan contradicts the approved snapshot design. Keep its original in the legacy backup and exclude that exact path from the candidate snapshot, recording the exclusion in the file-review manifest. Do not ship it as `APPROVED_FOR_EXECUTION` beside the new plan.
- [ ] **Step 5: Confirm full candidate testability.** Run API Maven Wrapper build/tests, API contract tests, infrastructure tests, web lint/build, and current supply-chain regression suites from their actual directories. Record command, exit code, and sanitized result for each group. If a required gate is unavailable, classify the snapshot `BLOCKED`, not PASS.
- [ ] **Step 6: Commit only the review evidence.** Validate the file-review document and commit its exact paths with `docs(migration): review API and web snapshot files`. The review document lists paths/hashes/counts, never environment values or source secrets.

### Task 3: Build the default-deny snapshot locally

**Files:**
- Create: `.gitignore`
- Create: `docs/migrations/s001-t09-snapshot-manifest.json`
- Create: `scripts/migration/Test-SnapshotStage.mjs`
- Stage selectively: reviewed `api/`, `web/`, root governance files

**Interfaces:** Consumes the Task 2 allowlist and frozen commits. Produces a root Git commit with reviewed current trees but no legacy ancestry or local-only material.

- [ ] **Step 1: Write RED stage-guard tests.** Test a staged `.env.local`, physical nested `api/.git` or `web/.git`, staged gitlink/submodule mode `160000`, `.worktrees`, `.vscode`, `.tools`, `node_modules`, `.next`, `target`, scanner raw JSON, and unexpectedly large binary; each must cause a nonzero exit. Test a reviewed source file and `.env.example` exception to pass. Implement `Test-SnapshotStage.mjs` to read `git diff --cached --name-only -z` and `git ls-files --stage -z`, reject any index entry with mode `160000`, inspect staged blobs with `git cat-file`, and compare every staged source path to the Task 2 allowlist and SHA-256 manifest.
- [ ] **Step 2: Install root ignore rules before staging.** Ignore `.worktrees/`, `.vscode/`, `**/.git/`, `**/.env*` while explicitly allowing reviewed `**/.env.example`, `**/.tools/`, `**/node_modules/`, `**/.next/`, `**/target/`, caches, local logs, backups, and raw reports. `git check-ignore -v` must identify each real local secret/cache path as ignored; do not rely on ignore rules alone as the stage guard.
- [ ] **Step 3: Generate deterministic snapshot provenance.** Store source URLs, frozen API/web commit IDs, private API archive ref, included relative paths with SHA-256 hashes, excluded-path categories/counts, and the review-manifest hash. Reject absolute paths, credentials, duplicate paths, and mismatched file hashes. Recheck remote refs; changed source refs invalidate this snapshot and require Task 1 refresh.
- [ ] **Step 4: Create the isolated candidate branch and stage by reviewed pathspec only.** Run `git switch -c migration/monorepo` from the bootstrap `main` only after Tasks 1–2 pass. Before staging, require `Test-Path -LiteralPath api/.git` and `Test-Path -LiteralPath web/.git` to both be false; if either is true, stop and materialize only reviewed allowlisted files into a clean destination worktree without copying `.git`, then repeat the review/hash checks. The current root `api/` and `web/` are candidate material, not evidence of this preflight passing. Use explicit `git add -- <approved-paths>` generated from the review manifest, never `git add .` or `git add -A`. Inspect `git diff --cached --name-status`, `git ls-files --stage` for mode `160000`, stage-size totals, sensitive extensions, `git diff --cached --check`, and the stage guard. Run a verified Gitleaks scan over the complete candidate/staged content; a finding or scanner failure stops the commit/push.
- [ ] **Step 5: Run clean-checkout baselines against the staged tree before the real commit.** After stage guard and secret scan PASS, run `git write-tree` and require a valid tree OID. Create an **unreferenced temporary commit object** with `git commit-tree <tree-oid> -p HEAD -m 'snapshot preflight only'` using task-scoped author/committer identity; do not update `main` or `migration/monorepo`. Add a detached worktree at a verified new path under ignored `.worktrees/` with `git worktree add --detach <path> <temporary-commit-oid>`. Confirm its `HEAD^{tree}` equals the staged tree OID, then run independent API Maven, API contracts, `api/infra` tests, web lint/build, and applicable security tests there. Remove only that exact disposable worktree with `git worktree remove <path>` after checking its resolved path lies under `.worktrees/`; keep the original index intact. A failed gate stops the real commit and push.
- [ ] **Step 6: Commit the reviewed snapshot.** Commit only the staged allowlist with `feat(migration): add reviewed API and web snapshots`. Verify `git ls-files` has no prohibited path and `git cat-file` shows no legacy source head as an ancestor. Root `main` may contain design/governance commits, but source migration work remains on `migration/monorepo` until cutover.

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

### Task 6: Validate the private candidate on GitHub without cutover

**Files:**
- Create: `docs/migrations/s001-t09-candidate-verification.md`
- No default-branch, source-repository, or branch-protection mutation yet

**Interfaces:** Consumes Tasks 1–5. Produces hosted run IDs, check names/conclusions, sanitized artifact checks, and rollback rehearsal evidence.

- [ ] **Step 1: Push `migration/monorepo` only after all local gates pass.** Derive it from the root bootstrap `main`; keep `main` default and non-canonical for API/web writes. Push with a non-force refspec to the private destination. Before push, confirm no committed env file, backup, nested Git dir, generated output, or raw report exists.
- [ ] **Step 2: Test hosted PR/push behavior against the candidate branch.** Create disposable API-only, web-only, contract-only, docs-only, and mixed branches targeting `migration/monorepo`; record exact commits/run IDs and required-check conclusions. Do not merge test branches. Task 6 uses PR/push events only, not `workflow_dispatch` on the non-default branch.
- [ ] **Step 3: Run negative hosted cases.** A controlled web consumer incompatibility and a controlled component failure must make the aggregate check fail. A docs-only PR must still conclude the required aggregate, never remain pending because of path filters.
- [ ] **Step 4: Inspect sanitized supply-chain evidence.** Require execution-integrity PASS when tooling succeeds, separate release-policy PASS/BLOCKED, validated artifact allowlist and 30-day retention, and no raw reports. `release-policy=BLOCKED` remains honest; do not change policy to make the candidate appear green.
- [ ] **Step 5: Rehearse rollback.** In a disposable branch, abandon the candidate and prove both legacy source refs and backups remain recoverable without changing their state. Record the rollback commands/result and exact hosted evidence in the report.
- [ ] **Step 6: Commit the candidate report.** Commit only sanitized run identifiers/check conclusions and backup verification references with `docs(migration): record hosted candidate evidence`.

### Task 7: Execute the single-writer cutover and close the topology gate

**Files:**
- Modify: destination GitHub default branch/rulesets and legacy source write settings only during owner-approved cutover
- Modify: `api/docs/DELIVERY_STATE.md`, `api/docs/sprints/SPRINT_001.md`, ADR-017/D-005 evidence, root migration report

**Interfaces:** Consumes a fully verified Task 6 candidate and owner go/no-go. Produces one canonical writable monorepo with recoverable read-only legacy sources.

- [ ] **Step 1: Obtain explicit owner cutover approval.** Present source frozen heads, archive ref, bundle/LFS restore results, file-stage and secret-scan results, local clean-checkout gates, hosted PR checks, exact required-check names, and rollback rehearsal. Missing evidence is NO-GO; this approval is distinct from approval of this plan.
- [ ] **Step 2: Freeze and reconcile source writes.** Read both source remote heads again. If either advanced, refresh the inventory/backups/snapshot and rerun affected candidate checks. Freeze both legacy repositories only after final refs and recovery media are verified.
- [ ] **Step 3: Promote candidate without dual writers.** While writes remain frozen, promote the verified candidate to destination default `main` by reviewed fast-forward or branch/default change; no force-push. Configure required aggregate checks, least-privilege Actions, and solo-owner review settings. Keep normal merges closed.
- [ ] **Step 4: Verify protected default from a fresh clone.** Run independent API Maven, `api/contracts`, `api/infra`, web lint/build, consumer compatibility, supply-chain regression and artifact validation; run docs/API/web/contract/mixed PR check scenarios against the proposed default. If a gate fails, keep writes frozen and execute rollback.
- [ ] **Step 5: Open monorepo writes last.** Update contributor/remotes guidance and archive notices, then enable normal merges only in the destination. Keep legacy API/web private and read-only. Confirm there is one writable canonical source topology.
- [ ] **Step 6: Record truthful completion evidence.** Update ADR/matrix/Blueprint wording from preserved-in-monorepo history to snapshot plus verified private legacy archive, preserve decision audit trail, and close D-005 only after all exit evidence is reviewed. Do not claim release readiness when `release-policy=BLOCKED`.

### Task 8: Restore the prior topology if a cutover gate fails

**Files:**
- Modify: GitHub settings only in the approved rollback window
- Modify: `docs/migrations/s001-t09-candidate-verification.md`

**Interfaces:** Consumes a failed Task 7 gate. Produces the previous API/web topology as the sole writable authority, without discarding candidate or old history.

- [ ] **Step 1: Stop destination writes.** Freeze merges and retain the candidate branch for diagnosis; do not force-reset it.
- [ ] **Step 2: Verify recovery material.** Compare source refs, API archive OID, bundle hashes, and LFS restore proof with Task 1 manifest. If any mismatch appears, stop before reopening writes.
- [ ] **Step 3: Restore prior source protections/settings.** Reapply recorded default branches and required checks, verify with disposable PRs, then reopen legacy API/web writes only after destination remains frozen.
- [ ] **Step 4: Map any monorepo-only work explicitly.** If a post-cutover commit exists, review and split it deliberately across API/web; do not assume automatic reverse import. Record the mapping and rerun affected checks before declaring recovery complete.

## Production Exit Gate

- [ ] API local-only commits are recoverable from an exact private archive ref and independently verified bundle; both legacy histories and any LFS payloads restore.
- [ ] Every included snapshot path was reviewed, hashed, staged explicitly, secret-scanned, and built; excluded local material is absent from Git history.
- [ ] API, web, producer/consumer contracts, infrastructure, and supply-chain checks run independently from a clean monorepo checkout.
- [ ] Root workflows and stable required aggregate conclude correctly for API-only, web-only, contract-only, docs-only, mixed, and negative cases.
- [ ] Hosted evidence is sanitized; execution integrity and release policy remain distinct.
- [ ] Exactly one canonical writable topology exists after cutover; source repos remain private/read-only and rollback has been rehearsed.
- [ ] D-005 closes only with recorded proof; no AWS delivery or release-ready claim is inferred.

## External documentation used to pin behavior

- [Git bundle: creation and verification](https://git-scm.com/docs/git-bundle).
- [GitHub Actions workflow location](https://docs.github.com/en/actions/get-started/quickstart).
- [Skipped required checks and path filtering](https://docs.github.com/en/enterprise-cloud@latest/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks).
- [GitHub event/default-branch requirements](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).
- [GitHub Actions `needs` result values](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts).
- [Private-repository branch-protection availability and unique job names](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
- [Git staged-index tree creation](https://git-scm.com/docs/git-write-tree) and [detached verification worktrees](https://git-scm.com/docs/git-worktree).
