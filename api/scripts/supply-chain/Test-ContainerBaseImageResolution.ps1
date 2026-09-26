#Requires -Version 5.1
[CmdletBinding()]
param([Alias('SelfTest')][switch]$ContractTest, [string[]]$ContractTestCase)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$manifestPath = Join-Path $repoRoot 'security\tooling\container-base-images.json'
$schemaTestPath = Join-Path $PSScriptRoot 'Test-ContainerBaseImageTrust.mjs'

function Invoke-ContainerBaseImageResolutionContractTest {
    $temporaryDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-container-base-image-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $temporaryDirectory -Force | Out-Null
    try {
        @'
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$DockerArguments)
$scenario = $env:APX_CONTAINER_BASE_IMAGE_SCENARIO
$joined = $DockerArguments -join ' '
$index = 'sha256:9d84285ae8bf9d4251bbdf4881a598240bd6908817096b64de246ce022ec7d86'
$manifest = 'sha256:82eb6e99cb91fb87f5a65a933750ae5bb23cab4ab396e4bba4a5b0b07dcd32ff'
$source = 'https://github.com/corretto/corretto-docker.git#a2028380492e3f5128dca6b06c1e26b10e9b8f04:21/headless/al2023'
if ($joined -match '^buildx imagetools inspect --format') {
  if ($scenario -eq 'wrong-index') { 'sha256:' + ('a' * 64) } else { $index }; exit 0
}
if ($joined -match '^buildx imagetools inspect --raw') {
  if ($scenario -eq 'malformed-index') { '{'; exit 0 }
  $items = @(@{ digest = $manifest; mediaType = 'application/vnd.oci.image.manifest.v1+json'; platform = @{ os = 'linux'; architecture = 'amd64' }; annotations = @{ 'org.opencontainers.image.source' = $source } })
  if ($scenario -eq 'zero-platform') { $items = @() }
  if ($scenario -eq 'two-platform') { $items += $items[0] }
  if ($scenario -eq 'wrong-platform-digest') { $items[0].digest = 'sha256:' + ('b' * 64) }
  if ($scenario -eq 'wrong-media-type') { $items[0].mediaType = 'application/vnd.docker.distribution.manifest.v2+json' }
  if ($scenario -eq 'wrong-source') { $items[0].annotations.'org.opencontainers.image.source' = 'https://example.invalid/source' }
  @{ schemaVersion = 2; mediaType = 'application/vnd.oci.image.index.v1+json'; manifests = $items } | ConvertTo-Json -Depth 8 -Compress; exit 0
}
if ($joined -match '^pull ') { if ($scenario -eq 'pull-failure') { exit 1 }; exit 0 }
if ($joined -match '^image inspect ') {
  if ($scenario -eq 'pull-failure') { exit 1 }
  if ($scenario -eq 'malformed-local-inspect') { '{'; exit 0 }
  $repoDigest = "amazoncorretto@$manifest"
  if ($scenario -eq 'descriptor-absent-valid-repo-digest') { @{ Os = 'linux'; Architecture = 'amd64'; RepoDigests = @($repoDigest) } | ConvertTo-Json -Compress; exit 0 }
  if ($scenario -eq 'missing-repo-digests') { @{ Os = 'linux'; Architecture = 'amd64'; Descriptor = @{ digest = $manifest } } | ConvertTo-Json -Compress; exit 0 }
  if ($scenario -eq 'empty-repo-digests') { @{ Os = 'linux'; Architecture = 'amd64'; RepoDigests = @(); Descriptor = @{ digest = $manifest } } | ConvertTo-Json -Compress; exit 0 }
  if ($scenario -eq 'wrong-repo-digest') { @{ Os = 'linux'; Architecture = 'amd64'; RepoDigests = @('amazoncorretto@sha256:' + ('d' * 64)); Descriptor = @{ digest = $manifest } } | ConvertTo-Json -Compress; exit 0 }
  if ($scenario -eq 'wrong-local-os') { @{ Os = 'windows'; Architecture = 'amd64'; RepoDigests = @($repoDigest); Descriptor = @{ digest = $manifest } } | ConvertTo-Json -Compress; exit 0 }
  if ($scenario -eq 'wrong-local-architecture') { @{ Os = 'linux'; Architecture = 'arm64'; RepoDigests = @($repoDigest); Descriptor = @{ digest = $manifest } } | ConvertTo-Json -Compress; exit 0 }
  $descriptorDigest = if ($scenario -eq 'descriptor-digest-mismatch') { 'sha256:' + ('c' * 64) } else { $manifest }
  @{ Os = 'linux'; Architecture = 'amd64'; RepoDigests = @($repoDigest); Descriptor = @{ digest = $descriptorDigest } } | ConvertTo-Json -Compress; exit 0
}
exit 1
'@ | Set-Content -LiteralPath (Join-Path $temporaryDirectory 'fake-docker.ps1') -NoNewline
        "@echo off`r`npowershell.exe -NoProfile -ExecutionPolicy Bypass -File `"%~dp0fake-docker.ps1`" %*`r`nexit /b %ERRORLEVEL%`r`n" | Set-Content -LiteralPath (Join-Path $temporaryDirectory 'docker.cmd') -NoNewline

        $cases = @(
            @{ Name = 'Canonical base image resolution accepted'; Scenario = 'canonical'; Pass = $true },
            @{ Name = 'Upstream index drift classified as REVIEW_REQUIRED'; Scenario = 'wrong-index'; Review = $true },
            @{ Name = 'Malformed upstream index classified as REVIEW_REQUIRED'; Scenario = 'malformed-index'; Review = $true },
            @{ Name = 'Upstream platform ambiguity classified as REVIEW_REQUIRED'; Scenario = 'zero-platform'; Review = $true },
            @{ Name = 'Multiple upstream platform manifests classified as REVIEW_REQUIRED'; Scenario = 'two-platform'; Review = $true },
            @{ Name = 'Upstream platform digest drift classified as REVIEW_REQUIRED'; Scenario = 'wrong-platform-digest'; Review = $true },
            @{ Name = 'Upstream media type drift classified as REVIEW_REQUIRED'; Scenario = 'wrong-media-type'; Review = $true },
            @{ Name = 'Upstream source drift classified as REVIEW_REQUIRED'; Scenario = 'wrong-source'; Review = $true },
            @{ Name = 'Approved digest pull failure rejected'; Scenario = 'pull-failure'; Code = 'CONTAINER_BASE_IMAGE_PULL_FAILED' },
            @{ Name = 'Malformed local inspect rejected'; Scenario = 'malformed-local-inspect'; Code = 'CONTAINER_BASE_IMAGE_LOCAL_INSPECTION_MALFORMED' },
            @{ Name = 'Descriptor absent with matching RepoDigests accepted'; Scenario = 'descriptor-absent-valid-repo-digest'; Pass = $true },
            @{ Name = 'Missing RepoDigests rejected'; Scenario = 'missing-repo-digests'; Code = 'CONTAINER_BASE_IMAGE_LOCAL_INSPECT_INVALID' },
            @{ Name = 'Empty RepoDigests rejected'; Scenario = 'empty-repo-digests'; Code = 'CONTAINER_BASE_IMAGE_LOCAL_DIGEST_MISMATCH' },
            @{ Name = 'Wrong RepoDigests manifest rejected'; Scenario = 'wrong-repo-digest'; Code = 'CONTAINER_BASE_IMAGE_LOCAL_DIGEST_MISMATCH' },
            @{ Name = 'Wrong local OS rejected'; Scenario = 'wrong-local-os'; Code = 'CONTAINER_BASE_IMAGE_LOCAL_PLATFORM_MISMATCH' },
            @{ Name = 'Wrong local architecture rejected'; Scenario = 'wrong-local-architecture'; Code = 'CONTAINER_BASE_IMAGE_LOCAL_PLATFORM_MISMATCH' },
            @{ Name = 'Descriptor manifest mismatch rejected'; Scenario = 'descriptor-digest-mismatch'; Code = 'CONTAINER_BASE_IMAGE_LOCAL_DIGEST_MISMATCH' }
        )
        if ($null -ne $ContractTestCase -and $ContractTestCase.Count -gt 0) {
            $selectedCases = @($ContractTestCase | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
            $cases = @($cases | Where-Object { $_.Scenario -in $selectedCases })
            if ($cases.Count -eq 0) { throw 'CONTAINER_BASE_IMAGE_ADAPTER_CASE_UNKNOWN' }
        }
        foreach ($case in $cases) {
            $previousPath = $env:PATH; $previousScenario = $env:APX_CONTAINER_BASE_IMAGE_SCENARIO
            try {
                $env:PATH = "$temporaryDirectory;$previousPath"; $env:APX_CONTAINER_BASE_IMAGE_SCENARIO = $case.Scenario
                try {
                    $output = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $PSCommandPath 2>&1)
                    $childExitCode = $LASTEXITCODE
                } catch {
                    $output = @($_.Exception.Message)
                    $childExitCode = if ($LASTEXITCODE -eq 0) { 1 } else { $LASTEXITCODE }
                }
                $text = $output -join "`n"
                if ($case.ContainsKey('Pass') -and $case.Pass) {
                    if ($childExitCode -ne 0 -or $text -notmatch 'Container base image integrity gate: PASS' -or $text -match 'CONTAINER_BASE_IMAGE_UPSTREAM_REVIEW_REQUIRED') { throw "CONTAINER_BASE_IMAGE_ADAPTER_CASE_FAILED" }
                } elseif ($case.ContainsKey('Review') -and $case.Review) {
                    if ($childExitCode -ne 0 -or $text -notmatch 'CONTAINER_BASE_IMAGE_UPSTREAM_REVIEW_REQUIRED') { throw "CONTAINER_BASE_IMAGE_ADAPTER_CASE_FAILED" }
                } elseif ($childExitCode -eq 0 -or ($text -notmatch [regex]::Escape($case.Code)) -or ($case.ContainsKey('Diagnostic') -and $text -notmatch [regex]::Escape($case.Diagnostic))) { throw "CONTAINER_BASE_IMAGE_ADAPTER_CASE_FAILED" }
                Write-Output "[PASS] $($case.Name)"
            } finally { $env:PATH = $previousPath; $env:APX_CONTAINER_BASE_IMAGE_SCENARIO = $previousScenario }
        }
        Write-Output 'Container base image resolution adapter tests: PASS'
    } finally { Remove-Item -LiteralPath $temporaryDirectory -Recurse -Force -ErrorAction SilentlyContinue }
}

