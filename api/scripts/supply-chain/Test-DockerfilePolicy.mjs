import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const imageContractPath = path.join(repoRoot, "security/tooling/container-image-contract.json");
const baseManifestPath = path.join(repoRoot, "security/tooling/container-base-images.json");

function fail(code) {
  throw new Error(code);
}

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) fail(`${label}_MISSING`);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    fail(`${label}_MALFORMED`);
  }
}

function normalizeLines(value) {
  if (value.includes("\\\n") || value.includes("\\\r")) fail("DOCKERFILE_LINE_CONTINUATION_FORBIDDEN");
  return value.replace(/\r\n/g, "\n").split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
}

function parseInstruction(line) {
  const match = /^([A-Z]+)(?:\s+(.+))?$/.exec(line);
  if (!match) fail("DOCKERFILE_INSTRUCTION_SYNTAX_INVALID");
  return { instruction: match[1], argument: match[2] ?? "" };
}

function assertDockerfilePolicy(dockerfile, imageContract, baseImage) {
  const instructions = normalizeLines(dockerfile).map(parseInstruction);
  const expectedKinds = ["FROM", "WORKDIR", "COPY", "USER", "EXPOSE", "ENTRYPOINT"];
  if (instructions.length !== expectedKinds.length || instructions.some((value, index) => value.instruction !== expectedKinds[index])) {
    fail("DOCKERFILE_INSTRUCTION_SET_OR_ORDER_INVALID");
  }

  const expectedFrom = `${baseImage.repository}:${baseImage.reviewedTag}@${baseImage.platformManifestDigest}`;
  if (instructions[0].argument !== expectedFrom) fail("DOCKERFILE_BASE_IMAGE_DRIFT");
  if (!instructions[0].argument.includes("@sha256:")) fail("DOCKERFILE_BASE_IMAGE_UNPINNED");
  if (/\s+AS\s+/i.test(instructions[0].argument)) fail("DOCKERFILE_MULTI_STAGE_FORBIDDEN");

  if (instructions[1].argument !== imageContract.runtime.workingDirectory) fail("DOCKERFILE_WORKDIR_DRIFT");
  const expectedJarFromContext = path.posix.relative(
    imageContract.build.contextRelativePath,
    imageContract.build.canonicalJarRelativePath,
  );
  const expectedCopy = `--chown=${imageContract.runtime.user} ${expectedJarFromContext} ${imageContract.runtime.applicationJarPath}`;
  if (instructions[2].argument !== expectedCopy) fail("DOCKERFILE_COPY_DRIFT");
  if (instructions[3].argument !== imageContract.runtime.user) fail("DOCKERFILE_USER_DRIFT");
  if (instructions[4].argument !== imageContract.runtime.exposedPort.replace("/tcp", "")) fail("DOCKERFILE_EXPOSE_DRIFT");
  let entrypoint;
  try {
    entrypoint = JSON.parse(instructions[5].argument);
  } catch {
    fail("DOCKERFILE_ENTRYPOINT_DRIFT");
  }
  if (!Array.isArray(entrypoint) || JSON.stringify(entrypoint) !== JSON.stringify(imageContract.runtime.entrypoint)) {
    fail("DOCKERFILE_ENTRYPOINT_DRIFT");
  }
}

