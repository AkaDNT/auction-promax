# Repository Build and Version Baseline

## Scope and ownership

The API and web applications are independently built components in one monorepo. Active workflows live only in the repository-root `.github/workflows/` directory:

| Component | Root workflow | Required baseline command from monorepo root |
| --- | --- | --- |
| `api` | `.github/workflows/api-baseline.yml` | `pwsh -NoProfile -File api/scripts/verify-build-baseline.ps1` |
| `web` | `.github/workflows/web-baseline.yml` | `npm.cmd --prefix web ci`, `npm.cmd --prefix web run lint`, `npm.cmd --prefix web run build` |

The workflows deliberately do not publish a container image. Amazon ECR is the approved registry, but publishing requires a separately provisioned GitHub OIDC role with a repository-specific AWS role ARN and least-privilege ECR policy. No long-lived AWS credential is committed or used by this baseline.

## Approved, machine-verifiable versions

| Tool | Version/policy | Enforcement |
| --- | --- | --- |
| Java | 21 LTS | Maven Enforcer accepts `[21,22)` in `identity-profile-service/pom.xml`. |
| Spring Boot | 4.0.8 | Exact Maven parent in Identity and both approved service template variants; approved S002 remediation supersedes the historical 3.5.16 baseline. |
| Maven | 3.9.16 | Exact Maven Wrapper distribution; Maven Enforcer accepts `[3.9.9,4.0.0)`. |
| Node.js | 24.15.0 | `.nvmrc`, `engines`, `engine-strict=true`, and web toolchain check. |
| npm | 11.12.1 | `packageManager`, `engines`, `engine-strict=true`, and web toolchain check. |
| AWS CDK CLI | 2.1135.1 | Exact `infra/package.json` dev dependency and lockfile. |
| AWS CDK library | 2.273.0 | Exact `aws-cdk-lib` dependency and lockfile after approved S002 bundled-dependency remediation. |
| CDK constructs | 10.8.1 | Exact `constructs` dependency and lockfile. |

`aws-cdk` and `aws-cdk-lib` use independent version streams. Both are intentionally pinned exactly rather than with a range. The local project CLI is invoked through npm; a globally installed CDK is not required.

S002's approved [Spring remediation record](../../../docs/superpowers/plans/2026-10-10-s002-t03-spring-remediation-execution.md) and [CDK remediation plan](../../../docs/superpowers/plans/2026-10-10-s002-t03-aws-cdk-remediation.md) supersede earlier framework/library pins. Current POMs use Jackson 3 BOM 3.1.7, remaining Jackson 2 BOM 2.21.7, springdoc 3.0.3 and the reviewed Tomcat 11.0.26 patch property. The committed service Dockerfile uses the approved Corretto 21.0.12 child digest; canonical relational integration tests retain PostgreSQL 17.11's approved digest. This records delivered pins rather than authorizing automatic updates. Native PostgreSQL 17.9 in the isolated local cluster is supplementary verification only.

## API clean baseline

Prerequisites: a Java 21 JDK and a network connection for the Maven Wrapper/dependency cache on the first run.

From the monorepo's `api/` directory (not a separate repository):

```powershell
./scripts/verify-build-baseline.ps1
```

Equivalent direct command:

```powershell
cd services/identity-profile-service
./mvnw.cmd -B verify
```

The CI workflow executes the equivalent Linux command `./mvnw -B verify`.

## CDK toolchain check

From the monorepo's `api/` directory:

```powershell
cd infra
npm ci
npm run cdk:version
```

This establishes a reproducible CDK v2 toolchain only. Infrastructure synthesis and deployment are not claimed until a CDK application and AWS OIDC role have been approved in a later task.

## Web clean baseline

Prerequisites: Node.js 24.15.0 and npm 11.12.1. Use the `web/.nvmrc` file with your version manager before running commands.

From the monorepo's `web/` directory:

```powershell
npm ci
npm run lint
npm run build
```

The `prelint` and `prebuild` scripts reject a different Node.js or npm version. `npm ci` installs only from the committed lockfile.

## CI security posture

- Both workflows grant only `contents: read`.
- They contain no secret, AWS credential, registry login, or deployment operation.
- ECR publishing must use GitHub Actions OIDC and a narrowly scoped AWS IAM role after its ARN, repository name, and deployment policy are approved.

## Troubleshooting

| Symptom | Resolution |
| --- | --- |
| Web preflight rejects Node/npm | Install the exact versions in `web/.nvmrc` and `web/package.json`. |
| Maven Enforcer rejects Java | Select a Java 21 JDK, then rerun the repository wrapper. |
| `npm ci` rejects the lockfile | Do not use `npm install` in CI; regenerate the lockfile intentionally with the approved npm version and review the diff. |
| CDK command cannot be found | Run `npm ci` from `api/infra`, then use `npm run cdk:version`; do not depend on a global CLI. |
