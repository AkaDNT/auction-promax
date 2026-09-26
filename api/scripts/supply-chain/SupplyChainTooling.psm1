#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ==================================================================================
# SupplyChainTooling.psm1
#
# Repository-owned supply-chain tool bootstrap and integrity verification logic.
# Cycle 1 scope: manifest validation, checksum-verified download cache, Trivy
# Sigstore provenance verification, and the Gitleaks seeded integrity fixture.
# No scanner, image, or CI execution is claimed by this module.
# ==================================================================================

$script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$script:DefaultManifestPath = Join-Path $script:RepoRoot 'security\tooling\supply-chain-tools.json'
$script:DefaultToolsRoot = Join-Path $script:RepoRoot '.tools\supply-chain'

$script:PinnedVersions = @{
    trivy    = '0.74.0'
    gitleaks = '8.30.0'
    cosign   = '3.1.2'
}

$script:PinnedRepos = @{
    trivy    = 'aquasecurity/trivy'
    gitleaks = 'gitleaks/gitleaks'
    cosign   = 'sigstore/cosign'
}

$script:SupportedPlatforms = @('windows-x64', 'linux-x64')
$script:SupportedArchiveTypes = @('zip', 'tar.gz', 'binary')
$script:ExpectedTrivyIssuer = 'https://token.actions.githubusercontent.com'

# ----------------------------------------------------------------------------------
# Manifest handling
# ----------------------------------------------------------------------------------

function Read-ToolManifest {
    <#
    .SYNOPSIS
    Reads and parses the repository-owned supply-chain tool manifest.
    #>
    param(
        [string]$ManifestPath = $script:DefaultManifestPath
    )
    if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
        throw 'Manifest path must not be empty.'
    }
    if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
        throw "Supply-chain tool manifest not found: $ManifestPath"
    }
    $raw = Get-Content -LiteralPath $ManifestPath -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) {
        throw 'Supply-chain tool manifest is empty.'
    }
    try {
        $parsed = $raw | ConvertFrom-Json
    } catch {
        throw "Supply-chain tool manifest is not valid JSON: $($_.Exception.Message)"
    }
    if ($null -eq $parsed) {
        throw 'Supply-chain tool manifest parsed to null.'
    }
    return $parsed
}

function Assert-NoExtraProperties {
    param(
        [Parameter(Mandatory)][AllowNull()]$Object,
        [Parameter(Mandatory)][string[]]$Allowed,
        [Parameter(Mandatory)][string]$Context
    )
    if ($null -eq $Object) { return }
    foreach ($p in $Object.PSObject.Properties) {
        if ($p.Name -notin $Allowed) {
            throw "$Context contains unknown property '$($p.Name)' (additionalProperties=false)."
        }
    }
}

function Test-SigstoreDefinition {
    param(
        [Parameter(Mandatory)]$Tool,
        [Parameter(Mandatory)]$Sigstore
    )
    $name = $Tool.name
    Assert-NoExtraProperties -Object $Sigstore -Allowed @('bundleAssetSuffix', 'certificateOidcIssuer', 'certificateIdentity') -Context "Tool '$name' sigstore"
    if ($null -eq $Sigstore.bundleAssetSuffix -or "$($Sigstore.bundleAssetSuffix)" -notmatch '^\.[A-Za-z0-9_.-]+$') {
        throw "Tool '$name' sigstore bundleAssetSuffix is missing or invalid."
    }
    if ("$($Sigstore.certificateOidcIssuer)" -ne $script:ExpectedTrivyIssuer) {
        throw "Tool '$name' certificateOidcIssuer '$($Sigstore.certificateOidcIssuer)' must be exactly '$($script:ExpectedTrivyIssuer)'."
    }
    $identity = "$($Sigstore.certificateIdentity)"
    $expectedIdentity = "https://github.com/$($script:PinnedRepos[$name])/.github/workflows/reusable-release.yaml@refs/tags/v$($script:PinnedVersions[$name])"
    if ($identity -ne $expectedIdentity) {
        throw "Tool '$name' certificateIdentity '$identity' must be exactly '$expectedIdentity'."
    }
}

