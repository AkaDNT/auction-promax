import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const matrixPath = path.join(
  repositoryRoot,
  'docs/decisions/S001-T09_BLUEPRINT_ADR_MATRIX.md',
);
const decisionsDirectory = path.join(repositoryRoot, 'docs/decisions');
const adrDirectory = path.join(repositoryRoot, 'docs/adr');

const blueprintItems = [
  'Coarse-grained microservices-first architecture.',
  'Java 21 + Spring Boot baseline.',
  'Hexagonal architecture inside services.',
  'Cognito owns credentials; app owns business roles.',
  'PostgreSQL ownership per bounded context.',
  'Transaction Core owns bid/wallet/hold/ledger/settlement.',
  'ECS for core long-running domain services.',
  'Lambda only for approved supporting workloads.',
  'DynamoDB only for projection/inbox/TTL workloads.',
  'Valkey is ephemeral, never financial truth.',
  'Transactional outbox + EventBridge + SQS.',
  'EventBridge Scheduler for auction lifecycle.',
  'Step Functions only for long-running orchestration.',
  'AppConfig for dynamic configuration/feature rollout.',
  'KMS/security baseline.',
  'PostgreSQL search first; OpenSearch trigger.',
  'EventBridge/SQS first; MSK trigger.',
  'Multi-account production governance.',
  'Immutable deployment digest and blue/green production rollout.',
  'Backup/restore and fault-testing policy.',
];
const expectedCoverage = [
  'COVERED', 'COVERED', 'GAP', 'COVERED', 'COVERED',
  'COVERED', 'PARTIAL', 'GAP', 'COVERED', 'COVERED',
  'COVERED', 'COVERED', 'GAP', 'GAP', 'GAP',
  'COVERED', 'COVERED', 'GAP', 'GAP', 'GAP',
];
const expectedAdrIds = {
  1: ['ADR-001'],
  2: ['ADR-002'],
  4: ['ADR-003'],
  5: ['ADR-004', 'ADR-016'],
  6: ['ADR-005'],
  7: ['ADR-010'],
  9: ['ADR-006'],
  10: ['ADR-007'],
  11: ['ADR-008'],
  12: ['ADR-009'],
  16: ['ADR-013'],
  17: ['ADR-014'],
};
const expectedDelta = {
  3: 'ADR-018',
  8: 'ADR-019',
  13: 'ADR-020',
  14: 'ADR-021',
  15: 'ADR-022',
  18: 'ADR-023',
  19: 'ADR-024',
  20: 'ADR-025',
};

const requiredApprovedAdrs = Array.from({ length: 16 }, (_, index) =>
  `ADR-${String(index + 1).padStart(3, '0')}`,
);
const coverageValues = new Set(['COVERED', 'PARTIAL', 'GAP']);
const decisionStatuses = new Set(['APPROVED', 'PROPOSED', 'NOT_DECIDED']);
const implementationStates = new Set([
  'NOT_ASSESSED',
  'DECISION_ONLY',
  'IN_PROGRESS',
  'DELIVERED',
]);

