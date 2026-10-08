const pins = Object.freeze({
  checkout: 'actions/checkout@11d5960a326750d5838078e36cf38b85af677262',
  setupNode: 'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020',
  setupJava: 'actions/setup-java@cf277c60eb25467037889841efdb72551f06f6c3',
  upload: 'actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
  download: 'actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333',
});
const fail = (code) => { throw new Error(code); };
const check = (condition, code) => { if (!condition) fail(code); };
const step = (job, id) => job.steps?.find((candidate) => candidate.id === id || candidate.name === id);

export function validateWorkflowOwnership({ supplyChain, freshness, apiBaseline, monorepo }) {
  validateServiceMatrixWorkflow(supplyChain);
  validateFreshnessMatrixWorkflow(freshness);

  const apiJobs = apiBaseline?.jobs ?? {};
  check(JSON.stringify(Object.keys(apiJobs).sort()) === JSON.stringify([
    'verify-cdk-toolchain', 'verify-contract-registry', 'verify-identity-profile-service',
  ].sort()), 'API_BASELINE_OWNERSHIP_INVALID');
  check(Object.values(apiJobs).every((job) => !job.strategy?.matrix), 'API_BASELINE_MATRIX_OWNERSHIP_INVALID');
  check(String(step(apiJobs['verify-identity-profile-service'], 'Verify identity-profile-service')?.run ?? '').includes('./mvnw -B verify'), 'API_BASELINE_IDENTITY_GATE_MISSING');
  check(Object.values(apiJobs).flatMap((job) => job.steps).filter((item) => String(item.run ?? '').includes('./mvnw -B verify')).length === 1, 'API_BASELINE_DUPLICATE_MAVEN_VERIFY');
  check(Object.values(apiJobs).every((job) => !job.steps.some((item) => String(item.run ?? '').includes('Generate-Service.mjs'))), 'API_BASELINE_GENERATION_FORBIDDEN');

  const rootJobs = monorepo?.jobs ?? {};
  check(JSON.stringify(Object.keys(rootJobs).sort()) === JSON.stringify([
    'api', 'classify', 'lifecycle', 'monorepo-required', 'web',
  ].sort()), 'MONOREPO_WORKFLOW_OWNERSHIP_INVALID');
  check(Object.values(rootJobs).every((job) => !job.strategy?.matrix), 'MONOREPO_MATRIX_OWNERSHIP_INVALID');
  check(String(step(rootJobs.api, 'Verify identity-profile-service')?.run ?? '').includes('./mvnw -B verify'), 'MONOREPO_IDENTITY_GATE_MISSING');
  const identityVerifyCount = rootJobs.api.steps.filter((item) => String(item.run ?? '').includes('./mvnw -B verify')).length;
  check(identityVerifyCount === 1, 'MONOREPO_DUPLICATE_MAVEN_VERIFY');
  check(Object.values(rootJobs).every((job) => !job.steps.some((item) => String(item.run ?? '').includes('Generate-Service.mjs'))), 'MONOREPO_GENERATION_FORBIDDEN');
  const required = rootJobs['monorepo-required'];
  check(required.name === 'monorepo-required' && required.if === '${{ always() }}'
    && JSON.stringify([...required.needs].sort()) === JSON.stringify(['api', 'classify', 'lifecycle', 'web'].sort()), 'MONOREPO_REQUIRED_CHECK_DRIFT');
  return true;
}

