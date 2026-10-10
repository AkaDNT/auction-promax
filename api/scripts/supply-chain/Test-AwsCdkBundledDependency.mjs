import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const infraRoot = path.join(repositoryRoot, 'api/infra');

function isAtLeastFixedFloor(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return false;
  const [, major, minor, patch] = match.map(Number);
  return major > 5 || (major === 5 && (minor > 0 || (minor === 0 && patch >= 12)));
}

test('aws-cdk-lib bundled brace-expansion is fixed in lockfile and installed graph', async () => {
  const lock = JSON.parse(await readFile(path.join(infraRoot, 'package-lock.json'), 'utf8'));
  const bundledLockPath = 'node_modules/aws-cdk-lib/node_modules/brace-expansion';
  const lockedPackage = lock.packages?.[bundledLockPath];
  assert.ok(lockedPackage, 'lockfile must represent the aws-cdk-lib bundled dependency path');
  assert.equal(lockedPackage.inBundle, true, 'locked dependency must remain explicitly owned as bundled');
  assert.ok(isAtLeastFixedFloor(lockedPackage.version),
    'aws-cdk-lib bundled lock entry must be brace-expansion 5.0.12 or later');

  const installedPath = path.join(infraRoot, 'node_modules/aws-cdk-lib/node_modules/brace-expansion/package.json');
  const installedPackage = JSON.parse(await readFile(installedPath, 'utf8'));
  assert.ok(isAtLeastFixedFloor(installedPackage.version),
    'installed aws-cdk-lib bundled dependency must be brace-expansion 5.0.12 or later');
});