if ($ContractTest) { Invoke-ContainerBaseImageResolutionContractTest; exit 0 }

function Throw-ContainerBaseImageFailure {
    param([Parameter(Mandatory)][string]$Code)
    throw $Code
}

function Invoke-DockerRequired {
    param([Parameter(Mandatory)][string[]]$Arguments, [Parameter(Mandatory)][string]$FailureCode)

    # The contract adapter supplies a fake `docker.cmd`. Production must use the
    # native Windows client when running under Windows, while hosted Linux keeps
    # the standard `docker` command.
    $dockerCommand = if (-not [string]::IsNullOrWhiteSpace($env:APX_CONTAINER_BASE_IMAGE_SCENARIO)) {
        'docker'
    } elseif ($env:OS -eq 'Windows_NT') {
        'docker.exe'
    } else {
        'docker'
    }
    $output = @(& $dockerCommand @Arguments 2>&1)
    if ($LASTEXITCODE -ne 0) {
        Throw-ContainerBaseImageFailure -Code $FailureCode
    }
    return ($output -join [Environment]::NewLine)
}

$resolutionPhase = 'initialize'
try {
    $resolutionPhase = 'load-contract'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf) -or -not (Test-Path -LiteralPath $schemaTestPath -PathType Leaf)) {
    Throw-ContainerBaseImageFailure -Code 'CONTAINER_BASE_IMAGE_CONTRACT_MISSING'
}

