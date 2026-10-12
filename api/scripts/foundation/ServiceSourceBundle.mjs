import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { validateRegistry, validateInventory, expandLiteral, nativeGeneratorIo } from './ServiceGeneratorCore.mjs';
import { validateGeneratedService } from './GeneratedServiceConformance.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const fail = code => { throw new Error(code); };
const exactKeys = (value, keys) => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

function expectedFiles({ serviceId, executionSha, repositoryRoot }) {
  if (typeof executionSha !== 'string' || !/^[0-9a-f]{40}$/.test(executionSha) || /^0+$/.test(executionSha)) fail('SERVICE_SOURCE_REVISION_INVALID');
  const record = validateRegistry(repositoryRoot).get(serviceId);
  if (!record || record.preserved) fail('SERVICE_SOURCE_IDENTITY_INVALID');
  const values = {
    __SERVICE_ID__: record.id, __PACKAGE_NAME__: record.packageName,
    __PACKAGE_PATH__: record.packageName.replaceAll('.', '/'), __ENTRY_CLASS__: record.entryClass,
  };
  if (record.variant === 'relational') Object.assign(values, {
    __DB_NAME__: record.database, __TEST_DB_NAME__: record.testDatabase,
    __SCHEMA_NAME__: record.schema, __ENV_PREFIX__: record.environmentPrefix,
  });
  return validateInventory(repositoryRoot).filter(entry => entry.variants.includes(record.variant)).map(entry => {
    const contents = expandLiteral(nativeGeneratorIo.readTemplate(
      path.join(repositoryRoot, 'api/service-foundation', ...entry.source.split('/'))), values, entry.source);
    return { path: expandLiteral(entry.destination, values), mode: entry.mode, sha256: sha256(contents), contents };
  }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

function bundleDigest(bundle) {
  return sha256(JSON.stringify({ schemaVersion: bundle.schemaVersion, serviceId: bundle.serviceId,
    executionSha: bundle.executionSha, files: bundle.files }));
}

export function validateServiceSourceBundle({ bundle, serviceId, executionSha, repositoryRoot }) {
  const expected = expectedFiles({ serviceId, executionSha, repositoryRoot });
  if (!exactKeys(bundle, ['schemaVersion', 'serviceId', 'executionSha', 'files', 'bundleSha256'])
      || bundle.schemaVersion !== 1 || bundle.serviceId !== serviceId || bundle.executionSha !== executionSha
      || !Array.isArray(bundle.files) || bundle.files.length !== expected.length
      || typeof bundle.bundleSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(bundle.bundleSha256)) fail('SERVICE_SOURCE_BUNDLE_INVALID');
  for (let index = 0; index < expected.length; index++) {
    const actual = bundle.files[index];
    const wanted = expected[index];
    if (!exactKeys(actual, ['path', 'mode', 'sha256', 'contents']) || actual.path !== wanted.path
        || actual.mode !== wanted.mode || typeof actual.contents !== 'string'
        || actual.contents !== wanted.contents || actual.sha256 !== wanted.sha256
        || actual.sha256 !== sha256(actual.contents)) fail('SERVICE_SOURCE_FILE_INVALID');
  }
  if (bundle.bundleSha256 !== bundleDigest(bundle)) fail('SERVICE_SOURCE_DIGEST_INVALID');
  return bundle.files.map(file => ({ ...file }));
}

export function createServiceSourceBundle({ serviceId, executionSha, repositoryRoot }) {
  const files = expectedFiles({ serviceId, executionSha, repositoryRoot });
  validateGeneratedService({ serviceId, repositoryRoot });
  const record = validateRegistry(repositoryRoot).get(serviceId);
  const project = path.join(repositoryRoot, ...record.destination.split('/'));
  for (const item of files) {
    const filename = path.join(project, ...item.path.split('/'));
    if (!fs.readFileSync(filename).equals(Buffer.from(item.contents, 'utf8'))) fail('SERVICE_SOURCE_FILE_INVALID');
    if (process.platform !== 'win32' && (fs.lstatSync(filename).mode & 0o777) !== item.mode) fail('SERVICE_SOURCE_MODE_INVALID');
  }
  const bundle = { schemaVersion: 1, serviceId, executionSha, files };
  bundle.bundleSha256 = bundleDigest(bundle);
  validateServiceSourceBundle({ bundle, serviceId, executionSha, repositoryRoot });
  return bundle;
}
