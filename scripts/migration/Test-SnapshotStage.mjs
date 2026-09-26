import { createHash } from 'node:crypto';
import {
  lstatSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateSnapshotFileReview } from './Validate-SnapshotFileReview.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ALLOWED_ROOT_FILES = new Map([
  ['.gitignore', 'project-governance'],
  ['docs/superpowers/plans/2026-09-24-s001-t09-snapshot-monorepo-migration.md', 'project-governance'],
  ['docs/superpowers/specs/2026-09-24-s001-t09-snapshot-monorepo-design.md', 'project-governance'],
  ['scripts/migration/Create-SnapshotFileReview.mjs', 'snapshot-migration-tooling'],
  ['scripts/migration/Test-SnapshotFileReview.mjs', 'snapshot-migration-tooling'],
  ['scripts/migration/Test-SnapshotFileReviewClassification.mjs', 'snapshot-migration-tooling'],
  ['scripts/migration/Validate-SnapshotFileReview.mjs', 'snapshot-migration-tooling'],
  ['scripts/migration/Test-SnapshotStage.mjs', 'snapshot-migration-tooling'],
  ['scripts/migration/Test-SnapshotStageGuard.mjs', 'snapshot-migration-tooling'],
]);
const ALLOWED_MODE = new Set(['100644', '100755']);
const ENV_TEMPLATE_NAMES = new Set(['.env.example', '.env.local.example']);
const SKIP_NESTED_GIT_SCAN_DIRS = new Set([
  '.tools', '.worktrees', '.vscode', '.next', '.turbo', 'node_modules', 'target', 'coverage', '.cache', '__pycache__',
]);

function fail(message) {
  throw new Error(`SNAPSHOT_STAGE_REJECTED: ${message}`);
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function parseArgs(args) {
  const parsed = { mode: 'validate', root: repositoryRoot, review: undefined, manifest: undefined, maxFileBytes: MAX_FILE_BYTES };
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === '--generate') {
      parsed.mode = 'generate';
      continue;
    }
    if (!['--root', '--review', '--manifest', '--output', '--pathspec-output', '--max-file-bytes'].includes(option) || index + 1 >= args.length) {
      fail(`unknown or incomplete option ${option}`);
    }
    const value = args[++index];
    if (option === '--root') parsed.root = path.resolve(value);
    else if (option === '--review') parsed.review = path.resolve(value);
    else if (option === '--manifest') parsed.manifest = path.resolve(value);
    else if (option === '--output') parsed.output = path.resolve(value);
    else if (option === '--pathspec-output') parsed.pathspecOutput = path.resolve(value);
    else {
      parsed.maxFileBytes = Number(value);
      if (!Number.isSafeInteger(parsed.maxFileBytes) || parsed.maxFileBytes < 1) fail('max file size must be a positive integer');
    }
  }
  if (!parsed.review) fail('--review is required');
  if (parsed.mode === 'generate' && (!parsed.output || !parsed.pathspecOutput)) fail('--output and --pathspec-output are required with --generate');
  if (parsed.mode === 'validate' && !parsed.manifest) fail('--manifest is required');
  return parsed;
}

function normalizedPath(value, label) {
  if (typeof value !== 'string' || value.length === 0 || path.isAbsolute(value)
    || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('\\\\')) {
    fail(`${label} must be a non-empty repository-relative path`);
  }
  const normalized = value.replaceAll('\\', '/');
  const parts = normalized.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) fail(`${label} is not normalized`);
  return normalized;
}

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(`${label} has missing or unexpected properties`);
  }
}

function git(root, args, encoding = 'buffer') {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding,
      maxBuffer: 128 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const detail = Buffer.isBuffer(error.stderr) ? error.stderr.toString('utf8').trim() : String(error.stderr ?? '').trim();
    fail(`git ${args[0]} failed${detail ? `: ${detail}` : ''}`);
  }
}

