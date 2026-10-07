# T02 — Deterministic two-variant service template: hướng dẫn tự chứa

> Execute task-by-task using the owner-approved direct sequential method in an isolated worktree; scoped independent review remains required. Steps use checkbox syntax. Agent skills are environment instructions, not project dependencies.

**Goal:** Tạo registry đóng và template relational/gateway có generator fail-closed, deterministic LF, không overwrite và không copy Identity business/sample.
**Architecture:** Node built-in modules thực hiện registry validation, literal token expansion, staging và conformance. Không shared runtime library, không root reactor. T02 chỉ giao source templates; T04/T05 mới commit generated services sau T03 artifact gates.
**Tech Stack:** Node 24.15.0; Java 21; Spring Boot 3.5.16; Maven Wrapper 3.3.4 / distribution 3.9.16; baseline image/plugin pins hiện hữu.
**Spec:** [Approved design](../specs/2026-10-05-s002-service-foundation-design.md).
**Parent:** [Sprint 002 plan](2026-10-05-s002-phase0-exit-and-service-foundation.md).

Status: T02_DETAIL_APPROVED_FOR_EXECUTION. Owner explicitly approved the amended detail plan and narrow Linux route on 2026-10-06: “Có. Mình duyệt route Linux hẹp và mở execution cho detail plan T02 đã amended”. Decision reference: OWNER-DECISION-2026-10-06-S002-T02-EXECUTION. This supersedes the earlier conditional GO; no merge authorization or observed T02 PASS is implied. Những source ở phụ lục là context hiện hữu nguyên file, không phải generated code đã chạy.

## 1. Published context và authority

Execution evidence: [2026-10-07 T02 log](2026-10-07-s002-t02-execution-log.md). Source acceptance is verified at 5184a62 by PR run 37603539934; publication/merge remain separate. Earlier bootstrap descriptions are historical.

PR18 prerequisite merge: `747e62552a3ecff08fcf0580a55c5b03099a36fc`, tree `2ab4b0023d74d288393644d695eceef7b78c29ef`; push runs 37409286415 / 37409286418 SUCCESS.

PR19 factual activation merge: `6459baf17ae8a88aeceb5d5d24bc0c601ba6868b`, parents PR18 merge và `13dc28d8b7651757ae0982e08dfdcb02f0b04dd8`; tree `f5ce08f4c4c1d5f8ffe3b69ae3abaffed01ad2ba`; push monorepo-required 37411870026 và supply-chain-verification 37411869987 SUCCESS. Public contents read-back xác nhận S002 / Phase0 / IN_PROGRESS; historical S001 COMPLETED/PUBLISHED_VERIFIED nguyên vẹn. Đây là observed prior read-back, không cam kết remote tip chưa thay đổi.

Initial planning checkout: D:/projects/auction-promax/.worktrees/s002-design, work/s002-foundation-design, HEAD `13dc28d8b7651757ae0982e08dfdcb02f0b04dd8`, cùng tree với published PR19. Execution preflight fetched/read back and fast-forwarded to PR19 merge `6459baf17ae8a88aeceb5d5d24bc0c601ba6868b`, unchanged tree; no reset/stash/overwrite of primary edits. Recheck root/branch/HEAD/status and published revision before resuming; this historical observation does not promise an unchanged remote tip.

Owner đã approve full parent execution: 72–114h engineering + 14–22h reserve, maximum136h; maximum4 engineering weeks; checkpoint forecast sau T03. T02 estimate10–16h chưa gồm owner/hosted wait. Không invent start/end dates; không sửa approval references để coi duration là calendar commitment.

## Global Constraints

- T02 không thay Identity source/migrations, không domain bid/billing/auction, không Cognito/PSP/AWS/Valkey/WebSocket behavior.
- No new generated service destination committed in T02. Temp generation là test artifact, không service delivery.
- Gateway tuyệt đối không PostgreSQL/JPA/JDBC/Flyway/Testcontainers PostgreSQL, database config/migration hoặc fake datastore readiness.
- No runtime library/package manager dependency mới cho generator; exact closed registry, no arbitrary paths/packages/db inputs.
- Không reset/drop database, ghi credentials thật, đổi protection, risk disposition, push/merge không được authorize.
- release-policy BLOCKED và compatibility DEFERRED_NO_PRODUCER_CONTRACT giữ nguyên.
- Source snapshot có CRLF/LF khác nhau; generated UTF8 no BOM, LF. Wrapper preservation nghĩa source/properties/version không đổi ngoài CRLF→LF được test; không tự thêm checksum không tồn tại.
- Existing wrapper properties không có distributionSha256Sum. Docker và PostgreSQL image có digest. Không gọi “wrapper download checksum verified” khi metadata không chứa checksum.
- Thiếu privilege cho symlink là NOT EXECUTED, không PASS; phải có Windows junction proof thực tế và Linux symlink evidence.
- Kế hoạch này không cấp merge authorization hoặc self-approve detail review.

## Review Focus

1. Destination đã tồn tại, kể cả empty/case-alias, phải untouched; publication collision không được replace.
2. Junction/symlink ở destination, ancestors hoặc template source không được escape; dangling links cũng reject.
3. Exception/process interruption không để published partial tree; cleanup không xóa destination hoặc sibling do người khác tạo.
4. Gateway template phải cấu hình Failsafe `**/GatewayNoDatastoreIT.java`; T02 kiểm tra selector và inventoried class statically, T05 chạy Maven và kiểm tra Failsafe XML để chứng minh execution không skip. Include hiện hữu Identity chỉ match TestcontainersIT không đủ; static PASS không phải runtime PASS.
5. DTO/error/log/architecture technical patterns phải bỏ mọi sample/domain import; empty package không thay deliberate rejection proof.

## 2. Files và responsibility

| Action | File | Responsibility |
| --- | --- | --- |
| Create | api/service-foundation/services.json | exact five service records, versioned schema |
| Create | api/service-foundation/template-files.json | complete ordered closed expansion/provenance/mode inventory |
| Create | api/service-foundation/README.md | generator usage, prerequisites, safety limits, no service delivery |
| Create | api/service-foundation/templates/common/ | independent build/wrapper/HTTP/security/log/architecture patterns |
| Create | api/service-foundation/templates/relational/ | datasource/Flyway/probe/bootstrap/relational IT only |
| Create | api/service-foundation/templates/gateway/ | database-free config and GatewayNoDatastoreIT |
| Create | api/scripts/foundation/Generate-Service.mjs | parse validated input, preflight, staged generation, CLI |
| Create | api/scripts/foundation/ServiceGeneratorCore.mjs | internal IO adapter, validation/render/staging/ownership checks |
| Create | api/scripts/foundation/ServiceTemplateConformance.mjs | reusable source conformance and mutation rejection |
| Create | api/scripts/foundation/Inspect-ServiceArtifacts.mjs | read-only sanitized orphan inspection; no automatic cleanup |
| Create | api/scripts/foundation/Test-ServiceHandoff.mjs | Identity baseline/byte checks and changed Markdown links |
| Create | api/scripts/foundation/Test-ServiceRegistry.mjs | malformed closed registry regression fixtures |
| Create | api/scripts/foundation/Test-ServiceGenerator.mjs | safety/determinism/CLI fixtures, temp roots |
| Create | api/scripts/foundation/Test-ServiceConformance.mjs | --templates closed inventory/variant/negative assertions |
| Create — owner approved | api/scripts/foundation/Publish-ServiceDirectory.ps1 | narrow no-overwrite Directory.Move publisher |
| Create — owner approved | api/scripts/foundation/Test-PublishServiceDirectory.ps1 | collision versus operational failure and platform fixtures |
| Modify — owner-approved narrow hosted route | .github/workflows/monorepo-verification.yml | Linux foundation tests in existing unconditional lifecycle job; no T03 service matrix |
| Modify — owner-approved narrow hosted route | scripts/migration/Test-MonorepoRequiredChecks.mjs | workflow contract requires the three new test commands in lifecycle job |

T03 still owns service matrix implementation. The owner-approved narrow Linux route appends foundation tests to the existing unconditional lifecycle job (already a dependency of monorepo-required), without changing required check names, selection/skip rules or aggregate logic. Approval reference: OWNER-DECISION-2026-10-06-S002-T02-EXECUTION.

### Separately authorized prerequisite — source topology reconciliation

Discovered during T02 preflight and authorized separately by OWNER-DECISION-2026-10-06-S002-TOPOLOGY-RECONCILIATION. This source-only prerequisite is now committed locally as `c8a00ca395aa6fb55fe6e51827a1b90bda469450`; it is not the published PR19 baseline or T02 template delivery. Scope and observed RED/GREEN are recorded in [reconciliation log](2026-10-06-s002-topology-reconciliation-log.md).

| Action | File | Responsibility |
| --- | --- | --- |
| Create | api/scripts/LocalDbTopology.psm1 | fixed eight-target tooling metadata; no database connection |
| Create | api/scripts/Test-LocalDbTopology.ps1 | exact mappings and bootstrap/verifier consumer regression; metadata-only proof |
| Modify | api/scripts/local-db-bootstrap.ps1 | consume shared fixed target metadata |
| Modify | api/scripts/local-db-verify.ps1 | consume the same fixed target metadata |
| Modify | api/scripts/local-db-status.ps1 | reconciled diagnostic target names |
| Modify | api/infra/local/postgres/bootstrap.sql | reconciled target/role/schema identifiers; preserve privilege policy |
| Modify | api/infra/local/postgres/verify-isolation.sql | reconciled diagnostic identifiers |
| Modify | api/.env.local.example | placeholder-only Bidding/Billing mappings |
| Modify | api/infra/local/postgres/README.md | legacy-state STOP and data-preservation boundary |
| Create | docs/superpowers/plans/2026-10-06-s002-topology-reconciliation-log.md | separate authorization, scope and observed evidence |

Reset/drop tooling and installed databases are outside this delta. Before registry work, verify this prerequisite's exact source scope and run `Test-LocalDbTopology.ps1` on approved Windows PowerShell 7 and 5.1 hosts without execution-policy bypass. These metadata tests are not native bootstrap/isolation proof and are not an additional command in the approved narrow Linux route.

## 3. Registry contract

Top-level proposed schema: `{schemaVersion:1, services:[...]}`; exact object keys only, duplicate ids reject.
Record keys: `id,variant,preserved,groupId,artifactId,version,packageName,entryClass,destination,database,testDatabase,schema,environmentPrefix`.
Preserved Identity remains readable for conformance; generation always fails SERVICE_PRESERVED.

| id | variant | package suffix | entry | database / test / schema / env prefix |
| --- | --- | --- | --- | --- |
| identity-profile-service | relational preserved | identityprofileservice | IdentityProfileServiceApplication | identity_db / identity_test_db / identity / IDENTITY |
| auction-service | relational | auctionservice | AuctionServiceApplication | auction_db / auction_test_db / auction / AUCTION |
| bidding-service | relational | biddingservice | BiddingServiceApplication | bidding_db / bidding_test_db / bidding / BIDDING |
| billing-service | relational | billingservice | BillingServiceApplication | billing_db / billing_test_db / billing / BILLING |
| realtime-gateway | gateway | realtimegateway | RealtimeGatewayApplication | null / null / null / null |

Package prefix com.auctionpromax, groupId com.auctionpromax, artifactId=id, version0.0.1-SNAPSHOT, destination=api/services/id.
Schema/env prefixes are approved technical mappings. Preflight found legacy transaction/payment names in committed bootstrap tooling and stopped. Owner approved source-only reconciliation on 2026-10-06 (OWNER-DECISION-2026-10-06-S002-TOPOLOGY-RECONCILIATION): the locally committed prerequisite delta listed in section 2 uses fixed LocalDbTopology.psm1 metadata, bootstrap/verifier consumers, status/diagnostic SQL and placeholder mappings for Bidding/Billing. This delta is not a published baseline. Native databases and credentials remain untouched; source agreement does not prove installed topology or isolation. Before any native bootstrap, inspect legacy state through a separately authorized read-only inventory and obtain a data-preservation/migration decision. Do not create alternate databases alongside legacy ones.

CLI accepts exactly `--service <new-registered-id>`; no --variant/--destination/--package/--database/--force. Unknown/repeated/missing options nonzero sanitized USAGE.
API `generateService({serviceId,repositoryRoot}) -> {serviceId,variant,files:string[]}`; no cwd fallback; root must exist/canonical, approved directory, no link ancestors. Files are ordinal-sorted destination-relative slash paths, no abs paths in success output.

## 4. Template inventory and tokens

Inventory proposed `{schemaVersion:1,files:[{source,destination,variants,mode,provenance}]}`.
Allowed variants relational/gateway via each entry's non-empty `variants` array. Sources must be under templates; source duplicates/casefold aliases are always rejected. Destination reuse is allowed only where entries' variant sets are disjoint (for example, separate relational/gateway `pom.xml` sources at the same output path); duplicate or casefold-colliding destinations that can coexist in either selected variant are rejected, and each rendered output must remain unique. This user ruling preserves the approved output tree layout. Reserved Windows names, trailing dot/space, drive/UNC, traversal, backslash, ADS and link paths reject. Mode only0644 or0755; mvnw0755, remaining0644. Windows execute proof belongs Linux fixture.
Each selected source must be regular UTF8 text, no BOM/binary, no unexpected unlisted source. Template complete enumeration must match inventory, not recursive-copy whatever is present.

Allowed literal tokens only:
`__SERVICE_ID__, __PACKAGE_NAME__, __PACKAGE_PATH__, __ENTRY_CLASS__, __DB_NAME__, __TEST_DB_NAME__, __SCHEMA_NAME__, __ENV_PREFIX__`.
Gateway does not consume DB tokens; registry null cannot be rendered as string null. Never eval/new Function/PowerShell template expression. Reject unknown/unexpanded tokens and unsafe replacement values. User decisions on 2026-10-07 allow exactly the Maven Wrapper's native `__MVNW_ARG0_NAME__`, `__MVNW_CMD__`, and inert unused `__MVNW_ERROR__` placeholders to remain verbatim in the inventoried `templates/common/mvnw.cmd` only; no other template may preserve them or any unknown token. Wrapper contents and generated output paths remain unchanged except CRLF-to-LF normalization.

Complete common destinations:

- pom.xml, mvnw, mvnw.cmd, .mvn/wrapper/maven-wrapper.properties, Dockerfile, README.md.
- src/main/java/__PACKAGE_PATH__/__ENTRY_CLASS__.java.
- src/main/java/__PACKAGE_PATH__/configuration/TechnicalConfiguration.java.
- src/main/java/__PACKAGE_PATH__/adapter/in/web/CorrelationIdFilter.java.
- src/main/java/__PACKAGE_PATH__/adapter/in/web/TechnicalProblemAdvice.java.
- src/main/java/__PACKAGE_PATH__/adapter/in/web/TechnicalProbeController.java.
- src/main/resources/application.yaml, application-local.yaml (variant-specific content).
- src/test/java/__PACKAGE_PATH__/TechnicalHttpTest.java.
- src/test/java/__PACKAGE_PATH__/StructuredLoggingTest.java.
- src/test/java/__PACKAGE_PATH__/architecture/ArchitectureTest.java.

Owner-approved additional paths (needed because inherited controller uses separate DTOs and deliberate fixture classes):
`adapter/in/web/TechnicalValidationRequest.java`, `TechnicalValidationResponse.java` under main package;
test-only `com/auctionpromax/foundationfixtures/application/InvalidAdapterDependency.java`,
`InvalidFrameworkDependency.java`, `com/auctionpromax/foundationfixtures/adapter/in/InvalidInboundDependency.java`.
Add neutral test-only `src/test/java/com/auctionpromax/foundationfixtures/application/FoundationApplicationFixture.java`, a public empty interface. InvalidInboundDependency implements/imports this type solely to prove adapter.in → application rejection; never reuse CreateSampleService or another already-invalid fixture. Enumerate all four fixture files plus DTOs as first-class deterministic provenance-controlled inventory entries.

Relational adds `src/main/resources/db/migration/V1__create_technical_probe.sql`, `src/test/java/__PACKAGE_PATH__/RelationalBoundaryTestcontainersIT.java`, `src/test/resources/db/testcontainers/bootstrap.sql`.
Gateway adds `src/test/java/__PACKAGE_PATH__/GatewayNoDatastoreIT.java`; no migration/bootstrap.
No extra application-test profile unless explicitly reviewed inventory addition. IT @DynamicPropertySource provides ephemeral creds, no real .env.local copied.

