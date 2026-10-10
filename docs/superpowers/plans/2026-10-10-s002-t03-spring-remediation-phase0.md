# T03 Spring Remediation Phase 0 Feasibility Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to execute this plan task-by-task. This plan covers read-only Phase 0 only; it does not authorize Spring migration implementation.

**Goal:** Decide whether one supported exact Spring Boot 4 / Framework 7 dependency path can remediate the two target Spring CVEs while preserving existing externally visible behavior and fitting owner-confirmed Sprint 002 capacity.

**Architecture:** Gather repository and official-release evidence, gate investigation against owner-confirmed capacity, then compare exact candidate BOM graphs and Jackson strategies in disposable directories only. Produce a reviewed Phase 0 evidence dossier and STOP unless every technical and governance exit condition passes.

**Tech Stack:** Spring Boot 4.0.8 / 4.1.1 candidates; Maven Wrapper 3.9.16; Java 21; Spring Framework 7; springdoc 3.0.3 / 3.1.1; Jackson 3 and Jackson 2 transitional BOMs; existing T03 evidence and hosted workflows.

**Spec:** `docs/superpowers/specs/2026-10-10-s002-t03-spring-remediation-phase0.md`

## Global Constraints

- Phase 0 is read-only for tracked product POM/source/test/workflow files; do not install/change product dependencies in the working tree.
- Candidate versions are exactly Boot 4.0.8 + springdoc 3.0.3 and Boot 4.1.1 + springdoc 3.1.1 until evidence supports an owner-reviewed change.
- Spring Framework version is resolved from the selected Boot BOM; do not pin Spring Framework modules independently.
- Boot 4 `jackson-bom.version` controls Jackson 3; `jackson-2-bom.version` controls Jackson 2. Never carry the Boot 3 property meaning forward.
- Evaluate the complete resolved Jackson 2 and Jackson 3 graphs against all five previously remediated CVEs: `CVE-2026-68497`, `CVE-2026-89407`, `CVE-2026-89425`, `CVE-2026-91776`, and `CVE-2026-91777`.
- Use advisory-specific, release-line-specific patched ranges; do not compare version strings numerically across minor lines. For the candidate lines, the common safe Jackson 2 floors are `2.21.7` or `2.22.3`; the common safe Jackson 3 floors are `3.1.7` or `3.2.3`. The selected exact graph must be checked against each CVE's primary advisory and component coordinates.
- Both candidate Boot BOMs currently manage Jackson 3 `3.1.5`, which is affected by the five target Jackson findings. Evaluate a BOM-level `jackson-bom.version=3.1.7` probe (or a later exact compatible release-line floor); it is a probe only, not authorization to change a tracked POM. If no compatible BOM-level upgrade produces a graph free of all five CVEs, reject the candidate and return to Owner.
- If Jackson 3 is selected, validate every remaining Jackson 2 artifact against all five CVEs. If Jackson 2 transitional support is selected, use `jackson-2-bom.version` and validate every Jackson 2 artifact against its own release-line advisory ranges; `2.21.7` or greater as a plain numeric comparison is not a sufficient acceptance rule.
- No candidate passes security feasibility if it reintroduces any of the five Jackson CVEs.
- Keep target CVEs `CVE-2026-47884` and `CVE-2026-47890`, scanner thresholds, release-policy, evidence validation and fail-closed semantics unchanged.
- Owner decision 2026-10-10 authorizes a separate Spring project envelope of `52–98 h` including `12–20 h` reserve; Tasks 3–6 may proceed within it without Sprint 002 burn reconciliation. Do not charge this work to the Sprint 002 envelope.
- Sprint 002 actual burn, remaining capacity, four-week schedule and T07 feasibility remain `UNVERIFIED`; the separate Spring authorization does not rebaseline Sprint 002 or mark it PASS.
- Track actual hours spent on the separate Spring work against its `98 h` ceiling as execution proceeds; stop before exceeding the authorized envelope or its reserve.
- PR #21 remains Draft. No merge, deployment, release, disposition or branch-protection action is authorized.
- Phase 1 golden-contract baseline is captured on unchanged Boot 3.5.16 / Jackson 2.21.7 before any dependency change.

## Review Focus

