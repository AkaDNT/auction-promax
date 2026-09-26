import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const ajvPath = path.join(repoRoot, "contracts/node_modules/ajv/dist/2020.js");
const schemaPath = path.join(repoRoot, "security/schemas/container-image-contract.schema.json");
const contractPath = path.join(repoRoot, "security/tooling/container-image-contract.json");

if (!fs.existsSync(ajvPath)) throw new Error("Pinned Ajv is missing; run npm ci in api/contracts before Cycle 5 contract tests.");
const { default: Ajv2020 } = await import(pathToFileURL(ajvPath).href);

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} is missing.`);
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { throw new Error(`${label} is malformed JSON.`); }
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function assertResult(validate, name, mutate, expectedValid) {
  const candidate = clone(contract);
  mutate(candidate);
  const valid = validate(candidate);
  if (valid !== expectedValid) {
    const errors = (validate.errors ?? []).map(({ instancePath, keyword }) => ({ instancePath, keyword }));
    throw new Error(`${name}: expected valid=${expectedValid}, got valid=${valid}; errors=${JSON.stringify(errors)}`);
  }
  process.stdout.write(`[PASS] ${name}\n`);
}

const schema = readJson(schemaPath, "Container image execution schema");
const contract = readJson(contractPath, "Container image execution contract");
const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
if (!ajv.validateSchema(schema)) throw new Error(`Container image execution schema is invalid: ${JSON.stringify(ajv.errors)}`);
const validate = ajv.compile(schema);

assertResult(validate, "Canonical container image contract accepted", () => {}, true);
assertResult(validate, "Mutable local image tag rejected", (value) => { value.image.localReference = "auction-promax/identity-profile-service:latest"; }, false);
assertResult(validate, "Non-amd64 build platform rejected", (value) => { value.image.platform = "linux/arm64"; }, false);
assertResult(validate, "Docker Maven build rejected", (value) => { value.build.mavenBuildLocation = "inside-docker"; }, false);
assertResult(validate, "Docker dependency resolution rejected", (value) => { value.build.dependencyResolution = "allowed-in-docker"; }, false);
assertResult(validate, "Docker credentials rejected", (value) => { value.build.credentials = "allowed-in-docker"; }, false);
assertResult(validate, "Root runtime rejected", (value) => { value.runtime.user = "root"; }, false);
assertResult(validate, "Wrong container port rejected", (value) => { value.runtime.exposedPort = "80/tcp"; }, false);
assertResult(validate, "Shell entrypoint rejected", (value) => { value.runtime.entrypoint = ["sh", "-c", "java -jar /app/app.jar"]; }, false);
assertResult(validate, "Docker healthcheck rejected", (value) => { value.runtime.healthcheck = "required"; }, false);
assertResult(validate, "Production profile smoke rejected", (value) => { value.technicalSmoke.profile = "default"; }, false);
assertResult(validate, "Public smoke binding rejected", (value) => { value.technicalSmoke.loopbackOnly = false; }, false);
assertResult(validate, "Writable root filesystem rejected", (value) => { value.technicalSmoke.readOnlyRootFilesystem = false; }, false);
assertResult(validate, "Capability retention rejected", (value) => { value.technicalSmoke.dropAllCapabilities = false; }, false);
assertResult(validate, "Image source fallback rejected", (value) => { value.scan.arguments = ["--scanners", "vuln", "--format", "json"]; }, false);
assertResult(validate, "Database freshness contract bypass rejected", (value) => { value.scan.databaseContractRelativePath = ""; }, false);
assertResult(validate, "Severity filtering rejected", (value) => { value.scan.arguments.splice(2, 0, "--severity", "HIGH,CRITICAL"); }, false);
assertResult(validate, "Ignore unfixed rejected", (value) => { value.policy.ignoreUnfixed = true; }, false);
assertResult(validate, "Missing Java detection rejected", (value) => { value.scan.requiredDetections = ["os"]; }, false);
assertResult(validate, "Raw report retention rejected", (value) => { value.evidence.rawReports = "committed"; }, false);
assertResult(validate, "Policy bypass rejected", (value) => { value.policy.mustRun = false; }, false);
assertResult(validate, "Unexpected property rejected", (value) => { value.runtime.userName = "application"; }, false);

process.stdout.write("Container image execution contract tests: PASS\n");
