# T03 Spring Remediation Phase 0 Evidence Dossier

Status: `PHASE0_BLOCKED` at Task 6 / Owner decision. Tasks 1–5 are recorded. Twelve disposable candidate graphs resolved and their separate Enforcer convergence checks passed. Phase 0 recommends a candidate path for planning, but exact `/v3/api-docs` behavior and Jackson mapper runtime remain untested, the Jackson 3 source migration has not been validated, and explicit Owner Phase 1 authorization is still required. The separate `52–98 h` Spring envelope (including `12–20 h` reserve) authorizes this Phase 0 work without Sprint 002 burn reconciliation; the four-week schedule is not a gate for this self-project. This dossier is not Spring Boot 4 product validation or Phase 1 authorization.

## Provenance and boundary

- Worktree revision inspected: `0c10ee17a834bd9eb5473f58445b8a6bfa412ef9` (the approved Jackson remediation revision named by the Phase 0 specification).
- Registry check: `node api/scripts/foundation/Test-ServiceRegistry.mjs` — PASS, 7/7; registry defines exactly five service identities.
- Toolchain observed: Node `v24.15.0`; Maven Wrapper `3.9.16`; Java `21.0.10` (Oracle, Windows x64). Candidate POMs and Maven repositories were disposable and outside the repository; no product dependencies were installed.
- Source inspection was read-only. No POM, application source, test, workflow, generated service, or product dependency was modified. No Phase 0 baseline test/output was created.
- Sprint 002 plan evidence: `docs/superpowers/plans/2026-10-05-s002-phase0-exit-and-service-foundation.md` records planning estimates T01–T07 of 72–114 engineering hours plus 14–22 hours reserve (86–136 maximum), up to four engineering weeks, and the post-T03 re-estimation/STOP rule. It does not record actual burn, remaining hours/reserve, elapsed engineering weeks, or current T07 feasibility.
- Capacity reconciliation search covered repository timesheet/capacity/effort filenames and the T02/T03 execution logs. Those logs contain task and workflow history but no owner-confirmed cumulative engineering-hour ledger or remaining-capacity statement. Historical task count, GitHub Actions run count, commit dates, or calendar duration are not substituted for burn.
- Owner decision (2026-10-10): original Sprint 002 budget `72–114 h`, reserve `14–22 h`, maximum `136 h`, and four-week limit remain unchanged for Sprint 002 records. The Spring remediation is authorized separately with a `52–98 h` envelope, comprising `40–78 h` engineering and `12–20 h` reserve. No Sprint 002 burn reconciliation is required for this separate work; it may not be charged to or represented as within the Sprint 002 envelope. The Owner states the four-week limit is not important for this self-project; it is not applied as a gate to the separate Spring envelope.

## Service and dependency baseline

The registry maps the future five-service validation set as follows:

| Service | Variant | Source shape | Current relevant scope |
| --- | --- | --- | --- |
| `identity-profile-service` | relational | Preserved `api/services/identity-profile-service/pom.xml` | HTTP/security/OAuth2, JPA/PostgreSQL/Flyway, springdoc, Jackson serializer, observability |
| `auction-service` | relational | `api/service-foundation/templates/relational/pom.xml` + `common/` | Shared MVC/security/actuator/observability plus JPA/PostgreSQL/Flyway/Testcontainers |
| `bidding-service` | relational | Same relational template | Same technical dependency shape; generated only in isolated CI |
| `billing-service` | relational | Same relational template | Same technical dependency shape; generated only in isolated CI |
| `realtime-gateway` | gateway | `api/service-foundation/templates/gateway/pom.xml` + `common/` | MVC/security/actuator/observability; database-free |

Read-only POM inspection records Boot parent `3.5.16`, Java/compiler release `21`, and `jackson-bom.version=2.21.7` in Identity and both templates. Identity additionally has springdoc `2.9.0` and explicit `tomcat.version=10.1.59`; relational and gateway templates also carry Tomcat `10.1.59`. Identity uses `spring-boot-starter-web` and `spring-boot-starter-oauth2-resource-server`; both templates use `spring-boot-starter-web`. No dependency changes were made.

Key source locations inventoried:

