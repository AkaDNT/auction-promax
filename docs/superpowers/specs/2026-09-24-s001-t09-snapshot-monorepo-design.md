# S001-T09 Snapshot Monorepo Migration Design

**Status:** Approved for replacement-plan preparation by the Project Owner

**Date:** 2026-09-24

**Owner:** AkaDNT, Project Owner / Repository Owner

## Intent and decision boundary

Create a public `AkaDNT/auction-promax` monorepo with `api/` and `web/` as independent build and release boundaries. Its Git history begins at the new repository's own commits. The current root `api/` and `web/` trees are the snapshot candidates. Preserve the existing local reference copy unchanged; no GitHub source repository or prior Git history is used as migration input. Keep previously committed design/plan documents, but do not add further personal working notes, private backup inventories, or local audit logs to public Git history.

The owner selected a current-tree API snapshot that includes existing modified and untracked work **only after each group is reviewed and verified**. This is not approval to stage every file. The web snapshot is taken from its reviewed current tree. The local-only inventory records the monorepo baseline plus included/excluded candidate paths and file hashes; it does not record or depend on private Git remotes or old source commit IDs.

This design changes the history-preserving implementation method in the existing T09 plan and the D-005 completion wording. It does not change ADR-017 / BD-007's approved `OPTION_A_MONOREPO`, independent API/web builds, contract governance, or required-check obligations. The old implementation plan must be marked superseded and replaced before source import. D-005 remains `OPEN` until the new exit gate is evidenced.

## Alternatives considered

1. **Selected: reviewed clean-tree snapshot.** New Git history is simple. The previous local copy remains available for manual reference but is not part of the migration or its provenance. The costs are split `git blame`/`git bisect` across the migration boundary and a local-tree-to-snapshot mapping.
2. **History-preserving subtree import.** Keeps original source commits reachable in the monorepo, but adds ref/collision/import complexity the single-owner project does not need. This was the previous T09 plan and is superseded only after this design and its replacement plan are approved.
3. **Unfiltered directory copy.** Fastest to type, but can commit `.env.local`, caches, generated output, worktrees, or unverified API changes. This is prohibited.

## Snapshot source authority

- The candidate source is the current root `api/` and `web/` tree. Review those files in place; do not copy files from the old reference directory during this migration.
- Preserve the existing local reference copy untouched. Do not read its Git remotes or use its history to establish migration provenance. A narrow, owner-approved read-only lookup of a referenced tree's file mode is allowed only when the candidate file's blob hash matches exactly; this metadata check does not make the reference repository or its history a migration input.
- No source GitHub repository or prior Git history is a migration input or is changed by this plan.
- The local-only inventory records the current monorepo HEAD, candidate path classification, exclusions, and hashes for reviewed non-secret files. Real environment files are excluded without reading or hashing their contents.

## Snapshot construction

1. Preserve the existing reference copy unchanged. Work only with the current root candidate trees in this repository. Do not restore nested `.git` directories under `api/` or `web/`.
2. Create a default-deny root `.gitignore` for `.worktrees/`, `.vscode/`, `.env*`, local tools, `node_modules/`, Maven `target/`, Next.js output, Turborepo `.turbo/`, caches, and private/generated reports. A reviewed example environment file may be explicitly permitted; real environment files never are.
3. Inventory all candidate paths before staging. Review the API's modified Gitleaks code/tests and vulnerability disposition schema as one security-change group, review its modified migration plan separately, and review each untracked plan. Do not include the superseded subtree plan as an approved executable plan in the snapshot.
4. Run the applicable API tests, web lint/build, contract and infrastructure baselines, plus a verified secret scan of the complete candidate tree. A failed or unavailable required gate stops the first snapshot commit or push; it is not silently waived.
5. Stage only reviewed source/doc paths by explicit pathspec. Record each included file's SHA-256 and expected Git mode (`100644` or `100755`) in the local-only snapshot manifest, then verify the staged index matches both. Inspect the staged name/status list, sizes, secret-sensitive extensions, generated outputs, and `git diff --cached --check` before the first commit. The initial commit includes only the accepted snapshot and repository governance files.

No `git add .` or broad recursive copy is used as a substitute for the reviewed manifest. Existing ignored local material is never staged into the candidate.

## Repository and CI topology

- Keep `api/contracts/` canonical for this migration. Keep API and web build/test/release/deployment boundaries independent.
- GitHub Actions workflows must live at root `.github/workflows/`. Nested source workflows are retained only as reviewed source material and are not assumed to execute after import.
- Required aggregate PR checks run for every PR, classify changed paths inside jobs, and fail when any applicable component fails or lacks an outcome. API-only, web-only, contract-only, docs-only, and mixed changes are tested.
- Contract changes must run API producer validation and web consumer compatibility verification in the same revision. Cycle 6 execution-integrity and release-policy outcomes remain separate; a policy `BLOCKED` is not relabeled as a scanner failure or release-ready PASS.
- External Actions remain immutable-SHA pinned, permissions least privilege, and uploaded evidence sanitized and allowlisted. No AWS publishing or deployment is introduced by topology migration.

## Cutover and rollback

Prepare and verify the candidate on a non-canonical branch while bootstrap `main` remains unchanged. Before changing the destination default branch or allowing normal monorepo writes, verify the local snapshot manifest, clean-checkout API/web/contract/infra builds, path-aware hosted PR checks, security evidence, and a rollback rehearsal.

Rollback before opening monorepo writes abandons the candidate branch and returns to the unchanged bootstrap `main`. The old reference directory remains untouched. Unrelated private repositories are not part of rollback.

## Exit evidence and non-claims

D-005 closes only after the reviewed local snapshot inventory, independent clean-checkout builds, producer/consumer compatibility, stable required checks, ownership settings, hosted evidence, cutover, and rollback rehearsal have all been recorded. A successful snapshot commit alone does not close T09 or D-005. A blocked release policy does not become PASS through this migration.

No source files, old Git refs, GitHub settings, or destination branch are changed by approving this design. The replacement implementation plan defines the exact commits and verification commands before execution.
