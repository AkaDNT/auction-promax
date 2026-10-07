import { randomBytes } from 'node:crypto';
import {
  closeSync,
  chmodSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIRECTORY = path.dirname(SCRIPT_PATH);
const MODULE_REPOSITORY_ROOT = path.resolve(SCRIPT_DIRECTORY, '../../..');
const RECORD_KEYS = [
  'id', 'variant', 'preserved', 'groupId', 'artifactId', 'version', 'packageName',
  'entryClass', 'destination', 'database', 'testDatabase', 'schema', 'environmentPrefix',
];
const EXPECTED_RECORDS = [
  ['identity-profile-service', 'relational', true, 'com.auctionpromax', 'identity-profile-service', '0.0.1-SNAPSHOT', 'com.auctionpromax.identityprofileservice', 'IdentityProfileServiceApplication', 'api/services/identity-profile-service', 'identity_db', 'identity_test_db', 'identity', 'IDENTITY'],
  ['auction-service', 'relational', false, 'com.auctionpromax', 'auction-service', '0.0.1-SNAPSHOT', 'com.auctionpromax.auctionservice', 'AuctionServiceApplication', 'api/services/auction-service', 'auction_db', 'auction_test_db', 'auction', 'AUCTION'],
  ['bidding-service', 'relational', false, 'com.auctionpromax', 'bidding-service', '0.0.1-SNAPSHOT', 'com.auctionpromax.biddingservice', 'BiddingServiceApplication', 'api/services/bidding-service', 'bidding_db', 'bidding_test_db', 'bidding', 'BIDDING'],
  ['billing-service', 'relational', false, 'com.auctionpromax', 'billing-service', '0.0.1-SNAPSHOT', 'com.auctionpromax.billingservice', 'BillingServiceApplication', 'api/services/billing-service', 'billing_db', 'billing_test_db', 'billing', 'BILLING'],
  ['realtime-gateway', 'gateway', false, 'com.auctionpromax', 'realtime-gateway', '0.0.1-SNAPSHOT', 'com.auctionpromax.realtimegateway', 'RealtimeGatewayApplication', 'api/services/realtime-gateway', null, null, null, null],
];
const EXPECTED_IDS = EXPECTED_RECORDS.map(([id]) => id);
const ALLOWED_TOKENS = new Set([
  '__SERVICE_ID__', '__PACKAGE_NAME__', '__PACKAGE_PATH__', '__ENTRY_CLASS__',
  '__DB_NAME__', '__TEST_DB_NAME__', '__SCHEMA_NAME__', '__ENV_PREFIX__',
]);
const RESERVED_WINDOWS_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL', ...Array.from({ length: 9 }, (_, i) => `COM${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `LPT${i + 1}`),
]);

function fail(code) {
  throw new Error(code);
}

function hasExactKeys(value, expected) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === expected.length
    && expected.every(key => Object.hasOwn(value, key));
}

function assertNoLinkedAncestors(absolutePath) {
  const parsed = path.parse(absolutePath);
  let cursor = parsed.root;
  const rest = absolutePath.slice(parsed.root.length).split(path.sep).filter(Boolean);
  for (const part of rest) {
    cursor = path.join(cursor, part);
    let stat;
    try { stat = lstatSync(cursor); } catch { fail('PATH_UNSAFE'); }
    if (stat.isSymbolicLink() || (stat.mode & 0o170000) === 0o120000) fail('LINK_REJECTED');
    if (process.platform === 'win32' && (stat.attributes & 0x400) !== 0) fail('LINK_REJECTED');
  }
}

function canonicalRepositoryRoot(repositoryRoot) {
  if (typeof repositoryRoot !== 'string' || repositoryRoot.length === 0 || !path.isAbsolute(repositoryRoot)) {
    fail('INPUT_INVALID');
  }
  assertNoLinkedAncestors(path.resolve(repositoryRoot));
  let canonical;
  try { canonical = realpathSync(repositoryRoot); } catch { fail('PATH_UNSAFE'); }
  let stat;
  try { stat = lstatSync(canonical); } catch { fail('PATH_UNSAFE'); }
  if (!stat.isDirectory()) fail('PATH_UNSAFE');
  return canonical;
}