function Test-PlatformEntry {
    param(
        [Parameter(Mandatory)]$Tool,
        [Parameter(Mandatory)][string]$Platform,
        [Parameter(Mandatory)]$Entry
    )
    $name = $Tool.name
    Assert-NoExtraProperties -Object $Entry -Allowed @('assetName', 'sha256', 'archiveType', 'executableName') -Context "Tool '$name' platform '$Platform'"
    $asset = "$($Entry.assetName)"
    if ([string]::IsNullOrWhiteSpace($asset)) {
        throw "Tool '$name' platform '$Platform' is missing assetName."
    }
    if ($asset -match 'latest') {
        throw "Tool '$name' platform '$Platform' assetName must not reference 'latest'."
    }
    if ($asset -notmatch '^[A-Za-z0-9._-]+$' -or $asset -match '\.\.' -or $asset -match '[\\/:]') {
        throw "Tool '$name' platform '$Platform' assetName '$asset' is unsafe."
    }
    $sha = "$($Entry.sha256)"
    if ($sha -notmatch '^[a-f0-9]{64}$') {
        throw "Tool '$name' platform '$Platform' sha256 must be a lowercase 64-character hex digest."
    }
    if ($sha -eq ('0' * 64)) {
        throw "Tool '$name' platform '$Platform' sha256 is a placeholder and is rejected."
    }
    if ("$($Entry.archiveType)" -notin $script:SupportedArchiveTypes) {
        throw "Tool '$name' platform '$Platform' archiveType '$($Entry.archiveType)' is unsupported."
    }
    $exe = "$($Entry.executableName)"
    if ($exe -notmatch '^[A-Za-z0-9_-]+(\.exe)?$') {
        throw "Tool '$name' platform '$Platform' executableName '$exe' is unsafe."
    }
    if ($Platform -eq 'windows-x64' -and $exe -notmatch '\.exe$') {
        throw "Tool '$name' platform '$Platform' executableName must end in '.exe'."
    }
}

function Test-ToolDefinition {
    param(
        [Parameter(Mandatory)]$Tool
    )
    $name = "$($Tool.name)"
    Assert-NoExtraProperties -Object $Tool -Allowed @('name', 'version', 'officialReleaseBaseUrl', 'versionArguments', 'versionPattern', 'purpose', 'sigstore', 'platforms') -Context "Tool '$name'"

    if ($name -notin $script:PinnedRepos.Keys) {
        throw "Unsupported tool '$name'."
    }
    $version = "$($Tool.version)"
    if ($version -eq 'latest') {
        throw "Tool '$name' uses floating version 'latest'; pinning is mandatory."
    }
    if ($version -notmatch '^[0-9]+\.[0-9]+\.[0-9]+$') {
        throw "Tool '$name' version '$version' is not a pinned semantic version."
    }
    if ($version -ne $script:PinnedVersions[$name]) {
        throw "Tool '$name' version '$version' does not match the pinned version '$($script:PinnedVersions[$name])'."
    }

    $hasPurpose = ($Tool.PSObject.Properties.Name -contains 'purpose')
    if ($hasPurpose) {
        $purpose = "$($Tool.PSObject.Properties['purpose'].Value)"
        if ($purpose -eq 'image-signing') {
            throw "Tool '$name' declares purpose 'image-signing', which is explicitly out of scope for T07."
        }
        if ($purpose -ne 'release-provenance') {
            throw "Tool '$name' has invalid purpose '$purpose'."
        }
        if ($name -ne 'cosign') {
            throw "Only cosign may declare purpose 'release-provenance'."
        }
    }

    $url = "$($Tool.officialReleaseBaseUrl)"
    if ([string]::IsNullOrWhiteSpace($url)) {
        throw "Tool '$name' is missing officialReleaseBaseUrl."
    }
    $uri = $null
    try {
        $uri = [System.Uri]::new($url)
    } catch {
        throw "Tool '$name' release URL '$url' is not a valid URI."
    }
    if ($uri.Scheme -ne 'https') {
        throw "Tool '$name' release URL must use HTTPS."
    }
    if ($uri.Host -ne 'github.com') {
        throw "Tool '$name' release URL host must be exactly 'github.com'."
    }
    $expectedPath = "/$($script:PinnedRepos[$name])/releases/download/v$($script:PinnedVersions[$name])"
    $actualPath = $uri.AbsolutePath.TrimEnd('/')
    if ($actualPath -ne $expectedPath) {
        throw "Tool '$name' release URL path '$actualPath' must be exactly '$expectedPath'."
    }

    $args = @($Tool.versionArguments)
    if ($args.Count -lt 1 -or ($args | Where-Object { "$_" -notmatch '^\S+$' })) {
        throw "Tool '$name' versionArguments must be a non-empty list of single-token strings."
    }
    if ([string]::IsNullOrWhiteSpace("$($Tool.versionPattern)")) {
        throw "Tool '$name' is missing versionPattern."
    }

    $hasSigstore = ($Tool.PSObject.Properties.Name -contains 'sigstore')
    $sigstore = if ($hasSigstore) { $Tool.PSObject.Properties['sigstore'].Value } else { $null }
    if ($name -eq 'trivy') {
        if (-not $hasSigstore) {
            throw "Tool 'trivy' is missing required Sigstore verification metadata."
        }
        Test-SigstoreDefinition -Tool $Tool -Sigstore $sigstore
    } elseif ($hasSigstore) {
        throw "Tool '$name' must not declare Sigstore metadata; only trivy may."
    }

    $hasPlatforms = ($Tool.PSObject.Properties.Name -contains 'platforms')
    if (-not $hasPlatforms) {
        throw "Tool '$name' is missing 'platforms'."
    }
    $platforms = $Tool.PSObject.Properties['platforms'].Value
    Assert-NoExtraProperties -Object $platforms -Allowed $script:SupportedPlatforms -Context "Tool '$name' platforms"
    foreach ($platform in $script:SupportedPlatforms) {
        if ($null -eq $platforms.$platform) {
            throw "Tool '$name' is missing required platform mapping '$platform'."
        }
        Test-PlatformEntry -Tool $Tool -Platform $platform -Entry $platforms.$platform
    }
    return $true
}

