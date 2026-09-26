#Requires -Version 5.1
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:ModulePath = Join-Path $PSScriptRoot 'SupplyChainTooling.psm1'
$script:SchemaTestPath = Join-Path $PSScriptRoot 'Test-SupplyChainToolSchema.mjs'
$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$script:CanonicalManifest = Join-Path $script:RepoRoot 'security\tooling\supply-chain-tools.json'
$script:Results = New-Object System.Collections.Generic.List[object]

# --- RED guard: module must exist before any case can be validated -----------------
if (-not (Test-Path -LiteralPath $script:ModulePath -PathType Leaf)) {
    Write-Output 'Expected manifest validation failures were not enforced.'
    exit 1
}

Import-Module $script:ModulePath -Force

$script:TestTempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("auction-promax-tool-test-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $script:TestTempRoot -Force | Out-Null

function Add-TestResult {
    param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][string]$Result, [string]$Detail)
    $script:Results.Add([pscustomobject]@{ Name = $Name; Result = $Result; Detail = $Detail })
}

function Invoke-TestCase {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][scriptblock]$Body,
        [switch]$Skip,
        [string]$SkipReason
    )
    if ($Skip) {
        Add-TestResult -Name $Name -Result 'SKIP' -Detail $SkipReason
        return
    }
    try {
        & $Body
        Add-TestResult -Name $Name -Result 'PASS'
    } catch {
        Add-TestResult -Name $Name -Result 'FAIL' -Detail $_.Exception.Message
    }
}

function Assert-Throws {
    param(
        [Parameter(Mandatory)][scriptblock]$Body,
        [string]$MatchPattern
    )
    $threw = $false
    try {
        & $Body | Out-Null
    } catch {
        $threw = $true
        if ($MatchPattern -and $_.Exception.Message -notmatch $MatchPattern) {
            throw "Expected an error matching '$MatchPattern' but got: $($_.Exception.Message)"
        }
    }
    if (-not $threw) {
        throw 'Expected an error but none was thrown.'
    }
}

function New-MutatedManifest {
    param([Parameter(Mandatory)][scriptblock]$Mutate, [Parameter(Mandatory)][string]$Tag)
    $m = Read-ToolManifest -ManifestPath $script:CanonicalManifest
    & $Mutate $m
    $tmp = Join-Path $script:TestTempRoot ("manifest-" + $Tag + ".json")
    ($m | ConvertTo-Json -Depth 24) | Set-Content -LiteralPath $tmp -Encoding ascii -NoNewline
    return $tmp
}

function Get-ToolIndex {
    param([Parameter(Mandatory)]$Manifest, [Parameter(Mandatory)][string]$ToolName)
    $idx = -1
    for ($i = 0; $i -lt @($Manifest.tools).Count; $i++) {
        if ($Manifest.tools[$i].name -eq $ToolName) { $idx = $i; break }
    }
    if ($idx -lt 0) { throw "Fixture helper: tool '$ToolName' not found." }
    return $idx
}

function New-TestFile {
    param([Parameter(Mandatory)][string]$RelativePath, [string]$Content = 'test-content')
    $full = Join-Path $script:TestTempRoot $RelativePath
    $parent = Split-Path -Parent $full
    if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    Set-Content -LiteralPath $full -Value $Content -Encoding ascii -NoNewline
    return $full
}

function New-TestZip {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][hashtable]$Entries
    )
    $parent = Split-Path -Parent $Path
    if ($parent -and -not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
    Add-Type -AssemblyName System.IO.Compression -ErrorAction Stop
    $fs = [System.IO.File]::Open($Path, [System.IO.FileMode]::Create)
    try {
        $zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
        try {
            foreach ($key in $Entries.Keys) {
                $entry = $zip.CreateEntry($key)
                $writer = New-Object System.IO.StreamWriter($entry.Open())
                try { $writer.Write([string]$Entries[$key]) } finally { $writer.Dispose() }
            }
        } finally {
            $zip.Dispose()
        }
    } finally {
        $fs.Dispose()
    }
}

