import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const ajvPath = path.join(repoRoot, "contracts/node_modules/ajv/dist/2020.js");
const schemaPath = path.join(repoRoot, "security/schemas/gitleaks-allowlist.schema.json");
const registryPath = path.join(repoRoot, "security/gitleaks-allowlist.json");

if (!fs.existsSync(ajvPath)) throw new Error("Pinned Ajv is missing; run npm ci in api/contracts before Cycle 4 registry tests.");
const { default: Ajv2020 } = await import(pathToFileURL(ajvPath).href);

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(label + " is missing.");
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); } catch { throw new Error(label + " is malformed JSON."); }
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function validEntry(scanMode = "dir") {
  return {
    id: "GL-FP-001",
    scanMode,
    ruleId: "fixture-rule",
    repositoryRelativePath: "fixtures/example.txt",
    scannerFingerprint: scanMode === "git" ? "a".repeat(40) + ":fixtures/example.txt:fixture-rule:1" : "fixtures/example.txt:fixture-rule:1",
    commitId: scanMode === "git" ? "a".repeat(40) : null,
    status: "false-positive",
    owner: "Repository Owner",
    rationale: "Synthetic schema-only false-positive fixture.",
    remediationReference: "TEST-GL-001",
    approvedBy: "Repository Owner",
    approvedAt: "2026-09-13T00:00:00Z",
    expiresAt: "2026-10-13T00:00:00Z"
  };
}

function assertResult(validate, name, mutate, expectedValid) {
  const candidate = clone(registry);
  mutate(candidate);
  const valid = validate(candidate);
  if (valid !== expectedValid) throw new Error(name + ": expected valid=" + expectedValid + ", got valid=" + valid + "; errors=" + JSON.stringify(validate.errors));
  process.stdout.write("[PASS] " + name + "\n");
}

function assertUniqueExactEntries(entries) {
  const seenIds = new Set();
  const seenMatches = new Set();
  for (const entry of entries) {
    if (seenIds.has(entry.id)) throw new Error("Duplicate Gitleaks false-positive ID: " + entry.id);
    seenIds.add(entry.id);
    const match = [entry.scanMode, entry.ruleId, entry.repositoryRelativePath, entry.scannerFingerprint, entry.commitId ?? ""].join("\u0000");
    if (seenMatches.has(match)) throw new Error("Duplicate Gitleaks exact match tuple.");
    seenMatches.add(match);
  }
}

const schema = readJson(schemaPath, "Gitleaks allowlist schema");
const registry = readJson(registryPath, "Gitleaks allowlist registry");
const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
if (!ajv.validateSchema(schema)) throw new Error("Gitleaks allowlist schema is invalid: " + JSON.stringify(ajv.errors));
const validate = ajv.compile(schema);

assertResult(validate, "Canonical empty false-positive registry accepted", () => {}, true);
assertResult(validate, "Valid exact directory false-positive accepted", (value) => { value.entries.push(validEntry("dir")); }, true);
assertResult(validate, "Valid exact Git false-positive accepted", (value) => { value.entries.push(validEntry("git")); }, true);
assertResult(validate, "Accepted-risk status rejected", (value) => { const entry = validEntry(); entry.status = "accepted-risk"; value.entries.push(entry); }, false);
assertResult(validate, "Absolute path rejected", (value) => { const entry = validEntry(); entry.repositoryRelativePath = "C:/secret.txt"; value.entries.push(entry); }, false);
assertResult(validate, "Traversal path rejected", (value) => { const entry = validEntry(); entry.repositoryRelativePath = "fixtures/../secret.txt"; value.entries.push(entry); }, false);
assertResult(validate, "Directory finding commit rejected", (value) => { const entry = validEntry(); entry.commitId = "a".repeat(40); value.entries.push(entry); }, false);
assertResult(validate, "Git finding missing commit rejected", (value) => { const entry = validEntry("git"); entry.commitId = null; value.entries.push(entry); }, false);
assertResult(validate, "Missing fingerprint rejected", (value) => { const entry = validEntry(); delete entry.scannerFingerprint; value.entries.push(entry); }, false);
assertResult(validate, "Missing approval rejected", (value) => { const entry = validEntry(); delete entry.approvedAt; value.entries.push(entry); }, false);
assertResult(validate, "Wildcard rule ID rejected", (value) => { const entry = validEntry(); entry.ruleId = "*"; value.entries.push(entry); }, false);

assertUniqueExactEntries([validEntry("dir")]);
process.stdout.write("[PASS] Unique exact entry accepted\n");
assertUniqueExactEntries(registry.entries);
process.stdout.write("[PASS] Canonical registry IDs and match tuples are unique\n");
try {
  assertUniqueExactEntries([validEntry("dir"), validEntry("dir")]);
  throw new Error("Duplicate exact entry was accepted.");
} catch (error) {
  if (!String(error.message).includes("Duplicate Gitleaks")) throw error;
  process.stdout.write("[PASS] Duplicate exact entry rejected\n");
}

process.stdout.write("Gitleaks false-positive registry schema tests: PASS\n");