function Test-ToolManifest {
    <#
    .SYNOPSIS
    Validates the supply-chain tool manifest against the committed rules
    (security/schemas/supply-chain-tools.schema.json semantics).
    Fails closed on any violation.
    #>
    param(
        [string]$ManifestPath = $script:DefaultManifestPath
    )
    $m = Read-ToolManifest -ManifestPath $ManifestPath
    Assert-NoExtraProperties -Object $m -Allowed @('schemaVersion', 'tools') -Context 'Manifest root'
    if ($m.schemaVersion -ne 1) {
        throw "Unsupported manifest schemaVersion '$($m.schemaVersion)'; expected 1."
    }
    if ($null -eq $m.tools -or @($m.tools).Count -lt 1) {
        throw 'Manifest must contain at least one tool.'
    }
    $names = @($m.tools | ForEach-Object { "$($_.name)" })
    if ($names.Count -ne ($names | Select-Object -Unique).Count) {
        throw 'Duplicate tool names are not allowed in the manifest.'
    }
    foreach ($required in $script:PinnedRepos.Keys) {
        if ($required -notin $names) {
            throw "Required tool '$required' is missing from the manifest."
        }
    }
    foreach ($tool in @($m.tools)) {
        $null = Test-ToolDefinition -Tool $tool
    }
    return $true
}

# ----------------------------------------------------------------------------------
# Platform and tool definition resolution
# ----------------------------------------------------------------------------------

function Resolve-SupportedPlatform {
    <#
    .SYNOPSIS
    Resolves the current OS/architecture to a supported platform id.
    Only windows-x64 and linux-x64 are supported; everything else fails closed.
    #>
    # RuntimeInformation is available in both Windows PowerShell 5.1 and
    # PowerShell 7+.  It avoids depending on the PowerShell 7-only
    # $IsWindows/$IsLinux automatic variables or a caller-provided OS
    # environment variable.
    $runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
    $runningOnLinux = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Linux)
    if (-not ($runningOnWindows -or $runningOnLinux)) {
        throw 'Unsupported operating system for supply-chain tool bootstrap.'
    }
    if ([System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture -ne [System.Runtime.InteropServices.Architecture]::X64) {
        throw 'Only x64 processes are supported for supply-chain tool bootstrap.'
    }
    if ($runningOnWindows) { return 'windows-x64' }
    return 'linux-x64'
}

function Get-ToolCacheDirectory {
    param(
        [Parameter(Mandatory)][string]$ToolsRoot,
        [Parameter(Mandatory)][string]$ToolName,
        [Parameter(Mandatory)][string]$Version,
        [Parameter(Mandatory)][string]$Platform
    )
    return Join-Path (Join-Path (Join-Path $ToolsRoot $ToolName) $Version) $Platform
}

function Get-TarCommand {
    # $IsWindows does not exist in Windows PowerShell 5.1 and StrictMode turns
    # that otherwise harmless probe into a terminating error.
    $runningOnWindows = $env:OS -eq 'Windows_NT'
    if ($PSVersionTable.PSVersion.Major -ge 6) {
        $runningOnWindows = $IsWindows
    }
    $commandName = if ($runningOnWindows) { 'tar.exe' } else { 'tar' }
    $command = Get-Command $commandName -ErrorAction SilentlyContinue
    if ($null -eq $command) {
        throw "$commandName is required to inspect or extract .tar.gz archives."
    }
    return $command.Source
}

function Set-ToolExecutablePermission {
    param(
        [Parameter(Mandatory)][string]$Path
    )
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Executable permission target was not found: $Path"
    }
    $runningOnLinux = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Linux)
    if (-not $runningOnLinux) { return }
    $chmod = Get-Command chmod -ErrorAction SilentlyContinue
    if ($null -eq $chmod) { throw 'chmod is required to prepare Linux tool executables.' }
    & $chmod.Source '+x' '--' $Path
    if ($LASTEXITCODE -ne 0) { throw 'Failed to mark Linux tool executable.' }
}

