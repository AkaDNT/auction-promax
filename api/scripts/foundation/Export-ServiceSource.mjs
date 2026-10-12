import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServiceSourceBundle } from './ServiceSourceBundle.mjs';

try {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--service' || args[2] !== '--commit') throw new Error('SERVICE_SOURCE_USAGE');
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REPOSITORY !== 'AkaDNT/auction-promax'
      || !process.env.RUNNER_TEMP) throw new Error('SERVICE_SOURCE_CI_REQUIRED');
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const executionSha = args[3];
  const observed = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' });
  if (observed.status !== 0 || observed.stdout.trim() !== executionSha || process.env.GITHUB_SHA !== executionSha) {
    throw new Error('SERVICE_SOURCE_REVISION_MISMATCH');
  }
  const unchanged = spawnSync('git', ['diff', '--quiet', 'HEAD', '--', 'api/service-foundation', 'api/scripts/foundation'],
    { cwd: repositoryRoot, encoding:'utf8' });
  if (unchanged.status !== 0) throw new Error('SERVICE_SOURCE_INPUT_CHANGED');
  const bundle = createServiceSourceBundle({ serviceId: args[1], executionSha, repositoryRoot });
  const runnerRoot = fs.realpathSync(process.env.RUNNER_TEMP);
  const parent = path.join(runnerRoot, 's002-service-source');
  if (!fs.existsSync(parent)) fs.mkdirSync(parent, { mode: 0o700 });
  if (fs.realpathSync(parent) !== parent || !fs.lstatSync(parent).isDirectory() || fs.lstatSync(parent).isSymbolicLink()) {
    throw new Error('SERVICE_SOURCE_OUTPUT_UNSAFE');
  }
  const output = path.join(parent, bundle.serviceId);
  fs.mkdirSync(output, { mode: 0o700 }); // Never overwrite an earlier export.
  fs.writeFileSync(path.join(output, 'service-source.json'), JSON.stringify(bundle) + '\n', { flag: 'wx', mode: 0o600 });
  process.stdout.write(`SERVICE_SOURCE_EXPORT_PASS service=${bundle.serviceId} files=${bundle.files.length} sha256=${bundle.bundleSha256}\n`);
} catch (error) {
  const code = /^SERVICE_SOURCE_[A-Z_]+$/.test(error.message) ? error.message : 'SERVICE_SOURCE_EXPORT_FAILED';
  process.stderr.write(code + '\n');
  process.exitCode = 1;
}
