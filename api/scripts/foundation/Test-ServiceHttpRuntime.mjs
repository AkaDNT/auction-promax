import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const shell = process.env.SERVICE_HTTP_TEST_SHELL ?? 'pwsh';
assert.ok(['pwsh', 'powershell.exe'].includes(shell));

async function check(mode) {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'auction-promax-http-fixture-'));
  const scripts = path.join(fixtureRoot, 'api/scripts');
  const log = path.join(fixtureRoot, 'api/logs/probe.log');
  const requests = [];
  let child;
  let childClosed;
  const server = http.createServer(async (req, res) => {
    requests.push(req.url);
    let text = '';
    for await (const chunk of req) text += chunk;
    const json = (status, body, type = 'application/json') => {
      res.writeHead(status, { 'Content-Type': type, 'X-Correlation-ID': req.headers['x-correlation-id'] ?? 'fixture' });
      res.end(JSON.stringify(body));
    };
    if (req.url === '/actuator/health/readiness') {
      if (mode === 'redirect') {
        res.writeHead(302, { Location: '/redirect-target' }); res.end(); return;
      }
      json(200, { status: 'UP' }); return;
    }
    if (req.url === '/actuator/env') { res.writeHead(mode === 'exposed-env' ? 200 : 403); res.end(); return; }
    if (req.url === '/actuator/info' || req.url === '/actuator/metrics') { json(200, {}); return; }
    if (text === '{"value":"service-local-probe"}') {
      const body = { accepted: true, valueLength: 19 };
      if (mode === 'string-accepted') body.accepted = 'true';
      if (mode === 'string-length') body.valueLength = '19';
      if (mode === 'fractional-length') body.valueLength = 19.1;
      json(200, body); return;
    }
    const malformed = text === '{"value":';
    const body = {
      type: 'urn:auction-promax:problem:' + (malformed ? 'malformed-request' : 'validation-failed'),
      title: 'Request rejected', status: 400, detail: 'The request is invalid.',
      instance: '/internal/technical-baseline/validate',
      code: malformed ? 'MALFORMED_REQUEST' : 'VALIDATION_FAILED',
      correlationId: req.headers['x-correlation-id'],
    };
    if (mode === (malformed ? 'string-malformed-status' : 'string-validation-status')) body.status = '400';
    json(400, body, 'application/problem+json');
  });
  try {
    await Promise.all([mkdir(scripts, { recursive: true }), mkdir(path.dirname(log), { recursive: true }),
      mkdir(path.join(fixtureRoot, 'api/service-foundation'), { recursive: true })]);
    await copyFile(path.join(root, 'api/scripts/Test-ServiceHttp.ps1'), path.join(scripts, 'Test-ServiceHttp.ps1'));
    await copyFile(path.join(root, 'api/service-foundation/services.json'), path.join(fixtureRoot, 'api/service-foundation/services.json'));
    await writeFile(path.join(fixtureRoot, '.gitignore'), '**/*.log\n');
    assert.equal(spawnSync('git', ['init', '--quiet', fixtureRoot]).status, 0);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    child = spawn(shell, ['-NoProfile', '-NonInteractive', '-File', path.join(scripts, 'Test-ServiceHttp.ps1'),
      '-ServiceId', 'auction-service', '-BaseUri', `http://127.0.0.1:${server.address().port}`, '-LogPath', log],
    { cwd: fixtureRoot, windowsHide: true, timeout: 30_000 });
    childClosed = once(child, 'close');
    let output = '';
    child.stdout.on('data', bytes => { output += bytes; });
    child.stderr.on('data', bytes => { output += bytes; });
    const [code] = await childClosed;
    return { code, output, requests, log: await readFile(log, 'utf8') };
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) child.kill();
    if (childClosed) await childClosed.catch(() => {});
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    const safeRoot = path.resolve(fixtureRoot);
    assert.equal(path.dirname(safeRoot), path.resolve(tmpdir()));
    assert.ok(path.basename(safeRoot).startsWith('auction-promax-http-fixture-'));
    await rm(safeRoot, { recursive: true, force: true });
  }
}

test('live HTTP verifier accepts the actual typed technical contract', async () => {
  const result = await check('valid');
  assert.equal(result.code, 0, result.output);
  assert.equal(result.log.trim(), 'SERVICE_HTTP_PASS');
  assert.equal(result.requests.length, 7);
});

for (const mode of ['string-accepted', 'string-length', 'fractional-length', 'string-validation-status', 'string-malformed-status']) {
  test(`live HTTP verifier rejects wrong JSON types: ${mode}`, async () => {
    const result = await check(mode);
    assert.notEqual(result.code, 0, 'wrong typed JSON cannot satisfy exact service evidence');
    assert.match(result.log.trim(), /^SERVICE_HTTP_(SUCCESS|VALIDATION|MALFORMED)_PROBE_FAILED$/);
    assert.doesNotMatch(result.output, /service-local-probe|urn:auction-promax:problem:/);
  });
}

test('live HTTP verifier refuses redirects without following them', async () => {
  const result = await check('redirect');
  assert.notEqual(result.code, 0);
  assert.deepEqual(result.requests, ['/actuator/health/readiness']);
});

test('live HTTP verifier rejects an exposed sensitive actuator', async () => {
  const result = await check('exposed-env');
  assert.notEqual(result.code, 0);
  assert.equal(result.log.trim(), 'SERVICE_HTTP_SENSITIVE_ACTUATOR_EXPOSED');
});
