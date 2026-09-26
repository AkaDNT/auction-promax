#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$UseExistingVerifiedArtifact
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$contractPath = Join-Path $repoRoot 'security\tooling\container-image-contract.json'
$prebuildScriptPath = Join-Path $PSScriptRoot 'Invoke-ContainerPrebuildArtifact.ps1'
$baseResolutionScriptPath = Join-Path $PSScriptRoot 'Test-ContainerBaseImageResolution.ps1'

function Throw-ContainerBuildFailure {
    param([Parameter(Mandatory)][string]$Code)
    throw $Code
}

function Get-ContainerBuildSha256 {
    param([Parameter(Mandatory)][string]$Path)
    try {
        $stream = [System.IO.File]::OpenRead($Path)
        $algorithm = [System.Security.Cryptography.SHA256]::Create()
        try { return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
        finally { $algorithm.Dispose(); $stream.Dispose() }
    } catch { Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_JAR_HASH_INVALID' }
}

function Read-FirstJsonValue {
    param([Parameter(Mandatory)][string]$Json, [Parameter(Mandatory)][string]$FailureCode)

    try {
        $parsed = ConvertFrom-Json -InputObject $Json -ErrorAction Stop
    } catch {
        Throw-ContainerBuildFailure -Code $FailureCode
    }
    if ($parsed -is [System.Array]) {
        if ($parsed.Count -ne 1) { Throw-ContainerBuildFailure -Code $FailureCode }
        return $parsed[0]
    }
    return $parsed
}

function Get-LocalImageInspection {
    param([Parameter(Mandatory)][string]$Reference)

    $output = @(& docker image inspect $Reference 2>&1)
    if ($LASTEXITCODE -ne 0) {
        Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_LOCAL_IMAGE_INSPECTION_FAILED'
    }
    return Read-FirstJsonValue -Json ($output -join [Environment]::NewLine) -FailureCode 'CONTAINER_BUILD_LOCAL_IMAGE_INSPECTION_MALFORMED'
}

foreach ($required in @($contractPath, $prebuildScriptPath, $baseResolutionScriptPath)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
        Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_PREREQUISITE_MISSING'
    }
}

# This is intentionally the default, non-skippable precondition: Maven builds
# the executable JAR outside Docker and validates its SBOM before Docker sees it.
if ($UseExistingVerifiedArtifact) {
    # Hosted orchestration has already performed Maven verification. Re-run all
    # artifact/SBOM/JAR identity checks, but never trust a receipt or skip them.
    & $prebuildScriptPath -SkipBuild
} else {
    & $prebuildScriptPath
}
if ($LASTEXITCODE -ne 0) {
    Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_PREBUILD_FAILED'
}

# Confirm the reviewed tag still resolves to the committed index/platform digest
# and pull only that immutable linux/amd64 platform manifest.
& $baseResolutionScriptPath
if ($LASTEXITCODE -ne 0) {
    Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_BASE_IMAGE_UNVERIFIED'
}

$contract = Get-Content -LiteralPath $contractPath -Raw | ConvertFrom-Json -ErrorAction Stop
$serviceRoot = Join-Path $repoRoot ([string]$contract.build.contextRelativePath).Replace('/', '\')
$dockerfilePath = Join-Path $repoRoot ([string]$contract.build.dockerfileRelativePath).Replace('/', '\')
$jarPath = Join-Path $repoRoot ([string]$contract.build.canonicalJarRelativePath).Replace('/', '\')
$imageReference = [string]$contract.image.localReference

foreach ($required in @($serviceRoot, $dockerfilePath, $jarPath)) {
    if (-not (Test-Path -LiteralPath $required)) {
        Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_INPUT_MISSING'
    }
}
if (-not (Test-Path -LiteralPath $jarPath -PathType Leaf)) {
    Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_JAR_MISSING'
}

$jarHashBefore = Get-ContainerBuildSha256 -Path $jarPath
if ($jarHashBefore -notmatch '^[a-f0-9]{64}$') {
    Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_JAR_HASH_INVALID'
}

Push-Location $serviceRoot
try {
    & docker buildx build `
        --platform $contract.image.platform `
        --pull `
        --load `
        --tag $imageReference `
        --file $dockerfilePath `
        .
    if ($LASTEXITCODE -ne 0) {
        Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_FAILED'
    }
} finally {
    Pop-Location
}

$jarHashAfter = Get-ContainerBuildSha256 -Path $jarPath
if ($jarHashAfter -cne $jarHashBefore) {
    Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_JAR_MUTATED_DURING_BUILD'
}

$image = Get-LocalImageInspection -Reference $imageReference
if ([string]::IsNullOrWhiteSpace([string]$image.Id) -or $image.Os -cne 'linux' -or $image.Architecture -cne 'amd64') {
    Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_LOCAL_IMAGE_IDENTITY_INVALID'
}
if (@($image.RepoTags) -notcontains $imageReference) {
    Throw-ContainerBuildFailure -Code 'CONTAINER_BUILD_LOCAL_TAG_DRIFT'
}

[pscustomobject]@{
    image = $imageReference
    imageId = [string]$image.Id
    platform = "$($image.Os)/$($image.Architecture)"
    jarSha256 = $jarHashBefore
} | ConvertTo-Json -Compress
Write-Output 'Container image build: PASS'
