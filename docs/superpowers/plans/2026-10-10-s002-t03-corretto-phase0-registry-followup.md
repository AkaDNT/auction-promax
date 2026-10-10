# Corretto exact-tag feasibility follow-up

Status: PHASE0_PASS on 2026-10-10; Task 2 pin/trust delta applied locally. Hosted five-service acceptance and exact-SHA independent review remain pending. This dossier is feasibility evidence, not release-policy PASS.

Read-only Docker Hub registry inspection on 2026-10-10 used the existing official `docker.io/library/amazoncorretto:21.0.12-al2023-headless` identity. The initial Docker client registry-auth request failed on IPv6. An IPv4 HTTPS retry obtained official registry metadata (anonymous bearer token was not printed).

- Mutable tag's current OCI index: `sha256:b707577445897895f25c42ad4c0bfe5747a53e16c06de8ef118a55d894eb1c1e`.
- Its `linux/amd64` image manifest: `sha256:a1659a04c445036c54b49fe5163e46554ca24030e94c6eeffefe46fad127b400`.
- Candidate image config: `sha256:e19c4bab9d654f3898e22f773d26ed636098460e920f7419534275dcf1121452`.
- Candidate layers: `sha256:7234d0a9b6ba1270c7bb653ee62a443a1dbb6fdfa833336edd3c0691c2524d1f`, `sha256:f58237a6e11c115745492cb249f20277e327a6374e08bd1a84b8e13ae8028c5c`.

Existing pin `sha256:82eb6e99cb91fb87f5a65a933750ae5bb23cab4ab396e4bba4a5b0b07dcd32ff` is an image manifest, not a multi-platform index. Its config is `sha256:6c21eecbd8438dd313854a09d9351a9b572371e81c58038c5602f0da5169baa4`, and its two layer digests differ from the candidate. Thus the candidate represents changed runtime content; an index-versus-image digest comparison alone would not have established that.

Docker Hub's normal Docker pull failed with EOF while fetching CDN content. Direct IPv4 retrieval of the exact registry blobs succeeded. The candidate OCI manifest (`a1659a04…127b400`), config (`e19c4bab…f1121452`) and both layer blobs were SHA-256 checked against the official manifest; each decompressed layer DiffID also matches the manifest config. The candidate's raw OCI manifest SHA equals its `linux/amd64` descriptor digest. Docker Engine inventory and Trivy were run over an OCI layout containing those original manifest/config/layer bytes, selected explicitly by the immutable manifest digest. An ECR Public tag with the same text was not substituted: its config and second layer differed from Docker Hub, and the project spec requires preserving the existing Docker Hub repository identity.

Current official Docker Hub tag resolution on 2026-10-10: index `sha256:b707577445897895f25c42ad4c0bfe5747a53e16c06de8ef118a55d894eb1c1e`; unique `linux/amd64` child manifest `sha256:a1659a04c445036c54b49fe5163e46554ca24030e94c6eeffefe46fad127b400`; manifest media type `application/vnd.oci.image.manifest.v1+json`. Its OCI annotations bind it to Corretto source commit `883dd4b1df5aa871f1dfcec2244c5959b67e0239`, path `21/headless/al2023`, base name `amazonlinux:2023`, and image version `21-al2023-headless`. The image config reports `linux/amd64`; runtime reports Corretto `21.0.12.1` (Java 21). The exact source annotation and index/child digests are now pinned in metadata and schema.

Candidate package inventory from the actual `linux/amd64` image (`ID=amzn`, `VERSION_ID=2023`):

| Package family | Candidate installed build | Required fixed build |
| --- | --- | --- |
| `curl-minimal`, `libcurl-minimal` | `8.21.0-5.amzn2023.0.2` | `8.21.0-5.amzn2023.0.1` or later fixed build |
| `openssl-fips-provider-latest`, `openssl-libs` | `1:3.5.8-1.amzn2023.0.1` | `1:3.5.8-1.amzn2023.0.1` |
| `expat` | `2.8.3-1.amzn2023.0.1` | `2.8.3-1.amzn2023.0.1` |
| `rpm`, `rpm-libs`, `rpm-build-libs` | `4.16.1.3-29.amzn2023.0.8` | `4.16.1.3-29.amzn2023.0.8` |
| `pcre2`, `pcre2-syntax` | `10.40-1.amzn2023.0.4` | `10.40-1.amzn2023.0.4` |

All five package-family floors pass; no `dnf` update or package installation was performed. The approved exact tag, AL2023/headless identity, architecture, existing Docker Hub repository, and immutable pin policy are preserved.

Scanner evidence: Trivy `0.74.0` archive SHA-256 matched the repository pin (`94c40e…d520842`) and Cosign `3.1.2` matched its repository pin. The Trivy Sigstore bundle verified with the repository-pinned GitHub release workflow certificate identity and `https://token.actions.githubusercontent.com` issuer. The fresh Trivy DB metadata says `UpdatedAt=2026-10-10T12:33:35Z` (about 1.5 hours old at scan time; policy maximum is 24h). The candidate and old pinned positive-control OCI layouts were scanned with the same Trivy binary, DB and vulnerability scanner settings, `--exit-code 0`, no `--severity` or `--ignore-unfixed` filter, and temporary-only raw JSON which was deleted after sanitized counts were extracted. The only source-specific difference from the repository's Docker-daemon invocation is using Trivy `--input` for the verified OCI layout, with the exact platform manifest digest, to avoid the Docker daemon's CDN EOF; no finding/policy filter was changed.

| Scan target | Total findings | Unique CVEs | Findings in the five affected package families | Result |
| --- | ---: | ---: | ---: | --- |
| Candidate `sha256:a1659a04…127b400` | 0 | 0 | 0 | PASS; all 27 original target CVEs absent (indeed, zero findings overall) |
| Old pinned control `sha256:82eb6e99…dcd32ff` | 80 | 46 | 69 | Positive control; scanner detects affected package families (39 unique family CVEs with the current DB) |

The exact original 27-ID list is not checked into this worktree, but the candidate's complete report had zero findings, while the same scanner/database detected 39 unique CVEs across the five target package families in the old pinned control. Thus no individual target ID could be present in the candidate report. This is base-image Phase 0 scan evidence only; it is not a built-service scan, sanitized service-evidence artifact, hosted matrix result, or release-policy decision.

Phase 0 gate: PASS. Exact candidate provenance, platform, package inventory and scanner evidence are retained above and in the ignored plan-scoped OCI evidence directory `.superpowers/sdd/2026-10-10-s002-t03-corretto-base-image-refresh/evidence/corretto-phase0/`. No raw Trivy JSON is retained there. No workflow, required check, branch protection, release policy, vulnerability disposition, service behavior or generated-service destination was changed.