function Get-PowershellExecutablePath {
    $cmd = Get-Command powershell.exe -ErrorAction Stop
    return $cmd.Source
}

function New-VersionFixtureExecutable {
    param([string]$Output = 'Version: 9.9.9')
    $suffix = [guid]::NewGuid().ToString('N')
    if ($env:OS -eq 'Windows_NT') {
        $path = Join-Path $script:TestTempRoot ("version-fixture-$suffix.cmd")
        "@echo $Output" | Set-Content -LiteralPath $path -Encoding ascii
        return $path
    }
    $path = Join-Path $script:TestTempRoot ("version-fixture-$suffix.sh")
    "#!/bin/sh`nprintf '%s\n' '$Output'" | Set-Content -LiteralPath $path -Encoding ascii
    & chmod +x $path
    if ($LASTEXITCODE -ne 0) { throw 'Could not make version fixture executable.' }
    return $path
}

function New-FakeToolDefinition {
    param(
        [string]$AssetName = 'fake-asset.zip',
        [string]$AssetSha256,
        [string]$ExecutableName = 'powershell.exe',
        [string[]]$VersionArguments = @('-NoProfile', '-Command', 'Write-Output "Version: 9.9.9"'),
        [string]$VersionPattern = 'Version: 9\.9\.9'
    )
    return [pscustomobject]@{
        Name = 'fake-tool'
        Version = '9.9.9'
        Platform = 'windows-x64'
        AssetName = $AssetName
        Sha256 = $AssetSha256
        ArchiveType = 'zip'
        ExecutableName = $ExecutableName
        VersionArguments = $VersionArguments
        VersionPattern = $VersionPattern
    }
}

# ==================================================================================
# Test cases
# ==================================================================================

# --- Manifest validation ----------------------------------------------------------

Invoke-TestCase -Name 'PowerShell Core platform automatic variables are not shadowed' -Body {
    $violations = @(Get-ChildItem -LiteralPath $PSScriptRoot -File -Include '*.ps1','*.psm1' | ForEach-Object {
        $source = Get-Content -LiteralPath $_.FullName -Raw
        if ($source -match '(?i)\$(isWindows|isLinux|isMacOS|isCoreCLR)\s*=') { $_.Name }
    })
    if ($violations.Count -ne 0) { throw ('Automatic-variable assignments found in: ' + ($violations -join ', ')) }
}

Invoke-TestCase -Name 'Container prebuild selects Maven Wrapper for its host platform' -Body {
    $prebuildPath = Join-Path $PSScriptRoot 'Invoke-ContainerPrebuildArtifact.ps1'
    if (-not (Test-Path -LiteralPath $prebuildPath -PathType Leaf)) {
        throw 'Container prebuild script is missing.'
    }

    $prebuildSource = Get-Content -LiteralPath $prebuildPath -Raw
    if ($prebuildSource -match '\bJoin-Path\s+\$serviceRoot\s+''mvnw\.cmd''') {
        throw 'Container prebuild hard-codes the Windows Maven Wrapper.'
    }
    if ($prebuildSource -notmatch '\$wrapperName\s*=\s*if\s*\(\$runningOnWindows\)\s*\{\s*''mvnw\.cmd''\s*\}\s*else\s*\{\s*''mvnw''\s*\}') {
        throw 'Container prebuild does not select Maven Wrapper by host platform.'
    }
    if ($prebuildSource -notmatch '&\s+\$wrapperPath\s+-B\s+clean\s+verify') {
        throw 'Container prebuild does not invoke the selected Maven Wrapper.'
    }
}

Invoke-TestCase -Name 'Container prebuild preserves Unix Maven Wrapper execute mode' -Body {
    $indexEntry = @(& git -c "safe.directory=$script:RepoRoot" -C $script:RepoRoot ls-files -s -- 'services/identity-profile-service/mvnw')
    if ($LASTEXITCODE -ne 0 -or $indexEntry.Count -ne 1 -or $indexEntry[0] -notmatch '^100755\s+[a-f0-9]{40}\s+0\s+services/identity-profile-service/mvnw$') {
        throw 'Maven Wrapper is not tracked with Unix executable mode 100755.'
    }
}