function parseTableRow(line) {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function extractRows(markdown) {
  const heading = '## Blueprint section 34 mapping';
  const headingIndex = markdown.indexOf(heading);
  if (headingIndex < 0) return [];
  const afterHeading = markdown.slice(headingIndex + heading.length);
  const nextHeading = afterHeading.search(/^## /m);
  const section = nextHeading < 0 ? afterHeading : afterHeading.slice(0, nextHeading);

  return section
    .split(/\r?\n/)
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map(parseTableRow);
}

function validateMatrix(markdown, readAdr) {
  const errors = [];
  if (typeof markdown !== 'string') return ['MATRIX_MISSING'];

  const rows = extractRows(markdown);
  const numbers = rows.map((row) => Number(row[0]));
  const uniqueNumbers = new Set(numbers);

  if (rows.length !== 20) errors.push('ROW_COUNT');
  if (uniqueNumbers.size !== numbers.length) errors.push('DUPLICATE_NUMBER');
  if (numbers.some((number) => !Number.isInteger(number) || number < 1 || number > 20)) {
    errors.push('INVALID_OR_EXTRA_NUMBER');
  }
  if (numbers.length === 20 && numbers.some((number, index) => number !== index + 1)) {
    errors.push('ORDER');
  }

  for (let index = 0; index < Math.min(rows.length, blueprintItems.length); index += 1) {
    const row = rows[index];
    if (row.length !== 9) {
      errors.push(`COLUMN_COUNT_${index + 1}`);
      continue;
    }

    const [numberText, subject, coverage, references, decisionStatus,
      implementationPhase, implementationState, evidence, deltaOwner] = row;
    const number = Number(numberText);

    if (number >= 1 && number <= 20 && subject !== blueprintItems[number - 1]) {
      errors.push(`SUBJECT_${number}`);
    }
    if (!coverageValues.has(coverage)) errors.push(`COVERAGE_${number}`);
    if (expectedCoverage[number - 1] && coverage !== expectedCoverage[number - 1]) {
      errors.push(`MAPPING_COVERAGE_${number}`);
    }
    if (!decisionStatuses.has(decisionStatus)) errors.push(`DECISION_STATUS_${number}`);
    if (!/^Phase (?:[0-9]|1[0-3])$/.test(implementationPhase)) {
      errors.push(`IMPLEMENTATION_PHASE_${number}`);
    }
    if (!implementationStates.has(implementationState)) {
      errors.push(`IMPLEMENTATION_STATE_${number}`);
    }
    if (implementationState === 'DELIVERED' &&
      (/decision[- ]only/i.test(evidence) || !/\[[^\]]+\]\([^)]+\)/.test(evidence))) {
      errors.push(`DELIVERED_WITHOUT_IMPLEMENTATION_EVIDENCE_${number}`);
    }

    const links = [...references.matchAll(/\[(ADR-\d{3})\]\(([^)]+)\)/g)]
      .map((match) => ({ id: match[1], target: match[2] }));
    const expectedIds = expectedAdrIds[number] ?? [];
    const actualIds = links.map((link) => link.id);
    if (expectedIds.join(',') !== actualIds.join(',')) {
      errors.push(`ADR_MAPPING_${number}`);
    }
    const adrResults = [];
    for (const link of links) {
      const { id, target } = link;
      if (target.startsWith('/') || target.includes('://')) {
        errors.push(`NON_RELATIVE_ADR_LINK_${number}`);
        continue;
      }
      if (!path.basename(target).startsWith(`${id}-`)) {
        errors.push(`ADR_LABEL_TARGET_MISMATCH_${number}`);
      }
      const resolved = path.resolve(decisionsDirectory, target);
      if (!resolved.startsWith(`${adrDirectory}${path.sep}`)) {
        errors.push(`ADR_LINK_OUTSIDE_DIRECTORY_${number}`);
        continue;
      }
      const content = readAdr(target);
      if (typeof content !== 'string') {
        errors.push(`BROKEN_ADR_LINK_${number}`);
        continue;
      }
      const status = content.match(/^\s*-\s*Status:\s*(\S+)\s*$/mi)?.[1];
      adrResults.push({ status });
      if (status !== 'APPROVED' && decisionStatus === 'APPROVED') {
        errors.push(`UNAPPROVED_ADR_AS_APPROVED_${number}`);
      }
    }

    if (coverage === 'COVERED' &&
      (decisionStatus !== 'APPROVED' || !adrResults.some((adr) => adr.status === 'APPROVED'))) {
      errors.push(`COVERED_WITHOUT_APPROVED_DECISION_${number}`);
    }
    if (coverage === 'PARTIAL' &&
      (!adrResults.some((adr) => adr.status === 'APPROVED') || !deltaOwner || deltaOwner === '—')) {
      errors.push(`PARTIAL_WITHOUT_APPROVED_REFERENCE_OR_OWNER_${number}`);
    }
    if (coverage === 'GAP' &&
      (!deltaOwner || deltaOwner === '—' || !/ADR-\d{3}/.test(evidence))) {
      errors.push(`GAP_WITHOUT_PROPOSED_DELTA_OWNER_${number}`);
    }
    if (expectedDelta[number] && !evidence.includes(expectedDelta[number])) {
      errors.push(`EXPECTED_DELTA_MISSING_${number}`);
    }
  }

  return [...new Set(errors)];
}

