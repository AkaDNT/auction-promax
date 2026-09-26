# S001-T09 Blueprint Decision Delta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trace all 20 revised-blueprint mandatory architecture decisions to approved ADRs, obtain an explicit repository-topology decision, and record narrowly scoped missing decisions without claiming implementation of later AWS work.

**Architecture:** A machine-checked traceability matrix is the index from blueprint item to decision record. Existing ADR-001 through ADR-016 remain immutable historical decisions; new records begin as `PROPOSED` and become `APPROVED` only after Product Owner / Project Owner review. The topology decision is separate because it changes Phase 0 repository governance and could require a migration or an approved exception.

**Tech Stack:** Markdown ADRs, Node.js built-in filesystem APIs, Git, repository-owned sprint and delivery-state documents.

**Spec:** `docs/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap.md` section 34 (20 Mandatory ADRs) and Phase 0 exit in section 33; `docs/sprints/SPRINT_001.md` S001-T09; `docs/decisions/PHASE_0_BASELINES.md` Approval Workflow; `docs/decisions/BUSINESS_DECISIONS.md` BD-001/BD-004/BD-006.

## Global Constraints

- The approved blueprint is the architecture source of truth. A two-repository option is a proposed exception until explicitly approved; it cannot be described as satisfying the blueprint's literal monorepo requirement.
- ADR-001 through ADR-016 and the Phase 0 baseline are approved. Never edit their historical decision text to erase a conflict; a new ADR must name any refinement or supersession.
- The API repository currently owns `contracts/` and its compatibility gate. The web is a separate Git repository with its own build workflow. Do not infer cross-repository verification or independent-service build proof from a proposal.
- T07 hosted CI proved execution integrity `PASS` and release policy `BLOCKED`; neither result proves ECR, Inspector, image signing, deployment, or platform security.
- New AWS/platform records are architecture decisions only. Do not provision accounts, request OIDC roles, deploy CDK, publish images, change scanner dispositions, or modify service/business code in T09.
- No ADR may move from `PROPOSED` to `APPROVED` without a named Product Owner / Project Owner and dated approval evidence.
- Preserve unrelated dirty Cycle 4/5 files and the uncommitted T08 plan. Stage T09 paths explicitly.

## Candidate Mapping to Verify

The table below is a starting hypothesis, not an approval. Task 1 checks the actual decision wording and marks a row `COVERED`, `PARTIAL`, or `GAP` with a direct link.

| Blueprint section 34 item | Subject | Candidate existing ADR | Delta if not covered |
| ---: | --- | --- | --- |
| 1 | Coarse-grained microservices | ADR-001 | — |
| 2 | Java 21 / Spring Boot | ADR-002 | — |
| 3 | Hexagonal service architecture | none | dedicated delta ADR |
| 4 | Cognito credentials / app roles | ADR-003 | — |
| 5 | PostgreSQL ownership | ADR-004 and ADR-016 | — |
| 6 | Transaction Core financial ownership | ADR-005 | — |
| 7 | ECS core services | ADR-010 | verify long-running boundary |
| 8 | Lambda supporting workloads only | none | dedicated delta ADR |
| 9 | DynamoDB approved workloads | ADR-006 | — |
| 10 | Valkey ephemeral | ADR-007 | — |
| 11 | Outbox / EventBridge / SQS | ADR-008 | — |
| 12 | EventBridge Scheduler | ADR-009 | — |
| 13 | Step Functions long-running orchestration | none | dedicated delta ADR |
| 14 | AppConfig rollout | none | dedicated delta ADR |
| 15 | KMS / security baseline | none | dedicated delta ADR |
| 16 | PostgreSQL search / OpenSearch trigger | ADR-013 | — |
| 17 | EventBridge/SQS / MSK trigger | ADR-014 | — |
| 18 | Multi-account governance | none | dedicated delta ADR |
| 19 | Immutable digest / blue-green rollout | none | dedicated delta ADR |
| 20 | Backup / restore / fault testing | none | dedicated delta ADR |

## Review Focus

