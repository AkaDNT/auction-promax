import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { generateService, nativeGeneratorIo } from './ServiceGeneratorCore.mjs';
import { createServiceSourceBundle, validateServiceSourceBundle } from './ServiceSourceBundle.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const executionSha = 'a'.repeat(40);
const fixtureIo = {
  ...nativeGeneratorIo, findPublisher: () => 'fixture-publisher',
  publish: (_publisher, args) => {
    fs.renameSync(args[args.indexOf('-StagePath') + 1], args[args.indexOf('-DestinationPath') + 1]);
    return { status: 0, stdout: '', stderr: '' };
  },
};

function fixture(t, serviceId = 'auction-service') {
  const repositoryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'service-source-bundle-'));
  t.after(() => fs.rmSync(repositoryRoot, { recursive: true, force: true }));
  fs.cpSync(path.join(root, 'api/service-foundation'), path.join(repositoryRoot, 'api/service-foundation'), { recursive: true });
  fs.mkdirSync(path.join(repositoryRoot, 'api/services'), { recursive: true });
  generateService({ serviceId, repositoryRoot }, fixtureIo);
  return { repositoryRoot, serviceId, executionSha };
}

const sha256 = value => createHash('sha256').update(value).digest('hex');
function rehash(bundle) {
  bundle.bundleSha256 = sha256(JSON.stringify({ schemaVersion: bundle.schemaVersion,
    serviceId: bundle.serviceId, executionSha: bundle.executionSha, files: bundle.files }));
  return bundle;
}

for (const serviceId of ['auction-service', 'bidding-service', 'billing-service', 'realtime-gateway']) {
  test(`source bundle carries exact reviewed ${serviceId} bytes, modes and provenance`, t => {
    const input = fixture(t, serviceId);
    const bundle = createServiceSourceBundle(input);
    const result = validateServiceSourceBundle({ ...input, bundle });
    assert.deepEqual(result, bundle.files);
    assert.equal(bundle.executionSha, executionSha);
    assert.equal(bundle.schemaVersion, 1);
    assert.ok(result.length > 20);
    assert.equal(result.filter(item => item.mode === 0o755).length, 1);
    assert.equal(result.find(item => item.mode === 0o755).path, 'mvnw');
    for (const file of result) {
      assert.equal(file.sha256, sha256(file.contents));
      assert.equal(file.contents, fs.readFileSync(path.join(input.repositoryRoot, `api/services/${serviceId}`, file.path), 'utf8'));
      assert.ok(!file.path.includes('target/'));
    }
  });
}

test('bundle validation rejects forged identities, malformed structure and unsafe inventory', async t => {
  const input = fixture(t);
  const valid = createServiceSourceBundle(input);
  const cases = [
    ['wrong service', b => { b.serviceId = 'billing-service'; }],
    ['wrong revision', b => { b.executionSha = 'b'.repeat(40); }],
    ['zero revision', b => { b.executionSha = '0'.repeat(40); }],
    ['extra field', b => { b.privateLog = 'raw'; }],
    ['missing file', b => { b.files.pop(); }],
    ['extra build output', b => { b.files.push({ ...b.files[0], path: 'target/build.log' }); }],
    ['extra local config', b => { b.files.push({ ...b.files[0], path: '.env.local' }); }],
    ['duplicate path', b => { b.files[1].path = b.files[0].path; }],
    ['case alias', b => { b.files[1].path = b.files[0].path.toUpperCase(); }],
    ['traversal', b => { b.files[0].path = '../outside'; }],
    ['absolute path', b => { b.files[0].path = '/outside'; }],
    ['unknown mode', b => { b.files[0].mode = 0o777; }],
    ['wrong file hash', b => { b.files[0].sha256 = '1'.repeat(64); }],
    ['rehashed altered source', b => { b.files[0].contents += '\nmodified'; b.files[0].sha256 = sha256(b.files[0].contents); }],
    ['extra file field', b => { b.files[0].Secret = 'synthetic'; }],
    ['missing mode', b => { delete b.files[0].mode; }],
    ['unsorted files', b => { b.files.reverse(); }],
  ];
  for (const [name, mutate] of cases) await t.test(name, () => {
    const candidate = structuredClone(valid);
    mutate(candidate); rehash(candidate);
    assert.throws(() => validateServiceSourceBundle({ ...input, bundle: candidate }));
  });
  const corruptBundle = structuredClone(valid); corruptBundle.bundleSha256 = '2'.repeat(64);
  assert.throws(() => validateServiceSourceBundle({ ...input, bundle: corruptBundle }));
  for (const serviceId of ['identity-profile-service', 'unknown-service']) {
    assert.throws(() => createServiceSourceBundle({ ...input, serviceId }));
  }
});

test('export rejects altered generated source and unlisted files before bundling', async t => {
  const input = fixture(t);
  const project = path.join(input.repositoryRoot, 'api/services/auction-service');
  fs.appendFileSync(path.join(project, 'README.md'), '\nUnreviewed text');
  assert.throws(() => createServiceSourceBundle(input));
  const second = fixture(t, 'realtime-gateway');
  fs.writeFileSync(path.join(second.repositoryRoot, 'api/services/realtime-gateway/local.log'), 'raw');
  assert.throws(() => createServiceSourceBundle(second));
});

