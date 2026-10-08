import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from '../../contracts/node_modules/yaml/dist/index.js';
import { validateFreshnessMatrixWorkflow, validateServiceMatrixWorkflow, validateWorkflowOwnership } from './ServiceMatrixWorkflowContract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
function parse(text) {
  const document = YAML.parseDocument(text, { uniqueKeys: true, strict: true });
  if (document.errors.length || document.warnings.length) throw new Error('SERVICE_WORKFLOW_YAML_INVALID');
  return document.toJS({ maxAliasCount: 0 });
}
function load() { return parse(fs.readFileSync(path.join(root, '.github/workflows/supply-chain.yml'), 'utf8')); }
function loadFreshness() { return parse(fs.readFileSync(path.join(root, '.github/workflows/security-freshness.yml'), 'utf8')); }
function loadOwnership() {
  const read = (name) => parse(fs.readFileSync(path.join(root, '.github/workflows', name), 'utf8'));
  return {
    supplyChain: load(),
    freshness: loadFreshness(),
    apiBaseline: read('api-baseline.yml'),
    monorepo: read('monorepo-verification.yml'),
  };
}

function ownershipFixtures() {
  validateWorkflowOwnership(loadOwnership());
  const mutations = [
    ['API baseline must not own the service matrix', (set) => { set.apiBaseline.jobs['service-matrix'] = structuredClone(set.supplyChain.jobs['service-matrix']); }],
    ['monorepo workflow must not own a duplicate service matrix', (set) => { set.monorepo.jobs['service-matrix'] = structuredClone(set.supplyChain.jobs['service-matrix']); }],
    ['API baseline must not add a duplicate Maven verify', (set) => { set.apiBaseline.jobs['verify-identity-profile-service'].steps.push({ run: './mvnw -B verify' }); }],
    ['monorepo API gate must not add a duplicate Maven verify', (set) => { set.monorepo.jobs.api.steps.push({ run: './mvnw -B verify' }); }],
    ['monorepo required aggregate remains stable and unconditional', (set) => { set.monorepo.jobs['monorepo-required'].if = 'success()'; }],
  ];
  for (const [name, mutate] of mutations) {
    const candidate = loadOwnership();
    mutate(candidate);
    assert.throws(() => validateWorkflowOwnership(candidate), undefined, name);
    process.stdout.write(`[PASS] ${name}\n`);
  }
}

function fixtures() {
  const mutations = [
    ['mutable downloader pin', (workflow) => { workflow.jobs['supply-chain-verification'].steps.find((item) => item.id === 'download-results').uses = 'actions/download-artifact@v8'; }],
    ['merged result artifacts', (workflow) => { workflow.jobs['supply-chain-verification'].steps.find((item) => item.id === 'download-results').with['merge-multiple'] = true; }],
    ['PR source checkout', (workflow) => { workflow.jobs['service-matrix'].steps.find((item) => item.id === 'checkout').with.ref = '${{ github.event.pull_request.head.sha }}'; }],
    ['matrix aggregate must pin and verify execution SHA', (workflow) => { workflow.jobs['supply-chain-verification'].steps.find((item) => item.id === 'checkout').with.ref = 'migration/monorepo'; }],
    ['removed service may regenerate', (workflow) => { workflow.jobs['service-matrix'].steps.find((item) => item.id === 'select-source').run = 'node api/scripts/foundation/Generate-Service.mjs --service "$SERVICE_ID"'; }],
    ['missing exact Maven verify', (workflow) => { workflow.jobs['service-matrix'].steps.find((item) => item.id === 'maven-verify').run = 'mvn verify'; }],
    ['required Failsafe execution report proof is mandatory', (workflow) => { workflow.jobs['service-matrix'].steps.find((item) => item.id === 'failsafe-execution').run = 'echo tests'; }],
    ['preserved Identity skips generated-only conformance', (workflow) => { workflow.jobs['service-matrix'].steps.find((item) => item.id === 'generated-conformance').if = undefined; }],
    ['preserved Identity keeps the Failsafe runtime proof', (workflow) => { workflow.jobs['service-matrix'].steps.find((item) => item.id === 'failsafe-execution').if = "matrix.service != 'identity-profile-service'"; }],
    ['matrix result not always uploaded', (workflow) => { workflow.jobs['service-matrix'].steps.find((item) => item.id === 'upload-matrix-result').if = 'success()'; }],
    ['hosted supply-chain job omits ownership contract', (workflow) => { workflow.jobs['repository-security'].steps.find((item) => item.id === 'matrix-fixtures').run = 'node api/scripts/supply-chain/Test-ServiceMatrixWorkflow.mjs --fixtures'; }],
  ];
  for (const [name, mutate] of mutations) {
    const candidate = structuredClone(load());
    mutate(candidate);
    assert.throws(() => validateServiceMatrixWorkflow(candidate), undefined, name);
    process.stdout.write(`[PASS] ${name}\n`);
  }
}