function validateReviewAgainstTree(root, review, reviewBytes) {
  rejectNestedGitDirectories(root);
  const candidateTopLevel = review.topLevel?.map((entry) => entry.path) ?? [];
  const sourceCandidates = parseNulPaths(git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'api', 'web']));
  const reviewCandidates = review.files?.map((entry) => entry.path) ?? [];
  validateSnapshotFileReview(review, { rootDir: root, candidateTopLevel, candidateFiles: reviewCandidates });
  const decisions = new Map(review.files.map((entry) => [entry.path.replaceAll('\\', '/'), entry]));
  for (const candidate of sourceCandidates) {
    if (!decisions.has(candidate)) fail(`unclassified current API/web candidate: ${candidate}`);
  }
  for (const entry of review.files.filter((item) => item.status === 'INCLUDE' && /^(api|web)\//.test(item.path))) {
    const absolutePath = path.join(root, ...entry.path.split('/'));
    if (!lstatSync(absolutePath).isFile() || lstatSync(absolutePath).isSymbolicLink()) fail(`only regular files are supported: ${entry.path}`);
    if (sha256(readFileSync(absolutePath)) !== entry.sha256) fail(`Task 2 file hash changed: ${entry.path}`);
  }
  if (!reviewBytes.length) fail('Task 2 review manifest is empty');
}

function categoryForExclusion(entry) {
  const reason = entry.reason.toLowerCase();
  if (reason.includes('environment')) return 'local-environment';
  if (reason.includes('ide') || reason.includes('workstation settings')) return 'editor-settings';
  if (reason.includes('cache') || reason.includes('generated')) return 'generated-cache-or-output';
  if (reason.includes('superseded') || reason.includes('migration plan')) return 'superseded-project-document';
  if (reason.includes('workstation-specific')) return 'workstation-specific-content';
  if (reason.includes('continuity') || reason.includes('personal')) return 'personal-working-note';
  return 'other-reviewed-exclusion';
}

function createSnapshotManifest({ root, reviewPath, outputPath, pathspecOutput }) {
  const resolvedRoot = path.resolve(root);
  const evidenceRoot = path.resolve(resolvedRoot, '.worktrees/s001-t09-private-evidence') + path.sep;
  if (!path.resolve(outputPath).startsWith(evidenceRoot)) fail('manifest output must remain under private local evidence');
  if (!path.resolve(pathspecOutput).startsWith(evidenceRoot)) fail('pathspec output must remain under private local evidence');
  const reviewBytes = readFileSync(reviewPath);
  const review = JSON.parse(reviewBytes.toString('utf8'));
  validateReviewAgainstTree(resolvedRoot, review, reviewBytes);
  const rootEntries = [];
  for (const [relativePath, group] of ALLOWED_ROOT_FILES) {
    const absolutePath = path.join(resolvedRoot, ...relativePath.split('/'));
    let info;
    try { info = lstatSync(absolutePath); } catch { fail(`reviewed project file is absent: ${relativePath}`); }
    if (!info.isFile() || info.isSymbolicLink()) fail(`only regular files are supported: ${relativePath}`);
    rootEntries.push({ path: relativePath, group, absolutePath });
  }
  const included = review.files.filter((entry) => entry.status === 'INCLUDE' && /^(api|web)\//.test(entry.path));
  const allEntries = [
    ...included.map((entry) => ({ path: entry.path.replaceAll('\\', '/'), group: entry.group, reviewSha256: entry.sha256 })),
    ...rootEntries,
  ].sort((left, right) => left.path.localeCompare(right.path));
  const files = allEntries.map((entry) => {
    const absolutePath = entry.absolutePath ?? path.join(resolvedRoot, ...entry.path.split('/'));
    const info = lstatSync(absolutePath);
    if (!info.isFile() || info.isSymbolicLink()) fail(`only regular files are supported: ${entry.path}`);
    const bytes = readFileSync(absolutePath);
    const sourceSha256 = sha256(bytes);
    if (entry.reviewSha256 && sourceSha256 !== entry.reviewSha256) fail(`Task 2 file hash changed: ${entry.path}`);
    if (bytes.length > MAX_FILE_BYTES) fail(`file exceeds ${MAX_FILE_BYTES} byte review limit: ${entry.path}`);
    const gitBlobOid = git(resolvedRoot, ['hash-object', `--path=${entry.path}`, '--', entry.path], 'utf8').trim();
    const gitMode = entry.path === 'api/services/identity-profile-service/mvnw' ? '100755' : '100644';
    return { path: entry.path, sourceSha256, gitBlobOid, gitMode, group: entry.group };
  });
  const excludedCounts = new Map();
  for (const entry of review.files.filter((item) => item.status === 'EXCLUDE')) {
    const category = categoryForExclusion(entry);
    excludedCounts.set(category, (excludedCounts.get(category) ?? 0) + 1);
  }
  for (const item of review.generatedExcludedCategories ?? []) {
    const category = 'ignored-local-path-policy';
    excludedCounts.set(category, (excludedCounts.get(category) ?? 0) + (item.paths?.length ?? item.pathSegments?.length ?? 1));
  }
  const head = git(resolvedRoot, ['rev-parse', 'HEAD'], 'utf8').trim();
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(head)) fail('bootstrap HEAD is not a full Git commit ID');
  const manifest = {
    schemaVersion: 1,
    bootstrapRootHead: head,
    fileReviewSha256: sha256(reviewBytes),
    files,
    excluded: [...excludedCounts.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([category, count]) => ({ category, count })),
  };
  writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8' });
  writeFileSync(pathspecOutput, Buffer.from(`${files.map((entry) => entry.path).join('\0')}\0`, 'utf8'));
  process.stdout.write(`SNAPSHOT_MANIFEST_CREATED: files=${files.length}; task2Included=${included.length}; projectRootFiles=${rootEntries.length}; privateOutputOnly\n`);
}

