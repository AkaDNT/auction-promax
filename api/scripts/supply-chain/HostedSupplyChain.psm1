#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:AllowedFailureCodes = @(
    'SUPPLY_CHAIN_NOT_STARTED', 'CHECKOUT_FAILED', 'CHECKOUT_REVISION_UNAVAILABLE', 'CHECKOUT_REVISION_MISMATCH', 'CONTRACT_VALIDATION_FAILED', 'TOOL_BOOTSTRAP_FAILED',
    'SERVICE_SOURCE_REMOVED', 'SERVICE_GENERATION_MISSING', 'SERVICE_SOURCE_PROVENANCE_UNAVAILABLE',
    'SBOM_BUILD_FAILED', 'SBOM_VALIDATION_FAILED', 'DEPENDENCY_SCAN_FAILED', 'SECRET_SCAN_FAILED',
    'BASE_TRUST_FAILED', 'IMAGE_BUILD_FAILED', 'SMOKE_FAILED', 'CONTAINER_SCAN_FAILED',
    'SCANNER_OUTPUT_INVALID', 'POLICY_EVALUATION_FAILED', 'EVIDENCE_SANITIZATION_FAILED',
    'EVIDENCE_VALIDATION_FAILED', 'EVIDENCE_UPLOAD_FAILED', 'CLEANUP_FAILED',
    'TOOL_BOOTSTRAP_COSIGN_FAILED', 'TOOL_BOOTSTRAP_TRIVY_FAILED',
    'TOOL_BOOTSTRAP_PROVENANCE_FAILED', 'TOOL_BOOTSTRAP_TUF_REFRESH_FAILED', 'TOOL_BOOTSTRAP_GITLEAKS_FAILED',
    'TOOL_BOOTSTRAP_MODULE_LOAD_FAILED', 'TOOL_BOOTSTRAP_PLATFORM_RESOLUTION_FAILED', 'TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED', 'TOOL_BOOTSTRAP_WRAPPER_FAILED',
    'TOOL_BOOTSTRAP_SCRIPT_RESOLUTION_FAILED', 'TOOL_BOOTSTRAP_SHELL_RESOLUTION_FAILED', 'TOOL_BOOTSTRAP_CHILD_LAUNCH_FAILED', 'NONE'
)