- A matrix row linked to an ADR that merely mentions an AWS service must not count as a binding decision; Task 1 tests `PARTIAL` and requires a delta.
- A future implementation or a `PROPOSED` ADR must not be presented as approved Phase 0 evidence; Tasks 1, 3, and 4 enforce status separation.
- The topology ADR must name exactly one selected direction and its build/contract-governance obligations; Task 2 rejects an unresolved choice at approval time.
- A two-repository exception cannot silently satisfy the literal monorepo exit criterion; Tasks 2 and 4 keep the Phase 0 gate open until the owner resolves and evidences the exception or migration.
- A new delta must not supersede ADR-001 through ADR-016 by implication; Task 3 requires explicit `Refines` or `Supersedes` metadata where applicable.

---

### Task 1: Build and validate the 20-row decision traceability matrix

**Files:**
- Create: `docs/decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md`
- Create: `scripts/decisions/Test-S001-T09-Decisions.mjs`
- Verify: `docs/adr/ADR-001-*.md` through `docs/adr/ADR-016-*.md`, blueprint section 34

**Interfaces:**
- Consumes: blueprint items 1–20 and approved ADR metadata.
- Produces: exactly 20 numbered rows with blueprint requirement, direct relative ADR link(s), coverage state, decision status, phase of implementation, and remaining proof obligation.

- [ ] **Step 1: Freeze the blueprint inventory.** Transcribe the exact 20 numbered subjects from section 34 into a test fixture within `Test-S001-T09-Decisions.mjs`. Detect missing, duplicate, reordered, or extra item numbers. Confirm ADR-001 through ADR-016 files exist and carry `Status: APPROVED`.
- [ ] **Step 2: Write RED matrix tests.** The Node test reads `S001-T09_BLUEPRINT_ADR_MATRIX.md` and rejects a missing row; duplicate number; broken relative ADR link; unknown coverage/status value; `COVERED` without an approved decision; `GAP` without a proposed delta owner; and an implementation phase marked `DELIVERED` with decision-only evidence. It also tests that an ADR with `Status: PROPOSED` cannot make a row approved. Run the test before creating the matrix and observe the expected missing-matrix failure.
- [ ] **Step 3: Map the 20 subjects.** For each candidate above, quote or summarize the binding `Decision` paragraph in your own words and link the exact ADR file; use `PARTIAL` if the record omits a required qualifier. Reserve 8 delta rows for items 3, 8, 13, 14, 15, 18, 19, and 20. Link section 33 separately for repository topology. Keep a distinct column for `decision status` versus `implementation evidence`.
- [ ] **Step 4: Run the matrix test to GREEN.** Ensure exactly 20 rows, all references resolve, `COVERED` rows point to approved ADRs, and unresolved rows remain visibly `GAP` or `PARTIAL`. Run `git diff --check` on Task 1 paths.
- [ ] **Step 5: Commit only Task 1 paths.**

  ```powershell
  node .\scripts\decisions\Test-S001-T09-Decisions.mjs
  git add docs/decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md scripts/decisions/Test-S001-T09-Decisions.mjs
  git commit -m "docs(architecture): trace mandatory blueprint decisions"
  ```

### Task 2: Prepare and obtain the repository-topology decision

**Files:**
- Create: `docs/adr/ADR-017-repository-topology-and-contract-governance.md`
- Modify after approval: `docs/decisions/BUSINESS_DECISIONS.md`
- Verify: `docs/DELIVERY_STATE.md`, `docs/runbooks/BUILD_VERSION_BASELINE.md`, `contracts/README.md`, API and web workflow evidence

**Interfaces:**
- Consumes: Task 1 matrix and the existing API/web two-repository baseline.
- Produces: one `PROPOSED` ADR with two fully evaluated options; after owner approval, one selected and dated binding topology decision.