function parseNulPaths(buffer) {
  const output = buffer.toString('utf8');
  if (output && !output.endsWith('\0')) fail('Git NUL-delimited path output is malformed');
  return output.split('\0').filter(Boolean).map((entry) => entry.replaceAll('\\', '/'));
}

function parseIndex(buffer) {
  const entries = [];
  let start = 0;
  while (start < buffer.length) {
    const end = buffer.indexOf(0, start);
    if (end < 0) fail('Git index output is not NUL-terminated');
    const record = buffer.subarray(start, end).toString('utf8');
    const match = /^(\d{6}) ([0-9a-f]+) ([0-3])\t([\s\S]+)$/.exec(record);
    if (!match) fail('Git index record has an unsupported format');
    entries.push({ mode: match[1], oid: match[2], stage: Number(match[3]), path: match[4].replaceAll('\\', '/') });
    start = end + 1;
  }
  return entries;
}

function isProhibitedPath(relativePath) {
  const parts = relativePath.toLowerCase().split('/');
  const base = parts.at(-1);
  if (parts.some((part) => ['.git', '.worktrees', '.vscode', '.tools', 'node_modules', '.next', '.turbo', 'target'].includes(part))) return true;
  if (base.startsWith('.env') && !ENV_TEMPLATE_NAMES.has(base)) return true;
  if (/(?:^|\/)(?:evidence|reports?)\/.*(?:raw|report).+\.(?:json|sarif|txt)$/i.test(relativePath)) return true;
  if (/(?:\.raw|\.raw-report|\.report\.raw)\.(?:json|sarif)$/i.test(base)) return true;
  if (/\.trivy\.(?:json|sarif)$/i.test(base) || /(?:^|[-_.])raw(?:[-_.]|$)/i.test(base)) return true;
  return false;
}

function rejectNestedGitDirectories(root) {
  for (const sourceRoot of ['api', 'web']) {
    const start = path.join(root, sourceRoot);
    const walk = (directory) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.name.toLowerCase() === '.git') fail(`physical nested Git metadata found under ${sourceRoot}`);
        if (entry.isDirectory() && !SKIP_NESTED_GIT_SCAN_DIRS.has(entry.name.toLowerCase())) walk(path.join(directory, entry.name));
      }
    };
    if (lstatSync(start).isDirectory()) walk(start);
  }
}

