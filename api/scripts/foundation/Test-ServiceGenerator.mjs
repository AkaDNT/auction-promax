import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { generateService } from './Generate-Service.mjs';
import { generateService as generateWithIo, nativeGeneratorIo, inspectGenerationArtifacts, findPublisher } from './ServiceGeneratorCore.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../../..');
const foundationRoot = path.join(repositoryRoot, 'api/service-foundation');
const temporaryRoots = [];

test('publisher discovery continues to the next approved host when PowerShell 7 cannot launch', { skip: process.platform !== 'win32' }, () => {
  const calls = [];
  const selected = findPublisher((executable) => {
    calls.push(executable);
    return executable === 'powershell.exe'
      ? { status: 0 }
      : { status: null, error: Object.assign(new Error('access denied'), { code: 'EACCES' }) };
  });
  assert.equal(selected, 'powershell.exe');
  assert.deepEqual(calls, ['pwsh.exe', 'pwsh', 'powershell.exe']);
});

async function newRepositoryFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'service-generator-fixture-'));
  temporaryRoots.push(root);
  await mkdir(path.join(root, 'api'), { recursive: true });
  await cp(foundationRoot, path.join(root, 'api/service-foundation'), { recursive: true });
  await mkdir(path.join(root, 'api/services'), { recursive: true });
  return root;
}

