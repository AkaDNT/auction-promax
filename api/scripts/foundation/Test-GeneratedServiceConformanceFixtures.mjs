import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cp } from 'node:fs/promises';
import { test } from 'node:test';
import { generateService as generateWithIo, nativeGeneratorIo } from './ServiceGeneratorCore.mjs';
import { validateGeneratedService } from './GeneratedServiceConformance.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const foundation = path.join(root, 'api/service-foundation');
const records = JSON.parse(fs.readFileSync(path.join(foundation, 'services.json'), 'utf8')).services.filter((entry) => !entry.preserved);
const fixtureIo = {
  ...nativeGeneratorIo,
  findPublisher: () => 'fixture-publisher',
  publish: (_publisher, args) => {
    const stage = args[args.indexOf('-StagePath') + 1];
    const destination = args[args.indexOf('-DestinationPath') + 1];
    fs.renameSync(stage, destination);
    return { status: 0, stdout: '', stderr: '' };
  },
};

for (const service of records) test(`expanded ${service.id} matches closed generated inventory`, async (t) => {
  const fixture = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'generated-service-conformance-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  await cp(foundation, path.join(fixture, 'api/service-foundation'), { recursive: true });
  await fs.promises.mkdir(path.join(fixture, 'api/services'), { recursive: true });
  generateWithIo({ serviceId: service.id, repositoryRoot: fixture }, fixtureIo);
  const result = validateGeneratedService({ serviceId: service.id, repositoryRoot: fixture });
  assert.ok(result.files.length > 0);
  assert.equal(result.variant, service.variant);
  if (service.variant === 'gateway') {
    assert.ok(!result.files.some((name) => /(?:postgres|datasource|jdbc|flyway|testcontainers)/i.test(name)));
  }
});

test('generated conformance rejects unlisted output and unresolved tokens', async (t) => {
  const fixture = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'generated-service-negative-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  await cp(foundation, path.join(fixture, 'api/service-foundation'), { recursive: true });
  await fs.promises.mkdir(path.join(fixture, 'api/services'), { recursive: true });
  generateWithIo({ serviceId: 'realtime-gateway', repositoryRoot: fixture }, fixtureIo);
  const project = path.join(fixture, 'api/services/realtime-gateway');
  fs.writeFileSync(path.join(project, 'unlisted.txt'), 'extra');
  assert.throws(() => validateGeneratedService({ serviceId: 'realtime-gateway', repositoryRoot: fixture }), { message: 'GENERATED_SERVICE_FILESET_INVALID' });
  fs.unlinkSync(path.join(project, 'unlisted.txt'));
  fs.appendFileSync(path.join(project, 'README.md'), '\n__Unknown_Token__\n');
  assert.throws(() => validateGeneratedService({ serviceId: 'realtime-gateway', repositoryRoot: fixture }), { message: 'GENERATED_SERVICE_TOKEN_UNRESOLVED' });
});

test('generated gateway conformance rejects database dependency or datasource configuration', async (t) => {
  for (const [file, marker] of [
    ['pom.xml', '<dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId></dependency>'],
    ['src/main/resources/application-local.yaml', '\nspring:\n  datasource:\n    url: jdbc:postgresql://invalid\n'],
  ]) await t.test(file, async (nested) => {
    const fixture = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'generated-service-gateway-negative-'));
    nested.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
    await cp(foundation, path.join(fixture, 'api/service-foundation'), { recursive: true });
    await fs.promises.mkdir(path.join(fixture, 'api/services'), { recursive: true });
    generateWithIo({ serviceId: 'realtime-gateway', repositoryRoot: fixture }, fixtureIo);
    const target = path.join(fixture, 'api/services/realtime-gateway', file);
    fs.appendFileSync(target, marker);
    assert.throws(() => validateGeneratedService({ serviceId: 'realtime-gateway', repositoryRoot: fixture }), { message: 'GENERATED_SERVICE_GATEWAY_DATASTORE_FORBIDDEN' });
  });
});
