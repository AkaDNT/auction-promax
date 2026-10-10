# T03 Spring Framework Remediation — Phase 0 Feasibility Specification

Status: APPROVED WITH AMENDMENTS — PHASE 0 PLANNING (2026-10-10). Phase 0 is authorized for read-only feasibility, specification and planning only. This document does not authorize Spring POM/source changes, migration implementation, vulnerability dispositions, merge, deployment, or release.

## Purpose and decision boundary

Establish whether a separately scoped Spring Boot 4 / Spring Framework 7 migration can remove repository findings `CVE-2026-47884` and `CVE-2026-47890` without changing service/domain behavior, weakening security policy, or exceeding the remaining Sprint 002 capacity. Phase 0 must produce a supported exact-version dependency path, an executable validation plan, and a capacity decision. Until every Phase 0 gate is PASS and the implementation plan is independently reviewed, all Spring source and Maven inputs remain unchanged.

Owner authorization from 2026-10-10 allows this feasibility work and a later gated implementation; it does not waive the Phase 0, review, capacity, exact-SHA, or hosted acceptance gates. T03 remains `IN_PROGRESS` / release-policy `BLOCKED`; PR #21 remains Draft.

## Evidence baseline and scope

The preserved Identity service and the relational and gateway service templates currently use Spring Boot `3.5.16`; the hosted service evidence at execution SHA `d914038b2deaaebc02f6f144c8592368ca726396` reports `spring-webmvc` `6.2.19` with both target CVEs in all five service images. Repository scanner severity is Critical for both. Spring upstream advisory classifications are Medium for `CVE-2026-47884` and Low for `CVE-2026-47890`. Record both sources without changing scanner severity, asserting non-applicability, or creating dispositions.

The remediation scope, if Phase 0 passes, is the shared Boot parent/dependency path in three source POMs (Identity, relational template, gateway template), their directly affected technical/test/configuration integrations, and generated-service validation. Identity has OAuth2 Resource Server, springdoc `2.9.0`, a Jackson-backed sample serializer, RFC 7807 error handling, and an explicit Tomcat `10.1.59` override. Both templates use Servlet MVC, validation, security, actuator and tests; the relational template additionally uses JPA, PostgreSQL, Flyway and Testcontainers, while gateway remains database-free. Java is pinned to 21. The approved Jackson remediation at `0c10ee17a834bd9eb5473f58445b8a6bfa412ef9` is retained and must not be regressed.

Phase 0 may inspect official compatibility documentation, Maven metadata/effective graphs, and isolated disposable experiments that do not edit tracked repository inputs. No experiment may be represented as product validation unless it runs the complete relevant code and test corpus. Do not install or change product dependencies in the working tree during Phase 0.

## Candidate-version evaluation

Phase 0 evaluates, but does not silently select, these exact release candidates:

| Candidate | Initial rationale | Must be proven before selection |
| --- | --- | --- |
| Spring Boot `4.0.8`, Spring Framework as managed by its BOM (reported `7.0.9`), springdoc `3.0.3` | Supported 4.0 maintenance line and lower migration churn; springdoc 3.0.3 release notes state it was built against Boot 4.0.5 | Confirm current support status, resolve exact managed Framework/Tomcat/Jackson graph from the published Boot 4.0.8 POM, verify springdoc 3.0.3 compatibility with that exact patch, and prove all plugin/ecosystem dependencies resolve without overrides or convergence failures. |
| Spring Boot `4.1.1`, Spring Framework as managed by its BOM, springdoc `3.1.1` | Current stable Boot 4.1 line and matching springdoc 3.1 line | Confirm exact managed graph and support status; investigate the reported springdoc 3.1.1 Jackson 2 version lift against Boot's Jackson 2 transitional BOM and the retained Jackson 2.21.7 security floor. Reject if it introduces an unapproved Jackson conflict or requires a workaround. |

The Phase 0 recommendation must name one exact Boot, Framework (resolved, not independently overridden), springdoc, Tomcat and JSON stack. Prefer the candidate with the smallest supported compatibility delta only if it fully resolves the target Framework findings and passes the same safety gates. Do not select a milestone, snapshot, unsupported maintenance line, individual Spring Framework override, or unverified compatibility combination. If neither candidate is supportable, STOP and return the evidence to the owner; do not choose a different Java line or unrelated release as an implicit fallback.

Spring Boot 4 requires Java 17 or newer and uses Spring Framework 7; Java 21 satisfies the published minimum, but full project/plugin/library compatibility remains to be demonstrated. Boot 4's servlet baseline is Servlet 6.1 with managed Tomcat 11.0.x; the current Tomcat 10.1 override must not be carried forward unless the selected Boot BOM explicitly supports that exact combination. The migration candidate must use the Boot-managed server line and remove the old override unless Phase 0 proves otherwise.

