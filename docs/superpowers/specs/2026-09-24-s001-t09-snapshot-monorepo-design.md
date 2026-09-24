# S001-T09 Snapshot Monorepo Migration Design

**Status:** Proposed for Project Owner review

**Date:** 2026-09-24

**Owner:** AkaDNT, Project Owner / Repository Owner

## Intent and decision boundary

Create a new private `AkaDNT/auction-promax` monorepo with `api/` and `web/` as independent build and release boundaries. Its Git history begins at the new repository's own commits. The two legacy private repositories and verified owner-controlled backups retain pre-migration Git history; old commit objects are not imported into the new repository.

The owner selected a current-tree API snapshot that includes existing modified and untracked work **only after each group is reviewed and verified**. This is not approval to stage every file. The web snapshot is taken from its reviewed current tree. Both snapshots need a manifest of exact source refs, source commit IDs, included/excluded paths, and file hashes so the initial monorepo state can be audited without rewriting or importing legacy history.

This design changes the history-preserving implementation method in the existing T09 plan and the D-005 completion wording. It does not change ADR-017 / BD-007's approved `OPTION_A_MONOREPO`, independent API/web builds, contract governance, or required-check obligations. The old implementation plan must be marked superseded and replaced before source import. D-005 remains `OPEN` until the new exit gate is evidenced.

## Alternatives considered

1. **Selected: reviewed clean-tree snapshot.** New Git history is simple, while verified legacy repositories/bundles preserve old history separately. The costs are split `git blame`/`git bisect` across the migration boundary and an explicit source-to-snapshot mapping.
2. **History-preserving subtree import.** Keeps original source commits reachable in the monorepo, but adds ref/collision/import complexity the single-owner project does not need. This was the previous T09 plan and is superseded only after this design and its replacement plan are approved.
3. **Unfiltered directory copy.** Fastest to type, but can commit `.env.local`, caches, generated output, worktrees, or unverified API changes. This is prohibited.

## Source and backup authority

- The legacy API and web GitHub repositories remain private and unchanged during candidate preparation. They are never deleted or force-rewritten as part of this migration.
- The owner-controlled legacy backup copy currently contains both legacy `.git` directories. The API copy retains local commit `b201a2d5d9d13e095a132f57e930dab3e9118888` and Task 1 inventory commit `21a7db42d18609838cfa866de65b0d36d62c2f7c`; those objects are not in the new Git repository. The local-only commits must be included in a verified, separately stored Git bundle or an explicit private archive ref before the old checkout is treated as disposable. A same-disk copy alone is not a disaster-recovery backup.
- Re-read both source remote refs before backup, snapshot, and cutover. A changed ref invalidates the affected source manifest and verification evidence. Preserve complete legacy refs and any LFS objects in verified backups; keeping the GitHub repositories accessible is additional protection, not the only backup.
- The new monorepo commit records source repository identities and exact source commit IDs as provenance metadata, but has no Git ancestry connection to either source.

## Snapshot construction

1. Preserve the original source trees and backup copy. Work only in the new repository. Do not restore nested `.git` directories under `api/` or `web/` in the new repository.
2. Create a default-deny root `.gitignore` for `.worktrees/`, `.vscode/`, `.env*`, local tools, `node_modules/`, Maven `target/`, Next.js output, caches, and private/generated reports. A reviewed example environment file may be explicitly permitted; real environment files never are.
3. Inventory all candidate paths before staging. Review the API's modified Gitleaks code/tests and vulnerability disposition schema as one security-change group, review its modified migration plan separately, and review each untracked plan. Do not import the old subtree plan as an approved executable plan: replace it with the snapshot implementation plan, while retaining the old plan in the legacy backup.
4. Run the applicable API tests, web lint/build, contract and infrastructure baselines, plus a verified secret scan of the complete candidate tree. A failed or unavailable required gate stops the first snapshot commit or push; it is not silently waived.
5. Stage only reviewed source/doc paths by explicit pathspec. Inspect the staged name/status list, sizes, secret-sensitive extensions, generated outputs, and `git diff --cached --check` before the first commit. The initial commit includes only the accepted snapshot and repository governance files.

No `git add .` or broad recursive copy is used as a substitute for the reviewed manifest. Existing ignored local material is never copied from the backup into the candidate.

## Repository and CI topology

- Keep `api/contracts/` canonical for this migration. Keep API and web build/test/release/deployment boundaries independent.
- GitHub Actions workflows must live at root `.github/workflows/`. Nested source workflows are retained only as reviewed source material and are not assumed to execute after import.
- Required aggregate PR checks run for every PR, classify changed paths inside jobs, and fail when any applicable component fails or lacks an outcome. API-only, web-only, contract-only, docs-only, and mixed changes are tested.
- Contract changes must run API producer validation and web consumer compatibility verification in the same revision. Cycle 6 execution-integrity and release-policy outcomes remain separate; a policy `BLOCKED` is not relabeled as a scanner failure or release-ready PASS.
- External Actions remain immutable-SHA pinned, permissions least privilege, and uploaded evidence sanitized and allowlisted. No AWS publishing or deployment is introduced by topology migration.

## Cutover and rollback

Prepare and verify the candidate on a non-canonical branch while the legacy topology remains authoritative. Before changing the destination default branch or allowing normal monorepo writes, verify source backups, snapshot manifest, clean-checkout API/web/contract/infra builds, path-aware hosted PR checks, security evidence, and a rollback rehearsal. Do not make both the legacy topology and the monorepo writable canonical sources at once.

Rollback before opening monorepo writes abandons the candidate and keeps the two legacy repositories authoritative. If any monorepo-only commit is made after cutover, review and map it explicitly before restoring legacy writes; do not assume it can be split automatically across API/web. The legacy repositories remain private and recoverable, and the verified backups retain local-only source history.

## Exit evidence and non-claims

D-005 closes only after the new snapshot's provenance manifest, legacy-history backup/restore test, independent clean-checkout builds, producer/consumer compatibility, stable required checks, ownership settings, hosted evidence, single-writer cutover, and rollback rehearsal have all been recorded. A successful snapshot commit alone does not close T09 or D-005. A blocked release policy does not become PASS through this migration.

No source files, old Git refs, GitHub settings, or destination branch are changed by approving this design. The replacement implementation plan defines the exact commits and verification commands before execution.