function Get-ExpectedToolDefinition {
    <#
    .SYNOPSIS
    Returns the validated, resolved tool definition for one tool/platform pair.
    #>
    param(
        [Parameter(Mandatory)][string]$ToolName,
        [Parameter(Mandatory)][string]$Platform,
        [string]$ManifestPath = $script:DefaultManifestPath
    )
    if ($Platform -notin $script:SupportedPlatforms) {
        throw "Unsupported platform '$Platform'."
    }
    $null = Test-ToolManifest -ManifestPath $ManifestPath
    $m = Read-ToolManifest -ManifestPath $ManifestPath
    $tool = @($m.tools) | Where-Object { "$($_.name)" -eq $ToolName } | Select-Object -First 1
    if ($null -eq $tool) {
        throw "Tool '$ToolName' is not present in the manifest."
    }
    $entry = $tool.platforms.$Platform
    $hasSigstore = ($tool.PSObject.Properties.Name -contains 'sigstore')
    $sigstore = if ($hasSigstore) { $tool.PSObject.Properties['sigstore'].Value } else { $null }
    $hasPurpose = ($tool.PSObject.Properties.Name -contains 'purpose')
    $purpose = if ($hasPurpose) { "$($tool.PSObject.Properties['purpose'].Value)" } else { $null }
    $def = [pscustomobject]@{
        Name                    = "$($tool.name)"
        Version                 = "$($tool.version)"
        OfficialReleaseBaseUrl  = "$($tool.officialReleaseBaseUrl)"
        VersionArguments        = @($tool.versionArguments)
        VersionPattern          = "$($tool.versionPattern)"
        Purpose                 = $purpose
        Platform                = $Platform
        AssetName               = "$($entry.assetName)"
        Sha256                  = "$($entry.sha256)"
        ArchiveType             = "$($entry.archiveType)"
        ExecutableName          = "$($entry.executableName)"
        BundleAssetSuffix       = if ($hasSigstore) { "$($sigstore.bundleAssetSuffix)" } else { $null }
        CertificateOidcIssuer   = if ($hasSigstore) { "$($sigstore.certificateOidcIssuer)" } else { $null }
        CertificateIdentity     = if ($hasSigstore) { "$($sigstore.certificateIdentity)" } else { $null }
        ReleaseUrl              = ($tool.officialReleaseBaseUrl.TrimEnd('/') + '/' + $entry.assetName)
    }
    return $def
}

# ----------------------------------------------------------------------------------
# Checksum verification
# ----------------------------------------------------------------------------------

function Get-FileSha256 {
    param(
        [Parameter(Mandatory)][string]$Path
    )
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "File not found for hashing: $Path"
    }
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $stream = [System.IO.File]::OpenRead($Path)
        try {
            $hash = $sha.ComputeHash($stream)
        } finally {
            $stream.Dispose()
        }
    } finally {
        $sha.Dispose()
    }
    return ([System.BitConverter]::ToString($hash)).Replace('-', '').ToLowerInvariant()
}

function Assert-ExpectedSha256 {
    <#
    .SYNOPSIS
    Fails closed when the file does not exist or its SHA-256 differs from the
    committed digest. Nothing is executed on a mismatch.
    #>
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$ExpectedSha256
    )
    if ("$ExpectedSha256" -notmatch '^[a-fA-F0-9]{64}$') {
        throw 'Refusing to verify against a malformed expected SHA-256.'
    }
    $actual = Get-FileSha256 -Path $Path
    if (-not [string]::Equals($actual, "$ExpectedSha256".ToLowerInvariant(), [System.StringComparison]::Ordinal)) {
        throw "Checksum mismatch for '$Path': expected $($ExpectedSha256.ToLowerInvariant()), got $actual."
    }
}

# ----------------------------------------------------------------------------------
# Archive safety
# ----------------------------------------------------------------------------------

function Assert-SafeArchiveEntries {
    <#
    .SYNOPSIS
    Rejects archives with absolute paths, drive-qualified paths, or '..' traversal
    entries before extraction.
    #>
    param(
        [Parameter(Mandatory)][string]$ArchivePath,
        [Parameter(Mandatory)][string]$ArchiveType
    )
    if (-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)) {
        throw "Archive not found: $ArchivePath"
    }
    $entries = New-Object System.Collections.Generic.List[string]
    if ($ArchiveType -eq 'zip') {
        Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop
        $zip = [System.IO.Compression.ZipFile]::OpenRead($ArchivePath)
        try {
            foreach ($entry in $zip.Entries) { $entries.Add($entry.FullName) }
        } finally {
            $zip.Dispose()
        }
    } elseif ($ArchiveType -eq 'tar.gz') {
        $tarPath = Get-TarCommand
        $listed = @(& $tarPath -tzf $ArchivePath 2>$null)
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to list archive entries for '$ArchivePath'."
        }
        foreach ($line in $listed) { $entries.Add([string]$line) }
    } elseif ($ArchiveType -eq 'binary') {
        if ((Get-Item -LiteralPath $ArchivePath).Length -le 0) {
            throw "Binary asset '$ArchivePath' is empty."
        }
        return
    } else {
        throw "Unsupported archive type '$ArchiveType'."
    }
    foreach ($entry in $entries) {
        $normalized = ([string]$entry).Replace('\', '/')
        if ($normalized.StartsWith('/')) {
            throw "Unsafe archive entry '$entry' (absolute path)."
        }
        if ($normalized -match '^[A-Za-z]:') {
            throw "Unsafe archive entry '$entry' (drive-qualified path)."
        }
        foreach ($part in ($normalized -split '/')) {
            if ($part -eq '..') {
                throw "Unsafe archive entry '$entry' (path traversal)."
            }
        }
    }
    if ($entries.Count -lt 1) {
        throw "Archive '$ArchivePath' contains no entries."
    }
}

