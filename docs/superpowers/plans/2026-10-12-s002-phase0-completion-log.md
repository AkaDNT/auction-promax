# Sprint 002 / Phase 0 completion log — 2026-10-12

Status: IN_PROGRESS. Sprint 002 is not complete; Phase 0 remains open. This record distinguishes published evidence, preserved local work and verification executed in the current session.

## Authority and owner ruling

The owner requested careful completion of Sprint 002 / roadmap Phase 0, a clear work log, and context for unresolved business errors or decisions. The owner then removed time constraints because this is a personal project. [The dated decision](../../../api/docs/decisions/S002_NO_TIME_LIMIT.md) supersedes hour/reserve ceilings, deadlines and capacity stop gates; technical, business, security, review and publication gates remain.

Roadmap Phase 0 is the platform engineering foundation. The “Phase 0” in the open Spring remediation dossier is an earlier read-only dependency investigation, not roadmap exit. Its later implementation and hosted acceptance do not complete Sprint T04–T07.

## Repository audit and published evidence

- Primary checkout is `migration/monorepo` at an older revision with existing user edits; it was left intact.
- Current GitHub default branch is `migration/monorepo`, revision `54c72e67f84fee3e7fef3686b473840d9997dcc7`. Verified by `gh repo view`, `gh pr list`, `git ls-remote`, and a read-only fetch. The IDE-linked T03 worktree was clean before starting the new local branch `work/s002-phase0-completion` from that revision.
- T01 activation: PR #19 merge `6459baf17ae8a88aeceb5d5d24bc0c601ba6868b`, tree `f5ce08f4c4c1d5f8ffe3b69ae3abaffed01ad2ba`. Actual merge push [Monorepo run](https://github.com/AkaDNT/auction-promax/actions/runs/37411870026) passed; [supply-chain run](https://github.com/AkaDNT/auction-promax/actions/runs/37411869987) has `supply-chain-verification=success` and historical `release-policy=failure`. Whole-workflow failure is not a failed required execution job or risk acceptance.
- T02 templates: PR #20 merge `03f1e7b7af93e68a4a47fbef3ea9c23d351ced24`. Actual merge push [Monorepo run](https://github.com/AkaDNT/auction-promax/actions/runs/37605682647) passed; [supply-chain run](https://github.com/AkaDNT/auction-promax/actions/runs/37605682664) has execution verification success and historical release-policy failure. Source-template delivery is not generated-service acceptance.
- T03 implementation: PR #21 merged at `d58630e684bcd746f0ea6d5d202962dfd4420d73`; post-integration records were merged through PR #22/#23. Fresh [security-freshness run 38130554659](https://github.com/AkaDNT/auction-promax/actions/runs/38130554659) is completed/success on exact default revision `54c72e6`; resolver, repository scans, all five service legs, aggregate and `freshness-release-policy` each report success. This session read run/job metadata; it has not yet downloaded/revalidated that run's artifacts. Prior downloaded-artifact evidence remains bound to the revisions in the [T03 execution log](2026-10-07-s002-t03-execution-log.md).
- Current default revision also has successful Monorepo `38081264725`, Supply-chain `38081264711`, API `38081264728` and Web `38081265055` runs. No new workflow was dispatched in this audit.

## Documentation and lifecycle work in this session

1. Corrected stale current records: the Sprint/Index/Delivery/Review documents still said T01 was pending and T02 unstarted despite published T02/T03 evidence. T01/T02 are recorded delivered; T03 is technically accepted; T04 is in progress; T05–T07 remain planned. Sprint closeout publication remains pending.
2. Recorded the owner's no-time-limit ruling. Updated current capacity/duration fields and parent-plan stop rules; added explicit supersession notices to relevant S002 plans/specs without rewriting old run results or dated approvals.
3. Added lifecycle behavior for the explicit unbounded owner approval. New positive and negative fixtures were written first. RED: `node api/scripts/decisions/Test-S002-Lifecycle.mjs` exited 1 before implementation (the harness sanitizes assertion failures as `INPUT_INVALID`). GREEN: the same command emitted `S002_LIFECYCLE_FIXTURES_PASS`, exit 0 after implementation. Historical approval format remains supported; missing approval/scope/owner/reference and premature phase transition remain rejected.
4. Corrected the template README's obsolete Boot version to the delivered 4.0.8 baseline and made security coverage distinguish historical blocked policy from accepted integrated T03 policy.

## Preserved T04 checkpoint discovered during audit

