#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [ValidateNotNullOrEmpty()][string]$ServiceId = 'identity-profile-service'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$serviceResolverPath = Join-Path $PSScriptRoot 'ServiceArtifact.psm1'
$artifact = $null
if (-not (Test-Path -LiteralPath $serviceResolverPath -PathType Leaf)) { throw 'CONTAINER_PREBUILD_SERVICE_RESOLVER_MISSING' }
Import-Module $serviceResolverPath -Force
try { $artifact = Resolve-ServiceArtifact -ServiceId $ServiceId }
catch { throw 'CONTAINER_PREBUILD_SERVICE_IDENTITY_INVALID' }
$serviceRoot = $artifact.projectPath
$targetRoot = Join-Path $serviceRoot 'target'
$contractPath = Join-Path $repoRoot 'security\tooling\container-image-contract.json'
$contractTestPath = Join-Path $PSScriptRoot 'Test-ContainerImageContract.mjs'
$dockerfilePolicyTestPath = Join-Path $PSScriptRoot 'Test-DockerfilePolicy.mjs'
$sbomTrustTestPath = Join-Path $PSScriptRoot 'Test-CycloneDxSchemaTrust.mjs'
$sbomValidatorPath = Join-Path $PSScriptRoot 'Validate-IdentitySbom.mjs'
$sbomTrustManifestPath = Join-Path $repoRoot 'security\tooling\cyclonedx-schemas.json'
$sbomSchemaRoot = Join-Path $repoRoot 'security\schemas\cyclonedx\1.6'

function Throw-ContainerPrebuildFailure {
    param([Parameter(Mandatory)][string]$Code)
    Write-Output $Code
    throw $Code
}