## 5. Technical derivation: what to keep and reject

POM common explicit dependency set: web, validation, security, actuator, tracing-bridge-otel, opentelemetry-exporter-otlp; test starter-test, security-test, ArchUnit1.5.0.
Relational additionally JPA, PostgreSQL runtime42.7.12, Flyway core/database-postgresql; test Testcontainers junit-jupiter/postgresql.
T02 statically rejects prohibited direct gateway dependencies, datasource/Flyway configuration and relational inventory entries. T05 must verify the resolved transitive dependency graph excludes JDBC/JPA/PostgreSQL/Flyway. Source inspection alone cannot prove that graph. OAuth resource-server and springdoc are not required to claim Phase0 technical HTTP; do not silently copy Cognito/docs surfaces.
Keep Java21, Boot3.5.16, Tomcat10.1.59 security override and build plugin pins from source POM. No source change to Identity.
Default Failsafe relational includes **/*TestcontainersIT.java; gateway includes **/GatewayNoDatastoreIT.java. T02 statically validates selector and inventoried class. T04/T05 must run Maven and inspect Failsafe XML to prove actual execution with no required test skipped. Optional T02 temp Maven execution is separately logged, never inferred from static PASS. No skipITs=true, disabledWithoutDocker=true or fallback H2.

Health liveness/readiness via actual Spring probes; relational readiness includes db; gateway readinessState only. Local actuator exposure health,info,metrics; all other requests deny by default. Technical POST /internal/technical-baseline/validate safe DTO validation is technical only; no product-contract claim.
Generate DTO value NotBlank/Size(max100), response accepted/valueLength, matching the source DTO snapshot. Fixtures pin empty and 101-character values as rejected; 100-character nonblank value accepted.
TechnicalProblemAdvice adapts malformed/validation/unexpected handlers but removes IdempotencyKeyReusedException import/mapping. Fixed safe message/code/type/correlationId, never exception/payload dump.
Unexpected500 route exists only in test configuration/controller, never production deliberate-throw endpoint.
Correlation filter accepts canonical bounded header, generates fallback UUID, cleans/restores scoped MDC; regression tests absent/matching/different prior MDC plus exceptional chain. Existing Identity removes correlation; proposed template preserves prior value rather than mutating Identity.
ECS logging uses MDC as sole correlationId source; fluent fields event/valueLength, never duplicate correlation field or raw DTO. T02 supplies a real StructuredLogEncoder test with null/matching/different outer correlation, strict duplicate JSON-key detection and no serialization error; source conformance checks its construction, not runtime success. T04/T05 execute this generated test. ListAppender alone insufficient.
Architecture imports generated production packages only; empty domain/application optional empty-rule allowance is scoped. T02 supplies deliberate negative fixtures and assertions requiring AssertionError naming each offending fixture; T04/T05 execute them to prove rejection. No business stub added solely to satisfy nonempty ArchUnit; source inspection is not executed rejection evidence.
Relational probe table is technical only; migration uses runtimeRole placeholder, grants only probe DML/sequence operations, revokes PUBLIC, runtime must not read/alter flyway history. Never copy Identity V1–V4/sample flow, table names/events/idempotency business schemas.
Test bootstrap is ephemeral only; includes independent foreign DB denial case for cross-boundary proof. Installed/native database state remains untouched and may retain legacy transaction/payment names. Reconciled source mappings do not prove installed topology or isolation; native bootstrap requires separately authorized read-only inventory and a data-preservation/migration decision first.
T02 supplies source tests; real standalone canonical builds, PostgreSQL isolation/live proof and artifact scans are T04/T05 gates, not inferred from source conformance.

## 6. Publication safety — approved publisher contract

Staging sibling under validated api/services, random owned prefix; no writes to final destination until complete inventory rendered/verified. Lock open wx with owned handle; reject pre-existing lock, do not delete stale lock automatically. Verify all ancestors/source paths with lstat + realpath and bounded path-relative containment before creating stage; reject junction/reparse types, not just path strings. Recheck before publish.

