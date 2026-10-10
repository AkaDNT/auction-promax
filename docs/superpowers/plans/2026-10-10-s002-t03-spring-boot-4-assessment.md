# Read-only Spring Boot 4 / Framework 7 Compatibility Assessment

Status: READ-ONLY ASSESSMENT. No Boot 4 migration is authorized by this document.

## Decision summary

Do not attempt a Spring Boot 4 / Spring Framework 7 migration in the current Jackson remediation delta. The current code appears to have a tractable Java baseline (Java 21 is above Boot 4's documented minimum Java 17), but there are direct starter renames, a new modular dependency model, Framework 7 / Jakarta EE 11 / Servlet 6.1 baseline alignment, and explicit compatibility work for springdoc and the existing Tomcat override. The two reported Spring CVEs remain open and release-policy continues to evaluate their scanner severity unchanged.

## Repository inventory reviewed

The preserved Identity POM and both generated service template POMs use Spring Boot parent 3.5.16. Identity additionally declares the OAuth2 Resource Server starter, springdoc OpenAPI 2.9.0, PostgreSQL, Flyway, Micrometer tracing, the OpenTelemetry OTLP exporter, Testcontainers, and an explicit Tomcat 10.1.59 override. The relational template has JPA, PostgreSQL, Flyway, Micrometer tracing, OpenTelemetry, and Testcontainers; the gateway template is database-free. All use `spring-boot-starter-web`, `spring-boot-starter-validation`, `spring-boot-starter-security`, `spring-boot-starter-actuator`, and `spring-boot-starter-test` as applicable.

Read-only source search found no current `@MockBean`, `@SpyBean`, `org.springframework.lang`, `BootstrapRegistry`, `EnvironmentPostProcessor`, or `PropertyMapper` usage in Identity or templates. This narrows those documented migration concerns, but does not replace compilation/runtime validation on a future approved migration branch.

## Compatibility findings and likely work

| Area | Current repository evidence | Boot 4 / Framework 7 implication | Risk / follow-up |
| --- | --- | --- | --- |
| Java baseline | Java 21 compiler release and Maven enforcer `[21,22)` | Boot 4 requires Java 17+; Java 21 satisfies the documented minimum | Low, assuming the chosen Boot 4 maintenance release still supports this baseline |
| Web starter | `spring-boot-starter-web` in Identity and both templates | Migration guide maps it to `spring-boot-starter-webmvc` | Required POM updates; regenerate and test all four ephemeral services |
| OAuth2 starter | Identity has `spring-boot-starter-oauth2-resource-server` | Boot 4 renames it to `spring-boot-starter-security-oauth2-resource-server` | Required Identity POM change, then security-filter/runtime regression tests |
| Test starters | Current POMs use `spring-boot-starter-test`; current tests use `@SpringBootTest` and `@AutoConfigureMockMvc` | Boot 4's modularization changes test starter layout; the guide describes classic starters as a compatibility route and recommends eventual modularization | Determine whether classic transitional starter or focused test modules are needed; run every unit and Failsafe suite |
| Servlet / Tomcat | Current Identity has `tomcat.version=10.1.59`; all services use servlet MVC | Boot 4 is based on Jakarta EE 11 and requires Servlet 6.1; Boot 4's managed Tomcat line must replace or supersede the 10.1 override | High compatibility risk. Do not carry the Tomcat 10.1 override forward without an explicit Boot 4 BOM compatibility check |
| Spring Framework | Current scanner evidence identifies `spring-webmvc` 6.2.19; Boot 4 requires Framework 7.x | Boot 4 moves the framework line, and the reported OSS fixes for these findings are Framework 7.0.9 | Requires compatibility/build validation, not a direct version override in the current Boot 3 project |
| Jackson | Current approved remediation sets Boot 3's `jackson-bom.version` to 2.21.7 | Boot 4's migration guide describes a Jackson 3 transition and format-specific mapper changes; do not assume the Boot 3 BOM property remains the right control | Re-evaluate BOM/property semantics, application mapper behavior, and springdoc/OpenAPI compatibility on a dedicated branch |
| springdoc | Identity pins `springdoc-openapi-starter-webmvc-api` 2.9.0 | Boot 4 / Framework 7 compatibility is not established by the repository's current POM or this assessment | Verify official springdoc compatibility matrix and supported artifact/version before migration approval |
| Persistence / Flyway | Identity and relational template use JPA, PostgreSQL, Flyway core and database module | Boot 4 upgrades curated ecosystem versions and requires Framework/Jakarta alignment | Inspect Boot 4 managed dependency versions; run schema migration and Testcontainers relational suites |
| Observability | Micrometer tracing bridge and OpenTelemetry OTLP exporter are declared | Boot 4 moves curated observability dependencies; current direct exporter has no explicit version | Compare Boot 4 BOM and exporter compatibility; validate emitted traces/metrics without altering telemetry contracts |
| Configuration | Identity and templates use YAML, profiles, actuator health, security and datasource configuration | Boot 4 guide lists property renames/removals and offers a temporary properties migrator | Diff all `application*.yaml` against the Boot 4 configuration changelog; use migrator only in a dedicated experiment and remove it before acceptance |
| Build / supply chain | Maven Wrapper 3.9.16, enforcer/compiler/Jacoco/CycloneDX, Java 21 | Plugin compatibility and BOM schema/SBOM identity are outside the starter mapping alone | Verify full Maven verify/Failsafe, CycloneDX schema, image build/smoke, scanner and evidence gates in any future migration |

## Severity and applicability record

Hosted evidence from run [37940367768](https://github.com/AkaDNT/auction-promax/actions/runs/37940367768) reported `CVE-2026-47884` and `CVE-2026-47890` against Spring MVC 6.2.19 as Critical under the repository scanner policy. Spring's own advisories classify `CVE-2026-47884` as Medium and `CVE-2026-47890` as Low. This assessment records both classifications without choosing one over the other, changing scanner output, asserting non-applicability, or changing release policy. Applicability requires separate technical analysis against the actual configuration and usage; absent an approved remediation or exact-match disposition, the scanner findings continue to block release-policy.

References: [Spring CVE-2026-47884](https://spring.io/security/cve-2026-47884/), [Spring CVE-2026-47890](https://spring.io/security/cve-2026-47890/).

## Migration approach recommendation (not authorization)

If the owner later authorizes migration, use a separate delta based on the latest compatible Boot 3.5 baseline, first compare Boot 3.5 and the selected Boot 4 BOMs, then update starters/dependencies and configuration in one controlled service at a time. Test Identity and both template variants, including relational PostgreSQL and database-free gateway integration. Preserve service/domain contracts and existing fail-closed supply-chain gates. Do not add a Boot 4 property or dependency pin to the current remediation branch.

## Open owner decisions

- Whether to authorize a Boot 4 / Framework 7 migration delta and its capacity budget.
- Whether the migration should first use classic compatibility starters or immediately adopt focused modular starters.
- Whether the springdoc release line and explicit Tomcat override have a supported compatible combination.
- How the organization will resolve any residual scanner findings after the approved technical migration; this document creates no disposition.

## Sources

- [Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide)
- [Spring Boot 4.0 Reference — upgrade guidance](https://docs.spring.io/spring-boot/4.0/upgrading.html)
- [Spring Framework CVE-2026-47884](https://spring.io/security/cve-2026-47884/)
- [Spring Framework CVE-2026-47890](https://spring.io/security/cve-2026-47890/)
