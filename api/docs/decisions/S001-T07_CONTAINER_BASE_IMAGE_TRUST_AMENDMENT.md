# S001-T07 Container Base Image Trust Contract Amendment

- Status: APPROVED
- Date: 2026-09-22
- Approved by: Repository Owner / Project Owner
- Amends: `S001-T07_SUPPLY_CHAIN_DECISIONS.md`, sections 9 and 16

## Decision

The approved immutable `linux/amd64` platform-manifest digest is the build-integrity identity. The reviewed mutable tag and its index, platform, media-type, and source metadata remain provenance/freshness observations.

Build-blocking conditions are: failure to pull the approved platform digest, malformed local inspection, a local descriptor or platform mismatch, Dockerfile binding drift, explicit revocation, or a later vulnerability-policy BLOCKED result.

Mutable-tag index/platform/media/source drift, ambiguity, unavailability, or a newer candidate are `REVIEW_REQUIRED` signals. They do not invalidate an already approved immutable digest and exit zero after build-integrity verification. No digest is updated automatically.

Any new digest still requires separate review and explicit approval.
