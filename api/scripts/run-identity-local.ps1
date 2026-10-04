#Requires -Version 5.1
<#
.SYNOPSIS
Starts the Phase 0 identity sample service on loopback using local database settings.
.DESCRIPTION
Loads only five development settings from api/.env.local, validates them before
mutating the process environment, and restores environment/location on exit.
This is not product authentication or a production launcher.
#>
[CmdletBinding()]
param([string]$ApiRoot = (Join-Path $PSScriptRoot '..'))
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
# Handle native nonzero exits explicitly, consistently across PowerShell versions.
if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}
$resolvedRoot = (Resolve-Path -LiteralPath $ApiRoot -ErrorAction Stop).Path
$envPath = Join-Path $resolvedRoot '.env.local'
$servicePath = Join-Path $resolvedRoot 'services/identity-profile-service'
$wrapper = Join-Path $servicePath 'mvnw.cmd'
if (-not (Test-Path -LiteralPath $envPath -PathType Leaf)) { throw 'LOCAL_IDENTITY_ENV_MISSING' }
if (-not (Test-Path -LiteralPath $wrapper -PathType Leaf)) { throw 'LOCAL_IDENTITY_WRAPPER_MISSING' }
$required = @('IDENTITY_DB_URL','IDENTITY_DB_APP_USERNAME','IDENTITY_DB_APP_PASSWORD','IDENTITY_DB_MIGRATOR_USERNAME','IDENTITY_DB_MIGRATOR_PASSWORD')
$values = @{}
foreach ($line in Get-Content -LiteralPath $envPath) {
    $entry = $line.Trim()
    if ($entry.Length -eq 0 -or $entry.StartsWith('#')) { continue }
    $separator = $entry.IndexOf('=')
    if ($separator -lt 1) { throw 'LOCAL_IDENTITY_ENV_INVALID' }
    $key = $entry.Substring(0, $separator).Trim()
    $value = $entry.Substring($separator + 1).Trim()
    if ($key -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') { throw 'LOCAL_IDENTITY_ENV_INVALID' }
    if ($values.ContainsKey($key)) { throw 'LOCAL_IDENTITY_ENV_DUPLICATE' }
    if ($value.StartsWith('"') -or $value.StartsWith("'") -or
        $value.EndsWith('"') -or $value.EndsWith("'")) {
        if ($value.Length -lt 2 -or $value[0] -ne $value[$value.Length - 1] -or
            ($value[0] -ne '"' -and $value[0] -ne "'")) { throw 'LOCAL_IDENTITY_ENV_INVALID' }
        $value = $value.Substring(1, $value.Length - 2)
    }
    $values[$key] = $value
}
foreach ($key in $required) {
    if (-not $values.ContainsKey($key) -or [string]::IsNullOrWhiteSpace([string]$values[$key])) {
        throw 'LOCAL_IDENTITY_REQUIRED_VALUE'
    }
}
foreach ($key in @('IDENTITY_DB_APP_PASSWORD','IDENTITY_DB_MIGRATOR_PASSWORD')) {
    if ($values[$key] -eq 'replace-me') { throw 'LOCAL_IDENTITY_PLACEHOLDER' }
}
$url = [regex]::Match($values['IDENTITY_DB_URL'], '^jdbc:postgresql://(localhost|127\.0\.0\.1|\[::1\]):(?<port>[0-9]{1,5})/identity_db$')
if (-not $url.Success -or [int]$url.Groups['port'].Value -lt 1 -or [int]$url.Groups['port'].Value -gt 65535) {
    throw 'LOCAL_IDENTITY_DB_URL'
}
if ($values['IDENTITY_DB_APP_USERNAME'] -ne 'identity_app' -or
    $values['IDENTITY_DB_MIGRATOR_USERNAME'] -ne 'identity_migrator') { throw 'LOCAL_IDENTITY_DB_ROLE' }
$previous = @{}
foreach ($key in $required) { $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
$locationPushed = $false
try {
    foreach ($key in $required) { [Environment]::SetEnvironmentVariable($key, $values[$key], 'Process') }
    Push-Location -LiteralPath $servicePath
    $locationPushed = $true
    & $wrapper '-B' 'spring-boot:run' '-Dspring-boot.run.profiles=local' '-Dspring-boot.run.arguments=--server.address=127.0.0.1 --server.port=8080'
    if ($LASTEXITCODE -ne 0) { throw "LOCAL_IDENTITY_MAVEN_FAILED:$LASTEXITCODE" }
} finally {
    if ($locationPushed) { Pop-Location }
    foreach ($key in $required) {
        if ($null -eq $previous[$key]) {
            Remove-Item -LiteralPath "Env:$key" -ErrorAction SilentlyContinue
        } else {
            [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process')
        }
    }
}
