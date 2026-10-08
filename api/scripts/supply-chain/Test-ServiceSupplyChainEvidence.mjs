import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const validatorPath = path.join(here, "Validate-ServiceSupplyChainEvidence.mjs");
if (!fs.existsSync(validatorPath)) {
  process.stdout.write("RED SERVICE_SUPPLY_CHAIN_EVIDENCE_VALIDATOR_NOT_IMPLEMENTED\n");
  throw new Error("SERVICE_SUPPLY_CHAIN_EVIDENCE_VALIDATOR_NOT_IMPLEMENTED");
}
const { validateServiceEvidence } = await import(pathToFileURL(validatorPath));
const require = createRequire(import.meta.url);
const registry = JSON.parse(fs.readFileSync(path.resolve(here, "../../service-foundation/services.json"), "utf8"));
const service = registry.services.find(({ id }) => id === "auction-service");
const apiRoot = path.resolve(here, "../..");
const ajvPath = path.join(apiRoot, "contracts/node_modules/ajv/dist/2020.js");
if (!fs.existsSync(ajvPath)) throw new Error("Pinned Ajv is missing; run npm ci in api/contracts before service evidence fixtures.");
const { default: Ajv2020 } = await import(pathToFileURL(ajvPath).href);
const evidenceSchema = JSON.parse(fs.readFileSync(path.join(apiRoot, "security/schemas/service-supply-chain-evidence.schema.json"), "utf8"));
const evidenceSchemaValidator = new Ajv2020({ allErrors: true, strict: true }).compile(evidenceSchema);
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "apx-service-evidence-"));

function git(root, ...args) {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
function write(root, relative, content) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
function commit(root, message) {
  git(root, "add", "-A");
  git(root, "-c", "user.name=Fixture Owner", "-c", "user.email=fixture@example.invalid", "commit", "-m", message);
  return git(root, "rev-parse", "HEAD");
}
function newRepository(withSource = false) {
  const root = fs.mkdtempSync(path.join(tempRoot, "repo-"));
  git(root, "init", "--quiet");
  write(root, "api/service-foundation/services.json", fs.readFileSync(path.resolve(here, "../../service-foundation/services.json"), "utf8"));
  if (withSource) writeServiceSource(root);
  const revision = commit(root, "fixture baseline");
  return { root, revision };
}
function writeServiceSource(root) {
  const base = `api/services/${service.id}`;
  write(root, `${base}/pom.xml`, `<project><groupId>${service.groupId}</groupId><artifactId>${service.artifactId}</artifactId><version>${service.version}</version></project>`);
  write(root, `${base}/Dockerfile`, "FROM example.invalid/runtime@sha256:0000000000000000000000000000000000000000000000000000000000000000\n");
}
function makeEvidence(root, revision, options = {}) {
  const project = path.join(root, service.destination);
  writeServiceSource(root);
  const target = path.join(project, "target");
  fs.mkdirSync(target, { recursive: true });
  const jarPath = path.join(target, `${service.artifactId}-${service.version}.jar`);
  fs.writeFileSync(jarPath, "synthetic executable jar bytes");
  const jarSha256 = require("node:crypto").createHash("sha256").update(fs.readFileSync(jarPath)).digest("hex");
  const provenance = options.provenance ?? { kind: "committed", executionCommit: revision };
  const base = { schemaVersion: 2, serviceId: service.id, variant: service.variant, commit: revision, sourceProvenance: provenance };
  const common = (documentType) => ({ ...base, documentType });
  const executionState = options.executionState ?? "PASS";
  const policyState = options.policyState ?? (executionState === "PASS" ? "BLOCKED" : "NOT_EVALUATED");
  const files = {
    "run-summary.json": { ...common("run-summary"), workflow: "supply-chain", executionState, policyState, reviewState: "NOT_REQUIRED", deltaState: "NOT_APPLICABLE", failureCode: options.failureCode ?? (executionState === "PASS" ? "NONE" : "SBOM_BUILD_FAILED") },
    "vulnerability-inventory.json": { ...common("vulnerability-inventory"), findings: [] },
    "gitleaks-inventory.json": { ...common("gitleaks-inventory"), findings: [] },
    "container-vulnerability-inventory.json": { ...common("container-vulnerability-inventory"), findings: [] },
    "image-identity.json": { ...common("image-identity"), imageId: options.imageId ?? (executionState === "PASS" ? `sha256:${"1".repeat(64)}` : "unavailable"), imageReference: "auction-promax/auction-service:local", platform: "linux/amd64", jarSha256: options.jarSha256 ?? (executionState === "PASS" ? jarSha256 : "unavailable"), baseManifestDigest: "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" },
    "smoke-summary.json": { ...common("smoke-summary"), readiness: options.readiness ?? (executionState === "PASS" ? "UP" : "unavailable"), platform: "linux/amd64", runtimeUser: "10001:10001", readOnlyRootFilesystem: true, dropAllCapabilities: true, noNewPrivileges: true },
    "policy-summary.json": { ...common("policy-summary"), policyState, reviewState: "NOT_REQUIRED", deltaState: "NOT_APPLICABLE", counts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 } },
  };
  const evidenceDirectory = path.join(target, "service-evidence");
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  for (const [name, value] of Object.entries(files)) fs.writeFileSync(path.join(evidenceDirectory, name), JSON.stringify(value));
  for (const [name, value] of Object.entries(files)) {
    if (!evidenceSchemaValidator(value)) throw new Error(`schema rejected ${name}: ${JSON.stringify(evidenceSchemaValidator.errors)}`);
  }
  return { evidenceDirectory, jarSha256 };
}
function rejects(name, code, root, revision, mutate) {
  const directory = path.join(root, service.destination, "target", "service-evidence");
  if (mutate) {
    const file = path.join(directory, mutate.file);
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    Object.assign(value, mutate.fields);
    fs.writeFileSync(file, JSON.stringify(value));
  }
  assert.throws(() => validateServiceEvidence({ serviceId: service.id, commit: revision, directory }), { message: code }, name);
  process.stdout.write(`[PASS] ${name}\n`);
}

