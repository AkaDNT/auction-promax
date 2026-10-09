# T03 Amazon Corretto Base Image Refresh Design

Status: CONDITIONALLY APPROVED (2026-10-10). Feasibility investigation is approved; changing tracked image pins is permitted only after Phase 0 passes. This status is not merge authorization.

## Purpose

Remove the Amazon Linux 2023 OS-package HIGH findings in the five service container scans by refreshing the immutable digest behind the existing Corretto Java 21 headless / Amazon Linux 2023 base-image identity.

## Evidence and affected inputs

The sanitized hosted evidence from [run 37940367768](https://github.com/AkaDNT/auction-promax/actions/runs/37940367768), execution SHA `d914038b2deaaebc02f6f144c8592368ca726396`, reports 27 unique AL2023 package CVEs, repeated across the five services because they share one base image. Affected package families and observed-to-reported-fixed versions are:

| Package family | Observed | Reported fixed |
| --- | --- | --- |
| curl-minimal / libcurl-minimal | `8.17.0-1.amzn2023.0.3` | `8.21.0-5.amzn2023.0.1` or later fixed build |
| openssl-fips-provider-latest / openssl-libs | `1:3.5.7-2.amzn2023.0.2` | `1:3.5.8-1.amzn2023.0.1` |
| expat | `2.6.3-1.amzn2023.0.6` | `2.8.3-1.amzn2023.0.1` |
| RPM family | `4.16.1.3-29.amzn2023.0.7` | `4.16.1.3-29.amzn2023.0.8` |
| pcre2 / pcre2-syntax | `10.40-1.amzn2023.0.3` | `10.40-1.amzn2023.0.4` |

Current pin: `docker.io/library/amazoncorretto:21.0.12-al2023-headless@sha256:82eb6e99cb91fb87f5a65a933750ae5bb23cab4ab396e4bba4a5b0b07dcd32ff`, referenced in:

- `api/services/identity-profile-service/Dockerfile`
- `api/service-foundation/templates/common/Dockerfile`
- `api/security/tooling/container-base-images.json` and its schema/contract checks

## Phase 0 — mandatory base-image feasibility gate

Before modifying either Dockerfile or the base-image metadata, identify and evaluate an official candidate digest for the exact existing Corretto `21.0.12-al2023-headless` identity. Record authoritative provenance, platform/architecture manifest, and the candidate's actual OS-package inventory. Build or pull that exact digest in an isolated feasibility check and scan it with the repository's unchanged scanner/policy inputs. The candidate is eligible only if it contains fixed package builds for every one of the 27 target CVEs listed in the hosted evidence.

If any target CVE remains, or if no authoritative digest can be established for the required identity and architecture, stop before editing tracked pins and report the sub-project as `BLOCKED_NO_ELIGIBLE_BASE_IMAGE` for owner direction. Do not substitute a different Java update line, distribution, variant, or package-manager upgrades. Feasibility output must distinguish package inventory evidence from scanner evidence; a mutable tag's existence alone is insufficient.

## Design after feasibility passes

Resolve a newer official Corretto 21.0.12 AL2023 headless image digest whose package inventory includes fixed builds for the listed findings. Preserve the existing image repository, Java major/runtime line, AL2023 distribution, headless variant, architecture policy, and immutable-digest requirement. Record the selected digest and provenance in the existing base-image metadata; update the preserved Identity Dockerfile and shared generated-service Dockerfile template to the same reviewed digest.

The digest must be obtained and verified from authoritative Corretto image publication metadata, not inferred from a mutable tag or from a third-party mirror. Confirm the platform manifest matches the repository's supported runner/build architecture. Do not switch to an alternate distribution or add package-manager upgrade commands in service Dockerfiles as a substitute for a base refresh.

## Invariants and non-goals

- Keep Java 21, Amazon Linux 2023, Corretto, headless image variant, and existing image identity.
- Preserve pinned immutable digests and fail-closed base-image resolution.
- Do not alter Dockerfile hardening, image user, ports, service behavior, or scanner thresholds.
- Do not introduce vulnerability dispositions or suppress container findings.
- Do not change application code or the Spring Boot/Jackson dependency versions in this sub-project.

## Acceptance evidence

Before changing tracked pins, Phase 0 must pass and its exact digest, provenance, architecture, package inventory, and scanner result must be reviewable. After the pin update, verify provenance and digest consistency across both Dockerfiles and the metadata contract. Hosted builds must recreate all five service images from the resolved digest, pass image/Dockerfile policy checks and technical smoke, and produce sanitized container inventories in which all 27 AL2023 CVEs are absent. Any residual target CVE means the feasibility gate failed; it remains a real policy finding and must not be reclassified or ignored. Exact-SHA independent review and the unchanged aggregate/release-policy gates remain required.

References: [Amazon Corretto 21 Docker installation guidance](https://docs.aws.amazon.com/corretto/latest/corretto-21-ug/docker-install.html), [official Corretto Docker image repository](https://github.com/corretto/corretto-docker).
