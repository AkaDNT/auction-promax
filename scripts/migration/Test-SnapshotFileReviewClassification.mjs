import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifySnapshotPath } from './Create-SnapshotFileReview.mjs';

test('includes runtime, contracts, infrastructure, CI inputs, and project docs with clear groups', () => {
  for (const [file, group] of [
    ['api/contracts/openapi/v1/api.yaml', 'api-contracts'],
    ['api/infra/local/postgres/verify-isolation.sql', 'api-infrastructure'],
    ['api/services/catalog/pom.xml', 'api-service'],
    ['api/.github/workflows/api-baseline.yml', 'api-ci-migration-input'],
    ['api/docs/adr/ADR-001.md', 'api-project-docs'],
    ['web/app/page.tsx', 'web-app'],
    ['web/features/auth/login.tsx', 'web-feature'],
    ['web/package-lock.json', 'web-build-config'],
    ['web/AGENTS.md', 'web-agent-guidance'],
    ['web/CLAUDE.md', 'web-agent-guidance'],
  ]) {
    const result = classifySnapshotPath(file);
    assert.equal(result.status, 'INCLUDE', file);
    assert.equal(result.group, group, file);
    assert.equal(typeof result.reason, 'string');
    assert.ok(result.reason.length > 0);
  }
});

test('excludes secrets, workstation artifacts, generated output, and superseded or personal notes', () => {
  for (const file of [
    'api/.env.local',
    'api/.tools/gitleaks.exe',
    'web/node_modules/next/package.json',
    'web/.next/server/app.js',
    'web/.turbo/turbo-build.log',
    'api/docs/superpowers/plans/2026-09-24-s001-t09-monorepo-migration.md',
    'api/docs/guides/S001-T06-blocker-resolution.html',
    'api/docs/sprints/Continue_Current_Sprint.txt',
    '.vscode/settings.json',
    '.worktrees/task/file.md',
  ]) {
    assert.equal(classifySnapshotPath(file).status, 'EXCLUDE', file);
  }
});

test('allows only reviewed environment templates, not runtime environment files', () => {
  assert.equal(classifySnapshotPath('api/.env.local.example').status, 'INCLUDE');
  assert.equal(classifySnapshotPath('web/.env.local').status, 'EXCLUDE');
});

test('fails closed for paths outside the reviewed API and web snapshot roots', () => {
  assert.equal(classifySnapshotPath('scripts/migration/test.mjs').status, 'HOLD');
  assert.equal(classifySnapshotPath('api/unclassified.bin').status, 'HOLD');
});
