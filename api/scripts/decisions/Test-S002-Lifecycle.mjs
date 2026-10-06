import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLifecycleDocuments, validateLifecycle } from './SprintLifecycle.mjs';

const OWNER = 'AkaDNT (Project Owner / Repository Owner)';
const DECISION_REF = 'OWNER-DECISION-2026-10-05-S002-EXECUTION';
const REQUIRED_CHECKS = ['monorepo-required', 'supply-chain-verification'];
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function approval(scope) {
  const result = {
    owner: OWNER,
    date: '2026-10-05',
    scope,
    reference: DECISION_REF,
  };
  if (scope === 'CAPACITY') {
    result.effectiveHours = { min: 72, max: 114 };
    result.reserveHours = { min: 14, max: 22 };
    result.envelopeMaximumHours = 136;
    result.plannedDates = null;
  }
  if (scope === 'EXECUTION_METHOD') result.method = 'DIRECT_SEQUENTIAL_ISOLATED_WORKTREE';
  return result;
}

function activationPublication(status = 'PUBLISHED_VERIFIED') {
  const merge = '1'.repeat(40);
  return {
    status,
    merge,
    tree: '2'.repeat(40),
    pr: 'https://github.com/AkaDNT/auction-promax/pull/17',
    checks: REQUIRED_CHECKS.map((name, index) => ({
      name,
      conclusion: 'SUCCESS',
      runUrl: `https://github.com/AkaDNT/auction-promax/actions/runs/${100 + index}`,
      commit: merge,
    })),
  };
}

function plannedFixture() {
  return {
    sprint: {
      id: 'SPRINT-002',
      deliveryPhase: 0,
      status: 'PLANNED',
      publicationStatus: 'NOT_PUBLISHED',
    },
    delivery: {
      currentSprint: 'SPRINT-001',
      currentPhase: 0,
      currentStatus: 'COMPLETED',
      publicationStatus: 'PUBLISHED_VERIFIED',
      historicalSprint1: null,
    },
    index: {
      currentSprint: 'SPRINT-001',
      currentPhase: 0,
      currentStatus: 'COMPLETED',
      publicationStatus: 'PUBLISHED_VERIFIED',
      historicalSprint1: null,
    },
    exitEvidence: {
      kind: 'SPRINT_ACTIVATION',
      designApproval: approval('DESIGN'),
      planApproval: approval('IMPLEMENTATION_PLAN'),
      capacityApproval: approval('CAPACITY'),
      executionApproval: approval('EXECUTION_METHOD'),
      activationApproval: null,
      activationPublication: null,
    },
  };
}

function activeFixture() {
  return {
    sprint: {
      id: 'SPRINT-002',
      deliveryPhase: 0,
      status: 'IN_PROGRESS',
      publicationStatus: 'NOT_PUBLISHED',
    },
    delivery: {
      currentSprint: 'SPRINT-002',
      currentPhase: 0,
      currentStatus: 'IN_PROGRESS',
      publicationStatus: 'NOT_PUBLISHED',
      historicalSprint1: {
        currentSprint: 'SPRINT-001',
        currentPhase: 0,
        currentStatus: 'COMPLETED',
        publicationStatus: 'PUBLISHED_VERIFIED',
        publishedMerge: 'ab2d8256b25919cc7479fa6d6aad7a41eb964f83',
        closureDate: '2026-10-05',
        traceability: true,
      },
    },
    index: {
      currentSprint: 'SPRINT-002',
      currentPhase: 0,
      currentStatus: 'IN_PROGRESS',
      publicationStatus: 'NOT_PUBLISHED',
      historicalSprint1: {
        currentSprint: 'SPRINT-001',
        currentPhase: 0,
        currentStatus: 'COMPLETED',
        publicationStatus: 'PUBLISHED_VERIFIED',
        publishedMerge: 'ab2d8256b25919cc7479fa6d6aad7a41eb964f83',
        closureDate: '2026-10-05',
      },
    },
    exitEvidence: {
      kind: 'SPRINT_ACTIVATION',
      designApproval: approval('DESIGN'),
      planApproval: approval('IMPLEMENTATION_PLAN'),
      capacityApproval: approval('CAPACITY'),
      executionApproval: approval('EXECUTION_METHOD'),
      activationApproval: approval('SPRINT_ACTIVATION'),
      activationPublication: activationPublication(),
    },
  };
}

function approvalLine(label, scope, details = '') {
  return `- ${label}: APPROVED | ${OWNER} | 2026-10-05 | ${scope} | ${DECISION_REF}${details}\n`;
}

