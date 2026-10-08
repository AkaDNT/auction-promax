import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { validateInventory } from './Generate-Service.mjs';
import { validateTemplateConformance } from './ServiceTemplateConformance.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../../..');
const foundationRoot = path.join(repositoryRoot, 'api/service-foundation');
const temporaryRoots = [];

if (process.argv.slice(2).length !== 1 || process.argv[2] !== '--templates') {
  process.stderr.write('USAGE\n');
  process.exitCode = 1;
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'service-conformance-fixture-'));
  temporaryRoots.push(root);
  await mkdir(path.join(root, 'api/service-foundation/templates'), { recursive: true });
  return root;
}

async function saveInventory(root, value) {
  await writeFile(path.join(root, 'api/service-foundation/template-files.json'),
    `${JSON.stringify(value, null, 2)}\n`);
}

async function createSource(root, source) {
  const filename = path.join(root, 'api/service-foundation', ...source.split('/'));
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, 'fixture\n');
}

test('inventory permits same destination only for disjoint relational and gateway variants', async () => {
  const root = await fixture();
  const value = { schemaVersion: 1, files: [
    { source: 'templates/relational/pom.xml', destination: 'pom.xml', variants: ['relational'], mode: 0o644, provenance: 'relational build' },
    { source: 'templates/gateway/pom.xml', destination: 'pom.xml', variants: ['gateway'], mode: 0o644, provenance: 'gateway build' },
  ] };
  await createSource(root, value.files[0].source);
  await createSource(root, value.files[1].source);
  await saveInventory(root, value);

  assert.deepEqual(validateInventory(root).map(entry => entry.destination), ['pom.xml', 'pom.xml']);
});

test('the repository templates pass the reusable conformance validator', () => {
  assert.deepEqual(validateTemplateConformance(repositoryRoot).variants, ['relational', 'gateway']);
});

test('technical exception advice uses the shared ResponseEntity<Object> return contract', async () => {
  const source = await readFile(path.join(foundationRoot, 'templates/common/TechnicalProblemAdvice.java'), 'utf8');
  assert.match(source, /ResponseEntity<Object> unexpected\(Exception exception, HttpServletRequest request\)/);
});

test('conformance rejects deliberately corrupted template sources and missing selected paths', async (t) => {
  const mutations = [
    ['empty logging test', 'templates/common/StructuredLoggingTest.java', () => 'class EmptyTest {}\n'],
    ['empty architecture test', 'templates/common/ArchitectureTest.java', () => 'class EmptyTest {}\n'],
    ['missing duplicate detection', 'templates/common/StructuredLoggingTest.java', text => text.replace('STRICT_DUPLICATE_DETECTION', 'AUTO_CLOSE_SOURCE')],
    ['missing outer MDC case', 'templates/common/StructuredLoggingTest.java', text => text.replace('outer-correlation', 'omitted-case')],
    ['missing negative fixture assertion', 'templates/common/ArchitectureTest.java', text => text.replace('.hasMessageContaining("InvalidInboundDependency")', '')],
    ['incompatible technical exception response type', 'templates/common/TechnicalProblemAdvice.java', text => text.replace('ResponseEntity<Object> unexpected', 'ResponseEntity<ProblemDetail> unexpected')],
    ['package-private controller blocks cross-package logging test', 'templates/common/TechnicalProbeController.java', text => text.replace('public TechnicalValidationResponse validate', 'TechnicalValidationResponse validate')],
    ['null and empty MDC states are normalized before comparison', 'templates/common/StructuredLoggingTest.java', text => text.replaceAll('Optional.ofNullable(MDC.getCopyOfContextMap()).orElseGet(Map::of)', 'MDC.getCopyOfContextMap()')],
    ['wrapper pin', 'templates/common/maven-wrapper.properties', text => text.replace('3.9.16', '3.9.15')],
    ['unknown token', 'templates/common/README.md', text => text + '\n__unknown_token__\n'],
    ['gateway JDBC dependency', 'templates/gateway/pom.xml', text => text.replace('</dependencies>', '<dependency><groupId>org.springframework</groupId><artifactId>spring-jdbc</artifactId></dependency></dependencies>')],
    ['gateway datasource', 'templates/gateway/application-local.yaml', text => text + '\nspring:\n  datasource:\n    url: fixture\n'],
    ['gateway Failsafe selector', 'templates/gateway/pom.xml', text => text.replace('**/GatewayNoDatastoreIT.java', '**/*TestcontainersIT.java')],
  ];
  for (const [name, source, mutate] of mutations) await t.test(name, async () => {
    const root = await fixture();
    await cp(foundationRoot, path.join(root, 'api/service-foundation'), { recursive: true });
    const filename = path.join(root, 'api/service-foundation', source);
    await writeFile(filename, mutate(await readFile(filename, 'utf8')));
    assert.throws(() => validateTemplateConformance(root), { message: 'TEMPLATE_CONFORMANCE_FAILED' });
  });
  await t.test('missing gateway IT', async () => {
    const root = await fixture();
    await cp(foundationRoot, path.join(root, 'api/service-foundation'), { recursive: true });
    const file = path.join(root, 'api/service-foundation/template-files.json');
    const value = JSON.parse(await readFile(file, 'utf8'));
    const removed = value.files.find(entry => entry.source.endsWith('/GatewayNoDatastoreIT.java'));
    value.files = value.files.filter(entry => entry !== removed);
    await rm(path.join(root, 'api/service-foundation', removed.source));
    await saveInventory(root, value);
    assert.throws(() => validateTemplateConformance(root), { message: 'TEMPLATE_CONFORMANCE_FAILED' });
  });
});