Do NOT equate exists-check + Node rename with race-proof no-overwrite. Node fs rename exposes no portable no-replace directory flag. Plain rename must not be selected as an undocumented guarantee. Sources: [Node24 filesystem docs](https://nodejs.org/docs/latest-v24.x/api/fs.html).

Owner-approved backend: repository-owned PowerShell helper invokes System.IO.Directory.Move, no force/delete/copy fallback, no directory merge or retry by removing target. Microsoft documents existing-destination rejection, including empty directories on .NET Core3+. [Directory.Move](https://learn.microsoft.com/en-us/dotnet/api/system.io.directory.move).
PowerShell is now an explicit owner-approved generator prerequisite, not a Node-only claim. Publisher supports PowerShell7 on Windows/Linux and Windows PowerShell5.1 on Windows; test both Windows hosts without execution-policy bypass. Node owns validation/render/staging/orchestration; publisher only revalidates immediate publication assumptions, moves once and returns sanitized result. Known destination existence → DESTINATION_EXISTS; other IOException/IO/volume/process faults → PUBLICATION_FAILED. Never classify every IOException as collision.

PUBLISH-INV-01: canonical stage parent equals canonical destination parent, both validated api/services; stage is an owned ordinary directory and destination absent. PUBLISH-INV-02: neither stage nor immediate parent may be a mount/link/reparse redirection; stage and destination share this controlled filesystem boundary. Never stage under TEMP then move across volumes. Validate parent/ownership again immediately before move; mismatches fail before publication.

Tests must exercise destination materialized just before publication (empty, nonempty, file, link), second concurrent generator, staging ancestor changes, unequal parent rejection and operational failure distinct from collision. Directory.Move is not a new adversarial filesystem security guarantee; actual Windows/Linux behavior must be executed.

Linux proof route: owner-approved extension of the existing lifecycle job on ubuntu-24.04 keeps pinned checkout/setup-node, persist-credentials false and api/.nvmrc; append sequential `node api/scripts/foundation/Test-ServiceGenerator.mjs`, `node api/scripts/foundation/Test-ServiceConformance.mjs --templates`, and `pwsh -NoProfile -NonInteractive -File api/scripts/foundation/Test-PublishServiceDirectory.ps1`. Bash run blocks fail on first error. Require actual Linux symlink, publisher collision and stat modes; unavailable fixture fails hosted acceptance. Add workflow contract assertions for these commands. No downloads of untrusted publisher tools, no new service matrix. Reassess the existing 10-minute timeout from actual execution if insufficient; no silent gate removal.

Local Windows implementation may be GREEN while Linux publication safety is PENDING_HOSTED_PROOF. T02 cross-platform acceptance/DONE requires protected Linux execution and exact revision/run identity; never report cross-platform PASS from Windows. If the approved route is unavailable at execution time, stop at local gate rather than starting T03 as though T02 were done.
Threat boundary: controlled isolated local workspace, not arbitrary hostile filesystem process. If requirement is adversarial TOCTOU immunity, stop for stronger native-handle design; lock only coordinates cooperating generators.
Ordinary failure removes only owned validated stage/lock, never target. Hard termination before publication may retain owned orphan stage, destination absent; after publication tree must be complete. Orphan detection reports paths sanitized, cleanup owner-scoped and explicit. Crash-durability/fsync power-loss guarantee is not claimed.

Error codes: USAGE, INPUT_INVALID, REGISTRY_INVALID, INVENTORY_INVALID, SERVICE_UNKNOWN, SERVICE_PRESERVED, VARIANT_MISMATCH, PATH_UNSAFE, LINK_REJECTED, DESTINATION_EXISTS, TOKEN_UNKNOWN, TOKEN_UNRESOLVED, PUBLISH_BACKEND_UNAVAILABLE, GENERATION_INTERRUPTED, PUBLICATION_FAILED.
All expected CLI errors output codes only; no credentials, environment dump or workstation absolute path.

## 7. TDD execution steps

### T02-A — Preflight / safety feasibility

- [x] Read root/branch/HEAD/status and current published revision. Verify no services other than Identity exist; hash Identity full tracked inventory before work.
- [x] Run S002 repository/fixtures, T09 complete/closeout, existing required-check/workflow contracts with immediate exit checks; unrelated baseline failure diagnose first.
- [x] Verify the recorded publisher/DTO/fixture and narrow Linux route approval under OWNER-DECISION-2026-10-06-S002-T02-EXECUTION; do not request the same execution approval again. Preserve DIRECT_SEQUENTIAL_ISOLATED_WORKTREE and scoped review.
- [x] Verify the separately authorized topology prerequisite against section 2 and its reconciliation log; record metadata regression results separately from template and native database evidence.
- [x] Add platform publication fixture first; verify destination-created race rejection preserves complete sentinel hashes. If unavailable on current platform, STOP with command/exit/platform/source code/diff and missing prerequisite; no pretend PASS.

### T02-B — Registry / deterministic inventory

- [x] Write strict-registry fixtures exact five ids, unknown fields/duplicates/db mismatch/preservedIdentity; missing module is bootstrap RED only.
- [x] Implement strict records and inventory validation then prove behavioral RED/GREEN for malformed registry injected into isolated fixture repo.
- [x] Add deterministicLfOutput fixture using two separate temporary roots, no clocks/random IDs in generated file content; assert identical sorted path→SHA256 maps, all bytes no CR/no BOM/no unresolved token.
- [x] Add generatedFileModesMatchInventory RED: POSIX actual stat mode & 0o777 must equal 0o755 for mvnw and 0o644 for every other file in both generated variants. Implementation applies explicit chmod after writes before stage verification/publication; hostile umask must not change final modes. Conformance rejects missing/unknown mode, mvnw other than0755 and unauthorized non-mvnw0755. Windows proves inventory semantics only and reports POSIX mode proof unavailable; protected Linux run is mandatory for actual executable bits.
- [x] Add unknownIdNoWrites, variantMismatchNoWrites, traversalNoWrites, duplicate/case-collision inventory and source link rejection; snapshot tree before/after rejection.
- [x] Implement minimal literal renderer, no runtime dependency/eval.

Example proposal assertions, not existing tests:

```javascript
const a = generateService({serviceId: 'auction-service', repositoryRoot: fixtureA});
const b = generateService({serviceId: 'auction-service', repositoryRoot: fixtureB});
assert.equal(a.variant, 'relational');
assert.deepEqual(a.files, b.files);
assert.deepEqual(hashInventory(fixtureA, a.files), hashInventory(fixtureB, b.files));
assert.throws(() => generateService({
  serviceId: 'identity-profile-service', repositoryRoot: fixtureA,
}), {message: 'SERVICE_PRESERVED'});
```

Test-file local hashInventory(root,files) joins root/api/services/registered-id and hashes actual bytes; service identity part of fixture root setup, not inferred from filenames. Use node:crypto, no package install.

### T02-C — Destination and interruption safety

- [x] existingDestinationUnchanged: empty/nonempty/file/case-alias; sentinel hash identical, no added files.
- [x] linkedDestinationRejected: destination symlink/dangling symlink, api/services linked ancestor, repository ancestor link, template-source link; Windows actual junction and Unix symlink. Report unavailable capabilities explicitly.
- [x] interruptedGenerationNoPublishedPartialTree: throw during render, stage write, before publish; subprocess termination while staged; assert target absent, only owned stage possible. After publish target must exactly match inventory.
- [x] Race fixture creates destination after preflight, before publish; concurrent generator completes once or rejects safely, no overwrites or mixed inventories.
- [x] CLI run from foreign cwd still resolves fixed module-root repository; unknown/duplicate arguments do not create stage. Missing backend fails before final writes.
- [x] Minimal implementation only after failure proves intended behavior. Use internal testable IO adapter, not public --unsafe/test flags or process-global hook.

### T02-D — Variant source / conformance

- [x] Write --templates conformance RED for absent/wrong wrapper pin, missing selected path, extra source, unresolved token, gateway relational dependency/config and missing gateway Failsafe include.
- [x] Construct common technical adapters using snapshots below; explicitly remove sample-only imports/security endpoints/config.
- [x] Add relational probe/bootstrap/IT patterns and gateway no-datastore IT; maintain exact registered database names.
- [x] Supply test-scope deliberate forbidden-import fixtures and ArchitectureTest assertions requiring AssertionError naming the offending fixture; T02 statically checks wiring, T04/T05 must observe executed rejection.
- [x] Supply StructuredLoggingTest using real StructuredLogEncoder, strict duplicate JSON-key checks and absent/matching/different outer MDC cases; T02 checks source construction, T04/T05 execute it. Do not substitute ListAppender-only assertions or claim runtime PASS from source patterns.
- [x] Render every new service into test temp roots; conformance validates expanded source shape and inventory. Do not add actual service directories in worktree.
- [x] Source-only gate cannot prove Maven/runtime. Record T02 source template acceptance and carry standalone execution obligations into T04/T05; if template smoke builds are performed now, use temp output, exact versions and retain actual XML/logs separately.
- [x] Hash Identity again, assert unchanged tracked paths/bytes.

### T02-E — Review / publication handoff

- [x] Run both generator and templates suites, all lifecycle/CI regression commands, changed Markdown links, staged exact-path whitespace and trusted redacted scan.
- [x] Independent scoped review: five Review Focus inputs, concrete publication backend limitations, missing IT selection, no source→runtime claim.
- [x] Commit exact template/foundation/docs paths only after GREEN. Record local SHA/tree and observed tests; no generated services, targets, caches, .env.local, raw scanner reports or credentials staged. Source commit and tree are recorded in the execution log; protected Linux acceptance remains pending.
- [ ] If protected publication is requested, fresh remote/protection/check review + separate merge authorization. Never reuse PR18/19 merge authority.
- [x] Log pending/not-run gates rather than marking T02 delivered from a plan. Update parent checkbox/evidence only with observed completion.

## 8. Commands and results

T02 acceptance commands below are execution requirements; their observed results are recorded in the execution log. Publisher, generator and conformance are implemented. Historical missing-module bootstrap RED is not behavioral safety proof. Windows PS7 and PS5.1 publisher fixtures now have observed local PASS; Linux acceptance remains pending hosted execution.

```powershell
pwsh -NoProfile -NonInteractive -File api/scripts/foundation/Test-PublishServiceDirectory.ps1
if ($LASTEXITCODE -ne 0) { throw 'T02_PUBLISHER_FAILED' }
# Windows-only additional proof; do not run this command on Linux.
powershell.exe -NoProfile -NonInteractive -File api/scripts/foundation/Test-PublishServiceDirectory.ps1
if ($LASTEXITCODE -ne 0) { throw 'T02_PUBLISHER_PS51_FAILED' }
node api/scripts/foundation/Test-ServiceGenerator.mjs
if ($LASTEXITCODE -ne 0) { throw 'T02_GENERATOR_FAILED' }
node api/scripts/foundation/Test-ServiceConformance.mjs --templates
if ($LASTEXITCODE -ne 0) { throw 'T02_CONFORMANCE_FAILED' }
node api/scripts/decisions/Test-S002-Lifecycle.mjs
if ($LASTEXITCODE -ne 0) { throw 'LIFECYCLE_FIXTURES_FAILED' }
node api/scripts/decisions/Test-S002-Lifecycle.mjs --repository
if ($LASTEXITCODE -ne 0) { throw 'LIFECYCLE_REPOSITORY_FAILED' }
node api/scripts/decisions/Test-S001-T09-Decisions.mjs --require-complete --require-closeout
if ($LASTEXITCODE -ne 0) { throw 'S001_HISTORY_FAILED' }
node scripts/migration/Test-MonorepoRequiredChecks.mjs
if ($LASTEXITCODE -ne 0) { throw 'AGGREGATE_FAILED' }
node scripts/migration/Test-MonorepoWorkflowContracts.mjs --repository
if ($LASTEXITCODE -ne 0) { throw 'WORKFLOW_FAILED' }
git diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'STAGED_WHITESPACE_FAILED' }
```

Expected proposed tokens: SERVICE_DIRECTORY_PUBLISHER_FIXTURES_PASS, SERVICE_GENERATOR_FIXTURES_PASS, SERVICE_TEMPLATE_CONFORMANCE_PASS; nonzero for any unsafe/unknown state. Windows commands use approved installed executables, no ExecutionPolicy Bypass. Linux matrix omits powershell.exe and requires actual symlink/stat/publication proof. All fixtures count executed versus unavailable separately; required safety fixture unavailable prevents universal safety acceptance.
Do not run Generate-Service CLI into actual api/services for “quick test”. T04/T05 own real generation.

Existing YAML test tooling requires locked api/contracts dependencies; use existing npm ci only if missing, not dependency upgrade. Scan uses repository verified Gitleaks8.30.0 and existing contract route, never PATH substitute/policy override. Postmerge hosted evidence cannot be synthesized by temp tests.

## 9. Context reading guide

Phụ lục chứa đủ từng dòng source của các file trực tiếp dùng để suy ra build, wrappers, HTTP/security/errors, architecture fixtures, ECS formatter regression và relational test pattern, cùng workflow hiện tại. Không ellipsis hay excerpt. Một source vẫn import Identity sample types để cho thấy vì sao KHÔNG COPY WHOLESALE; không phải yêu cầu người đọc chase domain files để hiểu T02.
Test-only bootstrap passwords là intentional ephemeral fixture strings, không credentials thật; không đưa ra production.
Không cung cấp toàn bộ Identity domain/business vì T02 không consume/copy chúng. Không cung cấp source mới như thể tồn tại: inventory, generator, templates đều future work.
Full source dài hơn plan vì user yêu cầu self-contained từng dòng; appendix là evidence context, không proposed implementation transcript.

## 10. Self-review and handoff

Checked design against T02 boundaries: five ids, Identity preserved, two variants, deterministic LF, no-overwrite/link/interruption proof, safe technical adapters, future runtime gates, no runtime shared library. T03 consumes registry/destination/id/variant; T04/T05 consume generator and inventory; no tuple/API mismatch identified.
Publisher, DTO/architecture inventory and the exact narrow Linux route are owner-approved under OWNER-DECISION-2026-10-06-S002-T02-EXECUTION. Explicit POSIX chmod/stat fixtures, the static-versus-runtime evidence split and dedicated PS7/Windows5.1 publisher tests remain mandatory. The earlier conditional GO is superseded by the recorded owner decision, not by self-approval. Topology reconciliation is a separately authorized prerequisite delta; neither its metadata GREEN nor this plan amendment establishes T02 PASS, hosted proof or merge authority. Local completion evidence, source commit identities and remaining Linux obligations are recorded in the execution log above.
This document does not refresh historical parent/spec approval timestamps. Prior “activation pending” wording in committed preparation snapshots is superseded by PR19 read-back above; no extra lifecycle change needed for T02 planning.

## 11. Decision log amendment — variant-specific destination reuse

On 2026-10-07, the user explicitly decided: “Cho phép destination lặp chỉ giữa các biến thể loại trừ nhau; vẫn cấm trùng trong output của cùng một biến thể. Giữ nguyên cấu trúc file đầu ra.” This resolves the inventory ambiguity without adding output directories or changing registry destinations. Source paths remain globally unique; destination reuse is valid only for disjoint `variants` sets, with per-variant exact/case-fold collision rejection and a runtime selected-output uniqueness check. This is a user decision, not a new formal owner-decision reference, and does not alter T02 scope or completion gates.

## 12. Phụ lục source nguyên văn


### api/services/identity-profile-service/pom.xml

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```xml
<?xml version="1.0" encoding="UTF-8"?>

<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="
             http://maven.apache.org/POM/4.0.0
             https://maven.apache.org/xsd/maven-4.0.0.xsd">

    <modelVersion>4.0.0</modelVersion>

    <!--
        Spring Boot owns and aligns versions for Spring Framework,
        Spring Security, Hibernate, Flyway, PostgreSQL,
        Testcontainers, Micrometer and OpenTelemetry.
    -->
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.5.16</version>
        <relativePath/>
    </parent>

    <groupId>com.auctionpromax</groupId>
    <artifactId>identity-profile-service</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <packaging>jar</packaging>

    <name>identity-profile-service</name>
    <description>
        Application identity mapping, user profile, business roles,
        seller status and account restrictions
    </description>

    <properties>
        <!-- Runtime baseline -->
        <java.version>21</java.version>
        <maven.compiler.release>${java.version}</maven.compiler.release>

        <!-- Encoding -->
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <project.reporting.outputEncoding>UTF-8</project.reporting.outputEncoding>

        <!-- Dependencies not managed by Spring Boot -->
        <springdoc.version>2.9.0</springdoc.version>
        <archunit.version>1.5.0</archunit.version>

        <!-- Build and supply-chain plugins -->
        <maven-enforcer-plugin.version>3.6.3</maven-enforcer-plugin.version>
        <jacoco.version>0.8.15</jacoco.version>
        <cyclonedx-maven-plugin.version>2.9.2</cyclonedx-maven-plugin.version>

        <!-- Temporary security override until the Spring Boot BOM manages 42.7.12+. -->
        <postgresql.version>42.7.12</postgresql.version>

        <!-- Project Owner-approved Tomcat 10.1 security remediation; keep all managed embedded modules aligned. -->
        <tomcat.version>10.1.59</tomcat.version>
    </properties>

    <dependencies>

        <!-- ====================================================== -->
        <!-- HTTP API                                               -->
        <!-- ====================================================== -->

        <!--
            Spring MVC, Jackson, validation of HTTP requests,
            embedded Tomcat and RFC 9457 ProblemDetail support.
        -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- Jakarta Bean Validation: @Valid, @NotNull, @Size, etc. -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- ====================================================== -->
        <!-- Security                                               -->
        <!-- ====================================================== -->

        <!-- Authentication, authorization and method security -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>

        <!--
            Validate JWT access tokens issued by Amazon Cognito.
            This service is a Resource Server, not an OAuth client
            and not an Authorization Server.
        -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
        </dependency>

        <!-- ====================================================== -->
        <!-- Persistence                                            -->
        <!-- ====================================================== -->

        <!-- Spring Data JPA, Hibernate and transaction management -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>

        <!-- PostgreSQL JDBC driver -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- Flyway migration engine -->
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>

        <!-- PostgreSQL-specific Flyway support -->
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>

        <!-- ====================================================== -->
        <!-- API contract                                           -->
        <!-- ====================================================== -->

        <!--
            Generates /v3/api-docs without bundling Swagger UI.
            Keep the contract endpoint disabled or protected in
            production configuration.
        -->
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-api</artifactId>
            <version>${springdoc.version}</version>
        </dependency>

        <!-- ====================================================== -->
        <!-- Observability                                          -->
        <!-- ====================================================== -->

        <!-- Health, liveness, readiness, metrics and build info -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>

        <!-- Micrometer Observation to OpenTelemetry tracing -->
        <dependency>
            <groupId>io.micrometer</groupId>
            <artifactId>micrometer-tracing-bridge-otel</artifactId>
        </dependency>

        <!-- Export traces through OTLP to ADOT/OTel Collector -->
        <dependency>
            <groupId>io.opentelemetry</groupId>
            <artifactId>opentelemetry-exporter-otlp</artifactId>
        </dependency>

        <!-- ====================================================== -->
        <!-- Testing                                                -->
        <!-- ====================================================== -->

        <!-- JUnit Jupiter, AssertJ, Mockito, JSON testing, MockMvc -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>

        <!-- Spring Security test annotations and JWT helpers -->
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>

        <!-- Testcontainers JUnit 5 lifecycle integration -->
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>junit-jupiter</artifactId>
            <scope>test</scope>
        </dependency>

        <!-- Real PostgreSQL integration tests -->
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>postgresql</artifactId>
            <scope>test</scope>
        </dependency>

        <!-- Enforce hexagonal architecture boundaries -->
        <dependency>
            <groupId>com.tngtech.archunit</groupId>
            <artifactId>archunit-junit5</artifactId>
            <version>${archunit.version}</version>
            <scope>test</scope>
        </dependency>

    </dependencies>

    <build>
        <plugins>

            <!--
                Compile using the Java 21 API surface,
                retain parameter names for Spring/Jackson/OpenAPI.
            -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <configuration>
                    <release>${maven.compiler.release}</release>
                    <parameters>true</parameters>
                </configuration>
            </plugin>

            <!--
                Produce executable layered Spring Boot JAR.
                Layers improve Docker image caching.
            -->
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>

                <configuration>
                    <layers>
                        <enabled>true</enabled>
                    </layers>
                </configuration>

                <executions>
                    <execution>
                        <id>build-info</id>
                        <goals>
                            <goal>build-info</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>

            <!--
                Fail early when the build environment violates
                the approved Java/Maven baseline or uses snapshots.
            -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-enforcer-plugin</artifactId>
                <version>${maven-enforcer-plugin.version}</version>

                <executions>
                    <execution>
                        <id>enforce-production-baseline</id>
                        <goals>
                            <goal>enforce</goal>
                        </goals>

                        <configuration>
                            <rules>

                                <!-- Maven itself must run on Java 21 -->
                                <requireJavaVersion>
                                    <version>[21,22)</version>
                                    <message>
                                        This project must be built with Java 21.
                                    </message>
                                </requireJavaVersion>

                                <!-- Pin Maven through Maven Wrapper -->
                                <requireMavenVersion>
                                    <version>[3.9.9,4.0.0)</version>
                                    <message>
                                        Use the repository Maven Wrapper.
                                    </message>
                                </requireMavenVersion>

                                <!-- No SNAPSHOT libraries or parent -->
                                <requireReleaseDeps>
                                    <onlyWhenRelease>false</onlyWhenRelease>
                                    <failWhenParentIsSnapshot>true</failWhenParentIsSnapshot>
                                    <message>
                                        SNAPSHOT dependencies are prohibited.
                                    </message>
                                </requireReleaseDeps>

                                <!-- Reject duplicate dependency declarations -->
                                <banDuplicatePomDependencyVersions/>

                            </rules>
                        </configuration>
                    </execution>
                </executions>
            </plugin>

            <!--
                Unit tests:
                *Test.java through Maven Surefire.

                Integration tests:
                *IT.java / IT*.java through Maven Failsafe.
            -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-failsafe-plugin</artifactId>

                <!-- Integration verification is opt-in until its sprint task is active. -->
                <configuration>
                    <skipITs>false</skipITs>
                    <includes>
                        <include>**/*TestcontainersIT.java</include>
                    </includes>
                </configuration>

                <executions>
                    <execution>
                        <goals>
                            <goal>integration-test</goal>
                            <goal>verify</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>

            <!-- Generate test coverage report during verify -->
            <plugin>
                <groupId>org.jacoco</groupId>
                <artifactId>jacoco-maven-plugin</artifactId>
                <version>${jacoco.version}</version>

                <executions>
                    <execution>
                        <id>prepare-agent</id>
                        <goals>
                            <goal>prepare-agent</goal>
                        </goals>
                    </execution>

                    <execution>
                        <id>generate-coverage-report</id>
                        <phase>verify</phase>
                        <goals>
                            <goal>report</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>

            <!--
                Produce a CycloneDX SBOM for dependency and
                container security scanning.
            -->
            <plugin>
                <groupId>org.cyclonedx</groupId>
                <artifactId>cyclonedx-maven-plugin</artifactId>
                <version>${cyclonedx-maven-plugin.version}</version>

                <executions>
                    <execution>
                        <id>generate-sbom</id>
                        <phase>package</phase>
                        <goals>
                            <goal>makeBom</goal>
                        </goals>
                    </execution>
                </executions>

                <configuration>
                    <projectType>application</projectType>
                    <schemaVersion>1.6</schemaVersion>
                    <includeTestScope>false</includeTestScope>
                    <includeLicenseText>false</includeLicenseText>
                    <outputFormat>json</outputFormat>
                    <outputName>bom</outputName>
                    <skipAttach>false</skipAttach>
                </configuration>
            </plugin>

        </plugins>
    </build>

    <profiles>
        <profile>
            <id>it-local</id>
            <build>
                <plugins>
                    <plugin>
                        <groupId>org.apache.maven.plugins</groupId>
                        <artifactId>maven-failsafe-plugin</artifactId>
                        <configuration>
                            <skipITs>false</skipITs>
                            <systemPropertyVariables>
                                <spring.profiles.active>test-local</spring.profiles.active>
                            </systemPropertyVariables>
                            <includes combine.self="override">
                                <include>**/*LocalIT.java</include>
                            </includes>
                        </configuration>
                    </plugin>
                </plugins>
            </build>
        </profile>
    </profiles>

</project>
```

### api/services/identity-profile-service/Dockerfile

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```text
# syntax=docker/dockerfile:1
FROM docker.io/library/amazoncorretto:21.0.12-al2023-headless@sha256:82eb6e99cb91fb87f5a65a933750ae5bb23cab4ab396e4bba4a5b0b07dcd32ff

WORKDIR /app

COPY --chown=10001:10001 target/identity-profile-service-0.0.1-SNAPSHOT.jar /app/app.jar

USER 10001:10001

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

### api/services/identity-profile-service/.mvn/wrapper/maven-wrapper.properties

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```text
wrapperVersion=3.3.4
distributionType=only-script
distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.16/apache-maven-3.9.16-bin.zip
```

### api/services/identity-profile-service/mvnw

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```sh
#!/bin/sh
# ----------------------------------------------------------------------------
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
# ----------------------------------------------------------------------------

# ----------------------------------------------------------------------------
# Apache Maven Wrapper startup batch script, version 3.3.4
#
# Optional ENV vars
# -----------------
#   JAVA_HOME - location of a JDK home dir, required when download maven via java source
#   MVNW_REPOURL - repo url base for downloading maven distribution
#   MVNW_USERNAME/MVNW_PASSWORD - user and password for downloading maven
#   MVNW_VERBOSE - true: enable verbose log; debug: trace the mvnw script; others: silence the output
# ----------------------------------------------------------------------------

set -euf
[ "${MVNW_VERBOSE-}" != debug ] || set -x

# OS specific support.
native_path() { printf %s\\n "$1"; }
case "$(uname)" in
CYGWIN* | MINGW*)
  [ -z "${JAVA_HOME-}" ] || JAVA_HOME="$(cygpath --unix "$JAVA_HOME")"
  native_path() { cygpath --path --windows "$1"; }
  ;;
esac

# set JAVACMD and JAVACCMD
set_java_home() {
  # For Cygwin and MinGW, ensure paths are in Unix format before anything is touched
  if [ -n "${JAVA_HOME-}" ]; then
    if [ -x "$JAVA_HOME/jre/sh/java" ]; then
      # IBM's JDK on AIX uses strange locations for the executables
      JAVACMD="$JAVA_HOME/jre/sh/java"
      JAVACCMD="$JAVA_HOME/jre/sh/javac"
    else
      JAVACMD="$JAVA_HOME/bin/java"
      JAVACCMD="$JAVA_HOME/bin/javac"

      if [ ! -x "$JAVACMD" ] || [ ! -x "$JAVACCMD" ]; then
        echo "The JAVA_HOME environment variable is not defined correctly, so mvnw cannot run." >&2
        echo "JAVA_HOME is set to \"$JAVA_HOME\", but \"\$JAVA_HOME/bin/java\" or \"\$JAVA_HOME/bin/javac\" does not exist." >&2
        return 1
      fi
    fi
  else
    JAVACMD="$(
      'set' +e
      'unset' -f command 2>/dev/null
      'command' -v java
    )" || :
    JAVACCMD="$(
      'set' +e
      'unset' -f command 2>/dev/null
      'command' -v javac
    )" || :

    if [ ! -x "${JAVACMD-}" ] || [ ! -x "${JAVACCMD-}" ]; then
      echo "The java/javac command does not exist in PATH nor is JAVA_HOME set, so mvnw cannot run." >&2
      return 1
    fi
  fi
}

# hash string like Java String::hashCode
hash_string() {
  str="${1:-}" h=0
  while [ -n "$str" ]; do
    char="${str%"${str#?}"}"
    h=$(((h * 31 + $(LC_CTYPE=C printf %d "'$char")) % 4294967296))
    str="${str#?}"
  done
  printf %x\\n $h
}

verbose() { :; }
[ "${MVNW_VERBOSE-}" != true ] || verbose() { printf %s\\n "${1-}"; }

die() {
  printf %s\\n "$1" >&2
  exit 1
}

trim() {
  # MWRAPPER-139:
  #   Trims trailing and leading whitespace, carriage returns, tabs, and linefeeds.
  #   Needed for removing poorly interpreted newline sequences when running in more
  #   exotic environments such as mingw bash on Windows.
  printf "%s" "${1}" | tr -d '[:space:]'
}

scriptDir="$(dirname "$0")"
scriptName="$(basename "$0")"

# parse distributionUrl and optional distributionSha256Sum, requires .mvn/wrapper/maven-wrapper.properties
while IFS="=" read -r key value; do
  case "${key-}" in
  distributionUrl) distributionUrl=$(trim "${value-}") ;;
  distributionSha256Sum) distributionSha256Sum=$(trim "${value-}") ;;
  esac
