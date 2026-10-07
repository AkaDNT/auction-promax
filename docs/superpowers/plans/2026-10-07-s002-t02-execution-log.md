# T02 execution log — 2026-10-07

Status: LOCAL_IMPLEMENTATION_VERIFIED_PENDING_HOSTED_PROOF. T02 DONE remains pending the protected Linux run. Parent task remains unchecked until that evidence exists.

Authority: OWNER-DECISION-2026-10-06-S002-T02-EXECUTION, and the separately approved OWNER-DECISION-2026-10-06-S002-TOPOLOGY-RECONCILIATION prerequisite. User rulings on 2026-10-07 permit destination reuse only across disjoint variants and exactly three native wrapper placeholders in `mvnw.cmd`.

Plan: [T02 detail guide](2026-10-06-s002-t02-service-template-guide.md). Prerequisite: [topology reconciliation log](2026-10-06-s002-topology-reconciliation-log.md).

## Delivered local source

- Exact five-record registry; Identity is preserved and cannot be generated. Auction, Bidding, Billing and Gateway are the four generation targets.
- Closed 28-source inventory. Repeated destinations are allowed only across mutually exclusive variants; selected output paths remain unique, including casefold comparison.
- Node generator with literal expansion, UTF-8 validation, CRLF-to-LF normalization, explicit modes, sibling staging, owned lock and PowerShell `Directory.Move` publication.
- Public API/CLI in `Generate-Service.mjs`; internal IO adapter in `ServiceGeneratorCore.mjs` permits deterministic failure injection without public unsafe/test options.
- Owned stage and parent identities are rechecked before writes and publication. Cleanup checks ownership and preserves replacement stages/locks. Hard interruption retains artifacts for explicit inspection.
- `Inspect-ServiceArtifacts.mjs` reports reserved stage/lock paths relative to the repository, without deleting artifacts or exposing lock contents. Existing artifacts block generation until ownership is verified and cleanup is explicitly performed.
- Common technical HTTP, DTO validation, sanitized errors, correlation handling, ECS tests, architecture boundaries and deliberate negative fixtures; relational probe/bootstrap/IT and database-free gateway IT source.
- Exact wrapper content is preserved except CRLF-to-LF normalization. Only `__MVNW_ARG0_NAME__`, `__MVNW_CMD__`, `__MVNW_ERROR__` pass through, exclusively in `mvnw.cmd`. Other placeholder forms fail closed.
- Existing unconditional lifecycle job runs generator, template conformance and Linux publisher fixtures. Required-check names, aggregate and service selection are unchanged; T03 service matrix is not implemented here.

## Safety and regression evidence

The generator suite renders all four services into two independent temporary roots and compares sorted path/SHA256 inventories. It asserts exact emitted file sets, UTF-8/LF/no BOM, wrapper exceptions, mode policy and POSIX modes under hostile umask when running on Linux.

Additional fixtures cover malformed registry, unknown/preserved ids, missing publisher, render/write/pre-publish exceptions, existing empty/nonempty/file/case-alias destinations, late destination creation, links and ancestor links, replaced staging ownership, orphan reporting, overlapping generator calls, real two-process generation, process termination while staged and foreign-CWD sanitized CLI errors. Actual publisher tests independently exercise collisions and concurrent `Directory.Move` attempts.

Windows refuses to rename the services parent while the owned lock is open (observed EPERM). The Windows replacement fixture therefore replaces the stage itself; the Linux branch replaces the services parent. Linux parent-replacement execution is pending and is not inferred from Windows results.

Reusable source conformance accepts valid templates and rejects deliberate mutations: wrapper pin, unknown token, gateway JDBC dependency/configuration, missing Failsafe selector/class, empty logging/architecture tests, missing duplicate-key detection, missing outer-MDC case and missing named negative-fixture assertion.

| Verification | Observed result |
| --- | --- |
| Generator final rerun | PASS 39/39; four services, real concurrent processes; exit 0 |
| Template conformance | PASS 30/30 |
| Registry fixtures | PASS 7/7; exit 0 |
| Publisher, Windows PowerShell 7 | PASS, 11 executed |
| Publisher, Windows PowerShell 5.1 | PASS, 11 executed; no policy override |
| Required-check/workflow/lifecycle regressions | PASS: required-checks 12/12; workflow repository contract; S002 fixture/repository; S001 T09 complete/closeout |
| Canonical Gitleaks contract, final source rerun | PASS: dirFindings=0, gitFindings=0, falsePositives=0; exit 0 |
| Identity and Markdown handoff, final rerun | PASS: 101 files match tracked blobs and raw checkout-filter baseline; four changed Markdown files, six file links checked |
| Protected Linux symlink/mode/publication run | PENDING_HOSTED_PROOF |

## Defects discovered and corrected