test('inventory rejects an exact destination collision within one variant', async () => {
  const root = await fixture();
  const value = { schemaVersion: 1, files: [
    { source: 'templates/relational/one.txt', destination: 'pom.xml', variants: ['relational'], mode: 0o644, provenance: 'one' },
    { source: 'templates/relational/two.txt', destination: 'pom.xml', variants: ['relational'], mode: 0o644, provenance: 'two' },
  ] };
  await createSource(root, value.files[0].source);
  await createSource(root, value.files[1].source);
  await saveInventory(root, value);

  assert.throws(() => validateInventory(root), { message: 'INVENTORY_INVALID' });
});

test('inventory rejects case-fold destination collision within one variant', async () => {
  const root = await fixture();
  const value = { schemaVersion: 1, files: [
    { source: 'templates/relational/one.txt', destination: 'config.yaml', variants: ['relational'], mode: 0o644, provenance: 'one' },
    { source: 'templates/relational/two.txt', destination: 'Config.yaml', variants: ['relational'], mode: 0o644, provenance: 'two' },
  ] };
  await createSource(root, value.files[0].source);
  await createSource(root, value.files[1].source);
  await saveInventory(root, value);

  assert.throws(() => validateInventory(root), { message: 'INVENTORY_INVALID' });
});

test('inventory rejects traversal, duplicate variant tags, and invalid mode declarations', async (t) => {
  for (const [name, mutate] of [
    ['traversal', value => { value.files[0].destination = '../escape.txt'; }],
    ['duplicate variant', value => { value.files[0].variants = ['relational', 'relational']; }],
    ['mvnw non-executable mode', value => { value.files[0].mode = 0o644; }],
  ]) {
    await t.test(name, async () => {
      const root = await fixture();
      const value = { schemaVersion: 1, files: [
        { source: 'templates/common/mvnw', destination: 'mvnw', variants: ['relational'], mode: 0o755, provenance: 'wrapper' },
      ] };
      await createSource(root, value.files[0].source);
      mutate(value);
      await saveInventory(root, value);
      assert.throws(() => validateInventory(root), { message: 'INVENTORY_INVALID' });
    });
  }
});

test('template inventory lists every text source exactly once and rejects extras', async () => {
  const root = await fixture();
  await mkdir(path.join(root, 'api/service-foundation'), { recursive: true });
  await cp(foundationRoot, path.join(root, 'api/service-foundation'), { recursive: true });
  const inventoryPath = path.join(root, 'api/service-foundation/template-files.json');
  const value = JSON.parse(await readFile(inventoryPath, 'utf8'));
  const registered = value.files.map(entry => entry.source).sort();
  const actual = [];
  async function enumerate(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await enumerate(path.join(directory, entry.name), relative);
      else if (entry.isFile()) actual.push(`templates/${relative}`);
    }
  }
  await enumerate(path.join(root, 'api/service-foundation/templates'));
  actual.sort();
  assert.deepEqual(actual, registered);
  for (const entry of value.files) {
    const bytes = await readFile(path.join(root, 'api/service-foundation', ...entry.source.split('/')));
    assert.equal(bytes.includes(0), false, `${entry.source} is binary`);
    assert.equal(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf, false,
      `${entry.source} has UTF-8 BOM`);
  }
  await writeFile(path.join(root, 'api/service-foundation/templates/unlisted.txt'), 'extra\n');
  assert.throws(() => validateInventory(root), { message: 'INVENTORY_INVALID' });
});

