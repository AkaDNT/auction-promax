const OWNER = 'AkaDNT (Project Owner / Repository Owner)';
const REPOSITORY = 'https://github.com/AkaDNT/auction-promax';
const S001_MERGE = 'ab2d8256b25919cc7479fa6d6aad7a41eb964f83';
const REQUIRED_CHECKS = ['monorepo-required', 'supply-chain-verification'];
const APPROVAL_SCOPES = new Set([
  'DESIGN', 'IMPLEMENTATION_PLAN', 'CAPACITY', 'EXECUTION_METHOD', 'SPRINT_ACTIVATION',
]);

function addError(errors, code) {
  if (!errors.includes(code)) errors.push(code);
}

function hasExactKeys(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key));
}

function normalize(markdown) {
  if (typeof markdown !== 'string') return markdown;
  return markdown.replace(/\r\n/g, '\n');
}

function section(markdown, heading, errors) {
  if (typeof markdown !== 'string') {
    addError(errors, 'INPUT_INVALID');
    return '';
  }
  const source = normalize(markdown);
  const headings = [...source.matchAll(/^## .+$/gm)];
  const matches = headings.filter((match) => match[0] === heading);
  if (matches.length === 0) {
    addError(errors, 'FIELD_MISSING');
    return '';
  }
  if (matches.length !== 1) {
    addError(errors, 'FIELD_DUPLICATE');
    return '';
  }
  const start = matches[0].index + matches[0][0].length;
  const next = headings.find((match) => match.index > start);
  return source.slice(start, next ? next.index : source.length);
}

function fieldValue(sectionText, label, errors) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...sectionText.matchAll(new RegExp(`^- ${escaped}: (.*)$`, 'gm'))];
  if (matches.length === 0) {
    addError(errors, 'FIELD_MISSING');
    return null;
  }
  if (matches.length !== 1) {
    addError(errors, 'FIELD_DUPLICATE');
    return null;
  }
  return matches[0][1].trim();
}

function parsePhase(value, errors) {
  const match = typeof value === 'string' && value.match(/^Phase (0|[1-9][0-9]*)(?:\s+—.*)?$/);
  if (!match) {
    addError(errors, 'INPUT_INVALID');
    return null;
  }
  return Number(match[1]);
}

