# ADR-017: Repository Topology and Contract Governance

- Status: APPROVED
- Date: 2026-09-24
- Owner: Project Owner / Repository Owner
- Approved by: AkaDNT (Project Owner / Repository Owner)
- Blueprint reference: Section 33, Phase 0; Section 34 topology and contract-governance obligations
- Related decisions: BD-006; DELIVERY_STATE D-005
- Related record: [S001-T09 decision matrix](../decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md)

## Context

The revised production blueprint names a monorepo as a Phase 0 deliverable and requires each service to build independently. The current project keeps API and web in separate Git repositories. The API repository contains the versioned contract registry and its compatibility gate. This ADR evaluates the topology choice and the governance evidence required for either option.

The existing approved [Phase 0 baseline](../decisions/PHASE_0_BASELINES.md) and [repository build baseline](../runbooks/BUILD_VERSION_BASELINE.md) remain in force. BD-006 approves separate API/web baseline workflows and the future ECR choice. Separate workflows can exist in a monorepo, so this ADR does not supersede BD-006. No AWS resource or deployment is part of this decision.

## Decision drivers

1. Meet the literal Blueprint §33 Phase 0 topology requirement, or record an explicit owner-approved exception.
2. Preserve independent build, test, ownership, and release boundaries for API, web, contracts, and infrastructure.
3. Make API/consumer contract changes reviewable and compatible before either side releases.
4. Give branch protection stable required checks that report a result even when path-aware jobs are skipped.
5. Preserve repository history and provide a tested rollback or recovery path for topology changes.
6. Avoid claiming CI, contract publication, or branch protection controls that have not been evidenced.

## Current-state evidence reviewed

The following evidence was inspected while preparing this proposal:

| Fact | Evidence reviewed | What it establishes | Limit |
| --- | --- | --- | --- |
| API and web have separate Git roots | API repository, branch `chore/s001-t07-cycle6-hosted-ci`, HEAD `8c295fc6af77f53194b97fc7af3e2cd99fa15448`; web repository, branch `main`, HEAD `f08e20fd07bbde6497a83b1f5510700a3fe3b919` | The checked-out repositories have separate Git metadata and histories. | These hashes are the evidence snapshot used to draft this ADR; they do not claim both are the latest remote commits. |
| API baseline is independently invoked | [API baseline workflow](../../.github/workflows/api-baseline.yml), [build baseline runbook](../runbooks/BUILD_VERSION_BASELINE.md) | The workflow has separate Maven, CDK toolchain, and contract-registry jobs. The runbook documents the API service build. | Workflow presence is configuration evidence. Historical hosted success is reported in DELIVERY_STATE; the hosted logs are private and were not independently inspected here. |
| Web baseline is independently invoked | Web repository `.github/workflows/web-baseline.yml`, `package.json`, and `.nvmrc` at web HEAD above | The workflow runs `npm ci`, lint, and production build using the pinned Node/npm baseline. | Workflow presence is configuration evidence. The first hosted pass is recorded as owner-confirmed in DELIVERY_STATE; its private run log was not independently inspected here. |
| API owns the current contract registry | [Contract registry README](../../contracts/README.md), API `contracts/` tree, and the API workflow's `verify-contract-registry` job | Contract formats, producer ownership, and compatibility checks are documented and wired into API CI. | No versioned publication and consumer pinning mechanism between the two repositories was found in this evidence review. |
| Web's current API contract integration is not demonstrated | Targeted search of the web application and package manifest found no generated/pinned API contract or contract CI gate. The auth HTTP client says runtime response validation should be added alongside each public API contract when the backend contract exists. | The inspected web baseline does not establish cross-repository contract compatibility. | This is a bounded source search, not a claim that no undocumented/manual process exists. |
| Workflow governance differs in the checked-in definitions | API baseline uses full commit SHAs for its Actions; the web baseline references `actions/checkout@v4` and `actions/setup-node@v4`. | The current workflow definitions are not equally pinned. | Branch-protection configuration for both baseline workflows was not available in the inspected files. |

The project state also records that API and web have separate baseline workflows and that D-005 remains `OPEN` in [DELIVERY_STATE](../DELIVERY_STATE.md). Those records report initial hosted passes on 2026-08-11 as owner-confirmed; run logs are private. This ADR treats that as recorded status, not independently inspected execution evidence.

## Options

### Option A — Migrate to the Blueprint monorepo

Move API and web into one Git repository while retaining clear directory ownership and independent build/test/deploy paths. Preserve Git history where practical, keep API and web baseline workflows separate, and retain a central versioned contract registry with explicit producer/consumer compatibility gates.

Required controls:

- A reviewed migration map for API, web, contracts, and infrastructure paths, including history-preservation approach and ownership boundaries.
- Independent clean-checkout build/test commands for the Identity service, web, contract registry, and CDK toolchain.
- Path-aware job selection may optimize work, but each required workflow must expose a stable aggregate status that reports success/failure when an inner job is skipped. Branch protection must require that stable status rather than a path-filtered job that may never report.
- CODEOWNERS or equivalent review ownership for service, web, contract, and infrastructure boundaries; protected default branch and documented required checks.
- Contract producer ownership, N/N-1 compatibility checks, and consumer validation before contract changes merge.
- A staged cutover and rollback plan: keep the old repositories read-only during the agreed transition, preserve known-good commit references, and define how to restore the prior remote/workflow/check configuration if migration validation fails.

**Cost and consequences:** Higher one-time migration, repository administration, workflow, and branch-protection work. A shared pull request can coordinate API and web contract changes atomically; path-aware CI and ownership rules add workflow complexity. The topology directly satisfies the blueprint once the move and independent-build evidence are complete.

**Rollback:** During cutover, retain old repository commit references and workflows, freeze writes after the chosen cutover point, and document a single authoritative write location. Roll back by restoring the old protected repositories and required checks; do not allow two writable sources of truth.

**Phase 0 evidence still required:** The monorepo exists; clean-checkout independent builds pass; contract registry ownership and compatibility gates pass; required checks and owners are configured; and the sample request/event trace remains reproducible after migration. ADR approval alone does not close the monorepo exit criterion.

### Option B — Approve a two-repository exception with equivalent governance

Keep API and web as separate Git repositories and explicitly except the literal monorepo deliverable in Blueprint §33. The API repository remains the single authoritative contract registry unless a later approved ADR changes that ownership. Both repositories must enforce a versioned producer/consumer contract process before this option can satisfy its substitute evidence gate.

Required controls:

- ADR approval must name the exact Blueprint §33 monorepo deliverable being excepted, the reason, the owner, and the evidence accepted in its place.
- Publish contract snapshots as immutable, versioned artifacts with a verifiable content digest and retained source revision. A moving branch reference is not a consumer pin.
- Web pins an explicit contract version and digest; its CI validates the pinned artifact and compatibility against its current use. API CI validates producer compatibility and the published artifact before release.
- Define a coordinated change sequence for additive and breaking changes, including compatibility window, rollback to a prior approved contract version, and ownership for an incompatible producer/consumer state.
- Configure and document required branch checks, CODEOWNERS or equivalent review responsibility, release ownership, artifact retention/access, and the process for updating consumers.
- Keep API, web, and contract builds independently reproducible from clean checkouts. The exception cannot stand in for this evidence.

**Cost and consequences:** Low one-time migration cost and continued repository autonomy. Ongoing coordination cost is higher: changes crossing the API/web boundary cannot merge atomically; publication, pin updates, and compatibility evidence must be maintained across repositories. The option does not satisfy the blueprint's literal monorepo wording and is acceptable only as an explicit, evidenced exception.

**Rollback:** Revert a consumer pin to the last compatible immutable contract version and roll forward the producer compatibly. Retain previous artifacts and source revisions. If publication or compatibility verification is unavailable, block the cross-repository release rather than silently using a mutable contract.

**Phase 0 substitute evidence still required:** Owner-approved exception text; one authoritative registry and named owner; immutable version/digest publication; a pinned web consumer; producer and consumer compatibility jobs that actually run in both repositories; independent clean-checkout builds; required checks and review ownership in both repositories; and a successful coordinated change/rollback exercise. ADR approval alone does not prove any of these controls are implemented.

## Comparison

| Dimension | Option A — monorepo | Option B — two-repository exception |
| --- | --- | --- |
| Blueprint alignment | Literal alignment after migration | Formal exception to the literal monorepo deliverable |
| Initial cost | Higher; migrate history, CI, ownership, and protections | Lower; keep current Git roots and add cross-repository governance |
| Ongoing coupling | Shared review surface; coordinated changes can be atomic | Higher release coordination; producer and consumer changes are separate |
| CI complexity | Multi-language/path-aware workflow with stable required aggregate checks | Contract publication and pin validation across two workflow systems |
| Contract rollback | Revert compatible files/commit in one repository under the protected workflow | Re-pin a previous immutable version/digest and verify producer compatibility |
| Exit evidence | Independent builds and checks in the migrated monorepo | Formal exception plus every substitute control listed under Option B |

## Recommendation

Recommend **Option A — Migrate to the Blueprint monorepo**. It meets the approved blueprint directly and allows coordinated API/web/contract changes in one review. Choose Option B only if the Product Owner / Project Owner determines that migration cost or organizational constraints outweigh the ongoing cross-repository coordination cost and explicitly accepts the deviation and evidence obligations above.

