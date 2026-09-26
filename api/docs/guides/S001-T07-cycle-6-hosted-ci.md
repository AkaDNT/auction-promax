# S001-T07 Cycle 6 Hosted CI Runbook

## Purpose

Cycle 6 provides repository-owned GitHub Actions orchestration for the same
supply-chain boundaries verified locally in Cycles 1–5. Execution integrity is
separate from release policy: `supply-chain-verification` passes when contracts,
tool verification, build, scans, cleanup, and evidence validation complete;
`release-policy` independently reports a `PASS` or `BLOCKED` release decision.

## Workflows

| Workflow | Trigger | Revision scanned |
| --- | --- | --- |
| `.github/workflows/supply-chain.yml` | `pull_request`, `push`, `workflow_dispatch` | Triggered immutable commit |
| `.github/workflows/security-freshness.yml` | daily schedule, `workflow_dispatch` | Repository default branch only |

Both workflows use `ubuntu-24.04`, `contents: read`, full-history checkout with
`persist-credentials: false`, explicit timeouts, safe concurrency, and full-SHA
Action pins. They do not request AWS/OIDC credentials, log into a registry,
push an image, upload SARIF, sign an application image, or deploy infrastructure.

## Local preflight

Run from `api/`:

```powershell
npm.cmd --prefix .\contracts ci
node .\scripts\supply-chain\Test-HostedSupplyChainContract.mjs --repository
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-HostedSupplyChain.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\supply-chain\Test-HostedSupplyChainOrchestration.ps1
node .\scripts\supply-chain\Test-HostedSupplyChainEvidence.mjs
```

For a local hosted-flow classification after canonical prebuild validation:

```powershell
$env:DOCKER_CONFIG = Join-Path $PWD '.tools\supply-chain\docker-config-cycle6'
$commit = (git rev-parse HEAD).Trim()
$evidence = Join-Path $PWD ".tools\supply-chain\s001-t07-evidence\hosted-local-$commit"

powershell.exe -NoProfile -ExecutionPolicy Bypass `
  -File .\scripts\supply-chain\Invoke-HostedSupplyChain.ps1 `
  -WorkflowName supply-chain -CommitSha $commit -EvidenceRoot $evidence `
  -UseExistingVerifiedArtifact

node .\scripts\supply-chain\Validate-HostedSupplyChainEvidence.mjs $evidence $commit
```

`-UseExistingVerifiedArtifact` is for local re-runs only. Hosted flows build
their artifact from the triggered revision.

## Evidence contract

The workflow uploads exactly seven sanitized JSON files for 30 days:

- `run-summary.json`
- `vulnerability-inventory.json`
- `gitleaks-inventory.json`
- `container-vulnerability-inventory.json`
- `image-identity.json`
- `smoke-summary.json`
- `policy-summary.json`

The validator rejects unexpected files, raw reports, absolute paths, secret
material, scanner-private fields, and unapproved finding fields. Vulnerability
findings retain only the committed twelve-field inventory; Gitleaks findings
retain its committed seven-field inventory.

## Local execution evidence — 2026-09-23

The local end-to-end classification ran for commit
`ecdb6e89da1a08d246014f886858c0c8607c6fd2`:

| Dimension | Result |
| --- | --- |
| Execution integrity | `PASS` |
| Release policy | `BLOCKED` |
| Review state | `NOT_REQUIRED` |
| Dependency findings | 7 Medium |
| Container findings | 29 High, 37 Medium, 0 Critical |
| Gitleaks findings | 0 |
| Evidence validator | PASS; exact seven-file allowlist |
| Hardened smoke cleanup | PASS; 0 matching containers remain |

`BLOCKED` is an expected security-control outcome: the scanner and policy
evaluator completed, while release policy refused unmatched High findings. No
disposition was created automatically.

## Hosted execution evidence — 2026-09-24

The following hosted executions completed after the Cycle 6 local preflight.
Their downloaded evidence artifacts were inspected locally; the evidence
validator accepted exactly the seven-file allowlist described above.

| Flow | Hosted evidence | Execution integrity | Release policy | Evidence artifact |
| --- | --- | --- | --- | --- |
| PR/push verification | Previously verified; legacy identifiers omitted from public snapshot | `PASS` | `BLOCKED` | Sanitized allowlist validation passed; 30-day retention |
| Default-branch freshness | Previously verified; legacy identifiers omitted from public snapshot | `PASS` | `BLOCKED` | Sanitized allowlist validation passed; 30-day retention |

Both artifacts have 30-day retention. The freshness artifact additionally
recorded `deltaState=BASELINE_UNAVAILABLE`; that state is supplementary and
does not downgrade the blocked release policy. The retained sanitized evidence
reported 29 High, 37 Medium, and 0 Critical container findings. The container
scanner reached policy evaluation only after its required OS-package and
Java-library detection gate completed; raw scan reports and temporary material
were not retained.

The `release-policy` and `freshness-release-policy` jobs intentionally failed
because their policy state was `BLOCKED`. The corresponding
`supply-chain-verification` and `security-freshness-verification` execution
integrity jobs passed. This is the required separation of machinery health from
release authorization; no vulnerability disposition was created automatically.

The repository owner confirmed that GitHub branch protection requires
`supply-chain-verification` and leaves `release-policy` visible but not required
while the approved base image has unresolved High findings.

## Current limits

Cycle 6 now proves hosted verification and default-branch freshness execution,
sanitized evidence retention, and the Phase 0 branch-protection configuration.
It does not claim release readiness while policy is `BLOCKED`, nor ECR
publishing, Inspector, AWS deployment, application signing or attestation,
SARIF upload, registry push, or global platform security. GitHub runner action
runtime deprecation warnings observed during these runs are operational
maintenance work and did not alter the recorded execution or policy outcome.
