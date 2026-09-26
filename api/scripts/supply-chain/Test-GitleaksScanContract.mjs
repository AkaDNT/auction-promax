import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const ajvPath = path.join(repoRoot, "contracts/node_modules/ajv/dist/2020.js");
const schemaPath = path.join(repoRoot, "security/schemas/gitleaks-scan-contract.schema.json");
const contractPath = path.join(repoRoot, "security/tooling/gitleaks-scan-contract.json");

if (!fs.existsSync(ajvPath)) {
  throw new Error("Pinned Ajv is missing; run npm ci in api/contracts before Cycle 4 contract tests.");
}

const { default: Ajv2020 } = await import(pathToFileURL(ajvPath).href);

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(label + " is missing.");
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(label + " is malformed JSON.");
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertResult(validate, name, mutate, expectedValid) {
  const candidate = clone(contract);
  mutate(candidate);
  const valid = validate(candidate);
  if (valid !== expectedValid) {
    const errors = (validate.errors ?? []).map(({ instancePath, keyword }) => ({ instancePath, keyword }));
    throw new Error(name + ": expected valid=" + expectedValid + ", got valid=" + valid + "; errors=" + JSON.stringify(errors));
  }
  process.stdout.write("[PASS] " + name + "\n");
}

const schema = readJson(schemaPath, "Gitleaks scan contract schema");
const contract = readJson(contractPath, "Gitleaks scan contract");
const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
if (!ajv.validateSchema(schema)) {
  throw new Error("Gitleaks scan contract schema is invalid: " + JSON.stringify(ajv.errors));
}
const validate = ajv.compile(schema);

assertResult(validate, "Canonical Gitleaks scan contract accepted", () => {}, true);
assertResult(validate, "Wrong scanner version rejected", (value) => { value.scanner.version = "8.30.1"; }, false);
assertResult(validate, "Global Gitleaks installation rejected", (value) => { value.scanner.installation = "global-path"; }, false);
assertResult(validate, "Unsafe working-tree enumeration rejected", (value) => { value.workingTree.candidateCommand = ["Get-ChildItem", "-Recurse"]; }, false);
assertResult(validate, "Persistent snapshot rejected", (value) => { value.workingTree.snapshot = "repository-cache"; }, false);
assertResult(validate, "Env-local read protection rejected", (value) => { value.workingTree.neverReadPaths = []; }, false);
assertResult(validate, "Missing directory scan rejected", (value) => { value.scans.splice(0, 1); }, false);
assertResult(validate, "Git history scan mode drift rejected", (value) => { value.scans[1].command = "dir"; }, false);
assertResult(validate, "Partial history rejected", (value) => { value.scans[1].arguments[1] = "--all"; }, false);
assertResult(validate, "Inline allow comment suppression rejected", (value) => { value.scans[0].arguments = value.scans[0].arguments.filter((argument) => argument !== "--ignore-gitleaks-allow"); }, false);
assertResult(validate, "Partial redaction rejected", (value) => { value.scans[0].arguments[5] = "--redact=20"; }, false);
assertResult(validate, "Standard finding exit code rejected", (value) => { value.scans[0].arguments[11] = "1"; }, false);
assertResult(validate, "Missing scanner timeout rejected", (value) => { value.scans[0].arguments.splice(-2, 2); }, false);
assertResult(validate, "Unbounded scanner timeout rejected", (value) => { value.scans[1].arguments[value.scans[1].arguments.length - 1] = "0"; }, false);
assertResult(validate, "Raw report retention rejected", (value) => { value.reportHandling.rawReports = "uploaded"; }, false);
assertResult(validate, "Sensitive inventory field rejected", (value) => { value.reportHandling.sanitizedInventoryFields.push("Secret"); }, false);
assertResult(validate, "Policy bypass rejected", (value) => { value.policy.mustRun = false; }, false);
assertResult(validate, "Accepted-risk secret disposition rejected", (value) => { value.policy.realSecretDisposition = "accepted-risk"; }, false);

process.stdout.write("Gitleaks scan execution contract tests: PASS\n");