A separate nested repository under `.worktrees/s002-t04-host` owns `.worktrees/s002-t04-service-runner`. It was absent from the primary repository's worktree list. Its branch contains local commit `f7e5dbfec46679f9ef4293ad1ff8e7a1ff069619`, based on `54c72e6`, plus two dirty files. The source checkout, its commit, ignored evidence and uncommitted changes were preserved.

The commit supplies registry-bound `api/scripts/Run-ServiceLocal.ps1`, `Test-ServiceHttp.ps1`, runtime fixtures, source contracts, workflow fixture wiring, relational isolation proof source and a runbook. Its ledger reports source/static regression success, but no independent acceptance, push or actual runtime/hosted proof. Dirty changes set/restore PowerShell native argument-passing preference and assert restoration; they are not treated as accepted fixes.

Do not regenerate existing work or declare T04 done from source tests. Review/reuse this checkpoint, reproduce its runtime problem, then complete actual Auction acceptance through the approved isolated-CI generation route. Four undelivered services must not be generated locally under the prior owner ruling.

## Remaining acceptance gates

| Task | Required remaining proof |
| --- | --- |
| T04 | Review preserved runner; real PowerShell 7/5.1 fixture execution; registry-bound Auction Maven/Failsafe, PostgreSQL ownership/DML/DDL/cross-DB checks, live HTTP/logs and revision-bound artifact/security evidence on an allowed runner |
| T05 | Independent Bidding/Billing relational and database-free Gateway proof, including per-service live HTTP and artifact evidence; no product business code |
| T06 | Fail-closed D01–D12/E01–E03 exit matrix and inherited-gap reconciliation; frozen exact-revision clean rehearsal, Identity sample request/event replay, five-service security evidence, independent review and protected publication |
| T07 | Explicit owner confirmation of actual published Phase 0 exit/handoff, tested transition bookkeeping, protected merge/read-back and final lifecycle/matrix verification |

Business boundaries remain ADR-026/027: Auction owns non-monetary entitlements/publication, Bidding owns canonical bid state, Billing owns only platform listing-package purchases. No wallet/escrow/auction-item settlement or product endpoint belongs to this sprint. Consumer compatibility remains `DEFERRED_NO_PRODUCER_CONTRACT`.

## Environment observations and rollback

### Current-session verification of the owner amendment

- Lifecycle fixtures and repository mode: PASS. New negative fixtures also cover wrong date/owner/scope, missing fields and partially malformed unbounded tokens.
- Registry: 7/7 PASS; template conformance: 37/37 PASS; required-check classification: 12/12 PASS; historical S001-T09 closeout regression: PASS.
- Identity handoff: all 103 tracked files unchanged; changed Markdown file links passed (29 files / 70 links at the first check). Whitespace check passed.
- Independent amendment review found no Critical/Important issue; three Minor suggestions (chronology, explicit link/history heading and expanded negative coverage) were addressed. No publication/exit gate was removed.
- Ordinary runtime invocations were retried with approved sandbox escalation, without a policy override. Both `pwsh -NoProfile -NonInteractive -File api/scripts/Test-RunServiceLocal.ps1` and `powershell.exe -NoLogo -NoProfile -NonInteractive -File api/scripts/Test-RunServiceLocal.ps1` now launched successfully in the preserved T04 checkout, but each exited 1 with `SERVICE_LOCAL_MAVEN_FAILED`. Thus the earlier unavailable-runtime observations are historical; current blocker is a reproducible runtime harness failure.

Independent T04 review reproduced the cause using synthetic argv only: CMD positional `%~3` splits the unquoted equals sign in a valid `-Dspring-boot.run.profiles=local` token, while the real Maven wrapper forwards `%*` to Java. The dirty `Standard` preference change does not repair this fake-wrapper assertion. Review also identified invalid Unix containment fixtures and PS5's inability to represent an empty process variable using the .NET setter. These are test-harness defects requiring correction and rerun, not evidence of a business-code failure.

`docker info --format '{{.ServerVersion}}'` failed: local Docker daemon pipe does not exist and sandbox access to Docker config was denied. This is not a passing Docker/Failsafe result. Windows PowerShell tool host is 5.1; `pwsh.exe` resolves to a WindowsApps alias and no installation was found at the usual Program Files path. Earlier T04 ledger reported alias access failure and Restricted script execution. Runtime capability must be checked with ordinary supported invocations; no execution-policy bypass is authorized.

