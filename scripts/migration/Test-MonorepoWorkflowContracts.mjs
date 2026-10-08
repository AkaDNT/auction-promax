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

function validateServiceResultDownload(step, contract = serviceResultDownloadContract) {
  check(step?.uses === contract.uses, "SERVICE_RESULT_DOWNLOAD_PIN_INVALID");
  for (const [key, value] of Object.entries(contract.with)) {
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
            check(item.if?.startsWith("always()") && item.with?.["retention-days"] === 30 && item.with?.["if-no-files-found"] === "error", `EVIDENCE_UPLOAD_INVALID: ${file}:${jobId}`);
            if (jobId === "repository-security") check(item.with?.path === "${{ runner.temp }}/s001-t07-evidence/hosted", `EVIDENCE_UPLOAD_PATH_INVALID: ${file}:${jobId}`);
            if (jobId === "service-matrix") check(["${{ runner.temp }}/s002-service-evidence", "${{ runner.temp }}/s002-service-result-${{ matrix.service }}"].includes(item.with?.path), `SERVICE_ARTIFACT_UPLOAD_PATH_INVALID: ${jobId}`);
          }
          if (action === "actions/setup-node") {
            const component = file === "web-baseline.yml" ? "web" : "api";
            if (item.with?.["node-version-file"] !== undefined) check(item.with["node-version-file"] === `${component}/.nvmrc`, `NODE_VERSION_PATH_INVALID: ${file}:${jobId}`);
            if (item.with?.cache) {
              const expectedLock = file === "web-baseline.yml" ? "web/package-lock.json" : jobId === "verify-cdk-toolchain" ? "api/infra/package-lock.json" : "api/contracts/package-lock.json";
              check(item.with?.["cache-dependency-path"] === expectedLock, `LOCKFILE_PATH_INVALID: ${file}:${jobId}`);
            }
          }
        }
        if (item["working-directory"]) {
          const expectedDir = file === "web-baseline.yml" ? "web" : jobId === "verify-cdk-toolchain" ? "api/infra" : jobId === "verify-identity-profile-service" ? "api/services/identity-profile-service" : "api/contracts";
          if (jobId === "service-matrix" && item.id === "maven-verify") check(item["working-directory"] === "api/services/${{ matrix.service }}", `WORKING_DIRECTORY_INVALID: ${file}:${jobId}`);
          else check(item["working-directory"] === expectedDir, `WORKING_DIRECTORY_INVALID: ${file}:${jobId}`);
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
  {
    const workflow = workflows["supply-chain.yml"];
    const jobs = workflow.jobs;
    check(Object.keys(jobs).sort().join("|") === ["classify-services", "repository-security", "service-matrix", "supply-chain-verification", "release-policy"].sort().join("|"), "SERVICE_MATRIX_JOB_SET_INVALID");
    const aggregate = jobs["supply-chain-verification"];
    const matrix = jobs["service-matrix"];
    const repository = jobs["repository-security"];
    check(aggregate.if === "always()" && aggregate.needs?.includes("classify-services") && aggregate.needs?.includes("repository-security") && aggregate.needs?.includes("service-matrix"), "SERVICE_MATRIX_AGGREGATE_INVALID");
    check(matrix.strategy?.matrix?.service === "${{ fromJSON(needs.classify-services.outputs.services) }}", "SERVICE_MATRIX_SELECTOR_INVALID");
    check(String(step(matrix, "maven-verify")?.run ?? "").includes("./mvnw -B verify"), "SERVICE_MATRIX_MAVEN_COMMAND_INVALID");
    check(String(step(matrix, "select-source")?.run ?? "").includes("SERVICE_SOURCE_REMOVED"), "SERVICE_MATRIX_DELETION_GUARD_MISSING");
    check(String(step(repository, "run-hosted")?.run ?? "").includes("-RepositoryOnly"), "REPOSITORY_ONLY_SCAN_MODE_MISSING");
    const matrixFixtures = String(step(repository, "matrix-fixtures")?.run ?? "");
    check(matrixFixtures.includes("Test-ServiceMatrixWorkflow.mjs --fixtures")
      && matrixFixtures.includes("Test-ServiceMatrixWorkflow.mjs --ownership-fixtures"), "SERVICE_MATRIX_OWNERSHIP_CONTRACT_NOT_ENFORCED");
    validateServiceResultDownload(step(aggregate, "download-results"));
    validateServiceResultDownload(step(aggregate, "download-service-evidence"), {
      uses: serviceResultDownloadContract.uses,
      with: { ...serviceResultDownloadContract.with, pattern: "s002-service-evidence-*", path: "${{ runner.temp }}/s002-service-evidence" },
    });
    check(String(step(aggregate, "aggregate")?.run ?? "").includes("Aggregate-ServiceMatrixEvidence.mjs"), "SERVICE_MATRIX_COLLECTOR_MISSING");
    check(String(step(aggregate, "matrix-status")?.run ?? "").includes("MATRIX_RESULT"), "SERVICE_MATRIX_STATUS_CHECK_MISSING");
    const policy = jobs["release-policy"];
    check(policy.needs?.includes("supply-chain-verification") && policy.if === "needs.supply-chain-verification.result == 'success'", "POLICY_SEPARATION_INVALID: supply-chain.yml");
    check(String(step(policy, "Enforce separate release policy")?.run ?? "").includes("POLICY_STATE"), "BLOCKED_POLICY_INVALID: supply-chain.yml");
  }
  {
    const file = "security-freshness.yml";
    const jobs = workflows[file].jobs;
    check(Object.keys(jobs).sort().join("|") === ["resolve-services", "repository-security", "service-matrix", "security-freshness", "freshness-release-policy"].sort().join("|"), `FRESHNESS_JOB_SET_INVALID: ${file}`);
    const resolve = jobs["resolve-services"];
    check(step(resolve, "checkout")?.with?.ref === "${{ github.event.repository.default_branch }}", "FRESHNESS_DEFAULT_BRANCH_REF_INVALID");
    check(step(resolve, "list-services")?.run === "node scripts/migration/MonorepoRequiredChecks.mjs --list-services", "FRESHNESS_REGISTRY_SELECTOR_INVALID");
    check(String(step(resolve, "revision")?.run ?? "").includes("git rev-parse HEAD"), "FRESHNESS_EXECUTION_SHA_INVALID");
    const repository = jobs["repository-security"];
    check(String(step(repository, "run-hosted")?.run ?? "").includes("-WorkflowName security-freshness") && String(step(repository, "run-hosted")?.run ?? "").includes("-RepositoryOnly"), "FRESHNESS_REPOSITORY_SCAN_INVALID");
    const matrixFixtures = String(step(repository, "matrix-fixtures")?.run ?? "");
    check(matrixFixtures.includes("Test-ServiceMatrixWorkflow.mjs --freshness-fixtures")
      && matrixFixtures.includes("Test-ServiceMatrixWorkflow.mjs --ownership"), "FRESHNESS_OWNERSHIP_CONTRACT_NOT_ENFORCED");
    const matrix = jobs["service-matrix"];
    check(matrix.strategy?.matrix?.service === "${{ fromJSON(needs.resolve-services.outputs.services) }}", "FRESHNESS_MATRIX_SELECTOR_INVALID");
    check(String(step(matrix, "select-source")?.run ?? "").includes("SERVICE_SOURCE_REMOVED"), "FRESHNESS_DELETION_GUARD_MISSING");
    check(String(step(matrix, "maven-verify")?.run ?? "").includes("./mvnw -B verify"), "FRESHNESS_MAVEN_COMMAND_INVALID");
    check(String(step(matrix, "run-hosted")?.run ?? "").includes("-ServiceId $env:SERVICE_ID") && String(step(matrix, "run-hosted")?.run ?? "").includes("-CommitSha $env:EXECUTION_SHA"), "FRESHNESS_ARTIFACT_BINDING_INVALID");
    const aggregate = jobs["security-freshness"];
    check(aggregate.if === "always()" && aggregate.needs?.includes("resolve-services") && aggregate.needs?.includes("repository-security") && aggregate.needs?.includes("service-matrix"), "FRESHNESS_AGGREGATE_INVALID");
    validateServiceResultDownload(step(aggregate, "download-results"));
    validateServiceResultDownload(step(aggregate, "download-service-evidence"), {
      uses: serviceResultDownloadContract.uses,
      with: { ...serviceResultDownloadContract.with, pattern: "s002-service-evidence-*", path: "${{ runner.temp }}/s002-service-evidence" },
    });
    check(String(step(aggregate, "aggregate")?.run ?? "").includes("Aggregate-ServiceMatrixEvidence.mjs"), "FRESHNESS_COLLECTOR_MISSING");
    check(String(step(aggregate, "matrix-status")?.run ?? "").includes("MATRIX_RESULT"), "FRESHNESS_MATRIX_STATUS_CHECK_MISSING");
    const policy = jobs["freshness-release-policy"];
    check(policy.needs?.includes("security-freshness") && policy.if === "needs.security-freshness.result == 'success'", "FRESHNESS_POLICY_SEPARATION_INVALID");
    check(String(step(policy, "Enforce separate freshness release policy")?.run ?? "").includes("POLICY_STATE"), "FRESHNESS_BLOCKED_POLICY_INVALID");
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
  expectRejected("raw artifact path rejected", (w) => { w["supply-chain.yml"].jobs["repository-security"].steps.find((s) => s.id === "upload-evidence").with.path = "api/target"; });
  expectRejected("service matrix ownership fixture must stay in the hosted supply-chain workflow", (w) => { w["supply-chain.yml"].jobs["repository-security"].steps.find((s) => s.id === "matrix-fixtures").run = "node api/scripts/supply-chain/Test-ServiceMatrixWorkflow.mjs --fixtures"; });
  expectRejected("workflow ownership contract must stay in freshness checks", (w) => { w["security-freshness.yml"].jobs["repository-security"].steps.find((s) => s.id === "matrix-fixtures").run = "node api/scripts/supply-chain/Test-ServiceMatrixWorkflow.mjs --freshness-fixtures"; });
  expectRejected("stale API script path rejected", (w) => { w["supply-chain.yml"].jobs["repository-security"].steps.find((s) => s.id === "validate-contract").run = "node ./scripts/supply-chain/Test-HostedSupplyChainContract.mjs --repository-supply-chain"; });
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