- A candidate's top-level safe Jackson version hides an affected nested/transitive Jackson 2 or Jackson 3 artifact — inspect complete resolved graphs for all three source POM shapes, all five prior CVEs, and springdoc/swagger-core paths.
- Jackson 2 and Jackson 3 coexist but Spring MVC selects an unexpected mapper — record Boot auto-configuration and mapper-selection properties for every candidate/strategy.
- springdoc's major line nominally matches Boot but its tested patch or swagger-core dependencies conflict — require exact published release evidence and graph resolution.
- A successful effective-POM/graph probe is mistaken for dependency convergence or application compatibility — run Enforcer convergence separately, label graph-only evidence, and keep `MAPPER_RUNTIME_UNVERIFIED` until Phase 1/2 runtime tests.
- Spring work is charged to Sprint 002 or exceeds the separately authorized `52–98 h` envelope — stop and request a new owner ruling.

---

### Task 1: Build repository baseline, gap inventory, and preliminary effort range

**Files:**
- Read: `api/services/identity-profile-service/pom.xml` and Identity sources/tests/configuration.
- Read: `api/service-foundation/templates/{common,relational,gateway}/`.
- Read: `api/service-foundation/services.json`, approved Jackson plan/spec, T03 execution log, Sprint 002 plan.
- Create: `docs/superpowers/plans/2026-10-10-s002-t03-spring-phase0-evidence.md` (working dossier; no product files).

**Interfaces:** Dossier records source paths, current behavior/test coverage, candidate comparison questions, estimates and evidence provenance. No production interface changes.

- [x] **Step 1: Record exact baseline and source inventory** for all three POM shapes, five registered services, JSON serializers, controllers/advice, security, OpenAPI, runtime configuration, persistence, observability and Maven plugins.

Run: `node api/scripts/foundation/Test-ServiceRegistry.mjs` and read-only `rg`/file inspection from repository root.

Expected: dossier maps each service to Identity/relational/gateway source and records current Boot 3.5.16, Jackson 2.21.7, springdoc 2.9.0 and Tomcat 10.1.59 override without changing them.

- [x] **Step 2: Inventory existing tests and identify golden-contract gaps** for sample success/event serialization, RFC 7807 errors, validation/malformed JSON, idempotency, OAuth2/security, `/v3/api-docs`, structured logging and generated technical probes.

Expected: dossier names the current test files and exact assertions still needed; no golden tests or baselines are created in Phase 0.

- [x] **Step 3: Produce preliminary bottom-up effort range** for official graph checks, disposable probes, Phase 1 implementation/contracts, five-service Maven/Failsafe, SBOM/scanner/smoke, exact-SHA reviews and likely hosted correction cycles. Mark assumptions and reserve separately.

Expected: range is an estimate only, compared to the owner-authorized separate Spring `52–98 h` envelope (including reserve). Record that Sprint 002 burn, four-week schedule and T07 remain unverified but do not gate this separately funded personal project.

### Task 2: Confirm separately authorized Spring capacity gate before candidate probes

**Files:**
- Update: `docs/superpowers/plans/2026-10-10-s002-t03-spring-phase0-evidence.md`.
- Read: owner decision dated 2026-10-10 authorizing a separate `52–98 h` Spring envelope, including `12–20 h` reserve, without Sprint 002 burn reconciliation.

**Interfaces:** Consumes Task 1 estimate. Produces `CAPACITY_GATE=PASS` for this Spring Phase 0 when the estimate fits the explicit separate owner-authorized envelope; Sprint 002 retains its own unresolved capacity status.

- [x] **Step 1: Record the owner-authorized Spring envelope and its boundary.** Owner authorized a separate `52–98 h` envelope (`40–78 h` engineering plus `12–20 h` reserve); Sprint 002 actual burn, remaining capacity, elapsed weeks and T07 forecast remain `UNVERIFIED`. Spring work must not be charged to Sprint 002.

Expected: all capacity values have provenance and owner confirmation; do not infer them from the original envelope.

- [x] **Step 2: Compare the Task 1 estimate to the separate Spring envelope.**

Expected: `CAPACITY_GATE=PASS` for Phase 0 under the separate `52–98 h` Spring authorization; record that Sprint 002 capacity/T07 remain unresolved and unchanged. If the Spring forecast exceeds `98 h` or requires unapproved reserve, set this gate BLOCKED and STOP. Tasks 3–6 are conditional on PASS. Owner approved this separate envelope on 2026-10-10; the gate is PASS for Tasks 3–6 only.