test('selected output inventories exactly match the approved two-variant path layout', async () => {
  const root = await fixture();
  await cp(foundationRoot, path.join(root, 'api/service-foundation'), { recursive: true });
  const files = validateInventory(root);
  const common = [
    'mvnw', 'mvnw.cmd', '.mvn/wrapper/maven-wrapper.properties', 'Dockerfile', 'README.md',
    'src/main/java/__PACKAGE_PATH__/__ENTRY_CLASS__.java',
    'src/main/java/__PACKAGE_PATH__/configuration/TechnicalConfiguration.java',
    'src/main/java/__PACKAGE_PATH__/adapter/in/web/CorrelationIdFilter.java',
    'src/main/java/__PACKAGE_PATH__/adapter/in/web/TechnicalProblemAdvice.java',
    'src/main/java/__PACKAGE_PATH__/adapter/in/web/TechnicalProbeController.java',
    'src/main/java/__PACKAGE_PATH__/adapter/in/web/TechnicalValidationRequest.java',
    'src/main/java/__PACKAGE_PATH__/adapter/in/web/TechnicalValidationResponse.java',
    'src/main/resources/application.yaml',
    'src/test/java/__PACKAGE_PATH__/TechnicalHttpTest.java',
    'src/test/java/__PACKAGE_PATH__/StructuredLoggingTest.java',
    'src/test/java/__PACKAGE_PATH__/architecture/ArchitectureTest.java',
    'src/test/java/com/auctionpromax/foundationfixtures/application/FoundationApplicationFixture.java',
    'src/test/java/com/auctionpromax/foundationfixtures/application/InvalidAdapterDependency.java',
    'src/test/java/com/auctionpromax/foundationfixtures/application/InvalidFrameworkDependency.java',
    'src/test/java/com/auctionpromax/foundationfixtures/adapter/in/InvalidInboundDependency.java',
  ];
  const relational = [...common, 'pom.xml', 'src/main/resources/application-local.yaml',
    'src/main/resources/db/migration/V1__create_technical_probe.sql',
    'src/test/java/__PACKAGE_PATH__/RelationalBoundaryTestcontainersIT.java',
    'src/test/resources/db/testcontainers/bootstrap.sql'].sort();
  const gateway = [...common, 'pom.xml', 'src/main/resources/application-local.yaml',
    'src/test/java/__PACKAGE_PATH__/GatewayNoDatastoreIT.java'].sort();
  assert.deepEqual(files.filter(entry => entry.variants.includes('relational')).map(entry => entry.destination).sort(), relational);
  assert.deepEqual(files.filter(entry => entry.variants.includes('gateway')).map(entry => entry.destination).sort(), gateway);
});

test('registered wrapper properties pin the approved wrapper and Maven distributions', async () => {
  const root = await fixture();
  await cp(foundationRoot, path.join(root, 'api/service-foundation'), { recursive: true });
  const entries = validateInventory(root);
  for (const entry of entries.filter(item => item.destination === '.mvn/wrapper/maven-wrapper.properties')) {
    const text = await readFile(path.join(root, 'api/service-foundation', ...entry.source.split('/')), 'utf8');
    assert.match(text, /^wrapperVersion=3\.3\.4$/m);
    assert.match(text, /^distributionType=only-script$/m);
    assert.match(text, /^distributionUrl=https:\/\/repo\.maven\.apache\.org\/maven2\/org\/apache\/maven\/apache-maven\/3\.9\.16\/apache-maven-3\.9\.16-bin\.zip$/m);
    assert.doesNotMatch(text, /distributionSha256Sum/);
  }
});