function readRepositoryAdr(relativePath) {
  const absolutePath = path.resolve(decisionsDirectory, relativePath);
  if (!absolutePath.startsWith(`${adrDirectory}${path.sep}`)) return null;
  try {
    return fs.readFileSync(absolutePath, 'utf8');
  } catch {
    return null;
  }
}

function assertCase(name, condition) {
  if (!condition) {
    console.error(`[FAIL] ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[PASS] ${name}`);
}

function replaceFirst(text, search, replacement) {
  const index = text.indexOf(search);
  if (index < 0) throw new Error('FIXTURE_ANCHOR_MISSING');
  return `${text.slice(0, index)}${replacement}${text.slice(index + search.length)}`;
}

for (const adrId of requiredApprovedAdrs) {
  const adrFile = fs.readdirSync(adrDirectory)
    .find((name) => name.startsWith(`${adrId}-`) && name.endsWith('.md'));
  const content = adrFile
    ? fs.readFileSync(path.join(adrDirectory, adrFile), 'utf8')
    : null;
  const approved = typeof content === 'string' &&
    /^\s*-\s*Status:\s*APPROVED\s*$/mi.test(content);
  assertCase(`${adrId} exists and is approved`, approved);
}

if (!fs.existsSync(matrixPath)) {
  console.error('[FAIL] Canonical 20-row decision matrix exists and validates (MATRIX_MISSING)');
  process.exitCode = 1;
  console.log('S001-T09 decision matrix tests: FAIL');
  process.exit();
}

const canonical = fs.readFileSync(matrixPath, 'utf8');
const canonicalErrors = validateMatrix(canonical, readRepositoryAdr);
assertCase('Canonical matrix has exactly 20 ordered blueprint subjects',
  canonicalErrors.length === 0);
if (canonicalErrors.length > 0) {
  console.error(`[DIAGNOSTIC] Canonical matrix validation codes: ${canonicalErrors.join(',')}`);
}
assertCase('Repository topology is a separate section linked to Blueprint §33',
  /^## Repository-topology checkpoint \(separate from the 20 subjects\)$/m.test(canonical) &&
    /\[Blueprint §33\]\(\.\.\/Auction_Platform_Final_Production_Architecture_Blueprint_and_Roadmap\.md#33-roadmap\)/.test(canonical));

const sectionStart = canonical.indexOf('## Blueprint section 34 mapping');
const tableText = canonical.slice(sectionStart);
const firstRow = tableText.match(/^\|\s*1\s*\|[^\r\n]+/m)?.[0];
const secondRow = tableText.match(/^\|\s*2\s*\|[^\r\n]+/m)?.[0];
const lastRow = tableText.match(/^\|\s*20\s*\|[^\r\n]+/m)?.[0];
const approvedLink = canonical.match(/\[[^\]]+\]\((\.\.\/adr\/ADR-001-[^)]+)\)/)?.[1];

if (!firstRow || !secondRow || !lastRow || !approvedLink) {
  console.error('[FAIL] Matrix negative-fixture anchors are present');
  process.exitCode = 1;
} else {
  const missingRow = canonical.replace(`${firstRow}\n`, '');
  assertCase('Missing blueprint row rejected',
    validateMatrix(missingRow, readRepositoryAdr).length > 0);

  const duplicateRow = canonical.replace(`${lastRow}\n`, `${lastRow}\n${lastRow}\n`);
  assertCase('Duplicate blueprint number rejected',
    validateMatrix(duplicateRow, readRepositoryAdr).includes('DUPLICATE_NUMBER'));

  const reorderedRows = canonical.replace(`${firstRow}\n${secondRow}`, `${secondRow}\n${firstRow}`);
  assertCase('Reordered blueprint rows rejected',
    validateMatrix(reorderedRows, readRepositoryAdr).includes('ORDER'));

  const extraRow = canonical.replace(`${lastRow}\n`, `${lastRow}\n${lastRow.replace(/^\|\s*20\s*\|/, '| 21 |')}\n`);
  assertCase('Extra blueprint row rejected',
    validateMatrix(extraRow, readRepositoryAdr).includes('INVALID_OR_EXTRA_NUMBER'));

  const brokenLink = replaceFirst(canonical, approvedLink, '../adr/ADR-999-missing.md');
  assertCase('Broken relative ADR link rejected',
    validateMatrix(brokenLink, readRepositoryAdr).some((error) => error.startsWith('BROKEN_ADR_LINK_')));

  const invalidCoverage = replaceFirst(canonical, '| COVERED |', '| MAYBE |');
  assertCase('Unknown coverage value rejected',
    validateMatrix(invalidCoverage, readRepositoryAdr).some((error) => error.startsWith('COVERAGE_')));

  const invalidStatus = replaceFirst(canonical, '| APPROVED |', '| ACCEPTED |');
  assertCase('Unknown decision status rejected',
    validateMatrix(invalidStatus, readRepositoryAdr).some((error) => error.startsWith('DECISION_STATUS_')));

  const noDecision = replaceFirst(canonical, `| COVERED | [ADR-001](${approvedLink}) | APPROVED |`,
    `| COVERED | — | APPROVED |`);
  assertCase('COVERED without approved decision rejected',
    validateMatrix(noDecision, readRepositoryAdr).some((error) => error.startsWith('COVERED_WITHOUT_APPROVED')));

  const gapWithoutOwner = canonical.replace(
    /^(\|\s*3\s*\|[^\r\n]*\|\s*GAP\s*\|[^\r\n]*\|[^\r\n]*\|[^\r\n]*\|[^\r\n]*\|[^\r\n]*\|)[^|]+(\|)$/m,
    '$1—$2',
  );
  assertCase('GAP without proposed delta owner rejected',
    validateMatrix(gapWithoutOwner, readRepositoryAdr).some((error) => error.startsWith('GAP_WITHOUT_PROPOSED')));

  const deliveredCells = parseTableRow(firstRow);
  deliveredCells[6] = 'DELIVERED';
  deliveredCells[7] = 'Decision-only evidence; no implementation proof.';
  const deliveredWithDecisionOnly = canonical.replace(
    firstRow,
    `| ${deliveredCells.join(' | ')} |`,
  );
  assertCase('DELIVERED with decision-only evidence rejected',
    validateMatrix(deliveredWithDecisionOnly, readRepositoryAdr)
      .some((error) => error.startsWith('DELIVERED_WITHOUT_IMPLEMENTATION_EVIDENCE')));

  const proposedLink = replaceFirst(canonical, approvedLink, '../adr/ADR-017-proposed-fixture.md');
  const proposedAdrReader = (target) => target === '../adr/ADR-017-proposed-fixture.md'
    ? '# ADR-017 fixture\n\n- Status: PROPOSED\n'
    : readRepositoryAdr(target);
  assertCase('PROPOSED ADR cannot satisfy approved COVERED row',
    validateMatrix(proposedLink, proposedAdrReader)
      .some((error) => error.startsWith('UNAPPROVED_ADR_AS_APPROVED') ||
        error.startsWith('COVERED_WITHOUT_APPROVED')));
}

console.log(process.exitCode ? 'S001-T09 decision matrix tests: FAIL' : 'S001-T09 decision matrix tests: PASS');
