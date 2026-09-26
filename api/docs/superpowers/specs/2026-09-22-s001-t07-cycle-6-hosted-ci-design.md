# S001-T07 Cycle 6 Hosted Supply-Chain CI Design

**Status:** Approved design

**Date:** 2026-09-22

**Goal:** Execute the repository-owned supply-chain controls on GitHub-hosted Linux runners, retain only sanitized evidence, and expose execution integrity separately from release policy without implementing AWS delivery.

## Scope

Cycle 6 adds two dedicated GitHub Actions workflows:

- `supply-chain.yml` runs for pull requests, pushes, and manual verification of the triggered revision.
- `security-freshness.yml` runs on a daily schedule or manually against the current default branch.

The existing `api-baseline.yml` remains the fast build, test, contract, and CDK baseline. Cycle 6 may finish its external Action SHA pinning and related workflow-hardening contract, but it does not add supply-chain orchestration to that file.

Cycle 6 does not publish an image, authenticate to AWS, request an OIDC token, integrate ECR or Inspector, sign an application image, deploy infrastructure, or enable SARIF upload. Those are later Phase 1 responsibilities.

## Architectural Boundaries

GitHub Actions YAML is orchestration only. Repository-owned PowerShell and Node programs remain the authority for tool integrity, SBOM validation, secret scanning, image trust, image construction, smoke testing, vulnerability sanitization, and policy evaluation. Local and hosted execution therefore use the same core behavior.

The hosted flow is:

```text
triggered revision or default branch
  -> workflow contract
  -> verified Linux tool bootstrap
  -> clean Maven build and SBOM validation
  -> dependency and secret scans
  -> base-image trust resolution
  -> linux/amd64 image build
  -> hardened smoke
  -> container vulnerability scan
  -> policy evaluation
  -> sanitized evidence upload
```

Workflow tests enforce security-relevant dependency invariants rather than brittle absolute step numbers. Diagnostic summaries, cache operations, and timing steps may be inserted without invalidating the contract when they do not cross a trust boundary.

## Three Outcome States

Cycle 6 uses three non-overlapping states:

1. `IMPLEMENTATION_FAILURE`: contracts, bootstrap, build, scanner execution, report validation, sanitization, cleanup, or evidence publication failed. Execution integrity fails.
2. `POLICY_BLOCKED`: scanners and evidence completed correctly, but at least one unmatched High or Critical finding prevents release. Execution integrity passes; release policy fails.
3. `REVIEW_REQUIRED`: mutable upstream metadata drifted while the approved immutable artifact remains verifiable. The drift is visible for owner review and cannot silently update a trust anchor.

The current expected result is execution integrity `PASS`, release policy `BLOCKED`, 29 High, and 0 Critical. That is a correct security-control outcome, not an implementation failure.

## PR and Push Workflow

`.github/workflows/supply-chain.yml` runs on `pull_request`, `push`, and `workflow_dispatch`. It always scans the triggered revision, never the default branch as a substitute.

Workflow-level permissions are `contents: read`; all omitted permissions remain `none`. The workflow prohibits `pull_request_target`, AWS credentials, `id-token: write`, `packages: write`, registry login/push, `security-events: write`, and `continue-on-error` on security steps. Jobs use `ubuntu-24.04`, explicit timeouts, workflow-scoped concurrency, full-history checkout, and `persist-credentials: false`.

Every external `uses:` reference in all Cycle 6-modified workflows is pinned to a reviewed full commit SHA. Container actions are prohibited unless pinned by immutable digest.

The workflow exposes two distinct checks:

- `supply-chain-verification` proves contracts, build, scanners, cleanup, and sanitized evidence operated correctly. This is the Phase 0 required branch-protection check.
- `release-policy` consumes the classified result and fails when policy is `POLICY_BLOCKED`. It remains visible but is not a required Phase 0 merge check while the approved Corretto base has unresolved upstream High findings.

No step converts an implementation failure into policy blocked. Conversely, the known policy block does not make the execution-integrity check fail.

## Freshness Workflow

`.github/workflows/security-freshness.yml` runs daily and through `workflow_dispatch`. Both triggers explicitly check out `${{ github.event.repository.default_branch }}` with full history and `persist-credentials: false`; a manually selected workflow ref must not redefine canonical freshness evidence.

Freshness rebuilds the SBOM and image from source, refreshes and validates Trivy DB freshness through `VulnerabilityDB.UpdatedAt`, then executes the actual dependency, secret, and container policies. It does not trust artifacts from another workflow run.

Freshness records two independent dimensions:

```text
policyState = PASS | BLOCKED
deltaState  = UNCHANGED | NEW | REMEDIATED | BASELINE_UNAVAILABLE
```

Any unmatched High or Critical finding keeps `policyState=BLOCKED`, even when no finding is new. Delta reporting is supplementary and cannot downgrade policy. A missing or invalid comparison baseline is `BASELINE_UNAVAILABLE`, never an inferred clean result.

## Tool Bootstrap

Hosted Linux runners install the committed Trivy `0.74.0`, Gitleaks `8.30.0`, and Cosign `3.1.2` assets through the Cycle 1 bootstrap and checksum contracts.

