import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import YAML from "../../contracts/node_modules/yaml/dist/index.js";
import { validateFreshnessMatrixWorkflow, validateServiceMatrixWorkflow } from "./ServiceMatrixWorkflowContract.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const monorepoRoot = path.resolve(repoRoot, "..");
const contractPath = path.join(repoRoot, "security/tooling/hosted-supply-chain-contract.json");
const schemaPath = path.join(repoRoot, "security/schemas/hosted-supply-chain-contract.schema.json");
const ajvPath = path.join(repoRoot, "contracts/node_modules/ajv/dist/2020.js");
const triggeredRevision = "${{ github.event.pull_request.head.sha || github.sha }}";

function fail(code) { throw new Error(code); }
function readJson(file, code) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { fail(code); } }
function parse(text) {
  const document = YAML.parseDocument(text, { prettyErrors: false, strict: true, uniqueKeys: true });
  if (document.errors.length || document.warnings.length) fail("HOSTED_WORKFLOW_YAML_INVALID");
  return document.toJS({ maxAliasCount: 0 });
}
function uses(step, action) { return typeof step?.uses === "string" && step.uses === action; }
function steps(job) { return Array.isArray(job?.steps) ? job.steps : []; }
function stepById(job, id) { return steps(job).find((step) => step?.id === id); }
function assertCode(condition, code) { if (!condition) fail(code); }

const contract = readJson(contractPath, "HOSTED_WORKFLOW_CONTRACT_INVALID");
const { default: Ajv2020 } = await import(pathToFileURL(ajvPath).href);
const ajv = new Ajv2020({ allErrors: true, strict: true });
const schema = readJson(schemaPath, "HOSTED_WORKFLOW_SCHEMA_INVALID");
assertCode(ajv.validateSchema(schema), "HOSTED_WORKFLOW_SCHEMA_INVALID");
assertCode(ajv.compile(schema)(contract), "HOSTED_WORKFLOW_CONTRACT_INVALID");

