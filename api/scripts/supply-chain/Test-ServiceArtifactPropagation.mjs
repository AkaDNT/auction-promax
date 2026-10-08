import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const script = (name) => fs.readFileSync(path.join(repoRoot, `scripts/supply-chain/${name}`), "utf8");
const assertions = [
  ["prebuild selects a service", "Invoke-ContainerPrebuildArtifact.ps1", "[string]$ServiceId = 'identity-profile-service'"],
  ["prebuild resolves and validates the canonical artifact", "Invoke-ContainerPrebuildArtifact.ps1", "Resolve-ServiceArtifact -ServiceId $ServiceId -RequireBuiltArtifact"],
  ["prebuild passes the service to SBOM validation", "Invoke-ContainerPrebuildArtifact.ps1", "'--service', $ServiceId"],
  ["image build selects a service", "Invoke-ContainerImageBuild.ps1", "[string]$ServiceId = 'identity-profile-service'"],
  ["image build forwards the selector to both prebuild modes", "Invoke-ContainerImageBuild.ps1", "-ServiceId $ServiceId"],
  ["image build resolves all service artifact paths", "Invoke-ContainerImageBuild.ps1", "Resolve-ServiceArtifact -ServiceId $ServiceId -RequireBuiltArtifact"],
  ["dependency scan selects the registry SBOM and evidence root", "Invoke-VulnerabilityScanning.ps1", "$artifact.sbomApiRelativePath"],
  ["repository Gitleaks evidence is placed under selected service evidence", "Invoke-GitleaksScanning.ps1", "$artifact.evidencePath"],
  ["container scan inspects resolver-selected image", "Invoke-ContainerVulnerabilityScanning.ps1", "$paths.Artifact.imageReference"],
  ["container scan writes into selected service evidence", "Invoke-ContainerVulnerabilityScanning.ps1", "Evidence=(Join-Path $artifact.evidencePath 'container-vulnerability-inventory.json')"],
  ["hosted orchestration accepts a service selector", "Invoke-HostedSupplyChain.ps1", "[string]$ServiceId = 'identity-profile-service'"],
  ["repository-only scan mode exists", "Invoke-HostedSupplyChain.ps1", "[switch]$RepositoryOnly"],
  ["repository-only mode selects infrastructure-only Trivy scan", "Invoke-VulnerabilityScanning.ps1", "Where-Object { $_.targetType -eq 'filesystem' }"],
  ["hosted stages forward selected service identity", "Invoke-HostedSupplyChain.ps1", "'-ServiceId',$ServiceId"],
  ["hosted evidence hashes the resolved service JAR", "Invoke-HostedSupplyChain.ps1", "$serviceArtifact.jarPath"],
  ["hosted evidence identifies the resolved local image", "Invoke-HostedSupplyChain.ps1", "$serviceArtifact.imageReference"],
];

for (const [label, file, expected] of assertions) {
  const source = script(file);
  if (!source.includes(expected)) throw new Error(`${label}: contract missing`);
  process.stdout.write(`[PASS] ${label}\n`);
}

const smoke = script("Invoke-ContainerTechnicalSmoke.ps1");
for (const [label, expected] of [
  ["smoke chooses the actual generated local profile", "$artifact.serviceId -ceq 'identity-profile-service'"],
  ["only relational variant starts PostgreSQL", "$artifact.variant -ceq 'relational'"],
  ["database environment is confined to the relational-only branch", "if ($artifact.variant -ceq 'relational') {"],
  ["relational app readiness is gated on initialized PostgreSQL roles", "pg_roles WHERE rolname IN"],
]) {
  if (!smoke.includes(expected)) throw new Error(`${label}: contract missing`);
  process.stdout.write(`[PASS] ${label}\n`);
}

process.stdout.write("Service artifact propagation contract tests: PASS\n");
