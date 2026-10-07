import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateService as generateInternal } from './ServiceGeneratorCore.mjs';
export { validateInventory } from './ServiceGeneratorCore.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), '../../..');

export function generateService(input) {
  return generateInternal(input);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2 || args[0] !== '--service' || !args[1] || args[1].startsWith('--')) throw new Error('USAGE');
    const result = generateService({ serviceId: args[1], repositoryRoot });
    process.stdout.write(`${result.serviceId} ${result.variant}\n${result.files.join('\n')}\n`);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PUBLICATION_FAILED';
    process.stderr.write(`${/^[A-Z_]+$/.test(code) ? code : 'PUBLICATION_FAILED'}\n`);
    process.exitCode = 1;
  }
}