function markdownFixture({ active = false, pending = false } = {}) {
  const sprintStatus = active ? 'IN_PROGRESS' : pending ? 'ACTIVATION_PENDING' : 'PLANNED';
  const currentSprint = active ? 'SPRINT-002' : 'SPRINT-001';
  const currentStatus = active ? 'IN_PROGRESS' : 'COMPLETED';
  const publicationLine = active
    ? `- Activation publication: PUBLISHED_VERIFIED | ${'1'.repeat(40)} | ${'2'.repeat(40)} | https://github.com/AkaDNT/auction-promax/pull/17 | monorepo-required=SUCCESS,https://github.com/AkaDNT/auction-promax/actions/runs/100,${'1'.repeat(40)} | supply-chain-verification=SUCCESS,https://github.com/AkaDNT/auction-promax/actions/runs/101,${'1'.repeat(40)}\n`
    : pending
      ? '- Activation publication: PENDING_PROTECTED_PR | — | — | — | — | —\n'
    : '- Activation publication: —\n';
  const historical = active || pending
    ? '\n## Sprint 001 historical lifecycle\n'
      + '- Current roadmap phase: Phase 0 — Decision lock and engineering foundation\n'
      + '- Current sprint: SPRINT-001\n'
      + '- Sprint status: COMPLETED\n'
      + '- Publication status: PUBLISHED_VERIFIED\n'
      + '- Published merge: `ab2d8256b25919cc7479fa6d6aad7a41eb964f83`.\n'
      + '- Actual review/closure date: 2026-10-05\n'
      + 'S001-T09 decision traceability: 20/20 approved\n'
    : '';
  const indexHistory = active || pending
    ? '\n## Sprint 001 historical lifecycle\n'
      + '- Sprint: SPRINT-001\n'
      + '- Roadmap phase: Phase 0 — Decision lock and engineering foundation\n'
      + '- Status: COMPLETED\n'
      + '- Publication status: PUBLISHED_VERIFIED\n'
      + '- Published merge: `ab2d8256b25919cc7479fa6d6aad7a41eb964f83`.\n'
      + '- Actual review/closure date: 2026-10-05\n'
    : '';
  return {
    sprintMarkdown: `# SPRINT-002 — Lifecycle fixture\n\n## Sprint Context\n`
      + '- Sprint ID: SPRINT-002\n'
      + '- Roadmap phase: Phase 0 — Architecture and Java engineering foundation\n'
      + `- Sprint status: ${sprintStatus}\n`
      + '- Publication status: NOT_PUBLISHED\n',
    deliveryMarkdown: `# Delivery\n\n## Current Position\n`
      + '- Current roadmap phase: Phase 0 — Decision lock and engineering foundation\n'
      + `- Current sprint: ${currentSprint}\n`
      + `- Sprint status: ${currentStatus}\n`
      + `- Publication status: ${active ? 'NOT_PUBLISHED' : 'PUBLISHED_VERIFIED'}\n`
      + historical,
    indexMarkdown: `# Sprint Index\n\n## Current Sprint\n`
      + `- Sprint: ${currentSprint}\n`
      + '- Roadmap phase: Phase 0 — Architecture and engineering foundation\n'
      + `- Status: ${currentStatus}\n`
      + `- Publication status: ${active ? 'NOT_PUBLISHED' : 'PUBLISHED_VERIFIED'}\n`
      + indexHistory,
    evidenceMarkdown: '# S002 Review Evidence\n\n## Lifecycle Evidence\n'
      + '- Evidence kind: SPRINT_ACTIVATION\n'
      + approvalLine('Design approval', 'DESIGN')
      + approvalLine('Plan approval', 'IMPLEMENTATION_PLAN')
      + approvalLine('Capacity approval', 'CAPACITY', ' | 72-114 | 14-22 | 136 | UNSET')
      + approvalLine('Execution method approval', 'EXECUTION_METHOD', ' | DIRECT_SEQUENTIAL_ISOLATED_WORKTREE')
      + (active || pending
        ? approvalLine('Activation approval', 'SPRINT_ACTIVATION')
        : '- Activation approval: —\n')
      + publicationLine,
  };
}

function assertInvalid(result, code, label) {
  assert.equal(result.valid, false, label);
  assert.ok(result.errors.includes(code), `${label}: missing ${code}; got ${result.errors.join(',')}`);
}

