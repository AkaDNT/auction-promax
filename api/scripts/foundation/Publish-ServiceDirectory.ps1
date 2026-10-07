[CmdletBinding()]
param(
    [string] $StagePath,
    [string] $DestinationPath,
    [string] $ServicesRoot
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-ServicePublisherFullPath([string] $Path) {
    $full = [IO.Path]::GetFullPath($Path)
    $root = [IO.Path]::GetPathRoot($full)
    if ($full.Length -gt $root.Length) {
        $full = $full.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
    }
    return $full
}

function Test-ServicePublisherPathEqual([string] $Left, [string] $Right) {
    if ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT) {
        return [string]::Equals($Left, $Right, [StringComparison]::OrdinalIgnoreCase)
    }
    return [string]::Equals($Left, $Right, [StringComparison]::Ordinal)
}

function Get-ServicePublisherEntry([string] $Path) {
    try {
        return Get-Item -LiteralPath $Path -Force -ErrorAction Stop
    } catch [System.Management.Automation.ItemNotFoundException] {
        return $null
    } catch [System.IO.FileNotFoundException] {
        return $null
    } catch [System.IO.DirectoryNotFoundException] {
        return $null
    }
}

function Assert-ServicePublisherNoLinkAncestors([string] $Path) {
    $cursor = Get-ServicePublisherFullPath $Path
    while ($true) {
        $entry = Get-ServicePublisherEntry $cursor
        if ($null -eq $entry) { throw 'PATH_UNSAFE' }
        if (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw 'LINK_REJECTED'
        }

        $parent = [IO.Directory]::GetParent($cursor)
        if ($null -eq $parent) { break }
        $next = Get-ServicePublisherFullPath $parent.FullName
        if (Test-ServicePublisherPathEqual $next $cursor) { break }
        $cursor = $next
    }
}

function Publish-ServiceDirectory {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][string] $StagePath,
        [Parameter(Mandatory = $true)][string] $DestinationPath,
        [Parameter(Mandatory = $true)][string] $ServicesRoot
    )

    try {
        $root = Get-ServicePublisherFullPath $ServicesRoot
        $stage = Get-ServicePublisherFullPath $StagePath
        $destination = Get-ServicePublisherFullPath $DestinationPath

        Assert-ServicePublisherNoLinkAncestors $root
        $rootEntry = Get-ServicePublisherEntry $root
        if ($null -eq $rootEntry -or -not $rootEntry.PSIsContainer) { throw 'PATH_UNSAFE' }

        $stageParent = [IO.Directory]::GetParent($stage)
        $destinationParent = [IO.Directory]::GetParent($destination)
        if ($null -eq $stageParent -or $null -eq $destinationParent -or
            -not (Test-ServicePublisherPathEqual (Get-ServicePublisherFullPath $stageParent.FullName) $root) -or
            -not (Test-ServicePublisherPathEqual (Get-ServicePublisherFullPath $destinationParent.FullName) $root)) {
            throw 'PATH_UNSAFE'
        }

        $stageName = [IO.Path]::GetFileName($stage)
        $destinationName = [IO.Path]::GetFileName($destination)
        if ($stageName -notmatch '^\.foundation-stage-[0-9a-f]{32}$' -or
            $destinationName -notmatch '^[a-z][a-z0-9-]{0,62}$') {
            throw 'PATH_UNSAFE'
        }

        $stageEntry = Get-ServicePublisherEntry $stage
        if ($null -eq $stageEntry -or -not $stageEntry.PSIsContainer) { throw 'PUBLICATION_FAILED' }
        Assert-ServicePublisherNoLinkAncestors $stage

        # Recheck immediately before the single no-replace move. A destination
        # link is rejected even when its target is dangling.
        $destinationEntry = Get-ServicePublisherEntry $destination
        if ($null -ne $destinationEntry) {
            if (($destinationEntry.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
                throw 'LINK_REJECTED'
            }
            throw 'DESTINATION_EXISTS'
        }

        try {
            [IO.Directory]::Move($stage, $destination)
        } catch [System.IO.IOException] {
            $stageAfterFailure = Get-ServicePublisherEntry $stage
            $destinationAfterFailure = Get-ServicePublisherEntry $destination
            if ($null -ne $stageAfterFailure -and $null -ne $destinationAfterFailure) {
                if (($destinationAfterFailure.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
                    throw 'LINK_REJECTED'
                }
                throw 'DESTINATION_EXISTS'
            }
            throw 'PUBLICATION_FAILED'
        } catch {
            throw 'PUBLICATION_FAILED'
        }

        return 'SERVICE_DIRECTORY_PUBLISHED'
    } catch {
        $code = $_.Exception.Message
        if ($code -in @('PATH_UNSAFE', 'LINK_REJECTED', 'DESTINATION_EXISTS', 'PUBLICATION_FAILED')) {
            throw $code
        }
        throw 'PUBLICATION_FAILED'
    }
}

if ($MyInvocation.InvocationName -ne '.') {
    try {
        Publish-ServiceDirectory -StagePath $StagePath -DestinationPath $DestinationPath -ServicesRoot $ServicesRoot | Out-Null
        exit 0
    } catch {
        $code = $_.Exception.Message
        if ($code -notin @('PATH_UNSAFE', 'LINK_REJECTED', 'DESTINATION_EXISTS', 'PUBLICATION_FAILED')) {
            $code = 'PUBLICATION_FAILED'
        }
        [Console]::Error.WriteLine($code)
        exit 1
    }
}
