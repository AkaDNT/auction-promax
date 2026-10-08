import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateServiceMatrixResults } from "./MonorepoRequiredChecks.mjs";

const shaPattern = /^[0-9a-f]{40}$/;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const registryPath = path.join(root, "api/service-foundation/services.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const ids = new Set(registry.services.map(({ id }) => id));

function actualHead(repositoryRoot = root) {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" });
  const commit = result.status === 0 ? result.stdout.trim() : "";
  if (!shaPattern.test(commit)) throw new Error("SERVICE_MATRIX_HEAD_INVALID");
  return commit;
}

function assertOrdinaryDirectory(directory) {
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("SERVICE_MATRIX_PATH_UNSAFE");
  const real = fs.realpathSync(directory);
  if (real !== path.resolve(directory)) throw new Error("SERVICE_MATRIX_PATH_UNSAFE");
}

export function writeServiceMatrixResult({ serviceId, result, outputDirectory, repositoryRoot = root }) {
  if (!ids.has(serviceId)) throw new Error("SERVICE_MATRIX_SELECTION_INVALID");
  if (!new Set(["success", "failure"]).has(result)) throw new Error("SERVICE_MATRIX_RESULT_INVALID");
  const commit = actualHead(repositoryRoot);
  const output = path.resolve(outputDirectory);
  assertOrdinaryDirectory(path.dirname(output));
  if (fs.existsSync(output)) throw new Error("SERVICE_MATRIX_OUTPUT_EXISTS");
  fs.mkdirSync(output);
  const ownedStat = fs.lstatSync(output);
  try {
    const record = { schemaVersion: 1, serviceId, commit, result };
    const temporary = path.join(output, ".matrix-result.tmp");
    const destination = path.join(output, "matrix-result.json");
    const descriptor = fs.openSync(temporary, "wx", 0o600);
    try { fs.writeFileSync(descriptor, `${JSON.stringify(record)}\n`, "utf8"); }
    finally { fs.closeSync(descriptor); }
    fs.renameSync(temporary, destination);
    fs.chmodSync(destination, 0o600);
    return record;
  } catch (error) {
    try {
      const current = fs.lstatSync(output);
      if (current.isDirectory() && !current.isSymbolicLink() && current.dev === ownedStat.dev && current.ino === ownedStat.ino) {
        fs.rmSync(output, { recursive: true, force: true });
      }
    } catch { /* Preserve a replaced or inaccessible path. */ }
    throw error;
  }
}

function parseArgs(args) {
  const values = new Map();
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (!new Set(["--service", "--result", "--output"]).has(key) || !value || values.has(key)) throw new Error("USAGE");
    values.set(key, value);
  }
  if (values.size !== 3) throw new Error("USAGE");
  return values;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    writeServiceMatrixResult({
      serviceId: args.get("--service"),
      result: args.get("--result"),
      outputDirectory: args.get("--output"),
    });
    process.stdout.write("SERVICE_MATRIX_RESULT_WRITTEN\n");
  } catch (error) {
    process.stderr.write(`${/^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : "SERVICE_MATRIX_RESULT_WRITE_FAILED"}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();
