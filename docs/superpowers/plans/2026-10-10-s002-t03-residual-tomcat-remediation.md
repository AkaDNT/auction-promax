# T03 residual Tomcat remediation

Status: IMPLEMENTATION / LOCAL VERIFICATION. Owner delegated suitable remediation choices and continuation without routine approval questions. This bounded delta does not authorize merge, deployment, release, dispositions, scanner weakening or base-image identity changes.

## Evidence and selected approach

Published candidate `24c91dde29e622b0359d6dc358d6b7ce0da5b5a1`, PR run `38051421415`, execution revision `2fd3532090542fe26e8796897172ba1706b2753b` passed all five service legs and aggregate. Spring/Jackson targets are absent, but each service still has three distinct CRITICAL Tomcat findings in both dependency and container inventories: `CVE-2026-65182`, `CVE-2026-65905`, `CVE-2026-68525` on `tomcat-embed-core:11.0.24`. Scanner reports 11.0.25 as fixed for these targets.

Official Maven Central metadata inspected on 2026-10-10 lists no Boot 4.0 maintenance release beyond 4.0.8; Boot 4.1.1 also manages Tomcat 11.0.24. Moving to Boot 4.1 would therefore add ecosystem churn without resolving this Tomcat path. Apache's [Tomcat 11 security page](https://tomcat.apache.org/security-11.html) lists additional fixes in released 11.0.26 affecting 11.0.25. Maven Central confirms 11.0.26 is published. Select the same-line 11.0.26 patch rather than stopping at 11.0.25.

Use Boot's single `tomcat.version` property in Identity and both source template POMs. This supersedes the prior no-override rule only for this explicitly documented Tomcat 11.0 security patch; it does not reintroduce Tomcat 10.1 or permit per-module pins. All embed modules must resolve exactly to 11.0.26. Remove the temporary property when a reviewed Boot parent manages 11.0.26 or a later supported patch. [Boot Maven dependency customization](https://docs.spring.io/spring-boot/maven-plugin/using.html) permits property-based customization but warns that overrides can affect compatibility; this is not a claim of upstream Boot certification for the overridden tuple.

Keep Boot 4.0.8, Framework 7.0.9, both Jackson BOMs, springdoc, Java 21, plugins and all domain/security/JSON contracts unchanged. The exact dependency graph gate must reject nested Tomcat 11.0.24, 11.0.25, and the obsolete 10.1 line. Generated service destinations remain isolated-CI-only.

## Verification route

1. Update graph fixtures and POM contract expectations first; observe RED before implementation. Then update the three POM properties and exact graph validator; require graph/template/generated fixtures GREEN.
2. Run canonical Identity `mvnw verify`, golden JSON/OpenAPI, named non-skipped PostgreSQL Failsafe and complete actual graph assertion locally where executable. Run existing schema/SBOM/workflow/result/evidence regressions. Local PASS is not scanner target-absence evidence.
3. Commit only scoped files (plus previously audited Spring closeout docs), obtain independent exact-SHA review, then publish only the reviewed isolated candidate to Draft PR #21 under existing authorization.
4. Require all five hosted Maven/Failsafe, graph, SBOM/dependency/container scans, smoke, evidence and exact aggregate gates. Inspect sanitized inventories at the same final execution revision for all three Tomcat targets and retained absence of prior Spring/Jackson targets. Any implementation failure or target match prevents scoped acceptance.

Separate release-policy remains authoritative. Remaining OS/base-image or other findings may still keep it BLOCKED. Corretto exact-tag feasibility is separate: no tag substitution or package-manager upgrade is included here. A fresh read-only registry probe failed at Docker Hub anonymous-token transport; that is unavailable provenance, not proof of an eligible or ineligible digest. No image pin changed.

## Local results

Graph fixtures observed RED against the 11.0.24 validator and POM contract observed RED without the property. After correction: graph 17/17, template conformance 37/37, generated-source conformance 8/8 PASS. Owning workflow and root repository/mutation contracts PASS. Canonical Identity Maven verification completed BUILD SUCCESS with 118 unit and 10 registered PostgreSQL Failsafe tests, failures/errors/skips zero; JSON/OpenAPI golden assertions are unchanged. Local log is `api/services/identity-profile-service/target/tomcat-11.0.26-verify.log`. The complete actual dependency tree passes the graph validator, including core/el/websocket all at 11.0.26 (94 checked coordinates). CycloneDX schema trust and required-check/result/evidence fixtures (24/24) PASS. Hosted scanner target-absence is still pending. One combined command used root-relative Node paths from the service directory and returned MODULE_NOT_FOUND; the same suites passed when rerun from the repository root. No result is inferred from the incorrect invocation.
