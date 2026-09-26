import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { test } from 'node:test';

const guardPath = path.resolve('scripts/migration/Test-SnapshotStage.mjs');

function git(rootDir, ...args) {
  return execFileSync('git', args, { cwd: rootDir, stdio: ['ignore', 'pipe', 'pipe'] });
}

function hashFile(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function makeFixture({ files = { 'api/sample.txt': 'reviewed source\n' }, modes = {}, attributes = '' } = {}) {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), 'snapshot-stage-'));
  git(rootDir, 'init', '-q');
  git(rootDir, 'config', 'user.name', 'Snapshot Fixture');
  git(rootDir, 'config', 'user.email', 'snapshot-fixture@example.invalid');
  git(rootDir, 'commit', '--allow-empty', '-m', 'fixture baseline');
  if (attributes) writeFileSync(path.join(rootDir, '.gitattributes'), attributes);

  mkdirSync(path.join(rootDir, 'api'), { recursive: true });
  mkdirSync(path.join(rootDir, 'web'), { recursive: true });
  const entries = [];
  const reviewFiles = [];
  const candidateTopLevel = ['api', 'web'];
  for (const [relativePath, text] of Object.entries(files)) {
    const absolutePath = path.join(rootDir, ...relativePath.split('/'));
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    const bytes = Buffer.isBuffer(text) ? text : Buffer.from(text);
    writeFileSync(absolutePath, bytes);
    const blobOid = git(rootDir, 'hash-object', `--path=${relativePath}`, '--', relativePath).toString('utf8').trim();
    const entry = {
      path: relativePath,
      sourceSha256: hashFile(bytes),
      gitBlobOid: blobOid,
      gitMode: modes[relativePath] ?? '100644',
      group: 'fixture',
    };
    entries.push(entry);
    reviewFiles.push({
      path: relativePath,
      status: 'INCLUDE',
      group: 'fixture',
      reason: 'Reviewed fixture path.',
      reviewer: 'AkaDNT',
      sha256: entry.sourceSha256,
    });
  }

  const review = {
    schemaVersion: 1,
    reviewer: 'AkaDNT',
    topLevel: candidateTopLevel.map((entry) => ({ path: entry, status: 'INCLUDE', reason: 'Fixture root.', reviewer: 'AkaDNT' })),
    files: reviewFiles,
  };
  const reviewPath = path.join(rootDir, 'review.json');
  const manifestPath = path.join(rootDir, 'snapshot-manifest.json');
  writeFileSync(reviewPath, JSON.stringify(review));
  const fileReviewSha256 = createHash('sha256').update(readFileSync(reviewPath)).digest('hex');
  writeFileSync(manifestPath, JSON.stringify({
    schemaVersion: 1,
    bootstrapRootHead: 'a'.repeat(40),
    fileReviewSha256,
    files: entries,
    excluded: [],
  }));

  return { rootDir, files, review, reviewPath, manifestPath, entries };
}

function runGuard(fixture, extraArgs = []) {
  return spawnSync(process.execPath, [
    guardPath,
    '--root', fixture.rootDir,
    '--review', fixture.reviewPath,
    '--manifest', fixture.manifestPath,
    '--max-file-bytes', '128',
    ...extraArgs,
  ], { encoding: 'utf8' });
}

function withFixture(options, action) {
  const fixture = makeFixture(options);
  try {
    action(fixture);
  } finally {
    rmSync(fixture.rootDir, { recursive: true, force: true });
  }
}

test('accepts reviewed regular files and the reviewed .env.example exception', () => {
  withFixture({ files: { 'api/sample.txt': 'reviewed source\n', 'api/.env.example': 'DATABASE_URL=localhost\n' } }, (fixture) => {
    git(fixture.rootDir, 'add', '--', 'api/sample.txt', 'api/.env.example');
    const result = runGuard(fixture);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /SNAPSHOT_STAGE_VALID/);
  });
});