The Project Owner / Repository Owner approved `OPTION_A_MONOREPO` on 2026-09-24. The stable GitHub identity `AkaDNT`, verified against the configured API and web GitHub remotes, is the approver identity. This approves the topology direction and migration planning; it does not claim the migration is implemented or that the Phase 0 topology gate is closed.

## Decision requested

The approved topology choice is `OPTION_A_MONOREPO`; Option B was not selected. D-005 and the Phase 0 monorepo exit criterion remain open until migration, independent-build, contract-governance, and required-check evidence exists.

## Approval record

- Selected option: `OPTION_A_MONOREPO`
- Approver identity: `AkaDNT` (stable GitHub username, verified against configured API and web remotes)
- Role: Project Owner / Repository Owner
- Approval date: 2026-09-24
- Formal ADR status: `APPROVED`
- Rationale: The Phase 0 Blueprint explicitly requires a monorepo while preserving independent service buildability. The current two-repository layout has no documented ownership, security, or deployment constraint requiring separation. A monorepo supports atomic API/web/contract review while retaining independent builds and path-scoped CI. The two-repository alternative would require a Blueprint exception and additional immutable contract publication, consumer pinning, cross-repository compatibility, coordinated review, and rollback governance not currently implemented.

## Task 2 preparation log

**Date:** 2026-09-24
**Status:** Option A approved by the Project Owner / Repository Owner; migration is not implemented.

- Confirmed ADR-017 was absent from the API working tree and from its local `main` and `origin/main` refs before creating this draft. The remote was not fetched, so this does not claim the live default branch was checked during Task 2.
- Confirmed separate Git roots with read-only Git inspection: API `chore/s001-t07-cycle6-hosted-ci` at `8c295fc6af77f53194b97fc7af3e2cd99fa15448`; web `main` at `f08e20fd07bbde6497a83b1f5510700a3fe3b919`. Web working tree was clean; API has pre-existing unrelated dirty files documented in the task handoff.
- Reviewed the API Maven/CDK/contract workflow and build runbook, the web npm lint/build workflow and Node/npm manifests, the API contract-registry ownership text, and DELIVERY_STATE D-005. No cross-repository immutable publication, consumer pin, or two-sided contract compatibility gate was evidenced in the inspected files.
- Existing DELIVERY_STATE records owner-confirmed API/web hosted baseline passes from 2026-08-11; private logs were not independently reviewed. This proposal labels that distinction explicitly.
- Compared migration and exception options across cost, coupling, CI complexity, rollback, and Phase 0 proof obligations. The owner selected Option A for literal Blueprint §33 alignment; Option B was not selected.
- Ran `node .\scripts\decisions\Test-S001-T09-Decisions.mjs`: exit code `0`; all 29 matrix/ADR checks passed.
- At proposal time, resolved all 7 relative Markdown links in this ADR and verified the pre-approval state (`PROPOSED`, no BD-007, D-005 `OPEN`). After the owner approved Option A, updated ADR status and added BD-007 while leaving D-005 open. `git diff --check` returned `0`; the displayed LF/CRLF notices concern pre-existing dirty Cycle 4/5 files.
- Verified `AkaDNT` from both configured GitHub remotes and used it as the auditable single-owner approval identity; no legal name or independent approver was invented.
- Recorded approval of Option A and its rationale. D-005 remains `OPEN` because repository migration and its evidence remain outstanding.

## Implementation addendum — 2026-10-03

The approved Option A is now implemented as a reviewed current-tree snapshot in the public `AkaDNT/auction-promax` monorepo. This repository has its own bootstrap history; no prior source-repository Git ancestry was imported. Its canonical default is `migration/monorepo`, not `main`. Bootstrap `main` remains unchanged and locked as the cutover rollback reference. This dated update does not rewrite the historical option analysis above.

API and web built independently from a fresh checkout; producer contract, infrastructure, and supply-chain checks ran separately. Protected-default PRs exercised API-only, web-only, contract-only, docs-only, mixed, and deliberate component-failure cases. The required `monorepo-required` and `supply-chain-verification` checks concluded successfully on the first controlled default-branch governance merge. CODEOWNERS records ownership boundaries; zero required approving reviews and no Code Owner approval reflect the sole-maintainer Phase 0 setting.

The current producer-owned registry does not cover the product endpoints consumed by web. Web consumer compatibility is therefore `DEFERRED_NO_PRODUCER_CONTRACT` under the [Phase 0 addendum](../../../docs/superpowers/specs/2026-09-27-s001-t09-phase0-consumer-gate-addendum.md), accepted by the owner for this topology cutover only; it is not a compatibility PASS. Supply-chain execution integrity passed, while the separate `release-policy` remains `BLOCKED` and does not authorize release or deployment. D-005 stays open pending the owner's final review of the complete exit evidence. S001-T08 and the remaining S001-T09 decision gaps are separate obligations.
