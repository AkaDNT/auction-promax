import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateInventory, expandLiteral } from './ServiceGeneratorCore.mjs';

const rootFromModule = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const serviceRecords = (root) => JSON.parse(fs.readFileSync(path.join(root, 'api/service-foundation/services.json'), 'utf8')).services;

function ordinaryFile(file) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || fs.realpathSync(file) !== path.resolve(file)) throw new Error('GENERATED_SERVICE_PATH_UNSAFE');
}

function listFiles(directory, prefix = '') {
  const output = [];
  for (const name of fs.readdirSync(directory).sort()) {
    const file = path.join(directory, name);
    const stat = fs.lstatSync(file);
    const relative = prefix ? `${prefix}/${name}` : name;
    if (stat.isSymbolicLink()) throw new Error('GENERATED_SERVICE_PATH_UNSAFE');
    if (stat.isDirectory()) output.push(...listFiles(file, relative));
    else if (stat.isFile()) output.push(relative);
    else throw new Error('GENERATED_SERVICE_PATH_UNSAFE');
  }
  return output;
}

export function validateGeneratedService({ serviceId, repositoryRoot = rootFromModule }) {
  const service = serviceRecords(repositoryRoot).find((entry) => entry.id === serviceId);
  if (!service || service.preserved) throw new Error('GENERATED_SERVICE_UNKNOWN');
  const project = path.join(repositoryRoot, ...service.destination.split('/'));
  const stat = fs.lstatSync(project);
  if (!stat.isDirectory() || stat.isSymbolicLink() || fs.realpathSync(project) !== path.resolve(project)) throw new Error('GENERATED_SERVICE_PATH_UNSAFE');
  const inventory = validateInventory(repositoryRoot);
  const selected = inventory.filter((entry) => entry.variants.includes(service.variant));
  const replacements = {
    __SERVICE_ID__: service.id,
    __PACKAGE_NAME__: service.packageName,
    __PACKAGE_PATH__: service.packageName.replaceAll('.', '/'),
    __ENTRY_CLASS__: service.entryClass,
    __DB_NAME__: service.database,
    __TEST_DB_NAME__: service.testDatabase,
    __SCHEMA_NAME__: service.schema,
    __ENV_PREFIX__: service.environmentPrefix,
  };
  const expected = selected.map((entry) => expandLiteral(entry.destination, replacements));
  if (new Set(expected.map((name) => name.toLowerCase())).size !== expected.length) throw new Error('GENERATED_SERVICE_INVENTORY_INVALID');
  const actual = listFiles(project).sort();
  if (actual.join('\0') !== [...expected].sort().join('\0')) throw new Error('GENERATED_SERVICE_FILESET_INVALID');
  const contents = new Map();
  for (const relative of actual) {
    const file = path.join(project, ...relative.split('/'));
    ordinaryFile(file);
    const bytes = fs.readFileSync(file);
    if (bytes.includes(0xef) && bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))) throw new Error('GENERATED_SERVICE_ENCODING_INVALID');
    if (bytes.includes(0x0d)) throw new Error('GENERATED_SERVICE_LINE_ENDING_INVALID');
    const text = bytes.toString('utf8');
    if (!Buffer.from(text, 'utf8').equals(bytes)) throw new Error('GENERATED_SERVICE_ENCODING_INVALID');
    contents.set(relative, text);
    const residue = [...text.matchAll(/__[A-Za-z][A-Za-z0-9_]*__/g)].map((match) => match[0]);
    const allowed = relative === 'mvnw.cmd' ? new Set(['__MVNW_ARG0_NAME__', '__MVNW_CMD__', '__MVNW_ERROR__']) : new Set();
    if (residue.some((token) => !allowed.has(token))) throw new Error('GENERATED_SERVICE_TOKEN_UNRESOLVED');
  }
  const pom = contents.get('pom.xml');
  for (const [tag, value] of [['groupId', service.groupId], ['artifactId', service.artifactId], ['version', service.version]]) {
    if (!pom.includes(`<${tag}>${value}</${tag}>`)) throw new Error('GENERATED_SERVICE_COORDINATE_INVALID');
  }
  if (service.variant === 'gateway') {
    if (actual.some((relative) => /(?:postgres|datasource|jdbc|flyway|testcontainers)/i.test(relative))) {
      throw new Error('GENERATED_SERVICE_GATEWAY_DATASTORE_FORBIDDEN');
    }
    if (/spring-boot-starter-(?:data-jpa|jdbc)|spring-jdbc|org\.postgresql|org\.flywaydb|org\.testcontainers/i.test(pom)) {
      throw new Error('GENERATED_SERVICE_GATEWAY_DATASTORE_FORBIDDEN');
    }
    for (const [relative, text] of contents) {
      if (/\.ya?ml$/i.test(relative) && /datasource|flyway|jdbc|postgres|readinessState\s*,\s*db/i.test(text)) {
        throw new Error('GENERATED_SERVICE_GATEWAY_DATASTORE_FORBIDDEN');
      }
      if (/\.java$/i.test(relative) && /^\s*import\s+(?:static\s+)?(?:java\.sql|javax\.sql|org\.springframework\.jdbc|org\.postgresql|org\.flywaydb|org\.testcontainers)/m.test(text)) {
        throw new Error('GENERATED_SERVICE_GATEWAY_DATASTORE_FORBIDDEN');
      }
    }
  }
  return { serviceId, variant: service.variant, files: actual };
}
