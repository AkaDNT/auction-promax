# Sprint 002 final Phase 0 gates

This expands T06/T07 of the [approved parent plan](2026-10-05-s002-phase0-exit-and-service-foundation.md), under its approved [design](../specs/2026-10-05-s002-service-foundation-design.md). Execute inline with RED/GREEN and independent review. Source delivery is reviewed and all-five committed-source CI passed on `9b33152`; the final frozen-candidate rehearsal remains pending. No new product behavior is included.

## T06 matrix and exact evidence

Use `api/docs/decisions/PHASE_0_EXIT_MATRIX.md` as the readable canonical record, with one JSON block under `## Machine-readable evidence`. Add a narrowly scoped `Phase0ExitMatrix.mjs` validator and `Test-Phase0ExitMatrix.mjs` fixtures/repository modes. The fixed requirements are D01–D12 in blueprint order and E01–E03; scope is the approved five-service registry. Runtime obligations require runtime evidence; decision approval alone cannot satisfy them. Gateway's database exclusion must be explicit. Idempotency/outbox/inbox/sample obligations refer to Identity's technical sample, without distributing business behavior across the new foundations.

The record separates `IN_PROGRESS`, `CANDIDATE_READY`, `OWNER_ACCEPTED` and `PUBLISHED_VERIFIED`. Pending evidence or acceptance can remain valid while current Phase 0 is open; `--require-exit` must reject it. Evidence revisions bind to a frozen implementation candidate/tree. Later documentation changes require explicit delta applicability, never silent replacement of a runtime revision. Owner approval and actual protected publication remain separate facts. Canonical fields reject unknown keys, duplicate/missing requirements and missing service scope.

Inherited reconciliation must include service-template, authentication/authorization, product functions, producer/consumer contracts, production operations/platform and security findings. Mandatory Phase 0 gaps cannot remain unresolved in an exit-ready record. Later-phase obligations require cited blueprint/addendum authority and remain open; consumer compatibility is always `DEFERRED_NO_PRODUCER_CONTRACT` until authoritative contracts exist. Historical Sprint 001 evidence stays historical. Security execution and actual policy results remain distinct.

- [x] RED: missing module and missing owning-workflow/history gate; fixture rejections cover missing deliverable/service, decision-only runtime, deferred consumer relabeled PASS, stale evidence, unresolved mandatory gap and missing acceptance/publication. Real prior-guard mutation reproduces the reviewed applicability gap.
- [x] GREEN: 31/31 matrix fixtures, pending structural repository record and complete synthetic accepted/published fixtures; existing always-run lifecycle owns exact structural gates, with workflow omission/weakening mutations and stable required checks. Independent review cleared the applicability finding.
- [x] Correct current runbook/version/topology applicability and record source-delivery provenance without rewriting historical results.
- [ ] Freeze reviewed implementation candidate; clean detached LF checkout with no previous build/install outputs. Fresh locked contracts/infra/web installs and complete independent checks. Shared download caches may be used and recorded.
- [ ] Obtain actual all-five committed-source canonical hosted builds, registered Failsafe, graph gates, hardened live HTTP smoke and seven-file sanitized scans on that candidate. Verify run/execution/service bindings and actual finding counts.
- [ ] Repeat Identity live initial/replay/conflict/validation/denied actuator checks, scoped six-table persistence, supplied W3C trace/correlation and recorded/replayed/published/applied logs. Canonical tests supply concurrency/rollback/duplicate-delivery evidence; live HTTP replay does not substitute for duplicate delivery.
- [ ] Complete matrix/reconciliation, trusted introduced-range scanning, Markdown/whitespace and independent review. Present concrete frozen evidence for owner technical acceptance and separate merge permission.
- [ ] After authorized protected publication, read actual merge parents/tree/default/checks. Rehearse affected changes if runtime applicability differs. Retain failed evidence and no cleanup/data deletion.

## T07 transition after actual publication

Prepare and review transition-support code/negative fixtures before the T06 implementation freeze, while actual Phase 0 stays open. This lets the later T07 factual approval/publication change remain documentation-only; workflow/tooling changes cannot silently reuse the frozen runtime proof. Actual exit, handoff and transition publication still occur only after the T06 published evidence and explicit owner decisions.

- [ ] RED/GREEN lifecycle transition fixtures: candidate-only approval, missing actual merge checks, wrong candidate/tree, absent owner actual-exit/handoff confirmation, premature COMPLETE and policy status manipulation rejected. Historical S001 remains Phase 0.
- [ ] Present published T06 facts for explicit owner actual Phase 0 exit and Phase 1 handoff approval. Prepare separate protected transition record with truthful pending/final publication state and no invented self-merge identity.
- [ ] Obtain separate transition merge permission, verify actual transition merge/default/push checks, and finish any factual follow-up before final completion claim.
- [ ] Verify published lifecycle/matrix/links/security range; provide clear completion log and residual Phase 1 backlog. No Phase 1 implementation or deploy/release starts automatically.