done <"$scriptDir/.mvn/wrapper/maven-wrapper.properties"
[ -n "${distributionUrl-}" ] || die "cannot read distributionUrl property in $scriptDir/.mvn/wrapper/maven-wrapper.properties"

case "${distributionUrl##*/}" in
maven-mvnd-*bin.*)
  MVN_CMD=mvnd.sh _MVNW_REPO_PATTERN=/maven/mvnd/
  case "${PROCESSOR_ARCHITECTURE-}${PROCESSOR_ARCHITEW6432-}:$(uname -a)" in
  *AMD64:CYGWIN* | *AMD64:MINGW*) distributionPlatform=windows-amd64 ;;
  :Darwin*x86_64) distributionPlatform=darwin-amd64 ;;
  :Darwin*arm64) distributionPlatform=darwin-aarch64 ;;
  :Linux*x86_64*) distributionPlatform=linux-amd64 ;;
  *)
    echo "Cannot detect native platform for mvnd on $(uname)-$(uname -m), use pure java version" >&2
    distributionPlatform=linux-amd64
    ;;
  esac
  distributionUrl="${distributionUrl%-bin.*}-$distributionPlatform.zip"
  ;;
maven-mvnd-*) MVN_CMD=mvnd.sh _MVNW_REPO_PATTERN=/maven/mvnd/ ;;
*) MVN_CMD="mvn${scriptName#mvnw}" _MVNW_REPO_PATTERN=/org/apache/maven/ ;;
esac

# apply MVNW_REPOURL and calculate MAVEN_HOME
# maven home pattern: ~/.m2/wrapper/dists/{apache-maven-<version>,maven-mvnd-<version>-<platform>}/<hash>
[ -z "${MVNW_REPOURL-}" ] || distributionUrl="$MVNW_REPOURL$_MVNW_REPO_PATTERN${distributionUrl#*"$_MVNW_REPO_PATTERN"}"
distributionUrlName="${distributionUrl##*/}"
distributionUrlNameMain="${distributionUrlName%.*}"
distributionUrlNameMain="${distributionUrlNameMain%-bin}"
MAVEN_USER_HOME="${MAVEN_USER_HOME:-${HOME}/.m2}"
MAVEN_HOME="${MAVEN_USER_HOME}/wrapper/dists/${distributionUrlNameMain-}/$(hash_string "$distributionUrl")"

exec_maven() {
  unset MVNW_VERBOSE MVNW_USERNAME MVNW_PASSWORD MVNW_REPOURL || :
  exec "$MAVEN_HOME/bin/$MVN_CMD" "$@" || die "cannot exec $MAVEN_HOME/bin/$MVN_CMD"
}

if [ -d "$MAVEN_HOME" ]; then
  verbose "found existing MAVEN_HOME at $MAVEN_HOME"
  exec_maven "$@"
fi

case "${distributionUrl-}" in
*?-bin.zip | *?maven-mvnd-?*-?*.zip) ;;
*) die "distributionUrl is not valid, must match *-bin.zip or maven-mvnd-*.zip, but found '${distributionUrl-}'" ;;
esac

# prepare tmp dir
if TMP_DOWNLOAD_DIR="$(mktemp -d)" && [ -d "$TMP_DOWNLOAD_DIR" ]; then
  clean() { rm -rf -- "$TMP_DOWNLOAD_DIR"; }
  trap clean HUP INT TERM EXIT
else
  die "cannot create temp dir"
fi

mkdir -p -- "${MAVEN_HOME%/*}"

# Download and Install Apache Maven
verbose "Couldn't find MAVEN_HOME, downloading and installing it ..."
verbose "Downloading from: $distributionUrl"
verbose "Downloading to: $TMP_DOWNLOAD_DIR/$distributionUrlName"

# select .zip or .tar.gz
if ! command -v unzip >/dev/null; then
  distributionUrl="${distributionUrl%.zip}.tar.gz"
  distributionUrlName="${distributionUrl##*/}"
fi

# verbose opt
__MVNW_QUIET_WGET=--quiet __MVNW_QUIET_CURL=--silent __MVNW_QUIET_UNZIP=-q __MVNW_QUIET_TAR=''
[ "${MVNW_VERBOSE-}" != true ] || __MVNW_QUIET_WGET='' __MVNW_QUIET_CURL='' __MVNW_QUIET_UNZIP='' __MVNW_QUIET_TAR=v

# normalize http auth
case "${MVNW_PASSWORD:+has-password}" in
'') MVNW_USERNAME='' MVNW_PASSWORD='' ;;
has-password) [ -n "${MVNW_USERNAME-}" ] || MVNW_USERNAME='' MVNW_PASSWORD='' ;;
esac

if [ -z "${MVNW_USERNAME-}" ] && command -v wget >/dev/null; then
  verbose "Found wget ... using wget"
  wget ${__MVNW_QUIET_WGET:+"$__MVNW_QUIET_WGET"} "$distributionUrl" -O "$TMP_DOWNLOAD_DIR/$distributionUrlName" || die "wget: Failed to fetch $distributionUrl"
elif [ -z "${MVNW_USERNAME-}" ] && command -v curl >/dev/null; then
  verbose "Found curl ... using curl"
  curl ${__MVNW_QUIET_CURL:+"$__MVNW_QUIET_CURL"} -f -L -o "$TMP_DOWNLOAD_DIR/$distributionUrlName" "$distributionUrl" || die "curl: Failed to fetch $distributionUrl"
elif set_java_home; then
  verbose "Falling back to use Java to download"
  javaSource="$TMP_DOWNLOAD_DIR/Downloader.java"
  targetZip="$TMP_DOWNLOAD_DIR/$distributionUrlName"
  cat >"$javaSource" <<-END
	public class Downloader extends java.net.Authenticator
	{
	  protected java.net.PasswordAuthentication getPasswordAuthentication()
	  {
	    return new java.net.PasswordAuthentication( System.getenv( "MVNW_USERNAME" ), System.getenv( "MVNW_PASSWORD" ).toCharArray() );
	  }
	  public static void main( String[] args ) throws Exception
	  {
	    setDefault( new Downloader() );
	    java.nio.file.Files.copy( java.net.URI.create( args[0] ).toURL().openStream(), java.nio.file.Paths.get( args[1] ).toAbsolutePath().normalize() );
	  }
	}
	END
  # For Cygwin/MinGW, switch paths to Windows format before running javac and java
  verbose " - Compiling Downloader.java ..."
  "$(native_path "$JAVACCMD")" "$(native_path "$javaSource")" || die "Failed to compile Downloader.java"
  verbose " - Running Downloader.java ..."
  "$(native_path "$JAVACMD")" -cp "$(native_path "$TMP_DOWNLOAD_DIR")" Downloader "$distributionUrl" "$(native_path "$targetZip")"
fi

# If specified, validate the SHA-256 sum of the Maven distribution zip file
if [ -n "${distributionSha256Sum-}" ]; then
  distributionSha256Result=false
  if [ "$MVN_CMD" = mvnd.sh ]; then
    echo "Checksum validation is not supported for maven-mvnd." >&2
    echo "Please disable validation by removing 'distributionSha256Sum' from your maven-wrapper.properties." >&2
    exit 1
  elif command -v sha256sum >/dev/null; then
    if echo "$distributionSha256Sum  $TMP_DOWNLOAD_DIR/$distributionUrlName" | sha256sum -c - >/dev/null 2>&1; then
      distributionSha256Result=true
    fi
  elif command -v shasum >/dev/null; then
    if echo "$distributionSha256Sum  $TMP_DOWNLOAD_DIR/$distributionUrlName" | shasum -a 256 -c >/dev/null 2>&1; then
      distributionSha256Result=true
    fi
  else
    echo "Checksum validation was requested but neither 'sha256sum' or 'shasum' are available." >&2
    echo "Please install either command, or disable validation by removing 'distributionSha256Sum' from your maven-wrapper.properties." >&2
    exit 1
  fi
  if [ $distributionSha256Result = false ]; then
    echo "Error: Failed to validate Maven distribution SHA-256, your Maven distribution might be compromised." >&2
    echo "If you updated your Maven version, you need to update the specified distributionSha256Sum property." >&2
    exit 1
  fi
fi

# unzip and move
if command -v unzip >/dev/null; then
  unzip ${__MVNW_QUIET_UNZIP:+"$__MVNW_QUIET_UNZIP"} "$TMP_DOWNLOAD_DIR/$distributionUrlName" -d "$TMP_DOWNLOAD_DIR" || die "failed to unzip"
else
  tar xzf${__MVNW_QUIET_TAR:+"$__MVNW_QUIET_TAR"} "$TMP_DOWNLOAD_DIR/$distributionUrlName" -C "$TMP_DOWNLOAD_DIR" || die "failed to untar"
fi

# Find the actual extracted directory name (handles snapshots where filename != directory name)
actualDistributionDir=""

# First try the expected directory name (for regular distributions)
if [ -d "$TMP_DOWNLOAD_DIR/$distributionUrlNameMain" ]; then
  if [ -f "$TMP_DOWNLOAD_DIR/$distributionUrlNameMain/bin/$MVN_CMD" ]; then
    actualDistributionDir="$distributionUrlNameMain"
  fi
fi

# If not found, search for any directory with the Maven executable (for snapshots)
if [ -z "$actualDistributionDir" ]; then
  # enable globbing to iterate over items
  set +f
  for dir in "$TMP_DOWNLOAD_DIR"/*; do
    if [ -d "$dir" ]; then
      if [ -f "$dir/bin/$MVN_CMD" ]; then
        actualDistributionDir="$(basename "$dir")"
        break
      fi
    fi
  done
  set -f
fi

if [ -z "$actualDistributionDir" ]; then
  verbose "Contents of $TMP_DOWNLOAD_DIR:"
  verbose "$(ls -la "$TMP_DOWNLOAD_DIR")"
  die "Could not find Maven distribution directory in extracted archive"
fi

verbose "Found extracted Maven distribution directory: $actualDistributionDir"
printf %s\\n "$distributionUrl" >"$TMP_DOWNLOAD_DIR/$actualDistributionDir/mvnw.url"
mv -- "$TMP_DOWNLOAD_DIR/$actualDistributionDir" "$MAVEN_HOME" || [ -d "$MAVEN_HOME" ] || die "fail to move MAVEN_HOME"

clean || :
exec_maven "$@"
```

### api/services/identity-profile-service/mvnw.cmd

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```bat
<# : batch portion
@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    http://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM ----------------------------------------------------------------------------
@REM Apache Maven Wrapper startup batch script, version 3.3.4
@REM
@REM Optional ENV vars
@REM   MVNW_REPOURL - repo url base for downloading maven distribution
@REM   MVNW_USERNAME/MVNW_PASSWORD - user and password for downloading maven
@REM   MVNW_VERBOSE - true: enable verbose log; others: silence the output
@REM ----------------------------------------------------------------------------

@IF "%__MVNW_ARG0_NAME__%"=="" (SET __MVNW_ARG0_NAME__=%~nx0)
@SET __MVNW_CMD__=
@SET __MVNW_ERROR__=
@SET __MVNW_PSMODULEP_SAVE=%PSModulePath%
@SET PSModulePath=
@FOR /F "usebackq tokens=1* delims==" %%A IN (`powershell -noprofile "& {$scriptDir='%~dp0'; $script='%__MVNW_ARG0_NAME__%'; icm -ScriptBlock ([Scriptblock]::Create((Get-Content -Raw '%~f0'))) -NoNewScope}"`) DO @(
  IF "%%A"=="MVN_CMD" (set __MVNW_CMD__=%%B) ELSE IF "%%B"=="" (echo %%A) ELSE (echo %%A=%%B)
)
@SET PSModulePath=%__MVNW_PSMODULEP_SAVE%
@SET __MVNW_PSMODULEP_SAVE=
@SET __MVNW_ARG0_NAME__=
@SET MVNW_USERNAME=
@SET MVNW_PASSWORD=
@IF NOT "%__MVNW_CMD__%"=="" ("%__MVNW_CMD__%" %*)
@echo Cannot start maven from wrapper >&2 && exit /b 1
@GOTO :EOF
: end batch / begin powershell #>

$ErrorActionPreference = "Stop"
if ($env:MVNW_VERBOSE -eq "true") {
  $VerbosePreference = "Continue"
}

# calculate distributionUrl, requires .mvn/wrapper/maven-wrapper.properties
$distributionUrl = (Get-Content -Raw "$scriptDir/.mvn/wrapper/maven-wrapper.properties" | ConvertFrom-StringData).distributionUrl
if (!$distributionUrl) {
  Write-Error "cannot read distributionUrl property in $scriptDir/.mvn/wrapper/maven-wrapper.properties"
}

switch -wildcard -casesensitive ( $($distributionUrl -replace '^.*/','') ) {
  "maven-mvnd-*" {
    $USE_MVND = $true
    $distributionUrl = $distributionUrl -replace '-bin\.[^.]*$',"-windows-amd64.zip"
    $MVN_CMD = "mvnd.cmd"
    break
  }
  default {
    $USE_MVND = $false
    $MVN_CMD = $script -replace '^mvnw','mvn'
    break
  }
}

# apply MVNW_REPOURL and calculate MAVEN_HOME
# maven home pattern: ~/.m2/wrapper/dists/{apache-maven-<version>,maven-mvnd-<version>-<platform>}/<hash>
if ($env:MVNW_REPOURL) {
  $MVNW_REPO_PATTERN = if ($USE_MVND -eq $False) { "/org/apache/maven/" } else { "/maven/mvnd/" }
  $distributionUrl = "$env:MVNW_REPOURL$MVNW_REPO_PATTERN$($distributionUrl -replace "^.*$MVNW_REPO_PATTERN",'')"
}
$distributionUrlName = $distributionUrl -replace '^.*/',''
$distributionUrlNameMain = $distributionUrlName -replace '\.[^.]*$','' -replace '-bin$',''

$MAVEN_M2_PATH = "$HOME/.m2"
if ($env:MAVEN_USER_HOME) {
  $MAVEN_M2_PATH = "$env:MAVEN_USER_HOME"
}

if (-not (Test-Path -Path $MAVEN_M2_PATH)) {
    New-Item -Path $MAVEN_M2_PATH -ItemType Directory | Out-Null
}

$MAVEN_WRAPPER_DISTS = $null
$MAVEN_M2_ITEM = Get-Item $MAVEN_M2_PATH
if (-not $MAVEN_M2_ITEM.Target) {
  $MAVEN_WRAPPER_DISTS = "$MAVEN_M2_PATH/wrapper/dists"
} else {
  $MAVEN_WRAPPER_DISTS = $MAVEN_M2_ITEM.Target[0] + "/wrapper/dists"
}

$MAVEN_HOME_PARENT = "$MAVEN_WRAPPER_DISTS/$distributionUrlNameMain"
$MAVEN_HOME_NAME = ([System.Security.Cryptography.SHA256]::Create().ComputeHash([byte[]][char[]]$distributionUrl) | ForEach-Object {$_.ToString("x2")}) -join ''
$MAVEN_HOME = "$MAVEN_HOME_PARENT/$MAVEN_HOME_NAME"

if (Test-Path -Path "$MAVEN_HOME" -PathType Container) {
  Write-Verbose "found existing MAVEN_HOME at $MAVEN_HOME"
  Write-Output "MVN_CMD=$MAVEN_HOME/bin/$MVN_CMD"
  exit $?
}

if (! $distributionUrlNameMain -or ($distributionUrlName -eq $distributionUrlNameMain)) {
  Write-Error "distributionUrl is not valid, must end with *-bin.zip, but found $distributionUrl"
}

# prepare tmp dir
$TMP_DOWNLOAD_DIR_HOLDER = New-TemporaryFile
$TMP_DOWNLOAD_DIR = New-Item -Itemtype Directory -Path "$TMP_DOWNLOAD_DIR_HOLDER.dir"
$TMP_DOWNLOAD_DIR_HOLDER.Delete() | Out-Null
trap {
  if ($TMP_DOWNLOAD_DIR.Exists) {
    try { Remove-Item $TMP_DOWNLOAD_DIR -Recurse -Force | Out-Null }
    catch { Write-Warning "Cannot remove $TMP_DOWNLOAD_DIR" }
  }
}