test('source links and invalid registry cannot become delivery artifacts', t => {
  const input = fixture(t);
  const project = path.join(input.repositoryRoot, 'api/services/auction-service');
  const linked = path.join(project, 'linked-source');
  fs.symlinkSync(project, linked, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => createServiceSourceBundle(input));
  fs.unlinkSync(linked);
  const registryPath = path.join(input.repositoryRoot, 'api/service-foundation/services.json');
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  registry.services.find(item => item.id === 'auction-service').destination = '../outside';
  fs.writeFileSync(registryPath, JSON.stringify(registry));
  assert.throws(() => createServiceSourceBundle(input));
});

test('export CLI refuses local invocation without producing a bundle', t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'service-source-cli-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const environment = { ...process.env, RUNNER_TEMP: temporary, GITHUB_ACTIONS: 'false' };
  const result = spawnSync(process.execPath, [path.join(root, 'api/scripts/foundation/Export-ServiceSource.mjs'),
    '--service', 'auction-service', '--commit', executionSha], { env: environment, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.equal(result.stderr.trim(), 'SERVICE_SOURCE_CI_REQUIRED');
  assert.deepEqual(fs.readdirSync(temporary), []);
});

test('hosted CLI exports once and rejects forged revisions and linked output', async t => {
  const input = fixture(t);
  const scripts = path.join(input.repositoryRoot, 'api/scripts/foundation');
  fs.mkdirSync(scripts, { recursive: true });
  for (const file of ['Export-ServiceSource.mjs', 'ServiceSourceBundle.mjs', 'ServiceGeneratorCore.mjs', 'GeneratedServiceConformance.mjs']) {
    fs.copyFileSync(path.join(root, 'api/scripts/foundation', file), path.join(scripts, file));
  }
  const git = args => {
    const result = spawnSync('git', ['-C', input.repositoryRoot, ...args], { encoding:'utf8' });
    assert.equal(result.status, 0, 'synthetic git fixture setup failed');
    return result.stdout.trim();
  };
  git(['init', '--quiet']);
  git(['add', 'api/service-foundation', 'api/scripts/foundation']);
  git(['-c', 'user.name=Source fixture', '-c', 'user.email=source-fixture@example.invalid',
    '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=.git/fixture-no-hooks', 'commit', '--quiet', '-m', 'Synthetic source fixture']);
  const revision = git(['rev-parse', 'HEAD']);
  const runnerTemp = path.join(input.repositoryRoot, 'runner-temp');
  fs.mkdirSync(runnerTemp);
  const run = (commit = revision, githubSha = revision, temporary = runnerTemp) => spawnSync(process.execPath,
    [path.join(scripts, 'Export-ServiceSource.mjs'), '--service', input.serviceId, '--commit', commit], {
      env:{ ...process.env, GITHUB_ACTIONS:'true', GITHUB_REPOSITORY:'AkaDNT/auction-promax', GITHUB_SHA:githubSha, RUNNER_TEMP:temporary },
      encoding:'utf8',
    });
  const succeeded = run();
  assert.equal(succeeded.status, 0, succeeded.stderr);
  const output = path.join(runnerTemp, 's002-service-source/auction-service/service-source.json');
  const exported = fs.readFileSync(output);
  validateServiceSourceBundle({ ...input, executionSha:revision, bundle:JSON.parse(exported.toString('utf8')) });
  assert.notEqual(run().status, 0, 'existing export cannot be overwritten');
  assert.ok(fs.readFileSync(output).equals(exported));
  const templateReadme = path.join(input.repositoryRoot, 'api/service-foundation/templates/common/README.md');
  const generatedReadme = path.join(input.repositoryRoot, 'api/services/auction-service/README.md');
  const templateOriginal = fs.readFileSync(templateReadme);
  const generatedOriginal = fs.readFileSync(generatedReadme);
  const dirtyTemp = path.join(input.repositoryRoot, 'dirty-runner-temp');
  fs.mkdirSync(dirtyTemp);
  fs.appendFileSync(templateReadme, '\nUncommitted matching change');
  fs.appendFileSync(generatedReadme, '\nUncommitted matching change');
  const dirty = run(revision, revision, dirtyTemp);
  assert.notEqual(dirty.status, 0, 'matching dirty template/source cannot claim the HEAD revision');
  assert.equal(dirty.stderr.trim(), 'SERVICE_SOURCE_INPUT_CHANGED');
  assert.deepEqual(fs.readdirSync(dirtyTemp), []);
  fs.writeFileSync(templateReadme, templateOriginal); fs.writeFileSync(generatedReadme, generatedOriginal);
  for (const result of [run('b'.repeat(40), 'b'.repeat(40)), run(revision, 'b'.repeat(40))]) {
    assert.notEqual(result.status, 0);
    assert.equal(result.stderr.trim(), 'SERVICE_SOURCE_REVISION_MISMATCH');
  }
  const linkedTemp = path.join(input.repositoryRoot, 'linked-runner-temp');
  const outside = path.join(input.repositoryRoot, 'outside-source-output');
  fs.mkdirSync(linkedTemp); fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(linkedTemp, 's002-service-source'), process.platform === 'win32' ? 'junction' : 'dir');
  const linked = run(revision, revision, linkedTemp);
  assert.notEqual(linked.status, 0);
  assert.equal(linked.stderr.trim(), 'SERVICE_SOURCE_OUTPUT_UNSAFE');
  assert.deepEqual(fs.readdirSync(outside), []);
});
