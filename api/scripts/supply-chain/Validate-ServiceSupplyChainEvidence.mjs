import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

export const serviceEvidenceFiles = Object.freeze([
  "container-vulnerability-inventory.json",
  "gitleaks-inventory.json",
  "image-identity.json",
  "policy-summary.json",
  "run-summary.json",
  "smoke-summary.json",
  "vulnerability-inventory.json",
]);
const serviceEvidenceFileSet = new Set(serviceEvidenceFiles);
const forbiddenKeys = new Set(["Secret", "Match", "Line", "Description", "PrimaryURL", "References"]);
const vulnerabilityFields = new Set([
  "scanner", "findingId", "source", "targetType", "target", "package/component", "affectedVersion",
  "fixedVersion", "severity", "severitySource", "status", "dispositionId",
]);
const gitleaksFields = new Set([
  "scanMode", "ruleId", "repositoryRelativePath", "scannerFingerprint", "commitId", "status", "remediationReference",
]);
const commonFields = ["schemaVersion", "serviceId", "variant", "commit", "sourceProvenance", "documentType"];
const documentTypes = new Map(serviceEvidenceFiles.map((name) => [name, name.replace(/\.json$/, "")]));
const fileSpecificFields = new Map([
  ["run-summary.json", ["workflow", "executionState", "policyState", "reviewState", "deltaState", "failureCode"]],
  ["vulnerability-inventory.json", ["findings"]],
  ["gitleaks-inventory.json", ["findings"]],
  ["container-vulnerability-inventory.json", ["findings"]],
  ["image-identity.json", ["imageId", "imageReference", "platform", "jarSha256", "baseManifestDigest"]],
  ["smoke-summary.json", ["readiness", "platform", "runtimeUser", "readOnlyRootFilesystem", "dropAllCapabilities", "noNewPrivileges"]],
  ["policy-summary.json", ["policyState", "reviewState", "deltaState", "counts"]],
]);