test('accepts a reviewed executable when the manifest and index both declare 100755', () => {
  withFixture({ files: { 'api/tool.sh': '#!/bin/sh\nexit 0\n' }, modes: { 'api/tool.sh': '100755' } }, (fixture) => {
    git(fixture.rootDir, 'add', '--', 'api/tool.sh');
    git(fixture.rootDir, 'update-index', '--chmod=+x', '--', 'api/tool.sh');
    const result = runGuard(fixture);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
});

test('distinguishes source SHA-256 from the Git-normalized blob when autocrlf/eol filters apply', () => {
  withFixture({ files: { 'api/sample.txt': Buffer.from('first line\r\nsecond line\r\n') }, attributes: 'api/*.txt text eol=lf\n' }, (fixture) => {
    git(fixture.rootDir, 'add', '--', 'api/sample.txt');
    const result = runGuard(fixture);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
});

test('rejects staged environment secrets', () => {
  withFixture({ files: { 'api/.env.local': 'DATABASE_URL=secret\n' } }, (fixture) => {
    git(fixture.rootDir, 'add', '-f', '--', 'api/.env.local');
    assert.notEqual(runGuard(fixture).status, 0);
  });
});

test('rejects physical nested .git metadata even when it is not staged', () => {
  withFixture(undefined, (fixture) => {
    mkdirSync(path.join(fixture.rootDir, 'api', '.git'), { recursive: true });
    writeFileSync(path.join(fixture.rootDir, 'api', '.git', 'config'), '[core]\n');
    git(fixture.rootDir, 'add', '--', 'api/sample.txt');
    assert.notEqual(runGuard(fixture).status, 0);
  });
});

test('rejects gitlink index entries with mode 160000', () => {
  withFixture(undefined, (fixture) => {
    git(fixture.rootDir, 'add', '--', 'api/sample.txt');
    const head = git(fixture.rootDir, 'rev-parse', 'HEAD').toString('utf8').trim();
    git(fixture.rootDir, 'update-index', '--add', '--cacheinfo', `160000,${head},api/nested-repository`);
    assert.notEqual(runGuard(fixture).status, 0);
  });
});

for (const prohibitedPath of [
  'api/.worktrees/private.txt',
  'api/.vscode/settings.json',
  'api/.tools/tool.exe',
  'api/node_modules/pkg/index.js',
  'web/.next/server/page.js',
  'api/services/demo/target/classes/Secret.class',
  'web/.turbo/turbo-build.log',
  'api/evidence/trivy.raw.json',
]) {
  test(`rejects staged prohibited path ${prohibitedPath}`, () => {
    withFixture({ files: { [prohibitedPath]: 'fixture content\n' } }, (fixture) => {
      git(fixture.rootDir, 'add', '-f', '--', prohibitedPath);
      assert.notEqual(runGuard(fixture).status, 0);
    });
  });
}

test('rejects a staged binary larger than the configured limit', () => {
  withFixture({ files: { 'api/large.bin': Buffer.alloc(129, 0x00) } }, (fixture) => {
    git(fixture.rootDir, 'add', '--', 'api/large.bin');
    assert.notEqual(runGuard(fixture).status, 0);
  });
});

test('rejects a staged file that is absent from the reviewed manifest', () => {
  withFixture(undefined, (fixture) => {
    writeFileSync(path.join(fixture.rootDir, 'api', 'surprise.txt'), 'unreviewed\n');
    git(fixture.rootDir, 'add', '--', 'api/sample.txt', 'api/surprise.txt');
    assert.notEqual(runGuard(fixture).status, 0);
  });
});

test('rejects source bytes changed after snapshot manifest creation', () => {
  withFixture(undefined, (fixture) => {
    writeFileSync(path.join(fixture.rootDir, 'api', 'sample.txt'), 'changed after review\n');
    git(fixture.rootDir, 'add', '--', 'api/sample.txt');
    assert.notEqual(runGuard(fixture).status, 0);
  });
});

test('rejects a staged Git blob that differs from the manifest blob OID', () => {
  withFixture(undefined, (fixture) => {
    git(fixture.rootDir, 'add', '--', 'api/sample.txt');
    writeFileSync(path.join(fixture.rootDir, 'api', 'sample.txt'), 'worktree changed after staging\n');
    assert.notEqual(runGuard(fixture).status, 0);
  });
});

test('rejects Git mode mismatches, including a missing executable bit', () => {
  withFixture({ files: { 'api/mvnw': '#!/bin/sh\nexit 0\n' }, modes: { 'api/mvnw': '100755' } }, (fixture) => {
    git(fixture.rootDir, 'add', '--', 'api/mvnw');
    assert.notEqual(runGuard(fixture).status, 0);
  });
});

test('rejects invalid mode values and absolute manifest paths', () => {
  withFixture(undefined, (fixture) => {
    git(fixture.rootDir, 'add', '--', 'api/sample.txt');
    const manifest = JSON.parse(readFileSync(fixture.manifestPath, 'utf8'));
    manifest.files[0].gitMode = '120000';
    writeFileSync(fixture.manifestPath, JSON.stringify(manifest));
    assert.notEqual(runGuard(fixture).status, 0);
  });

  withFixture(undefined, (fixture) => {
    git(fixture.rootDir, 'add', '--', 'api/sample.txt');
    const manifest = JSON.parse(readFileSync(fixture.manifestPath, 'utf8'));
    manifest.files[0].path = path.join(os.tmpdir(), 'private.txt');
    writeFileSync(fixture.manifestPath, JSON.stringify(manifest));
    assert.notEqual(runGuard(fixture).status, 0);
  });
});