function validateRegistry(repositoryRoot) {
  const filename = path.join(repositoryRoot, 'api/service-foundation/services.json');
  assertNoLinkedAncestors(filename);
  let registryStat;
  try { registryStat = lstatSync(filename); } catch { fail('REGISTRY_INVALID'); }
  if (!registryStat.isFile() || registryStat.isSymbolicLink()
      || (process.platform === 'win32' && (registryStat.attributes & 0x400) !== 0)) fail('LINK_REJECTED');
  let parsed;
  try { parsed = JSON.parse(readFileSync(filename, 'utf8')); } catch { fail('REGISTRY_INVALID'); }
  if (!hasExactKeys(parsed, ['schemaVersion', 'services']) || parsed.schemaVersion !== 1
      || !Array.isArray(parsed.services) || parsed.services.length !== EXPECTED_RECORDS.length) {
    fail('REGISTRY_INVALID');
  }

  const byId = new Map();
  for (const record of parsed.services) {
    if (!hasExactKeys(record, RECORD_KEYS) || typeof record.id !== 'string' || byId.has(record.id)) {
      fail('REGISTRY_INVALID');
    }
    byId.set(record.id, record);
  }
  if (EXPECTED_IDS.some(id => !byId.has(id))) fail('REGISTRY_INVALID');

  for (const expected of EXPECTED_RECORDS) {
    const record = byId.get(expected[0]);
    if (RECORD_KEYS.some((key, index) => record[key] !== expected[index])) fail('REGISTRY_INVALID');
  }
  return byId;
}

function validateRelativePath(value, code) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\\') || value.startsWith('/')
      || /^[A-Za-z]:/.test(value) || value.includes(':') || value.endsWith('/')
      || value.split('/').some(part => part === '' || part === '.' || part === '..'
        || part.endsWith('.') || part.endsWith(' ')
        || RESERVED_WINDOWS_NAMES.has(part.split('.')[0].toUpperCase()))) {
    fail(code);
  }
  return value;
}

export function validateInventory(repositoryRoot) {
  const filename = path.join(repositoryRoot, 'api/service-foundation/template-files.json');
  assertNoLinkedAncestors(filename);
  let inventoryStat;
  try { inventoryStat = lstatSync(filename); } catch { fail('INVENTORY_INVALID'); }
  if (!inventoryStat.isFile() || inventoryStat.isSymbolicLink()
      || (process.platform === 'win32' && (inventoryStat.attributes & 0x400) !== 0)) fail('LINK_REJECTED');
  let inventory;
  try { inventory = JSON.parse(readFileSync(filename, 'utf8')); } catch { fail('INVENTORY_INVALID'); }
  if (!hasExactKeys(inventory, ['schemaVersion', 'files']) || inventory.schemaVersion !== 1
      || !Array.isArray(inventory.files) || inventory.files.length === 0) fail('INVENTORY_INVALID');

  const sources = new Set();
  const sourceFolded = new Set();
  const destinationsByVariant = new Map([['relational', new Set()], ['gateway', new Set()]]);
  const entries = [];
  for (const entry of inventory.files) {
    if (!hasExactKeys(entry, ['source', 'destination', 'variants', 'mode', 'provenance'])
        || !Array.isArray(entry.variants) || entry.variants.length === 0
        || typeof entry.provenance !== 'string' || entry.provenance.length === 0
        || ![0o644, 0o755].includes(entry.mode)) fail('INVENTORY_INVALID');
    const source = validateRelativePath(entry.source, 'INVENTORY_INVALID');
    const destination = validateRelativePath(entry.destination, 'INVENTORY_INVALID');
    if (!source.startsWith('templates/')) fail('INVENTORY_INVALID');
    const expectedMode = destination === 'mvnw' ? 0o755 : 0o644;
    if (entry.mode !== expectedMode) fail('INVENTORY_INVALID');
    const sourceKey = source.toLowerCase();
    if (sources.has(source) || sourceFolded.has(sourceKey)) fail('INVENTORY_INVALID');
    sources.add(source);
    sourceFolded.add(sourceKey);
    const uniqueVariants = new Set(entry.variants);
    if (uniqueVariants.size !== entry.variants.length || entry.variants.some(value => !['relational', 'gateway'].includes(value))) {
      fail('INVENTORY_INVALID');
    }
    for (const variant of uniqueVariants) {
      const outputPaths = destinationsByVariant.get(variant);
      const folded = destination.toLowerCase();
      if (outputPaths.has(folded)) fail('INVENTORY_INVALID');
      outputPaths.add(folded);
    }
    entries.push(entry);
  }

  const templateRoot = path.join(repositoryRoot, 'api/service-foundation/templates');
  let templateRootStat;
  try { templateRootStat = lstatSync(templateRoot); } catch { fail('INVENTORY_INVALID'); }
  if (!templateRootStat.isDirectory() || templateRootStat.isSymbolicLink()) fail('LINK_REJECTED');
  assertNoLinkedAncestors(templateRoot);
  const actualSources = [];
  function enumerate(directory, relativeDirectory) {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const relative = relativeDirectory ? `${relativeDirectory}/${item.name}` : item.name;
      const absolute = path.join(directory, item.name);
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink() || (process.platform === 'win32' && (stat.attributes & 0x400) !== 0)) fail('LINK_REJECTED');
      if (item.isDirectory()) enumerate(absolute, relative);
      else if (item.isFile()) actualSources.push(`templates/${relative}`);
      else fail('INVENTORY_INVALID');
    }
  }
  enumerate(templateRoot, '');
  actualSources.sort();
  const registeredSources = [...sources].sort();
  if (actualSources.length !== registeredSources.length
      || actualSources.some((source, index) => source !== registeredSources[index])) fail('INVENTORY_INVALID');
  return entries;
}