Invoke-TestCase -Name 'Canonical manifest validation' -Body {
    $null = Test-ToolManifest -ManifestPath $script:CanonicalManifest
}

Invoke-TestCase -Name 'Pinned JSON Schema contract validation' -Body {
    if (-not (Test-Path -LiteralPath $script:SchemaTestPath -PathType Leaf)) {
        throw 'Supply-chain JSON Schema contract test is missing.'
    }
    & node $script:SchemaTestPath
    if ($LASTEXITCODE -ne 0) {
        throw "Supply-chain JSON Schema contract test failed with exit code $LASTEXITCODE."
    }
}

Invoke-TestCase -Name 'Missing manifest rejected' -Body {
    $missing = Join-Path $script:TestTempRoot 'does-not-exist.json'
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $missing } -MatchPattern 'not found'
}

Invoke-TestCase -Name 'Empty manifest rejected' -Body {
    $empty = Join-Path $script:TestTempRoot 'empty-manifest.json'
    '' | Set-Content -LiteralPath $empty -Encoding ascii -NoNewline
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $empty } -MatchPattern 'empty'
}

Invoke-TestCase -Name 'Malformed JSON manifest rejected' -Body {
    $bad = Join-Path $script:TestTempRoot 'malformed-manifest.json'
    '{ this is not json' | Set-Content -LiteralPath $bad -Encoding ascii
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $bad } -MatchPattern 'not valid JSON'
}

Invoke-TestCase -Name 'Missing checksum rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'missing-checksum' -Mutate {
        param($m)
        $null = $m.tools[(Get-ToolIndex $m 'trivy')].platforms.'windows-x64'.PSObject.Properties.Remove('sha256')
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'sha256'
}

Invoke-TestCase -Name 'Short checksum rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'short-checksum' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].platforms.'windows-x64'.sha256 = 'a' * 63
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'sha256'
}

Invoke-TestCase -Name 'Non-hex checksum rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'nonhex-checksum' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].platforms.'windows-x64'.sha256 = ('g' * 63) + 'a'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'sha256'
}

Invoke-TestCase -Name 'Placeholder checksum rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'placeholder-checksum' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].platforms.'windows-x64'.sha256 = '0' * 64
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'placeholder'
}

Invoke-TestCase -Name 'Floating version rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'floating-version' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].version = 'latest'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'latest|version'
}

Invoke-TestCase -Name 'Unpinned Gitleaks version rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'gitleaks-8-30-1' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'gitleaks')].version = '8.30.1'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'pinned'
}

Invoke-TestCase -Name 'HTTP release URL rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'http-url' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].officialReleaseBaseUrl = $m.tools[(Get-ToolIndex $m 'trivy')].officialReleaseBaseUrl -replace '^https://', 'http://'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'HTTPS'
}

Invoke-TestCase -Name 'Non-GitHub release host rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'bad-host' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].officialReleaseBaseUrl = 'https://example.com/aquasecurity/trivy/releases/download/v0.74.0'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'github\.com'
}

Invoke-TestCase -Name 'Mismatched repository path rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'bad-repo-path' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].officialReleaseBaseUrl = 'https://github.com/evil-org/trivy/releases/download/v0.74.0'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'path'
}

Invoke-TestCase -Name 'Unsupported platform rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'bad-platform' -Mutate {
        param($m)
        $copy = $m.tools[(Get-ToolIndex $m 'trivy')].platforms.'windows-x64'
        $m.tools[(Get-ToolIndex $m 'trivy')].platforms | Add-Member -NotePropertyName 'darwin-arm64' -NotePropertyValue $copy
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'platform'
}

Invoke-TestCase -Name 'Traversal asset name rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'traversal-asset' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].platforms.'windows-x64'.assetName = '../evil.zip'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'assetName'
}

