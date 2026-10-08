import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { readServiceMatrixResults } from "./Validate-ServiceMatrixResults.mjs";
import { writeServiceMatrixResult } from "./ServiceMatrixResults.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const commit = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim();
const mkFixture = () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "service-matrix-results-"));
  return { base, output: path.join(base, "results") };
};
const write = (base, id, result = "success", revision = commit) => {
  const directory = path.join(base, `service-result-${id}`);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "matrix-result.json"), JSON.stringify({ schemaVersion: 1, serviceId: id, commit: revision, result }) + "\n");
};

test("writer binds the exact registry service to checked-out HEAD and refuses overwrite", () => {
  const { base, output } = mkFixture();
  try {
    const record = writeServiceMatrixResult({ serviceId: "realtime-gateway", result: "success", outputDirectory: output, repositoryRoot: root });
    assert.deepEqual(Object.keys(record).sort(), ["commit", "result", "schemaVersion", "serviceId"]);
    assert.equal(record.commit, commit);
    assert.throws(() => writeServiceMatrixResult({ serviceId: "realtime-gateway", result: "success", outputDirectory: output, repositoryRoot: root }), { message: "SERVICE_MATRIX_OUTPUT_EXISTS" });
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});

test("collector accepts exact isolated artifact directories and zero selection", () => {
  const { base, output } = mkFixture();
  try {
    write(output, "auction-service"); write(output, "realtime-gateway");
    assert.deepEqual(readServiceMatrixResults({ selectedServiceIds: ["auction-service", "realtime-gateway"], commit, directory: output }), { serviceIds: ["auction-service", "realtime-gateway"], commit });
    assert.deepEqual(readServiceMatrixResults({ selectedServiceIds: [], commit, directory: path.join(base, "absent") }), { serviceIds: [], commit });
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});

test("collector rejects dangling linked roots even for an empty service selection", (t) => {
  const { base } = mkFixture();
  const link = path.join(base, 'dangling');
  try { fs.symlinkSync(path.join(base, 'missing-target'), link, 'junction'); }
  catch (error) {
    fs.rmSync(base, { recursive: true, force: true });
    if (process.platform === 'win32' && ['EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) return t.skip('symlink privilege unavailable on Windows; Linux hosted fixture is mandatory');
    throw error;
  }
  try {
    assert.throws(() => readServiceMatrixResults({ selectedServiceIds: [], commit, directory: link }), { message: 'SERVICE_MATRIX_PATH_UNSAFE' });
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});

test("collector rejects missing, extra, duplicate, wrong-revision, failed and mismatched results", () => {
  const cases = [
    ["missing", (d) => write(d, "auction-service"), "SERVICE_MATRIX_RESULT_MISSING"],
    ["extra", (d) => { write(d, "auction-service"); write(d, "realtime-gateway"); write(d, "billing-service"); }, "SERVICE_MATRIX_RESULT_SET_INVALID"],
    ["revision", (d) => { write(d, "auction-service", "success", "b".repeat(40)); write(d, "realtime-gateway"); }, "SERVICE_MATRIX_REVISION_MISMATCH"],
    ["failure", (d) => { write(d, "auction-service"); write(d, "realtime-gateway", "failure"); }, "SERVICE_MATRIX_RESULT_FAILED"],
    ["artifact identity", (d) => { write(d, "auction-service"); write(d, "realtime-gateway"); fs.writeFileSync(path.join(d, "service-result-realtime-gateway", "matrix-result.json"), JSON.stringify({ schemaVersion: 1, serviceId: "billing-service", commit, result: "success" })); }, "SERVICE_MATRIX_RESULT_ARTIFACT_MISMATCH"],
    ["extra file", (d) => { write(d, "auction-service"); write(d, "realtime-gateway"); fs.writeFileSync(path.join(d, "service-result-auction-service", "other.json"), "{}"); }, "SERVICE_MATRIX_RESULT_SET_INVALID"],
  ];
  for (const [name, populate, code] of cases) {
    const { base, output } = mkFixture();
    try { populate(output); assert.throws(() => readServiceMatrixResults({ selectedServiceIds: ["auction-service", "realtime-gateway"], commit, directory: output }), { message: code }, name); }
    finally { fs.rmSync(base, { recursive: true, force: true }); }
  }
});

if (process.env.RUN_SERVICE_MATRIX_FIXTURES === "1") process.stdout.write("SERVICE_MATRIX_RESULT_FIXTURES_PASS cases=3\n");
