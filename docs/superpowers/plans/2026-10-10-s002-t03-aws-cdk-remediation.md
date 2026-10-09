# T03 AWS CDK Bundled Dependency Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `aws-cdk-lib` so its actual bundled installed `brace-expansion` dependency is at least 5.0.12 and all three repository CVEs disappear.

**Architecture:** Update the direct library version, regenerate the lockfile with the exact repository Node/npm toolchain, then inspect both the lockfile and a clean installed dependency graph specifically beneath `aws-cdk-lib`. Keep CLI and constructs fixed unless compatibility evidence requires a scoped adjustment.

**Tech Stack:** Node 24.15.0, npm 11.12.1, AWS CDK v2, package-lock v3, repository scanner/evidence workflows.

**Spec:** `docs/superpowers/specs/2026-10-10-s002-t03-aws-cdk-remediation.md`

## Global Constraints

- Target `aws-cdk-lib` 2.273.0, subject to confirmed bundled graph at or above `brace-expansion` 5.0.12.
- Use Node 24.15.0 and npm 11.12.1 for lock generation and validation.
- Preserve `aws-cdk` CLI 2.1135.1 and `constructs` 10.8.1 unless evidence justifies an approved scoped expansion.
- No overrides, resolutions, lockfile surgery, dispositions, scanner weakening, or unrelated dependency refresh.
- No CDK synth claim: this repository has no CDK application source.

## Review Focus

- Lock contains safe top-level package but vulnerable package remains nested under bundled `aws-cdk-lib` — inspect path-specific installed graph.
- `npm ci` differs from lock expectations — require clean install and `npm ls --all`/equivalent evidence.
- Toolchain drift changes lock output — assert Node/npm exact versions before generation.
- CDK release's L1 type changes are overclaimed as validated without application source — document limitation; do not infer synth compatibility.
- Scanner fixture or severity changes weaken detection — ensure existing vulnerable fixture still produces expected findings.

---

### Task 1: Update direct CDK library and regenerate the lockfile

**Files:**
- Modify: `api/infra/package.json`
- Modify: `api/infra/package-lock.json`

**Interfaces:** Package manifest remains exact-version pinned; lockfile is generated, not manually edited, with Node 24.15.0/npm 11.12.1.

- [x] **Step 1: Confirm toolchain versions** match the package manifest's `engines` and `packageManager` values.
- [x] **Step 2: Change only `aws-cdk-lib`** from 2.269.0 to 2.273.0 in the manifest; keep CLI and constructs unchanged.
- [x] **Step 3: Regenerate lockfile using npm** in `api/infra` without overrides or manual edits.
- [x] **Step 4: Save a SHA-256 checksum of the regenerated lockfile**, run `npm install --package-lock-only --ignore-scripts` under the same pinned toolchain as a consistency check, then recompute the checksum and require it to be identical. If the command changes the lockfile, stop and investigate; do not accept the rewritten file as part of this check.
- [x] **Step 5: Inspect the manifest/lock diff** and confirm there are no unrelated dependency updates.

Expected: the consistency command leaves the regenerated lockfile byte-identical; only the direct library and its lock-resolved graph change. The bundled package requirement is confirmed by installed-graph validation in Task 2.

### Task 2: Validate the actual bundled installed graph

**Files:**
- Test/validation: `api/infra/package-lock.json`, clean `api/infra/node_modules` install.

- [x] **Step 1: Run clean `npm ci`** with Node 24.15.0/npm 11.12.1.
- [x] **Step 2: Inspect the complete installed graph** with `npm ls --all` and path-specific inspection beneath `node_modules/aws-cdk-lib`; assert no bundled 5.0.9 copy and require the owning bundled node to be brace-expansion 5.0.12 or a later fixed version.
- [x] **Step 3: Verify CLI/library/constructs compatibility** using package metadata and available repository checks; report L1 compatibility as unverified because no app source exists.

Expected: actual installed bundled graph satisfies the floor; a root-level safe copy alone fails acceptance.

### Task 3: Scanner and hosted acceptance

**Files:**
- Validation only: repository scan/evidence and existing hosted workflows.

- [x] **Step 1: Run repository dependency/vulnerability fixtures** and confirm a deliberately vulnerable fixture remains detectable.
- [ ] **Step 2: Run repository security scan** and require `CVE-2026-102276`, `CVE-2026-102278`, and `CVE-2026-102277` absent from sanitized repository findings.
- [ ] **Step 3: Obtain independent exact-SHA review and hosted execution/aggregate evidence.**

Expected: repository scan execution succeeds under unchanged policy. Do not claim policy PASS if other findings remain; keep PR #21 Draft and do not merge/release.
