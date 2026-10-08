#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:ServiceRecordKeys = @(
    'artifactId', 'database', 'destination', 'entryClass', 'environmentPrefix',
    'groupId', 'id', 'packageName', 'preserved', 'schema', 'testDatabase', 'variant', 'version'
)

function Throw-ServiceArtifactError {
    param([Parameter(Mandatory)][string]$Code)
    throw [System.InvalidOperationException]::new($Code)
}

function Get-RepositoryRoot {
    $apiRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
    $repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $apiRoot '..'))
    Assert-NoReparsePathChain -Path $repositoryRoot
    if (-not (Test-Path -LiteralPath (Join-Path $repositoryRoot 'api') -PathType Container)) {
        Throw-ServiceArtifactError 'SERVICE_REPOSITORY_ROOT_INVALID'
    }
    return $repositoryRoot
}

function Assert-NoReparsePathChain {
    param([Parameter(Mandatory)][string]$Path)
    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $root = [System.IO.Path]::GetPathRoot($fullPath)
    if ([string]::IsNullOrWhiteSpace($root)) { Throw-ServiceArtifactError 'SERVICE_PATH_UNSAFE' }
    $current = $root
    $attributes = [System.IO.FileAttributes]::Normal
    try { $attributes = [System.IO.File]::GetAttributes($current) } catch [System.IO.FileNotFoundException] { }
    catch [System.IO.DirectoryNotFoundException] { }
    catch { Throw-ServiceArtifactError 'SERVICE_PATH_INVALID' }
    if (($attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        Throw-ServiceArtifactError 'LINK_REJECTED'
    }
    $remainder = $fullPath.Substring($root.Length)
    $segments = @($remainder -split '[\\/]+' | Where-Object { -not [string]::IsNullOrEmpty($_) })
    foreach ($segment in $segments) {
        $current = [System.IO.Path]::Combine($current, $segment)
        try {
            $attributes = [System.IO.File]::GetAttributes($current)
            if (($attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
                Throw-ServiceArtifactError 'LINK_REJECTED'
            }
        } catch [System.IO.FileNotFoundException] { }
        catch [System.IO.DirectoryNotFoundException] { }
        catch [System.InvalidOperationException] { throw }
        catch { Throw-ServiceArtifactError 'SERVICE_PATH_INVALID' }
    }
}

function Assert-PathWithinRoot {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$Root)
    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $fullRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd([char[]]@([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar))
    $prefix = $fullRoot + [System.IO.Path]::DirectorySeparatorChar
    $comparison = if ($env:OS -eq 'Windows_NT') {
        [System.StringComparison]::OrdinalIgnoreCase
    } else {
        [System.StringComparison]::Ordinal
    }
    if (-not $fullPath.StartsWith($prefix, $comparison)) { Throw-ServiceArtifactError 'SERVICE_PATH_UNSAFE' }
}

function Read-ServiceRegistry {
    param([Parameter(Mandatory)][string]$RepositoryRoot)
    $registryPath = Join-Path $RepositoryRoot 'api\service-foundation\services.json'
    Assert-PathWithinRoot -Path $registryPath -Root $RepositoryRoot
    Assert-NoReparsePathChain -Path $registryPath
    if (-not (Test-Path -LiteralPath $registryPath -PathType Leaf)) {
        Throw-ServiceArtifactError 'SERVICE_REGISTRY_INVALID'
    }
    try {
        $registry = [System.IO.File]::ReadAllText($registryPath) | ConvertFrom-Json -ErrorAction Stop
    } catch {
        Throw-ServiceArtifactError 'SERVICE_REGISTRY_INVALID'
    }
    $topKeys = @($registry.PSObject.Properties.Name | Sort-Object -CaseSensitive)
    if (($registry.schemaVersion -ne 1) -or ($topKeys.Count -ne 2) -or ($topKeys[0] -cne 'schemaVersion') -or ($topKeys[1] -cne 'services') -or ($registry.services.Count -ne 5)) {
        Throw-ServiceArtifactError 'SERVICE_REGISTRY_INVALID'
    }
    $services = @{}
    foreach ($service in $registry.services) {
        $keys = @($service.PSObject.Properties.Name | Sort-Object -CaseSensitive)
        $expectedKeys = @($script:ServiceRecordKeys | Sort-Object -CaseSensitive)
        if ($keys.Count -ne $expectedKeys.Count -or (Compare-Object -ReferenceObject $expectedKeys -DifferenceObject $keys -CaseSensitive)) {
            Throw-ServiceArtifactError 'SERVICE_REGISTRY_INVALID'
        }
        if (($service.id -isnot [string]) -or ($service.id -cnotmatch '^[a-z][a-z0-9-]*$') -or ($services.ContainsKey([string]$service.id)) -or (@('relational', 'gateway') -cnotcontains [string]$service.variant) -or ($service.preserved -isnot [bool]) -or ($service.groupId -cne 'com.auctionpromax') -or ($service.artifactId -cne $service.id) -or ($service.version -isnot [string]) -or ($service.version -cnotmatch '^[0-9]+\.[0-9]+\.[0-9]+-SNAPSHOT$') -or ($service.packageName -isnot [string]) -or ($service.packageName -cnotmatch '^com\.auctionpromax\.[a-z][a-z0-9]*$') -or ($service.entryClass -isnot [string]) -or ($service.entryClass -cnotmatch '^[A-Z][A-Za-z0-9]*Application$') -or ($service.destination -cne ('api/services/' + $service.id))) {
            Throw-ServiceArtifactError 'SERVICE_REGISTRY_INVALID'
        }
        if ($service.variant -ceq 'gateway') {
            if ($service.database -ne $null -or $service.testDatabase -ne $null -or $service.schema -ne $null -or $service.environmentPrefix -ne $null) {
                Throw-ServiceArtifactError 'SERVICE_REGISTRY_INVALID'
            }
        } elseif (($service.database -isnot [string]) -or ($service.database -cnotmatch '^[a-z][a-z0-9_]*_db$') -or ($service.testDatabase -isnot [string]) -or ($service.testDatabase -cnotmatch '^[a-z][a-z0-9_]*_test_db$') -or ($service.schema -isnot [string]) -or ($service.schema -cnotmatch '^[a-z][a-z0-9_]*$') -or ($service.environmentPrefix -isnot [string]) -or ($service.environmentPrefix -cnotmatch '^[A-Z][A-Z0-9_]*$')) {
            Throw-ServiceArtifactError 'SERVICE_REGISTRY_INVALID'
        }
        if ($service.preserved -and $service.id -cne 'identity-profile-service') {
            Throw-ServiceArtifactError 'SERVICE_REGISTRY_INVALID'
        }
        $services.Add($service.id, $service)
    }
    return $services
}

function Assert-OrdinaryFile {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$MissingCode)
    Assert-NoReparsePathChain -Path $Path
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { Throw-ServiceArtifactError $MissingCode }
    try { $attributes = [System.IO.File]::GetAttributes($Path) } catch { Throw-ServiceArtifactError $MissingCode }
    if ((($attributes -band [System.IO.FileAttributes]::Directory) -ne 0) -or (($attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)) { Throw-ServiceArtifactError 'LINK_REJECTED' }
}

function Assert-PomIdentity {
    param([Parameter(Mandatory)][string]$PomPath, [Parameter(Mandatory)]$Service)
    Assert-OrdinaryFile -Path $PomPath -MissingCode 'SERVICE_POM_IDENTITY_MISMATCH'
    try {
        $settings = [System.Xml.XmlReaderSettings]::new()
        $settings.DtdProcessing = [System.Xml.DtdProcessing]::Prohibit
        $settings.XmlResolver = $null
        $reader = [System.Xml.XmlReader]::Create($PomPath, $settings)
        try {
            $document = [System.Xml.XmlDocument]::new()
            $document.XmlResolver = $null
            $document.Load($reader)
        } finally { $reader.Dispose() }
        $group = $document.SelectSingleNode("/*[local-name()='project']/*[local-name()='groupId']").InnerText
        $artifact = $document.SelectSingleNode("/*[local-name()='project']/*[local-name()='artifactId']").InnerText
        $version = $document.SelectSingleNode("/*[local-name()='project']/*[local-name()='version']").InnerText
    } catch { Throw-ServiceArtifactError 'SERVICE_POM_IDENTITY_MISMATCH' }
    if (($group -cne $Service.groupId) -or ($artifact -cne $Service.artifactId) -or ($version -cne $Service.version)) {
        Throw-ServiceArtifactError 'SERVICE_POM_IDENTITY_MISMATCH'
    }
}

function Assert-JarManifestIdentity {
    param([Parameter(Mandatory)][string]$JarPath, [Parameter(Mandatory)]$Service)
    try {
        Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop
        $archive = [System.IO.Compression.ZipFile]::OpenRead($JarPath)
        try {
            $manifest = $archive.GetEntry('META-INF/MANIFEST.MF')
            if ($null -eq $manifest) { Throw-ServiceArtifactError 'SERVICE_JAR_MANIFEST_MISMATCH' }
            $stream = $manifest.Open()
            try {
                $reader = [System.IO.StreamReader]::new($stream)
                try { $content = $reader.ReadToEnd() } finally { $reader.Dispose() }
            } finally { $stream.Dispose() }
        } finally { $archive.Dispose() }
    } catch [System.InvalidOperationException] {
        throw
    } catch {
        Throw-ServiceArtifactError 'SERVICE_JAR_MANIFEST_MISMATCH'
    }
    $unfoldedContent = [regex]::Replace($content, '(?:\r\n|\n) ', '')
    $mainClass = [regex]::Match($unfoldedContent, '(?m)^Main-Class:\s*([^\r\n]+)').Groups[1].Value.Trim()
    $startClass = [regex]::Match($unfoldedContent, '(?m)^Start-Class:\s*([^\r\n]+)').Groups[1].Value.Trim()
    if (($mainClass -cne 'org.springframework.boot.loader.launch.JarLauncher') -or ($startClass -cne ($Service.packageName + '.' + $Service.entryClass))) {
        Throw-ServiceArtifactError 'SERVICE_JAR_MANIFEST_MISMATCH'
    }
}

function Resolve-ServiceArtifact {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][ValidateNotNullOrEmpty()][string]$ServiceId,
        [switch]$RequireBuiltArtifact
    )

    $repositoryRoot = Get-RepositoryRoot
    $services = Read-ServiceRegistry -RepositoryRoot $repositoryRoot
    if (-not $services.ContainsKey($ServiceId)) { Throw-ServiceArtifactError 'SERVICE_UNKNOWN' }
    $service = $services[$ServiceId]
    $projectRelativePath = [string]$service.destination
    $projectPath = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot ($projectRelativePath -replace '/', [System.IO.Path]::DirectorySeparatorChar)))
    Assert-PathWithinRoot -Path $projectPath -Root $repositoryRoot
    Assert-NoReparsePathChain -Path $projectPath

    $targetPath = Join-Path $projectPath 'target'
    $pomPath = Join-Path $projectPath 'pom.xml'
    $jarPath = Join-Path $targetPath ($service.artifactId + '-' + $service.version + '.jar')
    $sbomPath = Join-Path $targetPath 'bom.json'
    $dockerfilePath = Join-Path $projectPath 'Dockerfile'
    $evidenceDirectoryName = if ($service.id -ceq 'identity-profile-service') { 's001-t07-evidence' } else { 'service-evidence' }
    $evidencePath = Join-Path $targetPath $evidenceDirectoryName
    $projectApiRelativePath = 'services/' + [string]$service.id
    $jarApiRelativePath = $projectApiRelativePath + '/target/' + [string]$service.artifactId + '-' + [string]$service.version + '.jar'
    $sbomApiRelativePath = $projectApiRelativePath + '/target/bom.json'
    $imageReference = if ($service.id -ceq 'identity-profile-service') { 'auction-promax/identity-profile-service:s001-t07' } else { 'auction-promax/' + [string]$service.id + ':local' }
    foreach ($candidate in @($pomPath, $targetPath, $jarPath, $sbomPath, $dockerfilePath, $evidencePath)) {
        Assert-PathWithinRoot -Path $candidate -Root $repositoryRoot
        Assert-NoReparsePathChain -Path $candidate
    }

    $projectExists = Test-Path -LiteralPath $projectPath
    if ($projectExists) { Assert-PomIdentity -PomPath $pomPath -Service $service }
    if ($RequireBuiltArtifact) {
        if (-not $projectExists) { Throw-ServiceArtifactError 'SERVICE_ARTIFACT_MISSING' }
        Assert-OrdinaryFile -Path $jarPath -MissingCode 'SERVICE_ARTIFACT_MISSING'
        Assert-OrdinaryFile -Path $sbomPath -MissingCode 'SERVICE_ARTIFACT_MISSING'
        Assert-JarManifestIdentity -JarPath $jarPath -Service $service
    }

    return [pscustomobject][ordered]@{
        serviceId = [string]$service.id
        variant = [string]$service.variant
        groupId = [string]$service.groupId
        artifactId = [string]$service.artifactId
        packageName = [string]$service.packageName
        version = [string]$service.version
        projectRelativePath = $projectRelativePath
        projectApiRelativePath = $projectApiRelativePath
        projectPath = $projectPath
        dockerfilePath = $dockerfilePath
        jarApiRelativePath = $jarApiRelativePath
        sbomApiRelativePath = $sbomApiRelativePath
        jarPath = $jarPath
        sbomPath = $sbomPath
        evidencePath = $evidencePath
        entryClass = [string]$service.entryClass
        imageReference = $imageReference
        database = $service.database
        testDatabase = $service.testDatabase
        schema = $service.schema
        environmentPrefix = $service.environmentPrefix
    }
}

Export-ModuleMember -Function 'Resolve-ServiceArtifact'
