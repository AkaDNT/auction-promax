# S002 — Local topology source reconciliation

Recorded 2026-10-06. Isolated worktree `.worktrees/s002-design`, branch
`work/s002-foundation-design`, base PR19 merge
`6459baf17ae8a88aeceb5d5d24bc0c601ba6868b`.

## Authority and scope

T02 preflight stopped because ADR-027/blueprint require Bidding/Billing while
bootstrap tooling still named Transaction/Payment. Owner approved source-only
contract/tooling reconciliation, reference
`OWNER-DECISION-2026-10-06-S002-TOPOLOGY-RECONCILIATION` (response: “duyệt”).
No native database operation, existing credential edit, reset/drop, business
implementation or merge authorization is included.

## Changes

- `api/scripts/LocalDbTopology.psm1`: fixed eight-record tooling metadata shared
  by bootstrap/verifier; fresh records on each call. Not a service runtime library.
- Bootstrap/verifier consume the same mapping. SQL bootstrap parameter names,
  schema connections and password-variable cleanup now match Bidding/Billing.
- Status/diagnostic queries and placeholder-only `.env.local.example` updated.
  Identity/Auction mappings and owner/migrator/runtime privilege model retained.
- README warns that this is not an installed-data migration. Legacy databases/
  roles require separate inventory, backup and owner decision before bootstrap.
  Historical reset/drop allowlists deliberately remain unchanged; do not use
  those tools as a migration.

## Evidence and limits

`Test-LocalDbTopology.ps1` first failed missing module (bootstrap RED only).
With the original eight mappings extracted, it failed
`TOPOLOGY_MAPPING_INVALID_4_Prefix`: the behavioral mismatch was reproduced.
After reconciliation it passed on installed PowerShell 7.6.6 and Windows
PowerShell 5.1 without execution-policy override. It exercises returned records,
fresh-call mutation isolation, actual consumer target assignments and the public
placeholder example. It does not execute complete bootstrap/verifier bodies or
prove SQL/native isolation.

Observed exit 0 after changes: S002 lifecycle fixture/repository modes, complete/
closeout T09, required-check regressions 11/11, root workflow repository contract,
contract fixture/governance suites and `git diff --check`.

Native PostgreSQL/SQL execution, migration of existing local data, hosted proof,
secret-scan audit and publication are NOT claimed by these results. T02 publisher,
registry and template delivery remain separate pending work; no T02 DONE claim.