function validateManifest(manifest, review, root, reviewBytes) {
  assertExactKeys(manifest, ['schemaVersion', 'bootstrapRootHead', 'fileReviewSha256', 'files', 'excluded'], 'snapshot manifest');
  if (manifest.schemaVersion !== 1) fail('snapshot manifest schemaVersion must be 1');
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(manifest.bootstrapRootHead ?? '')) fail('bootstrapRootHead must be a full Git commit ID');
  if (!/^[0-9a-f]{64}$/i.test(manifest.fileReviewSha256 ?? '') || sha256(reviewBytes) !== manifest.fileReviewSha256) {
    fail('file-review manifest SHA-256 mismatch');
  }
  if (!Array.isArray(manifest.files) || !Array.isArray(manifest.excluded)) fail('files and excluded arrays are required');
  const includedReview = new Map();
  for (const entry of review.files) {
    if (entry.status === 'INCLUDE' && /^(api|web)\//.test(entry.path.replaceAll('\\', '/'))) {
      includedReview.set(normalizedPath(entry.path, 'review path'), entry);
    }
  }
  const seen = new Set();
  const expectedFiles = new Map();
  for (const entry of manifest.files) {
    assertExactKeys(entry, ['path', 'sourceSha256', 'gitBlobOid', 'gitMode', 'group'], 'snapshot file entry');
    const relativePath = normalizedPath(entry.path, 'snapshot file path');
    const key = relativePath.toLowerCase();
    if (seen.has(key)) fail(`duplicate manifest path ${relativePath}`);
    seen.add(key);
    if (isProhibitedPath(relativePath)) fail(`prohibited path is listed for staging: ${relativePath}`);
    if (!/^[0-9a-f]{64}$/i.test(entry.sourceSha256 ?? '')) fail(`invalid source SHA-256 for ${relativePath}`);
    if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(entry.gitBlobOid ?? '')) fail(`invalid Git blob OID for ${relativePath}`);
    if (!ALLOWED_MODE.has(entry.gitMode)) fail(`unsupported Git mode for ${relativePath}`);
    if (typeof entry.group !== 'string' || !entry.group.trim()) fail(`review group is required for ${relativePath}`);
    if (relativePath.startsWith('api/') || relativePath.startsWith('web/')) {
      const reviewed = includedReview.get(relativePath);
      if (!reviewed || reviewed.sha256 !== entry.sourceSha256 || reviewed.group !== entry.group) fail(`Task 2 review mismatch for ${relativePath}`);
      includedReview.delete(relativePath);
    } else if (ALLOWED_ROOT_FILES.get(relativePath) !== entry.group) {
      fail(`root path is not on the reviewed project-file allowlist: ${relativePath}`);
    }
    const absolutePath = path.join(root, ...relativePath.split('/'));
    let fileInfo;
    try { fileInfo = lstatSync(absolutePath); } catch { fail(`included file is absent: ${relativePath}`); }
    if (!fileInfo.isFile() || fileInfo.isSymbolicLink()) fail(`only regular files are supported: ${relativePath}`);
    if (sha256(readFileSync(absolutePath)) !== entry.sourceSha256) fail(`source SHA-256 mismatch for ${relativePath}`);
    const expectedOid = git(root, ['hash-object', `--path=${relativePath}`, '--', relativePath], 'utf8').trim();
    if (expectedOid !== entry.gitBlobOid) fail(`Git-filtered blob OID mismatch for ${relativePath}`);
    expectedFiles.set(relativePath, entry);
  }
  if (includedReview.size) fail(`Task 2 included paths missing from snapshot manifest: ${[...includedReview.keys()].slice(0, 5).join(', ')}`);
  for (const excluded of manifest.excluded) {
    assertExactKeys(excluded, ['category', 'count'], 'excluded category');
    if (typeof excluded.category !== 'string' || !excluded.category.trim() || !Number.isSafeInteger(excluded.count) || excluded.count < 0) {
      fail('excluded category/count is invalid');
    }
  }
  return expectedFiles;
}

