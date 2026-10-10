import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const ajvPath = path.join(repoRoot, "contracts/node_modules/ajv/dist/2020.js");
const schemaPath = path.join(repoRoot, "security/schemas/container-base-images.schema.json");
const manifestPath = path.join(repoRoot, "security/tooling/container-base-images.json");
const dockerfilePath = path.join(repoRoot, "services/identity-profile-service/Dockerfile");
const commonDockerfilePath = path.join(repoRoot, "service-foundation/templates/common/Dockerfile");
const expectedCandidate = {
  indexDigest: "sha256:b707577445897895f25c42ad4c0bfe5747a53e16c06de8ef118a55d894eb1c1e",
  platformManifestDigest: "sha256:a1659a04c445036c54b49fe5163e46554ca24030e94c6eeffefe46fad127b400",
  officialSource: "https://github.com/corretto/corretto-docker.git#883dd4b1df5aa871f1dfcec2244c5959b67e0239:21/headless/al2023",
};

if (!fs.existsSync(ajvPath)) {
  throw new Error("Pinned Ajv is missing; run npm ci in api/contracts before Cycle 5 schema tests.");
}

const { default: Ajv2020 } = await import(pathToFileURL(ajvPath).href);

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} is missing.`);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(`${label} is malformed JSON.`);
  }
}

function readText(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} is missing.`);
  return fs.readFileSync(filePath, "utf8");
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

function validateDockerfileBaseImage(dockerfileText, trustManifest = manifest) {
  if (!Array.isArray(trustManifest.images) || trustManifest.images.length !== 1) {
    return false;
  }

  const image = trustManifest.images[0];
  const expectedReference = `${image.repository}:${image.reviewedTag}@${image.platformManifestDigest}`;
  const fromLines = dockerfileText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => /^FROM(?:\s|$)/iu.test(line));

  if (fromLines.length !== 1) return false;

  const match = fromLines[0].match(/^FROM\s+([^\s]+)\s*$/iu);
  return match !== null && match[1] === expectedReference;
}

function assertDockerfileResult(name, mutate, expectedValid) {
  const valid = validateDockerfileBaseImage(mutate(dockerfile));
  if (valid !== expectedValid) {
    throw new Error(`${name}: expected valid=${expectedValid}, got valid=${valid}`);
  }
  process.stdout.write(`[PASS] ${name}\n`);
}

const schema = readJson(schemaPath, "Container base image trust schema");
const manifest = readJson(manifestPath, "Container base image trust manifest");
const dockerfile = readText(dockerfilePath, "Identity service Dockerfile");
const commonDockerfile = readText(commonDockerfilePath, "Shared service Dockerfile template");
const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
if (!ajv.validateSchema(schema)) {
  throw new Error(`Container base image trust schema is invalid: ${JSON.stringify(ajv.errors)}`);
}
const validate = ajv.compile(schema);

if (manifest.images.length !== 1 || Object.entries(expectedCandidate).some(([key, value]) => manifest.images[0][key] !== value)) {
  throw new Error("Candidate Corretto image trust metadata does not match the Phase 0 verified digest and source.");
}
if (!validateDockerfileBaseImage(dockerfile) || !validateDockerfileBaseImage(commonDockerfile)) {
  throw new Error("Identity and shared Dockerfiles must both use the exact trusted Corretto image digest.");
}
process.stdout.write("[PASS] Phase 0 candidate digest, provenance and both Dockerfiles bound exactly\n");

assertResult(validate, "Canonical container base image manifest accepted", () => {}, true);
assertResult(validate, "Mutable runtime tag rejected", (value) => { value.images[0].reviewedTag = "21-al2023-headless"; }, false);
assertResult(validate, "Wrong official repository rejected", (value) => { value.images[0].repository = "docker.io/library/eclipse-temurin"; }, false);
assertResult(validate, "Missing index digest rejected", (value) => { delete value.images[0].indexDigest; }, false);
assertResult(validate, "Missing platform manifest digest rejected", (value) => { delete value.images[0].platformManifestDigest; }, false);
assertResult(validate, "Floating index digest rejected", (value) => { value.images[0].indexDigest = "latest"; }, false);
assertResult(validate, "Floating platform manifest digest rejected", (value) => { value.images[0].platformManifestDigest = "latest"; }, false);
assertResult(validate, "Index digest drift rejected", (value) => { value.images[0].indexDigest = "sha256:" + "a".repeat(64); }, false);
assertResult(validate, "Platform manifest digest drift rejected", (value) => { value.images[0].platformManifestDigest = "sha256:" + "b".repeat(64); }, false);
assertResult(validate, "Placeholder checksum rejected", (value) => { value.images[0].indexDigest = "sha256:" + "0".repeat(64); }, false);
assertResult(validate, "Malformed checksum rejected", (value) => { value.images[0].platformManifestDigest = "sha256:abc"; }, false);
assertResult(validate, "Non-amd64 platform rejected", (value) => { value.images[0].platform.architecture = "arm64"; }, false);
assertResult(validate, "Non-Linux platform rejected", (value) => { value.images[0].platform.os = "windows"; }, false);
assertResult(validate, "Non-headless distribution rejected", (value) => { value.images[0].runtime.distribution = "full"; }, false);
assertResult(validate, "Non-AL2023 runtime rejected", (value) => { value.images[0].runtime.operatingSystem = "alpine"; }, false);
assertResult(validate, "Wrong Java major rejected", (value) => { value.images[0].runtime.javaMajor = 17; }, false);
assertResult(validate, "Official source drift rejected", (value) => { value.images[0].officialSource = "https://example.invalid/source"; }, false);
assertResult(validate, "Additional image rejected", (value) => { value.images.push(clone(value.images[0])); }, false);
assertResult(validate, "Unexpected property rejected", (value) => { value.images[0].mutable = true; }, false);

assertDockerfileResult("Canonical Dockerfile base image binding accepted", (value) => value, true);
assertDockerfileResult("Dockerfile mutable tag drift rejected", (value) => value.replace(manifest.images[0].reviewedTag, "21-al2023-headless"), false);
assertDockerfileResult("Dockerfile index digest substitution rejected", (value) => value.replace(manifest.images[0].platformManifestDigest, manifest.images[0].indexDigest), false);
assertDockerfileResult("Dockerfile platform manifest digest drift rejected", (value) => value.replace(manifest.images[0].platformManifestDigest, "sha256:" + "c".repeat(64)), false);
assertDockerfileResult("Dockerfile digest removal rejected", (value) => value.replace(`@${manifest.images[0].platformManifestDigest}`, ""), false);

process.stdout.write("Container base image trust schema and Dockerfile binding tests: PASS\n");
