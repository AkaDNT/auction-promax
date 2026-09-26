#Requires -Version 5.1
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$fixturePath = Join-Path $repoRoot 'security\fixtures\vulnerable-sbom\bom.json'
$expectationPath = Join-Path $repoRoot 'security\fixtures\vulnerable-sbom\fixture-expectation.json'
$cachePath = Join-Path $repoRoot '.tools\supply-chain\trivy-cache'
$metadataPath = Join-Path $cachePath 'db\metadata.json'
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('auction-promax-trivy-fixture-' + [guid]::NewGuid().ToString('N'))

Import-Module (Join-Path $PSScriptRoot 'VulnerabilityScanning.psm1') -Force

try {
    foreach ($path in @($fixturePath, $expectationPath)) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            throw 'TRIVY_FIXTURE_INPUT_MISSING'
        }
    }
    $expectation = Get-Content -LiteralPath $expectationPath -Raw | ConvertFrom-Json
    if ($expectation.scanner -ne 'trivy' -or $expectation.schemaVersion -ne 1) {
        throw 'TRIVY_FIXTURE_EXPECTATION_INVALID'
    }

    Test-TrivyDatabaseFreshness -MetadataPath $metadataPath -NowUtc ([datetime]::UtcNow) -MaxAgeHours 24 -FutureClockSkewSeconds 300 | Out-Null
    New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null
    $reportPath = Join-Path $temporaryRoot 'trivy-fixture-report.json'
    $scanDefinition = [pscustomobject]@{
        command = 'sbom'
        input = 'security/fixtures/vulnerable-sbom/bom.json'
        targetType = 'sbom'
        expectedEcosystem = 'npm'
        arguments = @('--scanners', 'vuln', '--format', 'json', '--quiet', '--exit-code', '0', '--skip-db-update')
    }

    Push-Location $repoRoot
    try {
        $trivyPath = Get-VerifiedTrivyExecutable
        Invoke-TrivyScan -TrivyExecutable $trivyPath -ScanDefinition $scanDefinition -CacheDirectory $cachePath -OutputPath $reportPath | Out-Null
    } finally {
        Pop-Location
    }
    $match = Assert-ExpectedTrivyFixtureFinding -ReportPath $reportPath -ExpectedFindingId $expectation.findingId -ExpectedPackage $expectation.package -ExpectedAffectedVersion $expectation.affectedVersion -ExpectedSource $expectation.source -ExpectedSeverity $expectation.severity -ExpectedFixedVersion $expectation.fixedVersion
    Write-Output ('Controlled Trivy fixture: PASS (findingId={0}, package={1}, affectedVersion={2}, severity={3})' -f $match.findingId, $match.package, $match.affectedVersion, $match.severity)
} finally {
    if (Test-Path -LiteralPath $temporaryRoot) {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