1. Publisher `-File` initially defined its function without invoking it. Corrected CLI dispatch; actual directory publication is exercised.
2. Gateway-selected architecture fixture imported `JdbcTemplate` despite no gateway JDBC dependency. Replaced it with `ApplicationContext`; selected Java imports are checked for datastore dependencies.
3. Security permitted the whole internal technical namespace. Restricted it to exact validation POST and added tests denying other paths/methods.
4. Unknown-token residue detection only covered uppercase. Added mixed-case/lowercase detection while preserving the exact wrapper exceptions.
5. Source conformance checked logging/architecture file presence without enforcing their required construction. Added reusable checks and mutation negatives. Logging now exercises the actual controller through the correlation filter, captures deferred MDC, uses the real ECS encoder and strict duplicate-key parsing, and asserts outer MDC restoration.
6. Empty domain/application/ports rules would fail an otherwise domain-free foundation. Empty-rule allowance is scoped to production checks; deliberate negative fixtures remain strict.
7. PS5.1 fixture cleanup prompted when `Remove-Item` encountered a nonempty junction. Cleanup now validates fixture-root containment and ReparsePoint, then deletes only the link with non-recursive `Directory.Delete`. Both Windows hosts passed afterward.
8. PASS markers were printed before test completion. They now appear only on successful process exit.

Independent scoped review found the gateway/security/token issues and the missing source assertions. Follow-up review verified the fixes and reported no remaining Critical/Important issue in the controlled-workspace scope. Link cleanup received a separate read-only review. No adversarial filesystem-handle guarantee was reviewed or claimed.

## Identity preservation and historical digest

Current raw manifest SHA256: `52387fed2968047f5f2dffae14b0457c1f02f4df189ab578beb55348ba6e9a63`. Algorithm: ordinal-sort repository-relative slash paths; concatenate path + NUL + lowercase SHA256 of actual bytes + LF for every tracked Identity file. All 101 files also match their HEAD blobs through Git filters and match HEAD's expected raw checkout bytes using `git cat-file --filters`.

The older local ledger recorded `33a049c3c2bb6e6f38ca8ac5aa710ef8ddf68e775de371b47c4f885fd3196cd0` without a retained per-file manifest or full hashing command. Its documented format could not be reproduced; this log does not claim those aggregate digests equal. The independently checked per-file HEAD/raw-checkout comparison establishes the observed current preservation evidence. Identity source was not edited.

## Remaining acceptance and publication

### PR20 Linux failure and narrow correction

Owner authorized branch push/PR publication; PR20 is open against `migration/monorepo`, head `f7cf1465e960dd297aba09931766bebb09458d14`. Monorepo run `37596959288` failed in the foundation step: generator 34/39 passed, four service mode assertions and their parent failed (`0 !== 420`). Conformance/publisher commands were not reached. API/web and supply-chain-verification checks passed; release-policy remains outside T02 and unchanged.

Root cause: `await lstat(path).mode` reads `.mode` from the Promise, not the resolved stat. A minimal reproduction returns 0 for the old expression and a real mode for `(await lstat(path)).mode`. The correction adds parentheses in the fixture only; generator chmod, output bytes/paths and mandatory mode expectations are unchanged. Local rerun: generator 39/39 and conformance 30/30, exits 0. Linux GREEN remains pending a new hosted run; Windows does not execute the POSIX assertion.

At head `62b13238ea0be57dede1e8ff02f1854d6f05d40c`, PR run `37599078465` observed Linux generator 39/39 and conformance 30/30 PASS. Publisher then failed at test-helper line 35: `Directory.Delete` could not delete the Unix directory symlink. This is fixture cleanup, not production publication. Cleanup retains containment/reparse validation, uses non-recursive `Directory.Delete` for Windows junctions and `File.Delete` to unlink Unix entries (including dangling symlinks). Added link-absence and nonempty target-sentinel preservation assertions. Windows PS7 and PS5.1 reruns both PASS executed=11; Linux rerun pending. No production source, wrapper/output, workflow gate or release-policy was changed.

Local prerequisite commit: `c8a00ca395aa6fb55fe6e51827a1b90bda469450`, tree `0e6125bbc34ccaac76351f944154da5e10c89d34`. Both PowerShell hosts passed `Test-LocalDbTopology.ps1` (metadata only). This is a local source commit, not a published/native-topology claim.

The approved Linux route must run on the published candidate revision and retain the exact SHA, workflow/run identity and successful fixture evidence. Local Windows success does not establish Linux symlink, parent replacement, hostile-umask mode or publication behavior.

Local T02 source commit: `a0b4a3eb9d9cd28d200caa81663f569a11017e09`, tree `0b7ff987db7d62df6f15d86219d7c7394aebda9b`. Exact staged-path whitespace verification passed before commit. This follow-up documentation records the source commit; the final candidate revision includes this evidence update.

Push/PR publication needs owner authorization under the plan; no merge authority is implied. Proposed publication: a dedicated `work/s002-t02-service-foundation` branch and PR for the already-approved protected Linux route, without merging. After Linux acceptance, update this log and the parent task with observed evidence. A hosted failure must be diagnosed before T02 can be marked DONE.

Generated Maven/Failsafe execution, resolved transitive dependency exclusion, native PostgreSQL isolation and artifact/SBOM scans remain T04/T05 obligations. No generated service, business/domain implementation, native database operation or credentials were delivered in T02.
