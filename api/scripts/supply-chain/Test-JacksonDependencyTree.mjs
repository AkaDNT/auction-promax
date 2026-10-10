import assert from 'node:assert/strict';
import test from 'node:test';

import { validateJacksonDependencyTree } from './JacksonDependencyTree.mjs';

test('accepts Jackson versions prescribed by BOM 2.21.7 including annotations exception', () => {
  const output = [
    '[INFO] +- com.fasterxml.jackson.core:jackson-databind:jar:2.21.7:compile',
    '[INFO] |  +- com.fasterxml.jackson.core:jackson-annotations:jar:2.21:compile',
    '[INFO] |  \\ - com.fasterxml.jackson.core:jackson-core:jar:2.21.7:compile',
  ].join('\n');
  assert.deepEqual(validateJacksonDependencyTree(output), {
    components: 3,
    versions: { 'jackson-annotations': ['2.21'], 'jackson-core': ['2.21.7'], 'jackson-databind': ['2.21.7'] },
  });
});

test('rejects a vulnerable older Jackson core or databind', () => {
  const output = '[INFO] +- com.fasterxml.jackson.core:jackson-databind:jar:2.21.4:compile\n'
    + '[INFO] \\ - com.fasterxml.jackson.core:jackson-core:jar:2.21.4:compile';
  assert.throws(() => validateJacksonDependencyTree(output), { message: 'JACKSON_DEPENDENCY_BOM_MISMATCH' });
});

test('rejects an unexpected Jackson artifact version instead of silently skipping it', () => {
  const output = '[INFO] +- com.fasterxml.jackson.dataformat:jackson-dataformat-yaml:jar:2.20.1:compile\n'
    + '[INFO] +- com.fasterxml.jackson.core:jackson-databind:jar:2.21.7:compile\n'
    + '[INFO] +- com.fasterxml.jackson.core:jackson-core:jar:2.21.7:compile';
  assert.throws(() => validateJacksonDependencyTree(output), { message: 'JACKSON_DEPENDENCY_BOM_MISMATCH' });
});

test('rejects dependency tree without required core coordinates', () => {
  assert.throws(() => validateJacksonDependencyTree('[INFO] no Jackson dependencies'), {
    message: 'JACKSON_DEPENDENCY_TREE_EMPTY',
  });
});
