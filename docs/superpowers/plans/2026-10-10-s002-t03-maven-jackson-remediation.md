# T03 Maven/Jackson Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Jackson through the Boot-managed BOM to 2.21.7 across Identity and all generated services, while separately producing a read-only Boot 4 compatibility assessment.

**Architecture:** Set `jackson-bom.version` in the three source POMs, verify BOM-governed effective graphs and service builds, then use the hosted matrix to regenerate and scan real service artifacts. Keep Spring Boot 3/Spring Framework 6 unchanged; make the Boot 4 assessment a documentation-only deliverable.

**Tech Stack:** Maven Wrapper, Spring Boot 3.5.16 dependency management, Jackson BOM 2.21.7, CycloneDX/SBOM and existing hosted supply-chain workflows.

**Spec:** `docs/superpowers/specs/2026-10-10-s002-t03-maven-jackson-remediation.md`

## Global Constraints

- Set `<jackson-bom.version>2.21.7</jackson-bom.version>` in all three POMs; do not add module-specific pins.
- Preserve Spring Boot 3.5.16 and Spring Framework 6.2.19; no Spring upgrade in this delta.
- Jackson components must match the BOM, including exceptions such as `jackson-annotations` 2.21.
- No policy/disposition changes, business changes, or fail-closed weakening.
- Spring findings remain open; the Boot 4 assessment is read-only and records upstream-vs-scanner severity differences.

## Review Focus

- BOM exception version (`jackson-annotations` 2.21) is not incorrectly rejected as misalignment — pin effective dependency output to approved BOM values.
- Transitive conflict reintroduces an older core/databind — assert the complete resolved Jackson graph, not only direct dependencies.
- A template POM is updated but Identity or another template is missed — assert all three source POM properties.
- Vulnerability row disappears from one inventory but remains in the other — require both dependency and container inventories to omit all five CVEs.
- Boot 4 assessment accidentally becomes migration scope or changes severity — review only-document changes and explicitly preserve both scanner findings as policy inputs.

---

### Task 1: Pin the Boot-managed Jackson BOM in all service source POMs

**Files:**
- Modify: `api/service-foundation/templates/relational/pom.xml`
- Modify: `api/service-foundation/templates/gateway/pom.xml`
- Modify: `api/services/identity-profile-service/pom.xml`
- Test: `api/scripts/foundation/Test-ServiceConformance.mjs`

**Interfaces:** Three POMs expose the same `jackson-bom.version` property; generated services inherit it from their registered template.

- [x] **Step 1: Add a conformance assertion** that all three source POMs set `jackson-bom.version` to `2.21.7` and no Jackson module has an individual version override.
- [x] **Step 2: Run the template conformance test and observe failure** before changing the POMs.

Run: `node api/scripts/foundation/Test-ServiceConformance.mjs --templates`

Expected: FAIL because each source POM lacks the approved BOM property.

- [x] **Step 3: Add the exact Boot-managed BOM property** under `<properties>` in all three POMs.
- [x] **Step 4: Run template conformance** and verify the property and no-module-pin assertions pass.

Run: `node api/scripts/foundation/Test-ServiceConformance.mjs --templates`

Expected: PASS.

### Task 2: Assert effective Maven Jackson graphs and build/Failsafe results

**Files:**
- Test/verification: Identity POM and generated service POMs from the registered relational/gateway templates.
- Create: `api/scripts/supply-chain/JacksonDependencyTree.mjs`
- Test: `api/scripts/supply-chain/Test-JacksonDependencyTree.mjs`
- Modify: `.github/workflows/supply-chain.yml`
- Modify: `.github/workflows/security-freshness.yml`
- Test: `api/scripts/supply-chain/ServiceMatrixWorkflowContract.mjs` and `Test-ServiceMatrixWorkflow.mjs`

**Interfaces:** A graph assertion compares each resolved Jackson artifact/version against an explicit approved map derived from Jackson BOM 2.21.7; `jackson-core`/`jackson-databind` are 2.21.7 and BOM exceptions (notably `jackson-annotations` 2.21) are accepted. The assertion fails on unknown Jackson artifacts, unmanaged conflicts, or an unexpected version.

- [x] **Step 1: Implement and test the graph assertion** against accepted BOM exceptions, vulnerable old core/databind, arbitrary Jackson artifact mismatch, and missing coordinates.
- [x] **Step 2: Run the graph assertion for Identity locally**, using `mvnw dependency:tree`, and add the same fail-closed assertion after Maven verify in both owning hosted matrix workflows for each generated service.
- [ ] **Step 3: Build and run registered Failsafe suites** using canonical Maven `verify` for all five services, in the available local/approved build environment.

Expected: all five services build and their named Failsafe suites pass; the executable graph assertion proves every Jackson coordinate conforms to the BOM, including version exceptions. Hosted matrix steps execute that assertion for every selected service. This task's local graph/build evidence does not claim hosted SBOM or scanner acceptance.

### Task 3: Produce the read-only Spring Boot 4 / Framework 7 compatibility assessment

**Files:**
- Create: `docs/superpowers/plans/2026-10-10-s002-t03-spring-boot-4-assessment.md`

**Interfaces:** Assessment consumes current templates, Identity source/configuration/tests and the official Boot 4 migration guide; it must not modify product POMs, sources, workflows, or policy.

- [x] **Step 1: Inventory applicable migration topics** and map each to current repository usage and likely validation impact.
- [x] **Step 2: Record severity provenance and applicability**: Spring upstream rates CVE-2026-47884 Medium and CVE-2026-47890 Low; this repository's scanner evidence rates both Critical. Do not change either value or release policy.
- [x] **Step 3: Record recommendation, compatibility risks, effort, and unresolved owner decisions**; leave migration unimplemented.

Expected: assessment is documentation-only, makes no severity/disposition decision, and clearly states the two Spring findings remain open.

### Task 4: Exact-SHA review and hosted acceptance

**Files:**
- No additional source changes beyond Tasks 1–3.

- [x] **Step 1: Run affected local conformance/evidence regressions and `git diff --check`.**
- [ ] **Step 2: Obtain independent review of the exact candidate SHA.**
- [ ] **Step 3: Run the authorized hosted candidate matrix**; verify all five Maven/Failsafe gates and inspect actual generated SBOMs, dependency scans, container scans, sanitized evidence, and exact-set aggregate at that exact execution SHA. Require the five Jackson CVEs absent from both dependency and container inventories for every service.

Expected: hosted technical execution and artifact-aware evidence pass at one exact candidate revision. Task 2's local graph/build evidence does not substitute for Task 4's hosted SBOM and scanner evidence. Do not claim release-policy PASS or T03 completion from this sub-project alone; preserve PR #21 Draft and existing release-policy behavior.
