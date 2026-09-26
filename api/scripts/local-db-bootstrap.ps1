<#
.SYNOPSIS
Bootstraps the local PostgreSQL databases and roles used by Auction ProMax.

.DESCRIPTION
Run from api/ or from any directory:

    .\scripts\local-db-bootstrap.ps1

This wrapper is intentionally local-development focused:
- It refuses non-loopback PostgreSQL hosts.
- It reads configuration from api/.env.local.
- It uses PGPASSWORD only in the current PowerShell process while invoking psql.
- It never puts passwords in psql command-line arguments or console output.
- It passes application/migrator passwords to bootstrap.sql through psql stdin.
- It restores the original PostgreSQL environment variables before exiting.

The SQL itself is convergent but not fully atomic because CREATE DATABASE cannot
run inside a PostgreSQL transaction. If a run fails, fix the cause and rerun it.
#>

[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param(
    [switch]$SkipVerify
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# PowerShell 7.3+ can otherwise turn native command failures into terminating
# errors before we can inspect $LASTEXITCODE and print a cleaner message.
if (Test-Path -LiteralPath 'Variable:\PSNativeCommandUseErrorActionPreference') {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ApprovedPostgreSqlMajorVersion = 17
$AllowedLocalHosts = @('localhost', '127.0.0.1', '::1')
$ApiRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$EnvPath = Join-Path $ApiRoot '.env.local'
$SqlPath = Join-Path $ApiRoot 'infra\local\postgres\bootstrap.sql'
$SchemaSqlPath = Join-Path $ApiRoot 'infra\local\postgres\bootstrap-schema.sql'
$VerifyPath = Join-Path $PSScriptRoot 'local-db-verify.ps1'

$Targets = @(
    @{ Prefix = 'IDENTITY_DB';         Label = 'Identity development';        Db = 'identity_db';         Schema = 'identity';         Owner = 'identity_owner';         Migrator = 'identity_migrator';         App = 'identity_app' },
    @{ Prefix = 'IDENTITY_TEST_DB';    Label = 'Identity integration test';   Db = 'identity_test_db';    Schema = 'identity';         Owner = 'identity_test_owner';    Migrator = 'identity_test_migrator';    App = 'identity_test_app' },
    @{ Prefix = 'AUCTION_DB';          Label = 'Auction development';         Db = 'auction_db';          Schema = 'auction';          Owner = 'auction_owner';          Migrator = 'auction_migrator';          App = 'auction_app' },
    @{ Prefix = 'AUCTION_TEST_DB';     Label = 'Auction integration test';    Db = 'auction_test_db';     Schema = 'auction';          Owner = 'auction_test_owner';     Migrator = 'auction_test_migrator';     App = 'auction_test_app' },
    @{ Prefix = 'TRANSACTION_DB';      Label = 'Transaction development';     Db = 'transaction_db';      Schema = 'transaction_core'; Owner = 'transaction_owner';      Migrator = 'transaction_migrator';      App = 'transaction_app' },
    @{ Prefix = 'TRANSACTION_TEST_DB'; Label = 'Transaction integration test';Db = 'transaction_test_db'; Schema = 'transaction_core'; Owner = 'transaction_test_owner'; Migrator = 'transaction_test_migrator'; App = 'transaction_test_app' },
    @{ Prefix = 'PAYMENT_DB';          Label = 'Payment development';         Db = 'payment_db';          Schema = 'payment';          Owner = 'payment_owner';          Migrator = 'payment_migrator';          App = 'payment_app' },
    @{ Prefix = 'PAYMENT_TEST_DB';     Label = 'Payment integration test';    Db = 'payment_test_db';     Schema = 'payment';          Owner = 'payment_test_owner';     Migrator = 'payment_test_migrator';     App = 'payment_test_app' }
)

function Read-DotEnv {
    param([Parameter(Mandatory)][string]$Path)

    $values = @{}
    $lineNumber = 0

    foreach ($line in Get-Content -LiteralPath $Path) {
        $lineNumber++
        $trimmed = $line.Trim()

        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith('#')) {
            continue
        }

        $separatorIndex = $line.IndexOf('=')
        if ($separatorIndex -lt 1) {
            throw "Invalid .env.local entry at line $lineNumber. Expected KEY=value."
        }

        $key = $line.Substring(0, $separatorIndex).Trim()
        $value = $line.Substring($separatorIndex + 1).Trim()

        if ($key -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
            throw "Invalid .env.local key '$key' at line $lineNumber."
        }

        if ($values.ContainsKey($key)) {
            throw "Duplicate .env.local key '$key' at line $lineNumber."
        }

        if ($value.Length -ge 2) {
            $first = $value[0]
            $last = $value[$value.Length - 1]

            if (($first -eq "'" -and $last -eq "'") -or
                ($first -eq '"' -and $last -eq '"')) {
                $value = $value.Substring(1, $value.Length - 2)
            }
        }

        $values[$key] = $value
    }

    return $values
}

function Get-RequiredValue {
    param(
        [Parameter(Mandatory)][hashtable]$Values,
        [Parameter(Mandatory)][string]$Key
    )

    if (-not $Values.ContainsKey($Key) -or
        [string]::IsNullOrWhiteSpace([string]$Values[$Key])) {
        throw "Missing required .env.local value: $Key"
    }

    return [string]$Values[$Key]
}

function Assert-ApprovedIdentifier {
    param(
        [Parameter(Mandatory)][string]$Value,
        [Parameter(Mandatory)][string]$Key,
        [Parameter(Mandatory)][string]$Expected
    )

    if ($Value -ne $Expected) {
        throw "$Key must be '$Expected'. Current value: '$Value'."
    }
}

function Assert-Password {
    param(
        [Parameter(Mandatory)][string]$Value,
        [Parameter(Mandatory)][string]$Key
    )

    if ($Value.Length -lt 8) {
        throw "$Key must contain at least 8 characters."
    }

    if ([Text.Encoding]::UTF8.GetByteCount($Value) -gt 256) {
        throw "$Key must not exceed 256 UTF-8 bytes."
    }
}

function ConvertTo-Base64Utf8 {
    param([Parameter(Mandatory)][string]$Value)

    return [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Value))
}

function Quote-PsqlMetaCommandArgument {
    param([Parameter(Mandatory)][string]$Value)

    # Forward slashes avoid psql treating Windows backslashes as escape syntax.
    $normalized = $Value.Replace('\', '/').Replace("'", "''")
    return "'$normalized'"
}

function Invoke-Psql {
    param(
        [Parameter(Mandatory)][string]$Psql,
        [Parameter(Mandatory)][string[]]$Arguments,
        [AllowNull()][string]$InputText = $null,
        [switch]$Sensitive
    )

    if ($null -eq $InputText) {
        $output = & $Psql @Arguments 2>&1
    }
    else {
        $output = $InputText | & $Psql @Arguments 2>&1
    }

    $exitCode = $LASTEXITCODE
    $lines = @($output | ForEach-Object { $_.ToString() })

    if ($exitCode -ne 0) {
        if ($Sensitive) {
            throw "psql failed during secret-bearing bootstrap input. Exit code: $exitCode. Detailed output was suppressed."
        }

        $detail = ($lines | Select-Object -Last 20) -join [Environment]::NewLine
        throw "psql failed with exit code $exitCode.$([Environment]::NewLine)$detail"
    }

    return $lines
}

function Get-BasePsqlArguments {
    param(
        [Parameter(Mandatory)][hashtable]$Values,
        [string]$Database = 'postgres'
    )

    return @(
        '-X'
        '--no-password'
        '--quiet'
        '--set', 'ON_ERROR_STOP=1'
        '--set', 'VERBOSITY=terse'
        '--set', 'SHOW_CONTEXT=never'
        '--host', [string]$Values.POSTGRES_HOST
        '--port', [string]$Values.POSTGRES_PORT
        '--username', [string]$Values.POSTGRES_ADMIN_USER
        '--dbname', $Database
    )
}

$originalEnvironment = @{
    PGPASSWORD        = [Environment]::GetEnvironmentVariable('PGPASSWORD', 'Process')
    PGCONNECT_TIMEOUT = [Environment]::GetEnvironmentVariable('PGCONNECT_TIMEOUT', 'Process')
    PGAPPNAME         = [Environment]::GetEnvironmentVariable('PGAPPNAME', 'Process')
    PGCLIENTENCODING  = [Environment]::GetEnvironmentVariable('PGCLIENTENCODING', 'Process')
}

try {
    foreach ($requiredPath in @($EnvPath, $SqlPath, $SchemaSqlPath)) {
        if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
            throw "Required file is missing: $requiredPath"
        }
    }

    $values = Read-DotEnv -Path $EnvPath

    $hostName = (Get-RequiredValue -Values $values -Key 'POSTGRES_HOST').Trim().ToLowerInvariant()
    $portText = Get-RequiredValue -Values $values -Key 'POSTGRES_PORT'
    $adminUser = Get-RequiredValue -Values $values -Key 'POSTGRES_ADMIN_USER'
    $adminPassword = Get-RequiredValue -Values $values -Key 'POSTGRES_ADMIN_PASSWORD'

    if ($AllowedLocalHosts -notcontains $hostName) {
        throw "Local bootstrap refuses POSTGRES_HOST '$hostName'. Use localhost, 127.0.0.1, or ::1."
    }

    if ($portText -notmatch '^\d+$') {
        throw 'POSTGRES_PORT must be a number.'
    }

    $port = [int]$portText
    if ($port -lt 1 -or $port -gt 65535) {
        throw 'POSTGRES_PORT must be between 1 and 65535.'
    }

    if ($adminUser -notmatch '^[a-z][a-z0-9_]{0,62}$') {
        throw 'POSTGRES_ADMIN_USER must be a valid lowercase PostgreSQL role name.'
    }

    $values.POSTGRES_HOST = $hostName
    $values.POSTGRES_PORT = $portText
    $values.POSTGRES_ADMIN_USER = $adminUser

    foreach ($target in $Targets) {
        $nameKey = "$($target.Prefix)_NAME"
        $schemaKey = "$($target.Prefix)_SCHEMA"
        $ownerKey = "$($target.Prefix)_OWNER"
        $migratorUserKey = "$($target.Prefix)_MIGRATOR_USERNAME"
        $migratorPasswordKey = "$($target.Prefix)_MIGRATOR_PASSWORD"
        $appUserKey = "$($target.Prefix)_APP_USERNAME"
        $appPasswordKey = "$($target.Prefix)_APP_PASSWORD"

        Assert-ApprovedIdentifier -Value (Get-RequiredValue -Values $values -Key $nameKey) -Key $nameKey -Expected $target.Db
        Assert-ApprovedIdentifier -Value (Get-RequiredValue -Values $values -Key $schemaKey) -Key $schemaKey -Expected $target.Schema
        Assert-ApprovedIdentifier -Value (Get-RequiredValue -Values $values -Key $ownerKey) -Key $ownerKey -Expected $target.Owner
        Assert-ApprovedIdentifier -Value (Get-RequiredValue -Values $values -Key $migratorUserKey) -Key $migratorUserKey -Expected $target.Migrator
        Assert-ApprovedIdentifier -Value (Get-RequiredValue -Values $values -Key $appUserKey) -Key $appUserKey -Expected $target.App

        Assert-Password -Value (Get-RequiredValue -Values $values -Key $migratorPasswordKey) -Key $migratorPasswordKey
        Assert-Password -Value (Get-RequiredValue -Values $values -Key $appPasswordKey) -Key $appPasswordKey
    }

    $psqlCommand = Get-Command 'psql' -CommandType Application -ErrorAction Stop
    $psql = $psqlCommand.Source

    $clientVersionOutput = @(& $psql --version 2>&1 | ForEach-Object { $_.ToString() })
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to run psql --version.'
    }

    $clientVersionText = ($clientVersionOutput -join ' ').Trim()
    if ($clientVersionText -match '(?i)psql\s+\(PostgreSQL\)\s+(?<major>[0-9]+)') {
        $clientMajor = [int]$Matches.major
        if ($clientMajor -ne $ApprovedPostgreSqlMajorVersion) {
            Write-Warning "psql client major is $clientMajor; project baseline is PostgreSQL $ApprovedPostgreSqlMajorVersion. Continuing for local development."
        }
    }

    # Simple local-only authentication: keep the admin password in this process
    # environment just while psql runs. It is restored in finally.
    $env:PGPASSWORD = $adminPassword
    $env:PGCONNECT_TIMEOUT = '5'
    $env:PGAPPNAME = 'auction-promax-local-bootstrap'
    $env:PGCLIENTENCODING = 'UTF8'

    # Remove the extra local variable reference as soon as PGPASSWORD is set.
    $adminPassword = $null
    $values.POSTGRES_ADMIN_PASSWORD = $null

    $baseArguments = Get-BasePsqlArguments -Values $values

    $serverFactsSql = @'
SELECT
  current_setting('server_version_num'),
  current_setting('is_superuser'),
  COALESCE(host(inet_server_addr()), 'local'),
  inet_server_port(),
  current_user,
  current_database();
'@

    $serverFactOutput = Invoke-Psql `
        -Psql $psql `
        -Arguments ($baseArguments + @(
            '--tuples-only',
            '--no-align',
            '--field-separator', '|',
            '--command', $serverFactsSql
        ))

    $serverFactLine = @(
        $serverFactOutput |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ -match '^[0-9]+\|(on|off)\|[^|]+\|[0-9]+\|[^|]+\|[^|]+$' }
    ) | Select-Object -Last 1

    if ([string]::IsNullOrWhiteSpace($serverFactLine)) {
        throw 'Unable to read PostgreSQL server information.'
    }

    $facts = $serverFactLine.Split('|')
    $serverVersionNumber = [int]$facts[0]
    $serverMajor = [int][Math]::Floor($serverVersionNumber / 10000)
    $isSuperuser = $facts[1]
    $serverAddress = $facts[2].ToLowerInvariant()
    $serverPort = [int]$facts[3]
    $connectedUser = $facts[4]
    $connectedDatabase = $facts[5]

    if ($serverMajor -ne $ApprovedPostgreSqlMajorVersion) {
        throw "PostgreSQL server major is $serverMajor; expected $ApprovedPostgreSqlMajorVersion."
    }

    if ($isSuperuser -ne 'on') {
        throw "POSTGRES_ADMIN_USER '$connectedUser' must be a PostgreSQL superuser for bootstrap."
    }

    if ($connectedUser -ne $adminUser) {
        throw "Connected as '$connectedUser', but POSTGRES_ADMIN_USER is '$adminUser'."
    }

    if ($connectedDatabase -ne 'postgres') {
        throw "Bootstrap must connect to the postgres database, not '$connectedDatabase'."
    }

    # PostgreSQL/psql may represent loopback addresses in several equivalent forms,
    # including ::1, ::1/128, 127.0.0.1, or 127.0.0.1/32.
    # Use .NET's IPAddress.IsLoopback instead of comparing address strings.
    if ($serverAddress -ne 'local') {
        $normalizedServerAddress = ($serverAddress -split '/', 2)[0].Trim()

        try {
            $parsedServerAddress = [System.Net.IPAddress]::Parse($normalizedServerAddress)
        }
        catch {
            throw "Unable to parse connected PostgreSQL server address '$serverAddress'."
        }

        if (-not [System.Net.IPAddress]::IsLoopback($parsedServerAddress)) {
            throw "Connected server address '$serverAddress' is not local/loopback."
        }
    }

    if ($serverPort -ne $port) {
        throw "Connected PostgreSQL port $serverPort does not match configured port $port."
    }

    Write-Host ''
    Write-Host 'Local PostgreSQL preflight OK'
    Write-Host "  Endpoint : $hostName`:$port"
    Write-Host "  Server   : PostgreSQL $serverMajor"
    Write-Host "  Admin    : $connectedUser (superuser)"
    Write-Host '  Databases:'
    foreach ($target in $Targets) {
        Write-Host "    - $($target.Db) [$($target.Schema)]"
    }
    Write-Host ''

    if (-not $PSCmdlet.ShouldProcess(
        "$hostName`:$port",
        'Create/update local PostgreSQL roles, databases, schemas and privileges'
    )) {
        Write-Host 'Bootstrap cancelled.'
        return
    }

    $identifierArguments = @()
    $stdinLines = [System.Collections.Generic.List[string]]::new()

    [void]$stdinLines.Add('\set ECHO none')
    [void]$stdinLines.Add('\set ON_ERROR_STOP on')
    [void]$stdinLines.Add('\set VERBOSITY terse')
    [void]$stdinLines.Add('\set SHOW_CONTEXT never')

    foreach ($target in $Targets) {
        $prefix = $target.Prefix.ToLowerInvariant()

        $identifierArguments += @(
            '--set', "${prefix}_name=$($values["$($target.Prefix)_NAME"])"
            '--set', "${prefix}_schema=$($values["$($target.Prefix)_SCHEMA"])"
            '--set', "${prefix}_owner=$($values["$($target.Prefix)_OWNER"])"
            '--set', "${prefix}_migrator_username=$($values["$($target.Prefix)_MIGRATOR_USERNAME"])"
            '--set', "${prefix}_app_username=$($values["$($target.Prefix)_APP_USERNAME"])"
        )

        $migratorPasswordBase64 = ConvertTo-Base64Utf8 -Value ([string]$values["$($target.Prefix)_MIGRATOR_PASSWORD"])
        $appPasswordBase64 = ConvertTo-Base64Utf8 -Value ([string]$values["$($target.Prefix)_APP_PASSWORD"])

        [void]$stdinLines.Add("\set ${prefix}_migrator_password_b64 '$migratorPasswordBase64'")
        [void]$stdinLines.Add("\set ${prefix}_app_password_b64 '$appPasswordBase64'")

        $values["$($target.Prefix)_MIGRATOR_PASSWORD"] = $null
        $values["$($target.Prefix)_APP_PASSWORD"] = $null
    }

    $quotedSqlPath = Quote-PsqlMetaCommandArgument -Value $SqlPath
    [void]$stdinLines.Add("\ir $quotedSqlPath")

    $bootstrapInput = $stdinLines -join [Environment]::NewLine

    [void](Invoke-Psql `
        -Psql $psql `
        -Arguments ($baseArguments + $identifierArguments) `
        -InputText $bootstrapInput `
        -Sensitive)

    $bootstrapInput = $null
    $stdinLines.Clear()

    Write-Host 'Bootstrap SQL completed successfully.'

    if (-not $SkipVerify) {
        if (Test-Path -LiteralPath $VerifyPath -PathType Leaf) {
            Write-Host 'Running local database verification...'

            $currentPowerShell = (Get-Process -Id $PID).Path
            Push-Location $ApiRoot
            try {
                & $currentPowerShell -NoLogo -NoProfile -NonInteractive -File $VerifyPath
                $verifyExitCode = $LASTEXITCODE
            }
            finally {
                Pop-Location
            }

            if ($verifyExitCode -ne 0) {
                throw "local-db-verify.ps1 failed with exit code $verifyExitCode."
            }

            Write-Host 'Verification completed successfully.'
        }
        else {
            Write-Warning "Verification script not found: $VerifyPath"
        }
    }
    else {
        Write-Warning 'Verification skipped because -SkipVerify was specified.'
    }

    Write-Host ''
    Write-Host 'Local PostgreSQL bootstrap completed successfully.'
}
catch {
    [Console]::Error.WriteLine("Local PostgreSQL bootstrap failed: $($_.Exception.Message)")
    exit 1
}
finally {
    foreach ($entry in $originalEnvironment.GetEnumerator()) {
        if ($null -eq $entry.Value) {
            # Cleanup must also run after a -WhatIf preflight. Otherwise a
            # temporary PGPASSWORD could remain in an interactive shell.
            Remove-Item "Env:$($entry.Key)" -ErrorAction SilentlyContinue -WhatIf:$false
        }
        else {
            Set-Item "Env:$($entry.Key)" -Value $entry.Value
        }
    }
}