$resolutionPhase = 'validate-offline-contract'
& node $schemaTestPath
if ($LASTEXITCODE -ne 0) {
    Throw-ContainerBaseImageFailure -Code 'CONTAINER_BASE_IMAGE_CONTRACT_INVALID'
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json -ErrorAction Stop
$image = @($manifest.images)[0]
$tagReference = "$($image.repository):$($image.reviewedTag)"
$digestReference = "$($image.repository)@$($image.platformManifestDigest)"

$upstreamReviewRequired = @()
try {
    $resolutionPhase = 'resolve-index-digest'
    $resolvedIndexDigest = (Invoke-DockerRequired -Arguments @('buildx', 'imagetools', 'inspect', '--format', '{{.Manifest.Digest}}', $tagReference) -FailureCode 'CONTAINER_BASE_IMAGE_INDEX_INSPECTION_FAILED').Trim()
    if ($resolvedIndexDigest -cne $image.indexDigest) { $upstreamReviewRequired += 'INDEX_DIGEST_DRIFT' }
    $resolutionPhase = 'resolve-index-json'
    $indexRaw = Invoke-DockerRequired -Arguments @('buildx', 'imagetools', 'inspect', '--raw', $tagReference) -FailureCode 'CONTAINER_BASE_IMAGE_INDEX_INSPECTION_FAILED'
    $index = $indexRaw | ConvertFrom-Json -ErrorAction Stop
    $resolutionPhase = 'select-amd64'
    $matches = @($index.manifests | Where-Object { $_.platform.os -ceq $image.platform.os -and $_.platform.architecture -ceq $image.platform.architecture })
    $resolutionPhase = 'validate-platform-digest'
    if ($index.schemaVersion -ne 2 -or $index.mediaType -notin @('application/vnd.oci.image.index.v1+json', 'application/vnd.docker.distribution.manifest.list.v2+json') -or $matches.Count -ne 1) { $upstreamReviewRequired += 'INDEX_SHAPE_OR_PLATFORM_AMBIGUITY' }
    elseif ($matches[0].digest -cne $image.platformManifestDigest -or $matches[0].mediaType -cne $image.manifestMediaType) { $upstreamReviewRequired += 'PLATFORM_MANIFEST_DRIFT' }
    else {
        $resolutionPhase = 'validate-source'
        if ($matches[0].annotations.'org.opencontainers.image.source' -cne $image.officialSource) { $upstreamReviewRequired += 'SOURCE_DRIFT' }
    }
} catch { $upstreamReviewRequired += 'INDEX_UNAVAILABLE_OR_MALFORMED' }

$resolutionPhase = 'pull-platform-image'
Invoke-DockerRequired -Arguments @('pull', '--platform', "$($image.platform.os)/$($image.platform.architecture)", $digestReference) -FailureCode 'CONTAINER_BASE_IMAGE_PULL_FAILED' | Out-Null
$resolutionPhase = 'inspect-local-image'
$inspectRaw = Invoke-DockerRequired -Arguments @('image', 'inspect', $digestReference) -FailureCode 'CONTAINER_BASE_IMAGE_LOCAL_INSPECTION_FAILED'
try {
    $localImage = @($inspectRaw | ConvertFrom-Json -ErrorAction Stop)[0]
} catch {
    Throw-ContainerBaseImageFailure -Code 'CONTAINER_BASE_IMAGE_LOCAL_INSPECTION_MALFORMED'
}
$resolutionPhase = 'validate-local-platform'
$osProperty = $localImage.PSObject.Properties['Os']
$architectureProperty = $localImage.PSObject.Properties['Architecture']
$repoDigestsProperty = $localImage.PSObject.Properties['RepoDigests']
if ($null -eq $osProperty -or $null -eq $architectureProperty -or $null -eq $repoDigestsProperty) {
    Throw-ContainerBaseImageFailure -Code 'CONTAINER_BASE_IMAGE_LOCAL_INSPECT_INVALID'
}
if ([string]$osProperty.Value -cne [string]$image.platform.os -or [string]$architectureProperty.Value -cne [string]$image.platform.architecture) {
    Throw-ContainerBaseImageFailure -Code 'CONTAINER_BASE_IMAGE_LOCAL_PLATFORM_MISMATCH'
}

$expectedManifestDigest = [string]$image.platformManifestDigest
$repoDigests = @($repoDigestsProperty.Value | Where-Object { $null -ne $_ -and -not [string]::IsNullOrWhiteSpace([string]$_) })
$matchingRepoDigests = @($repoDigests | Where-Object {
    $value = [string]$_
    $value -match '@(?<digest>sha256:[a-f0-9]{64})$' -and $Matches['digest'] -ceq $expectedManifestDigest
})
if ($matchingRepoDigests.Count -lt 1) {
    Throw-ContainerBaseImageFailure -Code 'CONTAINER_BASE_IMAGE_LOCAL_DIGEST_MISMATCH'
}

$descriptorProperty = $localImage.PSObject.Properties['Descriptor']
if ($null -ne $descriptorProperty -and $null -ne $descriptorProperty.Value) {
    $descriptorDigestProperty = $descriptorProperty.Value.PSObject.Properties['digest']
    if ($null -ne $descriptorDigestProperty -and -not [string]::IsNullOrWhiteSpace([string]$descriptorDigestProperty.Value) -and [string]$descriptorDigestProperty.Value -cne $expectedManifestDigest) {
        Throw-ContainerBaseImageFailure -Code 'CONTAINER_BASE_IMAGE_LOCAL_DIGEST_MISMATCH'
    }
}

if ($upstreamReviewRequired.Count -gt 0) { Write-Output ('[REVIEW_REQUIRED] CONTAINER_BASE_IMAGE_UPSTREAM_REVIEW_REQUIRED ({0})' -f ($upstreamReviewRequired -join ',')) }
$resolutionPhase = 'complete'
Write-Output ('Container base image integrity gate: PASS (platformDigest={0}, platform={1}/{2})' -f $image.platformManifestDigest, $image.platform.os, $image.platform.architecture)
} catch {
    $message = [string]$_.Exception.Message
    if ($message -match '\bCONTAINER_BASE_IMAGE_[A-Z_]+\b') { throw }
    throw ('CONTAINER_BASE_IMAGE_UNCLASSIFIED_FAILED|phase={0}|exceptionType={1}' -f $resolutionPhase, $_.Exception.GetType().Name)
}
