import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { validateSnapshotFileReview } from './Validate-SnapshotFileReview.mjs';

function makeFixture() {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), 'snapshot-review-'));
  mkdirSync(path.join(rootDir, 'api'), { recursive: true });
  mkdirSync(path.join(rootDir, 'web'), { recursive: true });
  writeFileSync(path.join(rootDir, 'api', 'sample.mjs'), 'export {};\n');
  writeFileSync(path.join(rootDir, 'web', 'sample.mjs'), 'export {};\n');
  const review = {
    schemaVersion: 1,
    reviewer: 'AkaDNT',
    topLevel: [
      { path: 'api', status: 'INCLUDE', reason: 'Reviewed API snapshot root.', reviewer: 'AkaDNT' },
      { path: 'web', status: 'INCLUDE', reason: 'Reviewed web snapshot root.', reviewer: 'AkaDNT' },
    ],
    files: [
      { path: 'api/sample.mjs', status: 'INCLUDE', group: 'api-runtime', reason: 'Fixture source.', reviewer: 'AkaDNT' },
      { path: 'web/sample.mjs', status: 'INCLUDE', group: 'web-runtime', reason: 'Fixture source.', reviewer: 'AkaDNT' },
    ],
  };
  return { rootDir, review, candidateTopLevel: ['api', 'web'], candidateFiles: ['api/sample.mjs', 'web/sample.mjs'] };
}

function runWithMutation(mutator, { throws = true } = {}) {
  const fixture = makeFixture();
  try {
    mutator(fixture);
    const result = () => validateSnapshotFileReview(fixture.review, {
      rootDir: fixture.rootDir,
      candidateTopLevel: fixture.candidateTopLevel,
      candidateFiles: fixture.candidateFiles,
    });
    if (throws) assert.throws(result);
    else assert.doesNotThrow(result);
  } finally {
    rmSync(fixture.rootDir, { recursive: true, force: true });
  }
}

test('accepts a complete review with included example env files', () => {
  runWithMutation(({ rootDir, review, candidateTopLevel, candidateFiles }) => {
    mkdirSync(path.join(rootDir, 'api', 'config'), { recursive: true });
    writeFileSync(path.join(rootDir, 'api', 'config', '.env.example'), 'EXAMPLE=value\n');
    review.files.push({ path: 'api/config/.env.example', status: 'INCLUDE', group: 'api-config', reason: 'Template only; contains no credentials.', reviewer: 'AkaDNT' });
    candidateFiles.push('api/config/.env.example');
    validateSnapshotFileReview(review, { rootDir, candidateTopLevel, candidateFiles });
  }, { throws: false });
});

test('accepts a reviewed `.env.local.example` template', () => {
  runWithMutation(({ rootDir, review, candidateTopLevel, candidateFiles }) => {
    writeFileSync(path.join(rootDir, 'api', '.env.local.example'), 'EXAMPLE=value\n');
    review.files.push({ path: 'api/.env.local.example', status: 'INCLUDE', group: 'api-config', reason: 'Template only; secret scan and placeholder review passed.', reviewer: 'AkaDNT' });
    candidateFiles.push('api/.env.local.example');
  }, { throws: false });
});

test('rejects an unclassified candidate path', () => runWithMutation(({ candidateFiles }) => candidateFiles.push('api/unclassified.yml')));
test('rejects a missing top-level classification', () => runWithMutation(({ review }) => { review.topLevel.pop(); }));
test('rejects an included API file without an explicit group', () => runWithMutation(({ review }) => { delete review.files[0].group; }));
test('rejects an included path absent from disk', () => runWithMutation(({ review, candidateFiles }) => {
  review.files[0].path = 'api/missing.mjs';
  candidateFiles[0] = 'api/missing.mjs';
}));
test('rejects empty reviewer or reason', () => runWithMutation(({ review }) => { review.files[0].reason = '  '; }));
test('rejects duplicate paths', () => runWithMutation(({ review, candidateFiles }) => {
  review.files.push({ ...review.files[0] });
  candidateFiles.push('api/sample.mjs');
}));
test('rejects absolute and traversal paths', () => {
  runWithMutation(({ review }) => { review.files[0].path = 'D:\\private\\sample.mjs'; });
  runWithMutation(({ review }) => { review.files[0].path = '../secret.env'; });
});

for (const prohibitedPath of [
  'api/.git/config',
  'api/.env.local',
  'api/node_modules/pkg/index.js',
  'web/.next/server/index.js',
  'api/services/sample/target/classes/Secret.class',
  'web/.turbo/turbo-build.log',
  'api/.tools/tool.exe',
  'api/evidence/trivy.raw.json',
]) {
  test(`rejects prohibited included path: ${prohibitedPath}`, () => runWithMutation(({ rootDir, review, candidateFiles }) => {
    const parts = prohibitedPath.split('/');
    const target = path.join(rootDir, ...parts);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, 'fixture\n');
    review.files.push({ path: prohibitedPath, status: 'INCLUDE', group: 'fixture', reason: 'Should be rejected.', reviewer: 'AkaDNT' });
    candidateFiles.push(prohibitedPath);
  }));
}

test('allows a prohibited local path only when explicitly excluded', () => runWithMutation(({ review }) => {
  review.files.push({ path: 'api/.env.local', status: 'EXCLUDE', reason: 'Local secret environment file; not inspected.', reviewer: 'AkaDNT' });
}, { throws: false }));