function tokenValues(record) {
  const values = {
    __SERVICE_ID__: record.id,
    __PACKAGE_NAME__: record.packageName,
    __PACKAGE_PATH__: record.packageName.replaceAll('.', '/'),
    __ENTRY_CLASS__: record.entryClass,
  };
  if (record.variant === 'relational') {
    values.__DB_NAME__ = record.database;
    values.__TEST_DB_NAME__ = record.testDatabase;
    values.__SCHEMA_NAME__ = record.schema;
    values.__ENV_PREFIX__ = record.environmentPrefix;
  }
  for (const [token, value] of Object.entries(values)) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(value)) fail('INPUT_INVALID');
    if (token === '__SERVICE_ID__' && !/^[a-z][a-z0-9-]{0,62}$/.test(value)) fail('INPUT_INVALID');
  }
  return values;
}

export function expandLiteral(source, values, sourcePath = '') {
  const wrapperPassThrough = sourcePath === 'templates/common/mvnw.cmd'
    ? new Set(['__MVNW_ARG0_NAME__', '__MVNW_CMD__', '__MVNW_ERROR__']) : new Set();
  const recognized = [...ALLOWED_TOKENS, ...wrapperPassThrough]
    .sort((left, right) => right.length - left.length)
    .map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const recognizedPattern = new RegExp(recognized.join('|'), 'g');
  const expanded = source.replace(recognizedPattern, token => {
    if (wrapperPassThrough.has(token)) return token;
    if (!Object.hasOwn(values, token)) fail('TOKEN_UNRESOLVED');
    return values[token];
  });
  const remainingTokens = expanded.match(/__[A-Za-z][A-Za-z0-9_]*__/g) ?? [];
  if (remainingTokens.some(token => !wrapperPassThrough.has(token))) fail('TOKEN_UNKNOWN');
  return expanded;
}

function readTemplate(absolute) {
  let stat;
  try { stat = lstatSync(absolute); } catch { fail('INVENTORY_INVALID'); }
  if (!stat.isFile() || stat.isSymbolicLink() || (process.platform === 'win32' && (stat.attributes & 0x400) !== 0)) {
    fail('LINK_REJECTED');
  }
  const bytes = readFileSync(absolute);
  if (bytes.includes(0) || (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)) {
    fail('INVENTORY_INVALID');
  }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { fail('INVENTORY_INVALID'); }
  text = text.replace(/\r\n/g, '\n');
  if (text.includes('\r')) fail('INVENTORY_INVALID');
  return text;
}

function assertNoDestinationOrCaseAlias(servicesRoot, destination) {
  const desiredName = path.basename(destination);
  for (const entry of readdirSync(servicesRoot, { withFileTypes: true })) {
    if (entry.name.toLowerCase() === desiredName.toLowerCase()) {
      const absolute = path.join(servicesRoot, entry.name);
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink() || (process.platform === 'win32' && (stat.attributes & 0x400) !== 0)) fail('LINK_REJECTED');
      fail('DESTINATION_EXISTS');
    }
  }
}