function Assert-HostedCommit {
    param([Parameter(Mandatory)][string]$CommitSha)
    if ($CommitSha -notmatch '^[a-f0-9]{40}$') { throw 'HOSTED_SUMMARY_COMMIT_INVALID' }
}
function Assert-HostedSummary {
    param([Parameter(Mandatory)]$Summary)
    $names = @('schemaVersion','workflow','commit','executionState','policyState','reviewState','deltaState','failureCode')
    $actual = @($Summary.PSObject.Properties.Name)
    if (@($actual | Where-Object { $_ -notin $names }).Count -ne 0 -or @($names | Where-Object { $_ -notin $actual }).Count -ne 0) { throw 'HOSTED_SUMMARY_SHAPE_INVALID' }
    if ($Summary.schemaVersion -ne 1 -or $Summary.workflow -notin @('supply-chain','security-freshness')) { throw 'HOSTED_SUMMARY_INVALID' }
    Assert-HostedCommit -CommitSha ([string]$Summary.commit)
    if ($Summary.executionState -notin @('IMPLEMENTATION_FAILURE','PASS') -or $Summary.policyState -notin @('NOT_EVALUATED','PASS','BLOCKED') -or $Summary.reviewState -notin @('NOT_REQUIRED','REVIEW_REQUIRED') -or $Summary.deltaState -notin @('NOT_APPLICABLE','UNCHANGED','NEW','REMEDIATED','BASELINE_UNAVAILABLE') -or $Summary.failureCode -notin $script:AllowedFailureCodes) { throw 'HOSTED_SUMMARY_INVALID' }
    if ($Summary.executionState -eq 'IMPLEMENTATION_FAILURE' -and $Summary.policyState -ne 'NOT_EVALUATED') { throw 'HOSTED_SUMMARY_TRANSITION_INVALID' }
    if ($Summary.executionState -eq 'PASS' -and $Summary.failureCode -ne 'NONE') { throw 'HOSTED_SUMMARY_TRANSITION_INVALID' }
}
function New-HostedRunSummary {
    param([Parameter(Mandatory)][ValidateSet('supply-chain','security-freshness')][string]$Workflow, [Parameter(Mandatory)][string]$CommitSha)
    Assert-HostedCommit -CommitSha $CommitSha
    return [pscustomobject][ordered]@{ schemaVersion=1; workflow=$Workflow; commit=$CommitSha; executionState='IMPLEMENTATION_FAILURE'; policyState='NOT_EVALUATED'; reviewState='NOT_REQUIRED'; deltaState='NOT_APPLICABLE'; failureCode='SUPPLY_CHAIN_NOT_STARTED' }
}
function Read-HostedRunSummary {
    param([Parameter(Mandatory)][string]$Path)
    try { $summary = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop } catch { throw 'HOSTED_SUMMARY_READ_INVALID' }
    Assert-HostedSummary -Summary $summary; return $summary
}
function Write-HostedRunSummaryAtomic {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)]$Summary)
    Assert-HostedSummary -Summary $Summary
    $parent = Split-Path -Parent $Path; if ([string]::IsNullOrWhiteSpace($parent)) { throw 'HOSTED_SUMMARY_PATH_INVALID' }
    [void][System.IO.Directory]::CreateDirectory($parent)
    $temporary = Join-Path $parent ('.' + [guid]::NewGuid().ToString('N') + '.tmp')
    try { [System.IO.File]::WriteAllText($temporary, ($Summary | ConvertTo-Json -Depth 5 -Compress), [System.Text.UTF8Encoding]::new($false)); Move-Item -LiteralPath $temporary -Destination $Path -Force } finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force } }
}
function Set-HostedStageResult {
    param([Parameter(Mandatory)]$Summary, [Parameter(Mandatory)][ValidateSet('PASS','BLOCKED','IMPLEMENTATION_FAILURE','REVIEW_REQUIRED')][string]$Result, [string]$FailureCode = 'NONE')
    Assert-HostedSummary -Summary $Summary
    if ($Result -eq 'IMPLEMENTATION_FAILURE') { if ($FailureCode -notin $script:AllowedFailureCodes -or $FailureCode -eq 'NONE') { throw 'HOSTED_SUMMARY_FAILURE_CODE_INVALID' }; $Summary.executionState='IMPLEMENTATION_FAILURE'; $Summary.policyState='NOT_EVALUATED'; $Summary.failureCode=$FailureCode }
    elseif ($Result -eq 'REVIEW_REQUIRED') { $Summary.reviewState='REVIEW_REQUIRED' }
    elseif ($Result -eq 'BLOCKED') { if ($Summary.executionState -ne 'PASS') { throw 'HOSTED_SUMMARY_TRANSITION_INVALID' }; $Summary.policyState='BLOCKED' }
    else { $Summary.executionState='PASS'; $Summary.failureCode='NONE'; if ($Summary.policyState -eq 'NOT_EVALUATED') { $Summary.policyState='PASS' } }
    Assert-HostedSummary -Summary $Summary; return $Summary
}
function Complete-HostedExecution {
    param([Parameter(Mandatory)]$Summary, [ValidateSet('PASS','BLOCKED')][string]$PolicyState = 'PASS')
    $Summary.executionState='PASS'; $Summary.policyState=$PolicyState; $Summary.failureCode='NONE'
    # Freshness has no independently approved comparison baseline in Cycle 6.
    # It must say so explicitly; unchanged findings are never a policy bypass.
    if ($Summary.workflow -eq 'security-freshness' -and $Summary.deltaState -eq 'NOT_APPLICABLE') { $Summary.deltaState='BASELINE_UNAVAILABLE' }
    Assert-HostedSummary -Summary $Summary; return $Summary
}
function Format-HostedRunResult {
    param([Parameter(Mandatory)]$Summary)
    Assert-HostedSummary -Summary $Summary
    return ('Hosted supply-chain result: executionState={0}; policyState={1}; reviewState={2}; failureCode={3}' -f $Summary.executionState, $Summary.policyState, $Summary.reviewState, $Summary.failureCode)
}
function Get-HostedChildPowerShellExecutable {
    $runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
    $commandName = if ($runningOnWindows -and $PSVersionTable.PSEdition -ne 'Core') { 'powershell.exe' } elseif ($runningOnWindows) { 'pwsh.exe' } else { 'pwsh' }
    $command = Get-Command $commandName -ErrorAction Stop
    return $command.Source
}
function Read-HostedToolBootstrapStatus {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw 'TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED' }
    try {
        $status = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -ErrorAction Stop
        $expected = @('schemaVersion', 'state', 'failureCode')
        $actual = @($status.PSObject.Properties.Name)
        if ($actual.Count -ne $expected.Count -or @($actual | Where-Object { $_ -notin $expected }).Count -ne 0) { throw 'invalid' }
        if ($status.schemaVersion -ne 1 -or $status.state -notin @('PASS', 'FAILED')) { throw 'invalid' }
        if ($status.state -eq 'PASS' -and $status.failureCode -ne 'NONE') { throw 'invalid' }
        if ($status.state -eq 'FAILED' -and $status.failureCode -notmatch '^TOOL_BOOTSTRAP_[A-Z_]+_FAILED$') { throw 'invalid' }
        if ($status.state -eq 'FAILED' -and $status.failureCode -notin $script:AllowedFailureCodes) { throw 'invalid' }
        return $status
    } catch {
        if ($_.Exception.Message -match '^TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED$') { throw }
        throw 'TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED'
    }
}
function Read-HostedSmokeStatus {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw 'CONTAINER_SMOKE_WRAPPER_STARTUP_FAILED' }
    try {
        $status = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -ErrorAction Stop
        $actual = @($status.PSObject.Properties.Name)
        if ($status.schemaVersion -ne 1 -or $status.state -notin @('STARTED', 'FAILED', 'PASS') -or [string]$status.phase -notmatch '^[a-z-]+$') { throw 'invalid' }
        $expected = if ($status.state -eq 'FAILED') { @('schemaVersion', 'state', 'phase', 'failureCode', 'exceptionType') } else { @('schemaVersion', 'state', 'phase') }
        if ($actual.Count -ne $expected.Count -or @($actual | Where-Object { $_ -notin $expected }).Count -ne 0 -or @($expected | Where-Object { $_ -notin $actual }).Count -ne 0) { throw 'invalid' }
        if ($status.state -eq 'PASS' -and [string]$status.phase -cne 'complete') { throw 'invalid' }
        if ($status.state -eq 'FAILED' -and ([string]$status.failureCode -notmatch '^CONTAINER_SMOKE_[A-Z_]+$' -or [string]$status.exceptionType -notmatch '^[A-Za-z0-9_.]+$')) { throw 'invalid' }
        return $status
    } catch {
        if ($_.Exception.Message -match '^CONTAINER_SMOKE_WRAPPER_STARTUP_FAILED$') { throw }
        throw 'CONTAINER_SMOKE_WRAPPER_STATUS_INVALID'
    }
}
function Read-HostedContainerScanStatus {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw 'CONTAINER_SCAN_WRAPPER_STARTUP_FAILED' }
    try {
        $status = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -ErrorAction Stop
        $actual = @($status.PSObject.Properties.Name)
        if ($status.schemaVersion -ne 1 -or $status.state -notin @('STARTED', 'FAILED', 'BLOCKED', 'PASS') -or [string]$status.phase -notmatch '^[a-z-]+$') { throw 'invalid' }
        $expected = switch ($status.state) {
            'FAILED' { @('schemaVersion', 'state', 'phase', 'failureCode', 'exceptionType') }
            'BLOCKED' { @('schemaVersion', 'state', 'phase', 'failureCode') }
            default { @('schemaVersion', 'state', 'phase') }
        }
        if ($actual.Count -ne $expected.Count -or @($actual | Where-Object { $_ -notin $expected }).Count -ne 0 -or @($expected | Where-Object { $_ -notin $actual }).Count -ne 0) { throw 'invalid' }
        if ($status.state -eq 'PASS' -and [string]$status.phase -cne 'complete') { throw 'invalid' }
        if ($status.state -eq 'BLOCKED' -and ([string]$status.phase -cne 'evaluate-policy' -or [string]$status.failureCode -cne 'CONTAINER_SCAN_POLICY_BLOCKED')) { throw 'invalid' }
        if ($status.state -eq 'FAILED' -and ([string]$status.failureCode -notmatch '^CONTAINER_SCAN_[A-Z_]+$' -or [string]$status.exceptionType -notmatch '^[A-Za-z0-9_.]+$')) { throw 'invalid' }
        return $status
    } catch {
        if ($_.Exception.Message -match '^CONTAINER_SCAN_WRAPPER_STARTUP_FAILED$') { throw }
        throw 'CONTAINER_SCAN_WRAPPER_STATUS_INVALID'
    }
}
function Test-HostedPolicyBlockedFailure { param([Parameter(Mandatory)]$Summary); Assert-HostedSummary -Summary $Summary; return ($Summary.executionState -eq 'PASS' -and $Summary.policyState -eq 'BLOCKED') }
function Remove-HostedTemporaryRoot { param([Parameter(Mandatory)][string]$Root); if (Test-Path -LiteralPath $Root) { Remove-Item -LiteralPath $Root -Recurse -Force } }

Export-ModuleMember -Function 'New-HostedRunSummary','Read-HostedRunSummary','Write-HostedRunSummaryAtomic','Set-HostedStageResult','Complete-HostedExecution','Format-HostedRunResult','Get-HostedChildPowerShellExecutable','Read-HostedToolBootstrapStatus','Read-HostedSmokeStatus','Read-HostedContainerScanStatus','Test-HostedPolicyBlockedFailure','Remove-HostedTemporaryRoot'
