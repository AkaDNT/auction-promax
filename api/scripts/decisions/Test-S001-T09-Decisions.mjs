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
  7: 'ADR-019',
  8: 'ADR-019',
  13: 'ADR-020',
  14: 'ADR-021',
  15: 'ADR-022',
  18: 'ADR-023',
  19: 'ADR-024',
  20: 'ADR-025',
};
const proposedAdrs = [
  'ADR-018-hexagonal-service-boundaries.md',
  'ADR-019-lambda-supporting-workloads.md',
  'ADR-020-step-functions-orchestration-criteria.md',
  'ADR-021-appconfig-rollout-policy.md',
  'ADR-022-kms-security-baseline.md',
  'ADR-023-multi-account-governance.md',
  'ADR-024-immutable-image-promotion-and-blue-green.md',
  'ADR-025-backup-restore-and-fault-testing.md',
];

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
    const allowedCoverage = expectedDelta[number]
      ? new Set([expectedCoverage[number - 1], 'COVERED'])
      : new Set([expectedCoverage[number - 1]]);
    if (!allowedCoverage.has(coverage)) {
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
    const expectedIds = [
      ...(expectedAdrIds[number] ?? []),
      ...(coverage === 'COVERED' && expectedDelta[number] ? [expectedDelta[number]] : []),
    ];
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
      (decisionStatus !== 'APPROVED' || adrResults.length === 0 ||
        !adrResults.every((adr) => adr.status === 'APPROVED'))) {
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

function readDocumentOrNull(absolutePath) {
  try {
    return fs.readFileSync(absolutePath, 'utf8');
  } catch {
    return null;
  }
}

function validateDecisionDocuments(readDocument) {
  const errors = [];
  const monorepoRoot = path.resolve(repositoryRoot, '..');
  const documentPaths = [
    ...fs.readdirSync(adrDirectory)
      .filter((name) => /^ADR-\d{3}-.*\.md$/.test(name))
      .map((name) => path.join(adrDirectory, name)),
    matrixPath,
    path.join(decisionsDirectory, 'BUSINESS_DECISIONS.md'),
  ];

  for (const documentPath of documentPaths) {
    const content = readDocument(documentPath);
    if (typeof content !== 'string') {
      errors.push(`MISSING_DOCUMENT:${path.basename(documentPath)}`);
      continue;
    }
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const [relativePath, fragment] = target.split('#', 2);
      const destination = path.resolve(path.dirname(documentPath), relativePath || '.');
      if (!(destination === monorepoRoot ||
        destination.startsWith(`${monorepoRoot}${path.sep}`))) {
        errors.push(`LINK_OUTSIDE_REPOSITORY:${path.basename(documentPath)}`);
        continue;
      }
      const destinationContent = readDocument(destination);
      if (typeof destinationContent !== 'string') {
        errors.push(`BROKEN_LOCAL_LINK:${path.basename(documentPath)}:${target}`);
        continue;
      }
      if (fragment) {
        const headings = [...destinationContent.matchAll(/^#{1,6}\s+(.+)$/gm)]
          .map((heading) => heading[1]
            .toLowerCase()
            .replace(/<[^>]+>/g, '')
            .replace(/[`*_~]/g, '')
            .replace(/[^\p{L}\p{N}\s-]/gu, '')
            .trim()
            .replace(/\s+/g, '-'));
        if (!headings.includes(fragment.toLowerCase())) {
          errors.push(`BROKEN_LOCAL_ANCHOR:${path.basename(documentPath)}:${target}`);
        }
      }
    }
  }

  const topology = readDocument(adr017Path);
  const businessDecisions = readDocument(path.join(decisionsDirectory,
    'BUSINESS_DECISIONS.md'));
  if (typeof topology !== 'string' ||
    !/^- Status: APPROVED$/m.test(topology) ||
    !/^- Approved by: AkaDNT \(Project Owner \/ Repository Owner\)$/m.test(topology) ||
    !/^- Selected option: `OPTION_A_MONOREPO`$/m.test(topology) ||
    typeof businessDecisions !== 'string' ||
    !/^\| BD-007 \|[^\r\n]*\| APPROVED \|/m.test(businessDecisions)) {
    errors.push('TOPOLOGY_NOT_APPROVED');
  }

  for (const adrFile of proposedAdrs) {
    const content = readDocument(path.join(adrDirectory, adrFile));
    const date = typeof content === 'string'
      ? content.match(/^- Approval date: (\d{4})-(\d{2})-(\d{2})$/m)
      : null;
    const year = Number(date?.[1]);
    const month = Number(date?.[2]);
    const day = Number(date?.[3]);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    if (typeof content !== 'string' || !/^- Status: APPROVED$/m.test(content) ||
      !/^- Approved by: AkaDNT \(Project Owner \/ Repository Owner\)$/m.test(content) ||
      !date || calendarDate.getUTCFullYear() !== year ||
      calendarDate.getUTCMonth() + 1 !== month ||
      calendarDate.getUTCDate() !== day) {
      errors.push(`INVALID_APPROVAL_DATE:${adrFile}`);
    }
  }
  return errors;
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

function validateSprintLifecycle(sprint, delivery, index, evidence) {
  if (!delivery.includes('S001-T09 decision traceability: 20/20 approved') ||
    !/^- Current roadmap phase: Phase 0\b/m.test(delivery) ||
    !/^- Roadmap phase: Phase 0\b/m.test(index)) return false;
  const statuses = [
    sprint.match(/^- Sprint status: (\S+)$/m)?.[1],
    delivery.match(/^- Sprint status: (\S+)$/m)?.[1],
    index.match(/^- Status: (\S+)$/m)?.[1],
  ];
  const t08Completed = /^\|\s*8\s*\|\s*S001-T08\s*\|[^\r\n]*\|\s*COMPLETED\s*\|$/m.test(sprint);
  if (statuses.every((status) => status === 'IN_PROGRESS')) {
    return !t08Completed &&
      delivery.includes('Sprint 001 remain in progress pending S001-T08') &&
      /^- Current execution task: S001-T08\b/m.test(index) &&
      !/^Status: ACCEPTED_LOCAL_REVIEW\./m.test(evidence);
  }
  if (!statuses.every((status) => status === 'COMPLETED') || !t08Completed) return false;
  const t08 = sprint.split('## S001-T08 — Publish local baseline runbook and sprint evidence')[1]
    ?.split('## Daily Execution State')[0] ?? '';
  if ((t08.match(/^- \[x\]/gm) ?? []).length !== 4 || /^- \[ \]/m.test(t08)) return false;
  const date = evidence.match(/^- Review date: (\d{4}-\d{2}-\d{2})$/m)?.[1];
  const parsed = date ? new Date(`${date}T00:00:00Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false;
  const publication = [sprint, delivery, index]
    .map((text) => text.match(/^- Publication status: (\S+)$/m)?.[1]);
  return publication.every((status) => status === 'PENDING_PROTECTED_PR') &&
    [sprint, delivery, index].every((text) =>
      text.includes(`- Actual review/closure date: ${date}`)) &&
    /^Status: ACCEPTED_LOCAL_REVIEW\./m.test(evidence) &&
    /^- Approved by: AkaDNT \(Project Owner \/ Repository Owner\)$/m.test(evidence) &&
    /^- Implementation C1: `[a-f0-9]{40}`\.$/m.test(evidence) &&
    /^- C1 tree: `[a-f0-9]{40}`\.$/m.test(evidence) &&
    Array.from({ length: 6 }, (_, number) => number + 1)
      .every((number) => new RegExp(`^### ${number}\\. `, 'm').test(evidence)) &&
    /^executionState\s*= PASS$/m.test(evidence) &&
    /^policyState\s*= BLOCKED$/m.test(evidence) &&
    /^failureCode\s*= NONE$/m.test(evidence) &&
    [delivery, evidence].every((text) => text.includes('DEFERRED_NO_PRODUCER_CONTRACT')) &&
    delivery.includes('release-policy=BLOCKED') &&
    /^- Current execution task: S001-T08 protected publication\b/m.test(index);
}

const completedLifecycleFixture = {
  sprint: '- Sprint status: COMPLETED\n- Publication status: PENDING_PROTECTED_PR\n- Actual review/closure date: 2026-10-05\n| 8 | S001-T08 | Local baseline | 4h | LOW | COMPLETED |\n## S001-T08 — Publish local baseline runbook and sprint evidence\n- [x] Runbook\n- [x] Review\n- [x] Maturity\n- [x] Retrospective\n## Daily Execution State\n',
  delivery: '- Current roadmap phase: Phase 0\n- Sprint status: COMPLETED\n- Publication status: PENDING_PROTECTED_PR\n- Actual review/closure date: 2026-10-05\nS001-T09 decision traceability: 20/20 approved\nDEFERRED_NO_PRODUCER_CONTRACT\nrelease-policy=BLOCKED\n',
  index: '- Roadmap phase: Phase 0\n- Status: COMPLETED\n- Publication status: PENDING_PROTECTED_PR\n- Actual review/closure date: 2026-10-05\n- Current execution task: S001-T08 protected publication\n',
  evidence: 'Status: ACCEPTED_LOCAL_REVIEW.\n- Approved by: AkaDNT (Project Owner / Repository Owner)\n- Review date: 2026-10-05\n- Implementation C1: `1111111111111111111111111111111111111111`.\n- C1 tree: `2222222222222222222222222222222222222222`.\nexecutionState = PASS\npolicyState = BLOCKED\nfailureCode = NONE\nDEFERRED_NO_PRODUCER_CONTRACT\n### 1. Decisions\n### 2. Builds\n### 3. Database\n### 4. HTTP\n### 5. Delivery\n### 6. Scans\n',
};
const lifecycleFixtureValid = (fixture) => validateSprintLifecycle(
  fixture.sprint, fixture.delivery, fixture.index, fixture.evidence,
);
assertCase('Owner-reviewed completed T08 with pending publication validates',
  lifecycleFixtureValid(completedLifecycleFixture));
const pendingLifecycleFixture = {
  sprint: '- Sprint status: IN_PROGRESS\n| 8 | S001-T08 | Local baseline | 4h | LOW | READY |\n',
  delivery: '- Current roadmap phase: Phase 0\n- Sprint status: IN_PROGRESS\nS001-T09 decision traceability: 20/20 approved\nSprint 001 remain in progress pending S001-T08\n',
  index: '- Roadmap phase: Phase 0\n- Status: IN_PROGRESS\n- Current execution task: S001-T08\n',
  evidence: '',
};
assertCase('Consistent pending T08 lifecycle still validates', lifecycleFixtureValid(pendingLifecycleFixture));
for (const [name, field, search, replacement] of [
  ['Mismatched sprint statuses', 'delivery', 'Sprint status: COMPLETED', 'Sprint status: IN_PROGRESS'],
  ['Missing owner approval', 'evidence', '- Approved by: AkaDNT (Project Owner / Repository Owner)', ''],
  ['Impossible review date', 'evidence', '2026-10-05', '2026-02-30'],
  ['Missing C1 provenance', 'evidence', '- Implementation C1: `1111111111111111111111111111111111111111`.', ''],
  ['Incomplete six-part evidence', 'evidence', '### 6. Scans', ''],
  ['Failed security execution', 'evidence', 'executionState = PASS', 'executionState = IMPLEMENTATION_FAILURE'],
  ['Unevidenced publication', 'index', 'PENDING_PROTECTED_PR', 'PUBLISHED'],
  ['T08 acceptance incomplete', 'sprint', '- [x] Retrospective', '- [ ] Retrospective'],
  ['Phase 0 prematurely advanced', 'delivery', 'Current roadmap phase: Phase 0', 'Current roadmap phase: Phase 1'],
  ['Review dates disagree', 'index', '2026-10-05', '2026-10-06'],
  ['Deferred consumer mislabeled PASS', 'delivery', 'DEFERRED_NO_PRODUCER_CONTRACT', 'COMPATIBILITY_PASS'],
  ['T09 traceability removed', 'delivery', 'S001-T09 decision traceability: 20/20 approved', ''],
]) {
  assertCase(`${name} rejected`, !lifecycleFixtureValid({
    ...completedLifecycleFixture,
    [field]: replaceFirst(completedLifecycleFixture[field], search, replacement),
  }));
}
assertCase('Accepted review cannot coexist with pending sprint', !lifecycleFixtureValid({
  ...pendingLifecycleFixture, evidence: completedLifecycleFixture.evidence,
}));

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

for (const adrFile of proposedAdrs) {
  const adrPath = path.join(adrDirectory, adrFile);
  const content = fs.existsSync(adrPath) ? fs.readFileSync(adrPath, 'utf8') : '';
  const status = content.match(/^- Status: (PROPOSED|APPROVED)$/m)?.[1];
  const approvalIsConsistent = status === 'PROPOSED'
    ? !/^- Approved by:/m.test(content) && !/^- Approval date:/m.test(content)
    : status === 'APPROVED' && /^- Approved by: \S.+$/m.test(content) &&
      /^- Approval date: \d{4}-\d{2}-\d{2}$/m.test(content);
  const valid = approvalIsConsistent &&
    /^- Owner: Project Owner \/ Repository Owner$/m.test(content) &&
    /^## Context$/m.test(content) &&
    /^## Proposed decision$/m.test(content) &&
    /^## Alternatives$/m.test(content) &&
    /^## Consequences$/m.test(content) &&
    /^## Later implementation evidence$/m.test(content);
  assertCase(`${adrFile} has reviewable metadata for its decision status`, valid);
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
if (process.argv.includes('--require-complete')) {
  const rows = extractRows(canonical);
  assertCase('All 20 mandatory decisions have approved coverage',
    rows.length === 20 && rows.every((row) => row[2] === 'COVERED' &&
      row[4] === 'APPROVED') && canonicalErrors.length === 0);
}
if (process.argv.includes('--require-closeout')) {
  const sprint = fs.readFileSync(path.join(repositoryRoot, 'docs/sprints/SPRINT_001.md'), 'utf8');
  const delivery = fs.readFileSync(path.join(repositoryRoot, 'docs/DELIVERY_STATE.md'), 'utf8');
  const index = fs.readFileSync(path.join(repositoryRoot, 'docs/SPRINT_INDEX.md'), 'utf8');
  const t09 = sprint.split('## S001-T09 — Reconcile revised blueprint decision delta')[1]
    ?.split('## S001-T08 —')[0] ?? '';
  assertCase('Sprint T09 acceptance and task status reflect approved decision closeout',
    /^\|\s*9\s*\|\s*S001-T09\s*\|[^\r\n]*\|\s*COMPLETED\s*\|$/m.test(sprint) &&
      (t09.match(/^- \[x\]/gm) ?? []).length === 4);
  const evidence = readDocumentOrNull(path.join(repositoryRoot,
    'docs/sprints/S001-T08_REVIEW_EVIDENCE.md')) ?? '';
  assertCase('Sprint lifecycle is consistent without closing Phase 0',
    validateSprintLifecycle(sprint, delivery, index, evidence));
}
for (const adrFile of proposedAdrs) {
  const adrId = adrFile.slice(0, 7);
  assertCase(`${adrId} decision is linked from the matrix`,
    canonical.includes(`[${adrId}](../adr/${adrFile})`));
}
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

  const approvedThirdRow = canonical.match(/^\|\s*3\s*\|[^\r\n]+/m)?.[0];
  const gapCells = parseTableRow(approvedThirdRow);
  gapCells[2] = 'GAP';
  gapCells[3] = '—';
  gapCells[4] = 'NOT_DECIDED';
  gapCells[7] = 'Proposed ADR-018; no approval claimed.';
  gapCells[8] = 'Product Owner / Project Owner';
  const gapRow = `| ${gapCells.join(' | ')} |`;
  const gapMatrix = canonical.replace(approvedThirdRow, gapRow);
  gapCells[8] = '—';
  const gapWithoutOwner = canonical.replace(approvedThirdRow,
    `| ${gapCells.join(' | ')} |`);
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

  assertCase('GAP and approved delta states both validate',
    validateMatrix(gapMatrix, readRepositoryAdr).length === 0 &&
      validateMatrix(canonical, readRepositoryAdr).length === 0);
}

const adr018Path = path.join(adrDirectory, proposedAdrs[0]);
const adr017Path = path.join(adrDirectory,
  'ADR-017-repository-topology-and-contract-governance.md');
const adr018 = readDocumentOrNull(adr018Path);
const adr017 = readDocumentOrNull(adr017Path);
const overrideDocument = (target, changedPath, replacement) =>
  target === changedPath ? replacement : readDocumentOrNull(target);
assertCase('Broken Refines target is rejected',
  validateDecisionDocuments((target) => overrideDocument(target, adr018Path,
    adr018.replace('ADR-001-coarse-grained-microservices-first.md',
      'ADR-999-missing.md'))).some((error) => error.startsWith('BROKEN_LOCAL_LINK')));
assertCase('Unapproved topology ADR is rejected',
  validateDecisionDocuments((target) => overrideDocument(target, adr017Path,
    adr017.replace('- Status: APPROVED', '- Status: PROPOSED')))
    .includes('TOPOLOGY_NOT_APPROVED'));
assertCase('Broken business-decision anchor is rejected',
  validateDecisionDocuments((target) => overrideDocument(target, matrixPath,
    replaceFirst(canonical, 'BUSINESS_DECISIONS.md',
      'BUSINESS_DECISIONS.md#bd-999')))
    .some((error) => error.startsWith('BROKEN_LOCAL_ANCHOR')));
assertCase('Impossible approval date is rejected',
  validateDecisionDocuments((target) => overrideDocument(target, adr018Path,
    adr018.replace('- Approval date: 2026-10-03', '- Approval date: 2026-99-99')))
    .some((error) => error.startsWith('INVALID_APPROVAL_DATE')));
const documentErrors = validateDecisionDocuments(readDocumentOrNull);
assertCase('All decision-document links, approvals and dates validate',
  documentErrors.length === 0);
if (documentErrors.length > 0) {
  console.error(`[DIAGNOSTIC] Decision document codes: ${documentErrors.join(',')}`);
}

console.log(process.exitCode ? 'S001-T09 decision matrix tests: FAIL' : 'S001-T09 decision matrix tests: PASS');