function Assert-PathWithinRoot {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Root
    )
    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $fullRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd('\', '/')
    if (-not $fullPath.StartsWith($fullRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Resolved path '$fullPath' is outside expected root '$fullRoot'."
    }
}

function Expand-VerifiedToolArchive {
    <#
    .SYNOPSIS
    Validates entries, extracts into a fresh directory, and returns the expected
    executable path only when it resolves strictly inside that directory.
    #>
    param(
        [Parameter(Mandatory)][string]$ArchivePath,
        [Parameter(Mandatory)][string]$ArchiveType,
        [Parameter(Mandatory)][string]$DestinationPath,
        [Parameter(Mandatory)][string]$ExpectedExecutableName
    )
    Assert-SafeArchiveEntries -ArchivePath $ArchivePath -ArchiveType $ArchiveType
    if (Test-Path -LiteralPath $DestinationPath) {
        throw "Extraction destination already exists: $DestinationPath"
    }
    New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
    try {
        if ($ArchiveType -eq 'zip') {
            Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop
            [System.IO.Compression.ZipFile]::ExtractToDirectory($ArchivePath, $DestinationPath)
        } elseif ($ArchiveType -eq 'tar.gz') {
            $tarPath = Get-TarCommand
            & $tarPath -xzf $ArchivePath -C $DestinationPath
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to extract archive '$ArchivePath'."
            }
        } else {
            throw "Archive type '$ArchiveType' cannot be expanded."
        }
        $found = @(Get-ChildItem -LiteralPath $DestinationPath -Recurse -File | Where-Object { $_.Name -eq $ExpectedExecutableName })
        if ($found.Count -lt 1) {
            throw "Archive '$ArchivePath' does not contain expected executable '$ExpectedExecutableName'."
        }
        if ($found.Count -ne 1) {
            throw "Archive '$ArchivePath' contains multiple expected executables named '$ExpectedExecutableName'."
        }
        $executable = $found[0]
        Assert-PathWithinRoot -Path $executable.FullName -Root $DestinationPath
        return $executable.FullName
    } catch {
        Remove-Item -LiteralPath $DestinationPath -Recurse -Force -ErrorAction SilentlyContinue
        throw
    }
}

# ----------------------------------------------------------------------------------
# Executable version verification
# ----------------------------------------------------------------------------------

function Assert-ToolVersion {
    <#
    .SYNOPSIS
    Runs the pinned executable's version command and fails closed when the exit
    code is non-zero or the output does not match the committed version pattern.
    #>
    param(
        [Parameter(Mandatory)][string]$ExecutablePath,
        [Parameter(Mandatory)][string[]]$VersionArguments,
        [Parameter(Mandatory)][string]$VersionPattern
    )
    if (-not (Test-Path -LiteralPath $ExecutablePath -PathType Leaf)) {
        throw "Executable not found: $ExecutablePath"
    }
    $output = (& $ExecutablePath @VersionArguments 2>&1 | Out-String)
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "Executable '$ExecutablePath' exited with code $exitCode during version check."
    }
    if ($output -notmatch $VersionPattern) {
        throw "Executable '$ExecutablePath' version output does not match expected pattern '$VersionPattern'."
    }
}

# ----------------------------------------------------------------------------------
# Verified download cache
# ----------------------------------------------------------------------------------