- Identity POM and serializer: `api/services/identity-profile-service/pom.xml`, `src/main/java/com/auctionpromax/identityprofileservice/adapter/out/serialization/sample/JacksonSamplePayloadSerializerAdapter.java`.
- Identity HTTP/error/security/configuration: `src/main/java/.../adapter/in/web/`, `src/main/resources/application*.yaml`, `src/test/resources/application-t03.yaml`.
- Identity build/runtime proof: `src/test/java/.../IdentityProfileServiceApplicationTestcontainersIT.java`, `IdentityProfileServiceApplicationLocalIT.java`, `SampleDeliveryFlowLocalIT.java`.
- Relational and gateway POM/ITs: `api/service-foundation/templates/relational/{pom.xml,RelationalBoundaryTestcontainersIT.java,application-local.yaml}` and `api/service-foundation/templates/gateway/{pom.xml,GatewayNoDatastoreIT.java,application-local.yaml}`.
- Shared template web/logging behavior: `api/service-foundation/templates/common/{TechnicalProbeController.java,TechnicalProblemAdvice.java,TechnicalHttpTest.java,StructuredLoggingTest.java,CorrelationIdFilter.java,application.yaml}`.
- Registry: `api/service-foundation/services.json`.

## Existing tests and golden-contract gaps

| Contract | Existing evidence found | Phase 1 baseline requirement / gap |
| --- | --- | --- |
| Identity sample JSON/event serialization | `JacksonSamplePayloadSerializerAdapterTest.java` asserts event fields and serializer failure sanitization; `SampleDeliveryFlowLocalIT.java` exercises delivery/idempotency flow | Capture exact stable field/value/null/omission/timestamp contract. Confirm HTTP success response and serialized event are both covered; current tests do not establish a retained cross-version golden artifact. |
| RFC 7807 errors | `GlobalProblemDetailHandlerTest.java`, `TechnicalBaselineControllerTest.java` | Assert status/content type and all required ProblemDetail fields (`type`, `title`, `status`, `detail`, `instance`, correlation); existing tests cover sanitization/correlation but not yet a reviewed byte/semantic golden across all required cases. |
| Validation/malformed JSON | `TechnicalBaselineControllerTest.java` has blank-value and malformed-body cases | Freeze exact status/body/error fields and content type, including malformed JSON. |
| Idempotency | `IdempotencyKeyTest.java`, `CreateSampleServiceTest.java`, `SampleDeliveryFlowLocalIT.java` | Golden replay and key-reuse/conflict HTTP response contract; confirm security context/filter coverage at endpoint. |
| OAuth2/security | Identity resource-server starter and security configuration are present; `TechnicalBaselineControllerTest.java` checks a denied route | Add/identify explicit authenticated, unauthenticated, malformed/invalid JWT and authorization-filter contract before migration. No current dedicated OAuth2 filter-chain compatibility proof was identified in the inspected test inventory. |
| `/v3/api-docs` OpenAPI | springdoc WebMVC API dependency `2.9.0` is in Identity POM | No test for the actual `/v3/api-docs` endpoint was found by source search. Add baseline structural snapshot for stable operations/schema/property types/requiredness; normalize only documented metadata. |
| Structured logging/correlation/redaction | `TechnicalBaselineLoggingTest.java`, `TechnicalBaselineControllerTest.java`, `TechnicalHttpTest.java`, template `StructuredLoggingTest.java` | Preserve ECS JSON shape, correlation field uniqueness, redaction/no raw values, and Identity/generated technical-probe responses. Capture baseline artifact and compare after migration. |
| Generated relational/gateway probes | `RelationalBoundaryTestcontainersIT.java`, `GatewayNoDatastoreIT.java`, `TechnicalHttpTest.java` | Execute on all three generated relational services and gateway in hosted CI; do not create generated destinations in this worktree. |

This is an inventory of existing coverage, not a claim that the specified golden baseline exists. Phase 1 must add only the approved missing assertions on unchanged Boot `3.5.16`/Jackson `2.21.7`, execute and retain the baseline before any POM/source migration task.

## Preliminary incremental effort estimate (not capacity approval)

Estimate for the separately scoped Spring delta, assuming one selected supported tuple, no domain changes, existing T03 workflows remain usable, and no more than two hosted correction cycles:

| Work package | Engineering estimate |
| --- | ---: |
| Phase 1 golden tests and baseline capture/review on unchanged dependencies | 8–14 h |
| Identity + shared-template Boot 4 migration and direct compatibility/configuration fixes | 10–18 h |
| Identity plus four generated-service unit/Failsafe and ecosystem corrections | 8–18 h |
| Hosted five-service SBOM/scanner/smoke/evidence cycles and evidence diagnosis | 8–16 h |
| Independent review, exact-SHA correction/re-review and dossier/closeout | 6–12 h |
| **Incremental engineering estimate** | **40–78 h** |
| Separate correction/retry reserve (not included above) | **12–20 h** |
| **Planning envelope including reserve** | **52–98 h** |

Risks that could exceed this range: Boot 4 starter/module migration across three POM shapes; Jackson 2/3 mapper ambiguity or springdoc/swagger-core incompatibility; Tomcat 11/Servlet 6.1 and Identity's current override; Maven plugin/Failsafe/CycloneDX incompatibility; changes required to preserve `/v3/api-docs` and security/JSON behavior; hosted scanning or infrastructure failures. No synthesis compatibility is claimed because there is no CDK application source.

The estimate is compared only to the parent 86–136-hour original total envelope. Since actual Sprint/T03 burn and remaining capacity are not recorded or owner-confirmed, it cannot be compared to a valid remaining balance, reserve availability, elapsed four-week budget, or T07 forecast. It is not evidence that the estimate fits.

## Task 2 capacity gate — OWNER-AUTHORIZED SEPARATE ENVELOPE / PASS

The initial Sprint 002 reconciliation remains `UNVERIFIED`; the Owner then explicitly authorized a separate Spring project envelope of `52–98 h` including reserve, without requiring Sprint burn reconciliation. For this separate Spring scope, `CAPACITY_GATE=PASS` is based on that explicit bounded authorization, not on an inferred Sprint balance. The work must remain within the separate envelope; if forecast grows beyond `98 h` (or its `12–20 h` reserve allocation proves inadequate), stop and request a new ruling. Do not charge the separate estimate to the Sprint 002 136-hour ceiling.

The original Sprint 002 check remains `Actual Burn + Remaining Forecast <= 136 h`, reserve counted once, four engineering weeks maximum, and T07 feasible. Its inputs remain `UNVERIFIED`; the separate Spring authorization does not change them or rebaseline Sprint 002. Those unresolved facts do not block the separately budgeted Spring Phase 0 Tasks 3–6.

Tasks 3–6 are now authorized as read-only Phase 0 feasibility/planning. The authorization does not extend to Spring POM/source changes, Phase 1 migration, vulnerability disposition, scanner changes, merge, deployment, or release.

## Task 3 — official candidate and security evidence

Research date: 2026-10-10. These are published documentation/BOM facts, not a locally resolved effective POM or dependency graph.