New-Item -Itemtype Directory -Path "$MAVEN_HOME_PARENT" -Force | Out-Null

# Download and Install Apache Maven
Write-Verbose "Couldn't find MAVEN_HOME, downloading and installing it ..."
Write-Verbose "Downloading from: $distributionUrl"
Write-Verbose "Downloading to: $TMP_DOWNLOAD_DIR/$distributionUrlName"

$webclient = New-Object System.Net.WebClient
if ($env:MVNW_USERNAME -and $env:MVNW_PASSWORD) {
  $webclient.Credentials = New-Object System.Net.NetworkCredential($env:MVNW_USERNAME, $env:MVNW_PASSWORD)
}
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$webclient.DownloadFile($distributionUrl, "$TMP_DOWNLOAD_DIR/$distributionUrlName") | Out-Null

# If specified, validate the SHA-256 sum of the Maven distribution zip file
$distributionSha256Sum = (Get-Content -Raw "$scriptDir/.mvn/wrapper/maven-wrapper.properties" | ConvertFrom-StringData).distributionSha256Sum
if ($distributionSha256Sum) {
  if ($USE_MVND) {
    Write-Error "Checksum validation is not supported for maven-mvnd. `nPlease disable validation by removing 'distributionSha256Sum' from your maven-wrapper.properties."
  }
  Import-Module $PSHOME\Modules\Microsoft.PowerShell.Utility -Function Get-FileHash
  if ((Get-FileHash "$TMP_DOWNLOAD_DIR/$distributionUrlName" -Algorithm SHA256).Hash.ToLower() -ne $distributionSha256Sum) {
    Write-Error "Error: Failed to validate Maven distribution SHA-256, your Maven distribution might be compromised. If you updated your Maven version, you need to update the specified distributionSha256Sum property."
  }
}

# unzip and move
Expand-Archive "$TMP_DOWNLOAD_DIR/$distributionUrlName" -DestinationPath "$TMP_DOWNLOAD_DIR" | Out-Null

# Find the actual extracted directory name (handles snapshots where filename != directory name)
$actualDistributionDir = ""

# First try the expected directory name (for regular distributions)
$expectedPath = Join-Path "$TMP_DOWNLOAD_DIR" "$distributionUrlNameMain"
$expectedMvnPath = Join-Path "$expectedPath" "bin/$MVN_CMD"
if ((Test-Path -Path $expectedPath -PathType Container) -and (Test-Path -Path $expectedMvnPath -PathType Leaf)) {
  $actualDistributionDir = $distributionUrlNameMain
}

# If not found, search for any directory with the Maven executable (for snapshots)
if (!$actualDistributionDir) {
  Get-ChildItem -Path "$TMP_DOWNLOAD_DIR" -Directory | ForEach-Object {
    $testPath = Join-Path $_.FullName "bin/$MVN_CMD"
    if (Test-Path -Path $testPath -PathType Leaf) {
      $actualDistributionDir = $_.Name
    }
  }
}

if (!$actualDistributionDir) {
  Write-Error "Could not find Maven distribution directory in extracted archive"
}

Write-Verbose "Found extracted Maven distribution directory: $actualDistributionDir"
Rename-Item -Path "$TMP_DOWNLOAD_DIR/$actualDistributionDir" -NewName $MAVEN_HOME_NAME | Out-Null
try {
  Move-Item -Path "$TMP_DOWNLOAD_DIR/$MAVEN_HOME_NAME" -Destination $MAVEN_HOME_PARENT | Out-Null
} catch {
  if (! (Test-Path -Path "$MAVEN_HOME" -PathType Container)) {
    Write-Error "fail to move MAVEN_HOME"
  }
} finally {
  try { Remove-Item $TMP_DOWNLOAD_DIR -Recurse -Force | Out-Null }
  catch { Write-Warning "Cannot remove $TMP_DOWNLOAD_DIR" }
}

Write-Output "MVN_CMD=$MAVEN_HOME/bin/$MVN_CMD"
```

### api/services/identity-profile-service/src/main/resources/application.yaml

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```yaml
spring:
  application:
    name: identity-profile-service
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
    clean-disabled: true
    validate-on-migrate: true
    locations: classpath:db/migration
  mvc:
    problemdetails:
      enabled: true

management:
  endpoints:
    web:
      exposure:
        include: health
  endpoint:
    health:
      probes:
        enabled: true
      show-details: never
```

### api/services/identity-profile-service/src/main/resources/application-local.yaml

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```yaml
spring:
  datasource:
    url: ${IDENTITY_DB_URL}
    username: ${IDENTITY_DB_APP_USERNAME}
    password: ${IDENTITY_DB_APP_PASSWORD}
  flyway:
    url: ${IDENTITY_DB_URL}
    user: ${IDENTITY_DB_MIGRATOR_USERNAME}
    password: ${IDENTITY_DB_MIGRATOR_PASSWORD}
    default-schema: identity
    schemas: identity
    table: flyway_schema_history
    placeholders:
      runtimeRole: ${IDENTITY_DB_APP_USERNAME}

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  tracing:
    sampling:
      probability: 1.0

logging:
  structured:
    format:
      console: ecs
    ecs:
      service:
        name: identity-profile-service
        environment: local

auction:
  sample-flow:
    enabled: true
    relay:
      scheduler-enabled: true
      fixed-delay: 1s
```

### api/services/identity-profile-service/src/main/java/com/auctionpromax/identityprofileservice/configuration/TechnicalBaselineSecurityConfiguration.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.identityprofileservice.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;

@Configuration(proxyBeanMethods = false)
public class TechnicalBaselineSecurityConfiguration {

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.ignoringRequestMatchers(
            "/internal/technical-baseline/**",
            "/api/v1/identity-profile-samples"))
        .authorizeHttpRequests(authorize -> authorize
            .requestMatchers(
                "/actuator/health/**",
                "/actuator/info",
                "/actuator/metrics/**",
                "/api/v1/identity-profile-samples",
                "/internal/technical-baseline/**")
            .permitAll()
            .anyRequest().denyAll())
        .httpBasic(AbstractHttpConfigurer::disable)
        .formLogin(AbstractHttpConfigurer::disable)
        .logout(AbstractHttpConfigurer::disable);

    return http.build();
  }
}
```

### api/services/identity-profile-service/src/main/java/com/auctionpromax/identityprofileservice/adapter/in/web/correlation/CorrelationIdFilter.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.identityprofileservice.adapter.in.web.correlation;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

  public static final String HEADER_NAME = "X-Correlation-Id";
  public static final String MDC_KEY = "correlationId";
  public static final String REQUEST_ATTRIBUTE_NAME = "correlationId";

  private static final Pattern VALID_CORRELATION_ID = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$");

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain) throws ServletException, IOException {
    String correlationId = resolveCorrelationId(request.getHeader(HEADER_NAME));

    request.setAttribute(REQUEST_ATTRIBUTE_NAME, correlationId);
    response.setHeader(HEADER_NAME, correlationId);
    MDC.put(MDC_KEY, correlationId);

    try {
      filterChain.doFilter(request, response);
    } finally {
      MDC.remove(MDC_KEY);
    }
  }

  private String resolveCorrelationId(String suppliedCorrelationId) {
    if (suppliedCorrelationId != null
        && VALID_CORRELATION_ID.matcher(suppliedCorrelationId).matches()) {
      return suppliedCorrelationId;
    }

    return UUID.randomUUID().toString();
  }
}
```

### api/services/identity-profile-service/src/main/java/com/auctionpromax/identityprofileservice/adapter/in/web/error/GlobalProblemDetailHandler.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.identityprofileservice.adapter.in.web.error;

import com.auctionpromax.identityprofileservice.adapter.in.web.correlation.CorrelationIdFilter;
import com.auctionpromax.identityprofileservice.ports.in.sample.IdempotencyKeyReusedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;

import java.net.URI;

@RestControllerAdvice
public class GlobalProblemDetailHandler extends ResponseEntityExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalProblemDetailHandler.class);

  @Override
  protected ResponseEntity<Object> handleMethodArgumentNotValid(
      MethodArgumentNotValidException exception,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    return badRequest(
        "validation-failed",
        "Request validation failed",
        requestPath(request),
        correlationId(request));
  }

  @Override
  protected ResponseEntity<Object> handleHandlerMethodValidationException(
      HandlerMethodValidationException exception,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    return badRequest(
        "validation-failed",
        "Request validation failed",
        requestPath(request),
        correlationId(request));
  }

  @Override
  protected ResponseEntity<Object> handleHttpMessageNotReadable(
      HttpMessageNotReadableException exception,
      HttpHeaders headers,
      HttpStatusCode status,
      WebRequest request) {
    return badRequest(
        "malformed-request",
        "Malformed request",
        requestPath(request),
        correlationId(request));
  }

  @ExceptionHandler(ConstraintViolationException.class)
  ResponseEntity<ProblemDetail> handleConstraintViolation(
      ConstraintViolationException exception,
      HttpServletRequest request) {
    return problemResponse(
        HttpStatus.BAD_REQUEST,
        "validation-failed",
        "Request validation failed",
        "The request is invalid.",
        request.getRequestURI(),
        correlationId(request));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ProblemDetail> handleUnexpectedException(
      Exception exception,
      HttpServletRequest request) {
    log.atError()
        .addKeyValue("event", "request_processing.failed")
        .addKeyValue("httpStatus", HttpStatus.INTERNAL_SERVER_ERROR.value())
        .addKeyValue("problemType", "internal-error")
        .log("Request processing failed");
    return problemResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "internal-error",
        "Internal server error",
        "The request could not be processed.",
        request.getRequestURI(),
        correlationId(request));
  }

  @ExceptionHandler(IdempotencyKeyReusedException.class)
  ResponseEntity<ProblemDetail> handleIdempotencyKeyReused(
      IdempotencyKeyReusedException exception,
      HttpServletRequest request) {
    return problemResponse(HttpStatus.CONFLICT, "idempotency-key-reused", "Idempotency key reused", "The idempotency key was already used for a different request.", request.getRequestURI(), correlationId(request));
  }

  private ResponseEntity<Object> badRequest(
      String problemType,
      String title,
      String path,
      String correlationId) {
    String event = "malformed-request".equals(problemType)
        ? "request_malformed.failed"
        : "request_validation.failed";

    log.atWarn()
        .addKeyValue("event", event)
        .addKeyValue("httpStatus", HttpStatus.BAD_REQUEST.value())
        .addKeyValue("problemType", problemType)
        .log("Request rejected");
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(problem(
            HttpStatus.BAD_REQUEST,
            problemType,
            title,
            "The request is invalid.",
            path,
            correlationId));
  }

  private ResponseEntity<ProblemDetail> problemResponse(
      HttpStatus status,
      String problemType,
      String title,
      String detail,
      String path,
      String correlationId) {
    return ResponseEntity.status(status)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(problem(status, problemType, title, detail, path, correlationId));
  }

  private ProblemDetail problem(
      HttpStatus status,
      String problemType,
      String title,
      String detail,
      String path,
      String correlationId) {
    ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(status, detail);
    problemDetail.setType(URI.create("urn:auction-promax:problem:" + problemType));
    problemDetail.setTitle(title);
    problemDetail.setInstance(URI.create(path));
    problemDetail.setProperty("correlationId", correlationId);
    problemDetail.setProperty("code", problemType.replace('-', '_').toUpperCase());
    return problemDetail;
  }

  private String requestPath(WebRequest request) {
    if (request instanceof ServletWebRequest servletWebRequest) {
      return servletWebRequest.getRequest().getRequestURI();
    }

    return "/";
  }

  private String correlationId(WebRequest request) {
    if (request instanceof ServletWebRequest servletWebRequest) {
      return correlationId(servletWebRequest.getRequest());
    }

    return "unknown";
  }

  private String correlationId(HttpServletRequest request) {
    Object value = request.getAttribute(
        CorrelationIdFilter.REQUEST_ATTRIBUTE_NAME);

    return value instanceof String correlationId ? correlationId : "unknown";
  }
}
```

### api/services/identity-profile-service/src/main/java/com/auctionpromax/identityprofileservice/adapter/in/web/baseline/TechnicalBaselineController.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.identityprofileservice.adapter.in.web.baseline;

import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/internal/technical-baseline")
public class TechnicalBaselineController {
  private static final Logger log = LoggerFactory.getLogger(TechnicalBaselineController.class);

  @PostMapping("/validate")
  @ResponseStatus(HttpStatus.OK)
  public TechnicalValidationResponse validate(@Valid  @RequestBody TechnicalValidationRequest request) {
    int valueLength = request.value().length();
    log.atInfo().addKeyValue("event", "technical_validation.accepted")
            .addKeyValue("valueLength",valueLength)
            .log("Technical validation accepted");

    return new TechnicalValidationResponse(true, valueLength);
  }

}
```

### api/services/identity-profile-service/src/test/java/com/auctionpromax/identityprofileservice/architecture/ArchitectureTest.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.identityprofileservice.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ArchitectureTest {

  private static final String BASE_PACKAGE = "com.auctionpromax.identityprofileservice";

  private static final JavaClasses PRODUCTION_CLASSES = new ClassFileImporter().importPackages(
      BASE_PACKAGE + ".domain",
      BASE_PACKAGE + ".application",
      BASE_PACKAGE + ".adapter",
      BASE_PACKAGE + ".ports",
      BASE_PACKAGE + ".configuration");

  private static final ArchRule DOMAIN_MUST_NOT_DEPEND_ON_ADAPTERS = noClasses()
      .that().resideInAPackage("..domain..")
      .should().dependOnClassesThat()
      .resideInAnyPackage(
          "..adapter..",
          "org.springframework..",
          "jakarta.persistence..",
          "jakarta.servlet..",
          "org.slf4j..")
      .because("domain must remain independent of delivery and framework adapters");

  private static final ArchRule APPLICATION_MUST_NOT_DEPEND_ON_FRAMEWORKS_OR_ADAPTERS = noClasses()
      .that().resideInAPackage("..application..")
      .should().dependOnClassesThat()
      .resideInAnyPackage(
          "..adapter..",
          "org.springframework..",
          "org.slf4j..",
          "com.fasterxml.jackson..",
          "io.micrometer..",
          "java.sql..",
          "javax.sql..",
          "jakarta.persistence..",
          "jakarta.servlet..")
      .because("application orchestration must depend only on domain, ports, and Java");

  private static final ArchRule PORTS_MUST_NOT_DEPEND_ON_ADAPTERS_OR_FRAMEWORKS = noClasses()
      .that().resideInAPackage("..ports..")
      .should().dependOnClassesThat()
      .resideInAnyPackage(
          "..adapter..",
          "org.springframework..",
          "org.slf4j..",
          "com.fasterxml.jackson..",
          "io.micrometer..",
          "java.sql..",
          "javax.sql..",
          "jakarta..")
      .because("ports must remain technology independent");

  private static final ArchRule INBOUND_ADAPTERS_MUST_USE_INBOUND_PORTS = noClasses()
      .that().resideInAPackage("..adapter.in..")
      .should().dependOnClassesThat()
      .resideInAPackage("..application..")
      .because("inbound adapters must invoke application behavior through inbound ports");

  @Test
  void domainMustNotDependOnAdaptersOrFrameworks() {
    DOMAIN_MUST_NOT_DEPEND_ON_ADAPTERS.check(PRODUCTION_CLASSES);
  }

  @Test
  void applicationMustNotDependOnFrameworksOrAdapters() {
    APPLICATION_MUST_NOT_DEPEND_ON_FRAMEWORKS_OR_ADAPTERS.check(PRODUCTION_CLASSES);
  }

  @Test
  void portsMustRemainTechnologyIndependent() {
    PORTS_MUST_NOT_DEPEND_ON_ADAPTERS_OR_FRAMEWORKS.check(PRODUCTION_CLASSES);
  }

  @Test
  void inboundAdaptersMustUseInboundPorts() {
    INBOUND_ADAPTERS_MUST_USE_INBOUND_PORTS.check(PRODUCTION_CLASSES);
  }

  @Test
  void topLevelPackagesMustBeFreeOfCycles() {
    slices()
        .matching(BASE_PACKAGE + ".(*)..")
        .should().beFreeOfCycles()
        .check(PRODUCTION_CLASSES);
  }

  @Test
  void applicationBoundaryRuleDetectsDeliberateAdapterViolation() {
    JavaClasses invalidFixtureClasses = new ClassFileImporter()
        .importPackages("com.auctionpromax.architecturefixture");

    assertThatThrownBy(() ->
        APPLICATION_MUST_NOT_DEPEND_ON_FRAMEWORKS_OR_ADAPTERS.check(invalidFixtureClasses))
        .isInstanceOf(AssertionError.class)
        .hasMessageContaining("InvalidApplicationDependency");
  }

  @Test
  void applicationBoundaryRuleDetectsDeliberateFrameworkViolation() {
    JavaClasses invalidFixtureClasses = new ClassFileImporter()
        .importPackages("com.auctionpromax.frameworkleakfixture");

    assertThatThrownBy(() ->
        APPLICATION_MUST_NOT_DEPEND_ON_FRAMEWORKS_OR_ADAPTERS.check(invalidFixtureClasses))
        .isInstanceOf(AssertionError.class)
        .hasMessageContaining("FrameworkLeakingApplication")
        .hasMessageContaining("JdbcTemplate");
  }

  @Test
  void inboundAdapterRuleDetectsDeliberateApplicationDependency() {
    JavaClasses invalidFixtureClasses = new ClassFileImporter()
        .importPackages("com.auctionpromax.inboundadapterfixture");

    assertThatThrownBy(() -> INBOUND_ADAPTERS_MUST_USE_INBOUND_PORTS.check(invalidFixtureClasses))
        .isInstanceOf(AssertionError.class)
        .hasMessageContaining("InvalidInboundAdapterDependency")
        .hasMessageContaining("CreateSampleService");
  }
}
```