### Task 3: Verify official candidate support, CVE fixes, and exact Boot BOM properties

**Files:**
- Update: Phase 0 evidence dossier only.
- Reference: official Spring Boot releases/support docs, exact published Boot BOMs, Spring CVE advisories, springdoc releases/changelog.

**Interfaces:** Consumes capacity PASS. Produces source-linked exact release facts and candidate go/no-go inputs; no dependency edits.

- [x] **Step 1: Verify candidate publication/stable status** for Boot 4.0.8 and 4.1.1 and release evidence for springdoc 3.0.3 and 3.1.1. Confirm official release evidence for Boot-managed `spring-webmvc` 7.0.9 on both candidates and confirm that Framework 7.0.9 contains the published fixes for both target CVEs. Commercial/edition-specific support entitlement remains conditional on the owner's subscription and the policy's purchase/download dates; do not overclaim it.

Expected: each claim links to primary release/support/advisory material; unsupported or stale versions fail the candidate.

- [x] **Step 2: Read the published candidate BOM/property data** and record Framework, Tomcat, Servlet, Jackson 3, Jackson 2, Hibernate, Flyway, Micrometer/OpenTelemetry, Testcontainers and plugin versions. Build a per-CVE/per-artifact/per-release-line matrix from FasterXML/GitHub primary advisories; do not substitute a global minimum comparison. Exact candidate parent/plugin-management values and advisory matrix are recorded in the dossier.

Expected: record the exact distinct controls `jackson-bom.version` (Jackson 3) and `jackson-2-bom.version` (Jackson 2). Verify from each published BOM that the candidates default to Jackson 3 `3.1.5` and Jackson 2 `2.21.5`; treat both Jackson 3 `3.1.5` and Jackson 2 `2.21.5` as failing the all-five-CVE check. Confirm the release-line fixed floors using the advisory matrix: Jackson 3 `3.1.7` / `3.2.3`; Jackson 2 `2.21.7` / `2.22.3`. If other component/version branches appear in the actual graph, resolve them individually from the corresponding advisories.

- [x] **Step 3: Verify migration coordinate mappings** for WebMVC, OAuth2 Resource Server, test starters, Tomcat 11/Servlet 6.1 and Boot 4 modules.

Expected: record the exact coordinates and whether each map is mandatory, optional or incompatible with an existing repository dependency; no source edits.

### Task 4: Resolve disposable dependency graphs for both candidates and Jackson strategies

**Files:**
- Create only in a fresh task-scoped temporary directory: disposable POM copies/probe outputs.
- Update: Phase 0 evidence dossier only.
- Never write: tracked POMs, generated-service destinations, product `target/`, or working-tree `node_modules`.

**Interfaces:** Consumes Task 3 version facts. Produces graph-only evidence for Identity, relational-template and gateway-template dependency shapes under each candidate/JSON strategy.

- [x] **Step 1: Prepare isolated disposable copies** of the three POM shapes and necessary Maven Wrapper files. Apply documented Boot 4 starter/springdoc coordinate changes only inside the temporary directory; do not copy or modify application source. Use Java 21 and the repo-pinned Maven Wrapper distribution 3.9.16. The first scratch attempt was incomplete and is not counted; after network access was explicitly enabled for these read-only downloads, the corrected disposable matrix resolved successfully.

Expected: temporary root is outside the repository, tracked worktree remains unchanged, and the probe report records exact commands/tool versions. If current host cannot access Maven Central, record BLOCKED and do not substitute a different toolchain or call static inspection a resolved graph.

- [x] **Step 2: Resolve each candidate's effective POM and complete dependency tree** for Jackson 3 default and Jackson 2 transitional variants using `help:effective-pom` and `dependency:tree`. Probe Jackson 3 `3.1.7` and Jackson 2 `2.21.7` through their distinct Boot properties in disposable POMs.

Expected: full graph includes springdoc/swagger-core and every Jackson group/artifact/version in compile/runtime/test scopes. Check each Jackson artifact against all five advisory ranges. Jackson 3 candidate has no affected Jackson 2 or Jackson 3 artifact; Jackson 2 transitional candidate has no affected Jackson 2 artifact and any Jackson 3 artifacts are also checked. Accept only exact BOM exceptions; reject any affected component, unresolved conflict or prohibited per-module override. The graph result does not prove runtime mapper selection.

