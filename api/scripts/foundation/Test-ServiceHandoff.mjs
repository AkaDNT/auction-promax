import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripMarkdownCodeFences } from './MarkdownContent.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
function git(args, binary = false) {
  const result = spawnSync('git', args, { cwd: root, encoding: binary ? undefined : 'utf8' });
  assert.equal(result.status, 0, `git ${args[0]} failed`);
  return result.stdout;
}
const identityFiles = git(['ls-files', '-z', '--', 'api/services/identity-profile-service']).split('\0').filter(Boolean).sort();
const inventoryHash = createHash('sha256');
for (const name of identityFiles) {
  const bytes = readFileSync(path.join(root, name));
  assert.equal(git(['hash-object', '--path', name, name]).trim(), git(['rev-parse', `HEAD:${name}`]).trim(),
    `Identity differs from its tracked baseline: ${name}`);
  assert.equal(bytes.equals(git(['cat-file', '--filters', `HEAD:${name}`], true)), true,
    `Identity raw bytes differ from the baseline with checkout filters: ${name}`);
  inventoryHash.update(`${name}\0${createHash('sha256').update(bytes).digest('hex')}\n`);
}
assert.equal(git(['ls-files', '--others', '--exclude-standard', '--', 'api/services']).trim(), '', 'unexpected generated/untracked service files');
const changed = new Set([...git(['diff', '--name-only', '-z', 'HEAD']).split('\0'),
  ...git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0')].filter(name => name.endsWith('.md')));
let checkedLinks = 0;
for (const name of changed) {
  if (!existsSync(path.join(root, name))) continue;
  const prose = stripMarkdownCodeFences(readFileSync(path.join(root, name), 'utf8'));
  for (const match of prose.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    assert.equal(existsSync(path.resolve(path.dirname(path.join(root, name)), decodeURIComponent(target))), true,
      `broken Markdown file link in ${name}: ${target}`);
    checkedLinks++;
  }
}
process.stdout.write(`IDENTITY_UNCHANGED files=${identityFiles.length} sha256=${inventoryHash.digest('hex')}\n`);
process.stdout.write(`CHANGED_MARKDOWN_LINKS_PASS files=${changed.size} links=${checkedLinks}\n`);
process.stdout.write('SERVICE_SOURCE_HANDOFF_PASS\n');