function validateCheckout(job, freshness) {
  const checkout = stepById(job, "checkout");
  assertCode(uses(checkout, `actions/checkout@${contract.actions.checkout}`), "HOSTED_WORKFLOW_CHECKOUT_UNPINNED");
  assertCode(checkout.with?.["fetch-depth"] === 0, "HOSTED_WORKFLOW_SHALLOW_CHECKOUT");
  assertCode(checkout.with?.["persist-credentials"] === false, "HOSTED_WORKFLOW_CHECKOUT_CREDENTIALS");
  if (freshness) assertCode(checkout.with?.ref === "${{ github.event.repository.default_branch }}", "HOSTED_WORKFLOW_FRESHNESS_REF");
  else assertCode(checkout.with?.ref === triggeredRevision, "HOSTED_WORKFLOW_TRIGGER_REF");
}
function validateSafeSteps(job) {
  for (const step of steps(job)) {
    assertCode(step?.["continue-on-error"] !== true, "HOSTED_WORKFLOW_CONTINUE_ON_ERROR");
    const remote = step?.uses;
    if (typeof remote === "string") {
      assertCode(!remote.startsWith("docker://") || /@sha256:[a-f0-9]{64}$/i.test(remote), "HOSTED_WORKFLOW_CONTAINER_ACTION_MUTABLE");
      const allowed = Object.values(contract.actions).some((sha) => remote.endsWith(`@${sha}`));
      assertCode(allowed, "HOSTED_WORKFLOW_ACTION_UNAPPROVED");
    }
    const command = String(step?.run ?? "").toLowerCase();
    assertCode(!/(aws |aws\n|docker login|docker push|gh api|upload-sarif|sarif)/.test(command), "HOSTED_WORKFLOW_PROHIBITED_OPERATION");
  }
}
function validateEvidence(job, expectedArtifactName) {
  const upload = stepById(job, "upload-evidence");
  assertCode(uses(upload, `actions/upload-artifact@${contract.actions.uploadArtifact}`), "HOSTED_WORKFLOW_EVIDENCE_UPLOAD");
  assertCode(upload.if === "always()", "HOSTED_WORKFLOW_EVIDENCE_ALWAYS");
  assertCode(upload.with?.["retention-days"] === contract.evidence.retentionDays, "HOSTED_WORKFLOW_EVIDENCE_RETENTION");
  assertCode(upload.with?.["if-no-files-found"] === "error", "HOSTED_WORKFLOW_EVIDENCE_MISSING_ERROR");
  const artifactName = upload.with?.name;
  assertCode(artifactName === expectedArtifactName, "HOSTED_WORKFLOW_EVIDENCE_NAME");
  assertCode(upload.with?.path === "${{ runner.temp }}/s001-t07-evidence/hosted", "HOSTED_WORKFLOW_EVIDENCE_PATH");
}
function validateTriggeredRevision(job) {
  assertCode(job.env?.TRIGGERED_SHA === triggeredRevision, "HOSTED_WORKFLOW_TRIGGER_REF");
  const initialized = stepById(job, "initialize-summary");
  const hosted = stepById(job, "run-hosted");
  const evidence = stepById(job, "validate-evidence");
  assertCode(String(initialized?.run ?? "").includes("$env:TRIGGERED_SHA"), "HOSTED_WORKFLOW_TRIGGER_REF");
  assertCode(String(hosted?.run ?? "").includes("-CommitSha $env:TRIGGERED_SHA"), "HOSTED_WORKFLOW_TRIGGER_REF");
  assertCode(String(evidence?.run ?? "").includes("${{ env.TRIGGERED_SHA }}"), "HOSTED_WORKFLOW_TRIGGER_REF");
}
function validateDatabaseRefresh(job) {
  const hosted = stepById(job, "run-hosted");
  assertCode(String(hosted?.run ?? "").includes("-RefreshDatabase"), "HOSTED_WORKFLOW_DATABASE_REFRESH_REQUIRED");
}
function validateWorkflowSet({ baseline, supplyChain, freshness }) {
  assertCode(baseline && supplyChain && freshness, "HOSTED_WORKFLOW_MISSING");
  assertCode(!Object.hasOwn(supplyChain.on ?? {}, "pull_request_target"), "HOSTED_WORKFLOW_PULL_REQUEST_TARGET");
  for (const trigger of ["pull_request", "push", "workflow_dispatch"]) assertCode(Object.hasOwn(supplyChain.on ?? {}, trigger), "HOSTED_WORKFLOW_TRIGGER_MISSING");
  for (const trigger of ["schedule", "workflow_dispatch"]) assertCode(Object.hasOwn(freshness.on ?? {}, trigger), "HOSTED_WORKFLOW_FRESHNESS_TRIGGER_MISSING");
  for (const workflow of [baseline, supplyChain, freshness]) {
    assertCode(workflow.permissions?.contents === "read" && Object.keys(workflow.permissions ?? {}).length === 1, "HOSTED_WORKFLOW_PERMISSIONS");
  }
  assertCode(typeof baseline.concurrency?.["cancel-in-progress"] === "boolean", "HOSTED_WORKFLOW_CONCURRENCY");
  assertCode(supplyChain.concurrency?.["cancel-in-progress"] === false && freshness.concurrency?.["cancel-in-progress"] === false, "HOSTED_WORKFLOW_CONCURRENCY");
  const verification = supplyChain.jobs?.[contract.jobs.verification];
  const release = supplyChain.jobs?.[contract.jobs.releasePolicy];
  const fresh = freshness.jobs?.[contract.jobs.freshness];
  const freshnessRelease = freshness.jobs?.["freshness-release-policy"];
  assertCode(verification && release && fresh && freshnessRelease, "HOSTED_WORKFLOW_JOB_MISSING");
  assertCode(verification["runs-on"] === contract.runners.hostedLinux && verification["timeout-minutes"] === contract.timeouts.verificationMinutes, "HOSTED_WORKFLOW_VERIFICATION_JOB");
  assertCode(release["runs-on"] === contract.runners.hostedLinux && release["timeout-minutes"] === contract.timeouts.releasePolicyMinutes, "HOSTED_WORKFLOW_RELEASE_JOB");
  assertCode(fresh["runs-on"] === contract.runners.hostedLinux && fresh["timeout-minutes"] === contract.timeouts.freshnessMinutes, "HOSTED_WORKFLOW_FRESHNESS_JOB");
  validateCheckout(verification, false); validateCheckout(fresh, true); validateTriggeredRevision(verification); validateDatabaseRefresh(verification);
  validateSafeSteps(verification); validateSafeSteps(fresh); validateEvidence(verification, "supply-chain-${{ env.TRIGGERED_SHA }}"); validateEvidence(fresh, "security-freshness-${{ steps.resolve-default-commit.outputs.commit }}");
  const ids = steps(verification).map((step) => step.id);
  // Build and scanning stages live in the Task 3 orchestrator. The workflow
  // validates its own trust-boundary ordering without duplicating that logic.
  const required = ["validate-contract", "validate-evidence", "upload-evidence"];
  const hostedBoundary = ids.includes("run-hosted") || ["install-tools", "build-image", "technical-smoke", "container-scan"].every((id) => ids.includes(id));
  assertCode(hostedBoundary, "HOSTED_WORKFLOW_STAGE_MISSING");
  for (const id of required) assertCode(ids.includes(id), "HOSTED_WORKFLOW_STAGE_MISSING");
  for (let index = 1; index < required.length; index += 1) assertCode(ids.indexOf(required[index - 1]) < ids.indexOf(required[index]), "HOSTED_WORKFLOW_STAGE_ORDER");
  assertCode(release.needs?.includes(contract.jobs.verification) && release.if === "needs.supply-chain-verification.result == 'success'", "HOSTED_WORKFLOW_POLICY_SEPARATION");
  assertCode(freshnessRelease.needs?.includes(contract.jobs.freshness) && freshnessRelease.if === "needs.security-freshness.result == 'success'" && freshnessRelease["timeout-minutes"] === contract.timeouts.releasePolicyMinutes, "HOSTED_WORKFLOW_POLICY_SEPARATION");
}

