# S001-T07 Supply-Chain Decision Lock (Cycle 0)

- Status: APPROVED
- Date: 2026-09-08
- Approved by: Repository Owner / Project Owner
- Related decisions: [Business Decisions](BUSINESS_DECISIONS.md) (BD-006 GitHub Actions / Amazon ECR)
- Related task: S001-T07 in `docs/sprints/SPRINT_001.md`

This record locks the supply-chain scanning decisions for S001-T07. It is a decision baseline only: no scanner, image, or CI execution is claimed. Implementation begins in later cycles; S001-T07 stays `READY` until then.

## 1. Purpose

Turn the approved supply-chain direction into a deployable, verifiable baseline before any scanner script, Dockerfile, or security workflow is written. Cycle 0 uses review, search, and Git diff verification; TDD does not apply because no branching implementation exists yet.

## 2. Scope

| Target           | T07 coverage                                                             |
| ---------------- | ------------------------------------------------------------------------ |
| Identity service | Maven SBOM, dependency scan, image build/scan, policy gate               |
| `infra`          | Trivy scan of `package-lock.json`, including development dependencies    |
| API repository   | Working-tree and full-history Gitleaks scans                             |
| Web repository   | Out of scope; known findings are handed off (see Web Repository Handoff) |
| AWS              | Phase 1 handoff only                                                     |
| T06 runtime      | Not modified                                                             |

### Allowed claim

> API repository supply-chain baseline verified within the explicitly defined T07 scope.

### Forbidden claims

- "Entire Auction Pro Max platform supply chain is secure."
- "Amazon Inspector/ECR/CodePipeline has been implemented."

## 3. Selected Toolchain

| Capability                                | Tool / version                       |
| ----------------------------------------- | ------------------------------------ |
| Application SBOM                          | CycloneDX Maven Plugin `2.9.2`       |
| SBOM schema                               | CycloneDX JSON Schema `1.6`          |
| Dependency/image/infra vulnerability scan | Trivy CLI `0.74.0`                   |
| Secret scan                               | Gitleaks CLI `8.30.0`                |
| Release provenance verification           | Cosign CLI `3.1.2` (Trivy assets only) |
| Policy evaluation                         | Repository-owned PowerShell          |
| CI                                        | GitHub Actions, CLI invoked directly |
| Artifact retention                        | 30 days                              |
| Trivy DB maximum age                      | 24 hours                             |
| SARIF                                     | Not uploaded in Phase 0              |

Gitleaks `8.30.1` is explicitly not selected due to a known detection regression. Gitleaks `8.28.0` is not a selected version either; `8.30.0` is the only selected Gitleaks version.

## 4. Version and Integrity Policy (Pinning Rules)

- No `latest` tag is used for Trivy, Gitleaks, the CycloneDX plugin, or any scanner version.
- The Trivy/Gitleaks GitHub Actions wrappers are not used; scanners run as direct CLI invocations.
- No remote install script is used.
- No global tool installation is used.
- Release assets are downloaded from official GitHub Releases only.
- Before bootstrap execution, the official asset name and expected SHA-256 for each supported Windows x64 and Linux x64 Trivy, Gitleaks, and Cosign asset must be independently reviewed and committed in a repository-owned manifest. A checksum downloaded at runtime from the same release channel is corroborating evidence, not the trust anchor.
- Bootstrap verifies every downloaded executable against its committed SHA-256 before execution. It then uses the pinned, checksum-verified Cosign CLI `3.1.2` to verify the Trivy `0.74.0` asset against its official Sigstore bundle, the OIDC issuer `https://token.actions.githubusercontent.com`, and the tag-specific certificate identity `https://github.com/aquasecurity/trivy/.github/workflows/reusable-release.yaml@refs/tags/v0.74.0`.
- Cosign is used only to verify Trivy scanner-release provenance. T07 does not implement application-image signing or production signing.
- A missing or mismatched committed checksum, Sigstore bundle, issuer, certificate identity, or tool version fails closed.
- Tool upgrades are reviewed changes; they are not silent.

## 5. SBOM Decisions

- Canonical SBOM: `services/identity-profile-service/target/bom.json`.
- Plugin version `2.9.2`, CycloneDX schema `1.6`, `includeTestScope=false`.
- Generated SBOMs are never committed.
- The SBOM is validated against the pinned, checksummed CycloneDX `1.6` JSON schema.
- The root component must be a Maven application component.
- Components and the dependency graph must be non-empty.
- Two clean builds are compared semantically after normalization.
- `pom.xml` is not modified in Cycle 0. Reproducibility configuration is added only if execution evidence proves it necessary.
- The Maven SBOM is not a container SBOM.