function freshnessFixtures() {
  const mutations = [
    ['mutable freshness downloader', (workflow) => { workflow.jobs['security-freshness'].steps.find((item) => item.id === 'download-results').uses = 'actions/download-artifact@v8'; }],
    ['freshness pinned to event SHA', (workflow) => { workflow.jobs['service-matrix'].steps.find((item) => item.id === 'checkout').with.ref = '${{ github.sha }}'; }],
    ['freshness aggregate must pin and verify resolved SHA', (workflow) => { workflow.jobs['security-freshness'].steps.find((item) => item.id === 'checkout').with.ref = '${{ github.event.repository.default_branch }}'; }],
    ['freshness identity-only build', (workflow) => { workflow.jobs['service-matrix'].strategy.matrix.service = '${{ fromJSON(\'["identity-profile-service"]\') }}'; }],
    ['freshness service deletion regenerated', (workflow) => { workflow.jobs['service-matrix'].steps.find((item) => item.id === 'select-source').run = 'node api/scripts/foundation/Generate-Service.mjs'; }],
    ['freshness gates generated conformance by source provenance', (workflow) => { workflow.jobs['service-matrix'].steps.find((item) => item.id === 'generated-conformance').if = undefined; }],
    ['freshness keeps Identity Failsafe proof enabled', (workflow) => { workflow.jobs['service-matrix'].steps.find((item) => item.id === 'failsafe-execution').if = "matrix.service != 'identity-profile-service'"; }],
    ['hosted freshness job omits ownership contract', (workflow) => { workflow.jobs['repository-security'].steps.find((item) => item.id === 'matrix-fixtures').run = 'node api/scripts/supply-chain/Test-ServiceMatrixWorkflow.mjs --freshness-fixtures'; }],
  ];
  for (const [name, mutate] of mutations) {
    const candidate = structuredClone(loadFreshness());
    mutate(candidate);
    assert.throws(() => validateFreshnessMatrixWorkflow(candidate), undefined, name);
    process.stdout.write(`[PASS] ${name}\n`);
  }
}

if (process.argv.includes('--fixtures')) fixtures();
else if (process.argv.includes('--repository')) {
  validateServiceMatrixWorkflow(load());
  process.stdout.write('SERVICE_MATRIX_WORKFLOW_CONTRACT_PASS\n');
} else if (process.argv.includes('--freshness-fixtures')) freshnessFixtures();
else if (process.argv.includes('--freshness')) {
  validateFreshnessMatrixWorkflow(loadFreshness());
  process.stdout.write('FRESHNESS_MATRIX_WORKFLOW_CONTRACT_PASS\n');
} else if (process.argv.includes('--ownership-fixtures')) ownershipFixtures();
else if (process.argv.includes('--ownership')) {
  validateWorkflowOwnership(loadOwnership());
  process.stdout.write('SERVICE_MATRIX_OWNERSHIP_CONTRACT_PASS\n');
} else throw new Error('USAGE');
