import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectGenerationArtifacts } from './ServiceGeneratorCore.mjs';

try {
  if (process.argv.length !== 2) throw new Error('USAGE');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const artifacts = inspectGenerationArtifacts(root);
  process.stdout.write(artifacts.length ? `${artifacts.join('\n')}\n` : 'NO_GENERATION_ARTIFACTS\n');
} catch (error) {
  process.stderr.write(`${/^[A-Z_]+$/.test(error.message) ? error.message : 'PATH_UNSAFE'}\n`);
  process.exitCode = 1;
}