### api/services/identity-profile-service/src/test/java/com/auctionpromax/identityprofileservice/adapter/in/web/baseline/TechnicalBaselineLoggingTest.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.identityprofileservice.adapter.in.web.baseline;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.auctionpromax.identityprofileservice.adapter.in.web.correlation.CorrelationIdFilter;
import com.auctionpromax.identityprofileservice.adapter.in.web.error.GlobalProblemDetailHandler;
import com.auctionpromax.identityprofileservice.configuration.TechnicalBaselineSecurityConfiguration;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.event.KeyValuePair;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TechnicalBaselineController.class)
@Import({
        TechnicalBaselineSecurityConfiguration.class,
        CorrelationIdFilter.class,
        GlobalProblemDetailHandler.class
})
class TechnicalBaselineLoggingTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void logsSuccessEventWithoutRawRequestValue() throws Exception {
        String rawValue = "SUPER-SECRET-RAW-VALUE";

        try (LogCapture logs = LogCapture.forLogger(
                TechnicalBaselineController.class)) {

            mockMvc.perform(post("/internal/technical-baseline/validate")
                    .contentType(APPLICATION_JSON)
                    .content("""
                            {
                              "value": "%s"
                            }
                            """.formatted(rawValue)))
                    .andExpect(status().isOk());

            ILoggingEvent event = logs.singleEvent("event", "technical_validation.accepted");

            assertThat(event.getLevel())
                    .isEqualTo(Level.INFO);

            assertThat(event.getFormattedMessage())
                    .isEqualTo("Technical validation accepted");

            assertThat(keyValue(event, "event"))
                    .isEqualTo("technical_validation.accepted");

            assertThat(keyValue(event, "valueLength"))
                    .isEqualTo(rawValue.length());

            assertDoesNotExpose(event, rawValue);
        }
    }

    @Test
    void logsSafeFixedEventForValidationFailure() throws Exception {
        try (LogCapture logs = LogCapture.forLogger(
                GlobalProblemDetailHandler.class)) {

            mockMvc.perform(post("/internal/technical-baseline/validate")
                    .contentType(APPLICATION_JSON)
                    .content("""
                            {
                              "value": ""
                            }
                            """))
                    .andExpect(status().isBadRequest());

            ILoggingEvent event = logs.singleEvent("event", "request_validation.failed");

            assertThat(event.getLevel())
                    .isEqualTo(Level.WARN);

            assertThat(event.getFormattedMessage())
                    .isEqualTo("Request rejected");

            assertThat(keyValue(event, "event"))
                    .isEqualTo("request_validation.failed");
        }
    }

    private static Object keyValue(
            ILoggingEvent event,
            String key) {

        List<KeyValuePair> pairs = event.getKeyValuePairs();

        if (pairs == null) {
            return null;
        }

        return pairs.stream()
                .filter(pair -> key.equals(pair.key))
                .map(pair -> pair.value)
                .findFirst()
                .orElse(null);
    }

    /**
     * Security assertion for the application logging event itself.
     *
     * This intentionally does not inspect global console output because
     * framework/test diagnostics may legitimately contain request data.
     */
    private static void assertDoesNotExpose(
            ILoggingEvent event,
            String forbiddenValue) {

        assertThat(event.getFormattedMessage())
                .doesNotContain(forbiddenValue);

        Object[] arguments = event.getArgumentArray();

        if (arguments != null) {
            assertThat(arguments)
                    .extracting(String::valueOf)
                    .noneMatch(value -> value.contains(forbiddenValue));
        }

        List<KeyValuePair> pairs = event.getKeyValuePairs();

        if (pairs != null) {
            assertThat(pairs)
                    .extracting(pair -> String.valueOf(pair.value))
                    .noneMatch(value -> value.contains(forbiddenValue));
        }

        Map<String, String> mdc = event.getMDCPropertyMap();

        if (mdc != null) {
            assertThat(mdc.values())
                    .noneMatch(value -> value != null && value.contains(forbiddenValue));
        }
    }

    private static final class LogCapture implements AutoCloseable {

        private final Logger logger;
        private final ListAppender<ILoggingEvent> appender;

        private LogCapture(
                Logger logger,
                ListAppender<ILoggingEvent> appender) {

            this.logger = logger;
            this.appender = appender;
        }

        static LogCapture forLogger(Class<?> loggerType) {
            Logger logger = (Logger) LoggerFactory.getLogger(loggerType);

            ListAppender<ILoggingEvent> appender = new ListAppender<>();

            appender.setContext(logger.getLoggerContext());
            appender.start();

            logger.addAppender(appender);

            return new LogCapture(logger, appender);
        }

        ILoggingEvent singleEvent(
                String key,
                Object expectedValue) {

            List<ILoggingEvent> matchingEvents = appender.list.stream()
                    .filter(event -> hasKeyValue(event, key, expectedValue))
                    .toList();

            assertThat(matchingEvents)
                    .as(
                            "Expected exactly one log event with %s=%s",
                            key,
                            expectedValue)
                    .hasSize(1);

            return matchingEvents.getFirst();
        }

        @Override
        public void close() {
            logger.detachAppender(appender);
            appender.stop();
        }

        private static boolean hasKeyValue(
                ILoggingEvent event,
                String key,
                Object expectedValue) {

            List<KeyValuePair> pairs = event.getKeyValuePairs();

            if (pairs == null) {
                return false;
            }

            return pairs.stream()
                    .anyMatch(pair -> key.equals(pair.key)
                            && expectedValue.equals(pair.value));
        }
    }
}
```

### api/services/identity-profile-service/src/test/java/com/auctionpromax/identityprofileservice/IdentityProfileServiceApplicationTestcontainersIT.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.identityprofileservice;

import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleCommand;
import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleResult;
import com.auctionpromax.identityprofileservice.ports.in.sample.CreateSampleUseCase;
import com.auctionpromax.identityprofileservice.ports.in.sample.OutboxRelayUseCase;
import com.auctionpromax.identityprofileservice.ports.in.sample.SampleEventHandler;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxDelivery;
import com.auctionpromax.identityprofileservice.ports.out.sample.OutboxRelayPersistencePort;
import com.auctionpromax.identityprofileservice.application.sample.RequestFingerprint;
import com.auctionpromax.identityprofileservice.application.sample.SampleRequestFingerprint;
import com.auctionpromax.identityprofileservice.domain.idempotency.IdempotencyKey;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;

import javax.sql.DataSource;

import io.micrometer.core.instrument.MeterRegistry;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("testcontainers")
@Testcontainers
class IdentityProfileServiceApplicationTestcontainersIT {

  private static final String INSUFFICIENT_PRIVILEGE_SQL_STATE = "42501";

  private static final DockerImageName POSTGRES_IMAGE = DockerImageName.parse(
      "postgres:17.11-bookworm@sha256:"
          + "84560e3b9c6874893fc4e2854f5dc3e7c1a37bc9d1dfd7a8c641310ae22ba5ad")
      .asCompatibleSubstituteFor("postgres");

  private static final String DATABASE_NAME = "identity_test_db";

  private static final String BOOTSTRAP_USERNAME = "tc_bootstrap";
  private static final String BOOTSTRAP_PASSWORD = "test-only-bootstrap-not-a-secret";

  private static final String MIGRATOR_USERNAME = "identity_test_migrator";
  private static final String MIGRATOR_PASSWORD = "test-only-identity-migrator-not-a-secret";

  private static final String APP_USERNAME = "identity_test_app";
  private static final String APP_PASSWORD = "test-only-identity-app-not-a-secret";

  @Container
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(POSTGRES_IMAGE)
      .withDatabaseName(DATABASE_NAME)
      .withUsername(BOOTSTRAP_USERNAME)
      .withPassword(BOOTSTRAP_PASSWORD)
      .withInitScript(
          "db/testcontainers/bootstrap-identity.sql");

  @DynamicPropertySource
  static void databaseProperties(
      DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
    registry.add(
        "spring.datasource.username",
        () -> APP_USERNAME);
    registry.add(
        "spring.datasource.password",
        () -> APP_PASSWORD);

    registry.add("spring.flyway.url", POSTGRES::getJdbcUrl);
    registry.add(
        "spring.flyway.user",
        () -> MIGRATOR_USERNAME);
    registry.add(
        "spring.flyway.password",
        () -> MIGRATOR_PASSWORD);
    registry.add(
        "spring.flyway.default-schema",
        () -> "identity");
    registry.add("spring.flyway.schemas", () -> "identity");
    registry.add(
        "spring.flyway.table",
        () -> "flyway_schema_history");
    registry.add(
        "spring.flyway.create-schemas",
        () -> "false");
    registry.add(
        "spring.flyway.locations",
        () -> String.join(",",
            "classpath:db/migration",
            "classpath:db/testcontainers/migration"));
    registry.add(
        "spring.flyway.placeholders.runtimeRole",
        () -> APP_USERNAME);

    registry.add(
        "management.endpoint.health.group.readiness.include",
        () -> "readinessState,db");
    registry.add("auction.sample-flow.enabled", () -> "true");
  }

  private final JdbcTemplate jdbcTemplate;
  private final MockMvc mockMvc;
  private final CreateSampleUseCase createSampleUseCase;
  private final OutboxRelayUseCase relay;
  private final SampleEventHandler consumer;
  private final TransactionTemplate transactionTemplate;
  private final MeterRegistry meterRegistry;
  private final OutboxRelayPersistencePort relayPersistence;

  @Autowired
  IdentityProfileServiceApplicationTestcontainersIT(
      DataSource dataSource,
      MockMvc mockMvc,
      CreateSampleUseCase createSampleUseCase,
      OutboxRelayUseCase relay,
      SampleEventHandler consumer,
      TransactionTemplate transactionTemplate,
      MeterRegistry meterRegistry,
      OutboxRelayPersistencePort relayPersistence) {
    this.jdbcTemplate = new JdbcTemplate(dataSource);
    this.mockMvc = mockMvc;
    this.createSampleUseCase = createSampleUseCase;
    this.relay = relay;
    this.consumer = consumer;
    this.transactionTemplate = transactionTemplate;
    this.meterRegistry = meterRegistry;
    this.relayPersistence = relayPersistence;
  }

  @BeforeEach
  void cleanSampleFlowTables() {
    jdbcTemplate.update("DELETE FROM identity.identity_profile_sample_effect");
    jdbcTemplate.update("DELETE FROM identity.inbox_receipt");
    jdbcTemplate.update("DELETE FROM identity.outbox_event");
    jdbcTemplate.update("DELETE FROM identity.idempotency_record");
    jdbcTemplate.update("DELETE FROM identity.identity_profile_sample");
  }

  @Test
  void replayAndDuplicateDeliveryProduceOneEffect() throws Exception {
    String body = "{\"purpose\":\"PHASE_0_BASELINE\"}";
    String idempotencyKey = "t06-tc-replay-001";

    for (int invocation = 0; invocation < 2; invocation++) {
      mockMvc.perform(post("/api/v1/identity-profile-samples")
              .header("Idempotency-Key", idempotencyKey)
              .header("X-Correlation-Id", "t06-tc-correlation-001")
              .contentType("application/json")
              .content(body))
          .andExpect(status().isCreated())
          .andExpect(jsonPath("$.status").value("RECORDED"));
    }

    String keyDigest = IdempotencyKey.from(idempotencyKey).digest();
    UUID eventId = jdbcTemplate.queryForObject(
        "SELECT event_id FROM identity.idempotency_record WHERE key_digest = ?",
        UUID.class,
        keyDigest);
    UUID sampleId = jdbcTemplate.queryForObject(
        "SELECT aggregate_id FROM identity.outbox_event WHERE event_id = ?",
        UUID.class,
        eventId);

    assertThat(countWhere("identity.idempotency_record", "key_digest", keyDigest)).isOne();
    assertThat(countWhere("identity.identity_profile_sample", "sample_id", sampleId)).isOne();
    assertThat(countWhere("identity.outbox_event", "event_id", eventId)).isOne();
    assertThat(gauge("identity.sample.outbox.pending")).isEqualTo(1.0);
    assertThat(counter("identity.sample.idempotency.replays")).isGreaterThanOrEqualTo(1.0);
    jdbcTemplate.update(
        "UPDATE identity.outbox_event SET next_attempt_at=? WHERE event_id=?",
        Timestamp.from(Instant.now().minusSeconds(1)),
        eventId);
    assertThat(relay.relayOne()).isTrue();
    assertThat(consumer.accept(new OutboxDelivery(
        eventId, sampleId, "t06-tc-correlation-001", "{}", 2))).isFalse();
    assertThat(countWhere("identity.inbox_receipt", "event_id", eventId)).isOne();
    assertThat(countWhere("identity.identity_profile_sample_effect", "event_id", eventId)).isOne();
    assertThat(gauge("identity.sample.outbox.processed.current")).isEqualTo(1.0);
    assertThat(counter("identity.sample.outbox.processed")).isGreaterThanOrEqualTo(1.0);
    assertThat(counter("identity.sample.inbox.duplicates")).isGreaterThanOrEqualTo(1.0);
  }

  @Test
  void conflictValidationAndForcedRollbackAreSafe() throws Exception {
    String conflictKey = "t06-tc-conflict-001";
    createSampleUseCase.create(command(conflictKey, UUID.randomUUID()));

    mockMvc.perform(post("/api/v1/identity-profile-samples")
            .header("Idempotency-Key", conflictKey)
            .contentType("application/json")
            .content("{\"purpose\":\"PHASE_0_BASELINE\",\"sampleRequestId\":\""
                + UUID.randomUUID() + "\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("IDEMPOTENCY_KEY_REUSED"));
    mockMvc.perform(post("/api/v1/identity-profile-samples")
            .header("Idempotency-Key", "contains whitespace")
            .contentType("application/json")
            .content("{\"purpose\":\"PHASE_0_BASELINE\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

    String rollbackKey = "t06-tc-rollback-001";
    Integer samplesBeforeRollback = queryInteger("SELECT count(*) FROM identity.identity_profile_sample");
    Integer outboxBeforeRollback = queryInteger("SELECT count(*) FROM identity.outbox_event");
    transactionTemplate.executeWithoutResult(status -> {
      createSampleUseCase.create(command(rollbackKey, null));
      status.setRollbackOnly();
    });

    String rollbackDigest = IdempotencyKey.from(rollbackKey).digest();
    assertThat(countWhere("identity.idempotency_record", "key_digest", rollbackDigest)).isZero();
    assertThat(queryInteger("SELECT count(*) FROM identity.identity_profile_sample"))
        .isEqualTo(samplesBeforeRollback);
    assertThat(queryInteger("SELECT count(*) FROM identity.outbox_event"))
        .isEqualTo(outboxBeforeRollback);
  }

  @Test
  void concurrentReplayAndExpiredLeaseAreHandled() throws Exception {
    String idempotencyKey = "t06-tc-concurrent-001";
    try (var executor = Executors.newFixedThreadPool(2)) {
      Callable<CreateSampleResult> operation =
          () -> createSampleUseCase.create(command(idempotencyKey, null));
      var results = executor.invokeAll(List.of(operation, operation));
      assertThat(results.get(0).get().sampleId()).isEqualTo(results.get(1).get().sampleId());
    }

    String keyDigest = IdempotencyKey.from(idempotencyKey).digest();
    UUID eventId = jdbcTemplate.queryForObject(
        "SELECT event_id FROM identity.idempotency_record WHERE key_digest = ?",
        UUID.class,
        keyDigest);
    assertThat(countWhere("identity.idempotency_record", "key_digest", keyDigest)).isOne();
    assertThat(countWhere("identity.outbox_event", "event_id", eventId)).isOne();

    jdbcTemplate.update(
        "UPDATE identity.outbox_event SET status='PROCESSING', lease_until=?, "
            + "next_attempt_at=? WHERE event_id=?",
        Timestamp.from(Instant.now().minusSeconds(1)),
        Timestamp.from(Instant.now().minusSeconds(1)),
        eventId);
    assertThat(relay.relayOne()).isTrue();
    assertThat(jdbcTemplate.queryForObject(
        "SELECT status FROM identity.outbox_event WHERE event_id=?",
        String.class,
        eventId)).isEqualTo("PUBLISHED");
    assertThat(jdbcTemplate.queryForObject(
        "SELECT last_attempt_at IS NOT NULL AND locked_by IS NULL "
            + "FROM identity.outbox_event WHERE event_id=?",
        Boolean.class,
        eventId)).isTrue();
  }

  @Test
  void failedRelayStateRetainsTheRowAndCanBeRetried() {
    CreateSampleResult result = createSampleUseCase.create(
        command("t06-tc-relay-failure-001", null));
    jdbcTemplate.update(
        "UPDATE identity.outbox_event SET next_attempt_at=? WHERE aggregate_id=?",
        Timestamp.from(Instant.now().minusSeconds(1)),
        result.sampleId());
    OutboxDelivery claimed = relayPersistence.claimNext().orElseThrow();
    Instant retryAt = Instant.now().plusSeconds(30);

    relayPersistence.markFailed(claimed.eventId(), retryAt, "LOCAL_DELIVERY_FAILED");

    Map<String, Object> failed = jdbcTemplate.queryForMap(
        "SELECT status, attempts, error_code, next_attempt_at, locked_by "
            + "FROM identity.outbox_event WHERE event_id=?",
        claimed.eventId());
    assertThat(failed)
        .containsEntry("status", "FAILED")
        .containsEntry("attempts", 1)
        .containsEntry("error_code", "LOCAL_DELIVERY_FAILED")
        .containsEntry("locked_by", null);
    assertThat(countWhere("identity.outbox_event", "event_id", claimed.eventId())).isOne();
    assertThat(countWhere("identity.identity_profile_sample", "sample_id", result.sampleId())).isOne();
    assertThat(gauge("identity.sample.outbox.failed.current")).isEqualTo(1.0);

    jdbcTemplate.update(
        "UPDATE identity.outbox_event SET next_attempt_at=? WHERE event_id=?",
        Timestamp.from(Instant.now().minusSeconds(1)),
        claimed.eventId());
    assertThat(relay.relayOne()).isTrue();
    assertThat(jdbcTemplate.queryForObject(
        "SELECT status FROM identity.outbox_event WHERE event_id=?",
        String.class,
        claimed.eventId())).isEqualTo("PUBLISHED");
  }

  @Test
  void sampleFlowPersistsCanonicalIdempotencyDigests() {
    String rawKey = "t06-persisted-fingerprint-001";
    String purpose = "PHASE_0_BASELINE";
    UUID requestId = UUID.fromString("0192f1c0-0000-7000-8000-000000000002");

    CreateSampleResult result = createSampleUseCase.create(new CreateSampleCommand(
        rawKey,
        purpose,
        requestId,
        "t06-fingerprint-correlation-001"));

    Map<String, Object> stored = jdbcTemplate.queryForMap("""
        SELECT key_digest, request_fingerprint
        FROM identity.idempotency_record
        WHERE sample_id = ?
        """, result.sampleId());

    assertThat(stored.get("key_digest"))
        .isEqualTo(IdempotencyKey.from(rawKey).digest());

    RequestFingerprint expectedFingerprint = SampleRequestFingerprint.from(purpose, requestId);

    assertThat(stored.get("request_fingerprint"))
        .isEqualTo(expectedFingerprint.value());
  }

  @Test
  void runtimeAndOwnershipTopologyMatchesAdr016() {
    assertThat(queryString("SELECT current_user"))
        .isEqualTo(APP_USERNAME);

    assertThat(queryString("""
        SELECT pg_get_userbyid(datdba)
        FROM pg_database
        WHERE datname = current_database()
        """))
        .isEqualTo("identity_test_owner");

    assertThat(queryString("""
        SELECT pg_get_userbyid(nspowner)
        FROM pg_namespace
        WHERE nspname = 'identity'
        """))
        .isEqualTo(MIGRATOR_USERNAME);

    assertThat(roleMatchesAdr016("identity_test_owner", false))
        .isTrue();

    assertThat(roleMatchesAdr016(MIGRATOR_USERNAME, true))
        .isTrue();

    assertThat(roleMatchesAdr016(APP_USERNAME, true))
        .isTrue();

    assertThat(queryInteger("""
        SELECT count(*)
        FROM pg_auth_members membership
        JOIN pg_roles granted
          ON granted.oid = membership.roleid
        JOIN pg_roles member
          ON member.oid = membership.member
        WHERE granted.rolname LIKE 'identity_test_%'
           OR member.rolname LIKE 'identity_test_%'
        """))
        .isZero();
  }

  @Test
  void flywayUsesMigratorAndProtectsHistory() throws Exception {
    assertThat(queryString("""
        SELECT tableowner
        FROM pg_tables
        WHERE schemaname = 'identity'
          AND tablename = 'flyway_schema_history'
        """))
        .isEqualTo(MIGRATOR_USERNAME);

    assertThat(queryString("""
        SELECT tableowner
        FROM pg_tables
        WHERE schemaname = 'identity'
          AND tablename = 'identity_test_probe'
        """))
        .isEqualTo(MIGRATOR_USERNAME);

    try (
        var connection = DriverManager.getConnection(
            POSTGRES.getJdbcUrl(),
            MIGRATOR_USERNAME,
            MIGRATOR_PASSWORD);
        var statement = connection.createStatement();
        var resultSet = statement.executeQuery("""
            SELECT DISTINCT installed_by
            FROM identity.flyway_schema_history
            WHERE success
            ORDER BY installed_by
            """)) {
      assertThat(resultSet.next()).isTrue();
      assertThat(resultSet.getString("installed_by"))
          .isEqualTo(MIGRATOR_USERNAME);
      assertThat(resultSet.next()).isFalse();
    }

    assertThat(queryBoolean("""
        SELECT has_table_privilege(
            current_user,
            'identity.flyway_schema_history',
            'SELECT'
        )
        """))
        .isFalse();

    assertInsufficientPrivilege(() -> jdbcTemplate.queryForObject(
        """
            SELECT count(*)
            FROM identity.flyway_schema_history
            """,
        Integer.class));
  }

  @Test
  void runtimeCanUseGrantedDmlButCannotUseDdl() {
    Long id = jdbcTemplate.queryForObject(
        """
            INSERT INTO identity.identity_test_probe(probe_value)
            VALUES (?)
            RETURNING id
            """,
        Long.class,
        "initial");

    assertThat(id).isNotNull();

    assertThat(jdbcTemplate.update(
        """
            UPDATE identity.identity_test_probe
            SET probe_value = ?
            WHERE id = ?
            """,
        "updated",
        id)).isOne();

    assertThat(jdbcTemplate.queryForObject(
        """
            SELECT probe_value
            FROM identity.identity_test_probe
            WHERE id = ?
            """,
        String.class,
        id)).isEqualTo("updated");

    assertThat(jdbcTemplate.update(
        """
            DELETE FROM identity.identity_test_probe
            WHERE id = ?
            """,
        id)).isOne();

    assertThat(queryBoolean("""
        SELECT has_schema_privilege(
            current_user,
            'identity',
            'CREATE'
        )
        """))
        .isFalse();

    assertInsufficientPrivilege(() -> jdbcTemplate.execute("""
        CREATE TABLE identity.runtime_ddl_must_be_denied (
            id bigint PRIMARY KEY
        )
        """));
  }

  @Test
  void migratorCanPerformControlledDdl() throws Exception {
    try (
        var connection = DriverManager.getConnection(
            POSTGRES.getJdbcUrl(),
            MIGRATOR_USERNAME,
            MIGRATOR_PASSWORD);
        var statement = connection.createStatement()) {
      statement.execute("""
          CREATE TABLE identity.migrator_ddl_probe (
              id bigint PRIMARY KEY
          )
          """);

      statement.execute("""
          DROP TABLE identity.migrator_ddl_probe
          """);
    }
  }

  @Test
  void readinessIsUpWithDatabaseConnectivity() throws Exception {
    mockMvc.perform(get("/actuator/health/readiness"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"));
  }

  private String queryString(String sql) {
    return jdbcTemplate.queryForObject(sql, String.class);
  }

  private Boolean queryBoolean(String sql) {
    return jdbcTemplate.queryForObject(sql, Boolean.class);
  }

  private Integer queryInteger(String sql) {
    return jdbcTemplate.queryForObject(sql, Integer.class);
  }

  private CreateSampleCommand command(String idempotencyKey, UUID requestId) {
    return new CreateSampleCommand(
        idempotencyKey,
        "PHASE_0_BASELINE",
        requestId,
        "t06-tc-correlation-001");
  }

  private Integer countWhere(String table, String column, Object value) {
    return jdbcTemplate.queryForObject(
        "SELECT count(*) FROM " + table + " WHERE " + column + " = ?",
        Integer.class,
        value);
  }

  private double gauge(String name) {
    return meterRegistry.get(name).gauge().value();
  }

  private double counter(String name) {
    return meterRegistry.get(name).counter().count();
  }

  private boolean roleMatchesAdr016(
      String roleName,
      boolean expectedLogin) {
    return Boolean.TRUE.equals(jdbcTemplate.queryForObject(
        """
            SELECT rolcanlogin = ?
               AND NOT rolsuper
               AND NOT rolcreatedb
               AND NOT rolcreaterole
               AND NOT rolreplication
               AND NOT rolbypassrls
               AND NOT rolinherit
            FROM pg_roles
            WHERE rolname = ?
            """,
        Boolean.class,
        expectedLogin,
        roleName));
  }

  private static void assertInsufficientPrivilege(
      ThrowingCallable operation) {
    assertThatThrownBy(operation)
        .isInstanceOf(DataAccessException.class)
        .satisfies(error -> assertThat(findSqlState(error))
            .isEqualTo(INSUFFICIENT_PRIVILEGE_SQL_STATE));
  }

  private static String findSqlState(Throwable error) {
    Throwable current = error;

    while (current != null) {
      if (current instanceof SQLException sqlException) {
        return sqlException.getSQLState();
      }

      current = current.getCause();
    }

    return null;
  }
}
```

