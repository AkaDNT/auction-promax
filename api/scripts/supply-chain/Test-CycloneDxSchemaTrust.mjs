import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const nodeModulesRoot = path.join(repoRoot, "contracts/node_modules/ajv/dist");
const ajv2020Path = path.join(nodeModulesRoot, "2020.js");
const ajvDraft07Path = path.join(nodeModulesRoot, "ajv.js");
if (!fs.existsSync(ajv2020Path) || !fs.existsSync(ajvDraft07Path)) {
  throw new Error("Pinned Ajv is missing; run npm ci in api/contracts before Cycle 2 schema trust tests.");
}

const { default: Ajv2020 } = await import(pathToFileURL(ajv2020Path).href);
const { default: Ajv } = await import(pathToFileURL(ajvDraft07Path).href);
const manifestPath = path.join(repoRoot, "security/tooling/cyclonedx-schemas.json");
const manifestSchemaPath = path.join(repoRoot, "security/schemas/cyclonedx-schemas.schema.json");
const schemaRoot = path.join(repoRoot, "security/schemas/cyclonedx/1.6");

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} is missing.`);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(`${label} is malformed JSON.`);
  }
}

function sha256(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertResult(validate, name, mutate, expectedValid) {
  const candidate = clone(manifest);
  mutate(candidate);
  const valid = validate(candidate);
  if (valid !== expectedValid) {
    const errors = (validate.errors ?? []).map(({ instancePath, keyword }) => ({ instancePath, keyword }));
    throw new Error(`${name}: expected valid=${expectedValid}, got valid=${valid}; errors=${JSON.stringify(errors)}`);
  }
  process.stdout.write(`[PASS] ${name}\n`);
}

function assertLocalSchemaResolution(schemas, name, expectedValid = true) {
  const candidateBomSchema = schemas.get("bom-1.6.schema.json");
  const candidateSpdxSchema = schemas.get("spdx.schema.json");
  const candidateJsfSchema = schemas.get("jsf-0.82.schema.json");
  let valid = false;
  try {
    if (!candidateBomSchema || !candidateSpdxSchema || !candidateJsfSchema) throw new Error("local trust set incomplete");
    const sbomAjv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
    sbomAjv.addSchema(candidateSpdxSchema);
    sbomAjv.addSchema(candidateJsfSchema);
    sbomAjv.compile(candidateBomSchema);
    valid = true;
  } catch {
    valid = false;
  }
  if (valid !== expectedValid) throw new Error(`${name}: expected local resolution valid=${expectedValid}, got valid=${valid}.`);
  process.stdout.write(`[PASS] ${name}\n`);
}

const manifestSchema = readJson(manifestSchemaPath, "CycloneDX schema trust manifest schema");
const manifest = readJson(manifestPath, "CycloneDX schema trust manifest");
const contractAjv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
if (!contractAjv.validateSchema(manifestSchema)) {
  throw new Error(`CycloneDX trust manifest schema is invalid: ${JSON.stringify(contractAjv.errors)}`);
}
const validateManifest = contractAjv.compile(manifestSchema);

assertResult(validateManifest, "Canonical CycloneDX schema trust manifest accepted", () => {}, true);
assertResult(validateManifest, "Wrong official source rejected", (value) => { value.officialSchemaBaseUrl = "https://example.invalid/schema"; }, false);
assertResult(validateManifest, "Placeholder checksum rejected", (value) => { value.assets[0].sha256 = "0".repeat(64); }, false);
assertResult(validateManifest, "Wrong root schema checksum rejected", (value) => { value.assets[0].sha256 = "a".repeat(64); }, false);
assertResult(validateManifest, "Schema asset order drift rejected", (value) => { [value.assets[0], value.assets[1]] = [value.assets[1], value.assets[0]]; }, false);
assertResult(validateManifest, "Extra schema asset rejected", (value) => { value.assets.push({ name: "extra.schema.json", sha256: "b".repeat(64) }); }, false);

const localSchemas = new Map();
for (const asset of manifest.assets) {
  const assetPath = path.join(schemaRoot, asset.name);
  const actual = sha256(assetPath);
  if (actual !== asset.sha256) throw new Error(`Vendored schema checksum mismatch: ${asset.name}.`);
  localSchemas.set(asset.name, readJson(assetPath, asset.name));
  process.stdout.write(`[PASS] Vendored schema checksum: ${asset.name}\n`);
}

const bomSchema = localSchemas.get("bom-1.6.schema.json");
if (bomSchema.$schema !== "http://json-schema.org/draft-07/schema#") {
  throw new Error("CycloneDX BOM schema must declare JSON Schema draft-07.");
}
assertLocalSchemaResolution(localSchemas, "Canonical CycloneDX schema trust set");
const missingSpdxSchemas = new Map(localSchemas);
missingSpdxSchemas.delete("spdx.schema.json");
assertLocalSchemaResolution(missingSpdxSchemas, "Missing SPDX schema", false);
const missingJsfSchemas = new Map(localSchemas);
missingJsfSchemas.delete("jsf-0.82.schema.json");
assertLocalSchemaResolution(missingJsfSchemas, "Missing JSF schema", false);
process.stdout.write("[PASS] CycloneDX BOM external references resolve from local trust set\n");
process.stdout.write("CycloneDX schema trust tests: PASS\n");
