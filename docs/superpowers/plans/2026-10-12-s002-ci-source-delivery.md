# Sprint 002 CI source delivery implementation plan

> Execute inline using superpowers:executing-plans, with RED/GREEN and independent scoped review. This is the owner-approved T04/T05 delivery route, not a new product subsystem.

**Goal:** Deliver the four registered technical service source trees from isolated CI into reviewed commits without running the generator locally.

**Architecture:** The existing owning supply-chain matrix generates an absent service and validates its exact inventory. Before Maven creates build output, a small bundle module serializes only approved source bytes, file paths, modes and hashes plus the service/execution identity. A separate artifact upload occurs only after that service's canonical verification and sanitized security evidence succeed. Downloaded bundles are revalidated against the exact execution revision and current approved template bytes before a no-overwrite import; Identity is never included.

**Tech stack:** Existing Node 24.15.0, PowerShell no-overwrite publisher, pinned GitHub artifact actions, standalone Java 21/Boot 4.0.8/Maven 3.9.16 service foundations. No new dependency or service runtime abstraction.

**Spec:** [Approved service foundation design](../specs/2026-10-05-s002-service-foundation-design.md), T04/T05 in the [parent plan](2026-10-05-s002-phase0-exit-and-service-foundation.md), plus the owner's 2026-10-12 choice: “Generate trong CI, xuất source để review/commit; giữ quy tắc CI-only”.

## Global constraints

- Generate only in isolated CI. Local fixture roots are synthetic tests; do not generate under the real `api/services` tree.
- Only auction-service, bidding-service, billing-service and realtime-gateway can be delivered. Preserve Identity and never overwrite an existing destination.
- No credentials, local configuration, caches, binaries, Maven targets or scanner/runtime logs in the bundle. No arbitrary source paths or unsigned metadata alone as proof of hosted execution.
- Keep the five-service registry, database boundaries, wrapper/image/trust pins, workflow ownership, stable required checks and scanner/release-policy semantics.
- Source export is review material, not image publication, deployment or release. Merge authorization and actual Phase 0 exit/transition remain separate owner gates.
- Current owner ruling removes planning time limits; process/test deadlines still protect cleanup.

## Review focus

1. Wrong service/SHA or a forged bundle must fail before destination writes.
2. Traversal, duplicate/case-colliding paths, links, extra target/log/config files and wrong modes must be rejected.
3. Source contents with a recalculated hash must still match approved template expansion; hash consistency alone is insufficient.
4. A failed/skipped Maven, Failsafe or artifact-evidence job must not export accepted source; upload remains separate from sanitized scan evidence.
5. Import must preserve a pre-existing destination, publish only a complete staged tree and retain truthful execution/candidate provenance.

## Task 1 — Closed source bundle and rejection fixtures

**Files:** Create `api/scripts/foundation/ServiceSourceBundle.mjs`, `Export-ServiceSource.mjs`, `Test-ServiceSourceBundle.mjs`; use existing generator registry/inventory exports and `GeneratedServiceConformance.mjs`.

**Interfaces:**

- `createServiceSourceBundle({serviceId, executionSha, repositoryRoot})` returns `{schemaVersion:1, serviceId, executionSha, files, bundleSha256}`. Files are sorted records `{path,mode,sha256,contents}`. Modes are inventory values; content is LF UTF-8 source text. `bundleSha256` hashes the canonical JSON projection excluding itself.
- `validateServiceSourceBundle({bundle, serviceId, executionSha, repositoryRoot})` returns validated files or throws a fixed failure code. It requires exact keys, identity, SHA format, sorted exact inventory, modes, hashes and exact bytes matching reviewed templates; template wrapper tokens retain their three established exceptions.
- Export CLI `--service <id> --commit <execution-sha>` requires hosted CI metadata for `AkaDNT/auction-promax`, exact checked-out HEAD identity and a registered generated service. It writes only `RUNNER_TEMP/s002-service-source/<id>/service-source.json` in a fresh folder; no caller-selected source/output path is accepted. CLI errors are sanitized. Metadata checks prevent accidental local use; downloaded run/artifact identity remains independently verified through GitHub.