### api/services/identity-profile-service/src/test/resources/db/testcontainers/bootstrap-identity.sql

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```sql
-- TEST ONLY. Credentials and roles exist only inside an ephemeral Testcontainer.
-- Never reuse these values outside the canonical integration test.

CREATE ROLE identity_test_owner
    NOLOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    NOREPLICATION
    NOBYPASSRLS;

CREATE ROLE identity_test_migrator
    LOGIN
    PASSWORD 'test-only-identity-migrator-not-a-secret'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    NOREPLICATION
    NOBYPASSRLS
    CONNECTION LIMIT 5;

CREATE ROLE identity_test_app
    LOGIN
    PASSWORD 'test-only-identity-app-not-a-secret'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOINHERIT
    NOREPLICATION
    NOBYPASSRLS
    CONNECTION LIMIT 20;

ALTER DATABASE identity_test_db OWNER TO identity_test_owner;

REVOKE ALL PRIVILEGES
    ON DATABASE identity_test_db
    FROM PUBLIC, identity_test_migrator, identity_test_app;

GRANT CONNECT
    ON DATABASE identity_test_db
    TO identity_test_migrator, identity_test_app;

REVOKE ALL PRIVILEGES
    ON SCHEMA public
    FROM PUBLIC, identity_test_migrator, identity_test_app;

CREATE SCHEMA identity AUTHORIZATION identity_test_migrator;

REVOKE ALL PRIVILEGES
    ON SCHEMA identity
    FROM PUBLIC, identity_test_migrator, identity_test_app;

GRANT USAGE, CREATE
    ON SCHEMA identity
    TO identity_test_migrator;

GRANT USAGE
    ON SCHEMA identity
    TO identity_test_app;

ALTER ROLE identity_test_migrator
    IN DATABASE identity_test_db
    SET search_path TO identity, pg_catalog;

ALTER ROLE identity_test_app
    IN DATABASE identity_test_db
    SET search_path TO identity, pg_catalog;

ALTER DEFAULT PRIVILEGES
    FOR ROLE identity_test_migrator
    IN SCHEMA identity
    REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, identity_test_app;

ALTER DEFAULT PRIVILEGES
    FOR ROLE identity_test_migrator
    IN SCHEMA identity
    REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, identity_test_app;

ALTER DEFAULT PRIVILEGES
    FOR ROLE identity_test_migrator
    REVOKE EXECUTE ON ROUTINES FROM PUBLIC;

ALTER DEFAULT PRIVILEGES
    FOR ROLE identity_test_migrator
    REVOKE USAGE ON TYPES FROM PUBLIC;
```

### api/services/identity-profile-service/src/main/java/com/auctionpromax/identityprofileservice/IdentityProfileServiceApplication.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.identityprofileservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class IdentityProfileServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(IdentityProfileServiceApplication.class, args);
    }

}
```

### api/services/identity-profile-service/src/main/java/com/auctionpromax/identityprofileservice/adapter/in/web/baseline/TechnicalValidationRequest.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.identityprofileservice.adapter.in.web.baseline;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TechnicalValidationRequest(
    @NotBlank(message = "value must not be blank") @Size(max = 100, message = "value must not exceed 100 characters") String value) {

}
```

### api/services/identity-profile-service/src/main/java/com/auctionpromax/identityprofileservice/adapter/in/web/baseline/TechnicalValidationResponse.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.identityprofileservice.adapter.in.web.baseline;

public record TechnicalValidationResponse(
    boolean accepted,
    int valueLength) {
}
```

### api/services/identity-profile-service/src/test/java/com/auctionpromax/architecturefixture/application/InvalidApplicationDependency.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.architecturefixture.application;

import com.auctionpromax.identityprofileservice.adapter.in.web.baseline.TechnicalValidationRequest;

final class InvalidApplicationDependency {

  private final TechnicalValidationRequest request;

  InvalidApplicationDependency(TechnicalValidationRequest request) {
    this.request = request;
  }
}
```

### api/services/identity-profile-service/src/test/java/com/auctionpromax/frameworkleakfixture/application/FrameworkLeakingApplication.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.frameworkleakfixture.application;

import org.springframework.jdbc.core.JdbcTemplate;

final class FrameworkLeakingApplication {

  private final JdbcTemplate jdbcTemplate;

  FrameworkLeakingApplication(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }
}
```

### api/services/identity-profile-service/src/test/java/com/auctionpromax/inboundadapterfixture/adapter/in/InvalidInboundAdapterDependency.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.inboundadapterfixture.adapter.in;

import com.auctionpromax.identityprofileservice.application.sample.CreateSampleService;

final class InvalidInboundAdapterDependency {

  private final CreateSampleService service;

  InvalidInboundAdapterDependency(CreateSampleService service) {
    this.service = service;
  }
}
```

