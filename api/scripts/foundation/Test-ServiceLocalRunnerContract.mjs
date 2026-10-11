import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runnerPath = path.join(scriptRoot, 'Run-ServiceLocal.ps1');
const httpVerifierPath = path.join(scriptRoot, 'Test-ServiceHttp.ps1');
const fixturePath = path.join(scriptRoot, 'Test-RunServiceLocal.ps1');
const runbookPath = path.join(scriptRoot, '..', 'service-foundation', 'README.md');
const operatorRunbookPath = path.join(scriptRoot, '..', 'docs', 'runbooks', 'SERVICE_FOUNDATION.md');

async function source(filePath) {
  return readFile(filePath, 'utf8');
}

test('registry-bound local runner and safe live HTTP verifier exist', async () => {
  const [runner, verifier] = await Promise.all([source(runnerPath), source(httpVerifierPath)]);
  assert.match(runner, /param\s*\([\s\S]*?ServiceId[\s\S]*?ConfigurationPath[\s\S]*?Port/m);
  assert.match(runner, /services\.json/);
  assert.match(runner, /SERVICE_LOCAL_UNKNOWN_SERVICE/);
  assert.match(runner, /SERVICE_LOCAL_PRESERVED_SERVICE/);
  assert.match(runner, /SERVICE_LOCAL_INHERITED_OVERRIDE/);
  assert.match(runner, /SERVICE_LOCAL_INHERITED_DATABASE_CONFIG/);
  assert.match(runner, /SERVICE_LOCAL_DATABASE_MISMATCH/);
  assert.doesNotMatch(runner, /\[regex\]::Match\([^\n]+RegexOptions::IgnoreCase/);
  assert.match(runner, /finally\s*\{/);
  assert.match(runner, /api[\\/]service-foundation[\\/]services\.json/);
  assert.doesNotMatch(runner, /Join-Path\s+\$repositoryRoot\s+'service-foundation\/services\.json'/);
  assert.match(verifier, /BaseUri/);
  assert.match(verifier, /LogPath/);
  assert.match(verifier, /127\.0\.0\.1|IsLoopback/);
  assert.match(verifier, /actuator\/health\/readiness/);
  assert.match(verifier, /internal\/technical-baseline\/validate/);
  assert.match(verifier, /AllowAutoRedirect\s*=\s*\$false/);
  assert.match(verifier, /UseProxy\s*=\s*\$false/);
  assert.match(verifier, /api[\\/]service-foundation[\\/]services\.json/);
  assert.doesNotMatch(verifier, /\b(?:Start-Process|Stop-Process|taskkill|pkill)\b/i);
});
test('T04 PowerShell fixtures cover required rejection and restoration cases', async () => {
  const [fixtures, runner, verifier] = await Promise.all([source(fixturePath), source(runnerPath), source(httpVerifierPath)]);
  for (const scenario of [
    'rejectInheritedSpringDatasource',
    'rejectSpringJsonConfigProfile',
    'rejectJvmMavenOptions',
    'rejectInheritedOtherServiceDatabaseCredentials',
    'rejectInheritedPostgresPassword',
    'rejectInheritedPgPassword',
    'rejectInheritedPgPassfile',
    'rejectInheritedGenericDatabaseUrl',
    'rejectCaseVariantRepositoryPathOnCaseSensitiveHost',
    'rejectCaseVariantHttpLogPathOnCaseSensitiveHost',
    'restoreAbsentAndEmptyVariables',
    'rejectWrongServiceDatabase',
    'rejectCaseVariantDatabase',
    'rejectNonLoopback',
    'noSecretOutput',
  ]) {
    assert.match(fixtures, new RegExp(scenario), `missing fixture: ${scenario}`);
  }
  assert.match(fixtures, /SetUnixFileMode/);
  assert.doesNotMatch(fixtures, /-ExecutionPolicy\s+Bypass/i);
  assert.match(runner, /databaseCarrier[\s\S]*SERVICE_LOCAL_INHERITED_DATABASE_CONFIG/);
  assert.match(runner, /\(DATABASE_URL\|DB_URL\|PG\(/);
  assert.match(runner, /POSTGRES\(QL\)\?_\(USER\|PASSWORD\|DB/);
  assert.match(runner, /PG\(HOST\|PORT\|DATABASE\|USER\|PASSWORD\|PASSFILE/);
  assert.match(runner, /Get-PlatformPathComparison/);
  assert.match(verifier, /Get-PlatformPathComparison/);
});

test('local runner documentation preserves isolated generation and safe usage boundaries', async () => {
  const [runner, verifier, runbook, operatorRunbook] = await Promise.all([
    source(runnerPath), source(httpVerifierPath), source(runbookPath), source(operatorRunbookPath),
  ]);
  assert.doesNotMatch(runner, /Generate-Service\.mjs|GenerateService\(/i);
  assert.match(runbook, /Run-ServiceLocal\.ps1/);
  assert.match(runbook, /Test-ServiceHttp\.ps1/);
  assert.match(runbook, /docs\/runbooks\/SERVICE_FOUNDATION\.md/);
  assert.match(runbook, /never generates|does not generate/i);
  assert.match(runbook, /loopback/i);
  assert.match(runbook, /\.env\.auction\.local/);
  assert.match(verifier, /never starts or stops/i);
  assert.match(operatorRunbook, /Run-ServiceLocal\.ps1/);
  assert.match(operatorRunbook, /Test-ServiceHttp\.ps1/);
  assert.match(operatorRunbook, /does not generate/i);
  assert.match(operatorRunbook, /release-policy/i);
  assert.match(operatorRunbook, /Testcontainers|Failsafe/i);
});

test('live HTTP verifier strictly decodes UTF-8 and checks complete problem contracts', async () => {
  const verifier = await source(httpVerifierPath);
  assert.match(verifier, /UTF8Encoding/);
  for (const field of ['type', 'title', 'status', 'detail', 'instance', 'code', 'correlationId']) {
    assert.match(verifier, new RegExp(`Body\\.${field}\\b`), `missing Problem Details assertion: ${field}`);
  }
  assert.match(verifier, /application\/problem\+json/);
  assert.match(verifier, /application\/json/);
});
