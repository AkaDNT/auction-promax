#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$modulePath = Join-Path $PSScriptRoot 'HostedSupplyChain.psm1'
if (-not (Test-Path -LiteralPath $modulePath -PathType Leaf)) {
    throw 'HOSTED_SUPPLY_CHAIN_MODULE_MISSING'
}

Import-Module $modulePath -Force
$commit = '0123456789abcdef0123456789abcdef01234567'
$root = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-hosted-state-' + [guid]::NewGuid().ToString('N'))
try {
    $summary = New-HostedRunSummary -Workflow 'supply-chain' -CommitSha $commit
    if ($summary.executionState -ne 'IMPLEMENTATION_FAILURE' -or $summary.failureCode -ne 'SUPPLY_CHAIN_NOT_STARTED') { throw 'TEST_INITIAL_STATE_FAILED' }
    Write-Host '[PASS] Initial summary is fail-closed'
    $path = Join-Path $root 'run-summary.json'
    Write-HostedRunSummaryAtomic -Path $path -Summary $summary
    $read = Read-HostedRunSummary -Path $path
    if ($read.commit -ne $commit) { throw 'TEST_ATOMIC_WRITE_FAILED' }
    Write-Host '[PASS] Atomic summary write/read accepted'
    $blocked = Complete-HostedExecution -Summary $read -PolicyState 'BLOCKED'
    if (-not (Test-HostedPolicyBlockedFailure -Summary $blocked)) { throw 'TEST_POLICY_BLOCK_FAILED' }
    Write-Host '[PASS] Completed policy block is not implementation failure'
    $freshness = New-HostedRunSummary -Workflow 'security-freshness' -CommitSha $commit
    $freshness = Complete-HostedExecution -Summary $freshness -PolicyState 'BLOCKED'
    if ($freshness.deltaState -ne 'BASELINE_UNAVAILABLE' -or $freshness.policyState -ne 'BLOCKED') { throw 'TEST_FRESHNESS_DELTA_STATE_FAILED' }
    Write-Host '[PASS] Freshness baseline unavailable does not downgrade policy block'
    $invalid = New-HostedRunSummary -Workflow 'supply-chain' -CommitSha $commit
    $invalid.policyState = 'PASS'
    $rejected = $false; try { Write-HostedRunSummaryAtomic -Path $path -Summary $invalid } catch { $rejected = $true }
    if (-not $rejected) { throw 'TEST_INVALID_TRANSITION_ACCEPTED' }
    Write-Host '[PASS] Invalid implementation-failure to policy-PASS transition rejected'
    $notComplete = New-HostedRunSummary -Workflow 'supply-chain' -CommitSha $commit
    $rejected = $false; try { Set-HostedStageResult -Summary $notComplete -Result 'BLOCKED' | Out-Null } catch { $rejected = $true }
    if (-not $rejected) { throw 'TEST_EARLY_POLICY_BLOCK_ACCEPTED' }
    Write-Host '[PASS] Policy block before completed execution rejected'
    $badCommit = $false; try { New-HostedRunSummary -Workflow 'supply-chain' -CommitSha 'short' } catch { $badCommit = $true }
    if (-not $badCommit) { throw 'TEST_BAD_COMMIT_ACCEPTED' }
    Write-Host '[PASS] Invalid commit rejected'
} finally {
    if (Test-Path -LiteralPath $root) { Remove-HostedTemporaryRoot -Root $root }
}
Write-Host 'Hosted supply-chain state-machine tests: PASS'
