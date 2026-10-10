# T03 Spring Remediation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Track checkbox steps and require independent review before publishing a candidate.

**Goal:** Migrate Identity and shared service templates to the selected Boot 4.0.8 / Framework 7.0.9 path while preserving their externally visible contracts and verifying the target findings through the existing hosted gates.

**Architecture:** Capture contract tests on Boot 3.5.16 / Jackson 2.21.7 first. Then align three source POMs with Boot 4, port direct JSON/test integrations, assert the actual dependency graph, and run the existing five-service hosted verification path.

**Tech Stack:** Java 21, Maven Wrapper 3.9.16, Boot 4.0.8, springdoc 3.0.3, Jackson 3 BOM 3.1.7 and Jackson 2 BOM 2.21.7 for remaining transitives.

**Spec:** `docs/superpowers/specs/2026-10-10-s002-t03-spring-remediation-phase0.md`, interpreted with Owner's latest authorization to choose and execute appropriate project changes autonomously.

## Global Constraints

- User authorization now covers Phase 1 implementation and necessary validation; routine decisions do not require another approval round.
- Preserve domain contracts, current security exposure, scanner thresholds, dispositions, workflow ownership, PR Draft status, and deferred default-branch freshness proof.
- Use Boot-managed Framework 7.0.9 and Tomcat 11.0.24; remove the 10.1.59 Tomcat property.
- Jackson 3 uses `jackson-bom.version=3.1.7`; remaining Jackson 2 uses `jackson-2-bom.version=2.21.7`, with annotations 2.21 as a BOM exception.
- Four generated destinations are created only in isolated CI. Preserve Java 21 and existing Maven/plugin pins unless a demonstrated incompatibility requires a scoped change.
- Exact-SHA independent review precedes authorized isolated candidate publication. Merge, deployment and release remain outside this remediation.

## Review Focus

- Security currently denies API docs and has no configured JWT resource-server authentication. Preserve that actual behavior; the OAuth2 dependency is not evidence that JWT verification is enabled.
- OpenAPI structural snapshots must cover the real generator endpoint; test-only filter disabling must not change production security.
- JSON byte/value/null behavior and ProblemDetail extension flattening must survive Jackson 3.
- Boot 4 package moves and persistence auto-configuration must be checked in every service shape; a graph PASS is not a runtime PASS.
- Safe Jackson top-level coordinates must not hide affected transitives; inspect all graph paths and keep gateway datastore-free.

### Task 1: Capture unchanged dependency contracts

**Files:** Identity existing controller/serializer tests; new `src/test/java/com/auctionpromax/identityprofileservice/OpenApiGoldenContractTest.java`; new `src/test/resources/spring-remediation/openapi-golden.json`; shared `templates/common/TechnicalHttpTest.java`; this plan and execution evidence.

**Interfaces:** Retained baseline assertions and test reports are consumed by migration verification.

- [x] Add exact event/response/null JSON assertions and complete malformed/validation ProblemDetail assertions. Preserve existing public/denied security behavior, including docs and bearer-header requests.
- [x] Add an OpenAPI structural golden test against `/v3/api-docs` with filters disabled in that test only. Normalize only the generated server URL. Explicit capture mode writes only `target/spring-remediation/openapi-baseline.json`; ordinary mode requires a reviewed tracked fixture.
- [x] Run baseline unit tests plus canonical `mvnw verify`/named Identity Failsafe where Docker is available. Retain reports and capture the reviewed OpenAPI fixture before changing dependencies.
- [ ] Independently review baseline assertions/results and commit the scoped baseline. Do not migrate with a failing baseline.

### Task 2: Migrate POMs and directly affected integrations

**Files:** Identity and relational/gateway template POMs; Identity serializer/tests; shared logging tests; Boot test-annotation imports; Identity/template YAML auto-configuration class exclusions; Testcontainers imports if required.

**Interfaces:** Same controllers/ports/JSON behavior; Boot 4 managed runtime and Jackson 3 mapper.

- [ ] Change parent/starter/module coordinates using the graph-resolved candidate. Add classic test support as the minimal compatibility strategy and the proper security-test starter.
- [ ] Port direct Jackson API usage to Jackson 3 without changing domain/port interfaces; adapt sanitized serialization-failure tests to the actual Jackson 3 exception API.
- [ ] Update Boot 4 test and configuration class package moves. Validate Mockito/JUnit/Testcontainers API compatibility through compilation and tests.
- [ ] Run unchanged golden assertions and canonical Identity verify/Failsafe. Diagnose failures from actual output and retain baseline expectations unless evidence shows only documented generated metadata differs.

### Task 3: Assert graph and update repository contracts

**Files:** Narrow Spring migration graph validator/fixtures under `api/scripts/supply-chain/`; existing template/POM graph contract tests only where current pins/packages are asserted.

**Interfaces:** A complete Maven dependency-tree input must fail closed for incorrect Framework/Tomcat/Jackson coordinates or database-bearing gateway dependencies.

- [ ] Add graph-positive and mutation-negative fixtures for old Spring/Tomcat, vulnerable Jackson 2/3 nested paths, and legitimate annotations exception.
- [ ] Validate Identity resolved graph and BOM; update existing migration/conformance assertions to the selected supported POM shape without weakening checks.
- [ ] Run template conformance, registry, schema/SBOM/evidence, matrix and workflow contracts.

### Task 4: Review and hosted validation

**Files:** Scoped implementation commit and remediation execution evidence; existing owning workflows.

- [ ] Obtain independent review at the exact scoped candidate SHA, address important findings, and preserve unrelated dirty documentation.
- [ ] Publish only the reviewed isolated candidate under existing authorization; keep PR #21 Draft.
- [ ] Require all five Maven/Failsafe legs, graph/BOM, dependency/container scans, relational/gateway smoke, sanitized evidence and aggregate results on the final execution SHA.
- [ ] Confirm both target Spring CVEs and prior Jackson findings absent from applicable scanner findings. Report separate release-policy outcome and any residual findings without inventing dispositions.

## Decisions and progress

Owner's latest message authorizes autonomous completion. It supersedes the historical Phase-1-not-authorized boundary for this selected remediation. The separate Spring envelope is retained; no Sprint burn reconciliation is introduced. Existing external publication authority remains isolated-candidate only.
