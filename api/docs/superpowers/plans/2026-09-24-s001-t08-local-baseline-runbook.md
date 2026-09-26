# S001-T08 Local Baseline Runbook and Sprint Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish and execute a safe, reproducible local Phase 0 baseline runbook, then record the actual Sprint 001 review evidence and remaining gaps.

**Architecture:** One operator runbook links the existing build, contract, PostgreSQL, sample-flow, observability, and supply-chain entry points. A small PowerShell launcher supplies the five local runtime database settings from the ignored secret file to the service process and restores the caller's environment afterward. A separate evidence ledger records each fresh command and outcome before sprint and coverage claims are updated. The T08 closeout gate waits for T09, which the sprint explicitly names as a dependency.

**Tech Stack:** PowerShell, Java 21/Maven Wrapper, PostgreSQL 16/17, Docker/Testcontainers, Node/npm, GitHub Actions evidence, Markdown.

**Spec:** `docs/sprints/SPRINT_001.md`, S001-T08 purpose, scope, acceptance criteria, required tests, and Sprint Review Demonstration; `docs/SPRINT_DELIVERY_AGENT_PROMPT.md`, Production Coverage and sprint evidence format.

## Global Constraints

- Current task states: S001-T01 through S001-T07 `COMPLETED`; S001-T08 and S001-T09 `READY`.
- T08 names T09 as a dependency. Implement and verify the runbook/demo now; keep T08 `IN_PROGRESS` until T09's topology decision is recorded and the final sprint evidence is reconciled.
- API and web are separate Git repositories. Web build evidence needs a real web checkout and exact approved Node/npm versions; do not infer a web rerun from the API repository.
- Use existing local PostgreSQL scripts and `api/.env.local.example`. Never print or commit `.env.local`, passwords, raw idempotency keys, scanner reports, or private log payloads.
- A canonical `mvnw.cmd -B verify` run uses Testcontainers; `scripts/run-it-local.ps1` uses the separate local test database. Name the path actually run.
- `CreateIdentityProfileSample` is an unauthenticated Phase 0 technical proof and must not be deployed as a public product endpoint.
- T07 hosted execution integrity is `PASS`, release policy is `BLOCKED` with 29 High, 37 Medium, and 0 Critical container findings; do not call this release ready or create a disposition for documentation closure.
- Local database reset is destructive to local test data and requires the documented explicit acknowledgement. The runbook must not require reset for routine verification.
- Do not modify T09's architecture decision, web repository, production infrastructure, scanner policy, or application behavior as part of this documentation task.
- Preserve unrelated dirty worktree files. Stage each T08 file explicitly.

## Review Focus

- A fresh developer with no local database or `.env.local` must get a safe prerequisite/failure path, not a half-completed command sequence; Task 1 pins it with a clean-start walkthrough.
- A command that needs local test credentials must use `run-it-local.ps1` and must not echo secrets; Tasks 1 and 2 inspect this boundary.
- The T06 demo must distinguish a live HTTP sample from deterministic integration assertions for duplicate delivery and rollback; Task 2 records separate evidence for each.
- A failed, blocked, or unrun gate must remain visible in the evidence ledger and Sprint 001 status; Tasks 2 and 3 verify this.
- T09 can remain undecided while T08 runbook work proceeds, but T08, Sprint 001, and Phase 0 must remain open; Tasks 3 and 4 pin the dependency.

---

### Task 1: Build the operator runbook from working repository entry points

**Files:**
- Create: `docs/runbooks/LOCAL_BASELINE_SPRINT_001.md`
- Create: `scripts/run-identity-local.ps1`
- Create: `scripts/Test-RunIdentityLocal.ps1`
- Modify: `docs/runbooks/README.md`
- Verify: `infra/local/postgres/README.md`, `docs/runbooks/BUILD_VERSION_BASELINE.md`, `docs/runbooks/IDENTITY_PROFILE_TECHNICAL_BASELINE.md`, `contracts/README.md`, `docs/guides/S001-T07-cycle-6-hosted-ci.md`

**Interfaces:**
- Consumes: existing scripts, approved profiles, and T01–T07 evidence.
- Produces: one ordered, copyable `api/` operator path with expected output, troubleshooting, and bounded cleanup.