Invoke-TestCase -Name 'Trivy missing Sigstore metadata rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'trivy-no-sigstore' -Mutate {
        param($m)
        $null = $m.tools[(Get-ToolIndex $m 'trivy')].PSObject.Properties.Remove('sigstore')
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'Sigstore|sigstore'
}

Invoke-TestCase -Name 'Trivy wrong issuer rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'trivy-bad-issuer' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].sigstore.certificateOidcIssuer = 'https://token.actions.evil.example.com'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'certificateOidcIssuer'
}

Invoke-TestCase -Name 'Trivy wrong identity rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'trivy-bad-identity' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].sigstore.certificateIdentity = 'https://github.com/aquasecurity/trivy/.github/workflows/reusable-release.yaml@refs/tags/v0.73.0'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'certificateIdentity'
}

Invoke-TestCase -Name 'Trivy latest-tag identity rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'trivy-latest-identity' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'trivy')].sigstore.certificateIdentity = 'https://github.com/aquasecurity/trivy/.github/workflows/reusable-release.yaml@refs/tags/latest'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'certificateIdentity'
}

Invoke-TestCase -Name 'Cosign image-signing purpose rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'cosign-image-signing' -Mutate {
        param($m)
        $m.tools[(Get-ToolIndex $m 'cosign')].purpose = 'image-signing'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'purpose'
}

Invoke-TestCase -Name 'Extra property rejected' -Body {
    $tmp = New-MutatedManifest -Tag 'extra-property' -Mutate {
        param($m)
        $m | Add-Member -NotePropertyName 'unexpectedField' -NotePropertyValue 'x'
    }
    Assert-Throws -Body { Test-ToolManifest -ManifestPath $tmp } -MatchPattern 'unknown property'
}

# --- Checksum, extraction, version, and cache -------------------------------------

Invoke-TestCase -Name 'Correct hash accepted' -Body {
    $file = New-TestFile -RelativePath 'hash\correct.bin' -Content 'correct-content'
    $hash = Get-FileSha256 -Path $file
    Assert-ExpectedSha256 -Path $file -ExpectedSha256 $hash
}

Invoke-TestCase -Name 'Wrong hash rejected before execution' -Body {
    $file = New-TestFile -RelativePath 'hash\wrong.bin' -Content 'correct-content'
    $wrong = 'a' * 64
    Assert-Throws -Body { Assert-ExpectedSha256 -Path $file -ExpectedSha256 $wrong } -MatchPattern 'Checksum mismatch'
}

Invoke-TestCase -Name 'Missing file rejected' -Body {
    $missing = Join-Path $script:TestTempRoot 'hash\does-not-exist.bin'
    Assert-Throws -Body { Assert-ExpectedSha256 -Path $missing -ExpectedSha256 ('a' * 64) } -MatchPattern 'not found'
}

Invoke-TestCase -Name 'Partial download cache rejected' -Body {
    $cacheDir = Join-Path $script:TestTempRoot 'cache\partial'
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
    $null = New-TestFile -RelativePath 'cache\partial\fake-asset.zip.partial' -Content ''
    $goodContent = 'real-asset-content'
    $assetFile = New-TestFile -RelativePath 'hash\partial-asset.bin' -Content $goodContent
    $def = New-FakeToolDefinition -AssetSha256 (Get-FileSha256 -Path $assetFile)
    Assert-Throws -Body { Assert-CachedTool -Definition $def -CacheDir $cacheDir } -MatchPattern 'partial'
}

Invoke-TestCase -Name 'Corrupted cache rejected' -Body {
    $cacheDir = Join-Path $script:TestTempRoot 'cache\corrupt'
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $cacheDir 'fake-asset.zip') -Value 'tampered-content' -Encoding ascii -NoNewline
    Set-Content -LiteralPath (Join-Path $cacheDir 'powershell.exe') -Value 'fake-executable' -Encoding ascii -NoNewline
    $expectedHash = Get-FileSha256 -Path (New-TestFile -RelativePath 'hash\corrupt-expected.bin' -Content 'expected-content')
    $def = New-FakeToolDefinition -AssetSha256 $expectedHash
    Assert-Throws -Body { Assert-CachedTool -Definition $def -CacheDir $cacheDir } -MatchPattern 'Checksum mismatch|integrity'
}