function findPublisher() {
  const candidates = process.platform === 'win32' ? ['pwsh.exe', 'pwsh', 'powershell.exe'] : ['pwsh'];
  for (const executable of candidates) {
    const probe = spawnSync(executable, ['-NoProfile', '-NonInteractive', '-Command', 'exit 0'], { encoding: 'utf8' });
    if (!probe.error && probe.status === 0) return executable;
    if (probe.error?.code === 'EACCES') return null;
  }
  return null;
}

function safeRemoveOwnedStage(stage, servicesRoot, identity, parentIdentity) {
  try {
    assertNoLinkedAncestors(servicesRoot);
    if (realpathSync(servicesRoot) !== servicesRoot) return;
    const parent = lstatSync(servicesRoot);
    if (parent.dev !== parentIdentity.dev || parent.ino !== parentIdentity.ino) return;
    const stat = lstatSync(stage);
    if (stat.isDirectory() && !stat.isSymbolicLink()
        && identity && stat.dev === identity.dev && stat.ino === identity.ino
        && path.dirname(stage) === servicesRoot
        && path.basename(stage).startsWith('.foundation-stage-')) rmSync(stage, { recursive: true, force: false });
  } catch { /* Cleanup is best-effort and never broadens beyond the owned stage path. */ }
}

export function inspectGenerationArtifacts(repositoryRoot) {
  const root = canonicalRepositoryRoot(repositoryRoot);
  const servicesRoot = path.join(root, 'api/services');
  assertNoLinkedAncestors(servicesRoot);
  return readdirSync(servicesRoot).filter(name => name === '.foundation-generation.lock'
    || /^\.foundation-stage-[0-9a-f]{32}$/.test(name)).sort()
    .map(name => `api/services/${name}`);
}

// Internal IO seam for deterministic fault tests; the public CLI/API never accepts it.
export const nativeGeneratorIo = Object.freeze({ readTemplate, writeFileSync, findPublisher, publish: spawnSync });

