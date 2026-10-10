# T03 Maven/Jackson Remediation Design

Status: APPROVED WITH AMENDMENTS (2026-10-10). This document records the owner-approved design. It is not an implementation authorization, vulnerability disposition, or merge authorization.

## Purpose

Remediate the five Jackson 2.21.x HIGH findings in the preserved Identity service and the shared templates for the four generated services, while retaining the current Spring Boot 3 line. Separately assess (but do not perform) the Spring Boot 4 / Spring Framework 7 migration needed to address the two Spring Framework CRITICAL findings.

## Evidence and scope

The sanitized evidence from hosted run [37940367768](https://github.com/AkaDNT/auction-promax/actions/runs/37940367768), execution SHA `d914038b2deaaebc02f6f144c8592368ca726396`, reports Jackson 2.21.4 findings duplicated across dependency and container inventories for all five services. The unique Jackson CVEs are `CVE-2026-68497`, `CVE-2026-89407`, `CVE-2026-89425`, `CVE-2026-91776`, and `CVE-2026-91777`. The advisories identify 2.21.7 as a fixed 2.21.x release for the latter four; 2.21.7 is also above the reported 2.21.6 fix for `CVE-2026-68497`.

Affected Maven inputs:

- `api/service-foundation/templates/relational/pom.xml`
- `api/service-foundation/templates/gateway/pom.xml`
- `api/services/identity-profile-service/pom.xml`

The evidence also reports Spring Framework `spring-webmvc` 6.2.19 with `CVE-2026-47884` and `CVE-2026-47890`. The current remediation deliberately does not change Spring Boot 3.5.16 or Spring Framework 6.2.19. The public Spring Framework fixes are on 7.0.9; the 6.2.20 line is Enterprise Support only. Those two CRITICAL findings therefore remain open and keep policy BLOCKED until a separate compatible remediation or exact approved disposition exists.

References: [Jackson 2.21 release notes](https://github.com/FasterXML/jackson/wiki/Jackson-Release-2.21), [Jackson advisory](https://github.com/advisories/GHSA-cxp5-3px4-pw24), [Spring CVE-2026-47884](https://spring.io/security/cve-2026-47884/), [Spring CVE-2026-47890](https://spring.io/security/cve-2026-47890/).

## Design

Use the Spring Boot-managed Jackson BOM/version property, narrowly overriding the Jackson BOM to 2.21.7 in both generated-service template POMs and the preserved Identity POM. Each POM must declare `<jackson-bom.version>2.21.7</jackson-bom.version>` under its properties. Do not add individual Jackson module pins.

Before accepting the delta, verify all five services resolve Jackson dependencies according to the approved Jackson BOM 2.21.7, including BOM-defined version exceptions such as `jackson-annotations` 2.21. Reject vulnerable older Jackson core/databind modules, unmanaged conflicting versions, and any resolved graph that violates the approved BOM. Run canonical Maven `verify` and registered Failsafe suites for Identity and all four generated services in hosted CI; regenerate BOMs from resolved artifacts and verify all five Jackson CVEs are absent from dependency and image findings. Scanner policy and finding thresholds remain unchanged.

## Invariants and non-goals

- Preserve Spring Boot 3.5.16 and Spring Framework 6.2.19 in this delta; no Spring major/minor upgrade.
- Preserve service source, contracts, runtime behavior, and business/domain logic.
- Do not create dispositions or critical-risk acknowledgements.
- Do not weaken scanning, evidence validation, or fail-closed aggregation.
- Do not claim the two Spring CRITICAL findings are remediated by the Jackson update.

## Separate Spring Boot 4 assessment

The same remediation effort should produce a read-only compatibility assessment for Spring Boot 4 / Framework 7: inventory documented migration changes affecting the current templates and Identity service; compare them against current source/configuration and tests; identify likely API, dependency, plugin, test, and runtime changes; and estimate validation/capacity impact. It must record applicability and distinguish upstream advisory severity from the scanner's observed severity: Spring upstream classifies CVE-2026-47884 as Medium and CVE-2026-47890 as Low, while this repository's scanner evidence classifies both as Critical. This assessment must not lower scanner severity or change release policy, and must not edit application sources, POMs, or workflow behavior. A migration recommendation, implementation scope, and compatibility tradeoffs require a new owner decision. Until then, the Spring findings remain unresolved and release-policy must continue to block absent exact-match owner-approved dispositions.

Reference: [Spring Boot 4.0 Migration Guide](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide).

## Acceptance evidence

Acceptance requires exact-SHA independent review and hosted results proving effective Jackson alignment, Maven/Failsafe success for all five services, regenerated service BOMs, absence of the five Jackson CVEs from dependency and container findings, valid sanitized evidence, and exact-set aggregate verification. A policy PASS is not implied by this technical remediation alone: repository, container, and remaining Spring findings are evaluated independently under unchanged release policy.
