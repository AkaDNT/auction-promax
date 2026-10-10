import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readServiceMatrixResults } from './Validate-ServiceMatrixResults.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'api/service-foundation/services.json'), 'utf8'));
const catalog = new Map(registry.services.map((service) => [service.id, service]));
const evidenceFiles = [
  'container-vulnerability-inventory.json', 'gitleaks-inventory.json', 'image-identity.json',
  'policy-summary.json', 'run-summary.json', 'smoke-summary.json', 'vulnerability-inventory.json',
].sort();

function fail(code) { throw new Error(code); }
function ordinary(file, kind) {
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || (kind === 'file' ? !stat.isFile() : !stat.isDirectory()) || fs.realpathSync(file) !== path.resolve(file)) fail('SERVICE_MATRIX_EVIDENCE_PATH_UNSAFE');
}

export function aggregateServiceMatrixEvidence({ selectedServiceIds, commit, resultsDirectory, evidenceDirectory, repositoryPolicyState }) {
  if (!['PASS', 'BLOCKED'].includes(repositoryPolicyState)) fail('SERVICE_MATRIX_POLICY_STATE_INVALID');
  const result = readServiceMatrixResults({ selectedServiceIds, commit, directory: resultsDirectory });
  if (selectedServiceIds.length === 0) {
    try {
      ordinary(evidenceDirectory, 'directory');
      if (fs.readdirSync(evidenceDirectory).length !== 0) fail('SERVICE_MATRIX_EVIDENCE_SET_INVALID');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return { ...result, policyState: repositoryPolicyState };
  }
  ordinary(evidenceDirectory, 'directory');
  const actualArtifacts = fs.readdirSync(evidenceDirectory).sort();
  const expectedArtifacts = selectedServiceIds.map((id) => `s002-service-evidence-${id}`).sort();
  if (actualArtifacts.join('\0') !== expectedArtifacts.join('\0')) fail('SERVICE_MATRIX_EVIDENCE_SET_INVALID');
  let blocked = repositoryPolicyState === 'BLOCKED';
  for (const serviceId of selectedServiceIds) {
    const service = catalog.get(serviceId);
    if (!service) fail('SERVICE_MATRIX_SELECTION_INVALID');
    const directory = path.join(evidenceDirectory, `s002-service-evidence-${serviceId}`);
    ordinary(directory, 'directory');
    const names = fs.readdirSync(directory).sort();
    if (names.join('\0') !== evidenceFiles.join('\0')) fail('SERVICE_MATRIX_EVIDENCE_FILESET_INVALID');
    const documents = new Map();
    for (const name of evidenceFiles) {
      const file = path.join(directory, name);
      ordinary(file, 'file');
      let document;
      try { document = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { fail('SERVICE_MATRIX_EVIDENCE_INVALID'); }
      if (document.schemaVersion !== 2 || document.serviceId !== serviceId || document.variant !== service.variant
        || document.commit !== commit || !document.sourceProvenance || document.sourceProvenance.executionCommit !== commit
        || document.documentType !== name.slice(0, -'.json'.length)) fail('SERVICE_MATRIX_EVIDENCE_IDENTITY_MISMATCH');
      documents.set(name, document);
    }
    const provenance = JSON.stringify(documents.get('run-summary.json').sourceProvenance);
    if ([...documents.values()].some((document) => JSON.stringify(document.sourceProvenance) !== provenance)) fail('SERVICE_MATRIX_EVIDENCE_IDENTITY_MISMATCH');
    const execution = documents.get('run-summary.json');
    const policy = documents.get('policy-summary.json');
    if (execution.executionState !== 'PASS' || !['PASS', 'BLOCKED'].includes(execution.policyState)
      || policy.policyState !== execution.policyState || !['PASS', 'BLOCKED'].includes(policy.policyState)) fail('SERVICE_MATRIX_EVIDENCE_STATE_INVALID');
    blocked ||= policy.policyState === 'BLOCKED';
  }
  return { ...result, policyState: blocked ? 'BLOCKED' : 'PASS' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const values = new Map();
    const allowed = new Set(['--services', '--commit', '--results-dir', '--evidence-dir', '--repository-policy']);
    const args = process.argv.slice(2);
    for (let index = 0; index < args.length; index += 2) {
      const key = args[index]; const value = args[index + 1];
      if (!allowed.has(key) || !value || values.has(key)) fail('USAGE');
      values.set(key, value);
    }
    if (values.size !== allowed.size) fail('USAGE');
    const result = aggregateServiceMatrixEvidence({
      selectedServiceIds: JSON.parse(values.get('--services')),
      commit: values.get('--commit'),
      resultsDirectory: values.get('--results-dir'),
      evidenceDirectory: values.get('--evidence-dir'),
      repositoryPolicyState: values.get('--repository-policy'),
    });
    if (!['PASS', 'BLOCKED'].includes(result.policyState)) fail('SERVICE_MATRIX_POLICY_STATE_INVALID');
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `policy_state=${result.policyState}\n`);
    process.stdout.write(`SERVICE_MATRIX_AGGREGATION_PASS services=${result.serviceIds.length} policy=${result.policyState}\n`);
  } catch (error) {
    process.stderr.write(`${/^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'SERVICE_MATRIX_AGGREGATION_FAILED'}\n`);
    process.exitCode = 1;
  }
}
