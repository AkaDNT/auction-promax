# T03 Corretto Base Image Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pinned Corretto 21.0.12 AL2023 headless digest only if a mandatory feasibility gate proves the official candidate fixes all 27 target OS CVEs.

**Architecture:** First perform a read-only candidate discovery and isolated package-inventory/scanner evaluation. Stop without tracked pin changes if no candidate meets the exact identity, platform, provenance, and CVE criteria. Only after feasibility passes, update the shared and Identity Dockerfile pins plus trusted image metadata and run the hosted five-service matrix.

**Tech Stack:** Official Corretto container publication, OCI platform manifests, Docker, existing base-image trust manifest, Trivy/container scan and service matrix.

**Spec:** `docs/superpowers/specs/2026-10-10-s002-t03-corretto-base-image-refresh.md`

**Execution status (2026-10-10): `BLOCKED_NO_ELIGIBLE_BASE_IMAGE`.** No evidence-backed eligible candidate has been established: registry access did not provide the immutable supported-platform manifest digest, candidate package inventory, and unchanged-policy scan for all 27 target CVEs. This is a Phase 0 gate failure due to insufficient candidate evidence, not a claim that the upstream tag does not exist or is intrinsically vulnerable. Do not modify tracked image pins; resume Phase 0 only on a registry-accessible approved runner.

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

- [ ] **Step 1: Identify official candidate digest and provenance** from Corretto publication metadata; confirm the supported platform manifest matches CI.
- [ ] **Step 2: Inspect actual candidate package inventory** and compare each of the 27 target CVEs/fixed package builds.
- [ ] **Step 3: Scan the exact digest** using unchanged repository scanner inputs/policy; preserve sanitized results.
- [x] **Step 4: Record the gate outcome.** If any target CVE remains or provenance/platform cannot be established, record exactly `BLOCKED_NO_ELIGIBLE_BASE_IMAGE` and stop this plan before Task 2. Do not change tracked pins.

Expected: either an evidence-backed eligible digest with all 27 IDs absent from candidate inventory and scan, or a blocked outcome with no Dockerfile/metadata edits.

### Task 2: Update pins and trusted image metadata (unlocked only by Task 1 PASS)

**Files:**
- Modify: `api/services/identity-profile-service/Dockerfile`
- Modify: `api/service-foundation/templates/common/Dockerfile`
- Modify: `api/security/tooling/container-base-images.json`
- Test: `api/scripts/supply-chain/Test-ContainerBaseImageTrust.mjs`
- Test: `api/scripts/supply-chain/Test-DockerfilePolicy.mjs`
- Test: `api/scripts/supply-chain/Test-ContainerBaseImageResolution.ps1`

**Interfaces:** All three tracked declarations use the exact eligible repository/tag/digest and record authoritative provenance while preserving schema contracts.

- [ ] **Step 1: Add/update contract coverage** requiring both Dockerfiles and metadata to share the same immutable digest and approved identity.
- [ ] **Step 2: Apply only the reviewed candidate digest/provenance** to the three tracked inputs.
- [ ] **Step 3: Run base-image trust, resolution and Dockerfile policy checks.**

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
