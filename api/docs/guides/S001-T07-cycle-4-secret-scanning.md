# S001-T07 Cycle 4 — Secret Scanning

Cycle 4 implements fail-closed Gitleaks `8.30.0` scanning for the API working
tree and its full reachable Git history. It does not modify CI or scan the web
repository, container images, or AWS resources.

## Safety model

- Gitleaks is resolved only through the Cycle 1 checksum/version-verified tool
  bootstrap.
- The working-tree scan uses a unique temporary snapshot built from `git
  ls-files --cached --others --exclude-standard`; it does not recursively scan
  the repository filesystem.
- `.env.local` is excluded by the Git candidate set and a tracked
  `.env.local` candidate fails before resolving or copying its content.
- The history scan requires a non-shallow repository and runs `git` mode with
  `--full-history --all`.
- Both commands use `--redact=100`, JSON output to an OS temporary directory,
  `--no-banner`, `--no-color`, `--log-level error`, and a dedicated finding
  exit code of `3`, with an explicit 300-second timeout. Any other nonzero
  scanner exit fails closed.
- Gitleaks inline `gitleaks:allow` comments and scanner-side ignore entries are
  disabled. Repository-owned false-positive review happens only after raw
  report validation and sanitization.

## Verification sequence

```powershell
node .\scripts\supply-chain\Test-GitleaksScanContract.mjs
node .\scripts\supply-chain\Test-GitleaksConfiguration.mjs
node .\scripts\supply-chain\Test-GitleaksAllowlistSchema.mjs
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-GitleaksWorkingTreeSnapshot.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-GitleaksScanAdapters.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-GitleaksScanning.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-ControlledGitleaksFixture.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Invoke-GitleaksScanning.ps1
```

The controlled fixture creates its synthetic value only in a temporary Git
repository. It proves both scan modes detect the custom rule, maps findings to
exit code `3`, verifies redaction, and removes all fixture/report data in a
`finally` block.

## Evidence and incident handling

The only retained local result is the sanitized inventory:

```text
services/identity-profile-service/target/s001-t07-evidence/gitleaks-inventory.json
```

It contains only `scanMode`, `ruleId`, `repositoryRelativePath`,
`scannerFingerprint`, `commitId`, `status`, and `remediationReference`.
Raw reports, source lines, token fragments, author metadata, and fixture values
are never retained or uploaded.

An unallowlisted finding blocks the scan and is treated as a potential
credential incident. Do not create an accepted-risk disposition. Revoke or
rotate a real credential, remediate the source/history as appropriate, and
rerun both scan modes. False-positive entries must be exact, approved,
time-bounded repository records in `security/gitleaks-allowlist.json`.
