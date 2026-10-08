#Requires -Version 5.1
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$sourceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$moduleSource = Join-Path $PSScriptRoot 'ServiceArtifact.psm1'
if (-not (Test-Path -LiteralPath $moduleSource -PathType Leaf)) {
    Write-Output 'RED SERVICE_ARTIFACT_RESOLVER_NOT_IMPLEMENTED'
    throw 'SERVICE_ARTIFACT_RESOLVER_NOT_IMPLEMENTED'
}

$registrySource = Join-Path $sourceRoot 'api\service-foundation\services.json'
$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('auction-promax-service-artifact-' + [guid]::NewGuid().ToString('N'))

function Assert-Equal {
    param([Parameter(Mandatory)][AllowNull()]$Actual, [Parameter(Mandatory)][AllowNull()]$Expected, [Parameter(Mandatory)][string]$Name)
    if ($Actual -cne $Expected) { throw "SERVICE_ARTIFACT_ASSERTION_FAILED:$Name" }
}

function Assert-Code {
    param([Parameter(Mandatory)][scriptblock]$Operation, [Parameter(Mandatory)][string]$ExpectedCode, [Parameter(Mandatory)][string]$Name)
    try {
        & $Operation
        throw "SERVICE_ARTIFACT_EXPECTED_FAILURE_MISSING:$Name"
    } catch {
        if ($_.Exception.Message -cne $ExpectedCode) { throw }
    }
}

function New-FixtureRepository {
    param([scriptblock]$MutateRegistry)
    $repo = Join-Path $temporaryRoot ([guid]::NewGuid().ToString('N'))
    $moduleDirectory = Join-Path $repo 'api\scripts\supply-chain'
    $registryDirectory = Join-Path $repo 'api\service-foundation'
    [void][System.IO.Directory]::CreateDirectory($moduleDirectory)
    [void][System.IO.Directory]::CreateDirectory($registryDirectory)
    [void][System.IO.Directory]::CreateDirectory((Join-Path $repo 'api\services'))
    Copy-Item -LiteralPath $moduleSource -Destination (Join-Path $moduleDirectory 'ServiceArtifact.psm1')
    $registry = Get-Content -LiteralPath $registrySource -Raw | ConvertFrom-Json
    if ($MutateRegistry) { & $MutateRegistry $registry }
    $registry | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $registryDirectory 'services.json') -Encoding UTF8
    return $repo
}

