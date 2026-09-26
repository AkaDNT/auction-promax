# S001-T07 Cycle 5 — Container Verification

## Delivery model

The Identity Profile Service is built from the Maven-produced executable JAR, outside Docker. The runtime image is pinned to the reviewed `linux/amd64` Amazon Corretto 21 / Amazon Linux 2023 headless manifest digest. Docker never resolves Maven dependencies or receives build credentials.

## Verification boundary

Cycle 5 is local-only. It does not claim hosted CI, ECR publishing, Amazon Inspector, image signing, AWS deployment, or release readiness.

## Runtime smoke contract

The technical smoke runner uses `technical-local`, binds only to loopback, and requires readiness `UP` at `/actuator/health/readiness`. It runs as UID/GID `10001`, with a read-only root filesystem, `/tmp` tmpfs, all capabilities dropped, `no-new-privileges`, and a 256-PID limit. Its random, `--rm` container is removed in a `finally` block.

## Evidence and policy

Raw Trivy JSON is temporary-only. The only retained local evidence is the sanitized inventory at:

`services/identity-profile-service/target/s001-t07-evidence/container-vulnerability-inventory.json`

High and Critical findings require an exact-match, approved, time-bounded disposition to pass a release policy. A scheduled freshness result never silently creates an exception. Medium and Low findings remain report-only.

## Current release state

The 2026-09-22 local execution built image `sha256:80fd42f85037dbbf4323b60bdd492a6f2ae50e8f681c1a4dc5c09fd4b4591d95` from reviewed platform manifest `sha256:82eb6e99cb91fb87f5a65a933750ae5bb23cab4ab396e4bba4a5b0b07dcd32ff`. With Trivy DB `UpdatedAt=2026-09-22T02:00:05.774028462Z`, the scan detected 29 High and 37 Medium findings; no Critical findings were detected. The High findings are from the reviewed Amazon Linux base image (`openssl-libs`, `openssl-fips-provider-latest`, and `expat`) and have upstream fixed versions not yet present in the current official Corretto 21 AL2023 headless image. Therefore container-release policy remains blocked. This document makes no scanner-PASS or release-ready claim.

The mutable upstream tag currently has review-required drift; the approved immutable platform digest remains the build identity. Do not change a digest silently or create blanket accepted-risk entries.