Invoke-TestCase -Name 'Archive missing executable rejected' -Body {
    $zip = Join-Path $script:TestTempRoot 'archive\no-executable.zip'
    New-TestZip -Path $zip -Entries @{ 'readme.txt' = 'no executable here' }
    $dest = Join-Path $script:TestTempRoot 'archive\no-executable-out'
    Assert-Throws -Body {
        Expand-VerifiedToolArchive -ArchivePath $zip -ArchiveType 'zip' -DestinationPath $dest -ExpectedExecutableName 'trivy.exe'
    } -MatchPattern 'does not contain expected executable'
}

Invoke-TestCase -Name 'Unsafe archive entry rejected (traversal)' -Body {
    $zip = Join-Path $script:TestTempRoot 'archive\traversal.zip'
    New-TestZip -Path $zip -Entries @{ '../evil.txt' = 'evil' }
    Assert-Throws -Body { Assert-SafeArchiveEntries -ArchivePath $zip -ArchiveType 'zip' } -MatchPattern 'traversal|Unsafe'
}

Invoke-TestCase -Name 'Unsafe archive entry rejected (drive path)' -Body {
    $zip = Join-Path $script:TestTempRoot 'archive\drivepath.zip'
    New-TestZip -Path $zip -Entries @{ 'C:/evil.txt' = 'evil' }
    Assert-Throws -Body { Assert-SafeArchiveEntries -ArchivePath $zip -ArchiveType 'zip' } -MatchPattern 'Unsafe'
}

Invoke-TestCase -Name 'Resolved executable outside expected root rejected' -Body {
    $root = Join-Path $script:TestTempRoot 'pathcheck\root'
    New-Item -ItemType Directory -Path $root -Force | Out-Null
    $outside = Join-Path $script:TestTempRoot 'pathcheck\evil.exe'
    Assert-Throws -Body { Assert-PathWithinRoot -Path $outside -Root $root } -MatchPattern 'outside expected root'
}

Invoke-TestCase -Name 'Wrong executable version rejected' -Body {
    $versionFixture = New-VersionFixtureExecutable
    Assert-Throws -Body {
        Assert-ToolVersion -ExecutablePath $versionFixture -VersionArguments @('--version') -VersionPattern 'Version: 0\.74\.0'
    } -MatchPattern 'does not match expected pattern'
}

Invoke-TestCase -Name 'Trivy version suffix rejected' -Body {
    $versionFixture = New-VersionFixtureExecutable -Output 'Version: 0.74.01'
    Assert-Throws -Body {
        Assert-ToolVersion -ExecutablePath $versionFixture -VersionArguments @('--version') -VersionPattern '(?m)^Version:[ \t]*0\.74\.0[ \t]*\r?$'
    } -MatchPattern 'does not match expected pattern'
}

Invoke-TestCase -Name 'Gitleaks version qualifier rejected' -Body {
    $versionFixture = New-VersionFixtureExecutable -Output '8.30.0-dev'
    Assert-Throws -Body {
        Assert-ToolVersion -ExecutablePath $versionFixture -VersionArguments @('--version') -VersionPattern '(?m)^8\.30\.0[ \t]*\r?$'
    } -MatchPattern 'does not match expected pattern'
}

Invoke-TestCase -Name 'Cosign version suffix rejected' -Body {
    $versionFixture = New-VersionFixtureExecutable -Output 'GitVersion:    v3.1.20'
    Assert-Throws -Body {
        Assert-ToolVersion -ExecutablePath $versionFixture -VersionArguments @('--version') -VersionPattern '(?m)^GitVersion:[ \t]*v3\.1\.2[ \t]*\r?$'
    } -MatchPattern 'does not match expected pattern'
}