## Required Phase 0 investigations and gates

### A. Supported dependency path

- Verify candidate release/support status from official release and support-policy sources at the time of Phase 0 completion.
- Resolve each candidate's published Maven POMs and effective dependency graph. Record exact `spring-framework`, `spring-webmvc`, `tomcat-embed-*`, Servlet API, Jackson, Hibernate/JPA, Flyway, Micrometer/OpenTelemetry, Testcontainers, springdoc and plugin versions.
- Prove no direct Spring module override, dependency convergence error, unsupported transitive edge, or Jackson version below the approved `2.21.7` floor is hidden by a top-level safe dependency.
- Confirm Boot 4 starter coordinates from its migration guide, including web MVC and OAuth2 resource-server renames, and decide whether classic compatibility starters or focused modular starters are required. Keep scope to the smallest supported set.
- Verify the exact springdoc WebMVC API artifact/version against the selected Boot patch. Its major line must match Boot's major line; a broad “springdoc 3.x supports Boot 4” statement alone is insufficient.

### B. JSON and externally visible behavior

Boot 4 defaults to Jackson 3 and provides a transitional Jackson 2 integration. Its Maven BOM exposes two separate controls: `jackson-bom.version` manages Jackson 3, while `jackson-2-bom.version` manages Jackson 2. Do not carry the Boot 3 meaning of `jackson-bom.version=2.21.7` into Boot 4; the property now controls a different major line.

Phase 0 must compare (1) Jackson 3 migration and (2) temporary Jackson 2 compatibility under the following rules:

- If Jackson 3 is selected, Jackson 2 does not need to remain solely to preserve the old `2.21.7` floor. However, inspect every Jackson 2 artifact still present (including springdoc/swagger-core transitives) and prove none is an affected version for the target CVEs.
- If Boot's Jackson 2 transitional support is selected, set/verify the Jackson 2 graph through `jackson-2-bom.version` at `2.21.7` or a later reviewed fixed release, accepting only the published BOM's exact component exceptions. Do not solve conflicts with per-module pins or overrides.
- In either path, inspect the actual resolved graph jointly for `org.springdoc`, swagger-core, Jackson 2 and Jackson 3; ensure one mapper is selected for Spring MVC and no split-stack ambiguity changes API behavior.
- Jackson 2 auto-configuration is deprecated transitional support and is documented for removal in a future Boot 4.x release (the published deprecation list targets removal in Boot 4.3.0). If selected, record that lifecycle risk and an owner/date for the separate Jackson 3 completion.

Recommend Jackson 3 unless a concrete compatibility blocker is documented; if Jackson 2 is recommended, state its deprecation/removal risk and a separate follow-up migration owner/date. Do not use a direct Jackson override without a reviewed BOM-based reason.

During Phase 0, inventory existing tests, identify missing contract coverage, specify exact golden assertions and define the reproducible method for capturing baseline output. Phase 0 is read-only: it must not add tracked tests or capture a new baseline by changing dependencies. Phase 1 must begin with a contract-baseline task on the unchanged Boot `3.5.16` / Jackson `2.21.7` source: add any approved missing tests, run them, and retain the baseline result/artifact. Only after that baseline is captured and independently reviewed may a later Phase 1 task modify a dependency or migration source.

The Phase 1 baseline and post-migration run must require byte/semantic-equivalent assertions for:

- Identity sample HTTP success JSON and serialized sample event/response fields, values, null/omission behavior and timestamps.
- RFC 7807 status, content type, `type`, `title`, `status`, `detail`, `instance`, correlation property and sanitization of unexpected exceptions.
- Request validation and malformed JSON status/body; idempotency response and security/OAuth2 filter behavior.
- OpenAPI JSON at the actual `/v3/api-docs` endpoint (stable operations, schema/property types and requiredness); compare structurally after normalizing only documented generated metadata. Unexplained changes are a STOP condition.
- Structured logging JSON correlation fields and redaction; all generated relational and gateway technical-probe response contracts.

Phase 0 is read-only and may inventory existing tests, but it cannot claim this gate passed until a later implementation plan includes these tests and Phase 2 executes them on all five services.

### C. Service/build ecosystem compatibility

Map each known migration item to a concrete repository path and validation: `spring-boot-starter-web` to WebMVC, Identity's OAuth2 Resource Server starter rename, test starter strategy and Mockito/JUnit APIs, Tomcat 11/Servlet 6.1 transition, Identity's explicit Tomcat override, Identity's Springdoc API endpoint, Boot 4 configuration property changes, actuator health/readiness, Flyway database module, Hibernate/JPA, observability and OTLP exporter, Maven wrapper/plugins/enforcer/compiler/Jacoco/CycloneDX, image build and container smoke. Record current source/config/test evidence and whether an actual incompatibility is proven or only a risk.

