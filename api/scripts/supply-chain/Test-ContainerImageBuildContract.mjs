import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const scriptPath = path.join(repoRoot, "scripts/supply-chain/Invoke-ContainerImageBuild.ps1");
if (!fs.existsSync(scriptPath)) throw new Error("Container image build orchestrator is missing.");
const source = fs.readFileSync(scriptPath, "utf8");

function assertIncludes(name, expected) {
  if (!source.includes(expected)) throw new Error(`${name}: missing '${expected}'.`);
  process.stdout.write(`[PASS] ${name}\n`);
}

function assertExcludes(name, forbidden) {
  if (source.includes(forbidden)) throw new Error(`${name}: forbidden '${forbidden}' is present.`);
  process.stdout.write(`[PASS] ${name}\n`);
}

assertIncludes("Repository-owned prebuild gate is mandatory", "& $prebuildScriptPath");
assertIncludes("Existing artifact reuse revalidates prebuild", "& $prebuildScriptPath -SkipBuild");
assertIncludes("Verified artifact reuse is explicit", "[switch]$UseExistingVerifiedArtifact");
assertIncludes("Base image resolution is mandatory", "& $baseResolutionScriptPath");
assertIncludes("Buildx target platform is contract-owned", "--platform $contract.image.platform");
assertIncludes("Buildx always refreshes base manifest", "--pull");
assertIncludes("Buildx loads only local image store", "--load");
assertIncludes("Buildx local tag is contract-owned", "--tag $imageReference");
assertIncludes("Buildx Dockerfile path is contract-owned", "--file $dockerfilePath");
assertIncludes("JAR hash is captured before build", "$jarHashBefore");
assertIncludes("JAR mutation fails closed", "CONTAINER_BUILD_JAR_MUTATED_DURING_BUILD");
assertIncludes("Local image identity is inspected", "Get-LocalImageInspection");
assertIncludes("Linux amd64 is asserted after build", "CONTAINER_BUILD_LOCAL_IMAGE_IDENTITY_INVALID");
assertExcludes("Registry push is forbidden", "--push");
assertExcludes("Registry login is forbidden", "docker login");
assertExcludes("Build secrets are forbidden", "--secret");
assertExcludes("Build SSH forwarding is forbidden", "--ssh");
assertExcludes("Build arguments are forbidden", "--build-arg");
assertExcludes("Blind build skip is forbidden", "SkipBuild = $true");

process.stdout.write("Container image build orchestration contract tests: PASS\n");
