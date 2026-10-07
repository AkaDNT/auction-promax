import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";
import YAML from "../../api/contracts/node_modules/yaml/dist/index.js";
import {
  classifyChangedPaths,
  parseNameStatus,
  selectDiff,
  evaluateAggregate,
} from "./MonorepoRequiredChecks.mjs";

const sha = (digit) => digit.repeat(40);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("API-only and web-only paths select only their component", () => {
  assert.deepEqual(classifyChangedPaths(["api/services/identity-profile-service/pom.xml"]), { api: true, web: false, contracts: false, shared: false });
  assert.deepEqual(classifyChangedPaths(["web/features/auction/index.ts"]), { api: false, web: true, contracts: false, shared: false });
});

test("contract and shared CI paths select both components", () => {
  assert.deepEqual(classifyChangedPaths(["api/contracts/README.md"]), { api: true, web: true, contracts: true, shared: false });
  assert.deepEqual(classifyChangedPaths([".github/workflows/monorepo-verification.yml"]), { api: true, web: true, contracts: false, shared: true });
});

test("docs-only changes skip expensive components while mixed and unknown paths run both", () => {
  assert.deepEqual(classifyChangedPaths(["docs/readme.md", "api/docs/guide.md"]), { api: false, web: false, contracts: false, shared: false });
  assert.deepEqual(classifyChangedPaths(["api/src/file.java", "web/src/file.ts"]), { api: true, web: true, contracts: false, shared: false });
  assert.deepEqual(classifyChangedPaths(["new-root-policy.txt"]), { api: true, web: true, contracts: false, shared: true });
});

test("NUL status records classify both sides of rename and the deleted path", () => {
  const records = parseNameStatus(Buffer.from("R100\0api/old.java\0web/new.ts\0D\0api/contracts/old.yaml\0"));
  assert.deepEqual(records, ["api/old.java", "web/new.ts", "api/contracts/old.yaml"]);
  assert.deepEqual(classifyChangedPaths(records), { api: true, web: true, contracts: true, shared: false });
});

test("PR classification uses base and head while execution revision stays the merge commit", () => {
  const calls = [];
  const event = { pull_request: { base: { sha: sha("a") }, head: { sha: sha("b") } } };
  const result = selectDiff("pull_request", event, sha("c"), (...args) => { calls.push(args); return args[0] === "merge-base" ? sha("d") : Buffer.from("M\0web/app/page.tsx\0"); });
  assert.deepEqual(result, { api: false, web: true, contracts: false, shared: false });
  assert.deepEqual(calls, [["merge-base", sha("a"), sha("b")], ["diff", sha("d"), sha("b")]]);
  assert.deepEqual(selectDiff("pull_request", event, sha("c"), () => { throw new Error("missing PR head object"); }), { api: true, web: true, contracts: true, shared: true });
});

test("normal push uses before and after; new branch and untrusted diff run all", () => {
  const calls = [];
  const git = (...args) => { calls.push(args); return Buffer.from("M\0api/infra/package.json\0"); };
  assert.deepEqual(selectDiff("push", { before: sha("a"), after: sha("b") }, sha("b"), git), { api: true, web: false, contracts: false, shared: false });
  assert.deepEqual(calls, [["diff", sha("a"), sha("b")]]);
  assert.deepEqual(selectDiff("push", { before: sha("0"), after: sha("b") }, sha("b"), git), { api: true, web: true, contracts: true, shared: true });
  assert.deepEqual(selectDiff("push", { before: sha("a"), after: sha("b") }, sha("b"), () => { throw new Error("missing object"); }), { api: true, web: true, contracts: true, shared: true });
  assert.deepEqual(selectDiff("push", { before: "bad", after: sha("b") }, sha("b"), git), { api: true, web: true, contracts: true, shared: true });
  assert.deepEqual(selectDiff("push", { before: sha("a"), after: sha("b") }, sha("c"), git), { api: true, web: true, contracts: true, shared: true });
});

