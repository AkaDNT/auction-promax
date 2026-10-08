import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateServiceMatrixResults } from "./MonorepoRequiredChecks.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ids = new Set(JSON.parse(fs.readFileSync(path.join(root, "api/service-foundation/services.json"), "utf8")).services.map(({ id }) => id));

function assertOrdinaryPath(filename, type) {
  const stat = fs.lstatSync(filename);
  if ((type === "directory" && !stat.isDirectory()) || (type === "file" && !stat.isFile()) || stat.isSymbolicLink()) {
    throw new Error("SERVICE_MATRIX_PATH_UNSAFE");
  }
  if (fs.realpathSync(filename) !== path.resolve(filename)) throw new Error("SERVICE_MATRIX_PATH_UNSAFE");
}

export function readServiceMatrixResults({ selectedServiceIds, commit, directory }) {
  if (!Array.isArray(selectedServiceIds) || !/^[0-9a-f]{40}$/.test(commit)) throw new Error("SERVICE_MATRIX_INPUT_INVALID");
  const selected = new Set(selectedServiceIds);
  if (selected.size !== selectedServiceIds.length || [...selected].some((id) => !ids.has(id))) throw new Error("SERVICE_MATRIX_SELECTION_INVALID");
  const base = path.resolve(directory);
  try { fs.lstatSync(base); }
  catch (error) {
    if (error.code !== 'ENOENT') throw new Error("SERVICE_MATRIX_PATH_UNSAFE");
    if (selected.size === 0) return validateServiceMatrixResults({ selectedServiceIds, commit, results: [] });
    throw new Error("SERVICE_MATRIX_RESULT_MISSING");
  }
  assertOrdinaryPath(base, "directory");
  const entries = fs.readdirSync(base).sort();
  const expected = [...selected].map((id) => `service-result-${id}`).sort();
  if (entries.some((entry) => !expected.includes(entry))) throw new Error("SERVICE_MATRIX_RESULT_SET_INVALID");
  if (entries.length < expected.length || expected.some((entry) => !entries.includes(entry))) throw new Error("SERVICE_MATRIX_RESULT_MISSING");
  const results = [];
  for (const id of expected.map((name) => name.slice("service-result-".length))) {
    const artifactDirectory = path.join(base, `service-result-${id}`);
    assertOrdinaryPath(artifactDirectory, "directory");
    const children = fs.readdirSync(artifactDirectory);
    if (children.length !== 1 || children[0] !== "matrix-result.json") throw new Error("SERVICE_MATRIX_RESULT_SET_INVALID");
    const resultPath = path.join(artifactDirectory, children[0]);
    assertOrdinaryPath(resultPath, "file");
    let record;
    try { record = JSON.parse(fs.readFileSync(resultPath, "utf8")); }
    catch { throw new Error("SERVICE_MATRIX_RESULT_INVALID"); }
    if (record?.serviceId !== id) throw new Error("SERVICE_MATRIX_RESULT_ARTIFACT_MISMATCH");
    results.push(record);
  }
  return validateServiceMatrixResults({ selectedServiceIds, commit, results });
}

function parseArgs(args) {
  const values = new Map();
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (!new Set(["--services", "--commit", "--directory"]).has(key) || !value || values.has(key)) throw new Error("USAGE");
    values.set(key, value);
  }
  if (values.size !== 3) throw new Error("USAGE");
  return values;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const selectedServiceIds = JSON.parse(args.get("--services"));
    const result = readServiceMatrixResults({ selectedServiceIds, commit: args.get("--commit"), directory: args.get("--directory") });
    process.stdout.write(`SERVICE_MATRIX_RESULTS_PASS services=${result.serviceIds.length}\n`);
  } catch (error) {
    process.stderr.write(`${/^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : "SERVICE_MATRIX_VALIDATION_FAILED"}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
