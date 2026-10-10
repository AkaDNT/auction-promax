# T03 Spring remediation execution evidence

Status: BASELINE_VERIFIED_LOCAL; migration has not started. Owner's latest direction delegates selection and execution of the suitable remediation without further routine consultation. Selected candidate: Boot 4.0.8, managed Framework 7.0.9/Tomcat 11.0.24, springdoc 3.0.3, Jackson 3 BOM 3.1.7 and Jackson 2 BOM 2.21.7 for remaining transitives. No merge, deployment, release, disposition or policy weakening is authorized.

## Unchanged-dependency baseline — 2026-10-10

Base HEAD: `9fc0b7d2b9121aedbd0333b5d75407dd5fa111dd`. Source POMs still use Boot 3.5.16 and Jackson 2.21.7. Changes are test assertions, a reviewed OpenAPI fixture and planning/evidence documents only; production source, security configuration and dependencies are unchanged.

- Added exact stored-response/event bytes including null correlation, malformed ProblemDetail fields, technical response shape and denied docs/bearer-header behavior.
- Added actual `/v3/api-docs` generator coverage in an isolated test context with only test filters disabled. Production docs remain denied. The fixture includes both sample and technical operations. Only generated server addresses are normalized. The existing OpenAPI sample response declaration is 200 while actual sample HTTP success is 201; both baseline behaviors are retained, not silently corrected by migration.
- Missing OpenAPI fixture was observed RED; explicit capture wrote only under Maven `target`. Review caught that removing the entire servers array exceeded URL-only normalization. Corrected the test to replace only each server URL, retained the generated description, observed RED against the incomplete fixture and reran GREEN with the reviewed complete fixture. Reviewed fixture SHA-256 (current working-copy bytes): `a0265ad164c7478b17c80f63af92ee87cae25961fcc6a65a6e6465a3100767b5`. Normal test mode requires the tracked fixture and compares the full normalized JSON tree.
- Added shared-template exact technical success and malformed ProblemDetail assertions. No generated service destination was created locally.

Fresh canonical `mvnw verify` after the review corrections completed BUILD SUCCESS with 117 unit tests and 10 tests in `IdentityProfileServiceApplicationTestcontainersIT`, failures/errors/skips all zero. PostgreSQL 17.11 Testcontainers execution included bootstrap, roles, Flyway and sample/inbox/outbox flows. Toolchain: Maven Wrapper 3.9.16, Java 21.0.10; Docker Desktop server 29.4.1. Reviewable local log: `.superpowers/sdd/2026-10-10-s002-t03-spring-remediation-phase1/baseline-reviewed-verify.log`. Raw local test logs are not published as sanitized supply-chain evidence.

`node api/scripts/foundation/Test-ServiceConformance.mjs --templates`: PASS 36/36. `git diff --check`: PASS (expected autocrlf notices only). These are local baseline results, not Boot 4 validation or generated-service hosted proof. Independent baseline review and a scoped commit precede any migration dependency edit. PR #21 remains Draft; existing release-policy BLOCKED is not waived.