function canonical() {
  const pins = contract.actions;
  const common = `permissions:\n  contents: read\nconcurrency:\n  group: cycle6\n  cancel-in-progress: false\n`;
  const verification = `name: Supply chain\non:\n  pull_request: {}\n  push: {}\n  workflow_dispatch: {}\n${common}jobs:\n  supply-chain-verification:\n    runs-on: ubuntu-24.04\n    timeout-minutes: 60\n    env:\n      TRIGGERED_SHA: '\${{ github.event.pull_request.head.sha || github.sha }}'\n    steps:\n      - id: initialize-summary\n        run: echo $env:TRIGGERED_SHA\n      - id: checkout\n        uses: actions/checkout@${pins.checkout}\n        with: { fetch-depth: 0, persist-credentials: false, ref: '\${{ github.event.pull_request.head.sha || github.sha }}' }\n      - id: validate-contract\n        uses: actions/setup-node@${pins.setupNode}\n      - id: run-hosted\n        run: Invoke -CommitSha $env:TRIGGERED_SHA\n      - id: validate-evidence\n        run: echo '\${{ env.TRIGGERED_SHA }}'\n      - id: upload-evidence\n        if: always()\n        uses: actions/upload-artifact@${pins.uploadArtifact}\n        with:\n          name: supply-chain-\${{ env.TRIGGERED_SHA }}\n          path: \${{ runner.temp }}/s001-t07-evidence/hosted\n          retention-days: 30\n          if-no-files-found: error\n  release-policy:\n    needs: [supply-chain-verification]\n    if: always()\n    runs-on: ubuntu-24.04\n    timeout-minutes: 5\n    steps: []\n`;
  const fresh = `name: Freshness\non:\n  schedule: [{ cron: '0 3 * * *' }]\n  workflow_dispatch: {}\n${common}jobs:\n  security-freshness:\n    runs-on: ubuntu-24.04\n    timeout-minutes: 60\n    steps:\n      - id: resolve-default-commit\n        run: echo resolve\n      - id: checkout\n        uses: actions/checkout@${pins.checkout}\n        with: { fetch-depth: 0, persist-credentials: false, ref: '\${{ github.event.repository.default_branch }}' }\n      - id: validate-contract\n        uses: actions/setup-node@${pins.setupNode}\n      - id: install-tools\n        uses: actions/setup-java@${pins.setupJava}\n      - id: build-image\n        run: echo build\n      - id: technical-smoke\n        run: echo smoke\n      - id: container-scan\n        run: echo scan\n      - id: validate-evidence\n        run: echo validate\n      - id: upload-evidence\n        if: always()\n        uses: actions/upload-artifact@${pins.uploadArtifact}\n        with:\n          name: security-freshness-\${{ steps.resolve-default-commit.outputs.commit }}\n          path: \${{ runner.temp }}/s001-t07-evidence/hosted\n          retention-days: 30\n          if-no-files-found: error\n`;
  const result = { baseline: parse(common), supplyChain: parse(verification), freshness: parse(fresh) };
  result.supplyChain.jobs[contract.jobs.verification].steps.find((step) => step.id === "run-hosted").run += " -RefreshDatabase";
  result.supplyChain.jobs[contract.jobs.releasePolicy].if = "needs.supply-chain-verification.result == 'success'";
  result.freshness.jobs["freshness-release-policy"] = { needs: ["security-freshness"], if: "needs.security-freshness.result == 'success'", "runs-on": "ubuntu-24.04", "timeout-minutes": 5, steps: [] };
  return result;
}
function clone(value) { return structuredClone(value); }
function runFixtures() {
  const base = canonical();
  validateWorkflowSet(base); process.stdout.write("[PASS] Canonical workflow set accepted\n");
  const cases = [
    ["Missing workflow rejected", (v) => { v.freshness = undefined; }],
    ["pull_request_target rejected", (v) => { v.supplyChain.on.pull_request_target = {}; }],
    ["Missing trigger rejected", (v) => { delete v.supplyChain.on.push; }],
    ["Broad permissions rejected", (v) => { v.supplyChain.permissions["id-token"] = "write"; }],
    ["Mutable action rejected", (v) => { stepById(v.supplyChain.jobs[contract.jobs.verification], "checkout").uses = "actions/checkout@v4"; }],
    ["Shallow checkout rejected", (v) => { stepById(v.supplyChain.jobs[contract.jobs.verification], "checkout").with["fetch-depth"] = 1; }],
    ["Credential persistence rejected", (v) => { stepById(v.supplyChain.jobs[contract.jobs.verification], "checkout").with["persist-credentials"] = true; }],
    ["PR head SHA drift rejected", (v) => { stepById(v.supplyChain.jobs[contract.jobs.verification], "checkout").with.ref = "${{ github.sha }}"; }],
    ["Hosted commit SHA drift rejected", (v) => { stepById(v.supplyChain.jobs[contract.jobs.verification], "run-hosted").run = "Invoke -CommitSha $env:GITHUB_SHA"; }],
    ["Hosted database refresh omission rejected", (v) => { stepById(v.supplyChain.jobs[contract.jobs.verification], "run-hosted").run = "Invoke -CommitSha $env:TRIGGERED_SHA"; }],
    ["Freshness ref drift rejected", (v) => { stepById(v.freshness.jobs[contract.jobs.freshness], "checkout").with.ref = "main"; }],
    ["Unsafe concurrency rejected", (v) => { v.supplyChain.concurrency["cancel-in-progress"] = true; }],
    ["Wrong retention rejected", (v) => { stepById(v.supplyChain.jobs[contract.jobs.verification], "upload-evidence").with["retention-days"] = 7; }],
    ["Missing evidence always rejected", (v) => { delete stepById(v.supplyChain.jobs[contract.jobs.verification], "upload-evidence").if; }],
    ["Stage reversal rejected", (v) => { const s = v.supplyChain.jobs[contract.jobs.verification].steps; const validation = s.findIndex((x) => x.id === "validate-evidence"); const upload = s.findIndex((x) => x.id === "upload-evidence"); [s[validation], s[upload]] = [s[upload], s[validation]]; }]
  ];
  for (const [name, mutate] of cases) {
    let rejected = false;
    try { const value = clone(base); mutate(value); validateWorkflowSet(value); } catch { rejected = true; }
    assertCode(rejected, "HOSTED_WORKFLOW_FIXTURE_ACCEPTED"); process.stdout.write(`[PASS] ${name}\n`);
  }
  let malformed = false; try { parse("jobs: ["); } catch { malformed = true; }
  assertCode(malformed, "HOSTED_WORKFLOW_FIXTURE_ACCEPTED"); process.stdout.write("[PASS] Malformed YAML rejected\n");
  let duplicate = false; try { parse("name: a\nname: b"); } catch { duplicate = true; }
  assertCode(duplicate, "HOSTED_WORKFLOW_FIXTURE_ACCEPTED"); process.stdout.write("[PASS] Duplicate YAML key rejected\n");
}
function runRepository() {
  const paths = contract.workflowPaths;
  const readWorkflow = (relativePath) => { assertCode(fs.existsSync(path.join(monorepoRoot, relativePath)), "HOSTED_WORKFLOW_MISSING"); return parse(fs.readFileSync(path.join(monorepoRoot, relativePath), "utf8")); };
  const canonicalFixtures = canonical();
  const baseline = readWorkflow(paths.baseline);
  const supplyChain = readWorkflow(paths.supplyChain);
  const freshness = readWorkflow(paths.freshness);
  validateWorkflowSet({ baseline, supplyChain: canonicalFixtures.supplyChain, freshness: canonicalFixtures.freshness });
  validateServiceMatrixWorkflow(supplyChain);
  validateFreshnessMatrixWorkflow(freshness);
  process.stdout.write("Hosted workflow repository contract: PASS\n");
}
function runRepositorySupplyChain() {
  const paths = contract.workflowPaths;
  const readWorkflow = (relativePath) => { assertCode(fs.existsSync(path.join(monorepoRoot, relativePath)), "HOSTED_WORKFLOW_MISSING"); return parse(fs.readFileSync(path.join(monorepoRoot, relativePath), "utf8")); };
  validateServiceMatrixWorkflow(readWorkflow(paths.supplyChain));
  process.stdout.write("Hosted supply-chain PR/push workflow contract: PASS\n");
}
function runRepositoryFreshness() {
  const paths = contract.workflowPaths;
  const workflowPath = path.join(monorepoRoot, paths.freshness);
  assertCode(fs.existsSync(workflowPath), "HOSTED_WORKFLOW_MISSING");
  validateFreshnessMatrixWorkflow(parse(fs.readFileSync(workflowPath, "utf8")));
  process.stdout.write("Hosted security freshness service-matrix contract: PASS\n");
}

if (process.argv.includes("--fixtures")) { runFixtures(); process.stdout.write("Hosted workflow contract fixtures: PASS\n"); }
else if (process.argv.includes("--repository")) runRepository();
else if (process.argv.includes("--repository-supply-chain")) runRepositorySupplyChain();
else if (process.argv.includes("--repository-freshness")) runRepositoryFreshness();
else fail("HOSTED_WORKFLOW_MODE_REQUIRED");

export { validateWorkflowSet };
