import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

class ValidationFailure extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const repoRoot = path.resolve(import.meta.dirname, "../..");
const ajvRoot = path.join(repoRoot, "contracts/node_modules/ajv/dist");
const ajv2020Path = path.join(ajvRoot, "2020.js");
const ajvDraft07Path = path.join(ajvRoot, "ajv.js");
const trustManifestSchemaPath = path.join(repoRoot, "security/schemas/cyclonedx-schemas.schema.json");

function fail(code) {
  throw new ValidationFailure(code);
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value || values.has(key)) fail("INVALID_ARGUMENTS");
    values.set(key, value);
  }
  for (const required of ["--bom", "--schema-root", "--trust-manifest"]) {
    if (!values.has(required)) fail("MISSING_REQUIRED_ARGUMENT");
  }
  for (const key of values.keys()) {
    if (!new Set(["--bom", "--schema-root", "--trust-manifest", "--reference-bom"]).has(key)) fail("UNSUPPORTED_ARGUMENT");
  }
  return {
    bomPath: path.resolve(values.get("--bom")),
    schemaRoot: path.resolve(values.get("--schema-root")),
    trustManifestPath: path.resolve(values.get("--trust-manifest")),
    referenceBomPath: values.has("--reference-bom") ? path.resolve(values.get("--reference-bom")) : undefined,
  };
}

function readJson(filePath, missingCode, malformedCode) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile() || fs.statSync(filePath).size === 0) {
    fail(missingCode);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    fail(malformedCode);
  }
}

function sha256(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

async function loadAjv() {
  if (!fs.existsSync(ajv2020Path) || !fs.existsSync(ajvDraft07Path)) fail("AJV_NOT_INSTALLED");
  const { default: Ajv2020 } = await import(pathToFileURL(ajv2020Path).href);
  const { default: Ajv } = await import(pathToFileURL(ajvDraft07Path).href);
  return { Ajv2020, Ajv };
}

function validateTrustManifest(Ajv2020, manifestPath) {
  const contract = readJson(trustManifestSchemaPath, "TRUST_MANIFEST_SCHEMA_MISSING", "TRUST_MANIFEST_SCHEMA_MALFORMED");
  const manifest = readJson(manifestPath, "TRUST_MANIFEST_MISSING", "TRUST_MANIFEST_MALFORMED");
  const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
  try {
    if (!ajv.validateSchema(contract)) fail("TRUST_MANIFEST_SCHEMA_INVALID");
    const validate = ajv.compile(contract);
    if (!validate(manifest)) fail("TRUST_MANIFEST_INVALID");
  } catch (error) {
    if (error instanceof ValidationFailure) throw error;
    fail("TRUST_MANIFEST_SCHEMA_INVALID");
  }
  return manifest;
}

function loadTrustedSchemas(manifest, schemaRoot) {
  if (!fs.existsSync(schemaRoot) || !fs.statSync(schemaRoot).isDirectory()) fail("SCHEMA_ROOT_MISSING");
  const schemas = new Map();
  for (const asset of manifest.assets) {
    const assetPath = path.join(schemaRoot, asset.name);
    if (path.dirname(assetPath) !== schemaRoot) fail("SCHEMA_ASSET_NAME_UNSAFE");
    if (!fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) fail("REFERENCED_SCHEMA_MISSING");
    if (sha256(assetPath) !== asset.sha256) fail("SCHEMA_CHECKSUM_MISMATCH");
    schemas.set(asset.name, readJson(assetPath, "REFERENCED_SCHEMA_MISSING", "REFERENCED_SCHEMA_MALFORMED"));
  }
  return schemas;
}

function compileCycloneDxSchema(Ajv, schemas) {
  const bomSchema = schemas.get("bom-1.6.schema.json");
  const spdxSchema = schemas.get("spdx.schema.json");
  const jsfSchema = schemas.get("jsf-0.82.schema.json");
  if (!bomSchema || !spdxSchema || !jsfSchema) fail("REFERENCED_SCHEMA_MISSING");
  if (bomSchema.$schema !== "http://json-schema.org/draft-07/schema#") fail("UNEXPECTED_SBOM_SCHEMA_DRAFT");
  try {
    const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
    ajv.addSchema(spdxSchema);
    ajv.addSchema(jsfSchema);
    return ajv.compile(bomSchema);
  } catch {
    fail("LOCAL_SCHEMA_RESOLUTION_FAILED");
  }
}

function requireExact(value, expected, code) {
  if (value !== expected) fail(code);
}

function requireNonEmptyArray(value, code) {
  if (!Array.isArray(value) || value.length === 0) fail(code);
}

function assertUnique(values, code) {
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0 || seen.has(value)) fail(code);
    seen.add(value);
  }
}

