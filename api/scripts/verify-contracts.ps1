[CmdletBinding()]
param([ValidateSet('Registry', 'Fixture')][string]$Mode = 'Registry')

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$apiRoot = Split-Path -Parent $PSScriptRoot
$contractsRoot = Join-Path $apiRoot 'contracts'
$toolsRoot = Join-Path $apiRoot '.tools'
$oasdiffVersion = '1.28.0'
$checksumsSha256 = '98d24bf37e5f8d6935765aa3bdd2402c05ca291af236e7825aa4a8bc4f0be589'
$releaseBaseUrl = "https://github.com/oasdiff/oasdiff/releases/download/v$oasdiffVersion"

function Get-Sha256 { param([string]$Path) (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
function Assert-File { param([string]$Path, [string]$Description) if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "$Description is missing: $Path" } }
function Assert-Command { param([string]$Name) if ($null -eq (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Required command was not found on PATH: $Name" } }
function Get-NpmCommand { if ([System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)) { 'npm.cmd' } else { 'npm' } }

function Remove-OasdiffRuntime {
    param([string]$CleanupPath)
    $fullPath = [System.IO.Path]::GetFullPath($CleanupPath)
    $prefix = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), 'auction-promax-oasdiff-')
    if (-not $fullPath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) { throw "Refusing to remove unexpected temporary path: $fullPath" }
    if (Test-Path -LiteralPath $fullPath) { Remove-Item -LiteralPath $fullPath -Recurse -Force }
}

function Get-OasdiffRuntime {
    $runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
    $runningOnLinux = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Linux)
    if ([System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture -ne [System.Runtime.InteropServices.Architecture]::X64) { throw 'Pinned oasdiff supports only x64 runners.' }
    if ($runningOnWindows) { $assetName = "oasdiff_${oasdiffVersion}_windows_amd64.tar.gz"; $executableName = 'oasdiff.exe'; $tarCommand = 'tar.exe' }
    elseif ($runningOnLinux) { $assetName = "oasdiff_${oasdiffVersion}_linux_amd64.tar.gz"; $executableName = 'oasdiff'; $tarCommand = 'tar' }
    else { throw 'Pinned oasdiff supports only Windows x64 and Linux x64.' }
    Assert-Command -Name $tarCommand

    $cacheDirectory = Join-Path $toolsRoot "oasdiff/v$oasdiffVersion"
    $manifestPath = Join-Path $cacheDirectory 'checksums.txt'
    $archivePath = Join-Path $cacheDirectory $assetName
    New-Item -ItemType Directory -Force -Path $cacheDirectory | Out-Null
    Invoke-WebRequest -Uri "$releaseBaseUrl/checksums.txt" -OutFile $manifestPath -UseBasicParsing
    if ((Get-Sha256 $manifestPath) -ne $checksumsSha256) { throw 'oasdiff checksums.txt SHA-256 mismatch. Do not execute release assets.' }
    $pattern = "^([a-fA-F0-9]{64})\s+\*?($([regex]::Escape($assetName)))$"
    $line = Select-String -LiteralPath $manifestPath -Pattern $pattern | Select-Object -First 1
    if ($null -eq $line) { throw "Pinned oasdiff asset missing from verified manifest: $assetName" }
    $expectedArchiveSha256 = [regex]::Match($line.Line, $pattern).Groups[1].Value.ToLowerInvariant()
    if (-not ((Test-Path -LiteralPath $archivePath -PathType Leaf) -and (Get-Sha256 $archivePath) -eq $expectedArchiveSha256)) {
        if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }
        Invoke-WebRequest -Uri "$releaseBaseUrl/$assetName" -OutFile $archivePath -UseBasicParsing
        if ((Get-Sha256 $archivePath) -ne $expectedArchiveSha256) { throw 'oasdiff archive SHA-256 mismatch. Do not extract or execute it.' }
    }
    $cleanupPath = Join-Path ([System.IO.Path]::GetTempPath()) ("auction-promax-oasdiff-" + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force -Path $cleanupPath | Out-Null
    try {
        & $tarCommand -xzf $archivePath -C $cleanupPath
        if ($LASTEXITCODE -ne 0) { throw "Failed to extract verified oasdiff archive; tar exited with $LASTEXITCODE." }
        $executable = Get-ChildItem -LiteralPath $cleanupPath -Recurse -Filter $executableName -File | Select-Object -First 1
        if ($null -eq $executable) { throw "Verified oasdiff archive did not contain $executableName." }
        [pscustomobject]@{ ExecutablePath = $executable.FullName; CleanupPath = $cleanupPath }
    } catch { Remove-OasdiffRuntime $cleanupPath; throw }
}

function Invoke-CompatibilityCheck {
    param([string]$OasdiffPath, [string]$Baseline, [string]$Candidate, [bool]$ExpectBreaking, [string]$Label)
    Assert-File $Baseline "$Label baseline"; Assert-File $Candidate "$Label candidate"
    & $OasdiffPath diff $Baseline $Candidate | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "${Label}: oasdiff preflight failed with exit code $LASTEXITCODE." }
    & $OasdiffPath breaking --fail-on ERR $Baseline $Candidate
    $exitCode = $LASTEXITCODE
    if ($ExpectBreaking -and $exitCode -eq 1) { Write-Host "${Label}: PASS"; return }
    if ($ExpectBreaking) { throw "${Label}: expected breaking detection exit 1; got $exitCode." }
    if ($exitCode -eq 0) { Write-Host "${Label}: PASS"; return }
    throw "${Label}: compatibility gate failed with exit code $exitCode."
}

$openApiCurrent = Join-Path $contractsRoot 'openapi/identity-profile-service/v1/identity-profile-samples.openapi.yaml'
$openApiBaseline = Join-Path $contractsRoot 'compatibility/baseline/openapi/identity-profile-service/v1/identity-profile-samples.openapi.yaml'
$npmCommand = Get-NpmCommand

if ($Mode -eq 'Registry') {
    Assert-Command $npmCommand
    & $npmCommand --prefix $contractsRoot run lint:openapi; if ($LASTEXITCODE -ne 0) { throw "OpenAPI lint failed with exit code $LASTEXITCODE." }
    & $npmCommand --prefix $contractsRoot run validate:schemas; if ($LASTEXITCODE -ne 0) { throw "JSON Schema validation failed with exit code $LASTEXITCODE." }
    & $npmCommand --prefix $contractsRoot run test:governance; if ($LASTEXITCODE -ne 0) { throw "Contract governance validation failed with exit code $LASTEXITCODE." }
    $runtime = Get-OasdiffRuntime
    try { Invoke-CompatibilityCheck $runtime.ExecutablePath $openApiBaseline $openApiCurrent $false 'Registry N/N-1 compatibility'; Write-Host 'Contract registry verification: PASS' }
    finally { Remove-OasdiffRuntime $runtime.CleanupPath }
}

if ($Mode -eq 'Fixture') {
    $fixtureRoot = Join-Path $contractsRoot 'fixtures/prohibited-breaking-change/openapi'
    $runtime = Get-OasdiffRuntime
    try { Invoke-CompatibilityCheck $runtime.ExecutablePath (Join-Path $fixtureRoot 'identity-profile-samples.v1.baseline.openapi.yaml') (Join-Path $fixtureRoot 'identity-profile-samples.v1.candidate-removes-status.openapi.yaml') $true 'Prohibited breaking-change fixture'; Write-Host 'Breaking-change fixture verification: PASS' }
    finally { Remove-OasdiffRuntime $runtime.CleanupPath }
}

# `oasdiff breaking` returns 1 when it correctly detects the deliberately
# prohibited fixture.  The fixture branch handles that result as success, so
# make the script's process result explicit instead of leaking `$LASTEXITCODE`
# to GitHub Actions.
exit 0