- [ ] **Step 1: Reconcile every command before writing.** Inspect `scripts/verify-build-baseline.ps1`, `scripts/verify-contracts.ps1`, `scripts/local-db-bootstrap.ps1`, `scripts/local-db-status.ps1`, `scripts/local-db-verify.ps1`, `scripts/run-it-local.ps1`, and `services/identity-profile-service/src/main/resources/application-local.yaml`. Record shell, working directory, prerequisites, environment source, effects, and exact PASS signal for each.
- [ ] **Step 2: Write RED launcher tests.** In `Test-RunIdentityLocal.ps1`, execute the launcher against a GUID-named temporary fixture shaped as `api/.env.local`, `api/scripts/run-identity-local.ps1`, and `api/services/identity-profile-service/mvnw.cmd`. Give the launcher an optional `-RepositoryRoot` parameter so tests can use the fixture; the default resolves the real repository from `$PSScriptRoot`. The fake wrapper records only whether each required variable was present and whether the requested profile was `local`; it never echoes values. Assert rejection of missing file, missing/duplicate/blank runtime keys, Maven nonzero exit, and malformed `KEY=value`; assert all five runtime variables reach the child, the launcher returns nonzero on Maven failure, and prior process environment values are restored on PASS and failure. Run the test and observe failures before implementation.
- [ ] **Step 3: Implement the local launcher.** `run-identity-local.ps1` reads only `IDENTITY_DB_URL`, `IDENTITY_DB_APP_USERNAME`, `IDENTITY_DB_APP_PASSWORD`, `IDENTITY_DB_MIGRATOR_USERNAME`, and `IDENTITY_DB_MIGRATOR_PASSWORD` from `api/.env.local`; reject duplicate, missing, or blank entries before setting environment variables. Snapshot and restore all five process-level values in `finally`. From `services/identity-profile-service`, invoke `mvnw.cmd -B spring-boot:run "-Dspring-boot.run.profiles=local"`. Convert a nonzero child exit into sanitized `LOCAL_IDENTITY_MAVEN_FAILED`; no raw exception may contain a credential. Re-run `Test-RunIdentityLocal.ps1` to GREEN.
- [ ] **Step 4: Write the runbook's first-use path.** Include API/web checkout boundaries; Java 21, Maven Wrapper, PostgreSQL 16/17, Docker, PowerShell, and exact web Node/npm prerequisites; `.env.local.example` setup without example real secrets; start/check PostgreSQL; bootstrap/status/verify; canonical Testcontainers verification; separate local test profile; contract registry check; the T07 hosted/evidence link. Put one command block per boundary and state the expected exit code.
- [ ] **Step 5: Document the sample demonstration.** Start the service in a separate terminal with `.\scripts\run-identity-local.ps1`; use the registered `POST /api/v1/identity-profile-samples` contract and a synthetic `Idempotency-Key`. Show a first request, same-key replay, invalid/conflicting request, readiness, and the exact local integration test that asserts one outbox row, duplicate-safe inbox effect, rollback, and concurrent replay. Mark SQL/log/metric inspection as read-only; never claim a live HTTP request alone proves duplicate relay delivery.
- [ ] **Step 6: Add diagnosis and cleanup.** Cover missing `.env.local`, unavailable PostgreSQL/Docker, Java/Node drift, contract gate failure, migration failure, stale Trivy DB, and policy `BLOCKED`. Link the existing database, technical baseline, and Cycle 6 runbooks. Document stop-service and credential-environment restoration; put `local-db-reset.ps1 -IUnderstandThisDeletesLocalTestDatabases` in an optional, clearly destructive section for a dedicated local instance only.
- [ ] **Step 7: Review the runbook as a new developer.** Verify every referenced path exists, every command has an explicit repository/root context, example values are synthetic, expected status/exit conditions are stated, and no command needs an undocumented private file. Update `docs/runbooks/README.md` to link the new runbook and distinguish it from production recovery runbooks.
- [ ] **Step 8: Commit only the runbook and launcher paths.**

  ```powershell
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test-RunIdentityLocal.ps1
  git diff --check -- docs/runbooks/LOCAL_BASELINE_SPRINT_001.md docs/runbooks/README.md scripts/run-identity-local.ps1 scripts/Test-RunIdentityLocal.ps1
  git add docs/runbooks/LOCAL_BASELINE_SPRINT_001.md docs/runbooks/README.md scripts/run-identity-local.ps1 scripts/Test-RunIdentityLocal.ps1
  git commit -m "docs(runbook): document Sprint 001 local baseline"
  ```

