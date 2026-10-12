#Requires -Version 5.1
<#
.SYNOPSIS
Runs one registered, non-preserved technical service locally with its own local database settings.
.DESCRIPTION
Reads only the selected service's exact registry-bound variables from an ignored local file.
It refuses inherited Spring/JVM/Maven overrides, never generates a service tree, never prints
configuration values, and restores process environment and location after the Maven process exits.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ServiceId,
    [Parameter(Mandatory)][string]$ConfigurationPath,
    [ValidateRange(1024, 65535)][int]$Port = 8080
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Stop-Safely {
    param([Parameter(Mandatory)][string]$Code)
    throw $Code
}

function Get-PlatformPathComparison {
    if ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT) {
        return [StringComparison]::OrdinalIgnoreCase
    }
    return [StringComparison]::Ordinal
}

function Get-CanonicalChildPath {
    param(
        [Parameter(Mandatory)][string]$Root,
        [Parameter(Mandatory)][string]$RelativePath,
        [Parameter(Mandatory)][string]$FailureCode
    )
    if ([string]::IsNullOrWhiteSpace($RelativePath) -or
        [IO.Path]::IsPathRooted($RelativePath) -or
        $RelativePath -match '(^|[\\/])\.\.([\\/]|$)') {
        Stop-Safely $FailureCode
    }
    $fullRoot = [IO.Path]::GetFullPath($Root).TrimEnd([char[]]@([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar))
    $fullPath = [IO.Path]::GetFullPath((Join-Path $fullRoot $RelativePath))
    $prefix = $fullRoot + [IO.Path]::DirectorySeparatorChar
    if (-not $fullPath.StartsWith($prefix, (Get-PlatformPathComparison))) {
        Stop-Safely $FailureCode
    }
    return $fullPath
}

function Assert-NoReparsePointsBelowRoot {
    param(
        [Parameter(Mandatory)][string]$Root,
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$FailureCode
    )
    $fullRoot = [IO.Path]::GetFullPath($Root).TrimEnd([char[]]@([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar))
    $fullPath = [IO.Path]::GetFullPath($Path)
    $prefix = $fullRoot + [IO.Path]::DirectorySeparatorChar
    if (-not $fullPath.StartsWith($prefix, (Get-PlatformPathComparison))) { Stop-Safely $FailureCode }
    $relative = $fullPath.Substring($prefix.Length)
    $segments = $relative -split '[\\/]'
    $current = $fullRoot
    foreach ($segment in $segments) {
        $current = Join-Path $current $segment
        if (Test-Path -LiteralPath $current) {
            $item = Get-Item -LiteralPath $current -Force
            if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { Stop-Safely $FailureCode }
        }
    }
}

function Read-LocalConfiguration {
    param([Parameter(Mandatory)][string]$Path)
    $values = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        $entry = ([string]$line).Trim()
        if ($entry.Length -eq 0 -or $entry.StartsWith('#')) { continue }
        $separator = $entry.IndexOf('=')
        if ($separator -lt 1) { Stop-Safely 'SERVICE_LOCAL_CONFIG_INVALID' }
        $key = $entry.Substring(0, $separator).Trim()
        $value = $entry.Substring($separator + 1).Trim()
        if ($key -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') { Stop-Safely 'SERVICE_LOCAL_CONFIG_INVALID' }
        if ($values.ContainsKey($key)) { Stop-Safely 'SERVICE_LOCAL_CONFIG_DUPLICATE' }
        if ($value.StartsWith('"') -or $value.StartsWith("'" ) -or
            $value.EndsWith('"') -or $value.EndsWith("'")) {
            if ($value.Length -lt 2 -or $value[0] -ne $value[$value.Length - 1] -or
                ($value[0] -ne '"' -and $value[0] -ne "'")) {
                Stop-Safely 'SERVICE_LOCAL_CONFIG_INVALID'
            }
            $value = $value.Substring(1, $value.Length - 2)
        }
        if ($key -match '^(SPRING[_.]|JAVA_TOOL_OPTIONS$|_JAVA_OPTIONS$|JDK_JAVA_OPTIONS$|MAVEN_(OPTS|ARGS|CONFIG)$)') {
            Stop-Safely 'SERVICE_LOCAL_CONFIG_OVERRIDE'
        }
        $values[$key] = $value
    }
    return $values
}

function Assert-IgnoredLocalFile {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$Path
    )
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { Stop-Safely 'SERVICE_LOCAL_CONFIG_MISSING' }
    $item = Get-Item -LiteralPath $Path -Force
    if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        Stop-Safely 'SERVICE_LOCAL_CONFIG_PATH_INVALID'
    }
    $fullRoot = [IO.Path]::GetFullPath($RepositoryRoot).TrimEnd([char[]]@([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar))
    $fullPath = [IO.Path]::GetFullPath($Path)
    $prefix = $fullRoot + [IO.Path]::DirectorySeparatorChar
    if (-not $fullPath.StartsWith($prefix, (Get-PlatformPathComparison))) {
        Stop-Safely 'SERVICE_LOCAL_CONFIG_PATH_INVALID'
    }
    Assert-NoReparsePointsBelowRoot -Root $RepositoryRoot -Path $fullPath -FailureCode 'SERVICE_LOCAL_CONFIG_PATH_INVALID'
    $relativePath = $fullPath.Substring($prefix.Length).Replace([IO.Path]::DirectorySeparatorChar, '/')
    $nativePreferenceWasPresent = Test-Path -LiteralPath 'variable:PSNativeCommandUseErrorActionPreference'
    if ($nativePreferenceWasPresent) {
        $previousNativePreference = $PSNativeCommandUseErrorActionPreference
        $PSNativeCommandUseErrorActionPreference = $false
    }
    try {
        & git -C $RepositoryRoot check-ignore --quiet -- $relativePath 2>$null
        $ignoreExitCode = $LASTEXITCODE
    } catch {
        Stop-Safely 'SERVICE_LOCAL_GIT_IGNORE_CHECK_FAILED'
    } finally {
        if ($nativePreferenceWasPresent) { $PSNativeCommandUseErrorActionPreference = $previousNativePreference }
    }
    if ($ignoreExitCode -ne 0) { Stop-Safely 'SERVICE_LOCAL_CONFIG_NOT_IGNORED' }
}

function Read-ServiceRegistry {
    param([Parameter(Mandatory)][string]$Path)
    try {
        $registry = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -ErrorAction Stop
    } catch {
        Stop-Safely 'SERVICE_LOCAL_REGISTRY_INVALID'
    }
    if ($registry.schemaVersion -ne 1 -or $null -eq $registry.services) {
        Stop-Safely 'SERVICE_LOCAL_REGISTRY_INVALID'
    }
    $services = @($registry.services)
    if ($services.Count -ne 5) { Stop-Safely 'SERVICE_LOCAL_REGISTRY_INVALID' }
    $seen = @{}
    foreach ($entry in $services) {
        if ($null -eq $entry -or $entry.id -notmatch '^[a-z][a-z0-9-]*$' -or
            $seen.ContainsKey([string]$entry.id) -or
            $entry.variant -cnotin @('relational', 'gateway') -or
            $entry.preserved -isnot [bool] -or
            $entry.destination -notmatch '^api/services/[a-z][a-z0-9-]*$') {
            Stop-Safely 'SERVICE_LOCAL_REGISTRY_INVALID'
        }
        $seen[[string]$entry.id] = $true
        if ($entry.variant -ceq 'relational') {
            if ($entry.database -notmatch '^[a-z][a-z0-9_]*_db$' -or
                $entry.testDatabase -notmatch '^[a-z][a-z0-9_]*_test_db$' -or
                $entry.schema -notmatch '^[a-z][a-z0-9_]*$' -or
                $entry.environmentPrefix -notmatch '^[A-Z][A-Z0-9_]*$') {
                Stop-Safely 'SERVICE_LOCAL_REGISTRY_INVALID'
            }
            $stem = $entry.database.Substring(0, $entry.database.Length - 3)
            if ($entry.testDatabase -cne ($stem + '_test_db') -or
                $entry.schema -cne $stem -or
                $entry.environmentPrefix -cne $stem.ToUpperInvariant()) {
                Stop-Safely 'SERVICE_LOCAL_REGISTRY_INVALID'
            }
        } elseif ($null -ne $entry.database -or $null -ne $entry.testDatabase -or
            $null -ne $entry.schema -or $null -ne $entry.environmentPrefix) {
            Stop-Safely 'SERVICE_LOCAL_REGISTRY_INVALID'
        }
    }
    return $services
}

try {
    $repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..') -ErrorAction Stop).Path
    $registryPath = Join-Path $repositoryRoot 'api/service-foundation/services.json'
    $services = @(Read-ServiceRegistry -Path $registryPath)
    $service = $null
    foreach ($entry in $services) {
        if ([string]$entry.id -ceq $ServiceId) { $service = $entry; break }
    }
    if ($null -eq $service) { Stop-Safely 'SERVICE_LOCAL_UNKNOWN_SERVICE' }
    if ($service.preserved) { Stop-Safely 'SERVICE_LOCAL_PRESERVED_SERVICE' }

    $servicePath = Get-CanonicalChildPath -Root $repositoryRoot -RelativePath ([string]$service.destination) -FailureCode 'SERVICE_LOCAL_REGISTRY_INVALID'
    Assert-NoReparsePointsBelowRoot -Root $repositoryRoot -Path $servicePath -FailureCode 'SERVICE_LOCAL_SOURCE_PATH_INVALID'
    if (-not (Test-Path -LiteralPath $servicePath -PathType Container)) { Stop-Safely 'SERVICE_LOCAL_SOURCE_MISSING' }
    $serviceItem = Get-Item -LiteralPath $servicePath -Force
    if (($serviceItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { Stop-Safely 'SERVICE_LOCAL_SOURCE_PATH_INVALID' }

    $runningOnWindows = [Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT
    $wrapperName = if ($runningOnWindows) { 'mvnw.cmd' } else { 'mvnw' }
    $wrapperPath = Join-Path $servicePath $wrapperName
    Assert-NoReparsePointsBelowRoot -Root $repositoryRoot -Path $wrapperPath -FailureCode 'SERVICE_LOCAL_WRAPPER_PATH_INVALID'
    if (-not (Test-Path -LiteralPath $wrapperPath -PathType Leaf)) { Stop-Safely 'SERVICE_LOCAL_WRAPPER_MISSING' }
    $wrapperItem = Get-Item -LiteralPath $wrapperPath -Force
    if (($wrapperItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { Stop-Safely 'SERVICE_LOCAL_WRAPPER_PATH_INVALID' }

    $configCandidate = if ([IO.Path]::IsPathRooted($ConfigurationPath)) { $ConfigurationPath } else { Join-Path $repositoryRoot $ConfigurationPath }
    $configFullPath = [IO.Path]::GetFullPath($configCandidate)
    Assert-IgnoredLocalFile -RepositoryRoot $repositoryRoot -Path $configFullPath
    $values = Read-LocalConfiguration -Path $configFullPath

    $exportKeys = @()
    if ($service.variant -ceq 'relational') {
        $prefix = [string]$service.environmentPrefix
        $stem = ([string]$service.database).Substring(0, ([string]$service.database).Length - 3)
        $roleKeys = @{
            Url = "${prefix}_DB_URL"
            AppUsername = "${prefix}_DB_APP_USERNAME"
            AppPassword = "${prefix}_DB_APP_PASSWORD"
            MigratorUsername = "${prefix}_DB_MIGRATOR_USERNAME"
            MigratorPassword = "${prefix}_DB_MIGRATOR_PASSWORD"
        }
        foreach ($key in $roleKeys.Values) {
            if (-not $values.ContainsKey($key) -or [string]::IsNullOrWhiteSpace([string]$values[$key])) {
                Stop-Safely 'SERVICE_LOCAL_REQUIRED_VALUE'
            }
        }
        foreach ($key in @($roleKeys.AppPassword, $roleKeys.MigratorPassword)) {
            $password = [string]$values[$key]
            if ($password -eq 'replace-me' -or $password.Length -lt 8) { Stop-Safely 'SERVICE_LOCAL_PASSWORD_INVALID' }
        }
        $urlPattern = '^jdbc:postgresql://(localhost|127\.0\.0\.1|\[::1\]):(?<port>[0-9]{1,5})/' + [regex]::Escape([string]$service.database) + '$'
        $url = [regex]::Match([string]$values[$roleKeys.Url], $urlPattern)
        if (-not $url.Success -or [int]$url.Groups['port'].Value -lt 1 -or [int]$url.Groups['port'].Value -gt 65535) {
            Stop-Safely 'SERVICE_LOCAL_DATABASE_MISMATCH'
        }
        if ([string]$values[$roleKeys.AppUsername] -cne ($stem + '_app') -or
            [string]$values[$roleKeys.MigratorUsername] -cne ($stem + '_migrator')) {
            Stop-Safely 'SERVICE_LOCAL_ROLE_MISMATCH'
        }
        $exportKeys = @($roleKeys.Url, $roleKeys.AppUsername, $roleKeys.AppPassword, $roleKeys.MigratorUsername, $roleKeys.MigratorPassword)
    } else {
        foreach ($key in $values.Keys) {
            if ([string]$key -match '^[A-Z][A-Z0-9_]*_DB_(URL|APP_USERNAME|APP_PASSWORD|MIGRATOR_USERNAME|MIGRATOR_PASSWORD)$') {
                Stop-Safely 'SERVICE_LOCAL_GATEWAY_DATABASE_CONFIG'
            }
        }
    }

    foreach ($entry in [Environment]::GetEnvironmentVariables('Process').GetEnumerator()) {
        $name = [string]$entry.Key
        if (($name -match '^(SPRING[_.]|JAVA_TOOL_OPTIONS$|_JAVA_OPTIONS$|JDK_JAVA_OPTIONS$|MAVEN_(OPTS|ARGS|CONFIG)$)') -and
            -not [string]::IsNullOrWhiteSpace([string]$entry.Value)) {
            Stop-Safely 'SERVICE_LOCAL_INHERITED_OVERRIDE'
        }
        $databaseCarrier = $name.ToUpperInvariant() -match '^(DATABASE_URL|DB_URL|PG(HOST|PORT|DATABASE|USER|PASSWORD|PASSFILE|SERVICE|SERVICEFILE|OPTIONS)|POSTGRES(QL)?_(USER|PASSWORD|DB|DATABASE|HOST|PORT|ADMIN_USER|ADMIN_PASSWORD)|[A-Z][A-Z0-9_]*_(TEST_)?DB_(URL|NAME|SCHEMA|OWNER|APP_USERNAME|APP_PASSWORD|MIGRATOR_USERNAME|MIGRATOR_PASSWORD))$'
        if ($databaseCarrier -and $exportKeys -notcontains $name -and
            -not [string]::IsNullOrWhiteSpace([string]$entry.Value)) {
            Stop-Safely 'SERVICE_LOCAL_INHERITED_DATABASE_CONFIG'
        }
    }

    $previous = @{}
    foreach ($key in $exportKeys) { $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
    $originalLocation = (Get-Location).Path
    $nativePreferenceWasPresent = Test-Path -LiteralPath 'variable:PSNativeCommandUseErrorActionPreference'
    if ($nativePreferenceWasPresent) { $previousNativePreference = $PSNativeCommandUseErrorActionPreference }
    try {
        foreach ($key in $exportKeys) { [Environment]::SetEnvironmentVariable($key, [string]$values[$key], 'Process') }
        Set-Location -LiteralPath $servicePath
        if ($nativePreferenceWasPresent) { $PSNativeCommandUseErrorActionPreference = $false }
        & $wrapperPath '-B' 'spring-boot:run' '-Dspring-boot.run.profiles=local' "-Dspring-boot.run.arguments=--server.address=127.0.0.1 --server.port=$Port"
        $mavenExitCode = $LASTEXITCODE
        if ($mavenExitCode -ne 0) { Stop-Safely 'SERVICE_LOCAL_MAVEN_FAILED' }
    } finally {
        Set-Location -LiteralPath $originalLocation
        foreach ($key in $exportKeys) {
            if ($null -eq $previous[$key]) { Remove-Item -LiteralPath "Env:$key" -ErrorAction SilentlyContinue }
            else { [Environment]::SetEnvironmentVariable($key, [string]$previous[$key], 'Process') }
        }
        if ($nativePreferenceWasPresent) { $PSNativeCommandUseErrorActionPreference = $previousNativePreference }
    }
} catch {
    if ($_.Exception.Message -match '^SERVICE_LOCAL_[A-Z_]+$') { throw $_.Exception.Message }
    throw 'SERVICE_LOCAL_FAILED'
}
