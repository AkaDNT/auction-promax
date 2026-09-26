import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSnapshotFileReview } from './Validate-SnapshotFileReview.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../..');
const privateEvidencePath = path.join(repositoryRoot, '.worktrees/s001-t09-private-evidence/file-review.json');

const explicitExclusions = new Map([
  ['api/docs/superpowers/plans/2026-09-24-s001-t09-monorepo-migration.md', 'Superseded subtree-migration instructions conflict with the approved snapshot plan.'],
  ['api/docs/guides/S001-T06-blocker-resolution.html', 'Contains workstation-specific absolute paths and is not reusable production documentation.'],
  ['api/docs/sprints/Continue_Current_Sprint.txt', 'Personal operator-continuity note; not canonical project documentation.'],
  ['.vscode/settings.json', 'IDE/workstation settings are not part of the product or shared build contract.'],
]);

function excluded(reason) {
  return { status: 'EXCLUDE', reason };
}

function included(group, reason) {
  return { status: 'INCLUDE', group, reason };
}

export function classifySnapshotPath(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/');
  const lower = normalized.toLowerCase();
  const parts = lower.split('/');
  const baseName = parts.at(-1);

  if (explicitExclusions.has(normalized)) return excluded(explicitExclusions.get(normalized));
  if (parts.some((part) => ['.git', '.worktrees', '.vscode', '.tools', 'node_modules', '.next', '.turbo', 'target', 'coverage'].includes(part))) {
    return excluded('Local tooling, IDE state, dependency install, cache, or generated build output.');
  }
  if (baseName.startsWith('.env') && !['.env.example', '.env.local.example'].includes(baseName)) {
    return excluded('Environment-specific configuration may contain secrets; never publish it.');
  }
  if (['.ds_store', 'thumbs.db'].includes(baseName) || /\.(?:log|tsbuildinfo)$/i.test(baseName)) {
    return excluded('Operating-system or generated diagnostic/build output.');
  }
  if (/\.(?:pem|key|p12|pfx|jks)$/i.test(baseName) || /(?:^|\/)(?:id_rsa|id_ed25519)(?:\.pub)?$/i.test(normalized)) {
    return excluded('Private-key or certificate material is not permitted in the public source snapshot.');
  }
  if (/(?:^|\/)(?:evidence|reports?)\/.*(?:raw|report).+\.(?:json|sarif|txt)$/i.test(normalized)
    || /(?:\.raw|\.raw-report|\.report\.raw)\.(?:json|sarif)$/i.test(baseName)) {
    return excluded('Raw security/scanner evidence is not publishable.');
  }

  if (lower.startsWith('api/')) {
    if (lower.startsWith('api/.github/workflows/')) {
      return included('api-ci-migration-input', 'Existing API workflow source to be reviewed and relocated to root .github/workflows in Task 4.');
    }
    if (lower.startsWith('api/contracts/')) return included('api-contracts', 'Canonical producer contracts, schemas, fixtures, and validators.');
    if (lower.startsWith('api/infra/')) return included('api-infrastructure', 'Infrastructure source and local PostgreSQL verification/bootstrap assets.');
    if (lower.startsWith('api/services/')) return included('api-service', 'API service source, tests, Maven build, and container definition.');
    if (lower.startsWith('api/scripts/')) return included('api-tooling-and-tests', 'Project-maintained verification, migration, and supply-chain tooling.');
    if (lower.startsWith('api/security/')) return included('api-security-contracts', 'Security schemas, policy contracts, and non-secret test fixtures.');
    if (lower.startsWith('api/docs/')) return included('api-project-docs', 'Architecture, decisions, runbooks, sprint and security documentation for project contributors.');
    if (['api/.npmrc', 'api/.nvmrc', 'api/.gitignore', 'api/.env.local.example'].includes(normalized)) {
      return included('api-build-config', 'Reviewed API toolchain/configuration template; secret scan must pass before publication.');
    }
    return { status: 'HOLD', reason: 'API path does not match an approved production snapshot group.' };
  }

  if (lower.startsWith('web/')) {
    if (['web/agents.md', 'web/claude.md'].includes(lower)) {
      return included('web-agent-guidance', 'Project-maintained web coding guidance; CLAUDE.md references the adjacent AGENTS.md.');
    }
    if (lower.startsWith('web/.github/workflows/')) {
      return included('web-ci-migration-input', 'Existing web workflow source to be reviewed and relocated to root .github/workflows in Task 4.');
    }
    if (lower.startsWith('web/app/')) return included('web-app', 'Next.js application routes, metadata and shared styling.');
    if (lower.startsWith('web/features/')) return included('web-feature', 'User-facing application feature source and tests.');
    if (lower.startsWith('web/shared/')) return included('web-shared-runtime', 'Shared web runtime components and libraries.');
    if (lower.startsWith('web/public/')) return included('web-public-assets', 'Reviewed static assets served by the web application.');
    if (lower.startsWith('web/docs/')) return included('web-project-docs', 'Contributor-facing web build/toolchain documentation.');
    if (lower.startsWith('web/scripts/')) return included('web-tooling-and-tests', 'Project-maintained web toolchain verification.');
    if (['web/.npmrc', 'web/.nvmrc', 'web/.gitignore', 'web/Dockerfile', 'web/eslint.config.mjs', 'web/next.config.ts', 'web/package.json', 'web/package-lock.json', 'web/postcss.config.mjs', 'web/tsconfig.json'].includes(normalized)) {
      return included('web-build-config', 'Required web build, lint, runtime, or container configuration.');
    }
    return { status: 'HOLD', reason: 'Web path does not match an approved production snapshot group.' };
  }

  return { status: 'HOLD', reason: 'Path is outside the API/web source snapshot scope.' };
}