Invoke-TestCase -Name 'Archive with duplicate executable names rejected' -Body {
    $zip = Join-Path $script:TestTempRoot 'archive\duplicate-executable.zip'
    New-TestZip -Path $zip -Entries @{
        'first/tool.exe' = 'first'
        'second/tool.exe' = 'second'
    }
    $dest = Join-Path $script:TestTempRoot 'archive\duplicate-executable-out'
    Assert-Throws -Body {
        Expand-VerifiedToolArchive -ArchivePath $zip -ArchiveType 'zip' -DestinationPath $dest -ExpectedExecutableName 'tool.exe'
    } -MatchPattern 'multiple expected executables'
}

Invoke-TestCase -Name 'Cached executable matching verified archive accepted' -Body {
    $cacheDir = Join-Path $script:TestTempRoot 'cache\executable-match'
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
    $asset = Join-Path $cacheDir 'fake-asset.zip'
    New-TestZip -Path $asset -Entries @{ 'bin/tool.cmd' = '@echo Version: 9.9.9' }
    Set-Content -LiteralPath (Join-Path $cacheDir 'tool.cmd') -Value '@echo Version: 9.9.9' -Encoding ascii -NoNewline
    $def = New-FakeToolDefinition -AssetSha256 (Get-FileSha256 -Path $asset) -ExecutableName 'tool.cmd' -VersionArguments @('--version')
    $resolved = Assert-CachedTool -Definition $def -CacheDir $cacheDir
    if ($resolved -ne (Join-Path $cacheDir 'tool.cmd')) { throw 'Unexpected cached executable path.' }
}

Invoke-TestCase -Name 'Cached executable tampering rejected' -Body {
    $cacheDir = Join-Path $script:TestTempRoot 'cache\executable-tamper'
    New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
    $asset = Join-Path $cacheDir 'fake-asset.zip'
    New-TestZip -Path $asset -Entries @{ 'bin/tool.cmd' = '@echo Version: 9.9.9' }
    Set-Content -LiteralPath (Join-Path $cacheDir 'tool.cmd') -Value '@echo Version: 9.9.9 & rem tampered' -Encoding ascii -NoNewline
    $def = New-FakeToolDefinition -AssetSha256 (Get-FileSha256 -Path $asset) -ExecutableName 'tool.cmd' -VersionArguments @('--version')
    Assert-Throws -Body { Assert-CachedTool -Definition $def -CacheDir $cacheDir } -MatchPattern 'integrity'
}

Invoke-TestCase -Name 'Correct executable version accepted' -Body {
    $versionFixture = New-VersionFixtureExecutable
    Assert-ToolVersion -ExecutablePath $versionFixture -VersionArguments @('--version') -VersionPattern 'Version: 9\.9\.9'
}

Invoke-TestCase -Name 'Unsupported archive type rejected' -Body {
    $file = New-TestFile -RelativePath 'archive\bad-type.bin' -Content 'x'
    Assert-Throws -Body { Assert-SafeArchiveEntries -ArchivePath $file -ArchiveType '7z' } -MatchPattern 'Unsupported archive type'
}

# --- Trivy Sigstore provenance ------------------------------------------------------

$script:Platform = Resolve-SupportedPlatform
$script:ToolsRoot = Join-Path $script:RepoRoot '.tools\supply-chain'
$script:TrivyDef = Get-ExpectedToolDefinition -ToolName 'trivy' -Platform $script:Platform -ManifestPath $script:CanonicalManifest
$script:CosignDef = Get-ExpectedToolDefinition -ToolName 'cosign' -Platform $script:Platform -ManifestPath $script:CanonicalManifest

