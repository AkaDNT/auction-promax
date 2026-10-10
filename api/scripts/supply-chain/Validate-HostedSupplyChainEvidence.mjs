import fs from "node:fs";
import path from "node:path";

const allowedFiles = new Set([
  "run-summary.json", "vulnerability-inventory.json", "gitleaks-inventory.json", "container-vulnerability-inventory.json",
  "image-identity.json", "smoke-summary.json", "policy-summary.json"
]);
const forbiddenKeys = new Set(["Secret", "Match", "Line", "Description", "PrimaryURL", "References"]);
const vulnerabilityFindingFields = new Set([
  "scanner", "findingId", "source", "targetType", "target", "package/component",
  "affectedVersion", "fixedVersion", "severity", "severitySource", "status", "dispositionId"
]);
const gitleaksFindingFields = new Set([
  "scanMode", "ruleId", "repositoryRelativePath", "scannerFingerprint", "commitId", "status", "remediationReference"
]);
const safeString = (value) => typeof value !== "string" || (!path.isAbsolute(value) && !/^[A-Za-z]:[\\/]/.test(value) && !/(-----BEGIN|ghp_|github_pat_|AKIA)/.test(value));

function fail(code) { throw new Error(code); }
function validateValue(value) {
  if (typeof value === "string") { if (!safeString(value)) fail("HOSTED_EVIDENCE_UNSANITIZED"); return; }
  if (Array.isArray(value)) { value.forEach(validateValue); return; }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) { if (forbiddenKeys.has(key)) fail("HOSTED_EVIDENCE_UNSANITIZED"); validateValue(nested); }
  }
}
function readJson(file) {
  let value; try { value = JSON.parse(fs.readFileSync(file, "utf8")); } catch { fail("HOSTED_EVIDENCE_JSON_INVALID"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("HOSTED_EVIDENCE_JSON_INVALID");
  validateValue(value); return value;
}
function validateFindings(evidence, fields) {
  if (!Array.isArray(evidence.findings)) fail("HOSTED_EVIDENCE_FINDINGS_INVALID");
  for (const finding of evidence.findings) {
    if (!finding || typeof finding !== "object" || Array.isArray(finding)) fail("HOSTED_EVIDENCE_FINDINGS_INVALID");
    const keys = Object.keys(finding);
    if (keys.length !== fields.size || keys.some((key) => !fields.has(key))) fail("HOSTED_EVIDENCE_FINDING_FIELD_INVALID");
  }
}
function validateEvidenceRoot(root, commit) {
  if (!/^[a-f0-9]{40}$/.test(commit)) fail("HOSTED_EVIDENCE_COMMIT_INVALID");
  let entries; try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { fail("HOSTED_EVIDENCE_ROOT_MISSING"); }
  if (entries.length !== allowedFiles.size) fail("HOSTED_EVIDENCE_FILESET_INVALID");
  for (const entry of entries) {
    if (!entry.isFile() || entry.isSymbolicLink() || !allowedFiles.has(entry.name)) fail("HOSTED_EVIDENCE_FILESET_INVALID");
    const evidence = readJson(path.join(root, entry.name));
    if (evidence.commit !== commit) fail("HOSTED_EVIDENCE_COMMIT_MISMATCH");
    const allowed = entry.name === "run-summary.json"
      ? new Set(["schemaVersion", "workflow", "commit", "executionState", "policyState", "reviewState", "deltaState", "failureCode"])
      : new Set(["schemaVersion", "commit", "findings", "counts", "dispositions", "imageId", "imageReference", "platform", "jarSha256", "baseManifestDigest", "readiness", "runtimeUser", "readOnlyRootFilesystem", "dropAllCapabilities", "noNewPrivileges", "policyState", "reviewState", "deltaState"]);
    if (Object.keys(evidence).some((key) => !allowed.has(key))) fail("HOSTED_EVIDENCE_FIELD_INVALID");
    if (entry.name === "vulnerability-inventory.json" || entry.name === "container-vulnerability-inventory.json") validateFindings(evidence, vulnerabilityFindingFields);
    if (entry.name === "gitleaks-inventory.json") validateFindings(evidence, gitleaksFindingFields);
  }
  const summary = readJson(path.join(root, "run-summary.json"));
  const required = ["schemaVersion","workflow","commit","executionState","policyState","reviewState","deltaState","failureCode"];
  if (Object.keys(summary).length !== required.length || required.some((key) => !(key in summary))) fail("HOSTED_EVIDENCE_SUMMARY_INVALID");
  return { files: [...allowedFiles].sort(), commit };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const [root, commit] = process.argv.slice(2);
  if (!root || !commit) fail("HOSTED_EVIDENCE_ARGUMENT_INVALID");
  process.stdout.write(`${JSON.stringify(validateEvidenceRoot(root, commit))}\n`);
}

export { validateEvidenceRoot, allowedFiles };
