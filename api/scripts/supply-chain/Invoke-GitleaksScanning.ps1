#Requires -Version 5.1
[CmdletBinding()]
param([string]$OutputPath)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$contractPath = Join-Path $repoRoot 'security\tooling\gitleaks-scan-contract.json'
$allowlistPath = Join-Path $repoRoot 'security\gitleaks-allowlist.json'
# Keep this unique temporary leaf deliberately short. The repository contains
# deep Java package paths and Windows can otherwise reject the final snapshot
# destination before Gitleaks receives it. New-WorkingTreeSnapshot refuses an
# existing path, so a random collision fails closed rather than sharing data.
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('a' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$evidenceRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot 'services\identity-profile-service\target\s001-t07-evidence'))

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $evidenceRoot 'gitleaks-inventory.json'
} elseif (-not [System.IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath = Join-Path $repoRoot $OutputPath
}
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)
$evidencePrefix = $evidenceRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
if (-not $OutputPath.StartsWith($evidencePrefix, [System.StringComparison]::OrdinalIgnoreCase) -or [System.IO.Path]::GetExtension($OutputPath) -ne '.json') {
    throw 'GITLEAKS_INVENTORY_OUTPUT_UNSAFE'
}

Import-Module (Join-Path $PSScriptRoot 'GitleaksScanning.psm1') -Force

function Invoke-RequiredNodeValidation {
    param([Parameter(Mandatory)][string]$ScriptName, [Parameter(Mandatory)][string]$FailureCode)
    $scriptPath = Join-Path $PSScriptRoot $ScriptName
    if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) { throw $FailureCode }
    $null = @(& node $scriptPath 2>&1)
    if ($LASTEXITCODE -ne 0) { throw $FailureCode }
}

function Confirm-FullReachableHistory {
    $shallow = @(& git -C $repoRoot rev-parse --is-shallow-repository 2>$null)
    if ($LASTEXITCODE -ne 0 -or $shallow.Count -ne 1 -or "$($shallow[0])" -ne 'false') { throw 'GITLEAKS_HISTORY_SHALLOW_OR_UNAVAILABLE' }
    $commitCount = @(& git -C $repoRoot rev-list --all --count 2>$null)
    if ($LASTEXITCODE -ne 0 -or $commitCount.Count -ne 1 -or "$($commitCount[0])" -notmatch '^[1-9][0-9]*$') { throw 'GITLEAKS_HISTORY_UNAVAILABLE' }
}

function Assert-GitleaksExitReportConsistency {
    param([Parameter(Mandatory)]$ScanResult, [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Inventory)
    if ($ScanResult.exitCode -eq 0 -and $Inventory.Count -ne 0) { throw 'GITLEAKS_EXIT_REPORT_MISMATCH' }
    if ($ScanResult.exitCode -eq 3 -and $Inventory.Count -eq 0) { throw 'GITLEAKS_EXIT_REPORT_MISMATCH' }
}

function Write-SanitizedInventory {
    param([Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Inventory)
    $outputDirectory = Split-Path -Parent $OutputPath
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    $stagingPath = Join-Path $outputDirectory ('.gitleaks-inventory-' + [guid]::NewGuid().ToString('N') + '.tmp')
    try {
        ConvertTo-Json -InputObject @($Inventory) -Depth 10 | Set-Content -LiteralPath $stagingPath -Encoding utf8 -NoNewline
        Move-Item -LiteralPath $stagingPath -Destination $OutputPath -Force
    } finally {
        if (Test-Path -LiteralPath $stagingPath) { Remove-Item -LiteralPath $stagingPath -Force -ErrorAction SilentlyContinue }
    }
}

try {
    Invoke-RequiredNodeValidation -ScriptName 'Test-GitleaksScanContract.mjs' -FailureCode 'GITLEAKS_SCAN_CONTRACT_INVALID'
    Invoke-RequiredNodeValidation -ScriptName 'Test-GitleaksConfiguration.mjs' -FailureCode 'GITLEAKS_CONFIGURATION_INVALID'
    Invoke-RequiredNodeValidation -ScriptName 'Test-GitleaksAllowlistSchema.mjs' -FailureCode 'GITLEAKS_ALLOWLIST_INVALID'
    Confirm-FullReachableHistory

    $contract = Get-Content -LiteralPath $contractPath -Raw | ConvertFrom-Json
    $allowlistRegistry = Get-Content -LiteralPath $allowlistPath -Raw | ConvertFrom-Json
    $gitleaksPath = Get-VerifiedGitleaksExecutable
    New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
    $snapshotRoot = Join-Path $temporaryRoot 'working-tree-snapshot'
    $snapshot = New-WorkingTreeSnapshot -RepositoryRoot $repoRoot -TemporaryRoot $snapshotRoot
    $dirResult = Invoke-GitleaksScan -GitleaksExecutable $gitleaksPath -ScanDefinition $contract.scans[0] -RepositoryRoot $repoRoot -InputPath '.' -OutputPath (Join-Path $temporaryRoot 'dir.raw.json') -WorkingDirectory $snapshot.snapshotRoot
    $gitResult = Invoke-GitleaksScan -GitleaksExecutable $gitleaksPath -ScanDefinition $contract.scans[1] -RepositoryRoot $repoRoot -InputPath $repoRoot -OutputPath (Join-Path $temporaryRoot 'git.raw.json')

    $dirInventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath $dirResult.reportPath -ScanMode dir -RepositoryRoot $repoRoot -SnapshotRoot $snapshot.snapshotRoot)
    $gitInventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath $gitResult.reportPath -ScanMode git -RepositoryRoot $repoRoot)
    Assert-GitleaksExitReportConsistency -ScanResult $dirResult -Inventory $dirInventory
    Assert-GitleaksExitReportConsistency -ScanResult $gitResult -Inventory $gitInventory
    $observed = @($dirInventory + $gitInventory | Sort-Object scanMode, ruleId, repositoryRelativePath, scannerFingerprint, commitId)

    try {
        $decisions = @(Test-GitleaksPolicy -Inventory $observed -Allowlist @($allowlistRegistry.entries) -NowUtc ([datetime]::UtcNow))
    } catch {
        Write-SanitizedInventory -Inventory $observed
        Write-Output ('Gitleaks policy: BLOCKED (dirFindings={0}, gitFindings={1}, sanitizedInventoryWritten=true)' -f $dirInventory.Count, $gitInventory.Count)
        throw
    }
    Write-SanitizedInventory -Inventory $decisions
    $falsePositiveCount = @($decisions | Where-Object { $_.status -eq 'false-positive' }).Count
    Write-Output ('Gitleaks scan: PASS (dirFindings={0}, gitFindings={1}, falsePositives={2})' -f $dirInventory.Count, $gitInventory.Count, $falsePositiveCount)
} finally {
    if (Test-Path -LiteralPath $temporaryRoot) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force }
    if (Test-Path -LiteralPath $temporaryRoot) { throw 'GITLEAKS_TEMPORARY_CLEANUP_FAILED' }
}
