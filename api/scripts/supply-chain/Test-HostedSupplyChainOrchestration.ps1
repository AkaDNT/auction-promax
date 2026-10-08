#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$orchestrator = Join-Path $PSScriptRoot 'Invoke-HostedSupplyChain.ps1'
$releasePolicy = Join-Path $PSScriptRoot 'Invoke-HostedReleasePolicy.ps1'
Import-Module (Join-Path $PSScriptRoot 'HostedSupplyChain.psm1') -Force
if (-not (Test-Path -LiteralPath $orchestrator -PathType Leaf) -or -not (Test-Path -LiteralPath $releasePolicy -PathType Leaf)) {
    throw 'HOSTED_ORCHESTRATOR_MISSING'
}
$orchestratorSource = Get-Content -LiteralPath $orchestrator -Raw
if ($orchestratorSource -notmatch '\[object\[\]\]\$DefaultArguments' -or $orchestratorSource -notmatch 'return & \$DefaultAction @DefaultArguments' -or $orchestratorSource -notmatch 'arguments\s*=\s*@\(\$temporaryRoot\)' -or $orchestratorSource -notmatch 'param\(\[string\]\$BootstrapTemporaryRoot\)') {
    throw 'HOSTED_BOOTSTRAP_STAGE_ARGUMENT_BINDING_NOT_EXPLICIT'
}
if ($orchestratorSource -notmatch '\$wrapperPhase = ''initialize''' -or $orchestratorSource -notmatch '\$wrapperPhase = ''read-status''' -or $orchestratorSource -notmatch 'Tool bootstrap wrapper diagnostic: phase=\{0\}; exceptionType=\{1\}') {
    throw 'HOSTED_BOOTSTRAP_PHASE_DIAGNOSTIC_MISSING'
}
if ($orchestratorSource -notmatch '\$stage\.name -eq ''prebuild''' -or $orchestratorSource -notmatch 'Container prebuild diagnostic: failureCode=\{0\}' -or $orchestratorSource -notmatch '\\b\(CONTAINER_PREBUILD_\[A-Z_\]\+\)\\b') {
    throw 'HOSTED_PREBUILD_SANITIZED_DIAGNOSTIC_MISSING'
}
if ($orchestratorSource -notmatch '\$stage\.name -eq ''dependency''' -or $orchestratorSource -notmatch 'Dependency scan diagnostic: failureCode=\{0\}' -or $orchestratorSource -notmatch 'Dependency scan diagnostic: phase=\{0\}; failureCode=\{1\}' -or $orchestratorSource -notmatch '\\b\(TRIVY_\[A-Z0-9_\]\+\|VULNERABILITY_\[A-Z0-9_\]\+\)\\b' -or $orchestratorSource -notmatch 'Dependency scan diagnostic: failureCode=DEPENDENCY_SCAN_UNCLASSIFIED; exceptionType=\{0\}') {
    throw 'HOSTED_DEPENDENCY_SCAN_SANITIZED_DIAGNOSTIC_MISSING'
}
if ($orchestratorSource -notmatch '\$PSNativeCommandUseErrorActionPreference = \$false' -or $orchestratorSource -notmatch '\$PSNativeCommandUseErrorActionPreference = \$previousNativeErrorPreference' -or $orchestratorSource -notmatch '\$exitCode = \$LASTEXITCODE') {
    throw 'HOSTED_CHILD_NATIVE_EXIT_CAPTURE_NOT_EXPLICIT'
}
if ($orchestratorSource -notmatch 'Container prebuild diagnostic: phase=stage-dispatch; exceptionType=\{0\}') {
    throw 'HOSTED_PREBUILD_FALLBACK_DIAGNOSTIC_MISSING'
}
if ($orchestratorSource -notmatch '\$stage\.name -eq ''base''' -or $orchestratorSource -notmatch 'Container base trust diagnostic: failureCode=\{0\}' -or $orchestratorSource -notmatch '\\b\(CONTAINER_BASE_IMAGE_\[A-Z_\]\+\)\\b') {
    throw 'HOSTED_BASE_TRUST_SANITIZED_DIAGNOSTIC_MISSING'
}
if ($orchestratorSource -notmatch 'Container base resolution diagnostic: phase=\{0\}; exceptionType=\{1\}') {
    throw 'HOSTED_BASE_RESOLUTION_PHASE_DIAGNOSTIC_MISSING'
}
if ($orchestratorSource -notmatch '\$stage\.name -eq ''smoke''' -or $orchestratorSource -notmatch 'Container smoke diagnostic: failureCode=\{0\}' -or $orchestratorSource -notmatch '\\b\(CONTAINER_SMOKE_\[A-Z_\]\+\)\\b') {
    throw 'HOSTED_SMOKE_SANITIZED_DIAGNOSTIC_MISSING'
}
if ($orchestratorSource -notmatch 'Container smoke diagnostic: phase=\{0\}; failureCode=\{1\}; exceptionType=\{2\}') {
    throw 'HOSTED_SMOKE_PHASE_DIAGNOSTIC_MISSING'
}
if ($orchestratorSource -notmatch 'container-smoke-' -or $orchestratorSource -notmatch 'Read-HostedSmokeStatus' -or $orchestratorSource -notmatch 'CONTAINER_SMOKE_WRAPPER_STARTUP_FAILED' -or $orchestratorSource -notmatch '\$smokeStatus\.state -eq ''FAILED''' -or $orchestratorSource -notmatch '\$smokeStatus\.state -eq ''STARTED''' -or $orchestratorSource -notmatch 'CONTAINER_SMOKE_WRAPPER_STATUS_INVALID') {
    throw 'HOSTED_SMOKE_STATUS_TRANSPORT_MISSING'
}
if ($orchestratorSource -notmatch 'container-scan-' -or $orchestratorSource -notmatch 'Read-HostedContainerScanStatus' -or $orchestratorSource -notmatch 'CONTAINER_SCAN_WRAPPER_STARTUP_FAILED' -or $orchestratorSource -notmatch '\$containerScanStatus\.state -eq ''BLOCKED''' -or $orchestratorSource -notmatch 'CONTAINER_SCAN_WRAPPER_STATUS_INVALID') {
    throw 'HOSTED_CONTAINER_SCAN_STATUS_TRANSPORT_MISSING'
}
$boundRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-hosted-bootstrap-binding-' + [guid]::NewGuid().ToString('N'))
try {
    [void][System.IO.Directory]::CreateDirectory($boundRoot)
    $action = { param([string]$BootstrapTemporaryRoot) if ([string]::IsNullOrWhiteSpace($BootstrapTemporaryRoot) -or -not (Test-Path -LiteralPath $BootstrapTemporaryRoot -PathType Container)) { throw 'TEST_BOOTSTRAP_ROOT_NOT_BOUND' }; return 'PASS' }
    if ((& $action @($boundRoot)) -ne 'PASS') { throw 'TEST_BOOTSTRAP_ARGUMENT_BINDING_FAILED' }
} finally {
    if (Test-Path -LiteralPath $boundRoot) { Remove-Item -LiteralPath $boundRoot -Recurse -Force }
}

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$commit = @(& git -C $repositoryRoot rev-parse HEAD 2>$null)
if ($LASTEXITCODE -ne 0 -or $commit.Count -ne 1 -or [string]$commit[0] -notmatch '^[a-f0-9]{40}$') { throw 'TEST_CHECKED_OUT_REVISION_UNAVAILABLE' }
$commit = [string]$commit[0]
$root = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-hosted-orchestrator-' + [guid]::NewGuid().ToString('N'))
$serviceEvidence = Join-Path $PSScriptRoot '..\..\services\identity-profile-service\target\s001-t07-evidence'
$vulnerabilityInventory = Join-Path $serviceEvidence 'vulnerability-inventory.json'
$gitleaksInventory = Join-Path $serviceEvidence 'gitleaks-inventory.json'
$containerInventory = Join-Path $serviceEvidence 'container-vulnerability-inventory.json'
$inventoryStates = @(
    foreach ($path in @($vulnerabilityInventory, $gitleaksInventory, $containerInventory)) {
        $existed = Test-Path -LiteralPath $path -PathType Leaf
        [pscustomobject]@{
            Path = $path
            Existed = $existed
            Bytes = if ($existed) { [System.IO.File]::ReadAllBytes($path) } else { $null }
        }
    }
)
$emptyInventory = '[]'
$fixtureFinding = '[{"scanner":"trivy","findingId":"CVE-2026-0001","source":"ghsa","targetType":"image","target":"auction-promax/identity-profile-service:s001-t07","package/component":"example:component","affectedVersion":"1.0.0","fixedVersion":null,"severity":"HIGH","severitySource":"ghsa","status":"observed","dispositionId":null}]'
function New-Adapters([hashtable]$Overrides = @{}) {
    $items = @{}
    foreach ($stage in @('contract','tools','prebuild','dependency','gitleaks','base','image','smoke','container')) { $items[$stage] = { 'PASS' } }
    foreach ($key in $Overrides.Keys) { $items[$key] = $Overrides[$key] }
    return $items
}
try {
    [void][System.IO.Directory]::CreateDirectory($root)
    $bootstrapStatusPath = Join-Path $root 'bootstrap-status.json'
    [System.IO.File]::WriteAllText($bootstrapStatusPath, '{"schemaVersion":1,"state":"FAILED","failureCode":"TOOL_BOOTSTRAP_TUF_REFRESH_FAILED"}', [System.Text.UTF8Encoding]::new($false))
    $bootstrapStatus = Read-HostedToolBootstrapStatus -Path $bootstrapStatusPath
    if ($bootstrapStatus.state -ne 'FAILED' -or $bootstrapStatus.failureCode -ne 'TOOL_BOOTSTRAP_TUF_REFRESH_FAILED') { throw 'TEST_BOOTSTRAP_STATUS_VALID_REJECTED' }
    Write-Host '[PASS] Sanitized bootstrap status is accepted'

    $failureSummary = New-HostedRunSummary -Workflow 'supply-chain' -CommitSha $commit
    $failureSummary = Set-HostedStageResult -Summary $failureSummary -Result 'IMPLEMENTATION_FAILURE' -FailureCode 'SMOKE_FAILED'
    $failureLine = Format-HostedRunResult -Summary $failureSummary
    if ($failureLine -ne 'Hosted supply-chain result: executionState=IMPLEMENTATION_FAILURE; policyState=NOT_EVALUATED; reviewState=NOT_REQUIRED; failureCode=SMOKE_FAILED') { throw 'TEST_FAILURE_RESULT_OUTPUT_INVALID' }
    Write-Host '[PASS] Failure result line contains only classified state'

    [void][System.IO.Directory]::CreateDirectory($serviceEvidence)
    # These are the exact empty-array formats emitted by the production
    # vulnerability and Gitleaks inventory writers for zero findings.
    [System.IO.File]::WriteAllText($vulnerabilityInventory, $emptyInventory, [System.Text.UTF8Encoding]::new($false))
    [System.IO.File]::WriteAllText($gitleaksInventory, $emptyInventory, [System.Text.UTF8Encoding]::new($false))
    [System.IO.File]::WriteAllText($containerInventory, $fixtureFinding, [System.Text.UTF8Encoding]::new($false))
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters) -NoExit
    if ($result.executionState -ne 'PASS' -or $result.policyState -ne 'PASS') { throw 'TEST_PASS_SCENARIO_FAILED' }
    Write-Host '[PASS] All adapter stages pass as execution PASS'
    $gitleaksEvidence = Get-Content -LiteralPath (Join-Path $root 'gitleaks-inventory.json') -Raw
    if ($gitleaksEvidence -notmatch '"findings":\[\]') { throw 'TEST_EMPTY_GITLEAKS_EVIDENCE_NOT_ARRAY' }
    Write-Host '[PASS] Empty sanitized inventories retain JSON-array shape'

    Remove-Item -LiteralPath $root -Recurse -Force
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ container = { 'POLICY_BLOCKED' }; base = { 'REVIEW_REQUIRED' } }) -NoExit
    if ($result.executionState -ne 'PASS' -or $result.policyState -ne 'BLOCKED' -or $result.reviewState -ne 'REVIEW_REQUIRED') { throw 'TEST_COMBINED_POLICY_REVIEW_FAILED' }
    Write-Host '[PASS] Policy block and mutable-review states remain independent'

    Remove-Item -LiteralPath $root -Recurse -Force
    $prebuildWarning = @()
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ prebuild = { throw 'unclassified prebuild child failure' } }) -NoExit -WarningVariable +prebuildWarning
    if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.failureCode -ne 'SBOM_BUILD_FAILED' -or (@($prebuildWarning) -join "`n") -notmatch 'Container prebuild diagnostic: phase=stage-dispatch; exceptionType=RuntimeException') { throw 'TEST_PREBUILD_FALLBACK_DIAGNOSTIC_LOST' }
    Write-Host '[PASS] Unclassified prebuild failure exposes only a sanitized phase and exception type'

    Remove-Item -LiteralPath $root -Recurse -Force
    $prebuildWarning = @()
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ prebuild = { throw 'CONTAINER_PREBUILD_SBOM_INVALID' } }) -NoExit -WarningVariable +prebuildWarning
    if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.failureCode -ne 'SBOM_BUILD_FAILED' -or (@($prebuildWarning) -join "`n") -notmatch 'Container prebuild diagnostic: failureCode=CONTAINER_PREBUILD_SBOM_INVALID') { throw 'TEST_PREBUILD_CLASSIFIED_DIAGNOSTIC_LOST' }
    Write-Host '[PASS] Classified prebuild failures retain a sanitized specific diagnostic'

    Remove-Item -LiteralPath $root -Recurse -Force
    $repositoryOnlyAdapters = New-Adapters @{
        prebuild = { throw 'REPOSITORY_ONLY_RAN_PREBUILD' }
        base = { throw 'REPOSITORY_ONLY_RAN_BASE_IMAGE_STAGE' }
        image = { throw 'REPOSITORY_ONLY_RAN_IMAGE_STAGE' }
        smoke = { throw 'REPOSITORY_ONLY_RAN_SMOKE_STAGE' }
        container = { throw 'REPOSITORY_ONLY_RAN_CONTAINER_STAGE' }
    }
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -RepositoryOnly -Adapters $repositoryOnlyAdapters -NoExit
    if ($result.executionState -ne 'PASS' -or $result.policyState -ne 'PASS') { throw 'TEST_REPOSITORY_ONLY_SCENARIO_FAILED' }
    $repositoryOnlyContainer = Get-Content -LiteralPath (Join-Path $root 'container-vulnerability-inventory.json') -Raw | ConvertFrom-Json
    if (@($repositoryOnlyContainer.findings).Count -ne 0) { throw 'TEST_REPOSITORY_ONLY_CONTAINER_INVENTORY_NOT_EMPTY' }
    foreach ($evidenceName in @('run-summary.json','vulnerability-inventory.json','gitleaks-inventory.json','container-vulnerability-inventory.json','image-identity.json','smoke-summary.json','policy-summary.json')) {
        $repositoryEvidence = Get-Content -LiteralPath (Join-Path $root $evidenceName) -Raw | ConvertFrom-Json
        if ($repositoryEvidence.commit -cne $commit) { throw 'TEST_REPOSITORY_ONLY_EVIDENCE_COMMIT_MISMATCH' }
    }
    Write-Host '[PASS] Repository-only execution keeps shared scans without invoking service build/image/smoke stages'

    Remove-Item -LiteralPath $root -Recurse -Force
    $dependencyWarning = @()
    $rawDependencyError = 'private /runner/path detail TRIVY_DB_REFRESH_FAILED opaque child output'
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -RepositoryOnly -Adapters (New-Adapters @{ dependency = { throw $rawDependencyError } }) -NoExit -WarningVariable +dependencyWarning
    $warningText = @($dependencyWarning) -join "`n"
    if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.policyState -ne 'NOT_EVALUATED' -or $result.failureCode -ne 'DEPENDENCY_SCAN_FAILED' -or $warningText -notmatch 'Dependency scan diagnostic: failureCode=TRIVY_DB_REFRESH_FAILED' -or $warningText.Contains('/runner/path') -or $warningText.Contains('opaque child output')) { throw 'TEST_DEPENDENCY_SCAN_DIAGNOSTIC_NOT_SANITIZED' }
    Write-Host '[PASS] Dependency scan failure exposes only a fixed classified code and remains implementation failure'

    Remove-Item -LiteralPath $root -Recurse -Force
    $dependencyWarning = @()
    $rawDependencyError = 'private /runner/path detail TRIVY_DB_REFRESH_FAILED|phase=verify-db'
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -RepositoryOnly -Adapters (New-Adapters @{ dependency = { throw $rawDependencyError } }) -NoExit -WarningVariable +dependencyWarning
    $warningText = @($dependencyWarning) -join "`n"
    if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.policyState -ne 'NOT_EVALUATED' -or $result.failureCode -ne 'DEPENDENCY_SCAN_FAILED' -or $warningText -notmatch 'Dependency scan diagnostic: phase=verify-db; failureCode=TRIVY_DB_REFRESH_FAILED' -or $warningText.Contains('/runner/path') -or $warningText.Contains('private')) { throw 'TEST_DEPENDENCY_SCAN_PHASE_DIAGNOSTIC_NOT_SANITIZED' }
    Write-Host '[PASS] Dependency scan diagnostic retains only the fixed phase and failure code'

    Remove-Item -LiteralPath $root -Recurse -Force
    $dependencyWarning = @()
    $spoofedPolicyError = 'runtime failure VULNERABILITY_SCAN_UNCLASSIFIED|phase=verify-db'
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -RepositoryOnly -Adapters (New-Adapters @{ dependency = { throw $spoofedPolicyError } }) -NoExit -WarningVariable +dependencyWarning
    $warningText = @($dependencyWarning) -join "`n"
    if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.policyState -ne 'NOT_EVALUATED' -or $result.failureCode -ne 'DEPENDENCY_SCAN_FAILED' -or $warningText -notmatch 'Dependency scan diagnostic: phase=verify-db; failureCode=VULNERABILITY_SCAN_UNCLASSIFIED' -or $warningText -match 'POLICY_BLOCKED|HIGH_OR_CRITICAL') { throw 'TEST_SPOOFED_POLICY_MARKER_BECAME_BLOCKED' }
    Write-Host '[PASS] Spoofed policy marker remains an implementation failure'

    Remove-Item -LiteralPath $root -Recurse -Force
    $dependencyWarning = @()
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -RepositoryOnly -Adapters (New-Adapters @{ dependency = { throw 'private unclassified scanner details' } }) -NoExit -WarningVariable +dependencyWarning
    $warningText = @($dependencyWarning) -join "`n"
    if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.policyState -ne 'NOT_EVALUATED' -or $result.failureCode -ne 'DEPENDENCY_SCAN_FAILED' -or $warningText -notmatch 'Dependency scan diagnostic: failureCode=DEPENDENCY_SCAN_UNCLASSIFIED; exceptionType=RuntimeException' -or $warningText.Contains('private unclassified scanner details')) { throw 'TEST_DEPENDENCY_SCAN_FALLBACK_NOT_SANITIZED' }
    Write-Host '[PASS] Unclassified dependency failure remains generic and emits only its exception class'

    Remove-Item -LiteralPath $root -Recurse -Force
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ container = { throw 'CONTAINER_SCAN_POLICY_BLOCKED' } }) -NoExit
    $containerEvidence = Get-Content -LiteralPath (Join-Path $root 'container-vulnerability-inventory.json') -Raw | ConvertFrom-Json
    if ($result.executionState -ne 'PASS' -or $result.policyState -ne 'BLOCKED' -or @($containerEvidence.findings).Count -ne 1 -or $null -eq $containerEvidence.findings[0].scanner) { throw 'TEST_POLICY_BLOCKED_CONTAINER_EVIDENCE_MISSING' }
    Write-Host '[PASS] Policy-blocked container scan retains flat sanitized evidence'

    Remove-Item -LiteralPath $root -Recurse -Force
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ smoke = { throw 'SMOKE_FAILED' } }) -NoExit
    if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.failureCode -ne 'SMOKE_FAILED') { throw 'TEST_IMPLEMENTATION_FAILURE_FAILED' }
    Write-Host '[PASS] Unknown/pipeline failures remain implementation failures'

    Remove-Item -LiteralPath $root -Recurse -Force
    $smokeWarning = @()
    $childErrorRecord = "Exception: /repo/scripts/supply-chain/Invoke-ContainerTechnicalSmoke.ps1:123`nLine |`n 123 | throw 'CONTAINER_SMOKE_START_FAILED'`n     | CONTAINER_SMOKE_START_FAILED"
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ smoke = { throw $childErrorRecord } }) -NoExit -WarningVariable +smokeWarning
    if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.failureCode -ne 'SMOKE_FAILED' -or (@($smokeWarning) -join "`n") -notmatch 'Container smoke diagnostic: failureCode=CONTAINER_SMOKE_START_FAILED') { throw 'TEST_SMOKE_ERROR_RECORD_DIAGNOSTIC_LOST' }
    Write-Host '[PASS] ErrorRecord-formatted smoke failure remains diagnosable'

    Remove-Item -LiteralPath $root -Recurse -Force
    $smokeWarning = @()
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ smoke = { throw 'child process failed before smoke payload' } }) -NoExit -WarningVariable +smokeWarning
    if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.failureCode -ne 'SMOKE_FAILED' -or (@($smokeWarning) -join "`n") -notmatch 'Container smoke diagnostic: failureCode=CONTAINER_SMOKE_WRAPPER_UNCLASSIFIED') { throw 'TEST_SMOKE_WRAPPER_FALLBACK_DIAGNOSTIC_LOST' }
    Write-Host '[PASS] Unclassified smoke wrapper failure remains diagnosable'

    Remove-Item -LiteralPath $root -Recurse -Force
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ tools = { throw 'TOOL_BOOTSTRAP_PROVENANCE_FAILED' } }) -NoExit
    if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.failureCode -ne 'TOOL_BOOTSTRAP_PROVENANCE_FAILED') { throw 'TEST_TOOL_BOOTSTRAP_DETAIL_LOST' }
    Write-Host '[PASS] Tool bootstrap failure classification remains sanitized and specific'

    Remove-Item -LiteralPath $root -Recurse -Force
    $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ tools = { throw 'TOOL_BOOTSTRAP_TUF_REFRESH_FAILED' } }) -NoExit
    if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.failureCode -ne 'TOOL_BOOTSTRAP_TUF_REFRESH_FAILED') { throw 'TEST_TUF_REFRESH_DETAIL_LOST' }
    Write-Host '[PASS] Trusted-root refresh failures remain separately classified'

    foreach ($failureCode in @('TOOL_BOOTSTRAP_MODULE_LOAD_FAILED', 'TOOL_BOOTSTRAP_PLATFORM_RESOLUTION_FAILED', 'TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED', 'TOOL_BOOTSTRAP_WRAPPER_FAILED', 'TOOL_BOOTSTRAP_SCRIPT_RESOLUTION_FAILED', 'TOOL_BOOTSTRAP_SHELL_RESOLUTION_FAILED', 'TOOL_BOOTSTRAP_CHILD_LAUNCH_FAILED')) {
        Remove-Item -LiteralPath $root -Recurse -Force
        $result = & $orchestrator -WorkflowName 'supply-chain' -CommitSha $commit -EvidenceRoot $root -Adapters (New-Adapters @{ tools = { throw $failureCode } }) -NoExit
        if ($result.executionState -ne 'IMPLEMENTATION_FAILURE' -or $result.failureCode -ne $failureCode) { throw "TEST_BOOTSTRAP_BOUNDARY_DETAIL_LOST:$failureCode" }
    }
    Write-Host '[PASS] Bootstrap boundary failures remain separately classified'

    if (-not (Test-Path -LiteralPath (Join-Path $root 'run-summary.json') -PathType Leaf)) { throw 'TEST_EVIDENCE_MISSING' }
    Write-Host '[PASS] Sanitized hosted evidence is written for failure paths'
} finally {
    if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
    foreach ($state in $inventoryStates) {
        if ($state.Existed) { [System.IO.File]::WriteAllBytes($state.Path, $state.Bytes) }
        elseif (Test-Path -LiteralPath $state.Path -PathType Leaf) { Remove-Item -LiteralPath $state.Path -Force }
    }
}
Write-Host 'Hosted supply-chain orchestration tests: PASS'
