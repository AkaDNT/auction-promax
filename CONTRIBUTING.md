# Contributing to Auction ProMax

The canonical development branch is `migration/monorepo`, the repository's current default. The branch named `main` is the locked bootstrap recovery ref, not a target for new work. Do not rename or update `main`. Never push directly or force-push to the default branch; changes land through protected pull requests once the owner opens merges.

Create a topic branch from the current default and open a pull request back to `migration/monorepo`. Keep changes scoped and describe which API, web, contract, or infrastructure boundary they affect. The repository's only active GitHub Actions workflows live in root `.github/workflows/`.

## Project boundaries

- `api/services/` contains API services. `api/infra/` contains infrastructure code. Build and test these independently of the web app.
- `api/contracts/` is the canonical producer-owned contract registry. A contract change must pass its producer checks and be assessed against actual consumers; do not derive a purported producer contract from frontend types.
- `web/` is the independently built Next.js app. Its product API calls currently lack authoritative producer contracts in this Phase 0 repository. Web-to-producer compatibility is recorded as `DEFERRED_NO_PRODUCER_CONTRACT`, **not** as a passing gate. See the [Phase 0 consumer-gate addendum](docs/superpowers/specs/2026-09-27-s001-t09-phase0-consumer-gate-addendum.md).

## Local checks

Use the pinned toolchains and run the relevant checks before opening a PR. On Windows PowerShell, use `npm.cmd` in place of `npm` if the `npm.ps1` execution policy prevents invocation.

```sh
cd api/contracts && npm ci && npm run lint:openapi && npm run validate:schemas && npm run test:fixtures && npm run test:governance
cd ../infra && npm ci && npm run cdk:version
cd ../services/identity-profile-service && ./mvnw clean verify
cd ../../../web && npm ci && npm run lint && npm run build
```

The API Maven integration tests require a working Docker engine. On Windows PowerShell, run `./mvnw.cmd clean verify` in place of `./mvnw clean verify`. Run each command from the shown component directory; a successful web build alone does not prove API contract compatibility.

## Pull-request and security rules

The protected default requires `monorepo-required` and `supply-chain-verification` from GitHub Actions. The first aggregates applicable API/web gates, including docs-only PRs; the second proves supply-chain execution integrity. `release-policy` is a separate decision and may report `BLOCKED`. Do not bypass it, treat it as release-ready, or suppress a scanner to make a PR appear green. The default branch remains read-only during the controlled cutover until the owner explicitly opens normal protected merges.

Never commit real `.env*` values, credentials, `.worktrees/`, `.vscode/`, `.tools/`, `node_modules/`, `.next/`, Maven `target/`, raw scanner reports, logs, or backups. Reviewed `.env.example` files may be committed. Stage only the intended paths and inspect the full commit range before publishing a branch.
