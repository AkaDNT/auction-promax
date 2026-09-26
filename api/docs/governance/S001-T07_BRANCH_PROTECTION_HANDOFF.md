# S001-T07 Branch-Protection Owner Handoff

**Status:** Awaiting repository-owner action

Cycle 6 has not configured GitHub branch protection from this repository.
No repository administration or GitHub API authority was available during local
implementation, so this document is a handoff rather than a claim of an
applied ruleset.

## Required Phase 0 rule

Apply the rule to the repository default branch after a successful hosted
`supply-chain.yml` run has created the check:

- Require the exact check name `supply-chain-verification` before merge.
- Do **not** require `release-policy` for Phase 0 source integration while the
  approved Corretto base image has unresolved upstream High findings.
- Keep `release-policy` visible; a future release/deployment gate must require
  it to be `PASS`.

## Verification before applying the rule

1. Push the reviewed Cycle 6 commits and open a pull request.
2. Confirm the triggered revision—not a substituted default branch—runs on
   GitHub-hosted Linux and creates both checks.
3. Confirm `supply-chain-verification` passes when execution integrity is
   sound, even if `release-policy` is `BLOCKED`.
4. Download the uploaded artifact and validate the exact seven-file evidence
   allowlist, commit binding, 30-day retention, and absence of raw reports.
5. Manually run `security-freshness.yml`; confirm it checks out the default
   branch and records a separate freshness result.

## Owner record

After configuration, record the following in the Cycle 6 runbook and sprint
evidence:

- default branch and applied rule/ruleset identifier;
- required check name exactly as configured;
- hosted run URLs or private run references and immutable commit SHAs;
- artifact audit outcome and freshness run outcome;
- repository administrator and date of application.

Do not mark S001-T07 complete or claim branch protection is configured until
these items are directly verified. This handoff does not authorize ECR,
Inspector, AWS deployment, application signing, SARIF upload, or a
release-ready claim.