function runFixtureSuite() {
  const planned = plannedFixture();
  const plannedResult = validateLifecycle(planned);
  assert.equal(plannedResult.valid, true, `a fully approved PLANNED candidate is valid: ${plannedResult.errors.join(',')}`);

  const badPhase = structuredClone(planned);
  badPhase.sprint.deliveryPhase = 1;
  assertInvalid(validateLifecycle(badPhase), 'PHASE_MISMATCH', 'Sprint-only Phase 1 mutation');

  const disagreeingCurrent = structuredClone(planned);
  disagreeingCurrent.index.currentSprint = 'SPRINT-002';
  assertInvalid(validateLifecycle(disagreeingCurrent), 'CURRENT_SPRINT_MISMATCH', 'Delivery/Index current sprint disagreement');

  const active = activeFixture();
  assert.equal(validateLifecycle(active).valid, true, 'active S002 with verified activation publication is valid');

  const pendingActivation = structuredClone(active);
  pendingActivation.sprint.status = 'ACTIVATION_PENDING';
  pendingActivation.delivery.currentSprint = 'SPRINT-001';
  pendingActivation.delivery.currentStatus = 'COMPLETED';
  pendingActivation.delivery.publicationStatus = 'PUBLISHED_VERIFIED';
  pendingActivation.index.currentSprint = 'SPRINT-001';
  pendingActivation.index.currentStatus = 'COMPLETED';
  pendingActivation.index.publicationStatus = 'PUBLISHED_VERIFIED';
  pendingActivation.exitEvidence.activationPublication = {
    status: 'PENDING_PROTECTED_PR', merge: null, tree: null, pr: null, checks: [],
  };
  assert.equal(validateLifecycle(pendingActivation).valid, true,
    'activation-pending state retains an intact historical S001 snapshot');
  const noPendingHistory = structuredClone(pendingActivation);
  noPendingHistory.delivery.historicalSprint1 = null;
  assertInvalid(validateLifecycle(noPendingHistory), 'FIELD_MISSING',
    'activation-pending state without historical S001 evidence');
  for (const approvalName of ['designApproval', 'planApproval', 'capacityApproval', 'executionApproval']) {
    const pendingApproval = structuredClone(planned);
    pendingApproval.exitEvidence[approvalName] = { pending: true };
    assertInvalid(validateLifecycle(pendingApproval), 'APPROVAL_MISSING',
      `planned state without ${approvalName}`);
  }

  for (const approvalName of [
    'designApproval', 'planApproval', 'capacityApproval', 'executionApproval', 'activationApproval',
  ]) {
    const missing = structuredClone(active);
    missing.exitEvidence[approvalName] = null;
    assertInvalid(validateLifecycle(missing), 'APPROVAL_MISSING', `active state without ${approvalName}`);
  }

  const wrongScope = structuredClone(active);
  wrongScope.exitEvidence.capacityApproval.scope = 'EXECUTION_METHOD';
  assertInvalid(validateLifecycle(wrongScope), 'APPROVAL_SCOPE_INVALID', 'capacity approval with wrong scope');

  const badDate = structuredClone(active);
  badDate.exitEvidence.activationApproval.date = '2026-02-30';
  assertInvalid(validateLifecycle(badDate), 'APPROVAL_DATE_INVALID', 'impossible activation approval date');

  const missingReference = structuredClone(active);
  missingReference.exitEvidence.planApproval.reference = '';
  assertInvalid(validateLifecycle(missingReference), 'APPROVAL_MISSING', 'plan approval without decision reference');

  const wrongRun = structuredClone(active);
  wrongRun.exitEvidence.activationPublication.checks[0].commit = '4'.repeat(40);
  assertInvalid(validateLifecycle(wrongRun), 'REQUIRED_CHECK_REVISION_MISMATCH', 'postmerge check bound to a different SHA');

  const publishedCloseout = structuredClone(active);
  publishedCloseout.sprint.publicationStatus = 'PUBLISHED_VERIFIED';
  assertInvalid(validateLifecycle(publishedCloseout), 'STATUS_MISMATCH', 'activation publication cannot imply Sprint closeout publication');

  const prematurePublication = structuredClone(planned);
  prematurePublication.exitEvidence.activationPublication = activationPublication();
  assertInvalid(validateLifecycle(prematurePublication), 'STATUS_MISMATCH', 'PLANNED cannot contain verified activation publication');

  const pendingActive = structuredClone(active);
  pendingActive.exitEvidence.activationPublication = {
    status: 'PENDING_PROTECTED_PR', merge: null, tree: null, pr: null, checks: [],
  };
  assertInvalid(validateLifecycle(pendingActive), 'PUBLICATION_PENDING', 'ACTIVE requires verified activation prerequisite publication');

  const fabricatedPending = structuredClone(planned);
  fabricatedPending.sprint.status = 'ACTIVATION_PENDING';
  fabricatedPending.exitEvidence.activationApproval = approval('SPRINT_ACTIVATION');
  fabricatedPending.exitEvidence.activationPublication = {
    status: 'PENDING_PROTECTED_PR',
    merge: '1'.repeat(40), tree: null, pr: null, checks: [],
  };
  assertInvalid(validateLifecycle(fabricatedPending), 'PUBLICATION_IDENTITY_INVALID', 'pending publication with fabricated merge');

  const unknownState = structuredClone(planned);
  unknownState.sprint.status = 'DONE';
  assertInvalid(validateLifecycle(unknownState), 'STATE_UNKNOWN', 'unknown sprint state');

  const phase1Current = structuredClone(active);
  phase1Current.delivery.currentPhase = 1;
  phase1Current.index.currentPhase = 1;
  phase1Current.sprint.deliveryPhase = 1;
  assertInvalid(validateLifecycle(phase1Current), 'PHASE_MISMATCH', 'Phase 1 transition is owned by T07');

  const validMarkdown = markdownFixture();
  const parsed = parseLifecycleDocuments(validMarkdown);
  assert.deepEqual(parsed.errors, [], `planned parser errors: ${parsed.errors.join(',')}`);
  assert.equal(parsed.state, 'PLANNED', 'strict Markdown parser identifies a planned candidate');

  const crlfMarkdown = Object.fromEntries(Object.entries(validMarkdown)
    .map(([key, value]) => [key, value.replace(/\n/g, '\r\n')]));
  assert.equal(parseLifecycleDocuments(crlfMarkdown).state, 'PLANNED', 'CRLF is accepted without changing field semantics');

  const missingField = { ...validMarkdown,
    sprintMarkdown: validMarkdown.sprintMarkdown.replace('- Sprint status: PLANNED\n', ''),
  };
  assert.ok(parseLifecycleDocuments(missingField).errors.includes('FIELD_MISSING'));

  const duplicateField = { ...validMarkdown,
    sprintMarkdown: validMarkdown.sprintMarkdown.replace(
      '- Sprint status: PLANNED\n', '- Sprint status: PLANNED\n- Sprint status: PLANNED\n',
    ),
  };
  assert.ok(parseLifecycleDocuments(duplicateField).errors.includes('FIELD_DUPLICATE'));

  const wrongHeading = { ...validMarkdown,
    sprintMarkdown: validMarkdown.sprintMarkdown.replace('## Sprint Context', '## Sprint Details'),
  };
  assert.ok(parseLifecycleDocuments(wrongHeading).errors.includes('FIELD_MISSING'));

  const unknownPublication = { ...validMarkdown,
    sprintMarkdown: validMarkdown.sprintMarkdown.replace('NOT_PUBLISHED', 'PUBLISHED'),
  };
  assert.ok(parseLifecycleDocuments(unknownPublication).errors.includes('STATE_UNKNOWN'));

  const missingApprovalField = { ...validMarkdown,
    evidenceMarkdown: validMarkdown.evidenceMarkdown.replace(
      /^- Plan approval:.*\n/m, '',
    ),
  };
  assert.ok(parseLifecycleDocuments(missingApprovalField).errors.includes('FIELD_MISSING'));
  const extraApprovalField = { ...validMarkdown,
    evidenceMarkdown: validMarkdown.evidenceMarkdown.replace(
      /^(- Plan approval: [^\n]+)$/m, '$1 | unexpected',
    ),
  };
  assert.ok(parseLifecycleDocuments(extraApprovalField).errors.includes('INPUT_INVALID'));
  const unknownEvidenceAlias = { ...validMarkdown,
    evidenceMarkdown: validMarkdown.evidenceMarkdown.replace(
      '- Activation publication: —\n', '- Activation publication: —\n- Publication: PUBLISHED_VERIFIED\n',
    ),
  };
  assert.ok(parseLifecycleDocuments(unknownEvidenceAlias).errors.includes('INPUT_INVALID'));

  const unknownCurrentStatus = { ...validMarkdown,
    deliveryMarkdown: validMarkdown.deliveryMarkdown.replace(
      '- Sprint status: COMPLETED', '- Sprint status: UNKNOWN_STATUS',
    ),
  };
  assert.ok(parseLifecycleDocuments(unknownCurrentStatus).errors.includes('STATE_UNKNOWN'));

  const activeMarkdown = markdownFixture({ active: true });
  const parsedActive = parseLifecycleDocuments(activeMarkdown);
  assert.equal(parsedActive.state, 'ACTIVE', 'current S002 requires its S001 historical snapshot');
  assert.deepEqual(parsedActive.errors, []);

  const aliasPublication = structuredClone(activeFixture());
  aliasPublication.exitEvidence.publication = aliasPublication.exitEvidence.activationPublication;
  assertInvalid(validateLifecycle(aliasPublication), 'INPUT_INVALID', 'legacy publication alias is not accepted');

  const malformedCheck = structuredClone(activeFixture());
  malformedCheck.exitEvidence.activationPublication.checks[0] = null;
  assertInvalid(validateLifecycle(malformedCheck), 'PUBLICATION_IDENTITY_INVALID', 'malformed required check fails closed');

  const missingHistorical = { ...activeMarkdown,
    deliveryMarkdown: activeMarkdown.deliveryMarkdown.replace(
      /\n## Sprint 001 historical lifecycle[\s\S]*$/, '',
    ),
  };
  assert.ok(parseLifecycleDocuments(missingHistorical).errors.includes('FIELD_MISSING'));

  const tamperedHistorical = { ...activeMarkdown,
    indexMarkdown: activeMarkdown.indexMarkdown.replace(
      'ab2d8256b25919cc7479fa6d6aad7a41eb964f83', '4'.repeat(40),
    ),
  };
  assert.ok(parseLifecycleDocuments(tamperedHistorical).errors.includes('INPUT_INVALID'));
  const malformedHistoricalSha = { ...activeMarkdown,
    deliveryMarkdown: activeMarkdown.deliveryMarkdown.replace(
      '`ab2d8256b25919cc7479fa6d6aad7a41eb964f83`.',
      '`ab2d8256b25919cc7479fa6d6aad7a41eb964f83`.|extra',
    ),
  };
  assert.ok(parseLifecycleDocuments(malformedHistoricalSha).errors.includes('PUBLICATION_IDENTITY_INVALID'));
  const pendingMarkdown = markdownFixture({ pending: true });
  const parsedPending = parseLifecycleDocuments(pendingMarkdown);
  assert.equal(parsedPending.state, 'ACTIVATION_PENDING');
  assert.deepEqual(parsedPending.errors, []);
  const pendingMissingHistory = { ...pendingMarkdown,
    deliveryMarkdown: pendingMarkdown.deliveryMarkdown.replace(
      /\n## Sprint 001 historical lifecycle[\s\S]*$/, '',
    ),
  };
  assert.ok(parseLifecycleDocuments(pendingMissingHistory).errors.includes('FIELD_MISSING'));

  console.log('S002_LIFECYCLE_FIXTURES_PASS');
}