export function validateServiceMatrixWorkflow(workflow) {
  check(workflow?.name === 'Supply-chain verification', 'SERVICE_WORKFLOW_NAME_INVALID');
  check(JSON.stringify(Object.keys(workflow.on ?? {}).sort()) === JSON.stringify(['pull_request', 'push', 'workflow_dispatch']), 'SERVICE_WORKFLOW_TRIGGER_INVALID');
  check(workflow.permissions?.contents === 'read' && Object.keys(workflow.permissions).length === 1, 'SERVICE_WORKFLOW_PERMISSIONS_INVALID');
  check(!Object.hasOwn(workflow.on ?? {}, 'pull_request_target'), 'SERVICE_WORKFLOW_UNTRUSTED_TRIGGER');
  check(workflow.concurrency?.['cancel-in-progress'] === false, 'SERVICE_WORKFLOW_CONCURRENCY_INVALID');
  const jobs = workflow.jobs ?? {};
  const expectedJobs = ['classify-services', 'repository-security', 'service-matrix', 'supply-chain-verification', 'release-policy'].sort();
  check(JSON.stringify(Object.keys(jobs).sort()) === JSON.stringify(expectedJobs), 'SERVICE_WORKFLOW_JOB_SET_INVALID');
  for (const [jobId, job] of Object.entries(jobs)) {
    check(job['runs-on'] === 'ubuntu-24.04' && Number.isInteger(job['timeout-minutes']), `SERVICE_WORKFLOW_JOB_INVALID:${jobId}`);
    check(Array.isArray(job.steps) && job.steps.length > 0, `SERVICE_WORKFLOW_STEPS_MISSING:${jobId}`);
    for (const item of job.steps) {
      check(item['continue-on-error'] !== true, `SERVICE_WORKFLOW_CONTINUE_ON_ERROR:${jobId}`);
      if (item.uses) check(Object.values(pins).includes(item.uses), `SERVICE_WORKFLOW_ACTION_PIN_INVALID:${jobId}`);
    }
  }
  const classify = jobs['classify-services'];
  const classifierCheckout = step(classify, 'checkout');
  check(classifierCheckout?.uses === pins.checkout && classifierCheckout.with?.['fetch-depth'] === 0 && classifierCheckout.with?.['persist-credentials'] === false && classifierCheckout.with?.ref === undefined, 'SERVICE_WORKFLOW_CHECKOUT_NOT_EVENT_REVISION');
  check(step(classify, 'classify')?.run === 'node scripts/migration/MonorepoRequiredChecks.mjs --classify', 'SERVICE_WORKFLOW_CLASSIFIER_INVALID');
  check(String(step(classify, 'revision')?.run ?? '').includes('git rev-parse HEAD'), 'SERVICE_WORKFLOW_EXECUTION_SHA_INVALID');
  for (const output of ['services', 'removed_services', 'execution_sha']) check(typeof classify.outputs?.[output] === 'string', 'SERVICE_WORKFLOW_CLASSIFIER_OUTPUTS_INVALID');

  const repository = jobs['repository-security'];
  check(repository.needs?.includes('classify-services'), 'SERVICE_WORKFLOW_REPOSITORY_REVISION_DEPENDENCY_INVALID');
  const repositoryCheckout = step(repository, 'checkout');
  check(repositoryCheckout?.uses === pins.checkout && repositoryCheckout.with?.['fetch-depth'] === 0 && repositoryCheckout.with?.['persist-credentials'] === false && repositoryCheckout.with?.ref === undefined, 'SERVICE_WORKFLOW_REPOSITORY_CHECKOUT_INVALID');
  const repositoryRun = String(step(repository, 'run-hosted')?.run ?? '');
  check(repositoryRun.includes('-RepositoryOnly') && repositoryRun.includes('git') === false, 'SERVICE_WORKFLOW_REPOSITORY_SCAN_INVALID');
  const repositoryFixtures = String(step(repository, 'matrix-fixtures')?.run ?? '');
  check(repositoryFixtures.includes('Test-ServiceMatrixWorkflow.mjs --fixtures')
    && repositoryFixtures.includes('Test-ServiceMatrixWorkflow.mjs --ownership-fixtures')
    && repositoryFixtures.includes('Test-ContainerTechnicalSmokeStatus.ps1')
    && repositoryFixtures.includes('Test-ServiceFailsafeExecution.ps1'), 'SERVICE_WORKFLOW_OWNERSHIP_FIXTURES_MISSING');
  check(repositoryRun.includes('-CommitSha') && repositoryRun.includes('steps.revision.outputs.commit')
    && String(step(repository, 'revision')?.run ?? '').includes('needs.classify-services.outputs.execution_sha'), 'SERVICE_WORKFLOW_REPOSITORY_REVISION_INVALID');
  check(step(repository, 'initialize-summary')?.env?.EXECUTION_SHA === '${{ needs.classify-services.outputs.execution_sha }}'
    && String(step(repository, 'initialize-summary')?.run ?? '').includes('$env:EXECUTION_SHA'), 'SERVICE_WORKFLOW_REPOSITORY_EVIDENCE_SHA_INVALID');
  const repositoryUpload = step(repository, 'upload-evidence');
  check(repositoryUpload?.uses === pins.upload && repositoryUpload.if === 'always()' && repositoryUpload.with?.['if-no-files-found'] === 'error', 'SERVICE_WORKFLOW_REPOSITORY_EVIDENCE_INVALID');

  const matrix = jobs['service-matrix'];
  check(matrix.needs?.includes('classify-services') && matrix.if === "needs.classify-services.outputs.services != '[]'", 'SERVICE_WORKFLOW_MATRIX_SELECTION_INVALID');
  check(matrix.strategy?.['fail-fast'] === false && matrix.strategy?.matrix?.service === '${{ fromJSON(needs.classify-services.outputs.services) }}', 'SERVICE_WORKFLOW_MATRIX_INVALID');
  const matrixCheckout = step(matrix, 'checkout');
  check(matrixCheckout?.uses === pins.checkout && matrixCheckout.with?.['persist-credentials'] === false && matrixCheckout.with?.ref === undefined, 'SERVICE_WORKFLOW_MATRIX_CHECKOUT_INVALID');
  check(String(step(matrix, 'revision')?.run ?? '').includes('git rev-parse HEAD') && String(step(matrix, 'revision')?.run ?? '').includes('outputs.execution_sha'), 'SERVICE_WORKFLOW_MATRIX_REVISION_INVALID');
  const source = String(step(matrix, 'select-source')?.run ?? '');
  check(source.includes('git ls-tree') && source.includes('git log HEAD --diff-filter=A') && source.includes('SERVICE_SOURCE_REMOVED') && source.includes('Generate-Service.mjs'), 'SERVICE_WORKFLOW_SOURCE_PROVENANCE_INVALID');
  check(String(step(matrix, 'maven-verify')?.run ?? '').includes('./mvnw -B verify') && String(step(matrix, 'generated-conformance')?.run ?? '').includes('Test-GeneratedServiceConformance.mjs')
    && step(matrix, 'generated-conformance')?.if === "steps.select-source.outputs.source_kind == 'ephemeral-generated'", 'SERVICE_WORKFLOW_BUILD_INVALID');
  const failsafe = step(matrix, 'failsafe-execution');
  check(String(failsafe?.run ?? '').includes('Assert-ServiceFailsafeExecution.ps1') && failsafe.env?.SERVICE_ID === '${{ matrix.service }}'
    && failsafe.if === "steps.maven-verify.outcome == 'success'"
    && matrix.steps.indexOf(failsafe) > matrix.steps.indexOf(step(matrix, 'maven-verify')), 'SERVICE_WORKFLOW_FAILSAFE_EXECUTION_PROOF_INVALID');
  const hosted = String(step(matrix, 'run-hosted')?.run ?? '');
  check(hosted.includes('-ServiceId $env:SERVICE_ID') && hosted.includes('-CommitSha $env:EXECUTION_SHA') && hosted.includes('-UseExistingVerifiedArtifact'), 'SERVICE_WORKFLOW_ARTIFACT_BINDING_INVALID');
  check(String(step(matrix, 'validate-service-evidence')?.run ?? '').includes('Validate-ServiceSupplyChainEvidence.mjs --service'), 'SERVICE_WORKFLOW_EVIDENCE_VALIDATION_INVALID');
  const serviceUpload = step(matrix, 'upload-service-evidence');
  check(serviceUpload?.uses === pins.upload && serviceUpload.if?.startsWith('always()') && serviceUpload.with?.name === 's002-service-evidence-${{ matrix.service }}' && serviceUpload.with?.['if-no-files-found'] === 'error', 'SERVICE_WORKFLOW_SERVICE_EVIDENCE_UPLOAD_INVALID');
  check(String(step(matrix, 'write-matrix-result')?.run ?? '').includes('ServiceMatrixResults.mjs --service') && step(matrix, 'write-matrix-result')?.env?.SERVICE_RESULT === '${{ job.status }}', 'SERVICE_WORKFLOW_RESULT_WRITER_INVALID');
  const resultUpload = step(matrix, 'upload-matrix-result');
  check(resultUpload?.uses === pins.upload && resultUpload.if === 'always()' && resultUpload.with?.name === 's002-service-result-${{ matrix.service }}' && resultUpload.with?.['if-no-files-found'] === 'error', 'SERVICE_WORKFLOW_RESULT_UPLOAD_INVALID');

  const aggregate = jobs['supply-chain-verification'];
  check(aggregate.name === 'supply-chain-verification' && aggregate.if === 'always()' && JSON.stringify([...aggregate.needs].sort()) === JSON.stringify(['classify-services', 'repository-security', 'service-matrix']), 'SERVICE_WORKFLOW_AGGREGATE_INVALID');
  const aggregateCheckout = step(aggregate, 'checkout');
  check(aggregateCheckout?.with?.ref === '${{ needs.classify-services.outputs.execution_sha }}'
    && aggregateCheckout.with?.['persist-credentials'] === false
    && String(step(aggregate, 'revision')?.run ?? '').includes('git rev-parse HEAD')
    && String(step(aggregate, 'revision')?.run ?? '').includes('$EXPECTED_SHA')
    && step(aggregate, 'revision')?.env?.EXPECTED_SHA === '${{ needs.classify-services.outputs.execution_sha }}', 'SERVICE_WORKFLOW_AGGREGATE_REVISION_INVALID');
  check(String(step(aggregate, 'job-results')?.run ?? '').includes('CLASSIFY_RESULT') && String(step(aggregate, 'job-results')?.run ?? '').includes('REPOSITORY_RESULT'), 'SERVICE_WORKFLOW_AGGREGATE_JOB_RESULTS_INVALID');
  for (const [id, pattern, destination] of [
    ['download-results', 's002-service-result-*', '${{ runner.temp }}/s002-service-results'],
    ['download-service-evidence', 's002-service-evidence-*', '${{ runner.temp }}/s002-service-evidence'],
  ]) {
    const download = step(aggregate, id);
    check(download?.uses === pins.download && download.if === "needs.classify-services.outputs.services != '[]'", `SERVICE_WORKFLOW_DOWNLOAD_PIN_INVALID:${id}`);
    check(download.with?.pattern === pattern && download.with?.path === destination && download.with?.['merge-multiple'] === false && download.with?.['digest-mismatch'] === 'error', `SERVICE_WORKFLOW_DOWNLOAD_ISOLATION_INVALID:${id}`);
  }
  check(String(step(aggregate, 'aggregate')?.run ?? '').includes('Aggregate-ServiceMatrixEvidence.mjs') && String(step(aggregate, 'aggregate')?.run ?? '').includes('repository-policy'), 'SERVICE_WORKFLOW_RESULT_COLLECTION_INVALID');
  check(String(step(aggregate, 'matrix-status')?.run ?? '').includes('MATRIX_RESULT') && String(step(aggregate, 'matrix-status')?.run ?? '').includes('skipped'), 'SERVICE_WORKFLOW_MATRIX_STATUS_INVALID');
  const release = jobs['release-policy'];
  check(release.needs?.includes('supply-chain-verification') && release.if === "needs.supply-chain-verification.result == 'success'", 'SERVICE_WORKFLOW_POLICY_SEPARATION_INVALID');
  check(String(step(release, 'Enforce separate release policy')?.run ?? '').includes("POLICY_STATE\" == BLOCKED"), 'SERVICE_WORKFLOW_RELEASE_POLICY_INVALID');
  return true;
}