The absent CDK app and Boot 4 assessment limitations remain; this work makes no CDK synthesis claim. All four registered generated services must be produced only in isolated CI under existing provenance rules, not committed or regenerated in the developer workspace.

### D. Target-finding and policy path

Identify the exact affected Spring components and CVE aliases in scanner input. Confirm chosen upstream release's published fix status using primary advisories/release notes. Phase 0 must not assert scanner remediation until the unchanged scanner path demonstrates the findings absent from the relevant dependency and container inventories on the final exact SHA. Keep policy, thresholds, dispositions and fail-closed evidence behavior untouched.

### E. Capacity and execution eligibility

The parent Sprint 002 envelope is 72–114 engineering hours plus 14–22 hours reserve (86–136 hours maximum); the original T03 estimate was 18–28 hours before the separate Spring delta was identified. The repository evidence inspected for this draft does not record actual Sprint/T03 burn or remaining available hours. Therefore capacity is currently `UNVERIFIED`, not PASS.

Phase 0 must produce a bottom-up incremental effort range for implementation, tests, generated services, hosted scan/evidence cycles and review corrections, plus identify reserve consumption. Compare it against owner-confirmed actual burn and remaining capacity, including the no-more-than-four-engineering-weeks limit and T07 feasibility. Do not infer capacity from the original envelope or silently extend Sprint 002. If actual burn/remaining capacity is unavailable, or the forecast exceeds the approved 136-hour envelope / jeopardizes T07, mark `CAPACITY_GATE=BLOCKED` and STOP for a new owner ruling.

## Phase 0 exit decision

Phase 0 may be marked PASS only when a reviewed record contains all of the following:

1. One supported exact-version candidate, with published effective graph and primary source evidence.
2. A justified Jackson 3 or transitional Jackson 2 decision retaining the 2.21.7 security floor and explicit JSON/OpenAPI contract gates.
3. A complete per-service/plugin/configuration/runtime validation plan, including all five services and hosted scanner/evidence gates.
4. A bottom-up effort range compared with owner-confirmed remaining capacity, reserve and T07 feasibility, within the approved envelope.
5. Independent review of the Phase 0 output and explicit owner approval of scope/version/capacity for Phase 1.

Until then status is `PHASE0_IN_PROGRESS` or `BLOCKED`; no migration code changes. If compatibility, externally visible contract preservation, policy integrity, or capacity cannot be established, STOP and request a new owner ruling.

## Phase 1 and Phase 2 boundaries (acceptance criteria only)

Phase 1, after all Phase 0 and plan gates, is a controlled implementation in an isolated worktree, Identity plus shared templates, preserving domain/business contracts and T03 workflow ownership. It requires exact-SHA independent review before any authorized candidate push.

Phase 2 requires on the same final candidate/execution revision: canonical Maven `verify` and registered non-skipped Failsafe proof for Identity and all four generated services; effective dependency graph assertions; service SBOM and dependency/container scans; technical smoke including relational PostgreSQL and database-free gateway paths; schema-valid sanitized evidence; exact per-service result/evidence identity and aggregate PASS; and both target Spring CVEs absent from applicable dependency/container inventories. The separate release-policy job remains authoritative and may remain BLOCKED for unrelated findings. No change authorizes merge, deployment or release; PR #21 remains Draft.

## Official references consulted

- [Spring Boot 4 system requirements](https://docs.spring.io/spring-boot/4.0/system-requirements.html)
- [Spring Boot 4 migration guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- [Spring Boot 4 JSON support](https://docs.spring.io/spring-boot/4.0/reference/features/json.html)
- [Spring Boot 4 dependency version properties](https://docs.spring.io/spring-boot/4.0/appendix/dependency-versions/properties.html)
- [Spring Boot 4.1.1 deprecated API list](https://docs.spring.io/spring-boot/4.1/api/java/deprecated-list.html)
- [Spring Boot 4.0.8 release](https://spring.io/blog/2026/08/20/spring-boot-4-0-8-available-now/)
- [Spring Boot 4.1.1 release](https://spring.io/blog/2026/08/20/spring-boot-4-1-1-available-now/)
- [Springdoc releases and changelog](https://github.com/springdoc/springdoc-openapi/releases)
- [Springdoc Boot 4 versioning guidance](https://github.com/springdoc/springdoc-openapi#versioning)
- [Spring Framework 7 release notes](https://github.com/spring-projects/spring-framework/wiki/Spring-Framework-7.0-Release-Notes)
- [Spring support policy](https://spring.io/support-policy)
- [CVE-2026-47884 advisory](https://spring.io/security/cve-2026-47884/)
- [CVE-2026-47890 advisory](https://spring.io/security/cve-2026-47890/)
