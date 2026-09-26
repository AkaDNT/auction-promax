#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$serviceRoot = Join-Path $repoRoot 'services\identity-profile-service'
$bomPath = Join-Path $serviceRoot 'target\bom.json'
$schemaRoot = Join-Path $repoRoot 'security\schemas\cyclonedx\1.6'
$trustManifestPath = Join-Path $repoRoot 'security\tooling\cyclonedx-schemas.json'
$trustTestPath = Join-Path $PSScriptRoot 'Test-CycloneDxSchemaTrust.mjs'
$fixtureTestPath = Join-Path $PSScriptRoot 'Test-IdentitySbomFixtures.mjs'
$validatorPath = Join-Path $PSScriptRoot 'Validate-IdentitySbom.mjs'

function Assert-RequiredFile {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$Name)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "$Name is missing."
    }
}

function Invoke-NodeGate {
    param(
        [Parameter(Mandatory)][string]$ScriptPath,
        [string[]]$Arguments = @(),
        [Parameter(Mandatory)][string]$Name
    )
    & node $ScriptPath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE."
    }
}

function Invoke-IdentityPackage {
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        Push-Location $serviceRoot
        try {
            if ($env:OS -eq 'Windows_NT') {
                $null = @(& cmd.exe /d /c 'mvnw.cmd -B clean package -DskipTests' 2>&1)
            } else {
                $null = @(& ./mvnw -B clean package -DskipTests 2>&1)
            }
            $exitCode = $LASTEXITCODE
        } finally {
            Pop-Location
        }
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($exitCode -ne 0) {
        throw "Maven Wrapper package build failed with exit code $exitCode."
    }
    if (-not (Test-Path -LiteralPath $bomPath -PathType Leaf)) {
        throw 'Maven Wrapper package build did not produce the canonical SBOM.'
    }
}

function Invoke-IdentitySbomValidator {
    param([string]$ReferenceBomPath)
    $arguments = @(
        '--bom', $bomPath,
        '--schema-root', $schemaRoot,
        '--trust-manifest', $trustManifestPath
    )
    if ($ReferenceBomPath) {
        $arguments += @('--reference-bom', $ReferenceBomPath)
    }
    Invoke-NodeGate -ScriptPath $validatorPath -Arguments $arguments -Name 'Identity SBOM validator'
}

function Get-Sha256Hex {
    param([Parameter(Mandatory)][string]$Path)

    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($stream)
        return -join ($hash | ForEach-Object { $_.ToString('x2') })
    } finally {
        $stream.Dispose()
    }
}

function New-SafeTemporaryDirectory {
    $directory = Join-Path ([System.IO.Path]::GetTempPath()) ('auction-promax-sbom-cycle2-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
    return $directory
}

function Remove-SafeTemporaryDirectory {
    param([Parameter(Mandatory)][string]$Path)
    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $tempPath = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if (-not $fullPath.StartsWith($tempPath, [System.StringComparison]::OrdinalIgnoreCase) -or
        (Split-Path -Leaf $fullPath) -notmatch '^auction-promax-sbom-cycle2-[a-f0-9]{32}$') {
        throw 'Refusing to clean a path outside the Cycle 2 temporary directory convention.'
    }
    if (Test-Path -LiteralPath $fullPath) {
        Remove-Item -LiteralPath $fullPath -Recurse -Force -ErrorAction SilentlyContinue
    }
}

foreach ($required in @(
    @{ Path = $trustTestPath; Name = 'CycloneDX schema trust test' },
    @{ Path = $fixtureTestPath; Name = 'Identity SBOM fixture test' },
    @{ Path = $validatorPath; Name = 'Identity SBOM validator' },
    @{ Path = $trustManifestPath; Name = 'CycloneDX schema trust manifest' }
)) {
    Assert-RequiredFile -Path $required.Path -Name $required.Name
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js is required for Cycle 2 SBOM validation.'
}

Invoke-NodeGate -ScriptPath $trustTestPath -Name 'CycloneDX schema trust test'

if ($SkipBuild) {
    Assert-RequiredFile -Path $bomPath -Name 'Canonical SBOM for -SkipBuild'
    Invoke-IdentitySbomValidator
    Invoke-NodeGate -ScriptPath $fixtureTestPath -Name 'Identity SBOM fixture test'
    Write-Output 'Identity SBOM existing-artifact validation: PASS (no clean-build reproducibility claim)'
    exit 0
}

$temporaryRoot = New-SafeTemporaryDirectory
try {
    Invoke-IdentityPackage
    Invoke-IdentitySbomValidator
    Invoke-NodeGate -ScriptPath $fixtureTestPath -Name 'Identity SBOM fixture test'

    $buildOneBomPath = Join-Path $temporaryRoot 'build-1.json'
    Copy-Item -LiteralPath $bomPath -Destination $buildOneBomPath
    if ((Get-Sha256Hex -Path $bomPath) -ne (Get-Sha256Hex -Path $buildOneBomPath)) {
        throw 'Build-1 SBOM snapshot integrity verification failed.'
    }

    Invoke-IdentityPackage
    Invoke-IdentitySbomValidator -ReferenceBomPath $buildOneBomPath
    Write-Output 'Identity SBOM clean-build reproducibility: PASS'
} finally {
    Remove-SafeTemporaryDirectory -Path $temporaryRoot
}
