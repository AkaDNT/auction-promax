$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot 'Publish-ServiceDirectory.ps1')

$fixtureRoot = Join-Path ([IO.Path]::GetTempPath()) ('foundation-publisher-' + [Guid]::NewGuid().ToString('N'))
$services = Join-Path $fixtureRoot 'api/services'
[void][IO.Directory]::CreateDirectory($services)
$passed = 0

function Assert-True([bool] $Condition, [string] $Code) {
    if (-not $Condition) { throw $Code }
}

function New-Stage {
    $stage = Join-Path $services ('.foundation-stage-' + [Guid]::NewGuid().ToString('N'))
    [void][IO.Directory]::CreateDirectory($stage)
    [IO.File]::WriteAllText((Join-Path $stage 'sentinel.txt'), 'complete-stage')
    return $stage
}

function Assert-Rejected([scriptblock] $Operation, [string] $Code) {
    $observed = ''
    try { & $Operation | Out-Null } catch { $observed = $_.Exception.Message }
    Assert-True ($observed -eq $Code) ('EXPECTED_' + $Code + '_GOT_' + $observed)
}

function Remove-FixtureDirectoryLink([string] $Path) {
    $full = [IO.Path]::GetFullPath($Path)
    $prefix = [IO.Path]::GetFullPath($fixtureRoot).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    Assert-True ($full.StartsWith($prefix, [StringComparison]::Ordinal)) 'FIXTURE_LINK_OUTSIDE_ROOT'
    $entry = Get-Item -LiteralPath $full -Force
    Assert-True (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) 'FIXTURE_NOT_A_LINK'
    # Delete the link itself, never its contents; PS5.1 Remove-Item prompts for nonempty junctions.
    [IO.Directory]::Delete($full, $false)
}