Canonical coordinates expected at execution time:

```text
groupId: com.auctionpromax
artifactId: identity-profile-service
version: 0.0.1-SNAPSHOT
type: application
```

Byte-for-byte equality is not required when timestamps or serial numbers are allowed to vary.

## 6. Vulnerability Scanning Decisions

### Identity service

Authoritative path:

```text
Maven Wrapper
→ target/bom.json
→ schema validation
→ Trivy sbom scan
→ normalized finding inventory
→ repository policy evaluator
```

A controlled vulnerable SBOM/dependency fixture is required to prove that Trivy actually surfaces findings.

### Infra

- Input: `infra/package-lock.json`.
- Semantics: Trivy filesystem/repository vulnerability scan.
- Development dependencies are included; direct and transitive packages are scanned when supported.
- `--include-dev-deps` is mandatory because CDK dependencies sit in the toolchain/development dependency set.

### Fail-closed cases

All of the following are failures:

- Trivy DB does not exist.
- Trivy DB is older than 24 hours and refresh fails.
- Trivy DB metadata cannot be read.
- Input does not exist.
- Report is empty or malformed.
- Scanner does not complete.
- Ecosystem is not detected.
- Policy evaluator does not run.
- Scanner fixture does not detect the expected finding.

Trivy vulnerability-data age is calculated in UTC as `current UTC time - VulnerabilityDB.UpdatedAt`. `DownloadedAt` is retained only as cache-download audit metadata, and `NextUpdate` is diagnostic metadata. Filesystem timestamps are not used as vulnerability-data age. A missing, malformed, or implausibly future `UpdatedAt` value fails closed. When `UpdatedAt` is older than 24 hours, refresh is mandatory; if the refreshed database still exceeds the limit, verification fails.

### Severity policy

| Severity     | Result                                                         |
| ------------ | -------------------------------------------------------------- |
| Critical     | Fail unless a valid disposition exists                         |
| High         | Fail unless a valid disposition exists                         |
| Medium / Low | Report, non-blocking                                           |
| Unknown      | Report; fail when data is insufficient for a reliable decision |

`--ignore-unfixed` is not used.

## 7. Secret Scanning Decisions

Two separate scans must run:

```text
Gitleaks dir
Gitleaks git
```

Requirements:

- Full redaction of secret material.
- Full reachable history.
- CI checkout uses `fetch-depth: 0`.
- CI checkout uses `persist-credentials: false`.
- Raw reports are never uploaded.
- `.env.local` is never read or printed.
- Real leaked credentials are never given an accepted-risk disposition.
- Real credentials are revoked/rotated and handled as an incident.
- Allowlists match narrowly by rule, path, and scanner-provided fingerprint only; whole-directory allowlists are not permitted.
- Scanner-provided fingerprints are used for exact finding correlation but are not guaranteed to remain stable across source edits, line movement, path changes, history rewriting, or scanner changes. A changed fingerprint never inherits an earlier allowlist or remediation state automatically.

### Seeded scanner fixture

A test-only custom rule and a synthetic value are used:

```text
APX_FIXTURE_SECRET_<deterministic-noncredential-value>
```

The fixture must prove:

1. Gitleaks detects the fixture.
2. The exit code is mapped correctly.
3. The summary contains only sanitized metadata.
4. The raw fixture value does not appear in terminal evidence.
5. The raw fixture value does not appear in artifacts.

A Gitleaks binary that returns exit code 0 without catching the fixture is a scanner-integrity failure.

## 8. Severity and Disposition Policy

Planned files (implementation in a later cycle, not created here):

```text
security/vulnerability-dispositions.json
security/schemas/vulnerability-dispositions.schema.json
```

### High disposition

- Maximum validity: 30 days.
- Repository owner approval.
- Owner.
- Rationale.
- Exploitability assessment.
- Compensating control.
- Remediation target.
- Ticket/reference.
- Approval date/reference.
- Expiry is mandatory.

### Critical disposition

- Maximum validity: 7 days.
- Explicit repository-owner Critical-risk acknowledgement.
- A compensating control is mandatory.
- All High metadata remains mandatory.

### Matching

Exact match on:

```text
scanner
findingId
source
targetType
target
component/package
affectedVersion
```

Not allowed: wildcards, fuzzy matching, indefinite expiry, silent renewal, version mismatch, target mismatch.