test("CLI classifies a real push diff and writes exact GitHub job outputs", (t) => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "s001-t09-classifier-"));
  t.after(() => {
    const resolved = fs.realpathSync(fixture);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith("s001-t09-classifier-"));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const git = (...args) => {
    const result = spawnSync("git", args, { cwd: fixture, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git("init", "-q");
  fs.writeFileSync(path.join(fixture, "README.md"), "baseline\n");
  git("add", "--", "README.md");
  git("-c", "user.name=Task5 Test", "-c", "user.email=task5@example.invalid", "commit", "-qm", "baseline");
  const before = git("rev-parse", "HEAD");
  fs.mkdirSync(path.join(fixture, "web"));
  fs.writeFileSync(path.join(fixture, "web", "page.ts"), "export const value = 1;\n");
  git("add", "--", "web/page.ts");
  git("-c", "user.name=Task5 Test", "-c", "user.email=task5@example.invalid", "commit", "-qm", "web change");
  const after = git("rev-parse", "HEAD");
  const eventPath = path.join(fixture, "event.json");
  const outputPath = path.join(fixture, "outputs.txt");
  fs.writeFileSync(eventPath, JSON.stringify({ before, after }));
  const result = spawnSync(process.execPath, [path.join(root, "scripts/migration/MonorepoRequiredChecks.mjs"), "--classify"], {
    cwd: fixture,
    env: { ...process.env, GITHUB_EVENT_NAME: "push", GITHUB_EVENT_PATH: eventPath, GITHUB_SHA: after, GITHUB_OUTPUT: outputPath },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(outputPath, "utf8"), "api=false\nweb=true\ncontracts=false\nshared=false\n");
});

test("aggregate accepts applicable success and justified skips only", () => {
  assert.equal(evaluateAggregate({ classify: "success", apiRequired: "true", webRequired: "false", apiResult: "success", webResult: "skipped", lifecycleResult: "success" }), true);
  assert.equal(evaluateAggregate({ classify: "success", apiRequired: "false", webRequired: "false", apiResult: "skipped", webResult: "skipped", lifecycleResult: "success" }), true);
  for (const result of ["failure", "cancelled", "skipped", "", "timed_out"]) {
    assert.equal(evaluateAggregate({ classify: "success", apiRequired: "true", webRequired: "false", apiResult: result, webResult: "skipped", lifecycleResult: "success" }), false, result);
  }
  assert.equal(evaluateAggregate({ classify: "failure", apiRequired: "true", webRequired: "true", apiResult: "success", webResult: "success", lifecycleResult: "success" }), false);
  assert.equal(evaluateAggregate({ classify: "success", apiRequired: "", webRequired: "true", apiResult: "skipped", webResult: "success", lifecycleResult: "success" }), false);
  assert.equal(evaluateAggregate({ classify: "success", apiRequired: "false", webRequired: "false", apiResult: "success", webResult: "skipped", lifecycleResult: "success" }), false);
  for (const lifecycleResult of ["failure", "cancelled", "skipped", ""]) {
    assert.equal(evaluateAggregate({ classify: "success", apiRequired: "false", webRequired: "false", apiResult: "skipped", webResult: "skipped", lifecycleResult }), false);
  }
});

test("unconditional lifecycle gate runs T02 source suites and Linux publisher fixtures", () => {
  const workflow = YAML.parse(fs.readFileSync(path.join(root, ".github/workflows/monorepo-verification.yml"), "utf8"));
  const lifecycle = workflow.jobs.lifecycle;
  const commands = lifecycle.steps.map((step) => step.run ?? "").join("\n");
  assert.match(commands, /node api\/scripts\/foundation\/Test-ServiceGenerator\.mjs/);
  assert.match(commands, /node api\/scripts\/foundation\/Test-ServiceConformance\.mjs --templates/);
  assert.match(commands, /pwsh -NoProfile -NonInteractive -File api\/scripts\/foundation\/Test-PublishServiceDirectory\.ps1/);
  assert.equal(lifecycle["runs-on"], "ubuntu-24.04");
  assert.equal(lifecycle.if, undefined);
});

test("required workflow owns one unique always-concluding check without PR path filters", () => {
  const directory = path.join(root, ".github/workflows");
  const names = fs.readdirSync(directory).filter((name) => /\.ya?ml$/.test(name));
  const workflows = names.map((name) => YAML.parse(fs.readFileSync(path.join(directory, name), "utf8")));
  const requiredOwners = (items) => items.flatMap((item) => Object.entries(item.jobs ?? {}).filter(([jobId, job]) => (job.name ?? jobId) === "monorepo-required"));
  const owners = requiredOwners(workflows);
  assert.equal(owners.length, 1);
  const duplicateById = { jobs: { "monorepo-required": { steps: [] } } };
  assert.equal(requiredOwners([...workflows, duplicateById]).length, 2);
  const workflow = YAML.parse(fs.readFileSync(path.join(directory, "monorepo-verification.yml"), "utf8"));
  assert.deepEqual(Object.keys(workflow.on).sort(), ["pull_request", "push"]);
  assert.equal(workflow.on.pull_request?.paths, undefined);
  assert.equal(workflow.on.pull_request?.["paths-ignore"], undefined);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(workflow.jobs["monorepo-required"].if, "${{ always() }}");
  assert.deepEqual(workflow.jobs["monorepo-required"].needs, ["classify", "api", "web", "lifecycle"]);
  assert.ok(workflow.jobs.lifecycle, "always-run lifecycle job is required");
  assert.equal(workflow.jobs.lifecycle.if, undefined);
  assert.ok(workflow.jobs.lifecycle.steps.some((step) => step.run?.includes("Test-S002-Lifecycle.mjs --repository")));
  assert.ok(workflow.jobs["monorepo-required"].steps.every((step) => !step.uses));
  assert.equal(workflow.jobs.classify.steps[0].with["fetch-depth"], 0);
  assert.equal(workflow.jobs.classify.steps[0].with.ref, undefined);
  assert.ok(workflow.jobs.classify.steps.some((step) => step.run === "npm ci" && step["working-directory"] === "api/contracts"));
  assert.ok(workflow.jobs.classify.steps.some((step) => step.run === "node scripts/migration/Test-MonorepoRequiredChecks.mjs"));
  assert.equal(workflow.jobs.api.steps[0].with.ref, undefined);
  assert.equal(workflow.jobs.web.steps[0].with.ref, undefined);
  for (const [jobName, job] of Object.entries(workflow.jobs)) {
    assert.equal(job["runs-on"], "ubuntu-24.04", jobName);
    assert.ok(Number.isInteger(job["timeout-minutes"]) && job["timeout-minutes"] > 0, jobName);
    for (const step of job.steps) {
      assert.notEqual(step["continue-on-error"], true, jobName);
      if (step.uses) {
        assert.match(step.uses, /^actions\/(?:checkout|setup-node|setup-java)@[0-9a-f]{40}$/);
        if (step.uses.startsWith("actions/checkout@")) assert.equal(step.with?.["persist-credentials"], false);
      }
    }
  }
  const codeownersText = fs.readFileSync(path.join(root, ".github/CODEOWNERS"), "utf8");
  for (const pathname of ["/api/**", "/api/contracts/**", "/api/infra/**", "/web/**", "/.github/workflows/**", "/.github/CODEOWNERS"]) {
    assert.ok(codeownersText.split(/\r?\n/).includes(`${pathname} @AkaDNT`), pathname);
  }
});

test("API job runs both Linux-hosted PowerShell and executable-permission proofs", () => {
  const workflow = YAML.parse(fs.readFileSync(path.join(root, ".github/workflows/monorepo-verification.yml"), "utf8"));
  const step = workflow.jobs.api.steps.find((candidate) => candidate.name === "Verify Linux PowerShell and tool executable handling");
  assert.ok(step, "Task 6 Linux proof step is required in the API job");
  assert.equal(step.shell, "pwsh");
  assert.match(step.run, /\.\/api\/scripts\/supply-chain\/Test-LinuxHostedPowerShellExecutable\.ps1/);
  assert.match(step.run, /\.\/api\/scripts\/supply-chain\/Test-LinuxToolExecutablePermission\.ps1/);
});

test("the actual aggregate job command rejects required failures and accepts docs-only skips", () => {
  const workflow = YAML.parse(fs.readFileSync(path.join(root, ".github/workflows/monorepo-verification.yml"), "utf8"));
  const command = workflow.jobs["monorepo-required"].steps[0].run;
  const source = command.match(/^node -e '\n([\s\S]*?)\n'\s*$/)?.[1];
  assert.ok(source, "aggregate command must be executable Node.js with no checkout");
  const run = (env) => spawnSync(process.execPath, ["-e", source], { env: { ...process.env, ...env }, encoding: "utf8" }).status;
  const baseline = { CLASSIFY_RESULT: "success", API_REQUIRED: "false", WEB_REQUIRED: "false", API_RESULT: "skipped", WEB_RESULT: "skipped", LIFECYCLE_RESULT: "success" };
  assert.equal(run(baseline), 0);
  for (const result of ["failure", "cancelled", "skipped", ""]) {
    assert.equal(run({ ...baseline, LIFECYCLE_RESULT: result }), 1, result);
  }
  assert.equal(run({ ...baseline, API_REQUIRED: "true", API_RESULT: "skipped" }), 1);
  assert.equal(run({ ...baseline, CLASSIFY_RESULT: "failure" }), 1);
  assert.equal(run({ ...baseline, WEB_RESULT: "success" }), 1);
  assert.equal(run({ ...baseline, API_REQUIRED: "" }), 1);
});
