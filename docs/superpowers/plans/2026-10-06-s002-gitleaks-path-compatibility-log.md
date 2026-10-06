# S002 — Gitleaks web-route path compatibility execution log

Recorded: 2026-10-06. Worktree: `.worktrees/s002-design`; branch: `work/s002-foundation-design`; HEAD: `904788e289f66ac5adc9006b11a52af75d462ffa`. Local uncommitted changes; no activation, merge or publication approval is inferred.

## Trigger and scope

The owner manual scan stopped with `GITLEAKS_WORKING_TREE_PATH_UNSAFE` before the scanner ran. Diagnosis found 33 legitimate web route paths containing parentheses/brackets, for example `web/app/(admin)/admin/auctions/[id]/page.tsx`. The API snapshot helper and report sanitizer both used a narrower filename alphabet. The earlier manual monorepo instructions had not accounted for this API-specific restriction.

Only scanner path compatibility and its regression fixtures are changed. No application/business code, scanner version, checksum, scan arguments, policy or allowlist changes are included. Parent plan and activation gates retain their existing authority.

## Changes

- `api/scripts/supply-chain/GitleaksScanning.psm1`: permit literal `()` and `[]` in candidate and sanitized report paths. Preserve traversal, absolute/drive path, unsupported-character, `.env.local`, containment and existing reparse checks. Snapshot file operations remain literal/.NET; fingerprint matching remains regex-escaped.
- `api/scripts/supply-chain/Test-GitleaksWorkingTreeSnapshot.ps1`: tracked/untracked web route fixture proves actual snapshot contents, using literal Git pathspec and exact file reads. Test summary corrected to actual case count.
- `api/scripts/supply-chain/Test-GitleaksScanning.ps1`: both directory/Git reports preserve route path/fingerprint identity; traversal, ADS and wildcard fixtures remain rejected. Test summary corrected to actual case count.

## RED / GREEN evidence

Initial execution through the sandbox failed to launch the installed WindowsApps PowerShell 7 executable (alias inaccessible; direct package executable Access denied). Running that same installed PowerShell outside the sandbox succeeded, without an execution-policy override or change.

RED on original helper: new snapshot route assertion failed with `GITLEAKS_WORKING_TREE_PATH_UNSAFE`; new sanitizer assertion failed with `GITLEAKS_REPORT_PATH_UNSAFE`. Two later env-local cases also reached the route rejection first; those were cascading fixture failures, not additional root causes.

GREEN after the narrow fix, PowerShell 7.6.6, `-NoProfile -File`:

| Verification | Exit | Observed result |
| --- | --- | --- |
| `api/scripts/supply-chain/Test-GitleaksWorkingTreeSnapshot.ps1` | 0 | 6/6 PASS |
| `api/scripts/supply-chain/Test-GitleaksScanning.ps1` | 0 | 13/13 PASS |
| `api/scripts/supply-chain/Test-GitleaksScanAdapters.ps1` | 0 | 6/6 PASS; unexpected scanner exit still rejected |
| `node api/scripts/supply-chain/Test-GitleaksScanContract.mjs` | 0 | PASS |
| `node api/scripts/supply-chain/Test-GitleaksConfiguration.mjs` | 0 | PASS |
| `node api/scripts/supply-chain/Test-GitleaksAllowlistSchema.mjs` | 0 | PASS |
| `node api/scripts/decisions/Test-S002-Lifecycle.mjs --repository` | 0 | PASS |
| `node api/scripts/decisions/Test-S001-T09-Decisions.mjs --require-complete --require-closeout` | 0 | PASS |
| `git diff --check` | 0 | PASS; existing spec LF/CRLF advisory only |

The real worktree candidate query accepted 498 files including all 33 route paths before this log was added. Counts describe that observed file set; adding this log changes the candidate set and requires a fresh scan fingerprint.

## Independent scoped review and remaining gates

Read-only independent review found no blocking/important issue in the changed path handling or fixtures. Its optional literal-Git-pathspec suggestion was adopted. Ancestor-junction handling was noted as pre-existing and outside this patch; no new broader safety guarantee is claimed.

## Actual trusted scan

On 2026-10-06, the repository-verified Gitleaks 8.30.0 scanned a temporary literal-path snapshot of the whole worktree and full reachable Git history. The observed source contained 499 candidates and 43 reachable commits. Directory and Git scans each returned exit 0 with zero findings; scanner stderr was empty. Scope/history fingerprints and HEAD/branch remained unchanged during the run. Raw reports and the temporary snapshot were removed; only sanitized inventory was retained locally.

The first wrapper attempt emitted an extra .NET task return object, making its displayed exit fields ambiguous. That summary was discarded. Suppressing the task return and asserting exactly one scanner-result object preceded a complete successful rerun. No scanner failure was relabeled as a finding or PASS. The runner also checked source Git-log execution, non-shallow history, candidate ancestor reparse points, contract finding exit code, report/exit consistency, and ordinal-sorted fingerprints. Final candidate fingerprints are recorded in the private execution ledger after the final documentation rerun, avoiding a self-referential public-log digest.

This is local secret-scan evidence, not hosted publication, runtime verification or vulnerability acceptance. Activation approval and merge authorization remain NOT GRANTED; T02 has not started and Phase 1 implementation remains NOT AUTHORIZED. No implementation commit/tree identity is claimed.