Rollback uses reviewed reverts of local changes. No database reset/drop, source deletion, primary-checkout reset, merge, deployment or release has occurred. Dates, actual effort and missing evidence are not fabricated.

## T04 continuation — runtime fixes and local topology proof

The reviewed owner amendment was committed locally as `ea95d47`; preserved checkpoint `f7e5dbf` was fetched from its local nested repository and cherry-picked as `2e54415`. The original checkout and its two uncommitted files remain unchanged. Its attempted `Standard` preference workaround was not copied because the failure was in the fake batch observer, not proven production argument handling.

### RED / GREEN and review corrections

- Replaced the Windows fake wrapper's `%~3` interpretation with raw `%*` forwarding to a controlled Node executable that asserts actual argv and synthetic environment values. Credentials are never printed, even in assertion failures.
- Empty-variable restoration now compares the actual prior state representable by the runtime; PS5's setter deletes a requested empty value. Unix containment fixtures use a truly distinct case-variant repository-root sibling, with explicitly bounded cleanup.
- The first successful argv rerun exposed another fixture defect: case-insensitive `-replace 'auction_db'` also mutated uppercase config key names. `-creplace` changes only the database value. Both normal PS7 and PS5.1 runner harnesses then completed PASS with all applicable fixtures; Linux-only path assertions still require hosted proof.
- Added real loopback HTTP responder tests. Before implementation, five wrong-typed JSON responses were incorrectly accepted; the sensitive actuator also had no live denial check. The verifier now requires boolean/integer success fields and integer problem status, refuses redirects, and fails if `/actuator/env` is accessible. HTTP runtime fixtures passed 8/8 separately on PS7 and PS5.1. A BOM in the existing fixed-code log was normalized in the test; no raw response is logged.
- Added the HTTP fixture command to both existing owning workflows and fail-closed workflow mutation checks. Missing-command mutations were observed RED; contract implementation then passed all repository/negative/ownership checks.
- Generated-service Docker smoke now runs this live verifier after readiness and before PASS, retaining a fixed failure code and existing exact-container/database/network cleanup. Its ignored fixed-code log is separate from the seven sanitized scan summaries. Identity's original smoke route remains preserved.
- Independent review found the HTTP test child lacked a timeout. Added a bounded operational timeout, retained exact child handle and awaited closure before cleanup. Planning time limits remain removed; process safety timeouts remain intact. Follow-up review found no new Critical/Important issue; exact committed-SHA review and Linux/Docker execution remain pending.

### Dedicated native cluster — owner decision and executed evidence

Read-only old-cluster status found only the Identity/Auction pairs under the new allowlist. The revised verifier exited 1 at `Missing required .env.local value: BIDDING_DB_NAME`. Further read-only inventory confirmed the four legacy financial databases and twelve historical roles; each database had zero non-system tables. No bootstrap or mutation was attempted there.

The owner explicitly selected a separate cluster: [isolated PostgreSQL decision](../../../api/docs/decisions/S002_ISOLATED_LOCAL_POSTGRES.md). Created a new private data directory, initialized with installed PostgreSQL **17.9**, UTF-8 and SCRAM authentication, then started it on loopback port **55432**. Kept the old cluster and primary ignored configuration intact. New admin and per-role passwords were locally generated and written only to ignored private files; no password is present in Git, command-line arguments or this log.

