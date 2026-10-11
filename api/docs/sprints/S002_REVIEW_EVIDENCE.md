# SPRINT-002 lifecycle and review evidence

Status: ACTIVATION_PUBLISHED_VERIFIED; T01/T02 published and T03 technically accepted. T04–T07 remain incomplete. Phase 0 exit remains open. The older narrative below records activation chronology; current facts are in the [completion audit](../../../docs/superpowers/plans/2026-10-12-s002-phase0-completion-log.md).

## Lifecycle Evidence

- Evidence kind: SPRINT_ACTIVATION
- Design approval: APPROVED | AkaDNT (Project Owner / Repository Owner) | 2026-10-05 | DESIGN | Owner-approved design decision recorded in the approved S002 service-foundation design.
- Plan approval: APPROVED | AkaDNT (Project Owner / Repository Owner) | 2026-10-05 | IMPLEMENTATION_PLAN | OWNER-DECISION-2026-10-05-S002-EXECUTION
- Capacity approval: APPROVED | AkaDNT (Project Owner / Repository Owner) | 2026-10-12 | CAPACITY | OWNER-DECISION-2026-10-12-SELF-PROJECT-NO-TIME-LIMIT | UNBOUNDED | UNBOUNDED | NONE | UNSET
- Execution method approval: APPROVED | AkaDNT (Project Owner / Repository Owner) | 2026-10-05 | EXECUTION_METHOD | OWNER-DECISION-2026-10-05-S002-EXECUTION | DIRECT_SEQUENTIAL_ISOLATED_WORKTREE
- Activation approval: APPROVED | AkaDNT (Project Owner / Repository Owner) | 2026-10-06 | SPRINT_ACTIVATION | OWNER-DECISION-2026-10-06-S002-ACTIVATION candidate 5524dace463be247cdbcf71ba88b894df1b3d20a
- Activation publication: PUBLISHED_VERIFIED | 6459baf17ae8a88aeceb5d5d24bc0c601ba6868b | f5ce08f4c4c1d5f8ffe3b69ae3abaffed01ad2ba | https://github.com/AkaDNT/auction-promax/pull/19 | monorepo-required=SUCCESS,https://github.com/AkaDNT/auction-promax/actions/runs/37411870026,6459baf17ae8a88aeceb5d5d24bc0c601ba6868b | supply-chain-verification=SUCCESS,https://github.com/AkaDNT/auction-promax/actions/runs/37411869987,6459baf17ae8a88aeceb5d5d24bc0c601ba6868b

## Historical activation chronology

The paragraphs below preserve the pre-PR19 state; their pending-publication statements are superseded by the verified PR19 facts above.

Owner decision OWNER-DECISION-2026-10-06-S002-ACTIVATION approves activation for candidate `5524dace463be247cdbcf71ba88b894df1b3d20a` (tree `009d1a911ebefbb1ca90b8edb436d760b5eeb293`) and preparation of the protected prerequisite PR. That approval did not itself authorize merge; PR18 subsequently received separate conditional merge authorization. Current published Sprint 001 remains unchanged until the separate factual activation-record publication. No branch protection change, Phase 0 exit, Phase 1 implementation, runtime acceptance or publication of this follow-up record is claimed. Verified prerequisite publication is recorded below.

PR18 actual merge has parents `9a625b96e97cac9900046a89131184e2d4427402` and `e514329457b59c5917d1b3f00953c3c85723da50`; its tree equals the reviewed approval-record candidate. Both referenced checks are push executions on the actual merge, not PR checks. Default tip matched that merge at read-back. Owner separately authorized PR18 merge conditional on required checks/protection, with no bypass. Protection was owner-provided read-back, not authenticated admin verification by the agent. Release-policy remains BLOCKED/failure, not vulnerability acceptance.

The current-S002 fields in this patch describe the factual activation-record candidate only. Their default-branch publication, exact merge identity and push checks must be verified separately; PR18 evidence cannot substitute for that gate. No future self-merge SHA is fabricated. Separate merge authorization is required for this follow-up PR.

## V1 amendment applicability to T01 (historical activation chronology)

| T01 artifact or evidence | Ruling | Basis |
| --- | --- | --- |
| `SprintLifecycle.mjs`, phase/history validator and negative fixtures | UNCHANGED_VALID | The amendment changes service/product authority, not lifecycle states, approvals or S001 preservation logic. |
| Blueprint, ADR, S002 design/parent-plan and candidate-sprint authority references | REFERENCE_UPDATE_REQUIRED | Current planning must point to the revised five-service topology; historical S001 references stay historical. |
| Repository lifecycle, T09 closeout, aggregate/workflow and changed-document link checks | RERUN_REQUIRED | Earlier GREEN was on earlier document bytes; the amended revision needs its own local results. |
| Previously observed T01 RED/GREEN and independent defect review | UNCHANGED_VALID | Their exact behavioral regressions remain applicable; no service shape was encoded into them. |
| Existing T01 artifacts invalidated by this amendment | INVALIDATED: none identified | No approval, publication identity, SHA or historical acceptance was rewritten. |

Trusted local Gitleaks worktree/history scans passed on 2026-10-06: exit 0 and zero findings in both modes, with unchanged source fingerprints. See the [scan execution log](../../../docs/superpowers/plans/2026-10-06-s002-gitleaks-path-compatibility-log.md). Candidate commit/tree and subsequent owner activation decision are recorded above; these local results do not prove hosted publication. The approval-record delta requires renewed local verification before publication.
