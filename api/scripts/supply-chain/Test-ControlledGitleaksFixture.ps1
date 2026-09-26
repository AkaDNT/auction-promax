[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Import-Module (Join-Path $PSScriptRoot 'GitleaksScanning.psm1') -Force
$contract = Get-Content -LiteralPath (Join-Path $repoRoot 'security\tooling\gitleaks-scan-contract.json') -Raw | ConvertFrom-Json
$fixtureRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-gitleaks-fixture-' + [Guid]::NewGuid().ToString('N'))
$fixtureRepository = Join-Path $fixtureRoot 'repository'

try {
    New-Item -ItemType Directory -Path $fixtureRepository -Force | Out-Null
    & git -C $fixtureRepository init --quiet
    if ($LASTEXITCODE -ne 0) { throw 'GITLEAKS_FIXTURE_GIT_INIT_FAILED' }
    & git -C $fixtureRepository config user.email 'cycle4-fixture@example.invalid'
    & git -C $fixtureRepository config user.name 'Cycle 4 Fixture'
    if ($LASTEXITCODE -ne 0) { throw 'GITLEAKS_FIXTURE_GIT_CONFIG_FAILED' }

    # The complete synthetic value only exists in this temporary repository and
    # must never be written to terminal output or retained evidence.
    $fixtureValue = 'APX_FIXTURE_SECRET_' + ('A' * 24)
    $fixturePath = Join-Path $fixtureRepository 'fixture.txt'
    Set-Content -LiteralPath $fixturePath -Value $fixtureValue -NoNewline
    & git -C $fixtureRepository add fixture.txt
    & git -C $fixtureRepository commit --quiet -m 'controlled gitleaks fixture'
    if ($LASTEXITCODE -ne 0) { throw 'GITLEAKS_FIXTURE_GIT_COMMIT_FAILED' }

    $gitleaksPath = Get-VerifiedGitleaksExecutable
    $dirRawReport = Join-Path $fixtureRoot 'dir.raw.json'
    $gitRawReport = Join-Path $fixtureRoot 'git.raw.json'
    $dirResult = Invoke-GitleaksScan -GitleaksExecutable $gitleaksPath -ScanDefinition $contract.scans[0] -RepositoryRoot $repoRoot -InputPath '.' -OutputPath $dirRawReport -WorkingDirectory $fixtureRepository
    $gitResult = Invoke-GitleaksScan -GitleaksExecutable $gitleaksPath -ScanDefinition $contract.scans[1] -RepositoryRoot $repoRoot -InputPath $fixtureRepository -OutputPath $gitRawReport
    if ($dirResult.exitCode -ne 3 -or $gitResult.exitCode -ne 3) { throw 'GITLEAKS_FIXTURE_EXIT_MAPPING_INVALID' }

    $dirInventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath $dirRawReport -ScanMode dir -RepositoryRoot $repoRoot -SnapshotRoot $fixtureRepository)
    $gitInventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath $gitRawReport -ScanMode git -RepositoryRoot $repoRoot)
    Assert-ExpectedGitleaksFixtureFinding -ScanResult $dirResult -Inventory $dirInventory -ScanMode 'dir' | Out-Null
    Assert-ExpectedGitleaksFixtureFinding -ScanResult $gitResult -Inventory $gitInventory -ScanMode 'git' | Out-Null

    $capturedArtifacts = @($dirRawReport, $gitRawReport)
    foreach ($artifactPath in $capturedArtifacts) {
        $rawContent = Get-Content -LiteralPath $artifactPath -Raw
        if ($rawContent.Contains($fixtureValue)) { throw 'GITLEAKS_FIXTURE_RAW_VALUE_RETAINED' }
    }
    $sanitizedContent = @($dirInventory + $gitInventory | ConvertTo-Json -Depth 10) -join "`n"
    if ($sanitizedContent.Contains($fixtureValue)) { throw 'GITLEAKS_FIXTURE_RAW_VALUE_RETAINED' }

    $fakeScanner = Join-Path $fixtureRoot 'fake-gitleaks.cmd'
    Set-Content -LiteralPath $fakeScanner -Value '@exit /b 0' -Encoding ascii -NoNewline
    $fakeResult = Invoke-GitleaksScan -GitleaksExecutable $fakeScanner -ScanDefinition $contract.scans[0] -RepositoryRoot $repoRoot -InputPath '.' -OutputPath (Join-Path $fixtureRoot 'fake.raw.json') -WorkingDirectory $fixtureRepository
    $fakeScannerRejected = $false
    try { Assert-ExpectedGitleaksFixtureFinding -ScanResult $fakeResult -Inventory @() -ScanMode 'dir' | Out-Null }
    catch { if ($_.Exception.Message -eq 'GITLEAKS_FIXTURE_NOT_DETECTED') { $fakeScannerRejected = $true } else { throw } }
    if (-not $fakeScannerRejected) { throw 'GITLEAKS_FIXTURE_INTEGRITY_ASSERTION_MISSING' }

    Write-Output 'Controlled Gitleaks fixture: PASS (scanModes=dir,git; ruleId=apx-controlled-secret-fixture)'
} finally {
    if (Test-Path -LiteralPath $fixtureRoot) { Remove-Item -LiteralPath $fixtureRoot -Recurse -Force }
}

if (@(Get-ChildItem -Path ([System.IO.Path]::GetTempPath()) -Directory -Filter 'apx-gitleaks-fixture-*').Count -ne 0) {
    throw 'GITLEAKS_FIXTURE_CLEANUP_FAILED'
}
Write-Output 'Controlled Gitleaks fixture cleanup: PASS'
