import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "../../api/contracts/node_modules/yaml/dist/index.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const names = ["api-baseline.yml", "web-baseline.yml", "supply-chain.yml", "security-freshness.yml"];
const pins = Object.freeze({
  "actions/checkout": "11d5960a326750d5838078e36cf38b85af677262",
  "actions/setup-java": "cf277c60eb25467037889841efdb72551f06f6c3",
  "actions/setup-node": "49933ea5288caeca8642d1e84afbd3f7d6820020",
  "actions/upload-artifact": "ea165f8d65b6e75b540449e92b4886f43607fa02",
  "actions/download-artifact": "9000827ccba6bdab643e8b6fd33ac0654aef8333",
});

const serviceResultDownloadContract = Object.freeze({
  uses: `actions/download-artifact@${pins["actions/download-artifact"]}`,
  with: Object.freeze({
    pattern: "s002-service-result-*",
    path: "${{ runner.temp }}/s002-service-results",
    "merge-multiple": false,
    "digest-mismatch": "error",
  }),
});

function validateServiceResultDownload(step) {
  check(step?.uses === serviceResultDownloadContract.uses, "SERVICE_RESULT_DOWNLOAD_PIN_INVALID");
  for (const [key, value] of Object.entries(serviceResultDownloadContract.with)) {
    check(step.with?.[key] === value, `SERVICE_RESULT_DOWNLOAD_INPUT_INVALID: ${key}`);
  }
}

function check(ok, code) { assert.ok(ok, code); }
function step(job, idOrName) { return job.steps.find((item) => item.id === idOrName || item.name === idOrName); }