try {
    $destination = Join-Path $services 'auction-service'
    $stage = New-Stage
    $result = Publish-ServiceDirectory -StagePath $stage -DestinationPath $destination -ServicesRoot $services
    Assert-True ($result -eq 'SERVICE_DIRECTORY_PUBLISHED') 'SUCCESS_RESULT_INVALID'
    Assert-True (-not [IO.Directory]::Exists($stage)) 'STAGE_NOT_MOVED'
    Assert-True ([IO.File]::ReadAllText((Join-Path $destination 'sentinel.txt')) -eq 'complete-stage') 'PUBLISHED_TREE_INCOMPLETE'
    $passed++

    foreach ($kind in @('empty', 'nonempty', 'file')) {
        $target = Join-Path $services ('bidding-service')
        if ($kind -eq 'file') { [IO.File]::WriteAllText($target, 'existing-file') }
        else {
            [void][IO.Directory]::CreateDirectory($target)
            if ($kind -eq 'nonempty') { [IO.File]::WriteAllText((Join-Path $target 'owned.txt'), 'existing-owner') }
        }
        $stage = New-Stage
        Assert-Rejected { Publish-ServiceDirectory -StagePath $stage -DestinationPath $target -ServicesRoot $services } 'DESTINATION_EXISTS'
        Assert-True ([IO.File]::ReadAllText((Join-Path $stage 'sentinel.txt')) -eq 'complete-stage') 'COLLISION_CHANGED_STAGE'
        if ($kind -eq 'file') {
            Assert-True ([IO.File]::Exists($target)) 'COLLISION_REMOVED_FILE'
        } else {
            Assert-True ([IO.Directory]::Exists($target)) 'COLLISION_REMOVED_DIRECTORY'
        }
        if ($kind -eq 'file') {
            Assert-True ([IO.File]::ReadAllText($target) -eq 'existing-file') 'COLLISION_CHANGED_FILE'
            [IO.File]::Delete($target)
        } else {
            Assert-True (-not [IO.File]::Exists((Join-Path $target 'sentinel.txt'))) 'COLLISION_MERGED_TREE'
            if ($kind -eq 'nonempty') { Assert-True ([IO.File]::ReadAllText((Join-Path $target 'owned.txt')) -eq 'existing-owner') 'COLLISION_CHANGED_OWNER' }
            [IO.Directory]::Delete($target, $true)
        }
        $passed++
    }

    # Materialize the destination immediately before publication. Directory.Move
    # must reject this collision without changing either complete tree.
    $lateTarget = Join-Path $services 'billing-service'
    [void][IO.Directory]::CreateDirectory($lateTarget)
    [IO.File]::WriteAllText((Join-Path $lateTarget 'owner-sentinel.txt'), 'owner-tree')
    $stage = New-Stage
    Assert-Rejected { Publish-ServiceDirectory -StagePath $stage -DestinationPath $lateTarget -ServicesRoot $services } 'DESTINATION_EXISTS'
    Assert-True ([IO.File]::ReadAllText((Join-Path $lateTarget 'owner-sentinel.txt')) -eq 'owner-tree') 'LATE_COLLISION_CHANGED_DESTINATION'
    Assert-True ([IO.File]::ReadAllText((Join-Path $stage 'sentinel.txt')) -eq 'complete-stage') 'LATE_COLLISION_CHANGED_STAGE'
    [IO.Directory]::Delete($lateTarget, $true)
    $passed++

    $outsideTarget = Join-Path $fixtureRoot 'outside-target'
    [void][IO.Directory]::CreateDirectory($outsideTarget)
    $junctionTarget = Join-Path $services 'billing-service'
    if ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT) {
        New-Item -ItemType Junction -Path $junctionTarget -Target $outsideTarget | Out-Null
    } else {
        New-Item -ItemType SymbolicLink -Path $junctionTarget -Target $outsideTarget | Out-Null
    }
    $stage = New-Stage
    Assert-Rejected { Publish-ServiceDirectory -StagePath $stage -DestinationPath $junctionTarget -ServicesRoot $services } 'LINK_REJECTED'
    Assert-True ([IO.Directory]::Exists($outsideTarget) -and -not [IO.File]::Exists((Join-Path $outsideTarget 'sentinel.txt'))) 'JUNCTION_TARGET_CHANGED'
    Assert-True ((Get-Item -LiteralPath $junctionTarget -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) 'LINK_REMOVED'
    Assert-True ([IO.File]::ReadAllText((Join-Path $stage 'sentinel.txt')) -eq 'complete-stage') 'JUNCTION_REJECTION_CHANGED_STAGE'
    Remove-FixtureDirectoryLink $junctionTarget
    [IO.Directory]::Delete($outsideTarget, $true)
    $passed++

    if ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT) {
        $caseTarget = Join-Path $services 'auction-service'
        [void][IO.Directory]::CreateDirectory($caseTarget)
        [IO.File]::WriteAllText((Join-Path $caseTarget 'owner.txt'), 'case-owner')
        $stage = New-Stage
        $caseAlias = Join-Path $services 'AUCTION-SERVICE'
        Assert-Rejected { Publish-ServiceDirectory -StagePath $stage -DestinationPath $caseAlias -ServicesRoot $services } 'DESTINATION_EXISTS'
        Assert-True ([IO.File]::ReadAllText((Join-Path $caseTarget 'owner.txt')) -eq 'case-owner') 'CASE_ALIAS_CHANGED_DESTINATION'
        Assert-True ([IO.File]::ReadAllText((Join-Path $stage 'sentinel.txt')) -eq 'complete-stage') 'CASE_ALIAS_CHANGED_STAGE'
        [IO.Directory]::Delete($caseTarget, $true)
        $passed++

        $linkedServices = Join-Path $fixtureRoot 'linked-services'
        New-Item -ItemType Junction -Path $linkedServices -Target $services | Out-Null
        $stage = New-Stage
        $linkedStage = Join-Path $linkedServices ([IO.Path]::GetFileName($stage))
        Assert-Rejected { Publish-ServiceDirectory -StagePath $linkedStage -DestinationPath (Join-Path $linkedServices 'billing-service') -ServicesRoot $linkedServices } 'LINK_REJECTED'
        Assert-True ([IO.File]::ReadAllText((Join-Path $stage 'sentinel.txt')) -eq 'complete-stage') 'LINKED_ANCESTOR_CHANGED_STAGE'
        Remove-FixtureDirectoryLink $linkedServices
        $passed++
    } else {
        $dangling = Join-Path $services 'billing-service'
        New-Item -ItemType SymbolicLink -Path $dangling -Target (Join-Path $fixtureRoot 'target-does-not-exist') | Out-Null
        $stage = New-Stage
        Assert-Rejected { Publish-ServiceDirectory -StagePath $stage -DestinationPath $dangling -ServicesRoot $services } 'LINK_REJECTED'
        Assert-True ([IO.Directory]::Exists($stage) -and -not [IO.File]::Exists((Join-Path $stage 'owner.txt'))) 'DANGLING_LINK_CHANGED_STAGE'
        Remove-FixtureDirectoryLink $dangling
        $passed++

        $linkedServices = Join-Path $fixtureRoot 'linked-services'
        New-Item -ItemType SymbolicLink -Path $linkedServices -Target $services | Out-Null
        $stage = New-Stage
        $linkedStage = Join-Path $linkedServices ([IO.Path]::GetFileName($stage))
        Assert-Rejected { Publish-ServiceDirectory -StagePath $linkedStage -DestinationPath (Join-Path $linkedServices 'billing-service') -ServicesRoot $linkedServices } 'LINK_REJECTED'
        Assert-True ([IO.File]::ReadAllText((Join-Path $stage 'sentinel.txt')) -eq 'complete-stage') 'LINKED_ANCESTOR_CHANGED_STAGE'
        Remove-FixtureDirectoryLink $linkedServices
        $passed++
    }

    $raceDestination = Join-Path $services 'realtime-gateway'
    $raceStages = @((New-Stage), (New-Stage))
    [IO.File]::WriteAllText((Join-Path $raceStages[0] 'sentinel.txt'), 'writer-one')
    [IO.File]::WriteAllText((Join-Path $raceStages[1] 'sentinel.txt'), 'writer-two')
    $raceGate = Join-Path $fixtureRoot 'publish-race-go'
    $raceJobs = @()
    try {
        for ($index = 0; $index -lt 2; $index++) {
            $ready = Join-Path $fixtureRoot ('publish-race-ready-' + $index)
            $raceJobs += Start-Job -ArgumentList $PSScriptRoot, $raceStages[$index], $raceDestination, $services, $ready, $raceGate -ScriptBlock {
                param($ScriptRoot, $OwnedStage, $Target, $ServiceRoot, $ReadyFile, $GateFile)
                . (Join-Path $ScriptRoot 'Publish-ServiceDirectory.ps1')
                [IO.File]::WriteAllText($ReadyFile, 'ready')
                while (-not [IO.File]::Exists($GateFile)) { Start-Sleep -Milliseconds 10 }
                try { Publish-ServiceDirectory -StagePath $OwnedStage -DestinationPath $Target -ServicesRoot $ServiceRoot }
                catch { $_.Exception.Message }
            }
        }
        $deadline = [DateTime]::UtcNow.AddSeconds(15)
        while ([DateTime]::UtcNow -lt $deadline) {
            if ([IO.File]::Exists((Join-Path $fixtureRoot 'publish-race-ready-0')) -and
                [IO.File]::Exists((Join-Path $fixtureRoot 'publish-race-ready-1'))) { break }
            Start-Sleep -Milliseconds 20
        }
        Assert-True ([IO.File]::Exists((Join-Path $fixtureRoot 'publish-race-ready-0')) -and
            [IO.File]::Exists((Join-Path $fixtureRoot 'publish-race-ready-1'))) 'RACE_JOBS_NOT_READY'
        [IO.File]::WriteAllText($raceGate, 'go')
        $raceResults = @($raceJobs | Receive-Job -Wait)
        Assert-True (@($raceResults | Where-Object { $_ -eq 'SERVICE_DIRECTORY_PUBLISHED' }).Count -eq 1) 'RACE_DID_NOT_PUBLISH_EXACTLY_ONCE'
        Assert-True (@($raceResults | Where-Object { $_ -eq 'DESTINATION_EXISTS' }).Count -eq 1) 'RACE_COLLISION_NOT_CLASSIFIED'
        $publishedValue = [IO.File]::ReadAllText((Join-Path $raceDestination 'sentinel.txt'))
        Assert-True ($publishedValue -in @('writer-one', 'writer-two')) 'RACE_PUBLISHED_MIXED_TREE'
        $passed++
    } finally {
        if ($raceJobs.Count -gt 0) { $raceJobs | Stop-Job -ErrorAction SilentlyContinue; $raceJobs | Remove-Job -Force -ErrorAction SilentlyContinue }
    }

    $stage = New-Stage
    $outside = Join-Path $fixtureRoot 'billing-service'
    Assert-Rejected { Publish-ServiceDirectory -StagePath $stage -DestinationPath $outside -ServicesRoot $services } 'PATH_UNSAFE'
    Assert-True ([IO.Directory]::Exists($stage) -and -not [IO.Directory]::Exists($outside)) 'UNEQUAL_PARENT_CHANGED_TREE'
    $passed++

    $missing = Join-Path $services ('.foundation-stage-' + [Guid]::NewGuid().ToString('N'))
    Assert-Rejected { Publish-ServiceDirectory -StagePath $missing -DestinationPath (Join-Path $services 'billing-service') -ServicesRoot $services } 'PUBLICATION_FAILED'
    $passed++
    Write-Output ('SERVICE_DIRECTORY_PUBLISHER_FIXTURES_PASS executed=' + $passed)
} finally {
    $resolved = [IO.Path]::GetFullPath($fixtureRoot)
    $tempPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (-not $resolved.StartsWith($tempPrefix, [StringComparison]::OrdinalIgnoreCase) -or
        -not ([IO.Path]::GetFileName($resolved)).StartsWith('foundation-publisher-')) { throw 'FIXTURE_CLEANUP_UNSAFE' }
    if ([IO.Directory]::Exists($resolved)) { Remove-Item -LiteralPath $resolved -Recurse -Force }
}