function validateIdentitySemantics(bom) {
  requireExact(bom.bomFormat, "CycloneDX", "INVALID_BOM_FORMAT");
  requireExact(bom.specVersion, "1.6", "INVALID_SPEC_VERSION");
  const root = bom.metadata?.component;
  if (!root || typeof root !== "object") fail("ROOT_COMPONENT_MISSING");
  requireExact(root.type, "application", "ROOT_COMPONENT_TYPE_INVALID");
  requireExact(root.group, "com.auctionpromax", "ROOT_COMPONENT_GROUP_INVALID");
  requireExact(root.name, "identity-profile-service", "ROOT_COMPONENT_NAME_INVALID");
  requireExact(root.version, "0.0.1-SNAPSHOT", "ROOT_COMPONENT_VERSION_INVALID");
  if (typeof root["bom-ref"] !== "string" || root["bom-ref"].length === 0) fail("ROOT_COMPONENT_REFERENCE_MISSING");

  requireNonEmptyArray(bom.components, "COMPONENT_INVENTORY_EMPTY");
  requireNonEmptyArray(bom.dependencies, "DEPENDENCY_GRAPH_EMPTY");
  assertUnique(bom.components.map((component) => component?.["bom-ref"]), "DUPLICATE_COMPONENT_REFERENCE");
  assertUnique(bom.dependencies.map((dependency) => dependency?.ref), "DUPLICATE_DEPENDENCY_REFERENCE");
  if (!bom.dependencies.some((dependency) => dependency.ref === root["bom-ref"])) fail("ROOT_DEPENDENCY_MISSING");
  const knownReferences = new Set([root["bom-ref"], ...bom.components.map((component) => component["bom-ref"])]);
  for (const dependency of bom.dependencies) {
    if (!knownReferences.has(dependency.ref)) fail("DEPENDENCY_REFERENCE_UNKNOWN");
    for (const reference of dependency.dependsOn ?? []) {
      if (!knownReferences.has(reference)) fail("DEPENDENCY_EDGE_REFERENCE_UNKNOWN");
    }
  }

  const testOnlyCoordinates = new Set([
    "org.junit.jupiter:junit-jupiter",
    "org.testcontainers:junit-jupiter",
    "org.testcontainers:postgresql",
    "com.tngtech.archunit:archunit-junit5"
  ]);
  for (const component of bom.components) {
    if (testOnlyCoordinates.has(`${component?.group}:${component?.name}`)) fail("TEST_SCOPE_COMPONENT_PRESENT");
  }
}

function normalize(value, key = "", isBomRoot = false) {
  if (Array.isArray(value)) {
    const normalized = value.map((entry) => normalize(entry));
    if (["components", "dependencies", "dependsOn"].includes(key)) {
      normalized.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    }
    return normalized;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((property) => !((isBomRoot && property === "serialNumber") || (key === "metadata" && property === "timestamp")))
        .sort()
        .map((property) => [property, normalize(value[property], property)])
    );
  }
  return value;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const { Ajv2020, Ajv } = await loadAjv();
  const trustManifest = validateTrustManifest(Ajv2020, args.trustManifestPath);
  const schemas = loadTrustedSchemas(trustManifest, args.schemaRoot);
  const validateSchema = compileCycloneDxSchema(Ajv, schemas);
  const bom = readJson(args.bomPath, "SBOM_MISSING_OR_EMPTY", "SBOM_MALFORMED");
  if (!validateSchema(bom)) fail("SBOM_SCHEMA_VALIDATION_FAILED");
  validateIdentitySemantics(bom);

  if (args.referenceBomPath) {
    const reference = readJson(args.referenceBomPath, "REFERENCE_SBOM_MISSING_OR_EMPTY", "REFERENCE_SBOM_MALFORMED");
    if (!validateSchema(reference)) fail("REFERENCE_SBOM_SCHEMA_VALIDATION_FAILED");
    validateIdentitySemantics(reference);
    if (JSON.stringify(normalize(bom, "", true)) !== JSON.stringify(normalize(reference, "", true))) fail("SBOM_SEMANTIC_REPRODUCIBILITY_FAILED");
  }

  process.stdout.write(`Identity SBOM validation: PASS (components=${bom.components.length}, dependencies=${bom.dependencies.length})\n`);
}

try {
  await main();
} catch (error) {
  const code = error instanceof ValidationFailure ? error.code : "UNEXPECTED_VALIDATION_FAILURE";
  process.stderr.write(`Identity SBOM validation: FAIL (${code})\n`);
  process.exitCode = 1;
}