- [x] **Step 3: Run Maven Enforcer dependency convergence separately** in each disposable candidate probe, recording plugin/rule version, analyzed scopes, exclusions and every reported path. The existing named Enforcer execution with a temporary `dependencyConvergence` rule passed in all twelve variants; no reported conflict required an exclusion.

Expected: dependency resolution and convergence are separately evidenced. A clean `dependency:tree` alone is not a convergence PASS. This check does not establish mapper runtime selection.

- [x] **Step 4: Check Spring/Tomcat graph identity and plugin coordinates** in the disposable graphs, including no Spring Framework override, no Tomcat 10.1 carry-over, Servlet 6.1 BOM alignment and Maven plugin management resolution.

Expected: exact Framework version is Boot-managed, Tomcat 11.0.x is Boot-managed, and dependency convergence succeeds. Set `MAPPER_RUNTIME_UNVERIFIED` for every candidate/strategy until Phase 1/2 runtime tests. These are dependency-resolution results only, not compile/runtime/product compatibility.

- [x] **Step 5: Compare candidate/JSON variants** on supported status, both Spring CVE fixes, all five Jackson CVEs, Jackson BOM compatibility, springdoc graph and migration churn; recommend one exact tuple or reject both. The dossier recommends Boot `4.0.8` / managed Framework `7.0.9` / springdoc `3.0.3` / managed Tomcat `11.0.24` / Jackson 3 `3.1.7`, while explicitly retaining runtime and exact-patch compatibility as unverified.

Expected: recommendation names exact Boot, managed Framework, springdoc, Tomcat and JSON stack, with evidence. No candidate may pass while any target Spring or prior Jackson CVE is present. Do not choose a third candidate without a new owner ruling.

### Task 5: Complete per-service compatibility and acceptance map

**Files:**
- Update: Phase 0 evidence dossier only.
- Read: source/test/config/build files and existing T03 hosted workflow contracts.

**Interfaces:** Consumes Task 1 inventory and Task 4 graph evidence. Produces complete validation matrix for future Phase 1/2.

- [x] **Step 1: Map every identified migration risk** to exact source path, candidate graph concern, and future validation: config/property changelog, Identity OAuth2/security, Tomcat/Servlet, springdoc API, actuator/health, JPA/Hibernate, Flyway PostgreSQL integration, gateway no-database behavior, Micrometer/OTLP, Maven plugins, CycloneDX schema, image build/smoke and scanner evidence. The dossier distinguishes graph-resolved facts from runtime risks for all five service identities.

Expected: distinguish proven incompatibilities from open risks; the matrix covers Identity and all four generated service IDs, including three relational and one gateway generated variant.

- [x] **Step 2: Define the Phase 1 baseline-first sequence**: create only missing golden-contract tests on unchanged Boot 3.5.16/Jackson 2.21.7; run all relevant tests; retain a reviewable baseline artifact; only then permit a later dependency-update task.

Expected: Phase 0 dossier specifies exact test files/assertions and baseline procedure but contains no new tests/results and does not claim product validation.

- [x] **Step 3: Define Phase 2 hosted evidence requirements** for five-service canonical `mvnw verify`/non-skipped Failsafe, resolved graph, SBOM, dependency/container scan, smoke, sanitized schema-valid evidence, exact per-service aggregate, and absence of both target CVEs.

Expected: plan preserves current workflow ownership and policy behavior; separate release-policy may remain BLOCKED for unrelated findings.

### Task 6: Finalize Phase 0 decision dossier and independent review

**Files:**
- Update: `docs/superpowers/plans/2026-10-10-s002-t03-spring-phase0-evidence.md`.
- Read: Phase 0 specification and this plan.

**Interfaces:** Consumes Tasks 1–5. Produces `PHASE0_PASS` or explicit `BLOCKED` decision; Phase 1 remains separately gated.

- [x] **Step 1: Re-estimate effort** using candidate graph findings and compare to the separate Spring envelope and remaining Spring reserve. The candidate graph work did not expand the documented `40–78 h` engineering plus `12–20 h` reserve estimate (`52–98 h` total). Precise cumulative actual hours for Tasks 1–6 are not available and are not inferred; Sprint 002 burn/T07/schedule status remain separate and unresolved.

Expected: keep `CAPACITY_GATE=PASS` only while the Spring estimate remains within the owner-authorized separate envelope; otherwise set `PHASE0=BLOCKED`. Sprint 002 remains unreconciled and is not implicitly rebaselined.