Executed commands (full private logs retained under this plan's ignored workspace):

| Command | Result |
| --- | --- |
| `initdb --pgdata <new-private-data-directory> --encoding=UTF8 --locale=C --username=apx_phase0_admin --pwfile=<private-file> --auth=scram-sha-256` | Exit 0; dedicated new cluster initialized |
| `pg_ctl -D <new-private-data-directory> -l <private-log> -w start` | Exit 0; loopback-only instance started |
| `pwsh -NoProfile -NonInteractive -File api/scripts/local-db-bootstrap.ps1` (first) | Exit 0; bootstrap and full isolation matrix PASS 8/8; `native-bootstrap-1.log` |
| Same bootstrap command (second) | Exit 0; convergent rerun and full isolation matrix PASS 8/8; `native-bootstrap-2.log` |
| `pwsh -NoProfile -NonInteractive -File api/scripts/local-db-status.ps1` | Exit 0; eight canonical databases and 24 least-privilege roles; `native-status.log` |
| `pwsh -NoProfile -NonInteractive -File api/scripts/supply-chain/Invoke-GitleaksScanning.ps1` | Exit 0; trusted worktree/history scan PASS, directory/history/false-positive counts all zero |

Native evidence supplements, rather than substitutes for, canonical PostgreSQL **17.11** Testcontainers. No generated service destination was created locally. A new exact-candidate isolated hosted run is still required for actual Auction Maven/Failsafe, real container HTTP smoke and sanitized artifact evidence.

## PR #24 initial hosted technical proof and source-delivery ruling

The initial push/draft-PR request was rejected by automatic approval review because explicit public-repository publication consent was missing. No alternate route was used. After the owner expressly authorized reviewed/secret-scanned candidates on `work/s002-phase0-completion`, draft PRs/CI at public `AkaDNT/auction-promax`, and kept merge separate, candidate `6f4e84828d979f25210df3b8c8cce3800fa23f2f` was pushed and [Draft PR #24](https://github.com/AkaDNT/auction-promax/pull/24) opened against `migration/monorepo`. Exact-SHA independent review found no Critical/Important issue before that publication. Private config/raw logs were not uploaded.

PR [supply-chain run 38195223097](https://github.com/AkaDNT/auction-promax/actions/runs/38195223097) and push [run 38195220041](https://github.com/AkaDNT/auction-promax/actions/runs/38195220041) completed SUCCESS. PR metadata independently binds candidate head `6f4e848` to checked-out PR merge execution **`9d6e4849a2710db4e33fe0b16a8576d3e7439b87`**. Repository scans, all five service legs, aggregate and separate release-policy passed. The same candidate's Monorepo/API/Web PR and push workflows passed.

Actual PR Maven log totals (zero failures/errors/skips in every row):

| Service | Surefire | Registered Failsafe | Source provenance |
| --- | ---: | ---: | --- |
| Identity | 118 | 10 | Committed |
| Auction | 19 | 4 | Ephemeral CI-generated |
| Bidding | 19 | 4 | Ephemeral CI-generated |
| Billing | 19 | 4 | Ephemeral CI-generated |
| Realtime gateway | 19 | 1 | Ephemeral CI-generated, no database |

The actual Linux repository fixture log confirms execution of both case-sensitive containment tests and completion of the runner harness. All service jobs passed their registered non-skipped Failsafe assertion, Spring/Jackson graph gate, actual artifact-aware scan and hardened container smoke. The generated-service smoke implementation at this exact revision runs the typed live HTTP verifier before writing PASS. Child stdout is suppressed by the existing orchestrator, so no direct `SERVICE_HTTP_PASS` log marker is claimed.

Downloaded only five seven-file sanitized service artifacts, five isolated matrix-result artifacts and the sanitized repository artifact. Locally checked every service document against the committed strict schema, exact file set, identity and execution SHA, then ran the exact-five aggregate independently: `LOCAL_HOSTED_AGGREGATE_PASS services=5 policy=PASS`. Every service has dependency findings=2 and container findings=2; all four entries are MEDIUM, with CRITICAL/HIGH/UNKNOWN=0 and smoke `UP` on `linux/amd64`. Repository execution/policy are PASS. These findings remain carried rather than dispositioned or hidden.

Offline validation does not claim the full JAR-binding validator ran locally: it requires the checked-out execution SHA and actual built JAR, which this local branch does not contain. That full validator ran successfully in each owning CI service job, on its real artifact. The local checks are strict sanitized schema/identity/count/set aggregation; no validator was weakened.

T04 runtime-tooling technical proof is established for this candidate; T04 service-source delivery and protected publication are still open. The owner explicitly selected **CI generation → source export → review/import/commit**, retaining CI-only generation. See the [source delivery plan](2026-10-12-s002-ci-source-delivery.md). Temporary CI skeletons are not mislabeled as delivered committed services.

The source exporter delta introduces a closed JSON bundle of exact approved source bytes/paths/modes/hashes and service/execution identity. It cannot export Identity, extra files, altered content even after rehashing, a forged revision or an existing/linked output; normal local CLI use is refused. A positive synthetic hosted CLI test also exposed a matching dirty-template/source revision claim, observed RED and corrected by checking tracked source inputs against HEAD. Current bundle/CLI suite is 26/26 PASS; combined generated conformance, registry, template (38/38), owning/root/hosted repository and negative workflow contracts passed. Source artifacts use their own exact JSON-only path and pinned upload only after Maven/Failsafe/graph/hosted evidence success; sanitized evidence upload behavior remains unchanged. Initial independent review found no Critical/Important finding and its CLI coverage suggestion was implemented. Exact-SHA review and real hosted exporter/source-artifact proof remain the next gates.

The same delivery preparation reconciled current version documents with already-approved, integrated T03 remediation: build baseline now records Boot 4.0.8/CDK library 2.273.0; ADR-002 contains an explicit traceable supersession rather than rewriting its historical 3.5.x decision; active S002 plan/spec no longer demand the obsolete framework pin. Historical ADR/S001 closeout tests passed after the correction.

Added two canonical relational Testcontainers acceptance tests for the existing role model: database owner is `NOLOGIN`, migrator owns schema and Flyway history, and runtime SELECT/INSERT/UPDATE/DELETE on migration history each fail with PostgreSQL SQLSTATE `42501`. These extend evidence for an existing invariant; no production code/schema/privilege change or runtime RED/GREEN result is claimed before the next hosted execution. Context7 primary Spring JDBC documentation confirmed the parameterized query API used. Template/source-bundle fixtures passed (34/34 combined, template 38/38); actual new Failsafe cases remain pending CI.

Full native generator regression subsequently passed 40/40 using synthetic temporary roots and ordinary PowerShell publication. Registry export changed no generator semantics; no service was generated in the real repository. Source-export candidate whitespace, historical ADR/closeout, Identity preservation and changed-document links passed. Trusted Gitleaks worktree/history counts remained 0/0/0 before candidate review/publication.

## Verified CI export and Auction source import

Independent exact-SHA review of `87969288d62af90fd40987980530de631fbad982` found no Critical/Important issue. Authorized publication completed; PR [run 38199242294](https://github.com/AkaDNT/auction-promax/actions/runs/38199242294) and push [run 38199239399](https://github.com/AkaDNT/auction-promax/actions/runs/38199239399) passed. The PR execution SHA is `f8063366d41c1672316499ae481b89c0a10ad222`, independently read from GitHub and bound by artifact contents. All five service legs, repository scans, aggregate and release policy succeeded. Each new service's export and gated source upload succeeded; Identity correctly skipped them.

Actual Maven totals were Identity 118 Surefire/10 Failsafe, each relational foundation 19/6, and gateway 19/1, all with zero failures/errors/skips. The added relational ownership/history-denial cases therefore have actual canonical hosted execution proof. Downloaded sanitized evidence passed strict seven-file/schema/identity checks and exact-five local aggregation; all services retain four MEDIUM findings, zero CRITICAL/HIGH/UNKNOWN and smoke UP. The full artifact/JAR-binding validation remains the owning CI result, not an offline claim.

Downloaded and validated all four source bundles against the committed exact template expansion, inventory, modes, file hashes, bundle digest, service identity and execution SHA: Auction/Bidding/Billing each 25 files, gateway 23. Source artifact IDs are respectively `11724703331`, `11723884238`, `11725010470`, `11723824585`. Bundles and raw hosted logs remain private/ignored.

Imported Auction from those validated CI bytes through an owned sibling stage and the existing atomic no-overwrite publisher; no local generator was invoked. Post-publication conformance and every file hash passed. The committed delivery provenance records the originating candidate, actual execution/run/artifact identities and source hashes; it does not invent a future commit identity. Auction's committed-source CI and protected publication remain pending. Bidding/Billing/Gateway source imports and T06/T07 remain open.

Auction delivery commit `02e4c724939ce691f6b136a022dc74728467c4dc` received independent exact-SHA review: all 25 Git blobs, hashes and modes match the CI bundle, including executable `mvnw`; no findings. Trusted Gitleaks directory/history/false-positive counts were 0/0/0. Authorized PR [run 38199769493](https://github.com/AkaDNT/auction-promax/actions/runs/38199769493) and push [run 38199766695](https://github.com/AkaDNT/auction-promax/actions/runs/38199766695) passed all supply-chain/release gates. PR head binds to execution `59c48908b76d214e56a43eeaaf9503fcc15b44c4`; downloaded Auction artifact `11724913549` explicitly records source provenance **committed**, execution/policy PASS and no failure. This establishes the committed-source technical route; protected default-branch publication remains open.

After that gate, imported Bidding, Billing and gateway from the previously validated successful CI bundles using the same staged no-overwrite publisher. All post-import conformance/file hashes passed, with per-service provenance outside the exact source inventories. No generator ran locally and Identity was preserved. Their scoped candidates still require independent review and actual committed-source hosted verification; T06 final rehearsal/matrix and T07 exit/handoff remain pending.
