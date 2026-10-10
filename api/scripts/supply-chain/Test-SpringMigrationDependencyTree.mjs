import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSpringMigrationDependencyTree } from './SpringMigrationDependencyTree.mjs';

const coordinates = [
  'org.springframework.boot:spring-boot-starter-webmvc:jar:4.0.8:compile',
  'org.springframework:spring-webmvc:jar:7.0.9:compile',
  'org.springframework:spring-core:jar:7.0.9:compile',
  'org.apache.tomcat.embed:tomcat-embed-core:jar:11.0.26:compile',
  'tools.jackson.core:jackson-core:jar:3.1.7:compile',
  'tools.jackson.core:jackson-databind:jar:3.1.7:compile',
  'com.fasterxml.jackson.core:jackson-annotations:jar:2.21:compile',
  'com.fasterxml.jackson.core:jackson-core:jar:2.21.7:compile',
  'com.fasterxml.jackson.core:jackson-databind:jar:2.21.7:compile',
];
const tree = (nodes = coordinates) => nodes.map(node => `[INFO] |  +- ${node}`).join('\n');

test('accepts the selected Boot graph, Tomcat security patch and both patched JSON stacks', () => {
  assert.equal(validateSpringMigrationDependencyTree(tree(), 'identity-profile-service').components, 9);
});
test('does not require Jackson 2 core/databind merely to retain the old security floor', () => {
  assert.equal(validateSpringMigrationDependencyTree(tree(coordinates.slice(0, 7)), 'realtime-gateway').components, 7);
});
for (const [label, node] of [
  ['old Spring nested below a safe root', 'org.springframework:spring-webmvc:jar:6.2.19:compile'],
  ['wrong Boot', 'org.springframework.boot:spring-boot:jar:4.1.1:compile'],
  ['old Tomcat', 'org.apache.tomcat.embed:tomcat-embed-websocket:jar:10.1.59:compile'],
  ['unpatched Tomcat 11 nested module', 'org.apache.tomcat.embed:tomcat-embed-websocket:jar:11.0.24:compile'],
  ['earlier Tomcat 11 security patch', 'org.apache.tomcat.embed:tomcat-embed-el:jar:11.0.25:compile'],
  ['vulnerable Jackson 3', 'tools.jackson.core:jackson-databind:jar:3.1.5:runtime'],
  ['vulnerable Jackson 2', 'com.fasterxml.jackson.dataformat:jackson-dataformat-yaml:jar:2.21.5:runtime'],
  ['wrong annotations exception', 'com.fasterxml.jackson.core:jackson-annotations:jar:2.20:compile'],
  ['wrong Servlet', 'jakarta.servlet:jakarta.servlet-api:jar:6.0.0:provided'],
]) {
  test(`rejects ${label}`, () => assert.throws(() =>
    validateSpringMigrationDependencyTree(tree([...coordinates, node]), 'identity-profile-service')));
}
test('requires the complete runtime proof coordinates', () => {
  for (let index = 0; index < 7; index++) {
    assert.throws(() => validateSpringMigrationDependencyTree(tree(coordinates.filter((_, i) => i !== index)), 'auction-service'));
  }
});
test('rejects malformed relevant coordinates rather than ignoring them', () => {
  assert.throws(() => validateSpringMigrationDependencyTree(`${tree()}\n[INFO] +- tools.jackson.core:broken`, 'billing-service'));
});
test('validates actual resolved nodes, not omitted conflict annotations', () => {
  const omitted = '[INFO] |  +- (com.fasterxml.jackson.core:jackson-core:jar:2.21.5:compile - omitted for conflict with 2.21.7)';
  assert.equal(validateSpringMigrationDependencyTree(`${tree()}\n${omitted}`, 'bidding-service').components, 9);
});
test('gateway rejects all datastore families including a nested test database', () => {
  for (const node of ['org.postgresql:postgresql:jar:42.7.12:runtime',
    'org.flywaydb:flyway-core:jar:11.14.1:compile', 'org.hibernate.orm:hibernate-core:jar:7.2.24.Final:compile',
    'org.springframework:spring-jdbc:jar:7.0.9:compile', 'org.testcontainers:testcontainers-postgresql:jar:2.0.5:test']) {
    assert.throws(() => validateSpringMigrationDependencyTree(tree([...coordinates, node]), 'realtime-gateway'));
  }
});
test('classic test auto-configuration shims are not runtime datastore dependencies', () => {
  const shim = 'org.springframework.boot:spring-boot-data-jpa-test:jar:4.0.8:test';
  assert.equal(validateSpringMigrationDependencyTree(tree([...coordinates, shim]), 'realtime-gateway').components, 10);
  assert.throws(() => validateSpringMigrationDependencyTree(tree([...coordinates, shim.replace(':test', ':compile')]), 'realtime-gateway'));
});
test('closed service selection rejects unknown identities', () => {
  assert.throws(() => validateSpringMigrationDependencyTree(tree(), 'unknown-service'));
});
