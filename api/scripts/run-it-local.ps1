<#
.SYNOPSIS
Runs Identity local integration tests with secrets loaded temporarily from api/.env.local.

.DESCRIPTION
This is the repository-standard terminal entry point for:
    services/identity-profile-service/mvnw.cmd -Pit-local verify

It loads only the five Identity test variables into the current PowerShell
process, starts Maven, then restores the original environment values.
It never prints credentials and never modifies PostgreSQL.
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$apiRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$envPath = Join-Path $apiRoot '.env.local'
$servicePath = Join-Path $apiRoot 'services\identity-profile-service'
$mavenWrapper = Join-Path $servicePath 'mvnw.cmd'

$requiredKeys = @(
    'IDENTITY_TEST_DB_URL',
    'IDENTITY_TEST_DB_APP_USERNAME',
    'IDENTITY_TEST_DB_APP_PASSWORD',
    'IDENTITY_TEST_DB_MIGRATOR_USERNAME',
    'IDENTITY_TEST_DB_MIGRATOR_PASSWORD'
)

function Read-DotEnv {
    param([Parameter(Mandatory)][string]$Path)

    $values = @{}

    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()

        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith('#')) {
            continue
        }

        $separator = $line.IndexOf('=')

        if ($separator -lt 1) {
            throw 'Invalid .env.local entry. Expected KEY=value.'
        }

        $key = $line.Substring(0, $separator).Trim()
        $value = $line.Substring($separator + 1).Trim()

        if ($value.Length -ge 2 -and (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        )) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        if ($values.ContainsKey($key)) {
            throw "Duplicate .env.local key: $key"
        }

        $values[$key] = $value
    }

    return $values
}

if (-not (Test-Path -LiteralPath $envPath -PathType Leaf)) {
    throw "Missing local secret file: $envPath"
}

if (-not (Test-Path -LiteralPath $mavenWrapper -PathType Leaf)) {
    throw "Missing Maven Wrapper: $mavenWrapper"
}

$values = Read-DotEnv -Path $envPath
$previousValues = @{}

foreach ($key in $requiredKeys) {
    if (-not $values.ContainsKey($key) -or
        [string]::IsNullOrWhiteSpace([string]$values[$key])) {
        throw "Missing required .env.local value: $key"
    }

    $previousValues[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
    [Environment]::SetEnvironmentVariable($key, [string]$values[$key], 'Process')
}

$exitCode = 1
$locationPushed = $false

try {
    Push-Location $servicePath
    $locationPushed = $true

    & $mavenWrapper '-Pit-local' 'verify'
    $exitCode = $LASTEXITCODE
}
finally {
    if ($locationPushed) {
        Pop-Location
    }

    foreach ($key in $requiredKeys) {
        [Environment]::SetEnvironmentVariable($key, $previousValues[$key], 'Process')
    }
}

exit $exitCode