Cosign is retained only because the approved Cycle 1 trust chain uses it to verify Trivy release provenance. Cycle 6 does not sign, attest, or verify an Auction Pro Max application image and makes no image-signing claim.

Caches are performance optimizations only. A restored Trivy DB must still pass the repository freshness gate. Cached executables must still satisfy the committed checksum, version, and provenance contracts before use.

## Execution and Policy Interface

A workflow preflight creates the initial versioned `run-summary.json` in the runner temporary evidence directory before checkout or any repository-controlled program executes. After checkout, the Cycle 6 orchestrator validates that fallback summary, owns the hosted sequence, and updates it atomically as stages complete.

The minimum summary is:

```json
{
  "schemaVersion": 1,
  "workflow": "supply-chain",
  "commit": "full-git-sha",
  "executionState": "IMPLEMENTATION_FAILURE",
  "policyState": "NOT_EVALUATED",
  "reviewState": "NOT_REQUIRED",
  "failureCode": "SUPPLY_CHAIN_NOT_STARTED"
}
```

The orchestrator returns a machine-readable classification without suppressing failures. GitHub job logic maps `IMPLEMENTATION_FAILURE` to a failed execution-integrity check, maps completed execution to a passed integrity check, and separately maps `POLICY_BLOCKED` to a failed release-policy check.

Failure codes are fixed sanitized identifiers. They cannot include absolute paths, command output, environment values, Docker configuration, source snippets, or secret material.

## Evidence Contract

Evidence retention is 30 days. The upload step runs with `if: always()`, `retention-days: 30`, and `if-no-files-found: error`.

Allowed artifacts are explicitly enumerated:

- `run-summary.json`;
- sanitized dependency vulnerability inventory;
- sanitized Gitleaks inventory;
- sanitized container vulnerability inventory;
- image identity, source JAR hash, platform, and base-manifest summary;
- hardened smoke/readiness summary;
- policy counts and disposition counts.

Raw Trivy or Gitleaks reports, SBOMs containing unnecessary metadata, Docker configuration, Maven settings, environment dumps, absolute user paths, source lines, secret matches, token fragments, and private scanner metadata are prohibited. The evidence validator rejects unexpected files and unexpected fields before upload.

The artifact name contains workflow identity and the immutable commit SHA, not branch-provided free-form text. Evidence generation and temporary cleanup occur on PASS, BLOCKED, REVIEW_REQUIRED, and unexpected-error paths.

## Workflow Contract Tests

Repository-owned tests parse workflows and reject:

- unexpected triggers, `pull_request_target`, or default-branch substitution in PR/push;
- manual freshness checkout that does not force the default branch;
- permissions broader than `contents: read`;
- unpinned external Actions or mutable container actions;
- shallow checkout or persisted checkout credentials;
- absent runner and job timeouts or unsafe concurrency;
- AWS/OIDC, registry login/push, SARIF, or `security-events: write`;
- `continue-on-error` or policy bypasses;
- raw or wildcard evidence uploads;
- artifact retention other than 30 days;
- missing `always()` or `if-no-files-found: error`;
- tool use before tool verification;
- security execution before contract validation;
- image build before base trust;
- smoke or scan before image build;
- policy evaluation before validated scanner output;
- upload before sanitized evidence validation;
- conflation of execution integrity, release policy, and review-required outcomes.

Tests use deterministic workflow fixtures and never require GitHub, Docker, a registry, or a live scanner.

## Branch Protection and Governance

Phase 0 branch protection requires the hosted `supply-chain-verification` check. The `release-policy` check remains separately visible and blocked while unresolved High or Critical findings exist. A later release/deployment gate must require release policy PASS.

If repository permissions prevent automated branch-protection configuration, Cycle 6 records an explicit owner-operated handoff with the exact required check name. It does not falsely claim branch protection was configured.

Phase 0 remains owner-operated. CODEOWNERS, rulesets, independent reviewers, and two-person Critical approval remain a documented governance handoff unless separately implemented and evidenced.

## Verification and Exit Gate

Cycle 6 is complete only when:

- deterministic workflow contract and negative-fixture tests pass locally;
- all modified workflow Actions are full-SHA pinned;
- the hosted PR/push workflow executes the Linux supply-chain flow for a real revision;
- a manual or scheduled freshness run executes against the default branch;
- `supply-chain-verification` passes when machinery and evidence succeed;
- `release-policy` accurately reports PASS or BLOCKED;
- both OS-package and Java-library container detections are present;
- uploaded artifacts contain only allowlisted sanitized evidence and retain for 30 days;
- raw reports and temporary material are absent;
- Cycle 1 through Cycle 5 regressions pass;
- branch-protection configuration or its owner-operated handoff is recorded;
- no ECR, Inspector, AWS deployment, application signing, or release-readiness claim is made.

S001-T07 may be marked complete after hosted-CI evidence and all acceptance criteria are reconciled even when the current release policy is honestly `BLOCKED`; a blocked release must never be represented as release-ready.
