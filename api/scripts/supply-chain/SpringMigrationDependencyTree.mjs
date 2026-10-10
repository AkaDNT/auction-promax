import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const services = new Set(['identity-profile-service', 'auction-service', 'bidding-service', 'billing-service', 'realtime-gateway']);
const required = [
  'org.springframework.boot:spring-boot-starter-webmvc',
  'org.springframework:spring-webmvc', 'org.springframework:spring-core',
  'org.apache.tomcat.embed:tomcat-embed-core',
  'tools.jackson.core:jackson-core', 'tools.jackson.core:jackson-databind',
  'com.fasterxml.jackson.core:jackson-annotations',
];
const relevant = /(?:org\.springframework(?:\.boot)?|org\.apache\.tomcat\.embed|tools\.jackson(?:\.[\w-]+)*|com\.fasterxml\.jackson(?:\.[\w-]+)*|jakarta\.servlet):/;
const classicTestShims = new Set(['spring-boot-data-jdbc-test', 'spring-boot-data-jpa-test', 'spring-boot-jdbc-test', 'spring-boot-jpa-test']);
const datastore = (group, artifact) => ['org.postgresql', 'org.flywaydb', 'org.hibernate.orm',
  'org.hibernate.common', 'jakarta.persistence', 'com.zaxxer'].includes(group)
  || group === 'org.springframework' && ['spring-jdbc', 'spring-orm', 'spring-tx'].includes(artifact)
  || group === 'org.springframework.boot' && /(?:jdbc|jpa|hibernate|flyway)/.test(artifact)
  || group === 'org.testcontainers' && /postgresql|jdbc|database/.test(artifact);

export function validateSpringMigrationDependencyTree(output, serviceId) {
  if (!services.has(serviceId)) throw new Error('SERVICE_ID_INVALID');
  const found = new Map();
  for (const line of output.split(/\r?\n/)) {
    // Maven verbose trees include evicted versions in parenthesized annotations, not resolved nodes.
    if (/\([^()]+ - omitted for (?:conflict with [^()]+|duplicate)\)\s*$/.test(line)) continue;
    const match = line.match(/([\w.-]+):([\w.-]+):(?:jar|pom)(?::[\w.-]+)?:([^:\s]+):(compile|runtime|provided|test|system)\s*$/);
    if (!match) {
      if (relevant.test(line)) throw new Error('SPRING_MIGRATION_GRAPH_MALFORMED');
      continue;
    }
    const [, group, artifact, version, scope] = match;
    const testShim = group === 'org.springframework.boot' && scope === 'test' && classicTestShims.has(artifact);
    if (serviceId === 'realtime-gateway' && !testShim && datastore(group, artifact)) throw new Error('FORBIDDEN_GATEWAY_COMPONENT');
    let expected;
    if (group === 'org.springframework.boot') expected = '4.0.8';
    else if (group === 'org.springframework') expected = '7.0.9';
    else if (group === 'org.apache.tomcat.embed') expected = '11.0.24';
    else if (group.startsWith('tools.jackson.')) expected = '3.1.7';
    else if (group.startsWith('com.fasterxml.jackson.')) expected = artifact === 'jackson-annotations' ? '2.21' : '2.21.7';
    else if (group === 'jakarta.servlet' && artifact === 'jakarta.servlet-api') expected = '6.1.0';
    if (!expected) continue;
    if (version !== expected) throw new Error('SPRING_MIGRATION_GRAPH_VERSION_MISMATCH');
    found.set(`${group}:${artifact}`, version);
  }
  if (required.some(coordinate => !found.has(coordinate))) throw new Error('SPRING_MIGRATION_GRAPH_INCOMPLETE');
  return { serviceId, components: found.size, versions: Object.fromEntries([...found].sort()) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 4) throw new Error('USAGE');
    const result = validateSpringMigrationDependencyTree(await readFile(process.argv[2], 'utf8'), process.argv[3]);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${/^[A-Z_]+$/.test(error.message) ? error.message : 'SPRING_MIGRATION_GRAPH_FAILED'}\n`);
    process.exitCode = 1;
  }
}
