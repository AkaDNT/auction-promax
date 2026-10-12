# S002 live tracing gate — stopped for owner support

Current disposition: the owner authorized diagnosis and a regression-backed correction, retaining CI-only source generation and renewed affected gates. The stop below is historical evidence. A reviewed local correction now passes actual sample trace checks; the new exact committed-candidate CI/freeze remains pending. No Phase 0 exit or merge is approved.

## Candidate and observed failure

Reviewed implementation: `7e5d497dda40161fdb0e913f8632d014e36c78de`, tree `b0782282db688d2bd4c6c3f86f1de74537b22cb4`. A fresh detached LF checkout used the approved separate native PostgreSQL 17.9 cluster on loopback port 55432; the legacy cluster was preserved.

Identity's actual HTTP walkthrough passed readiness, initial/replay 201 with the same RECORDED UUID, conflict 409, invalid-key 400 and denied actuator 403. Sample-filtered read-only persistence reached exactly `1|1|1|1|1|1`. HTTP and replay metrics were observed. Recorded/replayed/published/applied ECS log events carried the supplied correlation identifier. The final assertion failed with `SUPPLIED_CORRELATION_TRACE_MISSING`: the supplied W3C trace identifier was absent. Parsed recorded-event fields contained no trace/span field. This is a failed E03 observability gate, not a passing Phase 0 exit.

The private verifier and live logs are retained under ignored `.superpowers/sdd/s002-completion/`. It did not modify business code, publish payloads/keys/secrets, manufacture inbox duplicate delivery, or mutate outbox rows. The sample data remains intact.

## Investigation and limits

`application-local.yaml` enables tracing sampling probability 1.0 and ECS console logging. Identity's POM includes `micrometer-tracing-bridge-otel` and `opentelemetry-exporter-otlp`, but no Boot OpenTelemetry starter. The actual built JAR contains those third-party libraries and no Boot tracing/OpenTelemetry auto-configuration module. Both foundation templates and all four newly delivered services use the same dependency pattern.

Official Spring Boot documentation retrieved through Context7 identifies `spring-boot-starter-opentelemetry` as the tracing starter and explains Boot's tracing auto-configuration. This makes missing Boot 4 tracing modules the leading hypothesis; it has not yet been proven by a controlled failing regression and corrected runtime. Historical Sprint 001's supplied-W3C success remains historical and cannot satisfy this candidate. The existing encoder unit test sets synthetic MDC trace context; that does not establish live HTTP propagation.

Sources: [Boot tracing documentation](https://github.com/spring-projects/spring-boot/blob/v4.0.3/documentation/spring-boot-docs/src/docs/antora/modules/reference/pages/actuator/tracing.adoc), [Boot observability documentation](https://github.com/spring-projects/spring-boot/blob/v4.0.3/documentation/spring-boot-docs/src/docs/antora/modules/reference/pages/actuator/observability.adoc).

## Other actual final-candidate results

PR supply-chain [run 38233474526](https://github.com/AkaDNT/auction-promax/actions/runs/38233474526) succeeded, execution revision `3d01844afbd52e32900e9e160532508c72a12aed`. Downloaded sanitized inventories passed schema/revision/service readback and five-service aggregation: all committed source, smoke UP/linux-amd64, execution/policy PASS. Actual unit/Failsafe counts were Identity 118/10, each new relational service 19/6 and gateway 19/1, with zero failures/errors/skips. Each service retains four MEDIUM findings, zero CRITICAL/HIGH/UNKNOWN; the exact historical false positive remains visible. Hosted owning validators passed; offline readback is not a rebuilt-JAR validation claim.

Fresh locked contracts, fixture/registry governance, infra tool readiness, web lint/build and Identity supplemental native build passed on this candidate. Supplemental Identity reports contain four local integration tests, separately from canonical hosted tests. Matrix/transition/workflow fixtures and required-check regressions passed using their actual repository paths; an initial verifier invocation used a wrong matrix script path and failed before any tests, then was corrected. Markdown readback passed 42 changed files/103 local links.

The web push workflow's first attempt failed resolving Turbopack's internal Google font module. PR web and clean local builds passed; retry of the same push run 38233469200 succeeded on attempt 2. The failed attempt is retained, without a code or toolchain-pin change.

## Required owner support / decision

Do not accept E03, advance Phase 0, or merge this candidate while this gate fails. Per the owner's stop-on-important-error instruction, affected completion work is paused for owner input; unaffected evidence is retained. Recommended next scope: authorize diagnosis and a regression-backed correction of Boot 4 tracing wiring in Identity and the shared foundations, retaining five-service consistency, existing CI-only source generation/provenance rules and local no-collector safety. A runtime/dependency change invalidates the current implementation freeze and requires new exact-candidate builds, scans and live trace proof. No tracing fix, security relaxation, product logic change or production deployment has been performed.

## Authorized correction and current proof

The owner chose “Cho phép chẩn đoán và sửa tracing bằng regression test; giữ CI-only, chạy lại toàn bộ gate bị ảnh hưởng.” The correction replaces the direct bridge/exporter dependencies with Boot's managed OpenTelemetry starter in Identity, both foundation templates and four existing committed service POMs. These are curated edits of delivered code, not a local generator invocation. Original CI delivery records remain historical; this amendment does not claim their original hashes describe the revised files.

The final `HttpTracingIntegrationTest` starts the production `SpringApplication` on a random loopback port, without test tracing auto-configuration imports. A test-only servlet filter observes MDC during real requests without adding a production endpoint. It asserts supplied W3C extraction, a new server span and an independent following request. Controlled reversion to the original dependencies failed with trace context null (one failure, no errors); corrected direct-bootstrap execution and the full supplemental Identity suite passed.

One diagnostic attempt disabled global `management.tracing.export.enabled`: Boot 4.0.8's propagation configuration also became a no-op, generating a different trace. This failed attempt is retained. A later annotation-based test reversion failed on an absent Boot configuration class, so it was not accepted as final assertion-level RED proof. The final direct-bootstrap regression avoids that masking problem.

Local profiles disable only the OTLP tracing exporter (`management.tracing.export.otlp.enabled=false`), and individually disable the starter's OTLP metrics/logging exporters. The global tracing/propagation switch stays enabled. Names/defaults were checked against the actual 4.0.8 configuration metadata; tracing does not depend on a local collector.

The dirty corrected local-profile sample walkthrough passed the same HTTP/persistence/metrics checks and additionally parsed recorded/replayed ECS records with the exact supplied trace, plus correlation-linked published/applied records. No collector-export failure was observed. Its summary is explicitly labeled DIRTY_TRACING_CORRECTION and cannot substitute for the next frozen-candidate run. Owned sample processes were stopped; data was retained. Independent review found no issue and required renewed exact-candidate hosted/scanner and live evidence before closure.