- [x] Write positive fixture bundles from existing synthetic generator fixtures and RED missing-module test.
- [x] Add negatives: preserved/unknown service, mismatched SHA, malformed/extra keys, missing/extra/duplicate/case-colliding/traversal file, wrong mode, corrupt hash, modified contents with recomputed hash and a generated tree containing target/log/config or a link.
- [x] Implement the closed module/CLI; run `node --test api/scripts/foundation/Test-ServiceSourceBundle.mjs` GREEN and existing registry/template/generated conformance regressions. Bundle/CLI suite 26/26, combined generated/bundle 34/34; actual exporter CI proof remains pending.
- [ ] Document the exact file set and provenance; independent review and local commit before isolated push.

## Task 2 — Owning CI export and hosted proof

**Files:** Modify only `.github/workflows/supply-chain.yml` and matching `ServiceMatrixWorkflowContract.mjs`/`Test-ServiceMatrixWorkflow.mjs`. Freshness does not need delivery exports; retain its independent verification purpose.

**Interfaces:** A pre-Maven `export-source` step follows generated conformance for ephemeral source. A separate pinned `upload-service-source` step uses `s002-service-source-<registry-id>` and contains only `service-source.json`. It requires successful canonical Maven, named Failsafe, graph and service-evidence validation, with 30-day retention and `if-no-files-found:error`. Do not merge source uploads into seven-file sanitized scan artifacts or matrix-result artifacts.

- [x] RED workflow mutation fixtures: missing export, export after Maven, missing/non-exact SHA binding, mutable upload pin, overly broad upload path, missing required success condition, Identity export.
- [x] Implement the source step/upload and GREEN the owning repository/negative/ownership/root/hosted contracts. Conditional source upload is a narrow reviewed exception; sanitized evidence still uploads unconditionally and separately.
- [ ] Exact-SHA review, authorized isolated push, verify actual PR execution SHA and all service jobs. Retain failed runs without relabeling them.
- [ ] Download only named source/evidence artifacts from the exact successful run; independently validate each source bundle and security/evidence binding.

## Task 3 — Reviewed import and service delivery

**Files:** Approved generated `api/services/<id>` inventories; source-delivery provenance records under `api/service-foundation/deliveries/`; task evidence/runbook.

**Interfaces:** A private one-time import script validates the already downloaded bundle through the committed validator, checks that the registered destination and any case alias are absent, writes only validated source records to an owned sibling stage and invokes existing `Publish-ServiceDirectory.ps1`. It imports CI-produced bytes; it never calls `Generate-Service.mjs` or synthesizes a real destination from templates. Existing destination/link failure is terminal and non-destructive.

- [ ] Review the source bundle identity and complete inventory against the actual run and exact execution SHA before import.
- [ ] Import Auction first; verify generated conformance, exact byte/hash inventory and tracked modes; commit a scoped local candidate and review it. This satisfies source delivery only after protected publication and actual service-specific hosted gates.
- [ ] Repeat controlled imports for Bidding/Billing/Gateway as T05 increments, with per-service proof and no domain/product code.
- [ ] Rerun actual CI on committed-source candidates so evidence proves their builds/scans independently and provenance changes from ephemeral to committed truthfully.
- [ ] Update task evidence only for satisfied acceptance; leave T06/T07 matrix/rehearsal/owner exit/handoff gates open.

## Rollback and evidence

Keep each reviewed source/task commit and bundle provenance recoverable. Revert through reviewed commits; never overwrite/drop/reset a service or database. Private bundles/downloads/logs remain ignored. Source bundles are public review material only after trusted secret scanning and approved repository publication. The original native cluster remains intact; separate native cluster proof remains supplementary to the canonical pinned Testcontainers execution.