- [ ] **Step 1: Record factual current topology.** API and web have separate Git histories and baseline workflows; `api/contracts/` is the current contract registry. Identify which evidence proves independent builds and which cross-repository compatibility or ownership controls have not been demonstrated. Do not claim that the repository split itself is an approved exception.
- [ ] **Step 2: Draft two explicit options in ADR-017.** Option A migrates to the blueprint monorepo with independent service build/test paths, path-aware CI, contract ownership, CODEOWNERS/ruleset boundaries, and a migration plan preserving Git history and required checks. Option B requests a formal two-repository exception with a single authoritative contract registry, immutable/versioned contract publication, consumer pinning and compatibility gates in both repositories, coordinated change review, branch-protection requirements, and documented release ownership. For each option list migration cost, coupling, CI complexity, rollback, and the Phase 0 evidence that would still be required.
- [ ] **Step 3: Recommend, then seek an explicit owner decision.** Recommend Option A as the literal blueprint path unless its migration cost or organizational constraints justify Option B. Keep ADR-017 `PROPOSED` and D-005 `OPEN` until the Product Owner / Project Owner selects an option, names any exception, and approves its obligations. Do not infer approval from the existence of current repositories.
- [ ] **Step 4: Record approval without claiming implementation.** On owner approval, set ADR-017 `APPROVED` with date/approver and exactly one selected option; add a new BD-007 row that links ADR-017. If Option B is selected, state which blueprint section 33 deliverable is excepted and which objective evidence will replace it. If Option A is selected, keep the monorepo exit criterion open until migration and independent build proof are executed.
- [ ] **Step 5: Run `Test-S001-T09-Decisions.mjs` and relative-link validation; commit ADR-017 and BD-007 only after the approval content exists.** A proposed ADR may be committed separately for review, but may not be labelled `APPROVED` in its commit or sprint evidence.

### Task 3: Draft the eight missing mandatory decision records

**Files:**
- Create: `docs/adr/ADR-018-hexagonal-service-boundaries.md`
- Create: `docs/adr/ADR-019-lambda-supporting-workloads.md`
- Create: `docs/adr/ADR-020-step-functions-orchestration-criteria.md`
- Create: `docs/adr/ADR-021-appconfig-rollout-policy.md`
- Create: `docs/adr/ADR-022-kms-security-baseline.md`
- Create: `docs/adr/ADR-023-multi-account-governance.md`
- Create: `docs/adr/ADR-024-immutable-image-promotion-and-blue-green.md`
- Create: `docs/adr/ADR-025-backup-restore-and-fault-testing.md`
- Modify: `docs/decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md`
- Modify after approval: `docs/decisions/BUSINESS_DECISIONS.md`

**Interfaces:**
- Consumes: Task 1 gaps and blueprint sections 9, 10, 12, 17, 22–24, 33–34.
- Produces: eight narrowly scoped proposed decisions, each with context, decision, alternatives, consequences, implementation phase, owner, approval state, and explicit relationship to existing ADRs.

- [ ] **Step 1: Recheck ADR numbering.** Before creating files, verify no ADR-017 through ADR-025 has appeared in the branch or default branch. If a number is occupied, allocate the next unused numbers and update matrix/test references together; never overwrite another author's ADR.
- [ ] **Step 2: Draft architecture and compute decisions.** ADR-018 puts domain/application contracts inward and Spring/AWS clients in adapters, with architecture-test criteria. ADR-019 permits Lambda for bounded supporting workloads such as image processing, prohibiting ownership of canonical financial transactions. ADR-020 limits Step Functions to long-running workflows with explicit state/retry/callback benefit and excludes bid placement; Transaction Core retains canonical financial state.
- [ ] **Step 3: Draft configuration and security decisions.** ADR-021 requires schema validation, gradual rollout, alarm rollback, per-environment versioning, and no dynamic bypass of authorization/financial invariants. ADR-022 states encryption/key ownership, least-privilege grants, audit/rotation/recovery obligations, and a later AWS implementation gate; no account, key ARN, or secret is invented.
- [ ] **Step 4: Draft operations decisions.** ADR-023 assigns Dev/Staging/Prod isolation, security/log-archive governance, workforce access, SCP/CloudTrail duties, and later provisioning evidence. ADR-024 requires immutable image digest promotion, no production rebuild, compatible migrations, blue/green health/alarm rollback, and policy `PASS` before deployment. ADR-025 requires backup scope/PITR, restoration ownership, tested RTO/RPO, and fault scenarios; do not claim a restore or FIS run.
- [ ] **Step 5: Mark overlaps explicitly.** For every new ADR, add `Refines:` links where it narrows ADR-001/008/010/012/015/016 or the Phase 0 baseline. Use `Supersedes:` only if the owner deliberately replaces a conflicting approved decision; include rationale, effective date, and migration consequences. Keep all new records `PROPOSED` until reviewed.
- [ ] **Step 6: Review with the decision owner and update matrix.** Obtain approval for each separate decision. Set only approved ADRs to `APPROVED` with owner/date; keep rejected or deferred records and their history visible. Move matrix rows from `GAP` to `COVERED` only after the corresponding record is approved. Run the matrix test and security review after each approval batch.
- [ ] **Step 7: Commit only the reviewed ADRs, matrix, and any new business-decision rows.** Do not stage unrelated files or claim AWS provisioning.