test('gateway inventory contains no relational resources or direct datastore configuration', async () => {
  const root = await fixture();
  await cp(foundationRoot, path.join(root, 'api/service-foundation'), { recursive: true });
  const entries = validateInventory(root);
  const gatewayEntries = entries.filter(entry => entry.variants.includes('gateway'));
  assert.equal(gatewayEntries.some(entry => /migration|bootstrap|RelationalBoundary|TestcontainersIT/i.test(entry.destination)), false);
  for (const entry of gatewayEntries.filter(item => /\.java$/.test(item.destination))) {
    const source = await readFile(path.join(root, 'api/service-foundation', ...entry.source.split('/')), 'utf8');
    assert.doesNotMatch(source, /^import\s+(?:org\.postgresql|org\.springframework\.jdbc|javax\.sql|java\.sql|org\.flywaydb|org\.testcontainers\.containers\.PostgreSQLContainer)/m,
      `${entry.source} must remain compilable without datastore dependencies`);
  }
  const gatewayPom = entries.find(entry => entry.source === 'templates/gateway/pom.xml');
  const pom = await readFile(path.join(root, 'api/service-foundation', ...gatewayPom.source.split('/')), 'utf8');
  assert.doesNotMatch(pom, /spring-boot-starter-data-jpa|spring-boot-starter-jdbc|<artifactId>spring-jdbc<|org\.postgresql|flyway|testcontainers.*postgres/i);
  const application = entries.find(entry => entry.source === 'templates/gateway/application-local.yaml');
  const yaml = await readFile(path.join(root, 'api/service-foundation', ...application.source.split('/')), 'utf8');
  assert.doesNotMatch(yaml, /datasource|flyway|jdbc|postgres|readinessState,db/i);
  assert.match(yaml, /include: readinessState\s*$/m);
  const failsafe = pom.match(/<artifactId>maven-failsafe-plugin<\/artifactId>[\s\S]*?<\/plugin>/)?.[0] ?? '';
  assert.match(failsafe, /\*\*\/GatewayNoDatastoreIT\.java/);
});

test('gateway-selected architecture fixtures do not require JDBC', async () => {
  const root = await fixture();
  await cp(foundationRoot, path.join(root, 'api/service-foundation'), { recursive: true });
  const entries = validateInventory(root);
  const fixtureEntry = entries.find(entry => entry.source === 'templates/common/InvalidFrameworkDependency.java');
  const source = await readFile(path.join(root, 'api/service-foundation', ...fixtureEntry.source.split('/')), 'utf8');
  assert.match(source, /org\.springframework\.context\.ApplicationContext/);
  assert.doesNotMatch(source, /JdbcTemplate|org\.springframework\.jdbc/);
});

test('technical security permits only the exact validation POST under its internal path', async () => {
  const root = await fixture();
  await cp(foundationRoot, path.join(root, 'api/service-foundation'), { recursive: true });
  const entries = validateInventory(root);
  const config = entries.find(entry => entry.source === 'templates/common/TechnicalConfiguration.java');
  const source = await readFile(path.join(root, 'api/service-foundation', ...config.source.split('/')), 'utf8');
  assert.match(source, /requestMatchers\(HttpMethod\.POST,\s*"\/internal\/technical-baseline\/validate"\)/);
  const httpTest = entries.find(entry => entry.source === 'templates/common/TechnicalHttpTest.java');
  const tests = await readFile(path.join(root, 'api/service-foundation', ...httpTest.source.split('/')), 'utf8');
  assert.match(tests, /deniesUnlistedRoutesAndOtherTechnicalBaselineMethodsAndPaths/);
});