export function validateFreshnessMatrixWorkflow(workflow) {
  check(workflow?.name === 'Security freshness', 'FRESHNESS_WORKFLOW_NAME_INVALID');
  check(JSON.stringify(Object.keys(workflow.on ?? {}).sort()) === JSON.stringify(['schedule', 'workflow_dispatch']), 'FRESHNESS_WORKFLOW_TRIGGER_INVALID');
  check(workflow.permissions?.contents === 'read' && Object.keys(workflow.permissions).length === 1, 'FRESHNESS_WORKFLOW_PERMISSIONS_INVALID');
  check(workflow.concurrency?.['cancel-in-progress'] === false, 'FRESHNESS_WORKFLOW_CONCURRENCY_INVALID');
  const jobs = workflow.jobs ?? {};
  const expectedJobs = ['resolve-services', 'repository-security', 'service-matrix', 'security-freshness', 'freshness-release-policy'].sort();
  check(JSON.stringify(Object.keys(jobs).sort()) === JSON.stringify(expectedJobs), 'FRESHNESS_WORKFLOW_JOB_SET_INVALID');
  for (const [jobId, job] of Object.entries(jobs)) {
    check(job['runs-on'] === 'ubuntu-24.04' && Number.isInteger(job['timeout-minutes']) && Array.isArray(job.steps) && job.steps.length > 0, `FRESHNESS_WORKFLOW_JOB_INVALID:${jobId}`);
    for (const item of job.steps) {
      check(item['continue-on-error'] !== true, `FRESHNESS_WORKFLOW_CONTINUE_ON_ERROR:${jobId}`);
      if (item.uses) check(Object.values(pins).includes(item.uses), `FRESHNESS_WORKFLOW_ACTION_PIN_INVALID:${jobId}`);
    }
  }
  const resolve = jobs['resolve-services'];
  for (const stepId of ['checkout', 'list-services', 'revision']) check(step(resolve, stepId), 'FRESHNESS_WORKFLOW_REGISTRY_RESOLUTION_INVALID');
  check(step(resolve, 'checkout').with?.ref === '${{ github.event.repository.default_branch }}' && step(resolve, 'checkout').with?.['fetch-depth'] === 0 && step(resolve, 'checkout').with?.['persist-credentials'] === false, 'FRESHNESS_WORKFLOW_DEFAULT_REF_INVALID');
  check(step(resolve, 'list-services').run === 'node scripts/migration/MonorepoRequiredChecks.mjs --list-services', 'FRESHNESS_WORKFLOW_SERVICE_SELECTOR_INVALID');
  check(String(step(resolve, 'revision').run).includes('git rev-parse HEAD'), 'FRESHNESS_WORKFLOW_EXECUTION_SHA_INVALID');

  const repository = jobs['repository-security'];
  check(repository.needs?.includes('resolve-services'), 'FRESHNESS_WORKFLOW_REPOSITORY_REVISION_DEPENDENCY_INVALID');
  check(step(repository, 'checkout').with?.ref === '${{ github.event.repository.default_branch }}', 'FRESHNESS_WORKFLOW_REPOSITORY_REF_INVALID');
  const repositoryRun = String(step(repository, 'run-hosted')?.run ?? '');
  check(repositoryRun.includes('-WorkflowName security-freshness') && repositoryRun.includes('-RepositoryOnly') && repositoryRun.includes('steps.revision.outputs.commit'), 'FRESHNESS_WORKFLOW_REPOSITORY_SCAN_INVALID');
  check(step(repository, 'initialize-summary')?.env?.EXECUTION_SHA === '${{ needs.resolve-services.outputs.execution_sha }}'
    && String(step(repository, 'initialize-summary')?.run ?? '').includes('$env:EXECUTION_SHA'), 'FRESHNESS_WORKFLOW_REPOSITORY_EVIDENCE_SHA_INVALID');
  const repositoryFixtures = String(step(repository, 'matrix-fixtures')?.run ?? '');
  check(repositoryFixtures.includes('Test-ServiceMatrixWorkflow.mjs --freshness-fixtures')
    && repositoryFixtures.includes('Test-ServiceMatrixWorkflow.mjs --ownership')
    && repositoryFixtures.includes('Test-ContainerTechnicalSmokeStatus.ps1')
    && repositoryFixtures.includes('Test-ServiceFailsafeExecution.ps1'), 'FRESHNESS_WORKFLOW_OWNERSHIP_FIXTURES_MISSING');
  check(String(step(repository, 'revision')?.run ?? '').includes('needs.resolve-services.outputs.execution_sha'), 'FRESHNESS_WORKFLOW_REPOSITORY_REVISION_INVALID');

  const matrix = jobs['service-matrix'];
  check(matrix.needs?.includes('resolve-services') && matrix.strategy?.['fail-fast'] === false
    && matrix.strategy?.matrix?.service === '${{ fromJSON(needs.resolve-services.outputs.services) }}', 'FRESHNESS_WORKFLOW_MATRIX_INVALID');
  check(step(matrix, 'checkout').with?.ref === '${{ github.event.repository.default_branch }}' && step(matrix, 'checkout').with?.['persist-credentials'] === false, 'FRESHNESS_WORKFLOW_MATRIX_REF_INVALID');
  const source = String(step(matrix, 'select-source')?.run ?? '');
  check(source.includes('git ls-tree') && source.includes('git log HEAD --diff-filter=A') && source.includes('SERVICE_SOURCE_REMOVED') && source.includes('Generate-Service.mjs'), 'FRESHNESS_WORKFLOW_SOURCE_PROVENANCE_INVALID');
  check(String(step(matrix, 'maven-verify')?.run ?? '').includes('./mvnw -B verify')
    && step(matrix, 'generated-conformance')?.if === "steps.select-source.outputs.source_kind == 'ephemeral-generated'", 'FRESHNESS_WORKFLOW_MAVEN_INVALID');
  const failsafe = step(matrix, 'failsafe-execution');
  check(String(failsafe?.run ?? '').includes('Assert-ServiceFailsafeExecution.ps1') && failsafe.env?.SERVICE_ID === '${{ matrix.service }}'
    && failsafe.if === "steps.maven-verify.outcome == 'success'"
    && matrix.steps.indexOf(failsafe) > matrix.steps.indexOf(step(matrix, 'maven-verify')), 'FRESHNESS_WORKFLOW_FAILSAFE_EXECUTION_PROOF_INVALID');
  const hosted = String(step(matrix, 'run-hosted')?.run ?? '');
  check(hosted.includes('-WorkflowName security-freshness') && hosted.includes('-ServiceId $env:SERVICE_ID') && hosted.includes('-CommitSha $env:EXECUTION_SHA'), 'FRESHNESS_WORKFLOW_ARTIFACT_IDENTITY_INVALID');
  check(step(matrix, 'upload-matrix-result')?.if === 'always()' && step(matrix, 'upload-service-evidence')?.if?.startsWith('always()'), 'FRESHNESS_WORKFLOW_UPLOAD_CONTRACT_INVALID');

  const aggregate = jobs['security-freshness'];
  check(aggregate.name === 'security-freshness-verification' && aggregate.if === 'always()'
    && JSON.stringify([...aggregate.needs].sort()) === JSON.stringify(['repository-security', 'resolve-services', 'service-matrix']), 'FRESHNESS_WORKFLOW_AGGREGATE_INVALID');
  const aggregateCheckout = step(aggregate, 'checkout');
  check(aggregateCheckout?.with?.ref === '${{ needs.resolve-services.outputs.execution_sha }}'
    && aggregateCheckout.with?.['persist-credentials'] === false
    && String(step(aggregate, 'revision')?.run ?? '').includes('git rev-parse HEAD')
    && String(step(aggregate, 'revision')?.run ?? '').includes('$EXPECTED_SHA')
    && step(aggregate, 'revision')?.env?.EXPECTED_SHA === '${{ needs.resolve-services.outputs.execution_sha }}', 'FRESHNESS_WORKFLOW_AGGREGATE_REVISION_INVALID');
  for (const id of ['download-results', 'download-service-evidence']) {
    const download = step(aggregate, id);
    check(download?.uses === pins.download && download.with?.['merge-multiple'] === false && download.with?.['digest-mismatch'] === 'error', `FRESHNESS_WORKFLOW_DOWNLOAD_INVALID:${id}`);
  }
  check(String(step(aggregate, 'aggregate')?.run ?? '').includes('Aggregate-ServiceMatrixEvidence.mjs')
    && String(step(aggregate, 'matrix-status')?.run ?? '').includes('MATRIX_RESULT'), 'FRESHNESS_WORKFLOW_COLLECTION_INVALID');
  const release = jobs['freshness-release-policy'];
  check(release.needs?.includes('security-freshness') && release.if === "needs.security-freshness.result == 'success'", 'FRESHNESS_WORKFLOW_POLICY_SEPARATION_INVALID');
  return true;
}
