# T03 AWS CDK Bundled Dependency Remediation Design

Status: APPROVED (2026-10-10). This document records the owner-approved design. It is not a vulnerability disposition or merge authorization.

## Purpose

Remediate the three repository-level `brace-expansion` findings in `api/infra/package-lock.json` through the upstream AWS CDK bundled dependency that owns the affected copy.

## Evidence and scope

The sanitized repository-only scan in hosted [run 37940367768](https://github.com/AkaDNT/auction-promax/actions/runs/37940367768), execution SHA `d914038b2deaaebc02f6f144c8592368ca726396`, reports bundled `brace-expansion` 5.0.9 under `aws-cdk-lib` 2.269.0:

- `CVE-2026-102276` — HIGH, fixed from 5.0.10.
- `CVE-2026-102278` — HIGH, fixed from 5.0.11.
- `CVE-2026-102277` — MEDIUM, fixed from 5.0.12.

The affected repository inputs are `api/infra/package.json` and `api/infra/package-lock.json`. The lockfile is authoritative for the bundled installed graph; a consumer-level override is not an approved assumption for a dependency bundled inside `aws-cdk-lib`.

AWS CDK v2.273.0's official release notes report the bundled brace-expansion update to 5.0.12. That release also flags some L1 generated-resource changes as potentially incompatible with previous types, so this version update requires package-graph and any available consumer compatibility checks before acceptance.

Reference: [AWS CDK releases](https://github.com/aws/aws-cdk/releases), [brace-expansion advisory](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr).

## Design

Update the direct `aws-cdk-lib` dependency to the first reviewed upstream release whose bundled `brace-expansion` resolves to at least 5.0.12; the evidence-backed candidate is 2.273.0. Regenerate `package-lock.json` using the repository's pinned toolchain (Node 24.15.0 and npm 11.12.1) and deterministic lockfile workflow. Keep `aws-cdk` CLI and `constructs` pins unchanged unless lock/install or compatibility evidence demonstrates that an aligned update is technically required; any such expansion must remain within the CDK package compatibility boundary and be recorded for review.

Do not use `overrides`, resolutions, manual lockfile surgery, scanner exceptions, or advisory dispositions to mask the bundled package. Verify both the lockfile graph and actual installed graph after clean `npm ci`: the bundled `aws-cdk-lib` dependency tree must contain no vulnerable 5.0.9 copy, and the bundled brace-expansion node itself must be 5.0.12 or a later upstream-fixed version. The presence of a safe root-level copy does not satisfy this condition.

## Invariants and non-goals

- Limit changes to the CDK dependency declaration and reproducibly generated lockfile, plus narrowly scoped dependency-contract tests if needed.
- Preserve scanner severities, thresholds, evidence validation and fail-closed behavior.
- No business/domain changes, infrastructure redesign, or unrelated dependency refresh.
- No dispositions or critical-risk acknowledgements.
- This repository currently provides package/lock inputs but no CDK application source for synthesis; do not claim a synthesized infrastructure diff. If an actual consuming CDK app is added to the scoped work, require explicit owner approval and separate review.

## Acceptance evidence

Require reproducible clean `npm ci` using Node 24.15.0/npm 11.12.1, lockfile consistency, and inspection of the actual installed bundled graph (including `npm ls --all` or equivalent path-specific graph evidence) showing no vulnerable `aws-cdk-lib`-bundled 5.0.9 copy. Repository security scans must show the three `brace-expansion` CVEs absent. Confirm the scanner still detects a deliberately vulnerable fixture and that sanitized repository evidence, exact-SHA review, hosted workflow checks, aggregate verification, and separate release-policy behavior are unchanged. Removing these three findings does not establish a repository policy PASS if any other finding remains.
