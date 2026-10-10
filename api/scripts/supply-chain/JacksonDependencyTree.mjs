import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_VERSION = Object.freeze({
  'jackson-annotations': '2.21',
  'jackson-core': '2.21.7',
  'jackson-databind': '2.21.7',
});

export function validateJacksonDependencyTree(output) {
  const versions = new Map();
  for (const line of output.split(/\r?\n/)) {
    if (!line.includes('com.fasterxml.jackson')) continue;
    const match = line.match(/com\.fasterxml\.jackson(?:\.[A-Za-z0-9_-]+)*:([A-Za-z0-9_.-]+):(?:jar|pom):([^:\s]+):(?:compile|runtime|provided|test|system)(?::[^\s]+)?\s*$/);
    if (!match) throw new Error('JACKSON_DEPENDENCY_BOM_MISMATCH');
    const [, artifactId, version] = match;
    const expectedVersion = EXPECTED_VERSION[artifactId] ?? '2.21.7';
    if (version !== expectedVersion) throw new Error('JACKSON_DEPENDENCY_BOM_MISMATCH');
    const found = versions.get(artifactId) ?? new Set();
    found.add(version);
    versions.set(artifactId, found);
  }

  if (versions.size === 0) throw new Error('JACKSON_DEPENDENCY_TREE_EMPTY');
  for (const required of ['jackson-annotations', 'jackson-core', 'jackson-databind']) {
    if (!versions.has(required)) throw new Error('JACKSON_DEPENDENCY_TREE_INCOMPLETE');
  }

  return {
    components: [...versions.values()].reduce((count, entries) => count + entries.size, 0),
    versions: Object.fromEntries([...versions.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([artifact, entries]) => [artifact, [...entries].sort()])),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const filename = process.argv[2];
  if (!filename || process.argv.length !== 3) {
    process.stderr.write('USAGE: node JacksonDependencyTree.mjs <maven-dependency-tree.txt>\n');
    process.exitCode = 2;
  } else {
    try {
      process.stdout.write(`${JSON.stringify(validateJacksonDependencyTree(await readFile(filename, 'utf8')))}\n`);
    } catch (error) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    }
  }
}
