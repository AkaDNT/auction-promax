import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGeneratedService } from './GeneratedServiceConformance.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const registry = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'api/service-foundation/services.json'), 'utf8'));
const selected = process.argv.slice(2);
if (selected.length !== 2 || selected[0] !== '--service' || !registry.services.some((service) => service.id === selected[1])) {
  process.stderr.write('USAGE\n');
  process.exit(1);
}
try {
  const serviceId = selected[1];
  validateGeneratedService({ serviceId, repositoryRoot });
  process.stdout.write(`GENERATED_SERVICE_CONFORMANCE_PASS service=${serviceId}\n`);
} catch (error) {
  process.stderr.write(`${/^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'GENERATED_SERVICE_CONFORMANCE_FAILED'}\n`);
  process.exitCode = 1;
}