function Get-ContainerPrebuildSha256 {
    param([Parameter(Mandatory)][string]$Path)
    try {
        $stream = [System.IO.File]::OpenRead($Path)
        $algorithm = [System.Security.Cryptography.SHA256]::Create()
        try { return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
        finally { $algorithm.Dispose(); $stream.Dispose() }
    } catch { Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_JAR_HASH_INVALID' }
}

function Invoke-NodeGate {
    param([Parameter(Mandatory)][string]$Path, [string[]]$Arguments = @(), [Parameter(Mandatory)][string]$FailureCode)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        Throw-ContainerPrebuildFailure -Code $FailureCode
    }
    & node $Path @Arguments
    if ($LASTEXITCODE -ne 0) {
        Throw-ContainerPrebuildFailure -Code $FailureCode
    }
}

function Invoke-MavenVerify {
    $runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
    $wrapperName = if ($runningOnWindows) { 'mvnw.cmd' } else { 'mvnw' }
    $wrapperPath = Join-Path $serviceRoot $wrapperName
    if (-not (Test-Path -LiteralPath $wrapperPath -PathType Leaf)) {
        Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_MAVEN_WRAPPER_MISSING'
    }

    Push-Location $serviceRoot
    try {
        & $wrapperPath -B clean verify
        if ($LASTEXITCODE -ne 0) {
            Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_MAVEN_VERIFY_FAILED'
        }
    } finally {
        Pop-Location
    }
}

function Get-JarManifestAttributes {
    param([Parameter(Mandatory)][string]$JarPath)

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    try {
        $archive = [System.IO.Compression.ZipFile]::OpenRead($JarPath)
    } catch {
        Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_JAR_INVALID'
    }
    try {
        $entry = $archive.GetEntry('META-INF/MANIFEST.MF')
        if ($null -eq $entry) {
            Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_MANIFEST_MISSING'
        }
        $reader = [System.IO.StreamReader]::new($entry.Open())
        try {
            $lines = @($reader.ReadToEnd() -replace "`r`n", "`n" -split "`n")
        } finally {
            $reader.Dispose()
        }

        $attributes = @{}
        $currentName = $null
        foreach ($line in $lines) {
            if ($line.Length -eq 0) { continue }
            if ($line.StartsWith(' ')) {
                if ($null -eq $currentName) { Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_MANIFEST_MALFORMED' }
                $attributes[$currentName] = $attributes[$currentName] + $line.Substring(1)
                continue
            }
            $separator = $line.IndexOf(': ')
            if ($separator -le 0) { Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_MANIFEST_MALFORMED' }
            $currentName = $line.Substring(0, $separator)
            $attributes[$currentName] = $line.Substring($separator + 2)
        }

        foreach ($entryPath in @('BOOT-INF/classes/', 'BOOT-INF/lib/', 'BOOT-INF/layers.idx', 'META-INF/sbom/application.cdx.json')) {
            if ($null -eq $archive.GetEntry($entryPath)) {
                Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_BOOT_LAYOUT_INVALID'
            }
        }
        return $attributes
    } finally {
        $archive.Dispose()
    }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_NODE_MISSING'
}
if (-not (Test-Path -LiteralPath $contractPath -PathType Leaf)) {
    Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_CONTRACT_MISSING'
}

Invoke-NodeGate -Path $contractTestPath -FailureCode 'CONTAINER_PREBUILD_CONTRACT_INVALID'
Invoke-NodeGate -Path $dockerfilePolicyTestPath -FailureCode 'CONTAINER_PREBUILD_DOCKERFILE_POLICY_INVALID'

if (-not $SkipBuild) {
    Invoke-MavenVerify
}

$contract = Get-Content -LiteralPath $contractPath -Raw | ConvertFrom-Json -ErrorAction Stop
$artifact = $null
try { $artifact = Resolve-ServiceArtifact -ServiceId $ServiceId }
catch { Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_SERVICE_IDENTITY_INVALID' }
$jarRelativePath = [string]$artifact.jarApiRelativePath
$jarPath = [string]$artifact.jarPath
$bomPath = [string]$artifact.sbomPath
if (-not (Test-Path -LiteralPath $jarPath -PathType Leaf)) { Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_CANONICAL_JAR_MISSING' }
if (-not (Test-Path -LiteralPath $bomPath -PathType Leaf)) { Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_CANONICAL_SBOM_MISSING' }
$validatedArtifact = $null
try { $validatedArtifact = Resolve-ServiceArtifact -ServiceId $ServiceId -RequireBuiltArtifact }
catch {
    $resolverCode = [string]$_.Exception.Message
    if ($resolverCode -ceq 'SERVICE_JAR_MANIFEST_MISMATCH') {
        Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_CANONICAL_JAR_IDENTITY_INVALID'
    }
    if ($resolverCode -ceq 'SERVICE_POM_IDENTITY_MISMATCH') {
        Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_POM_IDENTITY_INVALID'
    }
    Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_CANONICAL_ARTIFACT_INVALID'
}
$artifact = $validatedArtifact

$jarCandidates = @(Get-ChildItem -LiteralPath $targetRoot -Filter '*.jar' -File -ErrorAction Stop)
if ($jarCandidates.Count -ne 1 -or $jarCandidates[0].FullName -cne $jarPath -or $jarCandidates[0].Length -le 0) {
    Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_CANONICAL_JAR_AMBIGUOUS'
}

Invoke-NodeGate -Path $sbomTrustTestPath -FailureCode 'CONTAINER_PREBUILD_SBOM_TRUST_INVALID'
Invoke-NodeGate -Path $sbomValidatorPath -Arguments @('--bom', $bomPath, '--schema-root', $sbomSchemaRoot, '--trust-manifest', $sbomTrustManifestPath, '--service', $ServiceId) -FailureCode 'CONTAINER_PREBUILD_SBOM_INVALID'

$manifest = Get-JarManifestAttributes -JarPath $jarPath
if ($manifest['Main-Class'] -cne 'org.springframework.boot.loader.launch.JarLauncher') {
    Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_MAIN_CLASS_INVALID'
}
if ($manifest['Start-Class'] -cne ($artifact.packageName + '.' + $artifact.entryClass)) {
    Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_START_CLASS_INVALID'
}
if ($manifest['Spring-Boot-Version'] -ne '4.0.8' -or $manifest['Spring-Boot-Layers-Index'] -ne 'BOOT-INF/layers.idx') {
    Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_BOOT_METADATA_INVALID'
}

$hash = Get-ContainerPrebuildSha256 -Path $jarPath
if ($hash -notmatch '^[a-f0-9]{64}$') {
    Throw-ContainerPrebuildFailure -Code 'CONTAINER_PREBUILD_JAR_HASH_INVALID'
}

[pscustomobject]@{
    artifact = $jarRelativePath
    sha256 = $hash
    byteLength = $jarCandidates[0].Length
    mainClass = $manifest['Main-Class']
    startClass = $manifest['Start-Class']
    sbom = 'validated'
} | ConvertTo-Json -Compress
Write-Output 'Container prebuild artifact: PASS'