function validateSnapshotStage({ root, reviewPath, manifestPath, maxFileBytes = MAX_FILE_BYTES }) {
  const resolvedRoot = path.resolve(root);
  if (!statSync(resolvedRoot).isDirectory()) fail('repository root is not a directory');
  rejectNestedGitDirectories(resolvedRoot);

  const reviewBytes = readFileSync(reviewPath);
  const review = JSON.parse(reviewBytes.toString('utf8'));
  validateReviewAgainstTree(resolvedRoot, review, reviewBytes);
  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const expectedFiles = validateManifest(manifest, review, resolvedRoot, reviewBytes);
  const changed = parseNulPaths(git(resolvedRoot, ['diff', '--cached', '--name-only', '-z']));
  const index = parseIndex(git(resolvedRoot, ['ls-files', '--stage', '-z']));
  const stagedEntries = index.filter((entry) => entry.stage === 0);
  if (index.some((entry) => entry.mode === '160000')) fail('gitlink/submodule mode 160000 is staged');
  if (index.some((entry) => entry.stage !== 0)) fail('unmerged index stages are present');
  if (new Set(index.map((entry) => entry.path)).size !== index.length) fail('duplicate index entries are present');
  const stagedPaths = new Set(changed);
  const indexByPath = new Map(stagedEntries.map((entry) => [entry.path, entry]));
  if (stagedPaths.size !== indexByPath.size || [...stagedPaths].some((entry) => !indexByPath.has(entry))) {
    fail('staged changes and index entries differ (unexpected deletion or unstaged index path)');
  }
  if (stagedPaths.size !== expectedFiles.size || [...expectedFiles.keys()].some((entry) => !stagedPaths.has(entry))) {
    const missing = [...expectedFiles.keys()].filter((entry) => !stagedPaths.has(entry));
    const unexpected = [...stagedPaths].filter((entry) => !expectedFiles.has(entry));
    fail(`staged path set differs from manifest; missing=${missing.slice(0, 5).join(',')}; unexpected=${unexpected.slice(0, 5).join(',')}`);
  }

  let totalBytes = 0;
  for (const [relativePath, expected] of expectedFiles) {
    if (isProhibitedPath(relativePath)) fail(`prohibited staged path ${relativePath}`);
    const entry = indexByPath.get(relativePath);
    if (!entry) fail(`manifest path missing from index: ${relativePath}`);
    if (!ALLOWED_MODE.has(entry.mode)) fail(`unsupported Git index mode ${entry.mode} for ${relativePath}`);
    if (entry.mode !== expected.gitMode) fail(`Git mode mismatch for ${relativePath}: expected ${expected.gitMode}, got ${entry.mode}`);
    if (entry.oid !== expected.gitBlobOid) fail(`staged Git blob does not match manifest for ${relativePath}`);
    const objectType = git(resolvedRoot, ['cat-file', '-t', entry.oid], 'utf8').trim();
    if (objectType !== 'blob') fail(`staged object is not a blob: ${relativePath}`);
    const stagedBlob = git(resolvedRoot, ['cat-file', 'blob', entry.oid]);
    if (stagedBlob.length > maxFileBytes) fail(`staged file exceeds ${maxFileBytes} byte limit: ${relativePath}`);
    totalBytes += stagedBlob.length;
  }
  process.stdout.write(`SNAPSHOT_STAGE_VALID: files=${expectedFiles.size}; stagedBytes=${totalBytes}; nestedGit=0; gitlinks=0\n`);
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const parsed = parseArgs(process.argv.slice(2));
    if (parsed.mode === 'generate') createSnapshotManifest({ root: parsed.root, reviewPath: parsed.review, outputPath: parsed.output, pathspecOutput: parsed.pathspecOutput });
    else validateSnapshotStage({ root: parsed.root, reviewPath: parsed.review, manifestPath: parsed.manifest, maxFileBytes: parsed.maxFileBytes });
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