function Assert-SafeTempPath {
    param(
        [Parameter(Mandatory)][string]$Path
    )
    $full = [System.IO.Path]::GetFullPath($Path)
    $temp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if (-not $full.StartsWith($temp, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove path outside OS temp: '$full'."
    }
    if ($full -notmatch 'auction-promax') {
        throw "Refusing to remove non-auction-promax temp path: '$full'."
    }
}

function Assert-SafeCachePath {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$ToolsRoot
    )
    $full = [System.IO.Path]::GetFullPath($Path)
    $root = [System.IO.Path]::GetFullPath($ToolsRoot)
    if (-not $full.StartsWith($root + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to delete cache path outside tools root: '$full'."
    }
    $relative = $full.Substring($root.Length).Trim('\', '/')
    $segments = @($relative -split '[\\/]' | Where-Object { $_ -ne '' })
    if ($segments.Count -ne 3 -or
        $segments[0] -notmatch '^[a-z0-9-]+$' -or
        $segments[1] -notmatch '^[0-9]+\.[0-9]+\.[0-9]+$' -or
        $segments[2] -notmatch '^[a-z0-9-]+$') {
        throw "Refusing to delete unexpected cache path '$full'."
    }
}

function Get-VerifiedExecutableSha256FromAsset {
    param(
        [Parameter(Mandatory)]$Definition,
        [Parameter(Mandatory)][string]$AssetPath
    )
    Assert-ExpectedSha256 -Path $AssetPath -ExpectedSha256 $Definition.Sha256
    if ($Definition.ArchiveType -eq 'binary') {
        return Get-FileSha256 -Path $AssetPath
    }

    $workDir = Join-Path ([System.IO.Path]::GetTempPath()) ("auction-promax-cache-verify-" + [guid]::NewGuid().ToString('N'))
    try {
        $executablePath = Expand-VerifiedToolArchive -ArchivePath $AssetPath -ArchiveType $Definition.ArchiveType -DestinationPath $workDir -ExpectedExecutableName $Definition.ExecutableName
        return Get-FileSha256 -Path $executablePath
    } finally {
        if (Test-Path -LiteralPath $workDir) {
            Assert-SafeTempPath -Path $workDir
            Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

function Test-TrivyProvenance {
    param(
        [Parameter(Mandatory)][string]$CosignPath,
        [Parameter(Mandatory)][string]$AssetPath,
        [Parameter(Mandatory)][string]$BundlePath,
        [Parameter(Mandatory)][string]$CertificateOidcIssuer,
        [Parameter(Mandatory)][string]$CertificateIdentity,
        [bool]$RefreshTrustedRoot = $true,
        [ValidateRange(1, 3)][int]$InitializeAttempts = 3
    )
    foreach ($requiredFile in @($CosignPath, $AssetPath, $BundlePath)) {
        if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
            throw 'Trivy provenance verification input was not found.'
        }
    }
    # Cosign stores TUF material below USERPROFILE on Windows and HOME elsewhere.
    # Redirect only the child-process home to ignored repository tooling storage.
    # Production checks refresh the root; deterministic cached-tool tests may
    # verify against an already materialized trusted root without network I/O.
    $sigstoreHome = Join-Path $script:DefaultToolsRoot 'sigstore-home'
    $trustedRoot = Join-Path $sigstoreHome '.sigstore\root\tuf-repo-cdn.sigstore.dev\targets\trusted_root.json'
    $runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
    $previousHome = if ($runningOnWindows) { $env:USERPROFILE } else { $env:HOME }
    New-Item -ItemType Directory -Path $sigstoreHome -Force | Out-Null
    if ($runningOnWindows) { $env:USERPROFILE = $sigstoreHome } else { $env:HOME = $sigstoreHome }
    # Windows PowerShell 5.1 wraps native stderr as ErrorRecord objects. Cosign
    # writes its successful "Verified OK" status to stderr, so Stop would turn a
    # genuine exit-code 0 verification into a false failure. Capture and suppress
    # all native output, then make the fail-closed decision from the exit code.
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $nativeOutput = @()
        if ($RefreshTrustedRoot) {
            $initializeExitCode = 1
            foreach ($attempt in 1..$InitializeAttempts) {
                $nativeOutput += @(& $CosignPath initialize 2>&1)
                $initializeExitCode = $LASTEXITCODE
                if ($initializeExitCode -eq 0 -and (Test-Path -LiteralPath $trustedRoot -PathType Leaf)) { break }
                if ($attempt -lt $InitializeAttempts) { Start-Sleep -Seconds @(2, 5)[$attempt - 1] }
            }
            if ($initializeExitCode -ne 0 -or -not (Test-Path -LiteralPath $trustedRoot -PathType Leaf)) {
                throw 'Trivy trusted-root refresh failed.'
            }
        } elseif (-not (Test-Path -LiteralPath $trustedRoot -PathType Leaf)) {
            throw 'Trivy trusted root is unavailable for offline provenance verification.'
        }
        $nativeOutput += @(& $CosignPath verify-blob $AssetPath --bundle $BundlePath --trusted-root $trustedRoot --certificate-oidc-issuer $CertificateOidcIssuer --certificate-identity $CertificateIdentity 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
        if ($runningOnWindows) { $env:USERPROFILE = $previousHome } else { $env:HOME = $previousHome }
    }
    $null = $nativeOutput
    if ($exitCode -ne 0) {
        throw 'Trivy release provenance verification failed.'
    }
    return [pscustomobject]@{
        Passed = $true
        IssuerMatched = $true
        CertificateIdentityMatched = $true
    }
}

function Assert-CachedTool {
    <#
    .SYNOPSIS
    A cache hit is only valid when the committed archive SHA-256, the executable
    version output, and the recorded executable digest all still match.
    #>
    param(
        [Parameter(Mandatory)]$Definition,
        [Parameter(Mandatory)][string]$CacheDir,
        [switch]$SkipVersion
    )
    if (-not (Test-Path -LiteralPath $CacheDir -PathType Container)) {
        throw "Tool cache directory not found: $CacheDir"
    }
    $partialFiles = @(Get-ChildItem -LiteralPath $CacheDir -Force | Where-Object { $_.Name -match '\.partial$' })
    if ($partialFiles.Count -gt 0) {
        throw "Tool cache contains partial download artifact '$($partialFiles[0].Name)'. Explicit reinstall required."
    }
    $assetPath = Join-Path $CacheDir $Definition.AssetName
    if (-not (Test-Path -LiteralPath $assetPath -PathType Leaf)) {
        throw "Cached asset not found: $assetPath. Explicit reinstall required."
    }
    Assert-ExpectedSha256 -Path $assetPath -ExpectedSha256 $Definition.Sha256
    $exePath = Join-Path $CacheDir $Definition.ExecutableName
    if (-not (Test-Path -LiteralPath $exePath -PathType Leaf)) {
        throw "Cached executable not found: $exePath. Explicit reinstall required."
    }
    $expectedExecutableSha256 = Get-VerifiedExecutableSha256FromAsset -Definition $Definition -AssetPath $assetPath
    $actualExecutableSha256 = Get-FileSha256 -Path $exePath
    if (-not [string]::Equals($expectedExecutableSha256, $actualExecutableSha256, [System.StringComparison]::Ordinal)) {
        throw 'Cached executable integrity does not match the committed, verified release asset.'
    }
    if (-not $SkipVersion) {
        Assert-ToolVersion -ExecutablePath $exePath -VersionArguments $Definition.VersionArguments -VersionPattern $Definition.VersionPattern
    }
    return $exePath
}

function Get-VerifiedTool {
    <#
    .SYNOPSIS
    Downloads a pinned asset from its official release URL, verifies the committed
    SHA-256 before anything is extracted or executed, validates archive entries,
    verifies the executable version, and moves everything into the exact cache
    directory. A corrupted cache fails closed and requires explicit reinstall.
    #>
    param(
        [Parameter(Mandatory)][string]$ToolName,
        [Parameter(Mandatory)][string]$Platform,
        [string]$ManifestPath = $script:DefaultManifestPath,
        [string]$ToolsRoot = $script:DefaultToolsRoot,
        [string]$VerifiedCosignPath,
        [switch]$VerifyOnly,
        [switch]$ForceReinstall
    )
    $def = Get-ExpectedToolDefinition -ToolName $ToolName -Platform $Platform -ManifestPath $ManifestPath
    $cacheDir = Get-ToolCacheDirectory -ToolsRoot $ToolsRoot -ToolName $def.Name -Version $def.Version -Platform $Platform
    if ($VerifyOnly) {
        $cachedExecutable = Assert-CachedTool -Definition $def -CacheDir $cacheDir -SkipVersion:($def.Name -eq 'trivy')
        if ($def.Name -eq 'trivy') {
            if ([string]::IsNullOrWhiteSpace($VerifiedCosignPath)) {
                throw 'Trivy provenance verification is required before execution.'
            }
            $bundlePath = Join-Path $cacheDir ($def.AssetName + $def.BundleAssetSuffix)
            $null = Test-TrivyProvenance -CosignPath $VerifiedCosignPath -AssetPath (Join-Path $cacheDir $def.AssetName) -BundlePath $bundlePath -CertificateOidcIssuer $def.CertificateOidcIssuer -CertificateIdentity $def.CertificateIdentity
            Assert-ToolVersion -ExecutablePath $cachedExecutable -VersionArguments $def.VersionArguments -VersionPattern $def.VersionPattern
        }
        return $cachedExecutable
    }
    if (Test-Path -LiteralPath $cacheDir) {
        if ($ForceReinstall) {
            Assert-SafeCachePath -Path $cacheDir -ToolsRoot $ToolsRoot
            Remove-Item -LiteralPath $cacheDir -Recurse -Force
        } else {
            try {
                $cachedExecutable = Assert-CachedTool -Definition $def -CacheDir $cacheDir -SkipVersion:($def.Name -eq 'trivy')
                if ($def.Name -eq 'trivy') {
                    if ([string]::IsNullOrWhiteSpace($VerifiedCosignPath)) {
                        throw 'Trivy provenance verification is required before execution.'
                    }
                    $bundlePath = Join-Path $cacheDir ($def.AssetName + $def.BundleAssetSuffix)
                    $null = Test-TrivyProvenance -CosignPath $VerifiedCosignPath -AssetPath (Join-Path $cacheDir $def.AssetName) -BundlePath $bundlePath -CertificateOidcIssuer $def.CertificateOidcIssuer -CertificateIdentity $def.CertificateIdentity
                    Assert-ToolVersion -ExecutablePath $cachedExecutable -VersionArguments $def.VersionArguments -VersionPattern $def.VersionPattern
                }
                return $cachedExecutable
            } catch {
                throw "Cached tool '$($def.Name)' failed integrity checks: $($_.Exception.Message) Explicit reinstall required (-ForceReinstall)."
            }
        }
    }
    $workDir = Join-Path ([System.IO.Path]::GetTempPath()) ("auction-promax-tool-install-" + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $workDir -Force | Out-Null
    try {
        $downloadPath = Join-Path $workDir ($def.AssetName + '.partial')
        $finalPath = Join-Path $workDir $def.AssetName
        Invoke-WebRequest -Uri $def.ReleaseUrl -OutFile $downloadPath
        if ((Get-Item -LiteralPath $downloadPath).Length -le 0) {
            throw "Downloaded asset is empty: $($def.AssetName)"
        }
        # Fail-closed checksum verification happens BEFORE anything is extracted or executed.
        Assert-ExpectedSha256 -Path $downloadPath -ExpectedSha256 $def.Sha256
        Move-Item -LiteralPath $downloadPath -Destination $finalPath -Force
        $bundlePath = $null
        if ($def.BundleAssetSuffix) {
            if ([string]::IsNullOrWhiteSpace($VerifiedCosignPath)) {
                throw 'Trivy provenance verification is required before execution.'
            }
            $bundleName = $def.AssetName + $def.BundleAssetSuffix
            $bundlePath = Join-Path $workDir $bundleName
            Invoke-WebRequest -Uri ($def.OfficialReleaseBaseUrl.TrimEnd('/') + '/' + $bundleName) -OutFile $bundlePath
            if ((Get-Item -LiteralPath $bundlePath).Length -le 0) {
                throw "Downloaded Sigstore bundle is empty: $bundleName"
            }
            $null = Test-TrivyProvenance -CosignPath $VerifiedCosignPath -AssetPath $finalPath -BundlePath $bundlePath -CertificateOidcIssuer $def.CertificateOidcIssuer -CertificateIdentity $def.CertificateIdentity
        }
        $exePath = $null
        if ($def.ArchiveType -eq 'binary') {
            $exePath = Join-Path $workDir $def.ExecutableName
            Copy-Item -LiteralPath $finalPath -Destination $exePath
        } else {
            $extractDir = Join-Path $workDir 'extract'
            $exePath = Expand-VerifiedToolArchive -ArchivePath $finalPath -ArchiveType $def.ArchiveType -DestinationPath $extractDir -ExpectedExecutableName $def.ExecutableName
        }
        Set-ToolExecutablePermission -Path $exePath
        Assert-ToolVersion -ExecutablePath $exePath -VersionArguments $def.VersionArguments -VersionPattern $def.VersionPattern
        New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
        Move-Item -LiteralPath $finalPath -Destination (Join-Path $cacheDir $def.AssetName) -Force
        Move-Item -LiteralPath $exePath -Destination (Join-Path $cacheDir $def.ExecutableName) -Force
        if ($bundlePath) {
            Move-Item -LiteralPath $bundlePath -Destination (Join-Path $cacheDir (Split-Path -Leaf $bundlePath)) -Force
        }
        $metadata = [pscustomobject]@{
            tool = $def.Name
            version = $def.Version
            platform = $def.Platform
            assetName = $def.AssetName
            assetSha256 = $def.Sha256
            executableName = $def.ExecutableName
            executableSha256 = (Get-FileSha256 -Path (Join-Path $cacheDir $def.ExecutableName))
            installedAtUtc = [System.DateTime]::UtcNow.ToString('o')
        }
        $metadata | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $cacheDir 'cache-metadata.json') -Encoding ascii -NoNewline
        return Assert-CachedTool -Definition $def -CacheDir $cacheDir
    } finally {
        if (Test-Path -LiteralPath $workDir) {
            Assert-SafeTempPath -Path $workDir
            Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Export-ModuleMember -Function @(
    'Read-ToolManifest',
    'Test-ToolManifest',
    'Test-ToolDefinition',
    'Test-PlatformEntry',
    'Test-SigstoreDefinition',
    'Resolve-SupportedPlatform',
    'Get-ToolCacheDirectory',
    'Get-TarCommand',
    'Set-ToolExecutablePermission',
    'Get-ExpectedToolDefinition',
    'Get-FileSha256',
    'Assert-ExpectedSha256',
    'Assert-SafeArchiveEntries',
    'Assert-PathWithinRoot',
    'Expand-VerifiedToolArchive',
    'Assert-ToolVersion',
    'Assert-SafeTempPath',
    'Assert-SafeCachePath',
    'Get-VerifiedExecutableSha256FromAsset',
    'Test-TrivyProvenance',
    'Assert-CachedTool',
    'Get-VerifiedTool'
)