try {
  const committed = newRepository(true);
  const committedEvidence = makeEvidence(committed.root, committed.revision);
  const valid = validateServiceEvidence({ serviceId: service.id, commit: committed.revision, directory: committedEvidence.evidenceDirectory });
  assert.deepEqual(valid.files, ["container-vulnerability-inventory.json", "gitleaks-inventory.json", "image-identity.json", "policy-summary.json", "run-summary.json", "smoke-summary.json", "vulnerability-inventory.json"]);
  assert.equal(valid.sourceProvenance.kind, "committed");
  process.stdout.write("[PASS] Committed-source seven-file service evidence accepted with execution PASS and policy BLOCKED\n");

  const externalEvidenceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "apx-external-evidence-"));
  const previousWorkspace = process.env.GITHUB_WORKSPACE;
  try {
    fs.cpSync(committedEvidence.evidenceDirectory, externalEvidenceRoot, { recursive: true });
    process.env.GITHUB_WORKSPACE = committed.root;
    assert.equal(validateServiceEvidence({ serviceId: service.id, commit: committed.revision, directory: externalEvidenceRoot }).serviceId, service.id);
    process.stdout.write("[PASS] Evidence outside checkout resolves repository identity from GITHUB_WORKSPACE\n");
  } finally {
    if (previousWorkspace === undefined) delete process.env.GITHUB_WORKSPACE;
    else process.env.GITHUB_WORKSPACE = previousWorkspace;
    fs.rmSync(externalEvidenceRoot, { recursive: true, force: true });
  }

  const ephemeral = newRepository(false);
  const ephemeralProvenance = { kind: "ephemeral-generated", executionCommit: ephemeral.revision, generatorCommit: ephemeral.revision, serviceId: service.id };
  const ephemeralEvidence = makeEvidence(ephemeral.root, ephemeral.revision, { provenance: ephemeralProvenance, policyState: "PASS" });
  assert.equal(validateServiceEvidence({ serviceId: service.id, commit: ephemeral.revision, directory: ephemeralEvidence.evidenceDirectory }).sourceProvenance.kind, "ephemeral-generated");
  process.stdout.write("[PASS] Untracked generated source is explicitly bound to its generator revision\n");

  const deleted = newRepository(true);
  fs.rmSync(path.join(deleted.root, service.destination), { recursive: true, force: true });
  commit(deleted.root, "remove service source");
  write(deleted.root, "docs/unrelated.md", "unrelated change\n");
  const deletedRevision = commit(deleted.root, "unrelated follow-up");
  const deletedProvenance = { kind: "ephemeral-generated", executionCommit: deletedRevision, generatorCommit: deletedRevision, serviceId: service.id };
  const deletedEvidence = makeEvidence(deleted.root, deletedRevision, { provenance: deletedProvenance });
  rejects("Previously tracked deletion cannot be relabeled ephemeral", "SERVICE_SOURCE_REMOVED", deleted.root, deletedRevision);

  const wrongCommit = newRepository(true);
  const wrongCommitEvidence = makeEvidence(wrongCommit.root, wrongCommit.revision);
  rejects("Summary revision mismatch fails", "SERVICE_EVIDENCE_IDENTITY_MISMATCH", wrongCommit.root, "f".repeat(40));
  rejects("Wrong JAR digest fails", "SERVICE_EVIDENCE_ARTIFACT_MISMATCH", wrongCommit.root, wrongCommit.revision, { file: "image-identity.json", fields: { jarSha256: "0".repeat(64) } });
  rejects("Unavailable PASS image fails", "SERVICE_EVIDENCE_PASS_INCOMPLETE", wrongCommit.root, wrongCommit.revision, { file: "image-identity.json", fields: { imageId: "unavailable" } });
  rejects("Readiness failure cannot be hidden behind PASS", "SERVICE_EVIDENCE_PASS_INCOMPLETE", wrongCommit.root, wrongCommit.revision, { file: "smoke-summary.json", fields: { readiness: "unavailable" } });

  const failed = newRepository(true);
  const failedEvidence = makeEvidence(failed.root, failed.revision, { executionState: "IMPLEMENTATION_FAILURE" });
  assert.equal(validateServiceEvidence({ serviceId: service.id, commit: failed.revision, directory: failedEvidence.evidenceDirectory }).files.length, 7);
  process.stdout.write("[PASS] Failed execution may carry unavailable artifact/smoke evidence only with NOT_EVALUATED policy\n");
  const policyMismatch = newRepository(true);
  const policyMismatchEvidence = makeEvidence(policyMismatch.root, policyMismatch.revision, { executionState: "IMPLEMENTATION_FAILURE", policyState: "BLOCKED" });
  rejects("Policy BLOCKED cannot mask implementation failure", "SERVICE_EVIDENCE_STATE_INVALID", policyMismatch.root, policyMismatch.revision);

  const extraField = newRepository(true);
  const extraFieldEvidence = makeEvidence(extraField.root, extraField.revision);
  rejects("Unknown evidence fields fail closed", "SERVICE_EVIDENCE_FIELD_INVALID", extraField.root, extraField.revision, { file: "run-summary.json", fields: { unexpected: true } });

  const wrongDocumentType = newRepository(true);
  const wrongDocumentEvidence = makeEvidence(wrongDocumentType.root, wrongDocumentType.revision);
  rejects("File type discriminator must match its basename", "SERVICE_EVIDENCE_IDENTITY_MISMATCH", wrongDocumentType.root, wrongDocumentType.revision, { file: "image-identity.json", fields: { documentType: "smoke-summary" } });

  const mixedProvenance = newRepository(true);
  const mixedProvenanceEvidence = makeEvidence(mixedProvenance.root, mixedProvenance.revision);
  rejects("Mixed committed and ephemeral provenance fails", "SERVICE_EVIDENCE_IDENTITY_MISMATCH", mixedProvenance.root, mixedProvenance.revision, { file: "gitleaks-inventory.json", fields: { sourceProvenance: { kind: "ephemeral-generated", executionCommit: mixedProvenance.revision, generatorCommit: mixedProvenance.revision, serviceId: service.id } } });

  const missingFile = newRepository(true);
  const missingFileEvidence = makeEvidence(missingFile.root, missingFile.revision);
  fs.unlinkSync(path.join(missingFileEvidence.evidenceDirectory, "policy-summary.json"));
  rejects("Missing evidence summary fails", "SERVICE_EVIDENCE_FILESET_INVALID", missingFile.root, missingFile.revision);

  const extraFile = newRepository(true);
  const extraFileEvidence = makeEvidence(extraFile.root, extraFile.revision);
  fs.writeFileSync(path.join(extraFileEvidence.evidenceDirectory, "raw-report.json"), "{}");
  rejects("Raw or unexpected artifact files fail closed", "SERVICE_EVIDENCE_FILESET_INVALID", extraFile.root, extraFile.revision);

  process.stdout.write("SERVICE_SUPPLY_CHAIN_EVIDENCE_FIXTURES_PASS cases=15\n");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
