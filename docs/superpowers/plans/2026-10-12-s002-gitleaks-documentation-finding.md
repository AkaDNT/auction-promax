# S002 documentation history finding

Status: **OWNER_DELEGATED_DISPOSITION_SELECTED; EXACT_CANDIDATE_VERIFICATION_PENDING**. The owner explicitly delegated selecting the cleanest production disposition in the current project context. The agent selected the independently reviewed exact false-positive registry proposal below; final postcommit/hosted verification remains pending.

## Observed failure

Candidate `6bb52949321c00ecce8c563a33fdafb11b0db259`: PR [run 38201670021](https://github.com/AkaDNT/auction-promax/actions/runs/38201670021), execution `0ef98c1e5e450e8e853132a1fb11e1257c1c54b4`, and push [run 38201666015](https://github.com/AkaDNT/auction-promax/actions/runs/38201666015) fail `SECRET_SCAN_FAILED`. Repository and all five service scans stop; aggregate fails and release policy is skipped. API/Web/Monorepo checks pass. These failed runs are retained, not relabeled.

Trusted local full-history reproduction after commit reports working-tree findings **0**, Git-history findings **1**, policy BLOCKED and `GITLEAKS_FINDING_REQUIRES_INCIDENT`. Earlier precommit scans reported 0/0/0; they did not predict this newly introduced history-specific finding. The postcommit scan supersedes their suitability as complete exact-commit scanner proof.

## Exact classification evidence

| Field | Observed value |
| --- | --- |
| Scan mode | `git` |
| Rule | `generic-api-key` |
| Path | `docs/superpowers/plans/2026-10-12-s002-phase0-final-gates.md` |
| Commit | `6bb52949321c00ecce8c563a33fdafb11b0db259` |
| Scanner fingerprint | `6bb52949321c00ecce8c563a33fdafb11b0db259:docs/superpowers/plans/2026-10-12-s002-phase0-final-gates.md:generic-api-key:9` |
| Location | Line 9, columns 496–519 |
| Entropy | 3.6901164 |
| Redaction | `--redact=100`; verified `Secret` was `REDACTED` |

The actual committed line is English design prose describing rejected unknown fields and repeated or missing requirement rows. The numeric location maps to the prose about repeated and missing requirements. The complete committed line contains only design prose/state labels, with no credential, token, password, external account or connection setting. This is evidence for a documentation false positive, not a claim that a secret incident has been accepted. The current plan rephrases that sentence clearly; the historical finding remains visible under its exact disposition.

Only numeric/location metadata was extracted from the fully redacted raw scanner report. The owned temporary raw report was deleted after bounded path verification; raw fields were not printed, retained or uploaded. Sanitized inventory and failed hosted logs remain private. Current primary [Gitleaks documentation](https://github.com/gitleaks/gitleaks/blob/master/README.md) confirms history scanning and fingerprint correlation; this repository's stricter policy requires findings remain visible and uses an exact reviewed registry disposition rather than a scanner ignore/baseline.

## Concrete proposed disposition

Propose one `GL-FP-001` entry in `api/security/gitleaks-allowlist.json`, matching **only** the scan mode, rule, path, exact scanner fingerprint and exact commit above. Status would be `false-positive`, owner/approver AkaDNT, rationale the verified English-prose match, remediation reference this dossier, approval timestamp the actual owner decision and expiry 30 days later. No directory/rule/global ignore, history rewrite, scanner disable, baseline suppression or real-secret risk acceptance is proposed.

The registry was empty when this proposal was reviewed and presented. The owner's reply was: “hãy quyết định sao cho production clean nhất theo context project hiện tại”. Under that explicit delegation, the agent selected the reviewed exact disposition with approval timestamp `2026-10-12T09:12:08Z` and expiry `2026-11-11T09:12:08Z`, 30 days later. The approver field records the delegation rather than inventing a separately performed owner audit.

A changed finding, path, commit, fingerprint or expired approval must fail closed. Validate the registry schema and exact-match/changed-fingerprint/expiry policy fixtures, rerun trusted working-tree/full-history scanning after the resulting commit, independently review the candidate, and run authorized exact-candidate CI. Keep the original failed runs separate. The disposition is not scanner suppression, a real-secret accepted-risk state or permission to release.

## Real registry verification and compatibility correction

The first real registry scan failed `GITLEAKS_ALLOWLIST_APPROVAL_INVALID` despite valid raw JSON. Reproduced that PowerShell 7's default JSON conversion materializes ISO timestamps as `DateTime`; interpolating them into the strict existing timestamp parser loses their lexical form. Current primary PowerShell docs confirmed this default and the `DateKind String` parameter introduced in 7.5.

Added format-preserving registry loading: use `DateKind String` where available; older PowerShell 7 recovers the original string tokens through its built-in .NET JSON reader; Windows PowerShell 5.1 keeps its original string behavior. The timestamp/policy parser and all expiry/fingerprint checks are unchanged. Fixtures observed RED before the loader existed, then passed **18/18 in PowerShell 7 and 18/18 in Windows PowerShell 5.1**, including lexical offset preservation followed by rejection, malformed JSON, expiry, future approval and changed fingerprint.

Trusted actual scanning with the selected exact disposition passed directory findings=0, Git findings=1, false positives=1. This is precommit proof only; postcommit and hosted exact-candidate checks remain pending. An independent reviewer inspected the reader/disposition implementation and found no Critical/Important issue; they did not independently execute PowerShell/scanning, so those runtime results are the implementer's evidence.