function fail(code) { throw new Error(code); }
function exactKeys(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) fail(code);
}
function validateSafeValues(value) {
  if (typeof value === "string") {
    if (path.isAbsolute(value) || /^[A-Za-z]:[\\/]/.test(value) || /(-----BEGIN|ghp_|github_pat_|AKIA)/.test(value)) fail("SERVICE_EVIDENCE_UNSANITIZED");
    return;
  }
  if (Array.isArray(value)) { value.forEach(validateSafeValues); return; }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (forbiddenKeys.has(key)) fail("SERVICE_EVIDENCE_UNSANITIZED");
      validateSafeValues(nested);
    }
  }
}
function readJson(file) {
  let value;
  try { value = JSON.parse(fs.readFileSync(file, "utf8")); } catch { fail("SERVICE_EVIDENCE_JSON_INVALID"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("SERVICE_EVIDENCE_JSON_INVALID");
  validateSafeValues(value);
  return value;
}
function findRepositoryRoot(start) {
  const candidates = [start, process.env.GITHUB_WORKSPACE, process.cwd()].filter((value) => typeof value === "string" && value.length > 0);
  for (const candidate of candidates) {
    let current;
    try { current = fs.realpathSync(candidate); } catch { continue; }
    for (;;) {
      try {
        const result = execFileSync("git", ["-C", current, "rev-parse", "--show-toplevel"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
        return fs.realpathSync(result);
      } catch {
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
      }
    }
  }
  fail("SERVICE_EVIDENCE_REPOSITORY_INVALID");
}
function git(root, args, code) {
  try { return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { fail(code); }
}
function trackedServiceFiles(root, commit, repoRelativeServicePath) {
  const output = git(root, ["ls-tree", "-r", "--name-only", commit, "--", repoRelativeServicePath], "SERVICE_EVIDENCE_GIT_TREE_INVALID");
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}
function validateSourceProvenance(root, commit, service, provenance) {
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) fail("SERVICE_EVIDENCE_PROVENANCE_INVALID");
  const tracked = trackedServiceFiles(root, commit, service.destination);
  const historicalAdditions = git(root, ["log", commit, "--diff-filter=A", "--format=%H", "--", service.destination], "SERVICE_EVIDENCE_GIT_REVISION_INVALID");
  if (tracked.length === 0 && historicalAdditions.length > 0) fail("SERVICE_SOURCE_REMOVED");

  if (provenance.kind === "committed") {
    exactKeys(provenance, ["kind", "executionCommit"], "SERVICE_EVIDENCE_PROVENANCE_INVALID");
    if (provenance.executionCommit !== commit || tracked.length === 0) fail("SERVICE_EVIDENCE_PROVENANCE_INVALID");
  } else if (provenance.kind === "ephemeral-generated") {
    exactKeys(provenance, ["kind", "executionCommit", "generatorCommit", "serviceId"], "SERVICE_EVIDENCE_PROVENANCE_INVALID");
    if (provenance.executionCommit !== commit || provenance.generatorCommit !== commit || provenance.serviceId !== service.id || tracked.length !== 0) fail("SERVICE_EVIDENCE_PROVENANCE_INVALID");
  } else {
    fail("SERVICE_EVIDENCE_PROVENANCE_INVALID");
  }
}
function validateFindingList(value, allowed, code) {
  if (!Array.isArray(value)) fail(code);
  for (const finding of value) exactKeys(finding, allowed, "SERVICE_EVIDENCE_FINDING_INVALID");
}
function parsePomProjectCoordinates(pom) {
  if (typeof pom !== "string" || pom.length > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(pom)) throw new Error("invalid POM XML");
  const document = { children: [] };
  const stack = [];
  const appendText = (value) => {
    if (stack.length) stack.at(-1).text += value;
    else if (value.trim() !== "") throw new Error("text outside project");
  };
  let offset = 0;
  while (offset < pom.length) {
    const start = pom.indexOf("<", offset);
    if (start < 0) { appendText(pom.slice(offset)); break; }
    appendText(pom.slice(offset, start));
    if (pom.startsWith("<!--", start)) {
      const end = pom.indexOf("-->", start + 4);
      if (end < 0) throw new Error("unterminated XML comment");
      offset = end + 3;
      continue;
    }
    if (pom.startsWith("<![CDATA[", start)) {
      if (!stack.length) throw new Error("CDATA outside project");
      const end = pom.indexOf("]]>", start + 9);
      if (end < 0) throw new Error("unterminated CDATA");
      stack.at(-1).text += pom.slice(start + 9, end);
      offset = end + 3;
      continue;
    }
    if (pom.startsWith("<?", start)) {
      const end = pom.indexOf("?>", start + 2);
      if (end < 0) throw new Error("unterminated processing instruction");
      offset = end + 2;
      continue;
    }
    if (pom.startsWith("<!", start)) throw new Error("unsupported XML declaration");

    let end = start + 1;
    let quote = null;
    for (; end < pom.length; end += 1) {
      const character = pom[end];
      if (quote) { if (character === quote) quote = null; }
      else if (character === "\"" || character === "'") quote = character;
      else if (character === ">") break;
    }
    if (end >= pom.length || quote) throw new Error("unterminated XML tag");
    const raw = pom.slice(start + 1, end).trim();
    if (raw.startsWith("/")) {
      const closingName = raw.slice(1).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(closingName) || stack.at(-1)?.name !== closingName) throw new Error("mismatched XML close tag");
      stack.pop();
    } else {
      const match = raw.match(/^([A-Za-z_][A-Za-z0-9_.:-]*)([\s\S]*)$/);
      if (!match) throw new Error("invalid XML element");
      let attributes = match[2].trim();
      const parsedAttributes = new Map();
      const selfClosing = attributes.endsWith("/");
      if (selfClosing) attributes = attributes.slice(0, -1).trim();
      while (attributes.length) {
        const attribute = attributes.match(/^([A-Za-z_][A-Za-z0-9_.:-]*)\s*=\s*(["'])(.*?)\2\s*/s);
        if (!attribute || attribute[3].includes("<")) throw new Error("invalid XML attribute");
        if (parsedAttributes.has(attribute[1])) throw new Error("duplicate XML attribute");
        parsedAttributes.set(attribute[1], attribute[3]);
        attributes = attributes.slice(attribute[0].length);
      }
      const node = { name: match[1], attributes: parsedAttributes, text: "", children: [] };
      const parent = stack.at(-1) ?? document;
      parent.children.push(node);
      if (!selfClosing) stack.push(node);
    }
    offset = end + 1;
  }
  if (stack.length !== 0 || document.children.length !== 1) throw new Error("invalid POM document root");
  const project = document.children[0];
  if (project.name !== "project" || project.attributes.get("xmlns") !== "http://maven.apache.org/POM/4.0.0") throw new Error("POM root namespace is not Maven");
  const readCoordinate = (localName) => {
    const matches = project.children.filter((child) => child.name === localName);
    if (matches.length !== 1 || matches[0].children.length !== 0) throw new Error("invalid project coordinate");
    const coordinateNamespace = matches[0].attributes.get("xmlns");
    if (coordinateNamespace !== undefined && coordinateNamespace !== "http://maven.apache.org/POM/4.0.0") throw new Error("project coordinate has foreign namespace");
    const value = matches[0].text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_entity, token) => {
      if (token === "amp") return "&";
      if (token === "lt") return "<";
      if (token === "gt") return ">";
      if (token === "quot") return "\"";
      if (token === "apos") return "'";
      const codePoint = token.startsWith("#x") ? Number.parseInt(token.slice(2), 16) : Number.parseInt(token.slice(1), 10);
      if (!Number.isInteger(codePoint) || codePoint < 0x20 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) throw new Error("invalid XML character reference");
      return String.fromCodePoint(codePoint);
    }).trim();
    if (!value || value.includes("&")) throw new Error("invalid project coordinate value");
    return value;
  };
  return { groupId: readCoordinate("groupId"), artifactId: readCoordinate("artifactId"), version: readCoordinate("version") };
}
function validateArtifactBinding(root, service, imageEvidence, requireComplete) {
  const apiRoot = path.join(root, "api");
  const project = path.join(apiRoot, "services", service.id);
  const pomPath = path.join(project, "pom.xml");
  const jarPath = path.join(project, "target", `${service.artifactId}-${service.version}.jar`);
  if (fs.existsSync(pomPath)) {
    let pom;
    try { pom = fs.readFileSync(pomPath, "utf8"); } catch { fail("SERVICE_EVIDENCE_ARTIFACT_MISMATCH"); }
    let coordinates;
    try { coordinates = parsePomProjectCoordinates(pom); } catch { fail("SERVICE_EVIDENCE_ARTIFACT_MISMATCH"); }
    if (coordinates.groupId !== service.groupId || coordinates.artifactId !== service.artifactId
      || coordinates.version !== service.version) fail("SERVICE_EVIDENCE_ARTIFACT_MISMATCH");
  } else if (requireComplete) {
    fail("SERVICE_EVIDENCE_ARTIFACT_MISSING");
  }
  if (fs.existsSync(jarPath)) {
    const jarSha256 = crypto.createHash("sha256").update(fs.readFileSync(jarPath)).digest("hex");
    if ((requireComplete && imageEvidence.jarSha256 !== jarSha256)
      || (imageEvidence.jarSha256 !== "unavailable" && imageEvidence.jarSha256 !== jarSha256)) fail("SERVICE_EVIDENCE_ARTIFACT_MISMATCH");
  } else if (requireComplete) {
    fail("SERVICE_EVIDENCE_ARTIFACT_MISSING");
  } else if (imageEvidence.jarSha256 !== "unavailable") {
    fail("SERVICE_EVIDENCE_ARTIFACT_MISMATCH");
  }
  if (imageEvidence.imageReference !== (service.id === "identity-profile-service"
    ? "auction-promax/identity-profile-service:s001-t07"
    : `auction-promax/${service.id}:local`)) fail("SERVICE_EVIDENCE_ARTIFACT_MISMATCH");
}

export function validateServiceEvidence({ serviceId, commit, directory }) {
  if (typeof serviceId !== "string" || !/^[a-z][a-z0-9-]*$/.test(serviceId)) fail("SERVICE_EVIDENCE_SERVICE_INVALID");
  if (typeof commit !== "string" || !/^[a-f0-9]{40}$/.test(commit)) fail("SERVICE_EVIDENCE_COMMIT_INVALID");
  if (typeof directory !== "string" || directory.length === 0) fail("SERVICE_EVIDENCE_ARGUMENT_INVALID");
  let evidenceRoot;
  try { evidenceRoot = fs.realpathSync(directory); } catch { fail("SERVICE_EVIDENCE_ROOT_MISSING"); }
  const rootStat = fs.lstatSync(directory);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) fail("SERVICE_EVIDENCE_FILESET_INVALID");
  const names = fs.readdirSync(evidenceRoot);
  if (names.length !== serviceEvidenceFiles.length || names.some((name) => !serviceEvidenceFileSet.has(name))) fail("SERVICE_EVIDENCE_FILESET_INVALID");
  const entries = new Map();
  for (const name of serviceEvidenceFiles) {
    const file = path.join(evidenceRoot, name);
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) fail("SERVICE_EVIDENCE_FILESET_INVALID");
    const value = readJson(file);
    exactKeys(value, [...commonFields, ...fileSpecificFields.get(name)], "SERVICE_EVIDENCE_FIELD_INVALID");
    if (value.schemaVersion !== 2 || value.serviceId !== serviceId || value.commit !== commit || value.documentType !== documentTypes.get(name)) fail("SERVICE_EVIDENCE_IDENTITY_MISMATCH");
    entries.set(name, value);
  }
  const summary = entries.get("run-summary.json");
  const registryPath = path.join(findRepositoryRoot(evidenceRoot), "api", "service-foundation", "services.json");
  let registry;
  try { registry = JSON.parse(fs.readFileSync(registryPath, "utf8")); } catch { fail("SERVICE_EVIDENCE_REGISTRY_INVALID"); }
  const service = registry?.services?.find((record) => record.id === serviceId);
  if (!service || !["relational", "gateway"].includes(service.variant)) fail("SERVICE_EVIDENCE_SERVICE_INVALID");
  for (const value of entries.values()) {
    if (value.variant !== service.variant || JSON.stringify(value.sourceProvenance) !== JSON.stringify(summary.sourceProvenance)) fail("SERVICE_EVIDENCE_IDENTITY_MISMATCH");
  }
  const repositoryRoot = findRepositoryRoot(evidenceRoot);
  const head = git(repositoryRoot, ["rev-parse", "HEAD"], "SERVICE_EVIDENCE_GIT_REVISION_INVALID");
  if (head !== commit) fail("SERVICE_EVIDENCE_EXECUTION_REVISION_MISMATCH");
  validateSourceProvenance(repositoryRoot, commit, service, summary.sourceProvenance);
  validateFindingList(entries.get("vulnerability-inventory.json").findings, vulnerabilityFields, "SERVICE_EVIDENCE_FINDINGS_INVALID");
  validateFindingList(entries.get("container-vulnerability-inventory.json").findings, vulnerabilityFields, "SERVICE_EVIDENCE_FINDINGS_INVALID");
  validateFindingList(entries.get("gitleaks-inventory.json").findings, gitleaksFields, "SERVICE_EVIDENCE_FINDINGS_INVALID");

  const image = entries.get("image-identity.json");
  const smoke = entries.get("smoke-summary.json");
  const policy = entries.get("policy-summary.json");
  if (!["PASS", "IMPLEMENTATION_FAILURE"].includes(summary.executionState)
    || !["PASS", "BLOCKED", "NOT_EVALUATED"].includes(summary.policyState)
    || !["NOT_REQUIRED", "REVIEW_REQUIRED"].includes(summary.reviewState)
    || !["NOT_APPLICABLE", "UNCHANGED", "NEW", "REMEDIATED", "BASELINE_UNAVAILABLE"].includes(summary.deltaState)
    || !/^[A-Z][A-Z0-9_]+$/.test(summary.failureCode)) fail("SERVICE_EVIDENCE_STATE_INVALID");
  if (summary.executionState === "PASS") {
    if (summary.failureCode !== "NONE" || image.imageId === "unavailable" || !/^sha256:[a-f0-9]{64}$/.test(image.imageId)
      || image.jarSha256 === "unavailable" || !/^[a-f0-9]{64}$/.test(image.jarSha256) || smoke.readiness !== "UP") fail("SERVICE_EVIDENCE_PASS_INCOMPLETE");
  } else if (summary.executionState !== "IMPLEMENTATION_FAILURE" || summary.failureCode === "NONE" || summary.policyState !== "NOT_EVALUATED") {
    fail("SERVICE_EVIDENCE_STATE_INVALID");
  }
  if (!["PASS", "BLOCKED", "NOT_EVALUATED"].includes(summary.policyState)
    || policy.policyState !== summary.policyState
    || policy.reviewState !== summary.reviewState || policy.deltaState !== summary.deltaState) fail("SERVICE_EVIDENCE_POLICY_MISMATCH");
  if (service.variant === "gateway" && JSON.stringify(entries.get("smoke-summary.json")).match(/(?:postgres|datasource|jdbc)/i)) fail("SERVICE_EVIDENCE_GATEWAY_DATASTORE_FORBIDDEN");
  validateArtifactBinding(repositoryRoot, service, image, summary.executionState === "PASS");
  return { serviceId, variant: service.variant, commit, sourceProvenance: summary.sourceProvenance, files: [...serviceEvidenceFiles].sort() };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const values = new Map();
  if (args.length !== 6) fail("SERVICE_EVIDENCE_ARGUMENT_INVALID");
  for (let index = 0; index < args.length; index += 2) {
    if (!["--service", "--commit", "--directory"].includes(args[index]) || values.has(args[index])) fail("SERVICE_EVIDENCE_ARGUMENT_INVALID");
    values.set(args[index], args[index + 1]);
  }
  if (values.size !== 3) fail("SERVICE_EVIDENCE_ARGUMENT_INVALID");
  process.stdout.write(`${JSON.stringify(validateServiceEvidence({ serviceId: values.get("--service"), commit: values.get("--commit"), directory: values.get("--directory") }))}\n`);
}
