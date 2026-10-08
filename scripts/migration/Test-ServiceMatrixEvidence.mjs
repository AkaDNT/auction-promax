import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { aggregateServiceMatrixEvidence } from './Aggregate-ServiceMatrixEvidence.mjs';
import { writeServiceMatrixResult } from './ServiceMatrixResults.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const commit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
const names = ['container-vulnerability-inventory.json', 'gitleaks-inventory.json', 'image-identity.json', 'policy-summary.json', 'run-summary.json', 'smoke-summary.json', 'vulnerability-inventory.json'];
function fixture(policyState = 'PASS') {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'service-matrix-evidence-'));
  const results = path.join(base, 'results'); fs.mkdirSync(results);
  const evidence = path.join(base, 'evidence'); fs.mkdirSync(evidence);
  writeServiceMatrixResult({ serviceId: 'auction-service', result: 'success', outputDirectory: path.join(results, 'service-result-auction-service'), repositoryRoot: root });
  const serviceEvidence = path.join(evidence, 's002-service-evidence-auction-service'); fs.mkdirSync(serviceEvidence);
  const provenance = { kind: 'ephemeral-generated', executionCommit: commit, generatorCommit: commit, serviceId: 'auction-service' };
  for (const name of names) {
    const document = { schemaVersion: 2, serviceId: 'auction-service', variant: 'relational', commit, sourceProvenance: provenance, documentType: name.slice(0, -5) };
    if (name === 'run-summary.json') Object.assign(document, { executionState: 'PASS', policyState, reviewState: 'NOT_REQUIRED', deltaState: 'NOT_APPLICABLE', failureCode: 'NONE' });
    if (name === 'policy-summary.json') Object.assign(document, { policyState, reviewState: 'NOT_REQUIRED', deltaState: 'NOT_APPLICABLE', counts: {} });
    fs.writeFileSync(path.join(serviceEvidence, name), JSON.stringify(document));
  }
  return { base, results, evidence };
}

test('matrix evidence policy aggregation preserves execution PASS and propagates policy BLOCKED', () => {
  for (const [policyState, expected] of [['PASS', 'PASS'], ['BLOCKED', 'BLOCKED']]) {
    const item = fixture(policyState);
    try {
      const actual = aggregateServiceMatrixEvidence({ selectedServiceIds: ['auction-service'], commit, resultsDirectory: item.results, evidenceDirectory: item.evidence, repositoryPolicyState: 'PASS' });
      assert.equal(actual.policyState, expected);
    } finally { fs.rmSync(item.base, { recursive: true, force: true }); }
  }
});

test('matrix evidence rejects missing/extra artifacts, wrong revision and blocked execution', () => {
  const item = fixture();
  try {
    const extra = path.join(item.evidence, 's002-service-evidence-billing-service'); fs.mkdirSync(extra);
    assert.throws(() => aggregateServiceMatrixEvidence({ selectedServiceIds: ['auction-service'], commit, resultsDirectory: item.results, evidenceDirectory: item.evidence, repositoryPolicyState: 'PASS' }), { message: 'SERVICE_MATRIX_EVIDENCE_SET_INVALID' });
    fs.rmSync(extra, { recursive: true });
    fs.unlinkSync(path.join(item.evidence, 's002-service-evidence-auction-service', 'image-identity.json'));
    assert.throws(() => aggregateServiceMatrixEvidence({ selectedServiceIds: ['auction-service'], commit, resultsDirectory: item.results, evidenceDirectory: item.evidence, repositoryPolicyState: 'PASS' }), { message: 'SERVICE_MATRIX_EVIDENCE_FILESET_INVALID' });
  } finally { fs.rmSync(item.base, { recursive: true, force: true }); }
});

test('empty service selection requires no matrix artifacts but keeps repository policy state', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'service-matrix-empty-'));
  try {
    assert.deepEqual(aggregateServiceMatrixEvidence({ selectedServiceIds: [], commit, resultsDirectory: path.join(base, 'absent'), evidenceDirectory: path.join(base, 'absent-evidence'), repositoryPolicyState: 'BLOCKED' }).policyState, 'BLOCKED');
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});

test('empty service selection rejects unexpected evidence artifacts', () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'service-matrix-empty-extra-'));
  const evidence = path.join(base, 'evidence'); fs.mkdirSync(evidence);
  try {
    fs.mkdirSync(path.join(evidence, 'unexpected-artifact'));
    assert.throws(() => aggregateServiceMatrixEvidence({ selectedServiceIds: [], commit, resultsDirectory: path.join(base, 'absent'), evidenceDirectory: evidence, repositoryPolicyState: 'PASS' }), { message: 'SERVICE_MATRIX_EVIDENCE_SET_INVALID' });
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});