export function generateService({ serviceId, repositoryRoot }, io = nativeGeneratorIo) {
  const root = canonicalRepositoryRoot(repositoryRoot);
  if (typeof serviceId !== 'string') fail('INPUT_INVALID');
  const records = validateRegistry(root);
  const record = records.get(serviceId);
  if (!record) fail('SERVICE_UNKNOWN');
  if (record.preserved) fail('SERVICE_PRESERVED');

  const inventory = validateInventory(root);
  const values = tokenValues(record);
  const selected = inventory.filter(entry => entry.variants.includes(record.variant));
  const rendered = selected.map(entry => {
    const source = validateRelativePath(entry.source, 'INVENTORY_INVALID');
    const destination = validateRelativePath(expandLiteral(entry.destination, values), 'PATH_UNSAFE');
    const contents = expandLiteral(io.readTemplate(path.join(root, 'api/service-foundation', ...source.split('/'))), values, source);
    return { source, destination, mode: entry.mode, contents };
  }).sort((left, right) => left.destination < right.destination ? -1 : left.destination > right.destination ? 1 : 0);

  const seenOutputs = new Set();
  for (const item of rendered) {
    const folded = item.destination.toLowerCase();
    if (seenOutputs.has(folded)) fail('INVENTORY_INVALID');
    seenOutputs.add(folded);
  }

  const servicesRelative = path.join('api', 'services');
  const servicesRoot = path.join(root, servicesRelative);
  let servicesStat;
  try { servicesStat = lstatSync(servicesRoot); } catch { fail('PATH_UNSAFE'); }
  if (!servicesStat.isDirectory() || servicesStat.isSymbolicLink()) fail('LINK_REJECTED');
  assertNoLinkedAncestors(servicesRoot);
  const destination = path.join(root, ...record.destination.split('/'));
  assertNoDestinationOrCaseAlias(servicesRoot, destination);

  if (inspectGenerationArtifacts(root).length !== 0) fail('GENERATION_INTERRUPTED');

  const publisher = io.findPublisher();
  if (!publisher) fail('PUBLISH_BACKEND_UNAVAILABLE');

  const lockPath = path.join(servicesRoot, '.foundation-generation.lock');
  const lockNonce = `${process.pid}-${randomBytes(16).toString('hex')}`;
  let lockHandle;
  let lockIdentity;
  try {
    lockHandle = openSync(lockPath, 'wx', 0o600);
    lockIdentity = lstatSync(lockPath);
    writeFileSync(lockHandle, lockNonce, 'utf8');
  } catch (error) {
    if (lockHandle !== undefined) {
      try { closeSync(lockHandle); } catch { /* Preserve original failure. */ }
      try {
        assertNoLinkedAncestors(servicesRoot);
        const stat = lstatSync(lockPath);
        if (lockIdentity && stat.dev === lockIdentity.dev && stat.ino === lockIdentity.ino) rmSync(lockPath);
      } catch { /* Uncertain ownership leaves the artifact for explicit inspection. */ }
    }
    if (error.code === 'EEXIST') fail('GENERATION_INTERRUPTED');
    fail('PUBLICATION_FAILED');
  }

  const stageName = `.foundation-stage-${cryptoRandomId()}`;
  const stage = path.join(servicesRoot, stageName);
  let stageCreated = false;
  let stageIdentity;
  const assertOwnedBoundary = () => {
    assertNoLinkedAncestors(servicesRoot);
    const currentParent = lstatSync(servicesRoot);
    const currentStage = lstatSync(stage);
    if (currentParent.dev !== servicesStat.dev || currentParent.ino !== servicesStat.ino
        || !stageIdentity || currentStage.dev !== stageIdentity.dev || currentStage.ino !== stageIdentity.ino
        || !currentStage.isDirectory() || currentStage.isSymbolicLink()) fail('PATH_UNSAFE');
  };
  try {
    mkdirSync(stage, { mode: 0o700 });
    stageCreated = true;
    stageIdentity = lstatSync(stage);
    for (const item of rendered) {
      assertOwnedBoundary();
      const target = path.join(stage, ...item.destination.split('/'));
      const parent = path.dirname(target);
      mkdirSync(parent, { recursive: true, mode: 0o755 });
      io.writeFileSync(target, item.contents, { encoding: 'utf8', flag: 'wx', mode: item.mode });
      assertOwnedBoundary();
      chmodSync(target, item.mode);
    }
    for (const item of rendered) {
      const target = path.join(stage, ...item.destination.split('/'));
      const stat = lstatSync(target);
      if (!stat.isFile() || stat.isSymbolicLink()) fail('PUBLICATION_FAILED');
      if (readFileSync(target, 'utf8') !== item.contents) fail('PUBLICATION_FAILED');
      if (process.platform !== 'win32' && (stat.mode & 0o777) !== item.mode) fail('PUBLICATION_FAILED');
    }

    const args = [
      '-NoProfile', '-NonInteractive', '-File', path.join(SCRIPT_DIRECTORY, 'Publish-ServiceDirectory.ps1'),
      '-StagePath', stage, '-DestinationPath', destination, '-ServicesRoot', servicesRoot,
    ];
    assertOwnedBoundary();
    assertNoLinkedAncestors(stage);
    assertNoDestinationOrCaseAlias(servicesRoot, destination);
    const result = io.publish(publisher, args, { encoding: 'utf8', windowsHide: true });
    if (result.error) fail('PUBLICATION_FAILED');
    if (result.status !== 0) {
      const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
      const code = ['PATH_UNSAFE', 'LINK_REJECTED', 'DESTINATION_EXISTS', 'PUBLICATION_FAILED'].find(item => output.includes(item));
      fail(code ?? 'PUBLICATION_FAILED');
    }
    stageCreated = false;
    return { serviceId: record.id, variant: record.variant, files: rendered.map(item => item.destination) };
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (/^[A-Z_]+$/.test(code)) throw error;
    fail('PUBLICATION_FAILED');
  } finally {
    if (stageCreated) safeRemoveOwnedStage(stage, servicesRoot, stageIdentity, servicesStat);
    try { closeSync(lockHandle); } catch { /* closed handle cleanup is idempotent */ }
    try {
      assertNoLinkedAncestors(servicesRoot);
      const lockStat = lstatSync(lockPath);
      if (lockStat.isFile() && !lockStat.isSymbolicLink()
          && lockStat.dev === lockIdentity.dev && lockStat.ino === lockIdentity.ino
          && readFileSync(lockPath, 'utf8') === lockNonce) rmSync(lockPath, { force: true });
    } catch { /* Never remove an unowned or replaced lock. */ }
  }
}

function cryptoRandomId() {
  return randomBytes(16).toString('hex');
}
