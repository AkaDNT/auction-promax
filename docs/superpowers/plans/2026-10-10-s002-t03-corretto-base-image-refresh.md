# T03 Corretto Base Image Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pinned Corretto 21.0.12 AL2023 headless digest only if a mandatory feasibility gate proves the official candidate fixes all 27 target OS CVEs.

**Architecture:** First perform a read-only candidate discovery and isolated package-inventory/scanner evaluation. Stop without tracked pin changes if no candidate meets the exact identity, platform, provenance, and CVE criteria. Only after feasibility passes, update the shared and Identity Dockerfile pins plus trusted image metadata and run the hosted five-service matrix.

**Tech Stack:** Official Corretto container publication, OCI platform manifests, Docker, existing base-image trust manifest, Trivy/container scan and service matrix.

**Spec:** `docs/superpowers/specs/2026-10-10-s002-t03-corretto-base-image-refresh.md`

**Execution status (2026-10-10): Phase 0 `PASS`; Task 2 pin/trust changes are local and tested; Task 3 hosted acceptance remains pending.** The official Docker Hub index and `linux/amd64` manifest, source annotation, actual package inventory, pinned Trivy provenance, fresh-database scan, and old-image positive control are recorded in `docs/superpowers/plans/2026-10-10-s002-t03-corretto-phase0-registry-followup.md`. The candidate has zero Trivy findings; the old pinned control has 80 findings including 69 in the five affected package families. This authorizes only the scoped image-pin refresh, not merge/release. The PowerShell resolver harness could not execute locally under the enforced Restricted policy; parser-only validation passed and hosted exact-SHA verification remains required.

## Global Constraints

- Preserve Corretto `21.0.12-al2023-headless`, Java 21, Amazon Linux 2023 and repository architecture policy.
- Phase 0 is mandatory and precedes every tracked Dockerfile/metadata change.
- Any target CVE remaining blocks pin replacement; report `BLOCKED_NO_ELIGIBLE_BASE_IMAGE`.
- No different update line/distribution/variant or package-manager upgrade workaround.
- No scanner, evidence, hardening, business, or release-policy weakening.

## Review Focus

- A mutable tag is mistaken for immutable provenance — require authoritative digest and platform-manifest evidence.
- Candidate has updated tag/digest but stale package inventory — scan the candidate digest itself and compare all 27 CVEs.
- Architecture manifest differs from supported CI build architecture — assert platform before considering eligibility.
- One package family/CVE is omitted from the comparison — check the complete 27-ID set from the approved spec/evidence.
- Tracked pins are changed before feasibility passes — Phase 0 deliverable must be reviewed before Task 2 is unlocked.

---

### Task 1: Phase 0 candidate feasibility investigation (read-only to tracked files)

**Files:**
- Read: `api/security/tooling/container-base-images.json`
- Read: `api/security/schemas/container-base-images.schema.json`
- Read: `api/services/identity-profile-service/Dockerfile`
- Read: `api/service-foundation/templates/common/Dockerfile`
- Output: reviewable feasibility report in the execution log or a dedicated evidence note; do not edit pins.

**Interfaces:** Candidate identity is exactly `docker.io/library/amazoncorretto:21.0.12-al2023-headless`; candidate evidence binds source, immutable digest, platform, package inventory, and scan results.

- [x] **Step 1: Identify official candidate digest and provenance** from Corretto publication metadata; confirm the supported platform manifest matches CI.
- [x] **Step 2: Inspect actual candidate package inventory** and compare each of the 27 target CVEs/fixed package builds.
- [x] **Step 3: Scan the exact digest** using the pinned Trivy version, fresh database and unchanged vulnerability policy; retain only sanitized results.
- [x] **Step 4: Record the gate outcome.** Phase 0 PASS is recorded in the linked evidence note; candidate has no findings and all target package builds meet the published fixed floors. Task 2 is unlocked. Do not weaken scanner inputs or policy.

Expected: evidence-backed eligible digest; the candidate's complete Trivy report had zero findings, and the old pinned positive control demonstrated detection for the affected package families. The exact acquisition adapter and remaining limitations are recorded in the evidence note.

### Task 2: Update pins and trusted image metadata (unlocked only by Task 1 PASS)

**Files:**
- Modify: `api/services/identity-profile-service/Dockerfile`
- Modify: `api/service-foundation/templates/common/Dockerfile`
- Modify: `api/security/tooling/container-base-images.json`
- Modify: `api/security/schemas/container-base-images.schema.json` (its exact digest/source constants are part of the trust boundary)
- Test: `api/scripts/supply-chain/Test-ContainerBaseImageTrust.mjs`
- Test: `api/scripts/supply-chain/Test-DockerfilePolicy.mjs`
- Test: `api/scripts/supply-chain/Test-ContainerBaseImageResolution.ps1`

**Interfaces:** All three tracked declarations use the exact eligible repository/tag/digest and record authoritative provenance while preserving schema contracts.

- [x] **Step 1: Add/update contract coverage** requiring both Dockerfiles and metadata/schema to share the exact Phase 0 digest and source identity.
- [x] **Step 2: Apply only the Phase 0 candidate digest/provenance** to both Dockerfiles, metadata and the exact trust schema; preserve all other image properties.
- [ ] **Step 3: Run base-image trust, resolution and Dockerfile policy checks.** Trust and Dockerfile policy tests pass locally; the resolver script passed PowerShell AST parsing but runtime execution is pending a permitted PowerShell host/hosted run.

Expected: resolver accepts exactly the approved image; trust and policy tests pass without broadening accepted image identities.

### Task 3: Exact-SHA review, candidate publication, and hosted acceptance

**Files:**
- Validation only: owning supply-chain hosted workflow and per-service evidence.

- [ ] **Step 1: Commit the passing pin/metadata delta** and record the exact candidate SHA.
- [ ] **Step 2: Obtain independent review of that exact SHA**; do not reuse review from another revision.
- [ ] **Step 3: Push only the reviewed, authorized candidate** to the isolated T03 branch and run the hosted five-service matrix.
- [ ] **Step 4: Inspect hosted image build, technical smoke, and sanitized container scanner findings**; require all 27 target CVEs absent for every service.
- [ ] **Step 5: Verify exact-set aggregation and separate release-policy behavior** at the same execution revision.

Expected: exact-SHA review precedes candidate publication; all hosted execution gates pass and every target CVE is absent from scanner findings. Package inventory establishes patched package versions, while scanner findings establish CVE absence. Any remaining target CVE invalidates remediation acceptance; scanner policy and release-policy remain unchanged and separately evaluated.