### Task 2: Execute the runbook and preserve a sanitized review record

**Files:**
- Create: `docs/sprints/S001-T08_REVIEW_EVIDENCE.md`
- Verify: `docs/runbooks/LOCAL_BASELINE_SPRINT_001.md`
- Generated, ignored only: Maven `target/` reports and temporary local evidence.

**Interfaces:**
- Consumes: Task 1 ordered commands and the existing local PostgreSQL/Docker services.
- Produces: timestamped PASS/FAIL/BLOCKED/NOT_RUN results, tool/environment identity, evidence paths, and a sanitized six-step sprint-review record.

- [ ] **Step 1: Record preflight without secrets.** Capture date, API full commit SHA, OS, Java/Maven Wrapper, PowerShell, Docker Engine, PostgreSQL major, and whether a separate web checkout is available. Record only presence of local secret files, never their values. If a prerequisite is absent, record `NOT_RUN` with the exact missing prerequisite; do not invent a PASS.
- [ ] **Step 2: Run API build, contracts, and database gates in runbook order.** From `api/`, execute the repository scripts below, recording each exit code and report path. If a gate fails, stop dependent demo steps and record failure rather than editing documentation to claim success.

  ```powershell
  .\scripts\verify-build-baseline.ps1
  .\scripts\verify-contracts.ps1 -Mode Registry
  .\scripts\local-db-bootstrap.ps1
  .\scripts\local-db-status.ps1
  .\scripts\local-db-verify.ps1
  .\scripts\run-it-local.ps1
  ```

  Expected: all applicable commands exit `0`; canonical Maven reports include architecture and Testcontainers tests, while the local path reports the `SampleDeliveryFlowLocalIT` assertions. Running the bootstrap requires a dedicated local PostgreSQL instance configured per `infra/local/postgres/README.md`.
- [ ] **Step 3: Execute the six Sprint Review Demonstration steps.** Record the approved decision/risk status; clean build and contract results; database isolation/Flyway result; synthetic first/replay HTTP response; read-only outbox/inbox/log/metric observations plus the deterministic duplicate-delivery test; SBOM and sanitized scan policy outcome. A security policy `BLOCKED` is recorded as `BLOCKED`, even if scanner execution passes.
- [ ] **Step 4: Record web verification separately.** If the separate web checkout and approved Node/npm versions are available, run `npm ci`, `npm run lint`, and `npm run build` from that repository and record its commit and result. Otherwise cite the dated T02 hosted/local evidence and mark the fresh T08 web rerun `NOT_RUN`; do not treat API tests as web evidence.
- [ ] **Step 5: Create the review record.** In `S001-T08_REVIEW_EVIDENCE.md`, give each gate: command, date, commit/environment, exit code, result, and durable reference (committed path or GitHub run URL). Summarize output rather than pasting raw logs, environment, SQL rows, tokens, absolute user paths, or scanner JSON. For any failure, include a safe reproduction and owner/next action.
- [ ] **Step 6: Recheck evidence honesty.** Every `PASS` row must point to fresh output or a dated prior run explicitly labelled prior evidence. Retain `BLOCKED` and `NOT_RUN` rows. Run `git diff --check`, then commit only the review record and any runbook correction justified by the execution.

### Task 3: Update provisional Sprint 001 and Phase 0 evidence

**Files:**
- Modify: `docs/sprints/SPRINT_001.md`
- Modify: `docs/DELIVERY_STATE.md`
- Modify: `docs/PRODUCTION_COVERAGE.md`
- Modify: `docs/SPRINT_INDEX.md`
- Verify: `docs/sprints/S001-T08_REVIEW_EVIDENCE.md`

**Interfaces:**
- Consumes: Task 2 record, T07 hosted evidence, and T09 decision status.
- Produces: one internally consistent task/sprint/Phase 0 state and next action.