function validateWorkflowSet(workflows) {
  check(Object.keys(workflows).sort().join("|") === [...names].sort().join("|"), "ROOT_WORKFLOW_SET_INVALID");
  for (const [file, workflow] of Object.entries(workflows)) {
    const triggers = Object.keys(workflow.on ?? {}).sort();
    const expected = file === "security-freshness.yml" ? ["schedule", "workflow_dispatch"] : file === "supply-chain.yml" ? ["pull_request", "push", "workflow_dispatch"] : ["pull_request", "push"];
    check(triggers.join("|") === expected.sort().join("|"), `TRIGGER_DRIFT: ${file}`);
    for (const event of Object.values(workflow.on ?? {})) {
      check(!event || (!Object.hasOwn(event, "paths") && !Object.hasOwn(event, "paths-ignore")), `PATH_FILTER_FORBIDDEN: ${file}`);
    }
    check(JSON.stringify(workflow.permissions) === JSON.stringify({ contents: "read" }), `PERMISSIONS_INVALID: ${file}`);
    check(!workflow.defaults?.run?.["working-directory"], `WORKFLOW_DEFAULT_DIRECTORY_FORBIDDEN: ${file}`);
    check(!JSON.stringify(workflow).includes("monorepo-required"), `TASK5_AGGREGATE_EARLY: ${file}`);
    for (const [jobId, job] of Object.entries(workflow.jobs ?? {})) {
      check(job["runs-on"] === "ubuntu-24.04" && Number.isInteger(job["timeout-minutes"]) && job["timeout-minutes"] > 0, `JOB_BASELINE_INVALID: ${file}:${jobId}`);
      check(!job.defaults?.run?.["working-directory"], `JOB_DEFAULT_DIRECTORY_FORBIDDEN: ${file}:${jobId}`);
      check(Array.isArray(job.steps) && job.steps.length > 0, `JOB_STEPS_MISSING: ${file}:${jobId}`);
      for (const item of job.steps) {
        check(item["continue-on-error"] !== true, `CONTINUE_ON_ERROR: ${file}:${jobId}`);
        if (item.uses) {
          const [action, sha, extra] = item.uses.split("@");
          check(!extra && /^[0-9a-f]{40}$/.test(sha ?? "") && pins[action] === sha, `ACTION_PIN_INVALID: ${file}:${jobId}`);
          if (action === "actions/checkout") check(item.with?.["persist-credentials"] === false, `CHECKOUT_CREDENTIALS: ${file}:${jobId}`);
          if (action === "actions/upload-artifact") {
            check(item.if === "always()" && item.with?.path === "${{ runner.temp }}/s001-t07-evidence/hosted" && item.with?.["retention-days"] === 30 && item.with?.["if-no-files-found"] === "error", `EVIDENCE_UPLOAD_INVALID: ${file}:${jobId}`);
          }
          if (action === "actions/setup-node") {
            const component = file === "web-baseline.yml" ? "web" : "api";
            check(item.with?.["node-version-file"] === `${component}/.nvmrc`, `NODE_VERSION_PATH_INVALID: ${file}:${jobId}`);
            const expectedLock = file === "web-baseline.yml" ? "web/package-lock.json" : jobId === "verify-cdk-toolchain" ? "api/infra/package-lock.json" : "api/contracts/package-lock.json";
            check(item.with?.["cache-dependency-path"] === expectedLock, `LOCKFILE_PATH_INVALID: ${file}:${jobId}`);
          }
        }
        if (item["working-directory"]) {
          const expectedDir = file === "web-baseline.yml" ? "web" : jobId === "verify-cdk-toolchain" ? "api/infra" : jobId === "verify-identity-profile-service" ? "api/services/identity-profile-service" : "api/contracts";
          check(item["working-directory"] === expectedDir, `WORKING_DIRECTORY_INVALID: ${file}:${jobId}`);
        }
        const command = String(item.run ?? "");
        check(!/(^|[\s'"`])\.\/scripts\//m.test(command), `STALE_SCRIPT_PATH: ${file}:${jobId}`);
        check(!/(^|[\s'"`])(services\/identity-profile-service|infra\/package-lock\.json|contracts\/package-lock\.json)(?=[\s'"`]|$)/m.test(command), `STALE_COMMAND_PATH: ${file}:${jobId}`);
        const pathEnv = Object.entries(item.env ?? {}).concat(Object.entries(job.env ?? {})).filter(([key]) => /(?:PATH|FILE|ROOT|DIR)$/i.test(key));
        for (const [, value] of pathEnv) check(!/^(?:contracts|infra|services)\//.test(String(value)), `STALE_ENV_PATH: ${file}:${jobId}`);
      }
    }
  }
  const api = workflows["api-baseline.yml"].jobs;
  check(Object.keys(api).sort().join("|") === ["verify-identity-profile-service", "verify-cdk-toolchain", "verify-contract-registry"].sort().join("|"), "API_JOB_SET_INVALID");
  check(step(api["verify-contract-registry"], "Reject prohibited OpenAPI breaking change")?.run === "./api/scripts/verify-contracts.ps1 -Mode Fixture", "API_FIXTURE_COMMAND_INVALID");
  check(step(api["verify-contract-registry"], "Verify registered contracts")?.run === "./api/scripts/verify-contracts.ps1 -Mode Registry", "API_REGISTRY_COMMAND_INVALID");
  const web = workflows["web-baseline.yml"].jobs;
  check(Object.keys(web).join("|") === "lint-and-build", "WEB_JOB_SET_INVALID");
  for (const [name, run] of [["Install dependencies", "npm ci"], ["Lint", "npm run lint"], ["Build production application", "npm run build"]]) {
    check(step(web["lint-and-build"], name)?.run === run && step(web["lint-and-build"], name)?.["working-directory"] === "web", `WEB_COMMAND_INVALID: ${name}`);
  }
  for (const [file, mainId, policyId, mode] of [["supply-chain.yml", "supply-chain-verification", "release-policy", "--repository-supply-chain"], ["security-freshness.yml", "security-freshness", "freshness-release-policy", "--repository"]]) {
    const jobs = workflows[file].jobs;
    check(Object.keys(jobs).sort().join("|") === [mainId, policyId].sort().join("|"), `POLICY_JOB_SET_INVALID: ${file}`);
    const main = jobs[mainId];
    const policy = jobs[policyId];
    check(policy.needs?.includes(mainId) && policy.if === `needs.${mainId}.result == 'success'`, `POLICY_SEPARATION_INVALID: ${file}`);
    check(String(step(policy, "Enforce separate release policy")?.run ?? "").includes("if ($env:POLICY_STATE -eq 'BLOCKED') { exit 1 }"), `BLOCKED_POLICY_INVALID: ${file}`);
    check(step(main, "validate-contract")?.run === `node ./api/scripts/supply-chain/Test-HostedSupplyChainContract.mjs ${mode}`, `HOSTED_CONTRACT_PATH_INVALID: ${file}`);
    check(String(step(main, "run-hosted")?.run ?? "").includes("./api/scripts/supply-chain/Invoke-HostedSupplyChain.ps1"), `HOSTED_RUN_PATH_INVALID: ${file}`);
    check(String(step(main, "validate-evidence")?.run ?? "").includes("./api/scripts/supply-chain/Validate-HostedSupplyChainEvidence.mjs"), `HOSTED_EVIDENCE_PATH_INVALID: ${file}`);
    check(step(main, "upload-evidence")?.uses === `actions/upload-artifact@${pins["actions/upload-artifact"]}`, `HOSTED_ARTIFACT_MISSING: ${file}`);
  }
}

function expectRejected(name, mutate) {
  const workflows = loadRootWorkflows();
  validateWorkflowSet(workflows);
  mutate(workflows);
  assert.throws(() => validateWorkflowSet(workflows), undefined, name);
  process.stdout.write(`[PASS] ${name}\n`);
}

function loadRootWorkflows() {
  return Object.fromEntries(names.map((file) => {
    const document = YAML.parseDocument(fs.readFileSync(path.join(root, ".github/workflows", file), "utf8"), { uniqueKeys: true, strict: true });
    check(document.errors.length === 0 && document.warnings.length === 0, `YAML_INVALID: ${file}`);
    return [file, document.toJS({ maxAliasCount: 0 })];
  }));
}

function runFixtures() {
  validateServiceResultDownload(serviceResultDownloadContract);
  for (const mutation of [
    (candidate) => { candidate.uses = "actions/download-artifact@v8"; },
    (candidate) => { candidate.uses = "actions/download-artifact@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; },
    (candidate) => { candidate.with["merge-multiple"] = true; },
    (candidate) => { candidate.with.path = "${{ runner.temp }}/merged-results"; },
    (candidate) => { candidate.with["digest-mismatch"] = "ignore"; },
  ]) {
    const candidate = structuredClone(serviceResultDownloadContract);
    mutation(candidate);
    assert.throws(() => validateServiceResultDownload(candidate));
  }
  process.stdout.write("Service result download pin and isolation contract: PASS (v8.0.2, signed commit reviewed)\n");
  expectRejected("mutable web checkout rejected", (w) => { w["web-baseline.yml"].jobs["lint-and-build"].steps[0].uses = "actions/checkout@v4"; });
  expectRejected("stale web lock path rejected", (w) => { w["web-baseline.yml"].jobs["lint-and-build"].steps[1].with["cache-dependency-path"] = "package-lock.json"; });
  expectRejected("PR path skip rejected", (w) => { w["api-baseline.yml"].on.pull_request = { paths: ["api/**"] }; });
  expectRejected("broad permission rejected", (w) => { w["supply-chain.yml"].permissions["id-token"] = "write"; });
  expectRejected("missing timeout rejected", (w) => { delete w["api-baseline.yml"].jobs["verify-cdk-toolchain"]["timeout-minutes"]; });
  expectRejected("raw artifact path rejected", (w) => { w["supply-chain.yml"].jobs["supply-chain-verification"].steps.find((s) => s.id === "upload-evidence").with.path = "api/target"; });
  expectRejected("stale API script path rejected", (w) => { w["supply-chain.yml"].jobs["supply-chain-verification"].steps.find((s) => s.id === "validate-contract").run = "node ./scripts/supply-chain/Test-HostedSupplyChainContract.mjs --repository-supply-chain"; });
  expectRejected("missing credential guard rejected", (w) => { delete w["api-baseline.yml"].jobs["verify-cdk-toolchain"].steps[0].with["persist-credentials"]; });
  expectRejected("stale API node version path rejected", (w) => { w["api-baseline.yml"].jobs["verify-cdk-toolchain"].steps[1].with["node-version-file"] = ".nvmrc"; });
  expectRejected("local action stale root rejected", (w) => { w["api-baseline.yml"].jobs["verify-cdk-toolchain"].steps[0].uses = "./.github/actions/old"; });
  expectRejected("hashFiles stale root rejected", (w) => { w["api-baseline.yml"].jobs["verify-cdk-toolchain"].steps[1].with["cache-dependency-path"] = "${{ hashFiles('contracts/package-lock.json') }}"; });
  expectRejected("path-valued env stale root rejected", (w) => { w["api-baseline.yml"].jobs["verify-cdk-toolchain"].env = { LOCKFILE_PATH: "infra/package-lock.json" }; });
  expectRejected("working directory default stale root rejected", (w) => { w["api-baseline.yml"].defaults = { run: { "working-directory": "contracts" } }; });
  expectRejected("release policy merged into verification rejected", (w) => { delete w["supply-chain.yml"].jobs["release-policy"]; });
  process.stdout.write("Root workflow negative fixtures: PASS\n");
}

function runRepository() {
  for (const old of ["api/.github/workflows/api-baseline.yml", "api/.github/workflows/supply-chain.yml", "api/.github/workflows/security-freshness.yml", "web/.github/workflows/web-baseline.yml"]) {
    check(!fs.existsSync(path.join(root, old)), `NESTED_WORKFLOW_RETAINED: ${old}`);
  }
  const workflows = loadRootWorkflows();
  validateWorkflowSet(workflows);
  process.stdout.write("Root workflow repository contract: PASS\n");
}

if (process.argv.includes("--fixtures")) runFixtures();
else if (process.argv.includes("--repository")) runRepository();
else { runFixtures(); runRepository(); }
