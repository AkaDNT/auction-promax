import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const ajvPath = path.join(repoRoot, "contracts/node_modules/ajv/dist/2020.js");
if (!fs.existsSync(ajvPath)) {
  throw new Error("Pinned Ajv is missing; run npm ci in api/contracts before Cycle 1 schema tests.");
}
const { default: Ajv2020 } = await import(pathToFileURL(ajvPath).href);
const schemaPath = path.join(repoRoot, "security/schemas/supply-chain-tools.schema.json");
const manifestPath = path.join(repoRoot, "security/tooling/supply-chain-tools.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertSchemaResult(validate, name, mutate, expectedValid) {
  const candidate = clone(canonicalManifest);
  mutate(candidate);
  const actualValid = validate(candidate);
  if (actualValid !== expectedValid) {
    const errors = (validate.errors ?? []).map(({ instancePath, keyword }) => ({ instancePath, keyword }));
    throw new Error(`${name}: expected valid=${expectedValid}, got valid=${actualValid}; errors=${JSON.stringify(errors)}`);
  }
  process.stdout.write(`[PASS] ${name}\n`);
}

const schema = readJson(schemaPath);
const canonicalManifest = readJson(manifestPath);
const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
if (!ajv.validateSchema(schema)) {
  throw new Error(`Supply-chain schema is invalid: ${JSON.stringify(ajv.errors)}`);
}
const validate = ajv.compile(schema);

assertSchemaResult(validate, "Canonical manifest accepted by JSON Schema", () => {}, true);
assertSchemaResult(validate, "Gitleaks 8.30.1 rejected by JSON Schema", (m) => { m.tools[1].version = "8.30.1"; }, false);
assertSchemaResult(validate, "Placeholder SHA-256 rejected by JSON Schema", (m) => { m.tools[0].platforms["windows-x64"].sha256 = "0".repeat(64); }, false);
assertSchemaResult(validate, "Duplicate tool identity rejected by JSON Schema", (m) => { m.tools[1].name = "trivy"; }, false);
assertSchemaResult(validate, "Wrong Gitleaks release repository rejected by JSON Schema", (m) => { m.tools[1].officialReleaseBaseUrl = "https://github.com/evilcorp/evil/releases/download/v8.30.0"; }, false);
assertSchemaResult(validate, "Missing Cosign purpose rejected by JSON Schema", (m) => { delete m.tools[2].purpose; }, false);
assertSchemaResult(validate, "Trivy purpose rejected by JSON Schema", (m) => { m.tools[0].purpose = "release-provenance"; }, false);
assertSchemaResult(validate, "Missing Trivy Sigstore metadata rejected by JSON Schema", (m) => { delete m.tools[0].sigstore; }, false);
assertSchemaResult(validate, "Gitleaks Sigstore metadata rejected by JSON Schema", (m) => { m.tools[1].sigstore = clone(m.tools[0].sigstore); }, false);
assertSchemaResult(validate, "Wrong Sigstore bundle suffix rejected by JSON Schema", (m) => { m.tools[0].sigstore.bundleAssetSuffix = ".foo"; }, false);
assertSchemaResult(validate, "Wrong Sigstore certificate identity rejected by JSON Schema", (m) => { m.tools[0].sigstore.certificateIdentity = "https://github.com/other/repo/.github/workflows/release.yml@refs/tags/v9.9.9"; }, false);
assertSchemaResult(validate, "Wrong version command rejected by JSON Schema", (m) => { m.tools[1].versionArguments = ["nonsense"]; }, false);
assertSchemaResult(validate, "Permissive version pattern rejected by JSON Schema", (m) => { m.tools[1].versionPattern = "."; }, false);
assertSchemaResult(validate, "Partial-match Trivy version pattern rejected by JSON Schema", (m) => { m.tools[0].versionPattern = "Version: 0\\.74\\.0"; }, false);
assertSchemaResult(validate, "Partial-match Gitleaks version pattern rejected by JSON Schema", (m) => { m.tools[1].versionPattern = "^8\\.30\\.0"; }, false);
assertSchemaResult(validate, "Partial-match Cosign version pattern rejected by JSON Schema", (m) => { m.tools[2].versionPattern = "GitVersion:\\s*v3\\.1\\.2"; }, false);
assertSchemaResult(validate, "Wrong Trivy archive mapping rejected by JSON Schema", (m) => { m.tools[0].platforms["windows-x64"].archiveType = "binary"; }, false);
assertSchemaResult(validate, "Tool order drift rejected by JSON Schema", (m) => { [m.tools[0], m.tools[1]] = [m.tools[1], m.tools[0]]; }, false);

process.stdout.write("Supply-chain JSON Schema contract tests: PASS\n");