function parseEnum(value, allowed, errors) {
  if (!allowed.has(value)) addError(errors, 'STATE_UNKNOWN');
  return value;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

function parseApproval(value, scope, errors) {
  if (typeof value !== 'string') {
    addError(errors, 'FIELD_MISSING');
    return null;
  }
  if (value === 'PENDING_OWNER_DECISION') return { pending: true };
  if (value === '—') return null;
  const parts = value.split('|').map((part) => part.trim());
  const expectedParts = scope === 'CAPACITY' ? 9 : scope === 'EXECUTION_METHOD' ? 6 : 5;
  if (parts.length !== expectedParts) {
    addError(errors, 'INPUT_INVALID');
    return null;
  }
  if (parts[0] !== 'APPROVED') {
    addError(errors, 'APPROVAL_MISSING');
    return null;
  }
  if (parts[1] !== OWNER || !parts[4]) {
    addError(errors, 'APPROVAL_MISSING');
    return null;
  }
  if (!validDate(parts[2])) addError(errors, 'APPROVAL_DATE_INVALID');
  if (parts[3] !== scope || !APPROVAL_SCOPES.has(parts[3])) {
    addError(errors, 'APPROVAL_SCOPE_INVALID');
  }
  const approval = {
    owner: parts[1], date: parts[2], scope: parts[3], reference: parts[4],
  };
  if (scope === 'CAPACITY') {
    const ranges = parts[5]?.match(/^(\d+)-(\d+)$/);
    const reserve = parts[6]?.match(/^(\d+)-(\d+)$/);
    const envelopeMaximumHours = Number(parts[7]);
    if (!ranges || !reserve || !Number.isInteger(envelopeMaximumHours) || parts[8] !== 'UNSET') {
      addError(errors, 'APPROVAL_MISSING');
    } else {
      approval.effectiveHours = { min: Number(ranges[1]), max: Number(ranges[2]) };
      approval.reserveHours = { min: Number(reserve[1]), max: Number(reserve[2]) };
      approval.envelopeMaximumHours = envelopeMaximumHours;
      approval.plannedDates = null;
    }
  }
  if (scope === 'EXECUTION_METHOD') {
    if (!parts[5]) addError(errors, 'APPROVAL_MISSING');
    approval.method = parts[5];
  }
  return approval;
}

function parseCheck(value, errors) {
  if (typeof value !== 'string') {
    addError(errors, 'INPUT_INVALID');
    return null;
  }
  if (value === '—') return null;
  const match = value.match(/^([^=]+)=([^,]+),([^,]+),(.*)$/);
  if (!match) {
    addError(errors, 'INPUT_INVALID');
    return null;
  }
  return { name: match[1], conclusion: match[2], runUrl: match[3], commit: match[4] };
}

function parsePublication(value, errors) {
  if (typeof value !== 'string') {
    addError(errors, 'FIELD_MISSING');
    return null;
  }
  if (value === '—') return null;
  const parts = value.split('|').map((part) => part.trim());
  const status = parseEnum(parts[0], new Set(['PENDING_PROTECTED_PR', 'PUBLISHED_VERIFIED']), errors);
  if (parts.length !== 6) {
    addError(errors, 'INPUT_INVALID');
    return { status, merge: null, tree: null, pr: null, checks: [] };
  }
  const empty = (part) => part === '—' ? null : part;
  const checkOne = parseCheck(parts[4], errors);
  const checkTwo = parseCheck(parts[5], errors);
  return {
    status,
    merge: empty(parts[1]),
    tree: empty(parts[2]),
    pr: empty(parts[3]),
    checks: [checkOne, checkTwo].filter(Boolean),
  };
}

function parseDelivery(markdown, errors) {
  const current = section(markdown, '## Current Position', errors);
  const currentSprint = parseEnum(fieldValue(current, 'Current sprint', errors),
    new Set(['SPRINT-001', 'SPRINT-002']), errors);
  const result = {
    currentPhase: parsePhase(fieldValue(current, 'Current roadmap phase', errors), errors),
    currentSprint,
    currentStatus: parseEnum(fieldValue(current, 'Sprint status', errors),
      new Set(['IN_PROGRESS', 'COMPLETED']), errors),
    publicationStatus: parseEnum(fieldValue(current, 'Publication status', errors),
      new Set(['PENDING_PROTECTED_PR', 'PUBLISHED_VERIFIED', 'NOT_PUBLISHED']), errors),
    historicalSprint1: null,
  };
  if (result.currentSprint === 'SPRINT-002' || /^(?:## Sprint 001 historical lifecycle)$/m.test(markdown)) {
    const history = section(markdown, '## Sprint 001 historical lifecycle', errors);
    result.historicalSprint1 = {
      currentPhase: parsePhase(fieldValue(history, 'Current roadmap phase', errors), errors),
      currentSprint: parseEnum(fieldValue(history, 'Current sprint', errors), new Set(['SPRINT-001']), errors),
      currentStatus: parseEnum(fieldValue(history, 'Sprint status', errors),
        new Set(['COMPLETED']), errors),
      publicationStatus: parseEnum(fieldValue(history, 'Publication status', errors),
        new Set(['PENDING_PROTECTED_PR', 'PUBLISHED_VERIFIED']), errors),
      publishedMerge: parseHistoricalMerge(fieldValue(history, 'Published merge', errors), errors),
      closureDate: fieldValue(history, 'Actual review/closure date', errors),
      traceability: /^S001-T09 decision traceability: 20\/20 approved$/m.test(history),
    };
  }
  return result;
}

function parseIndex(markdown, errors) {
  const current = section(markdown, '## Current Sprint', errors);
  const currentSprint = parseEnum(fieldValue(current, 'Sprint', errors),
    new Set(['SPRINT-001', 'SPRINT-002']), errors);
  const result = {
    currentSprint,
    currentPhase: parsePhase(fieldValue(current, 'Roadmap phase', errors), errors),
    currentStatus: parseEnum(fieldValue(current, 'Status', errors),
      new Set(['IN_PROGRESS', 'COMPLETED']), errors),
    publicationStatus: parseEnum(fieldValue(current, 'Publication status', errors),
      new Set(['PENDING_PROTECTED_PR', 'PUBLISHED_VERIFIED', 'NOT_PUBLISHED']), errors),
    historicalSprint1: null,
  };
  if (result.currentSprint === 'SPRINT-002' || /^(?:## Sprint 001 historical lifecycle)$/m.test(markdown)) {
    const history = section(markdown, '## Sprint 001 historical lifecycle', errors);
    result.historicalSprint1 = {
      currentSprint: parseEnum(fieldValue(history, 'Sprint', errors), new Set(['SPRINT-001']), errors),
      currentPhase: parsePhase(fieldValue(history, 'Roadmap phase', errors), errors),
      currentStatus: parseEnum(fieldValue(history, 'Status', errors),
        new Set(['COMPLETED']), errors),
      publicationStatus: parseEnum(fieldValue(history, 'Publication status', errors),
        new Set(['PENDING_PROTECTED_PR', 'PUBLISHED_VERIFIED']), errors),
      publishedMerge: parseHistoricalMerge(fieldValue(history, 'Published merge', errors), errors),
      closureDate: fieldValue(history, 'Actual review/closure date', errors),
    };
  }
  return result;
}

function parseHistoricalMerge(value, errors) {
  const match = typeof value === 'string' && value.match(/^`([0-9a-f]{40})`\.$/);
  if (!match || !validSha(match[1])) {
    addError(errors, 'PUBLICATION_IDENTITY_INVALID');
    return null;
  }
  return match[1];
}

function parseEvidence(markdown, errors) {
  const evidence = section(markdown, '## Lifecycle Evidence', errors);
  const allowedFields = new Set([
    'Evidence kind', 'Design approval', 'Plan approval', 'Capacity approval',
    'Execution method approval', 'Activation approval', 'Activation publication',
  ]);
  for (const match of evidence.matchAll(/^- ([^:]+):/gm)) {
    if (!allowedFields.has(match[1])) addError(errors, 'INPUT_INVALID');
  }
  return {
    kind: fieldValue(evidence, 'Evidence kind', errors),
    designApproval: parseApproval(fieldValue(evidence, 'Design approval', errors), 'DESIGN', errors),
    planApproval: parseApproval(fieldValue(evidence, 'Plan approval', errors), 'IMPLEMENTATION_PLAN', errors),
    capacityApproval: parseApproval(fieldValue(evidence, 'Capacity approval', errors), 'CAPACITY', errors),
    executionApproval: parseApproval(fieldValue(evidence, 'Execution method approval', errors), 'EXECUTION_METHOD', errors),
    activationApproval: parseApproval(fieldValue(evidence, 'Activation approval', errors), 'SPRINT_ACTIVATION', errors),
    activationPublication: parsePublication(fieldValue(evidence, 'Activation publication', errors), errors),
  };
}

export function parseLifecycleDocuments({
  sprintMarkdown, deliveryMarkdown, indexMarkdown, evidenceMarkdown,
} = {}) {
  const errors = [];
  const delivery = parseDelivery(deliveryMarkdown, errors);
  const index = parseIndex(indexMarkdown, errors);
  let sprint = null;
  let exitEvidence = null;

  if (sprintMarkdown === null || sprintMarkdown === undefined) {
    if (delivery.currentSprint !== 'SPRINT-001' || index.currentSprint !== 'SPRINT-001') {
      addError(errors, 'INPUT_INVALID');
    }
  } else {
    const context = section(sprintMarkdown, '## Sprint Context', errors);
    sprint = {
      id: fieldValue(context, 'Sprint ID', errors),
      deliveryPhase: parsePhase(fieldValue(context, 'Roadmap phase', errors), errors),
      status: parseEnum(fieldValue(context, 'Sprint status', errors),
        new Set(['PLANNED', 'ACTIVATION_PENDING', 'IN_PROGRESS']), errors),
      publicationStatus: parseEnum(fieldValue(context, 'Publication status', errors),
        new Set(['NOT_PUBLISHED']), errors),
    };
    exitEvidence = parseEvidence(evidenceMarkdown, errors);
  }

  const records = { sprint, delivery, index, exitEvidence };
  const lifecycleResult = validateLifecycle(records);
  for (const error of lifecycleResult.errors) addError(errors, error);
  const state = errors.length > 0 ? 'INVALID' : lifecycleResult.state;
  return { ...records, state, errors };
}

function validateApproval(approval, expectedScope, errors) {
  if (!approval) {
    addError(errors, 'APPROVAL_MISSING');
    return;
  }
  const allowedKeys = expectedScope === 'CAPACITY'
    ? ['owner', 'date', 'scope', 'reference', 'effectiveHours', 'reserveHours', 'envelopeMaximumHours', 'plannedDates']
    : expectedScope === 'EXECUTION_METHOD'
      ? ['owner', 'date', 'scope', 'reference', 'method']
      : ['owner', 'date', 'scope', 'reference'];
  if (!hasExactKeys(approval, allowedKeys)) addError(errors, 'INPUT_INVALID');
  if (approval.owner !== OWNER || !approval.reference) addError(errors, 'APPROVAL_MISSING');
  if (approval.scope !== expectedScope) addError(errors, 'APPROVAL_SCOPE_INVALID');
  if (!validDate(approval.date)) addError(errors, 'APPROVAL_DATE_INVALID');
  if (expectedScope === 'CAPACITY') {
    const hours = approval.effectiveHours;
    const reserve = approval.reserveHours;
    if (!hours || hours.min !== 72 || hours.max !== 114 ||
      !reserve || reserve.min !== 14 || reserve.max !== 22 ||
      approval.envelopeMaximumHours !== 136) addError(errors, 'APPROVAL_MISSING');
  }
  if (expectedScope === 'EXECUTION_METHOD' && approval.method !== 'DIRECT_SEQUENTIAL_ISOLATED_WORKTREE') {
    addError(errors, 'APPROVAL_MISSING');
  }
}

function validSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value) && !/^0{40}$/.test(value);
}

function validateActivationPublication(publication, errors) {
  if (!publication || !['PENDING_PROTECTED_PR', 'PUBLISHED_VERIFIED'].includes(publication.status)) {
    addError(errors, 'STATE_UNKNOWN');
    return;
  }
  if (!hasExactKeys(publication, ['status', 'merge', 'tree', 'pr', 'checks'])) {
    addError(errors, 'PUBLICATION_IDENTITY_INVALID');
  }
  if (publication.status === 'PENDING_PROTECTED_PR') {
    if (publication.merge !== null || publication.tree !== null ||
      !Array.isArray(publication.checks) || publication.checks.length !== 0 ||
      (publication.pr !== null && !new RegExp(`^${REPOSITORY}/pull/[1-9][0-9]*$`).test(publication.pr))) {
      addError(errors, 'PUBLICATION_IDENTITY_INVALID');
    }
    return;
  }
  if (!validSha(publication.merge) || !validSha(publication.tree) ||
    !new RegExp(`^${REPOSITORY}/pull/[1-9][0-9]*$`).test(publication.pr ?? '') ||
    !Array.isArray(publication.checks)) {
    addError(errors, 'PUBLICATION_IDENTITY_INVALID');
    return;
  }
  const names = publication.checks.map((check) => check?.name);
  if (new Set(names).size !== names.length) addError(errors, 'PUBLICATION_IDENTITY_INVALID');
  for (const required of REQUIRED_CHECKS) {
    if (!names.includes(required)) addError(errors, 'REQUIRED_CHECK_MISSING');
  }
  if (names.some((name) => !REQUIRED_CHECKS.includes(name))) addError(errors, 'PUBLICATION_IDENTITY_INVALID');
  if (publication.checks.length !== REQUIRED_CHECKS.length) addError(errors, 'REQUIRED_CHECK_MISSING');
  for (const check of publication.checks) {
    if (!check || typeof check !== 'object') {
      addError(errors, 'PUBLICATION_IDENTITY_INVALID');
      continue;
    }
    if (!hasExactKeys(check, ['name', 'conclusion', 'runUrl', 'commit'])) {
      addError(errors, 'PUBLICATION_IDENTITY_INVALID');
    }
    if (check.conclusion !== 'SUCCESS') addError(errors, 'REQUIRED_CHECK_FAILED');
    if (!new RegExp(`^${REPOSITORY}/actions/runs/[1-9][0-9]*$`).test(check.runUrl ?? '')) {
      addError(errors, 'PUBLICATION_IDENTITY_INVALID');
    }
    if (check.commit !== publication.merge) addError(errors, 'REQUIRED_CHECK_REVISION_MISMATCH');
  }
}

function validateHistoricalSprint1(delivery, index, errors) {
  const d = delivery.historicalSprint1;
  const i = index.historicalSprint1;
  if (!d || !i) {
    addError(errors, 'FIELD_MISSING');
    return;
  }
  const valid = d.currentSprint === 'SPRINT-001' && i.currentSprint === 'SPRINT-001' &&
    d.currentPhase === 0 && i.currentPhase === 0 &&
    d.currentStatus === 'COMPLETED' && i.currentStatus === 'COMPLETED' &&
    d.publicationStatus === 'PUBLISHED_VERIFIED' && i.publicationStatus === 'PUBLISHED_VERIFIED' &&
    d.publishedMerge === S001_MERGE && i.publishedMerge === S001_MERGE &&
    d.closureDate === '2026-10-05' && i.closureDate === '2026-10-05' && d.traceability === true;
  if (!valid) addError(errors, 'INPUT_INVALID');
}

export function validateLifecycle({ sprint, delivery, index, exitEvidence } = {}) {
  const errors = [];
  if (!delivery || !index || typeof delivery !== 'object' || typeof index !== 'object') {
    return { valid: false, state: 'INVALID', errors: ['INPUT_INVALID'] };
  }
  if (!hasExactKeys(delivery, ['currentSprint', 'currentPhase', 'currentStatus', 'publicationStatus', 'historicalSprint1']) ||
    !hasExactKeys(index, ['currentSprint', 'currentPhase', 'currentStatus', 'publicationStatus', 'historicalSprint1'])) {
    addError(errors, 'INPUT_INVALID');
  }
  if (delivery.currentSprint !== index.currentSprint) addError(errors, 'CURRENT_SPRINT_MISMATCH');
  if (!['SPRINT-001', 'SPRINT-002'].includes(delivery.currentSprint) ||
    !['SPRINT-001', 'SPRINT-002'].includes(index.currentSprint) ||
    !['IN_PROGRESS', 'COMPLETED'].includes(delivery.currentStatus) ||
    !['IN_PROGRESS', 'COMPLETED'].includes(index.currentStatus) ||
    !['PENDING_PROTECTED_PR', 'PUBLISHED_VERIFIED', 'NOT_PUBLISHED'].includes(delivery.publicationStatus) ||
    !['PENDING_PROTECTED_PR', 'PUBLISHED_VERIFIED', 'NOT_PUBLISHED'].includes(index.publicationStatus)) {
    addError(errors, 'STATE_UNKNOWN');
  }
  if (delivery.currentPhase !== 0 || index.currentPhase !== 0 ||
    delivery.currentPhase !== index.currentPhase || (sprint && sprint.deliveryPhase !== 0)) {
    addError(errors, 'PHASE_MISMATCH');
  }
  if (delivery.currentStatus !== index.currentStatus) addError(errors, 'STATUS_MISMATCH');

  if (!sprint) {
    const baselineValid = delivery.currentSprint === 'SPRINT-001' &&
      delivery.currentStatus === 'COMPLETED' && index.currentStatus === 'COMPLETED' &&
      delivery.publicationStatus === 'PUBLISHED_VERIFIED' &&
      index.publicationStatus === 'PUBLISHED_VERIFIED' && exitEvidence === null;
    if (!baselineValid) addError(errors, 'STATUS_MISMATCH');
    return { valid: errors.length === 0, state: errors.length ? 'INVALID' : 'BASELINE', errors };
  }

  if (!hasExactKeys(sprint, ['id', 'deliveryPhase', 'status', 'publicationStatus']) ||
    !hasExactKeys(exitEvidence, ['kind', 'designApproval', 'planApproval', 'capacityApproval',
      'executionApproval', 'activationApproval', 'activationPublication'])) {
    addError(errors, 'INPUT_INVALID');
  }

  if (sprint.id !== 'SPRINT-002' || !['PLANNED', 'ACTIVATION_PENDING', 'IN_PROGRESS'].includes(sprint.status)) {
    addError(errors, 'STATE_UNKNOWN');
  }
  if (sprint.publicationStatus !== 'NOT_PUBLISHED') addError(errors, 'STATUS_MISMATCH');
  if (!exitEvidence || exitEvidence.kind !== 'SPRINT_ACTIVATION') addError(errors, 'INPUT_INVALID');
  if (exitEvidence && typeof exitEvidence === 'object' && 'publication' in exitEvidence) {
    addError(errors, 'INPUT_INVALID');
  }

  const approvals = exitEvidence ?? {};
  const commonApprovals = [
    ['designApproval', 'DESIGN'],
    ['planApproval', 'IMPLEMENTATION_PLAN'],
    ['capacityApproval', 'CAPACITY'],
    ['executionApproval', 'EXECUTION_METHOD'],
  ];
  let state = 'INVALID';
  if (sprint.status === 'PLANNED') {
    state = 'PLANNED';
    for (const [field, scope] of commonApprovals) {
      validateApproval(approvals[field], scope, errors);
    }
    if (delivery.currentSprint !== 'SPRINT-001' || delivery.currentStatus !== 'COMPLETED' ||
      index.currentStatus !== 'COMPLETED' || delivery.publicationStatus !== 'PUBLISHED_VERIFIED' ||
      index.publicationStatus !== 'PUBLISHED_VERIFIED' || approvals.activationApproval !== null ||
      approvals.activationPublication != null) addError(errors, 'STATUS_MISMATCH');
  } else if (sprint.status === 'ACTIVATION_PENDING') {
    state = 'ACTIVATION_PENDING';
    for (const [field, scope] of commonApprovals) validateApproval(approvals[field], scope, errors);
    validateApproval(approvals.activationApproval, 'SPRINT_ACTIVATION', errors);
    if (delivery.currentSprint !== 'SPRINT-001' || delivery.currentStatus !== 'COMPLETED' ||
      index.currentStatus !== 'COMPLETED' || delivery.publicationStatus !== 'PUBLISHED_VERIFIED' ||
      index.publicationStatus !== 'PUBLISHED_VERIFIED') addError(errors, 'STATUS_MISMATCH');
    validateActivationPublication(approvals.activationPublication, errors);
    validateHistoricalSprint1(delivery, index, errors);
  } else if (sprint.status === 'IN_PROGRESS') {
    state = 'ACTIVE';
    for (const [field, scope] of commonApprovals) validateApproval(approvals[field], scope, errors);
    validateApproval(approvals.activationApproval, 'SPRINT_ACTIVATION', errors);
    if (delivery.currentSprint !== 'SPRINT-002' || delivery.currentStatus !== 'IN_PROGRESS' ||
      index.currentSprint !== 'SPRINT-002' || index.currentStatus !== 'IN_PROGRESS' ||
      delivery.publicationStatus !== 'NOT_PUBLISHED' || index.publicationStatus !== 'NOT_PUBLISHED') {
      addError(errors, 'STATUS_MISMATCH');
    }
    if (approvals.activationPublication?.status === 'PENDING_PROTECTED_PR') {
      addError(errors, 'PUBLICATION_PENDING');
    } else {
      validateActivationPublication(approvals.activationPublication, errors);
    }
    validateHistoricalSprint1(delivery, index, errors);
  }

  return { valid: errors.length === 0, state: errors.length ? 'INVALID' : state, errors };
}
