[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Import-Module (Join-Path $PSScriptRoot 'GitleaksScanning.psm1') -Force
$contract = Get-Content -LiteralPath (Join-Path $repoRoot 'security\tooling\gitleaks-scan-contract.json') -Raw | ConvertFrom-Json
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-gitleaks-adapter-' + [Guid]::NewGuid().ToString('N'))
$failures = New-Object System.Collections.Generic.List[string]

function Invoke-TestCase {
    param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][scriptblock]$Body)
    try { & $Body; Write-Output "[PASS] $Name" }
    catch { $script:failures.Add("${Name}: $($_.Exception.Message)"); Write-Output "[FAIL] $Name" }
}

function Assert-EqualArray {
    param([string[]]$Actual, [string[]]$Expected, [string]$Message)
    if ($Actual.Count -ne $Expected.Count) { throw "$Message (different argument count)" }
    for ($index = 0; $index -lt $Actual.Count; $index++) {
        if ($Actual[$index] -cne $Expected[$index]) { throw "$Message (index $index)" }
    }
}

function Assert-ThrowsCode {
    param([Parameter(Mandatory)][scriptblock]$Body, [Parameter(Mandatory)][string]$Code)
    try { & $Body } catch { if ($_.Exception.Message -eq $Code) { return }; throw "Expected '$Code', got '$($_.Exception.Message)'." }
    throw "Expected '$Code', but no failure was raised."
}

try {
    New-Item -ItemType Directory -Path $testRoot | Out-Null
    $inputDirectory = Join-Path $testRoot 'input'
    New-Item -ItemType Directory -Path $inputDirectory | Out-Null
    $outputPath = Join-Path $testRoot 'reports\report.json'
    $configPath = Join-Path $repoRoot 'security\tooling\gitleaks.toml'
    $ignorePath = Join-Path $repoRoot 'security\tooling\gitleaks-empty-ignore.txt'

    Invoke-TestCase -Name 'Directory adapter uses exact production command vector' -Body {
        $actual = @(Get-GitleaksScanArguments -ScanDefinition $contract.scans[0] -RepositoryRoot $repoRoot -InputPath $inputDirectory -OutputPath $outputPath)
        $expected = @('dir', [System.IO.Path]::GetFullPath($inputDirectory), '--config', $configPath, '--gitleaks-ignore-path', $ignorePath, '--ignore-gitleaks-allow', '--redact=100', '--report-format', 'json', '--report-path', [System.IO.Path]::GetFullPath($outputPath), '--exit-code', '3', '--log-level', 'error', '--no-banner', '--no-color', '--timeout', '300')
        Assert-EqualArray -Actual $actual -Expected $expected -Message 'Directory adapter drifted'
    }
    Invoke-TestCase -Name 'Git adapter uses full reachable-history command vector' -Body {
        $actual = @(Get-GitleaksScanArguments -ScanDefinition $contract.scans[1] -RepositoryRoot $repoRoot -InputPath $repoRoot -OutputPath $outputPath)
        $expected = @('git', [System.IO.Path]::GetFullPath($repoRoot), '--log-opts', '--full-history --all', '--config', $configPath, '--gitleaks-ignore-path', $ignorePath, '--ignore-gitleaks-allow', '--redact=100', '--report-format', 'json', '--report-path', [System.IO.Path]::GetFullPath($outputPath), '--exit-code', '3', '--log-level', 'error', '--no-banner', '--no-color', '--timeout', '300')
        Assert-EqualArray -Actual $actual -Expected $expected -Message 'Git adapter drifted'
    }
    Invoke-TestCase -Name 'Unsupported scan definition is rejected' -Body {
        $unsupported = [pscustomobject]@{ id = 'unknown' }
        Assert-ThrowsCode -Code 'GITLEAKS_SCAN_DEFINITION_UNSUPPORTED' -Body { Get-GitleaksScanArguments -ScanDefinition $unsupported -RepositoryRoot $repoRoot -InputPath $inputDirectory -OutputPath $outputPath | Out-Null }
    }
    $fakeScanner = Join-Path $testRoot 'fake-gitleaks.cmd'
    Set-Content -LiteralPath $fakeScanner -Value '@exit /b 0' -Encoding ascii -NoNewline
    Invoke-TestCase -Name 'Scanner exit zero is accepted' -Body {
        $result = Invoke-GitleaksScan -GitleaksExecutable $fakeScanner -ScanDefinition $contract.scans[0] -RepositoryRoot $repoRoot -InputPath $inputDirectory -OutputPath $outputPath
        if ($result.exitCode -ne 0) { throw 'Exit zero was not retained.' }
    }
    Set-Content -LiteralPath $fakeScanner -Value '@exit /b 3' -Encoding ascii -NoNewline
    Invoke-TestCase -Name 'Scanner finding exit code is retained for policy evaluation' -Body {
        $result = Invoke-GitleaksScan -GitleaksExecutable $fakeScanner -ScanDefinition $contract.scans[0] -RepositoryRoot $repoRoot -InputPath $inputDirectory -OutputPath $outputPath
        if ($result.exitCode -ne 3) { throw 'Finding exit code was not retained.' }
    }
    Set-Content -LiteralPath $fakeScanner -Value '@exit /b 7' -Encoding ascii -NoNewline
    Invoke-TestCase -Name 'Unexpected scanner exit code fails closed' -Body {
        Assert-ThrowsCode -Code 'GITLEAKS_SCAN_FAILED' -Body { Invoke-GitleaksScan -GitleaksExecutable $fakeScanner -ScanDefinition $contract.scans[0] -RepositoryRoot $repoRoot -InputPath $inputDirectory -OutputPath $outputPath | Out-Null }
    }
} finally {
    if (Test-Path -LiteralPath $testRoot) { Remove-Item -LiteralPath $testRoot -Recurse -Force }
}

Write-Output "Tests: $($failures.Count + 6)"
Write-Output "Failures: $($failures.Count)"
if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Output "[DETAIL] $_" }
    exit 1
}
Write-Output 'Gitleaks scan adapter tests: PASS'
