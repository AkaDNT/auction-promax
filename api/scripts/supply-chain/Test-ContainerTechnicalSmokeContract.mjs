import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const scriptPath = path.join(repoRoot, "scripts/supply-chain/Invoke-ContainerTechnicalSmoke.ps1");
if (!fs.existsSync(scriptPath)) throw new Error("Container technical smoke runner is missing.");
const source = fs.readFileSync(scriptPath, "utf8");
const statusHarnessPath = path.join(repoRoot, "scripts/supply-chain/Test-ContainerTechnicalSmokeStatus.ps1");
const statusHarnessSource = fs.readFileSync(statusHarnessPath, "utf8");
const resolverPath = path.join(repoRoot, "scripts/supply-chain/ServiceArtifact.psm1");
const resolverSource = fs.readFileSync(resolverPath, "utf8");
const identityApplicationPath = path.join(repoRoot, "services/identity-profile-service/src/main/resources/application.yaml");
const identityLocalPath = path.join(repoRoot, "services/identity-profile-service/src/main/resources/application-local.yaml");
for (const [name, expected] of [
  ["Contract validation is mandatory", "CONTAINER_SMOKE_CONTRACT_INVALID"],
  ["Image presence is mandatory", "CONTAINER_SMOKE_IMAGE_MISSING"],
  ["Loopback-only publishing is mandatory", "127.0.0.1:$hostPort`:8080"],
  ["Read-only root filesystem is mandatory", "'--read-only'"],
  ["Tmpfs is mandatory", "'--tmpfs'"],
  ["Capability drop is mandatory", "'--cap-drop','ALL'"],
  ["No-new-privileges is mandatory", "'no-new-privileges'"],
  ["PIDs limit is mandatory", "'--pids-limit'"],
  ["Technical profile is mandatory", "SPRING_PROFILES_ACTIVE"],
  ["Readiness timeout fails closed", "CONTAINER_SMOKE_READINESS_TIMEOUT"],
  ["Hardening drift fails closed", "CONTAINER_SMOKE_HARDENING_DRIFT"],
  ["Explicit Docker executable is mandatory", "$script:dockerExe"],
  ["Cleanup is mandatory", "rm --force $name"],
  ["Smoke phases are classified", "$smokePhase = 'startup'"],
  ["Docker startup failures use a fixed sanitized classifier", "function Resolve-DockerFailureCode([string]$Output, [string]$FallbackCode, [int]$ExitCode = 0)"],
  ["Docker failure classifier has executable representative cases", "function Invoke-ContainerSmokeFailureClassifierContractTest"],
  ["Docker client exit 125 has a fixed sanitized diagnostic", "CONTAINER_SMOKE_DOCKER_CLIENT_EXIT_125"],
  ["Port conflicts have a fixed failure class", "CONTAINER_SMOKE_HOST_PORT_UNAVAILABLE"],
  ["Runtime permission errors have a fixed failure class", "CONTAINER_SMOKE_RUNTIME_PERMISSION_DENIED"],
  ["Raw Docker output is passed only to the classifier", "Resolve-DockerFailureCode -Output ($output -join [Environment]::NewLine)"],
  ["Unknown smoke failures are sanitized", "CONTAINER_SMOKE_UNCLASSIFIED_FAILED"],
  ["Smoke selects a registry service", "[string]$ServiceId = 'identity-profile-service'"],
  ["Smoke derives service and image identity from the resolver", "Resolve-ServiceArtifact -ServiceId $ServiceId -RequireBuiltArtifact"],
  ["Relational smoke runs the generated local profile", "'local'"],
  ["Gateway smoke explicitly has no database container", "$artifact.variant -ceq 'relational'"],
  ["Relational smoke uses the pinned PostgreSQL image", "postgres:17.11-bookworm@sha256:84560e3b9c6874893fc4e2854f5dc3e7c1a37bc9d1dfd7a8c641310ae22ba5ad"],
  ["Relational smoke selects the registered service's actual bootstrap filename", "$bootstrapFile = if ($artifact.serviceId -ceq 'identity-profile-service') { 'bootstrap-identity.sql' } else { 'bootstrap.sql' }"],
  ["Relational smoke waits for actual PostgreSQL readiness", "pg_isready"],
  ["Relational smoke loads only the generated ephemeral bootstrap", "src=' + $bootstrapPath"],
  ["Relational smoke configures readiness against the private database service", "jdbc:postgresql://' + $databaseName + ':5432/' + $artifact.testDatabase"],
  ["Identity smoke resolves database-backed settings through a tested helper", "Get-ContainerSmokeConfiguration -Artifact $artifact -SmokeContract $smoke"],
  ["Relational bootstrap role check uses usernames returned by the selected smoke configuration", "rolname IN ('$($smokeSettings.appUsername)','$($smokeSettings.migratorUsername)')"],
  ["Optional database role settings are initialized before variant selection", "$appUsername = $null"],
  ["Identity smoke uses its aggregate health endpoint so DB contributes to UP", "'/actuator/health'"],
  ["Identity fixture credentials are selected rather than generic generated-service credentials", "test-only-identity-app-not-a-secret"],
]) {
  if (!source.includes(expected)) throw new Error(`${name}: missing ${expected}`);
  process.stdout.write(`[PASS] ${name}\n`);
}
const identityApplication = fs.readFileSync(identityApplicationPath, "utf8");
const identityLocal = fs.readFileSync(identityLocalPath, "utf8");
if (!identityApplication.includes("include: health") || !identityLocal.includes("datasource:") || !identityLocal.includes("flyway:")
  || !identityLocal.includes("IDENTITY_DB_APP_PASSWORD") || !identityLocal.includes("IDENTITY_DB_MIGRATOR_PASSWORD")) {
  throw new Error("Identity aggregate health smoke must run with its database-backed local configuration.");
}
process.stdout.write("[PASS] Identity aggregate health is enabled and local profile requires datasource and Flyway configuration\n");
if (!statusHarnessSource.includes("-FailureClassifierContractTest") || !statusHarnessSource.includes("CONTAINER_SMOKE_FAILURE_CLASSIFIER_CONTRACT_FAILED")) {
  throw "Docker failure classifier must run in the hosted PowerShell status harness.";
}
if (!statusHarnessSource.includes("Get-HostedChildPowerShellExecutable") || /powershell\.exe/i.test(statusHarnessSource)) {
  throw "Smoke status harness child PowerShell launches must use the portable hosted executable resolver.";
}
process.stdout.write("[PASS] Smoke status harness resolves its child PowerShell executable portably\n");
if (/\$failureClassifierOutput\s*=\s*@\(&[^\r\n]*-ExecutionPolicy/i.test(statusHarnessSource)) {
  throw "Docker failure classifier fixture must not add an execution-policy override.";
}
process.stdout.write("[PASS] Docker failure classifier is wired into the hosted PowerShell status harness\n");
if (resolverSource.includes("imageReference = if ($service.id -ceq 'identity-profile-service') { 'auction-promax/identity-profile-service:s001-t07' } else { 'auction-promax/' + [string]$service.id + ':local' }") === false) {
  throw "Service resolver must retain Identity tag compatibility and isolate new service tags.";
}
process.stdout.write("[PASS] New service image references remain isolated without changing Identity's local tag\n");
process.stdout.write("Container technical smoke contract tests: PASS\n");