function New-ServiceFiles {
    param(
        [Parameter(Mandatory)][string]$Repository,
        [Parameter(Mandatory)][string]$ServiceId,
        [string]$PomGroupId,
        [string]$PomArtifactId,
        [string]$PomVersion,
        [string]$ManifestEntryClass
    )
    $service = (Get-Content -LiteralPath (Join-Path $Repository 'api\service-foundation\services.json') -Raw | ConvertFrom-Json).services |
        Where-Object { $_.id -ceq $ServiceId } | Select-Object -First 1
    $project = Join-Path $Repository ('api\services\' + $ServiceId)
    $target = Join-Path $project 'target'
    [void][System.IO.Directory]::CreateDirectory($target)
    $pomGroup = if ($PomGroupId) { $PomGroupId } else { $service.groupId }
    $pomArtifact = if ($PomArtifactId) { $PomArtifactId } else { $service.artifactId }
    $pomVersionValue = if ($PomVersion) { $PomVersion } else { $service.version }
    @"
<project><groupId>$pomGroup</groupId><artifactId>$pomArtifact</artifactId><version>$pomVersionValue</version></project>
"@ | Set-Content -LiteralPath (Join-Path $project 'pom.xml') -Encoding UTF8
    $jarRoot = Join-Path $target 'jar-content'
    $metaInf = Join-Path $jarRoot 'META-INF'
    [void][System.IO.Directory]::CreateDirectory($metaInf)
    $startClass = if ($ManifestEntryClass) { $ManifestEntryClass } else { $service.packageName + '.' + $service.entryClass }
    [System.IO.File]::WriteAllText(
        (Join-Path $metaInf 'MANIFEST.MF'),
        "Manifest-Version: 1.0`r`nMain-Class: org.springframework.boot.loader.launch.JarLauncher`r`nStart-Class: $startClass`r`n`r`n",
        [System.Text.Encoding]::ASCII)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($jarRoot, (Join-Path $target ($service.artifactId + '-' + $service.version + '.jar')))
    Remove-Item -LiteralPath $jarRoot -Recurse -Force
    [System.IO.File]::WriteAllText((Join-Path $target 'bom.json'), '{}')
}

function Invoke-FixtureResolver {
    param([Parameter(Mandatory)][string]$Repository, [Parameter(Mandatory)][string]$ServiceId, [switch]$RequireBuiltArtifact)
    $fixtureModule = Join-Path $Repository 'api\scripts\supply-chain\ServiceArtifact.psm1'
    Import-Module -Name $fixtureModule -Force
    try {
        if ($RequireBuiltArtifact) { return Resolve-ServiceArtifact -ServiceId $ServiceId -RequireBuiltArtifact }
        return Resolve-ServiceArtifact -ServiceId $ServiceId
    } finally {
        Remove-Module -Name ServiceArtifact -Force -ErrorAction SilentlyContinue
    }
}

try {
    [void][System.IO.Directory]::CreateDirectory($temporaryRoot)

    $metadataFixture = New-FixtureRepository
    $metadata = Invoke-FixtureResolver -Repository $metadataFixture -ServiceId 'auction-service'
    Assert-Equal $metadata.serviceId 'auction-service' 'service id'
    Assert-Equal $metadata.variant 'relational' 'relational variant'
    Assert-Equal $metadata.groupId 'com.auctionpromax' 'group id'
    Assert-Equal $metadata.artifactId 'auction-service' 'artifact id'
    Assert-Equal $metadata.version '0.0.1-SNAPSHOT' 'version'
    Assert-Equal $metadata.projectRelativePath 'api/services/auction-service' 'repository-relative project path'
    Assert-Equal $metadata.imageReference 'auction-promax/auction-service:local' 'service-local image tag'
    if (Test-Path -LiteralPath $metadata.projectPath) { throw 'SERVICE_ARTIFACT_ASSERTION_FAILED:absent source metadata resolution' }
    Assert-Code { Invoke-FixtureResolver -Repository $metadataFixture -ServiceId 'auction-service' -RequireBuiltArtifact } 'SERVICE_ARTIFACT_MISSING' 'absent source cannot satisfy built-artifact request'

    $builtFixture = New-FixtureRepository
    New-ServiceFiles -Repository $builtFixture -ServiceId 'auction-service'
    $built = Invoke-FixtureResolver -Repository $builtFixture -ServiceId 'auction-service' -RequireBuiltArtifact
    Assert-Equal ([System.IO.Path]::GetFileName($built.jarPath)) 'auction-service-0.0.1-SNAPSHOT.jar' 'canonical jar basename'
    Assert-Equal ([System.IO.Path]::GetFileName($built.sbomPath)) 'bom.json' 'canonical sbom basename'
    Assert-Equal $built.jarApiRelativePath 'services/auction-service/target/auction-service-0.0.1-SNAPSHOT.jar' 'canonical API-relative JAR path'
    Assert-Equal $built.dockerfilePath (Join-Path $built.projectPath 'Dockerfile') 'dockerfile derived from registry project'
    Assert-Equal $built.evidencePath (Join-Path $built.projectPath 'target\service-evidence') 'evidence path derived from registry project'

    $forgedPomFixture = New-FixtureRepository
    New-ServiceFiles -Repository $forgedPomFixture -ServiceId 'auction-service' -PomArtifactId 'identity-profile-service'
    Assert-Code { Invoke-FixtureResolver -Repository $forgedPomFixture -ServiceId 'auction-service' -RequireBuiltArtifact } 'SERVICE_POM_IDENTITY_MISMATCH' 'forged POM GAV'

    $forgedGroupFixture = New-FixtureRepository
    New-ServiceFiles -Repository $forgedGroupFixture -ServiceId 'auction-service' -PomGroupId 'example.invalid'
    Assert-Code { Invoke-FixtureResolver -Repository $forgedGroupFixture -ServiceId 'auction-service' -RequireBuiltArtifact } 'SERVICE_POM_IDENTITY_MISMATCH' 'forged POM group'

    $forgedVersionFixture = New-FixtureRepository
    New-ServiceFiles -Repository $forgedVersionFixture -ServiceId 'auction-service' -PomVersion '9.9.9'
    Assert-Code { Invoke-FixtureResolver -Repository $forgedVersionFixture -ServiceId 'auction-service' -RequireBuiltArtifact } 'SERVICE_POM_IDENTITY_MISMATCH' 'forged POM version'

    $forgedManifestFixture = New-FixtureRepository
    New-ServiceFiles -Repository $forgedManifestFixture -ServiceId 'auction-service' -ManifestEntryClass 'com.auctionpromax.identityprofileservice.IdentityProfileServiceApplication'
    Assert-Code { Invoke-FixtureResolver -Repository $forgedManifestFixture -ServiceId 'auction-service' -RequireBuiltArtifact } 'SERVICE_JAR_MANIFEST_MISMATCH' 'forged executable jar start class'

    $wrongJarFixture = New-FixtureRepository
    New-ServiceFiles -Repository $wrongJarFixture -ServiceId 'auction-service'
    $target = Join-Path $wrongJarFixture 'api\services\auction-service\target'
    Move-Item -LiteralPath (Join-Path $target 'auction-service-0.0.1-SNAPSHOT.jar') -Destination (Join-Path $target 'wrong-service.jar')
    Assert-Code { Invoke-FixtureResolver -Repository $wrongJarFixture -ServiceId 'auction-service' -RequireBuiltArtifact } 'SERVICE_ARTIFACT_MISSING' 'wrong jar basename'

    $forgedRegistryFixture = New-FixtureRepository {
        param($registry)
        ($registry.services | Where-Object { $_.id -ceq 'auction-service' }).artifactId = 'identity-profile-service'
    }
    Assert-Code { Invoke-FixtureResolver -Repository $forgedRegistryFixture -ServiceId 'auction-service' } 'SERVICE_REGISTRY_INVALID' 'forged registry GAV'

    $unsafeRegistryFixture = New-FixtureRepository {
        param($registry)
        ($registry.services | Where-Object { $_.id -ceq 'auction-service' }).destination = 'api/services/../outside'
    }
    Assert-Code { Invoke-FixtureResolver -Repository $unsafeRegistryFixture -ServiceId 'auction-service' } 'SERVICE_REGISTRY_INVALID' 'registry path traversal'

    $linkedFixture = New-FixtureRepository
    $linkedProject = Join-Path $linkedFixture 'api\services\auction-service'
    $outsideProject = Join-Path $temporaryRoot ([guid]::NewGuid().ToString('N'))
    [void][System.IO.Directory]::CreateDirectory($outsideProject)
    New-ServiceFiles -Repository $linkedFixture -ServiceId 'auction-service'
    Remove-Item -LiteralPath $linkedProject -Recurse -Force
    if ($env:OS -eq 'Windows_NT') {
        New-Item -ItemType Junction -Path $linkedProject -Target $outsideProject | Out-Null
    } else {
        [void][System.IO.Directory]::CreateSymbolicLink($linkedProject, $outsideProject)
    }
    try {
        Assert-Code { Invoke-FixtureResolver -Repository $linkedFixture -ServiceId 'auction-service' -RequireBuiltArtifact } 'LINK_REJECTED' 'linked service destination'
    } finally {
        [System.IO.Directory]::Delete($linkedProject, $false)
    }

    $gatewayFixture = New-FixtureRepository
    $gateway = Invoke-FixtureResolver -Repository $gatewayFixture -ServiceId 'realtime-gateway'
    Assert-Equal $gateway.variant 'gateway' 'gateway variant'
    Assert-Equal $gateway.database $null 'gateway database null'
    Assert-Equal $gateway.testDatabase $null 'gateway test database null'
    Assert-Equal $gateway.schema $null 'gateway schema null'
    Assert-Equal $gateway.environmentPrefix $null 'gateway environment prefix null'
    Assert-Equal $gateway.imageReference 'auction-promax/realtime-gateway:local' 'gateway-local image tag'

    $unknownFixture = New-FixtureRepository
    Assert-Code { Invoke-FixtureResolver -Repository $unknownFixture -ServiceId 'old-transaction-service' } 'SERVICE_UNKNOWN' 'unknown legacy service id'

    Write-Output 'SERVICE_ARTIFACT_FIXTURES_PASS cases=13'
} finally {
    if (Test-Path -LiteralPath $temporaryRoot) {
        $resolvedTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
        $resolvedRoot = [System.IO.Path]::GetFullPath($temporaryRoot)
        $insideTemp = $resolvedRoot.StartsWith($resolvedTemp, [System.StringComparison]::OrdinalIgnoreCase)
        $temporaryNameIsOwned = (Split-Path -Leaf $resolvedRoot) -match '^auction-promax-service-artifact-[a-f0-9]{32}$'
        if (($insideTemp -eq $false) -or ($temporaryNameIsOwned -eq $false)) {
            throw 'SERVICE_ARTIFACT_FIXTURE_CLEANUP_PATH_INVALID'
        }
        Remove-Item -LiteralPath $resolvedRoot -Recurse -Force
    }
}
