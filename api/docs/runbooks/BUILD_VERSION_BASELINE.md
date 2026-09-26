# Repository Build and Version Baseline

## Scope and ownership

The API and web applications are independent Git repositories and therefore use independent GitHub Actions workflows:

| Repository | Workflow | Required baseline command |
| --- | --- | --- |
| `api` | `.github/workflows/api-baseline.yml` | `scripts/verify-build-baseline.ps1` |
| `web` | `.github/workflows/web-baseline.yml` | `npm ci`, `npm run lint`, `npm run build` |

The workflows deliberately do not publish a container image. Amazon ECR is the approved registry, but publishing requires a separately provisioned GitHub OIDC role with a repository-specific AWS role ARN and least-privilege ECR policy. No long-lived AWS credential is committed or used by this baseline.

## Approved, machine-verifiable versions

| Tool | Version/policy | Enforcement |
| --- | --- | --- |
| Java | 21 LTS | Maven Enforcer accepts `[21,22)` in `identity-profile-service/pom.xml`. |
| Spring Boot | 3.5.16 | Exact Maven parent version. |
| Maven | 3.9.16 | Exact Maven Wrapper distribution; Maven Enforcer accepts `[3.9.9,4.0.0)`. |
| Node.js | 24.15.0 | `.nvmrc`, `engines`, `engine-strict=true`, and web toolchain check. |
| npm | 11.12.1 | `packageManager`, `engines`, `engine-strict=true`, and web toolchain check. |
| AWS CDK CLI | 2.1135.1 | Exact `infra/package.json` dev dependency and lockfile. |
| AWS CDK library | 2.264.0 | Exact `aws-cdk-lib` dependency and lockfile. |
| CDK constructs | 10.8.1 | Exact `constructs` dependency and lockfile. |

`aws-cdk` and `aws-cdk-lib` use independent version streams. Both are intentionally pinned exactly rather than with a range. The local project CLI is invoked through npm; a globally installed CDK is not required.

## API clean baseline

Prerequisites: a Java 21 JDK and a network connection for the Maven Wrapper/dependency cache on the first run.

From the API repository root:

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

From the API repository root:

```powershell
cd infra
npm ci
npm run cdk:version
```

This establishes a reproducible CDK v2 toolchain only. Infrastructure synthesis and deployment are not claimed until a CDK application and AWS OIDC role have been approved in a later task.

## Web clean baseline

Prerequisites: Node.js 24.15.0 and npm 11.12.1. Use the `web/.nvmrc` file with your version manager before running commands.

From the web repository root:

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