Accepted findings still appear in reports with status `accepted-risk`; they are never recorded as `remediated`.

## 9. Image Baseline

Approved family:

```text
Official Amazon Corretto 21
Amazon Linux 2023
headless runtime distribution
linux/amd64
```

- Exact tag/digest is not assumed in this record; it must be resolved at the container cycle.
- Maven Wrapper build happens before Docker.
- Docker does not re-resolve Maven dependencies.
- No build credentials are passed into Docker.
- UID/GID `10001`; port `8080`.
- No curl/shell is added for healthcheck purposes.
- No Docker `HEALTHCHECK` in Phase 0.
- Phase 1 readiness path: `/actuator/health/readiness`.
- Local image name: `auction-promax/identity-profile-service:s001-t07`.

Container-cycle stop condition: stop if no official published image simultaneously satisfies Corretto 21, AL2023, headless, `linux/amd64`, digest inspectability, and Trivy OS-package detection. Do not switch to Alpine, Ubuntu, distroless, or another vendor.

## 10. CI Baseline, Triggers, and Permissions

- Existing workflow: `.github/workflows/api-baseline.yml`.
- Runner: `ubuntu-24.04`.
- Scanners run as direct CLI invocations in workflow steps.
- At the first T07 modification of `.github/workflows/api-baseline.yml`, every external `uses:` reference remaining in that workflow, including pre-existing Actions, must be pinned to a reviewed full-length commit SHA. Local repository actions referenced by path are not remote Action references; container actions, if introduced, must use immutable image digests.
- `contents: read` only.
- No AWS credentials.
- No `pull_request_target`.
- No `continue-on-error` on security steps.
- Maven caching is allowed.
- Trivy DB caching is allowed; caching does not replace DB freshness verification.
- Local and CI invoke the same core PowerShell logic.

## 11. Evidence, Sanitization, and Retention

- Evidence retention: 30 days.

### Sanitized vulnerability inventory

Each finding keeps:

```text
scanner
findingId
source
targetType
target
package/component
affectedVersion
fixedVersion
severity
severitySource
status
dispositionId
```

Each finding does not keep: raw secrets, offending source lines, token fragments, absolute home paths, environment dumps, Docker config, or unnecessary private metadata.

### Sanitized Gitleaks inventory

Each secret finding keeps only:

```text
scanMode
ruleId
repositoryRelativePath
scannerFingerprint
commitId
status
remediationReference
```

`scanMode` is `dir` or `git`; `commitId` is present only for a history-scan finding. The inventory never retains `Secret`, `Match`, the full source line, author/email metadata, token fragments, entropy-derived fragments, secret-derived hashes, or raw source snippets. A real-secret finding cannot use `accepted-risk` status.

## 12. SARIF Decision

SARIF upload is disabled for Phase 0. `security-events: write` is not added.

## 13. Web Repository Handoff

The web repository is outside the T07 scope. Known findings in the web repository are handed off to the web repository owner as a documented handoff item; T07 evidence covers the API repository, Identity service, and `infra` only.

## 14. Phase 1 AWS Handoff

CodeBuild, CodePipeline, CDK synthesis, ECR publishing, and Amazon Inspector are documented as Phase 1 handoff targets only. They are not implemented or claimed by this decision. ECR publishing awaits a dedicated GitHub OIDC role in a later deployment task.

## 15. Owner-Operated Governance Limitation

Phase 0 is owner-operated. Independent security approval is not claimed.

`approvedBy` in Phase 0 is declarative repository evidence, not cryptographic proof or independent review.

A future handoff must require: a protected branch/ruleset, CODEOWNERS, a required independent reviewer, and two-person Critical approval.

## 16. Explicit Non-Claims

This record does not claim:

- that Amazon Inspector, ECR, CodeBuild, or CodePipeline has been implemented;
- that any scanner has run or passed ("scanner PASS" claims are prohibited);
- that any image build or image scan has passed;
- that the entire Auction Pro Max platform supply chain is secure.

This record contains no placeholder SHA-256 checksums, no placeholder image digests, no fake workflow run IDs, and no secrets or tokens. Exact reviewed tool-asset checksums are committed in the repository-owned bootstrap manifest before any tool is downloaded or executed in Cycle 1.

## 17. Supersession Rule

This record may only be superseded by a new, explicitly approved decision record that references this record and states what is replaced. Superseded or rejected items retain their history and link to the replacement decision. No implementation may silently contradict this record.