- [x] **Step 2: Run document and evidence consistency checks**: all release/version facts have primary sources, each spec requirement maps to an evidence item, no Phase 0 product validation is overstated, and no target CVE/severity/policy semantics are changed.

Run: `git diff --check` plus manual requirement-to-evidence matrix review.

Expected: clean check and no claims beyond actual read-only outputs.

- [x] **Step 3: Commit the completed Phase 0 dossier alone** (stage only `docs/superpowers/plans/2026-10-10-s002-t03-spring-phase0-evidence.md`; leave other dirty files unstaged) and record the resulting full commit SHA: `9fc0b7d2b9121aedbd0333b5d75407dd5fa111dd`. The preceding dossier commit was superseded after exact-SHA review found empty convergence log files; the corrected commit records the successful reruns and non-empty logs.

Expected: the immutable commit identifies the exact dossier revision. Do not amend or rewrite it after review.

- [x] **Step 4: Obtain independent review of that exact dossier commit SHA** and record findings/resolutions. Reviewer accepted `9fc0b7d2b9121aedbd0333b5d75407dd5fa111dd` against its parent after verifying all twelve non-empty convergence logs and found no Critical/Important issue. The earlier finding on empty logs was corrected and re-reviewed. Nonblocking note: logs contain an initial `Access is denied.` line before the successful Maven output; its source is unknown and is not attributed. Phase 1 remains unauthorized and requires a separate explicit Owner approval of scope/version/capacity.

Expected: reviewer PASS is recorded against the dossier commit SHA; stale review cannot apply to a later revision. Owner Phase 1 approval remains a separate gate. Do not change Spring POM/source, push a candidate or claim T03 complete under this plan.

## Phase 0 STOP conditions

- Separate Spring envelope is not owner-authorized, or its forecast exceeds `98 h` / reserve needs exceed authorization: `CAPACITY_GATE=BLOCKED`; stop and request owner ruling.
- Neither exact candidate has supported dependency convergence, proven CVE fixes, compatible springdoc and an acceptable Jackson graph: reject both and return options to Owner; no third version is self-selected.
- Either candidate resolves any of the five prior Jackson CVEs in Jackson 2 or Jackson 3, or only appears safe by comparing versions across minor lines: reject candidate; never trade one fixed CVE set for another.
- Jackson/OpenAPI/HTTP/security contracts cannot be captured or preserved: stop before Phase 1 dependency edits.
- Any proposed workaround requires a direct Spring module override, vulnerable Jackson graph, scanner/policy weakening, behavior/domain change, or generated service in the workspace: stop.
- Maven Central/registry/network access prevents reliable version/graph proof: record environment BLOCKED; do not infer PASS from metadata alone.
- Spring work would be charged to Sprint 002 or exceed the separate authorized envelope: stop for a new Owner ruling. This authorization does not waive or change the original Sprint 002/T07 governance for other work.

Phase 0 PASS requires all Task 6 evidence and explicit Owner Phase 1 approval. This plan does not itself grant Phase 1 authorization or choose Native vs Subagent implementation execution. `MAPPER_RUNTIME_UNVERIFIED` remains set until Phase 1/2 runtime contract tests prove the selected Spring MVC mapper and observable JSON behavior.

## Primary security and tool references

- [CVE-2026-68497 — FasterXML advisory](https://github.com/FasterXML/jackson-databind/security/advisories/GHSA-q4xh-88c3-wmh7)
- [CVE-2026-89407 — FasterXML advisory](https://github.com/FasterXML/jackson-core/security/advisories/GHSA-p6pp-m3f8-5c89)
- [CVE-2026-89425 — FasterXML advisory](https://github.com/FasterXML/jackson-core/security/advisories/GHSA-7hhh-6rmp-j9qf)
- [CVE-2026-91776 — FasterXML advisory](https://github.com/FasterXML/jackson-databind/security/advisories/GHSA-wv8q-qhhj-9h54)
- [CVE-2026-91777 — FasterXML advisory](https://github.com/FasterXML/jackson-databind/security/advisories/GHSA-cxp5-3px4-pw24)
- [Maven Enforcer `dependencyConvergence` rule](https://maven.apache.org/enforcer/enforcer-rules/dependencyConvergence.html)