$script:TrivyCacheDir = Get-ToolCacheDirectory -ToolsRoot $script:ToolsRoot -ToolName $script:TrivyDef.Name -Version $script:TrivyDef.Version -Platform $script:Platform
$script:CosignCacheDir = Get-ToolCacheDirectory -ToolsRoot $script:ToolsRoot -ToolName $script:CosignDef.Name -Version $script:CosignDef.Version -Platform $script:Platform
$script:CachedTrivyAsset = Join-Path $script:TrivyCacheDir $script:TrivyDef.AssetName
$script:CachedTrivyBundle = Join-Path $script:TrivyCacheDir ($script:TrivyDef.AssetName + $script:TrivyDef.BundleAssetSuffix)
$script:CachedCosign = Join-Path $script:CosignCacheDir $script:CosignDef.ExecutableName
$script:CachedTrustedRoot = Join-Path $script:ToolsRoot 'sigstore-home\.sigstore\root\tuf-repo-cdn.sigstore.dev\targets\trusted_root.json'
$script:ProvenanceCacheReady = (Test-Path -LiteralPath $script:CachedTrivyAsset) -and (Test-Path -LiteralPath $script:CachedTrivyBundle) -and (Test-Path -LiteralPath $script:CachedCosign) -and (Test-Path -LiteralPath $script:CachedTrustedRoot)

function Flip-ByteInFile {
    param(
        [Parameter(Mandatory)][string]$SourcePath,
        [Parameter(Mandatory)][string]$TargetPath
    )
    $bytes = [System.IO.File]::ReadAllBytes($SourcePath)
    if ($bytes.Length -lt 1) { throw 'Cannot tamper an empty file.' }
    $mid = [int]($bytes.Length / 2)
    $bytes[$mid] = $bytes[$mid] -bxor 0xFF
    [System.IO.File]::WriteAllBytes($TargetPath, $bytes)
}

Invoke-TestCase -Name 'Missing cosign executable rejected' -Body {
    $fakeAsset = New-TestFile -RelativePath 'provenance\asset.bin' -Content 'asset'
    $fakeBundle = New-TestFile -RelativePath 'provenance\bundle.json' -Content '{}'
    $missingCosign = Join-Path $script:TestTempRoot 'provenance\no-cosign.exe'
    Assert-Throws -Body {
        Test-TrivyProvenance -CosignPath $missingCosign -AssetPath $fakeAsset -BundlePath $fakeBundle -CertificateOidcIssuer $script:TrivyDef.CertificateOidcIssuer -CertificateIdentity $script:TrivyDef.CertificateIdentity
    } -MatchPattern 'not found'
}

Invoke-TestCase -Name 'Missing Trivy bundle rejected' -Body {
    $fakeAsset = New-TestFile -RelativePath 'provenance\asset2.bin' -Content 'asset'
    $missingBundle = Join-Path $script:TestTempRoot 'provenance\no-bundle.json'
    $existingExe = New-TestFile -RelativePath 'provenance\cosign-stub.exe' -Content 'stub'
    Assert-Throws -Body {
        Test-TrivyProvenance -CosignPath $existingExe -AssetPath $fakeAsset -BundlePath $missingBundle -CertificateOidcIssuer $script:TrivyDef.CertificateOidcIssuer -CertificateIdentity $script:TrivyDef.CertificateIdentity
    } -MatchPattern 'not found'
}

Invoke-TestCase -Name 'Trivy provenance verification PASS (cached tools)' -Skip:(-not $script:ProvenanceCacheReady) -SkipReason 'Trivy/cosign bootstrap cache not present yet' -Body {
    $result = Test-TrivyProvenance -CosignPath $script:CachedCosign -AssetPath $script:CachedTrivyAsset -BundlePath $script:CachedTrivyBundle -CertificateOidcIssuer $script:TrivyDef.CertificateOidcIssuer -CertificateIdentity $script:TrivyDef.CertificateIdentity -RefreshTrustedRoot:$false
    if (-not $result.Passed) { throw 'Provenance verification returned a non-passing result.' }
}