- [ ] **Step 1: Update T08 acceptance and evidence.** Check each of the four T08 criteria only when Task 2 proves it. Populate `Commit/PR`, `Commands`, `Test results`, `Deployment`, and `Screenshots/log references` with actual identifiers or an explicit `NOT_RUN`/pending reason. Preserve the fact that no deployment happened.
- [ ] **Step 2: Update production coverage by scope.** Change `Runbooks` from `NONE` to `BASIC` when the local runbook is usable and exercised; keep production recovery/restore gaps. Change `Security scanning` from stale `BASIC` to `TESTED` for the API repository Phase 0 scope only when the T07 hosted execution evidence and Task 2 audit are cited, retaining `release-policy=BLOCKED` and the later ECR/Inspector gap. Reassess `Rollback` only for documented local procedure; do not call it deployment rollback. Keep cost controls at `BASIC` unless actual budget controls are evidenced.
- [ ] **Step 3: Reconcile T09 dependency.** If T09 remains `READY`, keep T08 `IN_PROGRESS` despite proven runbook/demo criteria; `SPRINT_001.md`, `DELIVERY_STATE.md`, and `SPRINT_INDEX.md` all keep Sprint 001 `IN_PROGRESS` and Phase 0 gate open. Record that the T09 topology decision is still required for T08's final sprint evidence.
- [ ] **Step 4: Draft the retrospective and next sprint recommendation.** Use the actual review run: what worked, what failed or stayed blocked, what should change, and who owns the remaining work. Leave Sprint Result `PENDING` until the formal sprint review and T09 decision. Do not convert a policy `BLOCKED` into implementation failure or release approval.
- [ ] **Step 5: Validate consistency and commit.** Search all four state files for stale `T07 IN_PROGRESS`, `Runbooks NONE`, `Security scanning BASIC`, and claims that hosted evidence is missing. Verify every changed maturity row links evidence and a remaining gap. Run `git diff --check` and stage only the four state files plus any necessary Task 2 evidence correction.

### Task 4: Close T08 after the T09 decision and formal sprint review

**Files:**
- Modify: `docs/sprints/SPRINT_001.md`
- Modify: `docs/DELIVERY_STATE.md`
- Modify: `docs/SPRINT_INDEX.md`
- Verify: `docs/sprints/S001-T08_REVIEW_EVIDENCE.md`, T09 decision record

**Interfaces:**
- Consumes: completed T08 demonstration/evidence and the approved T09 topology decision.
- Produces: final T08 status and a sprint outcome supported by the review record.

- [ ] **Step 1: Verify the T09 gate.** Identify the approved T09 decision and its link in Sprint 001. If none exists, stop this task with T08 `IN_PROGRESS`; do not create an implied approval in T08 documentation.
- [ ] **Step 2: Conduct the formal sprint review.** Replay the six demonstration results from Task 2 with the repository owner; record the review date, attendees/owner, accepted evidence, unresolved gaps, and whether the sprint goal is met. Do not paste private logs or credentials.
- [ ] **Step 3: Set the result from evidence.** Set T08 `COMPLETED` only if all four acceptance criteria are proven and T09 has been decided. Set Sprint Result to `PASS` only if every sprint acceptance criterion and the sprint goal are met; otherwise set `PARTIAL` or `FAIL` with explicit unmet criteria. Update `SPRINT_INDEX.md` and `DELIVERY_STATE.md` to the same state. Keep Phase 0 exit open if its separate monorepo/service-template condition remains unmet.
- [ ] **Step 4: Commit only final state documents.** Run `git diff --check`, inspect the exact staged path list, and commit `docs/sprints/SPRINT_001.md`, `docs/DELIVERY_STATE.md`, and `docs/SPRINT_INDEX.md` only.

## T08 Exit Gate

- [ ] Runbook commands and prerequisites match real files, profiles, and service behavior.
- [ ] A fresh developer walkthrough succeeds, or each unmet prerequisite is recorded as `NOT_RUN` with follow-up; acceptance remains unchecked if the walkthrough cannot be proven.
- [ ] Build, contract, architecture, concurrency, access-denial, and sample-flow results have dated evidence.
- [ ] Six sprint-review steps have actual observations or explicitly labelled gaps.
- [ ] No secrets, raw scanner output, or absolute user paths enter retained docs.
- [ ] Coverage levels distinguish local `TESTED` evidence from production readiness.
- [ ] T07 policy remains `BLOCKED` and T09 topology dependency remains visible.
- [ ] T08 and Sprint 001 are not marked complete before T09 resolution and formal review.
- [ ] `git diff --check` passes and commits include only T08 paths.

## Handoff

The implementation handoff is Task 1 first, then Task 2, then Task 3. Task 4 waits for the T09 decision and formal sprint review. Execute the plan one task at a time; inspect each result before claiming T08 completion. The approved Sprint 001 task text is the binding requirement if a command or environment assumption in this plan proves inaccurate during execution.
