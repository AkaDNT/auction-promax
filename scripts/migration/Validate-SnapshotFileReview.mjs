import { existsSync } from 'node:fs';
import path from 'node:path';

function assert(condition, message) {
  if (!condition) throw new Error(`SNAPSHOT_FILE_REVIEW_INVALID: ${message}`);
}

function normalizedRelativePath(value, label) {
  assert(typeof value === 'string' && value.length > 0, `${label} path is required`);
  assert(!path.isAbsolute(value) && !/^[A-Za-z]:[\\/]/.test(value) && !value.startsWith('\\\\'), `${label} path must be relative`);
  const normalized = value.replaceAll('\\', '/');
  const parts = normalized.split('/');
  assert(parts.every((part) => part && part !== '.' && part !== '..'), `${label} path is not normalized`);
  return normalized;
}

function requireDecision(entry, label) {
  assert(entry && typeof entry === 'object' && !Array.isArray(entry), `${label} must be an object`);
  assert(['INCLUDE', 'EXCLUDE'].includes(entry.status), `${label} status must be INCLUDE or EXCLUDE`);
  assert(typeof entry.reason === 'string' && entry.reason.trim().length > 0, `${label} reason is required`);
  assert(typeof entry.reviewer === 'string' && entry.reviewer.trim().length > 0, `${label} reviewer is required`);
}

function isProhibitedIncludedPath(relativePath) {
  const parts = relativePath.toLowerCase().split('/');
  const baseName = parts.at(-1);
  if (parts.includes('.git') || parts.includes('.worktrees') || parts.includes('.vscode') || parts.includes('.tools')) return true;
  if (parts.includes('node_modules') || parts.includes('.next') || parts.includes('.turbo') || parts.includes('target')) return true;
  if (baseName.startsWith('.env') && !['.env.example', '.env.local.example'].includes(baseName)) return true;
  if (/(?:^|\/)(?:evidence|reports?)\/.*(?:raw|report).+\.(?:json|sarif|txt)$/i.test(relativePath)) return true;
  if (/(?:^|\/)[^/]*(?:\.raw|\.raw-report|\.report\.raw)\.(?:json|sarif)$/i.test(relativePath)) return true;
  return false;
}

export function validateSnapshotFileReview(review, { rootDir, candidateTopLevel, candidateFiles } = {}) {
  assert(review && typeof review === 'object' && !Array.isArray(review), 'review document must be an object');
  assert(review.schemaVersion === 1, 'schemaVersion must equal 1');
  assert(Array.isArray(review.topLevel) && Array.isArray(review.files), 'topLevel and files arrays are required');
  assert(typeof review.reviewer === 'string' && review.reviewer.trim().length > 0, 'default reviewer is required');
  assert(typeof rootDir === 'string' && path.isAbsolute(rootDir), 'absolute rootDir is required');
  assert(Array.isArray(candidateTopLevel) && Array.isArray(candidateFiles), 'candidate path inventories are required');

  const topLevelMap = new Map();
  for (const entry of review.topLevel) {
    requireDecision(entry, 'topLevel entry');
    const relativePath = normalizedRelativePath(entry.path, 'topLevel entry');
    assert(!topLevelMap.has(relativePath.toLowerCase()), `duplicate top-level path ${relativePath}`);
    topLevelMap.set(relativePath.toLowerCase(), entry);
  }
  const expectedTopLevel = new Set(candidateTopLevel.map((p) => normalizedRelativePath(p, 'candidate top-level').toLowerCase()));
  assert(expectedTopLevel.size === topLevelMap.size, 'top-level classifications do not match the candidate set');
  for (const expected of expectedTopLevel) assert(topLevelMap.has(expected), `unclassified top-level path ${expected}`);

  const fileMap = new Map();
  for (const entry of review.files) {
    requireDecision(entry, 'file entry');
    const relativePath = normalizedRelativePath(entry.path, 'file entry');
    const key = relativePath.toLowerCase();
    assert(!fileMap.has(key), `duplicate file path ${relativePath}`);
    if (entry.status === 'INCLUDE') {
      assert(!isProhibitedIncludedPath(relativePath), `prohibited path may not be included: ${relativePath}`);
      if (relativePath.toLowerCase().startsWith('api/')) {
        assert(typeof entry.group === 'string' && entry.group.trim().length > 0, `included API path requires an explicit group: ${relativePath}`);
      }
      assert(existsSync(path.join(rootDir, ...relativePath.split('/'))), `included file is absent from disk: ${relativePath}`);
    }
    fileMap.set(key, entry);
  }
  const expectedFiles = new Set(candidateFiles.map((p) => normalizedRelativePath(p, 'candidate file').toLowerCase()));
  for (const expected of expectedFiles) assert(fileMap.has(expected), `unclassified candidate file ${expected}`);
  return true;
}