function runRepositoryMode() {
  const read = (relativePath, optional = false) => {
    const absolutePath = path.join(repositoryRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      if (optional) return null;
      throw new Error('INPUT_INVALID');
    }
    return fs.readFileSync(absolutePath, 'utf8');
  };
  const sprintMarkdown = read('docs/sprints/SPRINT_002.md', true);
  const evidenceMarkdown = read('docs/sprints/S002_REVIEW_EVIDENCE.md', true);
  const parsed = parseLifecycleDocuments({
    sprintMarkdown,
    deliveryMarkdown: read('docs/DELIVERY_STATE.md'),
    indexMarkdown: read('docs/SPRINT_INDEX.md'),
    evidenceMarkdown,
  });
  if (parsed.errors.length > 0) {
    console.error(parsed.errors.join('\n'));
    process.exitCode = 1;
    return;
  }
  const result = validateLifecycle(parsed);
  if (!result.valid) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('S002_LIFECYCLE_REPOSITORY_PASS');
}

const args = process.argv.slice(2);
try {
  if (args.length === 0) {
    runFixtureSuite();
  } else if (args.length === 1 && args[0] === '--repository') {
    runRepositoryMode();
  } else {
    throw new Error('USAGE');
  }
} catch (error) {
  const code = typeof error?.message === 'string' && /^[A-Z][A-Z0-9_]*$/.test(error.message)
    ? error.message
    : 'INPUT_INVALID';
  console.error(code);
  process.exitCode = 1;
}