| Item | Boot 4.0.8 | Boot 4.1.1 | Evidence / interpretation |
| --- | --- | --- | --- |
| Release/support status | Published stable maintenance release; official catalogue recommends 4.1.1 as latest stable | Published stable and current latest stable | [4.0.8 managed coordinates](https://docs.spring.io/spring-boot/4.0/appendix/dependency-versions/coordinates.html), [4.1.1 managed coordinates](https://docs.spring.io/spring-boot/appendix/dependency-versions/coordinates.html), [4.0.8 release](https://spring.io/blog/2026/08/20/spring-boot-4-0-8-available-now/), [4.1.1 release](https://spring.io/blog/2026/08/20/spring-boot-4-1-1-available-now/), [Spring support policy](https://spring.io/support-policy/). Policy states Boot minor releases receive at least 13 months OSS support from customer availability; the public release announcement is not itself proof of any organization-specific commercial entitlement or the exact customer-availability start date. |
| Framework / `spring-webmvc` | `7.0.9` | `7.0.9` | Both candidate BOM coordinate tables list `spring-webmvc` 7.0.9. Spring advisories list 7.0.9 as the fixed OSS release for [CVE-2026-47884](https://spring.io/security/cve-2026-47884/) and [CVE-2026-47890](https://spring.io/security/cve-2026-47890/). This is an upstream fix-path fact, not proof that the candidate service graph or scanner output is clean. |
| Tomcat / Servlet | `tomcat-embed-*` `11.0.24`; `jakarta.servlet-api` `6.1.0` | `tomcat-embed-*` `11.0.24`; `jakarta.servlet-api` `6.1.0` | Official managed coordinates. The current repository Tomcat `10.1.59` override is incompatible with the intended managed baseline and must not be carried forward without new proof. |
| Jackson 2 defaults | `jackson-core`/`databind` `2.21.5`; `jackson-annotations` `2.21` | Same: core/databind `2.21.5`; annotations `2.21` | Both are below common affected-CVE fixed floors for core/databind; annotations is an exact BOM exception and must be evaluated by coordinate/advisory, not forced to `.5`/`.7`. |
| Jackson 3 defaults | `tools.jackson.core` `3.1.5` | `tools.jackson.core` `3.1.5` | Both candidate BOMs manage this line at 3.1.5, below fixed floors below. |
| Other selected ecosystem coordinates | Hibernate `7.2.24.Final`; Flyway `11.14.1`; Micrometer `1.16.7`; OpenTelemetry `1.55.0`; Testcontainers `2.0.5`; JUnit Jupiter `6.0.3`; Mockito `5.20.0` | Hibernate `7.4.5.Final`; Flyway `12.4.0`; Micrometer `1.17.1`; OpenTelemetry `1.62.0`; Testcontainers `2.0.5`; JUnit Jupiter `6.0.3`; Mockito `5.23.0` | Published managed coordinate tables. These substantial persistence/observability/test stack changes require actual graph and runtime validation. Maven plugin versions are parent-POM/plugin-management data, not fully recorded by the dependency-coordinate appendix; exact candidate plugin versions remain unresolved pending successful parent POM retrieval. |

Boot 4 publishes distinct Maven controls: `jackson-bom.version` manages Jackson 3 and `jackson-2-bom.version` manages Jackson 2. The [Boot JSON documentation](https://docs.spring.io/spring-boot/4.0/reference/features/json.html) names the transitional Jackson 2 module `spring-boot-jackson2`, marks Jackson 2 auto-configuration deprecated, and says Jackson 3 is preferred/default. When both stacks exist, Spring MVC's preferred mapper is controlled by `spring.http.converters.preferred-json-mapper`; the resolved graph alone cannot prove runtime mapper selection. Do not carry the Boot 3 interpretation of `jackson-bom.version=2.21.7` into Boot 4. Any transitional Jackson 2 experiment must use `jackson-2-bom.version` and actual path-by-path graph validation.

The five FasterXML advisory matrices yield these patched floors (release lines are separate; values are not comparable across minor lines):

| CVE | Jackson 2 affected-component fixed versions | Jackson 3 affected-component fixed versions |
| --- | --- | --- |
| `CVE-2026-68497` | `2.18.10`, `2.21.6`, `2.22.2` | `3.1.6`, `3.2.2` |
| `CVE-2026-89407` | `2.18.11`, `2.21.7`, `2.22.3` | `3.1.7`, `3.2.2` |
| `CVE-2026-89425` | `2.18.11`, `2.21.7`, `2.22.3` | `3.1.7`, `3.2.3` |
| `CVE-2026-91776` | `2.18.11`, `2.21.7`, `2.22.3` | `3.1.7`, `3.2.3` |
| `CVE-2026-91777` | `2.18.11`, `2.21.7`, `2.22.3` | `3.1.7`, `3.2.3` |

Primary advisory sources: [GHSA-q4xh-88c3-wmh7](https://github.com/FasterXML/jackson-databind/security/advisories/GHSA-q4xh-88c3-wmh7), [GHSA-p6pp-m3f8-5c89](https://github.com/FasterXML/jackson-core/security/advisories/GHSA-p6pp-m3f8-5c89), [GHSA-7hhh-6rmp-j9qf](https://github.com/FasterXML/jackson-core/security/advisories/GHSA-7hhh-6rmp-j9qf), [GHSA-wv8q-qhhj-9h54](https://github.com/FasterXML/jackson-databind/security/advisories/GHSA-wv8q-qhhj-9h54), and [GHSA-cxp5-3px4-pw24](https://github.com/FasterXML/jackson-databind/security/advisories/GHSA-cxp5-3px4-pw24). These are advisory facts, not proof that every listed artifact is present in either candidate graph. The Boot defaults Jackson 3 `3.1.5` and Jackson 2 core/databind `2.21.5` do not pass the all-five floor check. Jackson 3 `3.1.7` is the least common fixed candidate line observed across these advisories; any release-line exception/artifact still needs graph validation. A Jackson 2 route must keep every present Jackson 2 component at an applicable fixed version; no per-module pins or overrides are accepted.

Migration-coordinate facts from the [Boot 4 migration guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide): use `spring-boot-starter-webmvc` for MVC; Identity's OAuth2 resource-server starter maps to `spring-boot-starter-security-oauth2-resource-server`; Flyway integration is represented by `spring-boot-starter-flyway`; the compatibility test option is `spring-boot-starter-test-classic` and security test support is a separate starter. The Boot managed-coordinate pages include the old `spring-boot-starter-web` for compatibility; do not mistake its listing for the migration guide's preferred replacement. `springdoc` 3.0.3 release notes report it was built against Boot 4.0.5; 3.1.1 is in the 3.1 release line for Boot 4.1. The [springdoc versioning guidance](https://github.com/springdoc/springdoc-openapi#versioning) matches major lines, but neither establishes exact patch compatibility with these candidates. In particular, the [3.1.1 Jackson/swagger-core issue](https://github.com/springdoc/springdoc-openapi/issues/3373) reports swagger-core built against Jackson 2.22.1 while Boot 4.1's BOM manages Jackson 2 at 2.21.5; the report concerns Gradle resolution and is a risk signal, not a Maven finding. Actual Maven graph is required.

Task 3 outcome: primary sources and the published candidate parent/BOMs now establish exact release, managed dependency, property, and plugin facts. The springdoc releases declare same-minor Boot support (`3.0.3` was built with Boot `4.0.5`; `3.1.1` release notes update to Boot `4.1.0`), not an explicit patch-by-patch certification for Boot `4.0.8` or `4.1.1`. The actual Maven graphs resolve without conflict, but this does not establish OpenAPI runtime compatibility. No Boot 4 product code was built or run.

## Task 4 — disposable Maven effective graphs and convergence

Disposable probe root: `C:\Users\ADMIN\AppData\Local\Temp\spring-phase0-18cda4181e584a51b6a2df50aa2521c8\candidate-matrix`; the isolated local Maven repository was `<temp>\m2`. Maven Central access was explicitly enabled for these read-only downloads. Twelve disposable POMs were generated from the Identity, relational-template and gateway-template POMs, using the Boot migration-guide coordinates, the candidate springdoc version, removal of the old Tomcat 10.1 property, Jackson 3 `3.1.7`, Jackson 2 `2.21.7`, and (for the transitional variant) the `spring-boot-jackson2` module. The repository Maven Wrapper `3.9.16` and Java `21.0.10` were used. These are graph probes only: no project source or tests were copied, compiled, or run; generated service destinations and tracked inputs were untouched.

For every candidate × JSON strategy × POM shape, both `help:effective-pom` and `dependency:tree -Dverbose` returned exit 0. A temporary `dependencyConvergence` rule was inserted into the existing `enforce-production-baseline` execution and that named Enforcer execution passed 12/12. Reports are stored only in the temp root as `effective-pom.xml`, `dependency-tree.txt`, and `enforcer-convergence.log`; the first incomplete Identity scratch POM and failed direct-CLI Enforcer invocation are not counted as results.

| Candidate / strategy | Identity | Relational template | Gateway template | Key resolved graph evidence |
| --- | --- | --- | --- | --- |
| Boot `4.0.8` / Jackson 3 | effective POM + tree + convergence PASS | PASS | PASS | Framework / `spring-webmvc` `7.0.9`; Tomcat embed `11.0.24`; Jackson 3 core/databind `3.1.7`; all present Jackson 2 core/databind/dataformat/datatype artifacts `2.21.7`, with annotations `2.21` (Boot BOM exception, not one of the advised affected components); Identity springdoc `3.0.3` / swagger-core `2.2.47`; Hibernate `7.2.24.Final`; Flyway `11.14.1`; Micrometer `1.16.7`; OTel `1.55.0`; Testcontainers `2.0.5`. |
| Boot `4.0.8` / Jackson 2 transitional | PASS | PASS | PASS | Same Boot-managed Framework/Tomcat and patched Jackson graph; added `org.springframework.boot:spring-boot-jackson2`; Boot MVC still includes Jackson 3 `3.1.7`, so mapper preference must be set/tested at runtime. |
| Boot `4.1.1` / Jackson 3 | PASS | PASS | PASS | Framework / `spring-webmvc` `7.0.9`; Tomcat embed `11.0.24`; Jackson 3 core/databind `3.1.7`; present Jackson 2 core/databind/dataformat/datatype artifacts `2.21.7`, annotations `2.21`; Identity springdoc `3.1.1` / swagger-core `2.2.55`; Hibernate `7.4.5.Final`; Flyway `12.4.0`; Micrometer `1.17.1`; OTel `1.62.0`; Testcontainers `2.0.5`. |
| Boot `4.1.1` / Jackson 2 transitional | PASS | PASS | PASS | Same managed/patched graph; added `spring-boot-jackson2`; Jackson 3 remains present and mapper selection is runtime-unverified. |

Across all 12 trees, path-based assertions found every `org.springframework:spring-*` Framework module at `7.0.9`, all selected Tomcat embed modules at `11.0.24`, Jackson 3 modules at `3.1.7`, and all affected Jackson 2 module families at `2.21.7`. No older affected Jackson 2 core/databind/dataformat/datatype module was found; `jackson-annotations:2.21` is the distinct BOM-managed exception and is not a component in the five referenced FasterXML advisories. The standalone Servlet API did not appear as a resolved node in these service runtime trees; both Boot BOM coordinate tables manage `jakarta.servlet-api:6.1.0`, so record that as BOM metadata rather than claiming an installed runtime artifact. No direct Spring module version override or Tomcat 10.1 artifact/property remained in the candidate temp POMs/trees.

The separate dependency-convergence gate passed for each of the 12 graphs; the rule was run by the POM's existing named execution, not inferred from a clean tree. The project plugin versions retained from source are Enforcer `3.6.3`, JaCoCo `0.8.15`, and CycloneDX `2.9.2`. Candidate Boot parent/plugin-management effective POMs resolved:

| Managed plugin | Boot `4.0.8` | Boot `4.1.1` |
| --- | --- | --- |
| Maven compiler | `3.14.1` | `3.15.0` |
| Maven dependency | `3.9.0` | `3.10.0` |
| Maven Surefire / Failsafe | `3.5.6` / `3.5.6` | `3.5.6` / `3.5.6` |
| Maven JAR | `3.4.2` | `3.5.1` |
| Maven resources | `3.3.1` | `3.5.0` |
| Spring Boot Maven plugin | `4.0.8` | `4.1.1` |

Maven 3.9.16 successfully resolved the candidate parent POMs, transitive BOMs, plugin metadata, and all 12 dependency trees after the sandbox network download was explicitly allowed. A first temp-POM construction had four incorrect group/artifact coordinates; Maven rejected those before graph creation. The fixture was corrected in temp only, XML-validated, and the final 12 results above are from the corrected POM set. The initial network-denied attempt and the incorrect direct Enforcer CLI invocation are not counted as acceptance.

Security interpretation: based on the primary advisory component/range matrix recorded in Task 3, the resolved candidate graphs meet the fixed-version floors for the five prior Jackson CVEs while preserving the Boot BOM's annotations exception. This is a local dependency-graph assertion, not a scanner/SBOM result; the unchanged scanner must verify actual findings on an implementation candidate exact SHA. The two Spring target components resolve to upstream-fixed `spring-webmvc:7.0.9`, but no service image scan or application build was run.

`MAPPER_RUNTIME_UNVERIFIED` remains set for all strategies. Boot Jackson 3 migration has a concrete source integration item: Identity production/test code and the common template test use `com.fasterxml.jackson.*`; the Identity adapter injects a `com.fasterxml.jackson.databind.ObjectMapper`. The Jackson 3 strategy must port those direct usages and prove HTTP/serializer contracts. The Jackson 2 transitional graph preserves those API artifacts but contains both stacks; it must include the documented MVC mapper preference and requires an owner/date for the future removal of deprecated Jackson 2 auto-configuration. Neither strategy has product compile/runtime or `/v3/api-docs` behavior evidence.

## Task 5 — compatibility and future acceptance map (documentation/source inventory only)

| Area / affected shape | Repository evidence and candidate concern | Required future validation; current status |
| --- | --- | --- |
| MVC, validation, security, actuator (Identity + both templates; all five services) | `spring-boot-starter-web` in all three POM shapes; common controllers/advice, correlation filter and probe tests under `api/service-foundation/templates/common/`. All 12 candidate trees resolve Framework `7.0.9`, Tomcat `11.0.24`, and convergent dependency graphs. | Phase 1 baseline-first migration to MVC coordinate; compile, unit/Failsafe, HTTP/error/validation/security contract and actuator readiness checks on all five. Tree resolution is proven, application compatibility is not. |
| Identity OAuth2 and springdoc | Identity POM has resource-server starter and springdoc WebMVC API `2.9.0`; `/v3/api-docs` is not currently tested. Candidate 4.0.8 resolves springdoc `3.0.3`/swagger-core `2.2.47`; 4.1.1 resolves `3.1.1`/`2.2.55`; J2 graph is `2.21.7` under Maven for both. | Verify renamed security starter and filter behavior; retain exact Maven tree evidence, then run actual endpoint/security contracts and structural `/v3/api-docs` golden comparison. Exact patch runtime compatibility is open. |
| Servlet/Tomcat | All three source POM shapes set Tomcat `10.1.59`; every candidate tree resolves Tomcat embed `11.0.24`. Boot BOM manages Servlet API `6.1.0`, but standalone API is not present as a tree node. | Remove old override only in a separately authorized Phase 1; compile and smoke Identity/all generated services on managed Tomcat 11 / Servlet 6.1. Graph alignment is proven, service runtime behavior is not. |
| JSON and error contracts | Identity serializer and sample tests plus common template tests use `com.fasterxml.jackson.*`; the Identity production adapter injects Jackson 2 `ObjectMapper`. The 12 candidate trees keep J3 `3.1.7`; Identity and springdoc/Flyway also bring J2. | Phase 1 first adds missing golden assertions and captures unchanged Boot 3.5.16/Jackson 2.21.7 output. Recommended J3 path must port direct API usage and preserve JSON; compare event/HTTP JSON, ProblemDetail, malformed/validation responses, OpenAPI and selected MVC mapper. No product baseline was added in Phase 0. |
| Relational persistence (Identity + auction/bidding/billing generated) | Identity + relational template use JPA, PostgreSQL, Flyway and Testcontainers. Candidate trees resolve Hibernate/Flyway/Testcontainers by Boot line and pass convergence. | Maven verify and non-skipped Testcontainers PostgreSQL Failsafe per service; validate schema migrations and persistence behavior. Graph only; no compilation, test, or database execution. |
| Gateway | Gateway template is DB-free; registry maps only `realtime-gateway` to this shape. Candidate gateway tree has no database dependencies and resolves WebMVC/Tomcat/Jackson stacks. | Preserve no database dependency/container/config; Maven verify, named gateway Failsafe, technical-probe HTTP contract and DB-free smoke in isolated hosted CI. No generated destination created here. |
| Observability | Identity/templates use Micrometer tracing and direct OTel OTLP exporter. Candidate BOMs resolve Micrometer `1.16.7`/`1.17.1` and OTel `1.55.0`/`1.62.0` respectively. | Test emitted metrics/traces and ECS logging/correlation/redaction contracts; versions are graph-only, no exporter runtime was exercised. |
| Maven/build/SBOM | Maven Wrapper 3.9.16; compiler/enforcer/JaCoCo/CycloneDX and Failsafe configurations are in source POMs. Candidate effective POMs resolved plugin management (table above); dependency convergence passed 12/12. | Run full canonical `mvnw verify`, named Failsafe, CycloneDX schema/SBOM, image build/smoke and sanitized scanner/evidence on all five services. Effective POM/tree do not establish plugin executions or app compilation. |
| Generated-service provenance | Registry has four undelivered service destinations; existing owner rule permits generation only in isolated CI | Do not create them in this worktree. Generate only under current CI provenance rules and validate auction, bidding, billing, gateway on hosted final revision. |

Phase 1 must start on unchanged Boot 3.5.16/Jackson 2.21.7 with approved missing golden tests, baseline execution and retained reviewable output; only after baseline review may a later task change dependencies. Phase 2 hosted proof must be on one exact final execution revision and cover Identity plus all four generated services: canonical `mvnw verify`, named non-skipped Failsafe, effective graph assertions, service SBOM and dependency/container scans, relational PostgreSQL and database-free gateway smoke, schema-valid sanitized evidence, exact isolated result aggregation, and both Spring CVEs absent from applicable inventories. Existing workflow ownership and scanner/release policy remain unchanged; `release-policy` may remain blocked by unrelated findings. None of this is Phase 0 product validation.

## Task 6 closeout and effort ledger

The separate Spring estimate remains `40–78 h` engineering plus `12–20 h` reserve (`52–98 h` total authorization). Precise cumulative actual hours for Tasks 1–6 were not tracked; no value is inferred from elapsed calendar time, Git history, or run counts. The remaining planned Phase 1/2 work is still represented by the preliminary estimate and must stay within the separate authorization; request a new Owner ruling before exceeding `98 h` or the approved reserve.

**Phase 0 candidate recommendation (not implementation authorization):** test Boot `4.0.8` / Boot-managed Framework `7.0.9` / springdoc `3.0.3` / managed Tomcat `11.0.24` / Jackson 3 `3.1.7` first. This is an exact, graph-resolved candidate with `springdoc` and Boot on the same 4.0 maintenance line; Boot `4.0.8` is a published stable maintenance release, its parent/BOM graph is convergent in all three POM shapes, and its managed ecosystem version moves are narrower than Boot `4.1.1` (notably Hibernate `7.2.24` vs `7.4.5`, Flyway `11.14.1` vs `12.4.0`, Micrometer `1.16.7` vs `1.17.1`, OTel `1.55.0` vs `1.62.0`). This is an inference from the candidate graphs and same-minor `springdoc` release notes, not proof of runtime compatibility. Because the graph still contains Jackson 2 for Identity/springdoc/Flyway, set/verify Boot 4's `jackson-2-bom.version=2.21.7` as well as Jackson 3 `jackson-bom.version=3.1.7`; retain the annotations `2.21` BOM exception. Jackson 3 is preferred over transitional Jackson 2 because the latter is deprecated and would require a separately owned/date-bound Jackson 3 follow-up. The direct `com.fasterxml.jackson` production/test usages must be ported on the approved later implementation branch after the baseline artifact is captured.

Boot `4.1.1` / springdoc `3.1.1` remains a viable alternate graph, not the recommended first test: its tree and convergence pass, and Maven's J2 BOM property resolves swagger-core paths to `2.21.7`, but the upstream springdoc release notes describe Boot `4.1.0` and issue #3373 reports swagger-core's Jackson `2.22.1` build line in Gradle. The local Maven tree converges under the reviewed Jackson 2 BOM override; this does not prove binary/runtime behavior. Do not pick this alternate without the same Phase 1/2 contract and OpenAPI tests.

Phase 0 remains `PHASE0_BLOCKED` / not PASS for governance and runtime boundaries: Owner has approved only Phase 0, not Phase 1 scope/version/capacity; exact springdoc patch runtime compatibility, selected Jackson mapper, service compilation, golden behavior, scan/SBOM, container smoke, and final exact-SHA hosted evidence remain untested. The recommendation is a candidate for owner review, not a claim that either candidate has been adopted or that CVEs disappeared in a real service image. Document consistency checks passed; exact-SHA independent review remains required before finalizing this dossier. No Spring POM/source changes, product tests, vulnerability disposition, scanner changes, push, merge, deployment or release occurred. PR #21 remains Draft; release-policy remains BLOCKED.