### api/services/identity-profile-service/src/test/java/com/auctionpromax/identityprofileservice/adapter/in/web/correlation/CorrelationIdFilterTest.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.identityprofileservice.adapter.in.web.correlation;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CorrelationIdFilterTest {

  private static final Pattern CORRELATION_ID_PATTERN = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$");

  private final CorrelationIdFilter filter = new CorrelationIdFilter();

  @AfterEach
  void clearMdc() {
    MDC.remove(CorrelationIdFilter.MDC_KEY);
  }

  @Test
  void preservesValidCorrelationId() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader(CorrelationIdFilter.HEADER_NAME, "t03-local-001");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response,
        (ignoredRequest, ignoredResponse) -> assertThat(MDC.get(CorrelationIdFilter.MDC_KEY))
            .isEqualTo("t03-local-001"));

    assertThat(response.getHeader(CorrelationIdFilter.HEADER_NAME))
        .isEqualTo("t03-local-001");
    assertThat(request.getAttribute(CorrelationIdFilter.REQUEST_ATTRIBUTE_NAME))
        .isEqualTo("t03-local-001");
  }

  @Test
  void generatesCorrelationIdWhenHeaderIsMissing() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
    });

    String correlationId = response.getHeader(CorrelationIdFilter.HEADER_NAME);

    assertThat(correlationId).matches(CORRELATION_ID_PATTERN);
    assertThat(request.getAttribute(CorrelationIdFilter.REQUEST_ATTRIBUTE_NAME))
        .isEqualTo(correlationId);
  }

  @Test
  void replacesMaliciousCorrelationId() throws Exception {
    String maliciousValue = "<script>alert(1)</script>";
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader(CorrelationIdFilter.HEADER_NAME, maliciousValue);
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
    });

    String correlationId = response.getHeader(CorrelationIdFilter.HEADER_NAME);

    assertThat(correlationId)
        .isNotEqualTo(maliciousValue)
        .matches(CORRELATION_ID_PATTERN);
  }

  @Test
  void replacesCorrelationIdLongerThanOneHundredTwentyEightCharacters() throws Exception {
    String tooLong = "a".repeat(129);
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader(CorrelationIdFilter.HEADER_NAME, tooLong);
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
    });

    assertThat(response.getHeader(CorrelationIdFilter.HEADER_NAME))
        .isNotEqualTo(tooLong)
        .matches(CORRELATION_ID_PATTERN);
  }

  @Test
  void replacesWhitespaceOnlyCorrelationId() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    request.addHeader(CorrelationIdFilter.HEADER_NAME, "   ");
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
    });

    assertThat(response.getHeader(CorrelationIdFilter.HEADER_NAME))
        .matches(CORRELATION_ID_PATTERN);
  }

  @Test
  void removesCorrelationIdFromMdcAfterSuccessfulRequest() throws Exception {
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
    });

    assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
  }

  @Test
  void removesCorrelationIdFromMdcWhenFilterChainThrowsException() {
    MockHttpServletRequest request = new MockHttpServletRequest();
    MockHttpServletResponse response = new MockHttpServletResponse();

    assertThatThrownBy(() -> filter.doFilter(request, response, (ignoredRequest, ignoredResponse) -> {
      throw new ServletException("Expected test exception");
    })).isInstanceOf(ServletException.class);

    assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
  }
}
```

### api/services/identity-profile-service/src/test/java/com/auctionpromax/identityprofileservice/adapter/in/web/error/GlobalProblemDetailHandlerTest.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.identityprofileservice.adapter.in.web.error;

import com.auctionpromax.identityprofileservice.adapter.in.web.correlation.CorrelationIdFilter;
import org.junit.jupiter.api.Test;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalProblemDetailHandlerTest {

  private final GlobalProblemDetailHandler handler = new GlobalProblemDetailHandler();

  @Test
  void sanitizesUnexpectedException() {
    MockHttpServletRequest request = new MockHttpServletRequest(
        "POST",
        "/internal/technical-baseline/validate");
    request.setAttribute(
        CorrelationIdFilter.REQUEST_ATTRIBUTE_NAME,
        "t03-error-001");

    ResponseEntity<ProblemDetail> response = handler.handleUnexpectedException(
        new IllegalStateException("password=should-not-leak"),
        request);

    assertThat(response.getStatusCode().value()).isEqualTo(500);
    assertThat(response.getBody()).isNotNull();
    assertThat(response.getBody().getDetail())
        .isEqualTo("The request could not be processed.");
    assertThat(response.getBody().getProperties())
        .containsEntry("correlationId", "t03-error-001");
    assertThat(response.getBody().getDetail())
        .doesNotContain("password")
        .doesNotContain("should-not-leak");
  }
}
```

### api/services/identity-profile-service/src/test/resources/db/testcontainers/migration/V1__create_identity_test_probe.sql

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```sql
-- Technical T05 probe only. This is not a business entity.

CREATE TABLE identity.identity_test_probe (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    probe_value varchar(100) NOT NULL
);

REVOKE ALL PRIVILEGES
    ON TABLE identity.identity_test_probe
    FROM PUBLIC, ${runtimeRole};

GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE identity.identity_test_probe
    TO ${runtimeRole};

REVOKE ALL PRIVILEGES
    ON SEQUENCE identity.identity_test_probe_id_seq
    FROM PUBLIC, ${runtimeRole};

GRANT USAGE, SELECT
    ON SEQUENCE identity.identity_test_probe_id_seq
    TO ${runtimeRole};

REVOKE ALL PRIVILEGES
    ON TABLE identity.flyway_schema_history
    FROM PUBLIC, ${runtimeRole};
```

### api/services/identity-profile-service/src/test/java/com/auctionpromax/identityprofileservice/adapter/out/observability/sample/MicrometerSlf4jSampleCommandObservabilityAdapterTest.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.identityprofileservice.adapter.out.observability.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandObservation;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.UUID;
import java.util.Map;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.logging.logback.StructuredLogEncoder;
import org.springframework.core.env.Environment;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;

class MicrometerSlf4jSampleCommandObservabilityAdapterTest {

  private static final UUID EVENT_ID =
      UUID.fromString("0192f1c0-0000-7000-8000-000000000030");

  @ParameterizedTest
  @NullSource
  @ValueSource(strings = {"sample-correlation", "outer-correlation"})
  void emitsBothEcsEventsWithOneCorrelationAndRestoresMdc(String outerCorrelation) throws Exception {
    Map<String, String> originalMdc = MDC.getCopyOfContextMap();
    Logger logger = (Logger) LoggerFactory.getLogger(MicrometerSlf4jSampleCommandObservabilityAdapter.class);
    Level originalLevel = logger.getLevel();
    boolean originalAdditive = logger.isAdditive();
    var capture = new ListAppender<ILoggingEvent>() {
      @Override
      protected void append(ILoggingEvent event) {
        event.prepareForDeferredProcessing();
        super.append(event);
      }
    };
    var encoderContext = new LoggerContext();
    encoderContext.putObject(Environment.class.getName(), new MockEnvironment());
    var encoder = new StructuredLogEncoder();
    encoder.setContext(encoderContext);
    encoder.setFormat("ecs");
    try {
      encoder.start();
      capture.setContext(logger.getLoggerContext());
      capture.start();
      logger.addAppender(capture);
      logger.setLevel(Level.INFO);
      logger.setAdditive(false);
      MDC.clear();
      MDC.put("traceId", "synthetic-trace");
      if (outerCorrelation != null) {
        MDC.put("correlationId", outerCorrelation);
      }
      var expectedMdc = MDC.getCopyOfContextMap();
      var adapter = new MicrometerSlf4jSampleCommandObservabilityAdapter(new SimpleMeterRegistry());
      var observation = new SampleCommandObservation("sample-correlation", "0123456789ab", EVENT_ID);

      adapter.sampleRecorded(observation);
      assertThat(MDC.getCopyOfContextMap()).isEqualTo(expectedMdc);
      adapter.sampleReplayed(observation);
      assertThat(MDC.getCopyOfContextMap()).isEqualTo(expectedMdc);

      assertThat(capture.list).hasSize(2);
      var mapper = new ObjectMapper();
      for (int i = 0; i < 2; i++) {
        var event = capture.list.get(i);
        assertThatNoException().isThrownBy(() -> encoder.encode(event));
        var json = mapper.readTree(encoder.encode(event));
        assertThat(json.path("event").asText())
            .isEqualTo(i == 0 ? "identity_sample.recorded" : "identity_sample.replayed");
        assertThat(json.path("correlationId").asText()).isEqualTo("sample-correlation");
        assertThat(json.path("traceId").asText()).isEqualTo("synthetic-trace");
        assertThat(json.path("idempotencyFingerprint").asText()).isEqualTo("0123456789ab");
        assertThat(json.path("outboxEventId").asText()).isEqualTo(EVENT_ID.toString());
        assertThat(json.path("log").path("level").asText()).isEqualTo("INFO");
      }
    } finally {
      logger.detachAppender(capture);
      logger.setLevel(originalLevel);
      logger.setAdditive(originalAdditive);
      capture.stop();
      encoder.stop();
      encoderContext.stop();
      MDC.clear();
      if (originalMdc != null) {
        MDC.setContextMap(originalMdc);
      }
    }
  }

  @Test
  void incrementsReplayCounterOnlyForReplayObservation() {
    var meterRegistry = new SimpleMeterRegistry();
    var adapter = new MicrometerSlf4jSampleCommandObservabilityAdapter(meterRegistry);
    var observation = new SampleCommandObservation(
        "t06-correlation-001",
        "0123456789ab",
        EVENT_ID);

    adapter.sampleRecorded(observation);

    assertThat(meterRegistry.find("identity.sample.idempotency.replays").counter()).isNull();

    adapter.sampleReplayed(observation);
    adapter.sampleReplayed(observation);

    assertThat(meterRegistry.counter("identity.sample.idempotency.replays").count())
        .isEqualTo(2.0);
  }
}
```

### api/services/identity-profile-service/src/main/java/com/auctionpromax/identityprofileservice/adapter/out/observability/sample/MicrometerSlf4jSampleCommandObservabilityAdapter.java

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```java
package com.auctionpromax.identityprofileservice.adapter.out.observability.sample;

import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandObservabilityPort;
import com.auctionpromax.identityprofileservice.ports.out.sample.SampleCommandObservation;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "auction.sample-flow.enabled", havingValue = "true")
public class MicrometerSlf4jSampleCommandObservabilityAdapter
    implements SampleCommandObservabilityPort {

  private static final Logger log = LoggerFactory.getLogger(
      MicrometerSlf4jSampleCommandObservabilityAdapter.class);

  private final MeterRegistry meterRegistry;

  public MicrometerSlf4jSampleCommandObservabilityAdapter(MeterRegistry meterRegistry) {
    this.meterRegistry = meterRegistry;
  }

  @Override
  public void sampleRecorded(SampleCommandObservation observation) {
    logObservation("identity_sample.recorded", "Identity profile sample recorded", observation);
  }

  @Override
  public void sampleReplayed(SampleCommandObservation observation) {
    meterRegistry.counter("identity.sample.idempotency.replays").increment();
    logObservation("identity_sample.replayed", "Identity profile sample replayed", observation);
  }

  private void logObservation(String event, String message, SampleCommandObservation observation) {
    String previousCorrelation = MDC.get("correlationId");
    try {
      // ECS already includes MDC: adding this key again as a fluent pair breaks encoding.
      MDC.put("correlationId", observation.correlationId());
      log.atInfo()
          .addKeyValue("event", event)
          .addKeyValue("idempotencyFingerprint", observation.idempotencyFingerprint())
          .addKeyValue("outboxEventId", observation.outboxEventId())
          .log(message);
    } finally {
      if (previousCorrelation == null) {
        MDC.remove("correlationId");
      } else {
        MDC.put("correlationId", previousCorrelation);
      }
    }
  }
}
```

### .github/workflows/monorepo-verification.yml

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```text
name: Monorepo verification

on:
  pull_request:
  push:

permissions:
  contents: read

jobs:
  classify:
    name: Classify changed paths
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    outputs:
      api: ${{ steps.paths.outputs.api }}
      web: ${{ steps.paths.outputs.web }}
      contracts: ${{ steps.paths.outputs.contracts }}
      shared: ${{ steps.paths.outputs.shared }}
    steps:
      - name: Check out PR merge result or push tip
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          fetch-depth: 0
          persist-credentials: false
      - name: Set up Node.js 24.15.0
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version-file: api/.nvmrc
      - name: Install required-check test tooling
        working-directory: api/contracts
        run: npm ci
      - name: Verify classifier and aggregate regressions
        run: node scripts/migration/Test-MonorepoRequiredChecks.mjs
      - name: Classify PR base/head or push before/after
        id: paths
        run: node scripts/migration/MonorepoRequiredChecks.mjs --classify

  api:
    name: Monorepo API gates
    needs: classify
    if: ${{ needs.classify.outputs.api == 'true' }}
    runs-on: ubuntu-24.04
    timeout-minutes: 35
    steps:
      - name: Check out the same merge result or push tip
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false
      - name: Set up Temurin Java 21
        uses: actions/setup-java@cf277c60eb25467037889841efdb72551f06f6c3 # v4
        with:
          distribution: temurin
          java-version: "21"
          cache: maven
      - name: Verify identity-profile-service
        working-directory: api/services/identity-profile-service
        run: |
          chmod +x mvnw
          ./mvnw -B verify
      - name: Set up Node.js 24.15.0
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version-file: api/.nvmrc
      - name: Verify CDK toolchain
        working-directory: api/infra
        run: |
          npm ci
          npm run cdk:version
      - name: Install canonical contract tooling
        working-directory: api/contracts
        run: npm ci
      - name: Verify canonical producer contracts
        working-directory: api/contracts
        run: |
          npm run lint:openapi
          npm run validate:schemas
          npm run test:fixtures
          npm run test:governance
      - name: Reject breaking producer fixture
        shell: pwsh
        run: ./api/scripts/verify-contracts.ps1 -Mode Fixture
      - name: Verify canonical registry
        shell: pwsh
        run: ./api/scripts/verify-contracts.ps1 -Mode Registry
      - name: Verify Linux PowerShell and tool executable handling
        shell: pwsh
        run: |
          ./api/scripts/supply-chain/Test-LinuxHostedPowerShellExecutable.ps1
          ./api/scripts/supply-chain/Test-LinuxToolExecutablePermission.ps1

  web:
    name: Monorepo web gates
    needs: classify
    if: ${{ needs.classify.outputs.web == 'true' }}
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - name: Check out the same merge result or push tip
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false
      - name: Set up Node.js 24.15.0
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version-file: web/.nvmrc
          cache: npm
          cache-dependency-path: web/package-lock.json
      - name: Install dependencies
        working-directory: web
        run: npm ci
      - name: Lint
        working-directory: web
        run: npm run lint
      - name: Build production application
        working-directory: web
        run: npm run build

  lifecycle:
    name: Monorepo lifecycle gates
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - name: Check out the same merge result or push tip
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          persist-credentials: false
      - name: Set up Node.js 24.15.0
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version-file: api/.nvmrc
      - name: Verify Sprint 002 lifecycle and Sprint 001 closeout
        run: |
          node api/scripts/decisions/Test-S002-Lifecycle.mjs
          node api/scripts/decisions/Test-S001-T09-Decisions.mjs --require-complete --require-closeout
          node api/scripts/decisions/Test-S002-Lifecycle.mjs --repository

  monorepo-required:
    name: monorepo-required
    needs: [classify, api, web, lifecycle]
    if: ${{ always() }}
    runs-on: ubuntu-24.04
    timeout-minutes: 5
    steps:
      - name: Require every applicable component to succeed
        env:
          CLASSIFY_RESULT: ${{ needs.classify.result }}
          API_REQUIRED: ${{ needs.classify.outputs.api }}
          WEB_REQUIRED: ${{ needs.classify.outputs.web }}
          API_RESULT: ${{ needs.api.result }}
          WEB_RESULT: ${{ needs.web.result }}
          LIFECYCLE_RESULT: ${{ needs.lifecycle.result }}
        run: |
          node -e '
          const { CLASSIFY_RESULT, API_REQUIRED, WEB_REQUIRED, API_RESULT, WEB_RESULT, LIFECYCLE_RESULT } = process.env;
          const ok = CLASSIFY_RESULT === "success" && LIFECYCLE_RESULT === "success" &&
            [[API_REQUIRED, API_RESULT], [WEB_REQUIRED, WEB_RESULT]].every(
              ([required, actual]) =>
                (required === "true" || required === "false") &&
                actual === (required === "true" ? "success" : "skipped")
            );
          if (!ok) {
            console.error("MONOREPO_REQUIRED_GATE_FAILED");
            process.exit(1);
          }
          console.log("MONOREPO_REQUIRED_GATE_PASS");
          '
```

### api/.nvmrc

Snapshot toàn file từ local tree tương đương PR19; chỉ normalize CRLF sang LF để hiển thị. Không phải source T02 đã implemented.

```text
24.15.0
```