### Task 4: Verify references, security, status, and T09 closeout

**Files:**
- Modify: `docs/adr/README.md`
- Modify: `docs/sprints/SPRINT_001.md`
- Modify: `docs/DELIVERY_STATE.md`
- Modify: `docs/SPRINT_INDEX.md`
- Verify: `docs/decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md`, ADR-017 through ADR-025

**Interfaces:**
- Consumes: 20-row matrix, owner-approved ADRs, and topology choice.
- Produces: consistent T09 status and remaining Phase 0 implementation gaps for T08/sprint closure.

- [ ] **Step 1: Run the deterministic matrix gate.** `node .\scripts\decisions\Test-S001-T09-Decisions.mjs` must report exactly 20 distinct subjects with approved references and no unresolved `GAP`/`PARTIAL` rows before T09 can be marked `COMPLETED`.
- [ ] **Step 2: Validate Markdown links and metadata.** Resolve every local ADR/matrix/business-decision link relative to its file, check approved status/owner/date consistency, and verify that every `Refines`/`Supersedes` target exists. Because no repository-wide Markdown link checker is currently documented, include these checks in `Test-S001-T09-Decisions.mjs` rather than claiming an unrun tool.
- [ ] **Step 3: Perform security/content review.** Inspect all new records for real credentials, tokens, AWS account IDs, private endpoints, raw scanner reports, or internal user paths. Run the existing repository Gitleaks gate if its verified tooling is available; record whether it ran. Review headings and text for false implementation claims about KMS, accounts, ECR, Inspector, CodeDeploy, AppConfig, backups, or FIS.
- [ ] **Step 4: Reconcile task and sprint state.** Update `docs/adr/README.md` with each new ADR's real status. In `SPRINT_001.md`, check T09 acceptance only when all 20 decisions and topology approval are evidenced; fill actual commit/PR, commands, results, no-deployment statement, and references. Close D-005 in `DELIVERY_STATE.md` only when ADR-017 is approved; keep the Phase 0 monorepo/service-template exit criterion open until migration or approved exception obligations are actually evidenced. Update `SPRINT_INDEX.md` to T08 or the next real task; do not mark Sprint 001 complete merely because T09 decisions were approved.
- [ ] **Step 5: Run final checks and commit T09 state.**

  ```powershell
  node .\scripts\decisions\Test-S001-T09-Decisions.mjs
  git diff --check
  git status --short
  ```

  Expected: matrix/link/status tests PASS; no new secret or unapproved implementation claim; the staged paths contain only T09 records and state files. Commit with a message such as `docs(architecture): reconcile blueprint ADR delta`.

## T09 Exit Gate

- [ ] All 20 mandatory subjects have one primary approved decision reference; refinements are linked without rewriting ADR-001 through ADR-016.
- [ ] Repository topology has one explicit, dated Product Owner / Project Owner decision and the chosen build/contract-governance obligations.
- [ ] Any approved two-repository exception names the literal blueprint deviation and keeps its unproven substitute controls open.
- [ ] Each of the eight missing subjects has an approved, scoped ADR or is recorded as unresolved with T09 remaining `IN_PROGRESS`.
- [ ] Matrix, relative links, approval metadata, and security/content review PASS.
- [ ] Phase 0 evidence is separate from Phase 1+ design and delivery; no AWS implementation or release-readiness claim is made.
- [ ] Sprint 001 remains open until T08 review and all sprint criteria are reconciled.
- [ ] Only T09 paths are staged and `git diff --check` passes.

## Handoff

Execute Tasks 1–4 in order. Task 1 and the `PROPOSED` drafts can proceed from repository evidence. The approval gates in Tasks 2 and 3 require an explicit Product Owner / Project Owner decision; if it is unavailable, preserve `PROPOSED` records and stop before Task 4 completion. This plan authorizes preparation and verification of decisions, not choosing an exception or granting approval on the owner's behalf.