Invoke-TestCase -Name 'Modified Trivy asset rejected' -Skip:(-not $script:ProvenanceCacheReady) -SkipReason 'Trivy/cosign bootstrap cache not present yet' -Body {
    $tampered = Join-Path $script:TestTempRoot 'provenance\tampered-asset.bin'
    Flip-ByteInFile -SourcePath $script:CachedTrivyAsset -TargetPath $tampered
    Assert-Throws -Body {
        Test-TrivyProvenance -CosignPath $script:CachedCosign -AssetPath $tampered -BundlePath $script:CachedTrivyBundle -CertificateOidcIssuer $script:TrivyDef.CertificateOidcIssuer -CertificateIdentity $script:TrivyDef.CertificateIdentity -RefreshTrustedRoot:$false
    } -MatchPattern 'failed'
}

Invoke-TestCase -Name 'Tampered Trivy bundle rejected' -Skip:(-not $script:ProvenanceCacheReady) -SkipReason 'Trivy/cosign bootstrap cache not present yet' -Body {
    $tampered = Join-Path $script:TestTempRoot 'provenance\tampered-bundle.json'
    Flip-ByteInFile -SourcePath $script:CachedTrivyBundle -TargetPath $tampered
    Assert-Throws -Body {
        Test-TrivyProvenance -CosignPath $script:CachedCosign -AssetPath $script:CachedTrivyAsset -BundlePath $tampered -CertificateOidcIssuer $script:TrivyDef.CertificateOidcIssuer -CertificateIdentity $script:TrivyDef.CertificateIdentity -RefreshTrustedRoot:$false
    } -MatchPattern 'failed'
}

Invoke-TestCase -Name 'Wrong Trivy issuer rejected' -Skip:(-not $script:ProvenanceCacheReady) -SkipReason 'Trivy/cosign bootstrap cache not present yet' -Body {
    Assert-Throws -Body {
        Test-TrivyProvenance -CosignPath $script:CachedCosign -AssetPath $script:CachedTrivyAsset -BundlePath $script:CachedTrivyBundle -CertificateOidcIssuer 'https://token.actions.evil.example.com' -CertificateIdentity $script:TrivyDef.CertificateIdentity -RefreshTrustedRoot:$false
    } -MatchPattern 'failed'
}

Invoke-TestCase -Name 'Wrong Trivy identity rejected' -Skip:(-not $script:ProvenanceCacheReady) -SkipReason 'Trivy/cosign bootstrap cache not present yet' -Body {
    Assert-Throws -Body {
        Test-TrivyProvenance -CosignPath $script:CachedCosign -AssetPath $script:CachedTrivyAsset -BundlePath $script:CachedTrivyBundle -CertificateOidcIssuer $script:TrivyDef.CertificateOidcIssuer -CertificateIdentity 'https://github.com/aquasecurity/trivy/.github/workflows/reusable-release.yaml@refs/tags/v0.73.0' -RefreshTrustedRoot:$false
    } -MatchPattern 'failed'
}

# ==================================================================================
# Report
# ==================================================================================

$failures = @($script:Results | Where-Object { $_.Result -eq 'FAIL' })
$skipped = @($script:Results | Where-Object { $_.Result -eq 'SKIP' })
foreach ($r in $script:Results) {
    Write-Output ("[{0}] {1}" -f $r.Result, $r.Name)
    if ($r.Detail) { Write-Output ("       " + $r.Detail) }
}
Write-Output ('Supply-chain tooling tests: ' + $(if ($failures.Count -gt 0) { 'FAIL' } else { 'PASS' }))
Write-Output ("Tests: $($script:Results.Count)")
Write-Output ("Failures: $($failures.Count)")
Write-Output ("Skipped: $($skipped.Count)")

try {
    if (Test-Path -LiteralPath $script:TestTempRoot) {
        $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
        $fullTestTemp = [System.IO.Path]::GetFullPath($script:TestTempRoot)
        if ($fullTestTemp.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and $fullTestTemp -match 'auction-promax-tool-test-') {
            Remove-Item -LiteralPath $script:TestTempRoot -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
} catch {
    Write-Warning "Cleanup of test temp root failed: $($_.Exception.Message)"
}

if ($failures.Count -gt 0) { exit 1 }
exit 0