async function snapshotTree(root) {
  const result = [];
  async function visit(relativeDirectory) {
    const absoluteDirectory = path.join(root, relativeDirectory);
    let names;
    try {
      names = await readdir(absoluteDirectory, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    names.sort((left, right) => left.name.localeCompare(right.name, 'en'));
    for (const entry of names) {
      const relativePath = path.posix.join(relativeDirectory.split(path.sep).join('/'), entry.name);
      const absolutePath = path.join(root, ...relativePath.split('/'));
      if (entry.isDirectory()) await visit(path.join(relativeDirectory, entry.name));
      else if (entry.isFile()) {
        result.push([relativePath, createHash('sha256').update(await readFile(absolutePath)).digest('hex')]);
      } else {
        result.push([relativePath, `type:${entry.isSymbolicLink() ? 'link' : 'other'}`]);
      }
    }
  }
  await visit('api/services');
  return result;
}

async function generatedHashes(root, serviceId, files) {
  const serviceRoot = path.join(root, 'api/services', serviceId);
  const pairs = [];
  for (const relativePath of files) {
    const bytes = await readFile(path.join(serviceRoot, ...relativePath.split('/')));
    pairs.push([relativePath, createHash('sha256').update(bytes).digest('hex')]);
  }
  return pairs;
}

test('relational and gateway generation are deterministic complete LF UTF-8 trees', async (t) => {
  for (const serviceId of ['auction-service', 'bidding-service', 'billing-service', 'realtime-gateway']) {
    await t.test(serviceId, async () => {
      const firstRoot = await newRepositoryFixture();
      const secondRoot = await newRepositoryFixture();
      const priorUmask = process.platform === 'win32' ? null : process.umask(0o077);
      let first;
      try { first = generateService({ serviceId, repositoryRoot: firstRoot }); }
      finally { if (priorUmask !== null) process.umask(priorUmask); }
      const second = await generateService({ serviceId, repositoryRoot: secondRoot });

      assert.deepEqual(first.files, [...first.files].sort());
      assert.deepEqual(first.files, second.files);
      assert.deepEqual((await snapshotTree(firstRoot)).map(([name]) => name.slice(`api/services/${serviceId}/`.length)).sort(), first.files);
      assert.deepEqual(await generatedHashes(firstRoot, first.serviceId, first.files),
        await generatedHashes(secondRoot, second.serviceId, second.files));
      assert.equal(first.files.filter(file => file === 'pom.xml').length, 1);
      assert.equal(first.files.filter(file => file === 'src/main/resources/application-local.yaml').length, 1);
      if (serviceId === 'realtime-gateway') assert.equal(first.variant, 'gateway');
      else assert.equal(first.variant, 'relational');

      for (const relativePath of first.files) {
        const bytes = await readFile(path.join(firstRoot, 'api/services', first.serviceId, ...relativePath.split('/')));
        assert.equal(bytes.includes(0x0d), false, `${relativePath} contains CR`);
        assert.equal(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf, false, `${relativePath} has BOM`);
        const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        const remainingTokens = [...new Set(content.match(/__[A-Z][A-Z0-9_]*__/g) ?? [])].sort();
        assert.deepEqual(remainingTokens, relativePath === 'mvnw.cmd'
          ? ['__MVNW_ARG0_NAME__', '__MVNW_CMD__', '__MVNW_ERROR__'] : [],
          `${relativePath} has unexpected unresolved tokens`);
        const expectedMode = relativePath === 'mvnw' ? 0o755 : 0o644;
        if (process.platform !== 'win32') assert.equal(((await lstat(path.join(firstRoot, 'api/services', first.serviceId, ...relativePath.split('/')))).mode & 0o777), expectedMode,
          `${relativePath} mode`);
      }
    });
  }
});

test('unknown and preserved identifiers fail before creating service output', async () => {
  const root = await newRepositoryFixture();
  const before = await snapshotTree(root);
  assert.throws(() => generateService({ serviceId: 'auction-admin', repositoryRoot: root }),
    { message: 'SERVICE_UNKNOWN' });
  assert.throws(() => generateService({ serviceId: 'identity-profile-service', repositoryRoot: root }),
    { message: 'SERVICE_PRESERVED' });
  assert.deepEqual(await snapshotTree(root), before);
});

test('missing publication backend fails before creating staging or lock', async () => {
  const root = await newRepositoryFixture();
  assert.throws(() => generateWithIo({ serviceId: 'auction-service', repositoryRoot: root },
    { ...nativeGeneratorIo, findPublisher: () => null }), { message: 'PUBLISH_BACKEND_UNAVAILABLE' });
  assert.deepEqual(await readdir(path.join(root, 'api/services')), []);
});

test('variant mismatch, traversal and selected-output case collision fail before writes', async (t) => {
  for (const kind of ['variant', 'traversal', 'case-collision']) await t.test(kind, async () => {
    const root = await newRepositoryFixture();
    const relative = kind === 'variant' ? 'services.json' : 'template-files.json';
    const file = path.join(root, 'api/service-foundation', relative);
    const value = JSON.parse(await readFile(file, 'utf8'));
    if (kind === 'variant') value.services.find(service => service.id === 'auction-service').variant = 'gateway';
    if (kind === 'traversal') value.files[0].destination = '../escaped.txt';
    if (kind === 'case-collision') value.files.find(entry => entry.destination === 'README.md').destination = 'MVNW';
    await writeFile(file, JSON.stringify(value));
    assert.throws(() => generateService({ serviceId: 'auction-service', repositoryRoot: root }),
      { message: kind === 'variant' ? 'REGISTRY_INVALID' : 'INVENTORY_INVALID' });
    assert.deepEqual(await readdir(path.join(root, 'api/services')), []);
  });
});

test('render, staged-write and pre-publication faults never publish partial output', async (t) => {
  for (const point of ['render', 'write', 'publish']) await t.test(point, async () => {
    const root = await newRepositoryFixture();
    let writes = 0;
    const io = { ...nativeGeneratorIo, findPublisher: () => 'fixture-publisher' };
    if (point === 'render') io.readTemplate = () => { throw new Error('TOKEN_UNKNOWN'); };
    if (point === 'write') io.writeFileSync = (...args) => {
      if (++writes === 2) throw new Error('injected operational failure');
      return nativeGeneratorIo.writeFileSync(...args);
    };
    if (point === 'publish') io.publish = () => { throw new Error('injected process failure'); };
    assert.throws(() => generateWithIo({ serviceId: 'auction-service', repositoryRoot: root }, io),
      { message: point === 'render' ? 'TOKEN_UNKNOWN' : 'PUBLICATION_FAILED' });
    assert.deepEqual(await snapshotTree(root), []);
    assert.deepEqual(await readdir(path.join(root, 'api/services')), []);
  });
});

test('late destination materialization preserves owner data and cleans only owned staging', async (t) => {
  for (const kind of ['empty', 'nonempty', 'file']) await t.test(kind, async () => {
    const root = await newRepositoryFixture();
    const destination = path.join(root, 'api/services/auction-service');
    const io = { ...nativeGeneratorIo, findPublisher: () => 'fixture-publisher', publish: () => {
      if (kind === 'file') writeFileSync(destination, 'owner-file');
      else {
        mkdirSync(destination);
        if (kind === 'nonempty') writeFileSync(path.join(destination, 'owner.txt'), 'owner-tree');
      }
      return { status: 1, stdout: 'DESTINATION_EXISTS', stderr: '' };
    } };
    assert.throws(() => generateWithIo({ serviceId: 'auction-service', repositoryRoot: root }, io), { message: 'DESTINATION_EXISTS' });
    assert.deepEqual(await readdir(path.join(root, 'api/services')), ['auction-service']);
    if (kind === 'empty') assert.deepEqual(await readdir(destination), []);
    if (kind === 'file') assert.equal(await readFile(destination, 'utf8'), 'owner-file');
    if (kind === 'nonempty') assert.equal(await readFile(path.join(destination, 'owner.txt'), 'utf8'), 'owner-tree');
  });
});

test('replacement of staging boundary is rejected without deleting another owners stage or lock', async () => {
  const root = await newRepositoryFixture();
  const services = path.join(root, 'api/services');
  let replacementStage;
  let changed = false;
  const io = { ...nativeGeneratorIo, findPublisher: () => 'fixture-publisher', writeFileSync: (target, ...args) => {
    nativeGeneratorIo.writeFileSync(target, ...args);
    if (!changed) {
      changed = true;
      replacementStage = path.join(services, path.relative(services, target).split(path.sep)[0]);
      if (process.platform === 'win32') renameSync(replacementStage, path.join(root, 'api/displaced-stage'));
      else renameSync(services, path.join(root, 'api/displaced-services'));
      mkdirSync(replacementStage, { recursive: true });
      writeFileSync(path.join(replacementStage, 'owner.txt'), 'unrelated-stage');
      writeFileSync(path.join(services, '.foundation-generation.lock'), 'other-owner');
    }
  } };
  assert.throws(() => generateWithIo({ serviceId: 'auction-service', repositoryRoot: root }, io), { message: 'PATH_UNSAFE' });
  assert.equal(await readFile(path.join(replacementStage, 'owner.txt'), 'utf8'), 'unrelated-stage');
  assert.equal(await readFile(path.join(services, '.foundation-generation.lock'), 'utf8'), 'other-owner');
});

test('orphan inspection returns sanitized relative paths and never removes artifacts', async () => {
  const root = await newRepositoryFixture();
  const stage = '.foundation-stage-' + 'a'.repeat(32);
  await mkdir(path.join(root, 'api/services', stage));
  await writeFile(path.join(root, 'api/services', stage, 'owner.txt'), 'orphan');
  await writeFile(path.join(root, 'api/services/.foundation-generation.lock'), 'owner');
  assert.deepEqual(inspectGenerationArtifacts(root), ['api/services/.foundation-generation.lock', `api/services/${stage}`]);
  assert.throws(() => generateService({ serviceId: 'auction-service', repositoryRoot: root }), { message: 'GENERATION_INTERRUPTED' });
  assert.equal(await readFile(path.join(root, 'api/services', stage, 'owner.txt'), 'utf8'), 'orphan');
});

test('a second cooperating generator is rejected while the first owns its lock', async () => {
  const root = await newRepositoryFixture();
  let attempts = 0;
  const io = { ...nativeGeneratorIo, publish: (...args) => {
    attempts++;
    assert.throws(() => generateService({ serviceId: 'auction-service', repositoryRoot: root }), { message: 'GENERATION_INTERRUPTED' });
    return nativeGeneratorIo.publish(...args);
  } };
  const result = generateWithIo({ serviceId: 'auction-service', repositoryRoot: root }, io);
  assert.equal(attempts, 1);
  const independentRoot = await newRepositoryFixture();
  const independent = generateService({ serviceId: 'auction-service', repositoryRoot: independentRoot });
  assert.deepEqual(await generatedHashes(root, result.serviceId, result.files),
    await generatedHashes(independentRoot, independent.serviceId, independent.files));
  assert.deepEqual(await readdir(path.join(root, 'api/services')), ['auction-service']);
});

test('two generator processes publish exactly one complete deterministic service', async () => {
  const root = await newRepositoryFixture();
  const moduleUrl = new URL('./Generate-Service.mjs', import.meta.url).href;
  const source = `import(${JSON.stringify(moduleUrl)}).then(({generateService}) => {
    try { console.log(JSON.stringify(generateService({serviceId:'auction-service',repositoryRoot:process.env.SERVICE_FIXTURE_ROOT}))); }
    catch(error) { console.log(error.message); process.exitCode=1; }
  });`;
  function launch() {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['-e', source], { env: { ...process.env, SERVICE_FIXTURE_ROOT: root }, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', data => { stdout += data; });
      child.stderr.on('data', data => { stderr += data; });
      child.on('error', reject);
      child.on('close', code => resolve({ code, stdout: stdout.trim(), stderr }));
    });
  }
  const results = await Promise.all([launch(), launch()]);
  assert.equal(results.filter(result => result.code === 0).length, 1);
  const rejected = results.find(result => result.code !== 0);
  assert.ok(['GENERATION_INTERRUPTED', 'DESTINATION_EXISTS'].includes(rejected.stdout), rejected.stdout);
  assert.equal(rejected.stderr, '');
  const winner = JSON.parse(results.find(result => result.code === 0).stdout);
  const referenceRoot = await newRepositoryFixture();
  const reference = generateService({ serviceId: 'auction-service', repositoryRoot: referenceRoot });
  assert.deepEqual(await generatedHashes(root, winner.serviceId, winner.files),
    await generatedHashes(referenceRoot, reference.serviceId, reference.files));
  assert.deepEqual(await readdir(path.join(root, 'api/services')), ['auction-service']);
});

test('invalid registry fails closed before any service write', async () => {
  const root = await newRepositoryFixture();
  const registryPath = path.join(root, 'api/service-foundation/services.json');
  const registry = JSON.parse(await readFile(registryPath, 'utf8'));
  registry.services[1].database = 'other_db';
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  const before = await snapshotTree(root);

  assert.throws(() => generateService({ serviceId: 'auction-service', repositoryRoot: root }),
    { message: 'REGISTRY_INVALID' });
  assert.deepEqual(await snapshotTree(root), before);
});

test('preserves only the three native Maven Wrapper command placeholders in mvnw.cmd', async () => {
  const root = await newRepositoryFixture();
  const result = await generateService({ serviceId: 'auction-service', repositoryRoot: root });
  const wrapper = await readFile(path.join(root, 'api/services/auction-service/mvnw.cmd'), 'utf8');
  assert.ok(result.files.includes('mvnw.cmd'));
  assert.match(wrapper, /__MVNW_ARG0_NAME__/);
  assert.match(wrapper, /__MVNW_CMD__/);
});

test('unknown template placeholders still fail closed', async () => {
  const root = await newRepositoryFixture();
  const template = path.join(root, 'api/service-foundation/templates/common/README.md');
  const original = await readFile(template, 'utf8');
  await writeFile(template, `${original}\n__UNAPPROVED_TOKEN__\n`);
  assert.throws(() => generateService({ serviceId: 'auction-service', repositoryRoot: root }),
    { message: 'TOKEN_UNKNOWN' });
});

test('unknown mixed-case placeholders fail closed in ordinary templates and mvnw.cmd', async (t) => {
  for (const [relative, token] of [
    ['templates/common/README.md', '__unapproved_token__'],
    ['templates/common/mvnw.cmd', '__Mvnw_Unapproved__'],
  ]) await t.test(relative, async () => {
    const root = await newRepositoryFixture();
    const template = path.join(root, 'api/service-foundation', relative);
    const original = await readFile(template, 'utf8');
    await writeFile(template, `${original}\n${token}\n`);
    assert.throws(() => generateService({ serviceId: 'auction-service', repositoryRoot: root }),
      { message: 'TOKEN_UNKNOWN' });
  });
});

test('existing empty, nonempty and file destinations remain byte-for-byte untouched', async (t) => {
  for (const kind of ['empty-directory', 'nonempty-directory', 'file']) {
    await t.test(kind, async () => {
      const root = await newRepositoryFixture();
      const destination = path.join(root, 'api/services/auction-service');
      if (kind === 'file') await writeFile(destination, 'owner-file');
      else {
        await mkdir(destination);
        if (kind === 'nonempty-directory') await writeFile(path.join(destination, 'owner.txt'), 'owner-tree');
      }
      const before = await snapshotTree(root);
      assert.throws(() => generateService({ serviceId: 'auction-service', repositoryRoot: root }),
        { message: 'DESTINATION_EXISTS' });
      assert.deepEqual(await snapshotTree(root), before);
    });
  }
});

test('destination case aliases and linked destinations are rejected without mutation', async (t) => {
  const aliasRoot = await newRepositoryFixture();
  await mkdir(path.join(aliasRoot, 'api/services/AUCTION-SERVICE'));
  await writeFile(path.join(aliasRoot, 'api/services/AUCTION-SERVICE/owner.txt'), 'keep-me');
  const aliasBefore = await snapshotTree(aliasRoot);
  assert.throws(() => generateService({ serviceId: 'auction-service', repositoryRoot: aliasRoot }),
    { message: 'DESTINATION_EXISTS' });
  assert.deepEqual(await snapshotTree(aliasRoot), aliasBefore);

  await t.test('directory link', async () => {
    const root = await newRepositoryFixture();
    const outside = await mkdtemp(path.join(os.tmpdir(), 'service-generator-outside-'));
    temporaryRoots.push(outside);
    const destination = path.join(root, 'api/services/auction-service');
    await symlink(outside, destination, process.platform === 'win32' ? 'junction' : 'dir');
    const before = await snapshotTree(root);
    assert.throws(() => generateService({ serviceId: 'auction-service', repositoryRoot: root }),
      { message: 'LINK_REJECTED' });
    assert.deepEqual(await snapshotTree(root), before);
    assert.equal((await readdir(outside)).length, 0);
  });
});

test('a linked template source tree is rejected before service writes', async () => {
  const root = await newRepositoryFixture();
  const external = await mkdtemp(path.join(os.tmpdir(), 'service-generator-source-'));
  temporaryRoots.push(external);
  await writeFile(path.join(external, 'unlisted.txt'), 'outside');
  const linked = path.join(root, 'api/service-foundation/templates/linked-external');
  await symlink(external, linked, process.platform === 'win32' ? 'junction' : 'dir');
  const before = await snapshotTree(root);
  assert.throws(() => generateService({ serviceId: 'auction-service', repositoryRoot: root }),
    { message: 'LINK_REJECTED' });
  assert.deepEqual(await snapshotTree(root), before);
});

test('linked repository ancestors and api/services roots are rejected', async () => {
  const root = await newRepositoryFixture();
  const aliasParent = path.join(os.tmpdir(), `service-generator-parent-link-${path.basename(root)}`);
  temporaryRoots.push(aliasParent);
  await symlink(path.dirname(root), aliasParent, process.platform === 'win32' ? 'junction' : 'dir');
  const rootThroughLink = path.join(aliasParent, path.basename(root));
  assert.throws(() => generateService({ serviceId: 'auction-service', repositoryRoot: rootThroughLink }),
    { message: 'LINK_REJECTED' });

  const services = path.join(root, 'api/services');
  const realServices = path.join(root, 'api/real-services');
  await rename(services, realServices);
  await symlink(realServices, services, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => generateService({ serviceId: 'auction-service', repositoryRoot: root }),
    { message: 'LINK_REJECTED' });
});

test('termination while rendering a stage never exposes a partial service destination', async () => {
  const root = await newRepositoryFixture();
  const readme = path.join(root, 'api/service-foundation/templates/common/README.md');
  await writeFile(readme, `# staged fixture\n${'x'.repeat(24 * 1024 * 1024)}\n`);
  const moduleUrl = new URL('./Generate-Service.mjs', import.meta.url).href;
  const source = `import(${JSON.stringify(moduleUrl)}).then(({generateService}) => generateService({serviceId:'auction-service',repositoryRoot:process.env.SERVICE_FIXTURE_ROOT}));`;
  const child = spawn(process.execPath, ['-e', source], {
    env: { ...process.env, SERVICE_FIXTURE_ROOT: root },
    stdio: 'ignore',
  });
  let stageObserved = false;
  for (let attempt = 0; attempt < 200; attempt++) {
    const names = await readdir(path.join(root, 'api/services'));
    if (names.some(name => name.startsWith('.foundation-stage-'))) {
      stageObserved = true;
      break;
    }
    if (child.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  if (stageObserved) child.kill('SIGTERM');
  await new Promise(resolve => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    child.once('exit', resolve);
  });
  assert.equal(stageObserved, true, 'staging window was not observed before publication');
  assert.equal(await import('node:fs/promises').then(fs => fs.access(path.join(root, 'api/services/auction-service')).then(() => true, () => false)), false);
  await assert.rejects(
    Promise.resolve().then(() => generateService({ serviceId: 'auction-service', repositoryRoot: root })),
    { message: 'GENERATION_INTERRUPTED' },
  );
});

test('CLI accepts only one --service argument and emits sanitized errors from a foreign cwd', async () => {
  const before = await snapshotTree(repositoryRoot);
  for (const args of [
    ['--variant', 'gateway'],
    [],
    ['--service'],
    ['--service', 'auction-service', '--force'],
    ['--service', 'auction-service', '--service', 'billing-service'],
  ]) {
    const result = spawnSync(process.execPath,
      [path.join(scriptDirectory, 'Generate-Service.mjs'), ...args],
      { cwd: os.tmpdir(), encoding: 'utf8' });
    assert.notEqual(result.status, 0, args.join(' '));
    assert.equal(`${result.stdout}${result.stderr}`.trim(), 'USAGE', args.join(' '));
  }
  const unknown = spawnSync(process.execPath,
    [path.join(scriptDirectory, 'Generate-Service.mjs'), '--service', 'unregistered-service'],
    { cwd: os.tmpdir(), encoding: 'utf8' });
  assert.notEqual(unknown.status, 0);
  assert.equal(`${unknown.stdout}${unknown.stderr}`.trim(), 'SERVICE_UNKNOWN');
  assert.deepEqual(await snapshotTree(repositoryRoot), before);
});

test.after(async () => {
  for (const root of temporaryRoots) await rm(root, { recursive: true, force: true });
});

process.on('exit', code => { if (code === 0) process.stdout.write('SERVICE_GENERATOR_FIXTURES_PASS\n'); });