function candidatePaths() {
  const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'api', 'web'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return [...new Set(output.split(/\r?\n/).filter(Boolean).map((entry) => entry.replaceAll('\\', '/')))].sort();
}

function makeReview() {
  const paths = candidatePaths();
  const files = paths.map((relativePath) => {
    const decision = classifySnapshotPath(relativePath);
    const absolutePath = path.join(repositoryRoot, ...relativePath.split('/'));
    const exists = existsSync(absolutePath);
    const entry = { path: relativePath, ...decision, reviewer: 'AkaDNT' };
    if (decision.status === 'INCLUDE') {
      if (!exists || !statSync(absolutePath).isFile()) throw new Error(`SNAPSHOT_CANDIDATE_FILE_INVALID: ${relativePath}`);
      entry.sha256 = createHash('sha256').update(readFileSync(absolutePath)).digest('hex');
    }
    return entry;
  });

  for (const [relativePath, reason] of explicitExclusions) {
    if (!files.some((entry) => entry.path === relativePath)) {
      files.push({ path: relativePath, ...excluded(reason), reviewer: 'AkaDNT' });
    }
  }
  for (const relativePath of ['api/.env.local', 'web/.env.local']) {
    if (existsSync(path.join(repositoryRoot, ...relativePath.split('/'))) && !files.some((entry) => entry.path === relativePath)) {
      files.push({ path: relativePath, ...excluded('Owner-confirmed local development/test environment file; contents intentionally not read or hashed.'), reviewer: 'AkaDNT' });
    }
  }

  const review = {
    schemaVersion: 1,
    reviewer: 'AkaDNT',
    topLevel: [
      { path: 'api', status: 'INCLUDE', reason: 'Reviewed API snapshot candidate; each file has an explicit decision below.', reviewer: 'AkaDNT' },
      { path: 'web', status: 'INCLUDE', reason: 'Reviewed web snapshot candidate; each file has an explicit decision below.', reviewer: 'AkaDNT' },
    ],
    files: files.sort((left, right) => left.path.localeCompare(right.path)),
    generatedExcludedCategories: [
      { category: 'environment', paths: ['api/.env.local', 'web/.env.local'], contentsInspected: false },
      { category: 'ignored-dependencies-build-and-local-tools', pathSegments: ['node_modules', '.next', '.turbo', 'target', '.tools', '.worktrees', '.vscode'] },
    ],
  };
  validateSnapshotFileReview(review, {
    rootDir: repositoryRoot,
    candidateTopLevel: ['api', 'web'],
    candidateFiles: paths,
  });
  return review;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputPath = process.argv[2] ? path.resolve(repositoryRoot, process.argv[2]) : privateEvidencePath;
  const privatePrefix = path.resolve(repositoryRoot, '.worktrees/s001-t09-private-evidence') + path.sep;
  if (!outputPath.startsWith(privatePrefix)) throw new Error('SNAPSHOT_FILE_REVIEW_OUTPUT_MUST_BE_PRIVATE_LOCAL_EVIDENCE');
  const review = makeReview();
  writeFileSync(outputPath, `${JSON.stringify(review, null, 2)}\n`, { encoding: 'utf8' });
  const counts = Object.groupBy(review.files, (entry) => entry.status);
  process.stdout.write(`Snapshot file review generated: candidateFiles=${review.files.length}, INCLUDE=${counts.INCLUDE?.length ?? 0}, EXCLUDE=${counts.EXCLUDE?.length ?? 0}, HOLD=${counts.HOLD?.length ?? 0}; private output only.\n`);
}