function assertDockerignorePolicy(dockerignore, imageContract) {
  const lines = dockerignore.replace(/\r\n/g, "\n").split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
  const expectedJarFromContext = path.posix.relative(
    imageContract.build.contextRelativePath,
    imageContract.build.canonicalJarRelativePath,
  );
  const expected = ["**", "!Dockerfile", `!${expectedJarFromContext}`];
  if (lines.length !== expected.length || lines.some((line, index) => line !== expected[index])) {
    fail("DOCKERIGNORE_ALLOWLIST_DRIFT");
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertRejected(name, mutate) {
  let dockerfile = canonicalDockerfile;
  let dockerignore = canonicalDockerignore;
  const imageContract = clone(contract);
  const baseImage = clone(base);
  ({ dockerfile, dockerignore } = mutate({ dockerfile, dockerignore, imageContract, baseImage }));
  try {
    assertDockerfilePolicy(dockerfile, imageContract, baseImage);
    assertDockerignorePolicy(dockerignore, imageContract);
  } catch {
    process.stdout.write(`[PASS] ${name}\n`);
    return;
  }
  fail(`${name}_NOT_REJECTED`);
}

const contract = readJson(imageContractPath, "CONTAINER_IMAGE_CONTRACT");
const baseManifest = readJson(baseManifestPath, "CONTAINER_BASE_IMAGE_MANIFEST");
const base = Array.isArray(baseManifest.images) ? baseManifest.images[0] : null;
if (!base) fail("CONTAINER_BASE_IMAGE_MANIFEST_SHAPE_INVALID");

const dockerfilePath = path.join(repoRoot, contract.build.dockerfileRelativePath);
const dockerignorePath = path.join(repoRoot, contract.build.contextRelativePath, ".dockerignore");
if (!fs.existsSync(dockerfilePath)) fail("DOCKERFILE_MISSING");
if (!fs.existsSync(dockerignorePath)) fail("DOCKERIGNORE_MISSING");
const canonicalDockerfile = fs.readFileSync(dockerfilePath, "utf8");
const canonicalDockerignore = fs.readFileSync(dockerignorePath, "utf8");

assertDockerfilePolicy(canonicalDockerfile, contract, base);
assertDockerignorePolicy(canonicalDockerignore, contract);
process.stdout.write("[PASS] Canonical Dockerfile and .dockerignore accepted\n");

assertRejected("Unpinned base image rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace(/@sha256:[a-f0-9]{64}/, ""), dockerignore }));
assertRejected("Wrong base repository rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("docker.io/library/amazoncorretto", "docker.io/library/eclipse-temurin"), dockerignore }));
assertRejected("Wrong platform manifest digest rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace(/sha256:[a-f0-9]{64}/, `sha256:${"a".repeat(64)}`), dockerignore }));
assertRejected("Multi-stage build rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("WORKDIR /app", "FROM docker.io/library/amazoncorretto:21.0.12-al2023-headless@sha256:5cf1cc34a03ac4ae6e41cb84d9fda24bd6200f6e051e984c1131a409f1e2c05c AS build\nWORKDIR /app"), dockerignore }));
assertRejected("Maven command in Dockerfile rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("WORKDIR /app", "WORKDIR /app\nRUN ./mvnw package"), dockerignore }));
assertRejected("Package installation rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("WORKDIR /app", "WORKDIR /app\nRUN dnf install -y curl"), dockerignore }));
assertRejected("Remote ADD rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("WORKDIR /app", "ADD https://example.invalid/file /app/file\nWORKDIR /app"), dockerignore }));
assertRejected("Broad COPY rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace(/COPY .+/, "COPY . /app"), dockerignore }));
assertRejected("Missing COPY ownership rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("COPY --chown=10001:10001", "COPY"), dockerignore }));
assertRejected("Root user rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("USER 10001:10001", "USER root"), dockerignore }));
assertRejected("Docker healthcheck rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("EXPOSE 8080", "HEALTHCHECK CMD true\nEXPOSE 8080"), dockerignore }));
assertRejected("Shell entrypoint rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace('ENTRYPOINT ["java", "-jar", "/app/app.jar"]', "ENTRYPOINT java -jar /app/app.jar"), dockerignore }));
assertRejected("Build credential argument rejected", ({ dockerfile, dockerignore }) => ({ dockerfile: dockerfile.replace("WORKDIR /app", "ARG REGISTRY_PASSWORD\nWORKDIR /app"), dockerignore }));
assertRejected("Expanded Docker context rejected", ({ dockerfile, dockerignore }) => ({ dockerfile, dockerignore: `${dockerignore}\n!pom.xml` }));
assertRejected("Missing canonical JAR allowlist rejected", ({ dockerfile, dockerignore }) => ({ dockerfile, dockerignore: dockerignore.replace("!target/identity-profile-service-0.0.1-SNAPSHOT.jar", "") }));

process.stdout.write("Dockerfile static policy tests: PASS\n");