test('relational probe schema is technical-only and bootstrap is isolated to the ephemeral test database', async () => {
  const root = await fixture();
  await cp(foundationRoot, path.join(root, 'api/service-foundation'), { recursive: true });
  const entries = validateInventory(root);
  const migration = entries.find(entry => entry.source === 'templates/relational/technical-probe.sql');
  const migrationText = await readFile(path.join(root, 'api/service-foundation', ...migration.source.split('/')), 'utf8');
  assert.match(migrationText, /CREATE TABLE __SCHEMA_NAME__\.technical_probe/);
  assert.match(migrationText, /GRANT SELECT, INSERT, UPDATE, DELETE/);
  assert.match(migrationText, /REVOKE ALL PRIVILEGES ON TABLE __SCHEMA_NAME__\.flyway_schema_history/);
  assert.doesNotMatch(migrationText, /sample|bid_|auction_|billing_|outbox|idempotency/i);
  const bootstrap = entries.find(entry => entry.source === 'templates/relational/bootstrap.sql');
  const bootstrapText = await readFile(path.join(root, 'api/service-foundation', ...bootstrap.source.split('/')), 'utf8');
  assert.doesNotMatch(bootstrapText, /CREATE DATABASE/);
  assert.match(bootstrapText, /ALTER DATABASE __TEST_DB_NAME__ OWNER TO/);
  assert.match(bootstrapText, /CREATE SCHEMA __SCHEMA_NAME__ AUTHORIZATION/);
  assert.match(bootstrapText, /REVOKE CONNECT ON DATABASE postgres FROM PUBLIC/);
  assert.doesNotMatch(bootstrapText, /DROP DATABASE|DROP SCHEMA|CREATE ROLE tc_bootstrap/);
});

test('relational POM selects the Testcontainers IT class and required persistence dependencies', async () => {
  const root = await fixture();
  await cp(foundationRoot, path.join(root, 'api/service-foundation'), { recursive: true });
  const entries = validateInventory(root);
  const pomEntry = entries.find(entry => entry.source === 'templates/relational/pom.xml');
  const pom = await readFile(path.join(root, 'api/service-foundation', ...pomEntry.source.split('/')), 'utf8');
  for (const dependency of [
    'spring-boot-starter-data-jpa', 'org.postgresql', 'flyway-core', 'flyway-database-postgresql',
    'org.testcontainers', 'archunit-junit5',
  ]) assert.ok(pom.includes(`<artifactId>${dependency}</artifactId>`) || pom.includes(`<groupId>${dependency}</groupId>`), dependency);
  assert.match(pom, /\*\*\/\*TestcontainersIT\.java/);
  assert.doesNotMatch(pom, /skipITs>true|disabledWithoutDocker>true|h2database/i);
});

test('template mode policy reserves executable mode only for mvnw', async () => {
  const root = await fixture();
  await cp(foundationRoot, path.join(root, 'api/service-foundation'), { recursive: true });
  const inventory = JSON.parse(await readFile(path.join(root, 'api/service-foundation/template-files.json'), 'utf8'));
  assert.equal(inventory.files.find(entry => entry.destination === 'mvnw').mode, 0o755);
  assert.ok(inventory.files.filter(entry => entry.destination !== 'mvnw').every(entry => entry.mode === 0o644));
});

test('only the three Maven Wrapper command placeholders are preserved in mvnw.cmd', async () => {
  const root = await fixture();
  await cp(foundationRoot, path.join(root, 'api/service-foundation'), { recursive: true });
  const entries = validateInventory(root);
  const wrapper = entries.find(entry => entry.source === 'templates/common/mvnw.cmd');
  const source = await readFile(path.join(root, 'api/service-foundation', ...wrapper.source.split('/')), 'utf8');
  const tokens = [...source.matchAll(/__[A-Z][A-Z0-9_]*__/g)].map(match => match[0]);
  assert.deepEqual([...new Set(tokens)].sort(), ['__MVNW_ARG0_NAME__', '__MVNW_CMD__', '__MVNW_ERROR__']);
  const bytes = await readFile(path.join(root, 'api/service-foundation/templates/common/mvnw'));
  const shell = bytes.toString('utf8');
  assert.doesNotMatch(shell, /__[A-Z][A-Z0-9_]*__/);
  for (const name of ['mvnw', 'mvnw.cmd']) {
    const template = (await readFile(path.join(root, 'api/service-foundation/templates/common', name), 'utf8')).replace(/\r\n/g, '\n');
    const identity = (await readFile(path.join(repositoryRoot, 'api/services/identity-profile-service', name), 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(template, identity, `${name} changed beyond allowed line-ending normalization`);
  }
});

test.after(async () => {
  for (const root of temporaryRoots) await rm(root, { recursive: true, force: true });
});

process.on('exit', code => { if (code === 0) process.stdout.write('SERVICE_TEMPLATE_CONFORMANCE_PASS\n'); });
