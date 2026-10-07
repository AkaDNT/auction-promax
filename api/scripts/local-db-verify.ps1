<#
.SYNOPSIS
Verifies ADR-016 local PostgreSQL ownership, privileges, and database isolation.
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Expected permission failures are part of this verifier. On newer PowerShell,
# do not turn a non-zero psql exit code into a terminating PowerShell error.
if (Test-Path -LiteralPath 'Variable:\PSNativeCommandUseErrorActionPreference') {
    $PSNativeCommandUseErrorActionPreference = $false
}

$Root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$EnvPath = Join-Path $Root '.env.local'

Import-Module (Join-Path $PSScriptRoot 'LocalDbTopology.psm1') -Force
$Targets = @(Get-LocalDatabaseTopology)

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

        $separator = $line.IndexOf('=')
        if ($separator -lt 1) {
            throw "Invalid .env.local entry at line $lineNumber. Expected KEY=value."
        }

        $key = $line.Substring(0, $separator).Trim()
        $value = $line.Substring($separator + 1).Trim()

        if ($values.ContainsKey($key)) {
            throw "Duplicate .env.local key '$key' at line $lineNumber."
        }

        if ($value.Length -ge 2) {
            $first = $value[0]
            $last = $value[$value.Length - 1]
            if (($first -eq '"' -and $last -eq '"') -or
                ($first -eq "'" -and $last -eq "'")) {
                $value = $value.Substring(1, $value.Length - 2)
            }
        }

        $values[$key] = $value
    }

    return $values
}

function Require-Value {
    param(
        [Parameter(Mandatory)][hashtable]$Values,
        [Parameter(Mandatory)][string]$Key
    )

    if (-not $Values.ContainsKey($Key) -or
        [string]::IsNullOrWhiteSpace([string]$Values[$Key])) {
        throw "Missing required .env.local value: $Key."
    }
}

function Invoke-Psql {
    param(
        [Parameter(Mandatory)][string]$Psql,
        [Parameter(Mandatory)][hashtable]$Values,
        [Parameter(Mandatory)][string]$User,
        [Parameter(Mandatory)][string]$Password,
        [Parameter(Mandatory)][string]$Database,
        [Parameter(Mandatory)][string]$Sql
    )

    $hadPreviousPassword = Test-Path Env:PGPASSWORD
    $previousPassword = $env:PGPASSWORD

    try {
        $env:PGPASSWORD = $Password

        $arguments = @(
            '-X',
            '--no-password',
            '-v', 'ON_ERROR_STOP=1',
            '-h', [string]$Values.POSTGRES_HOST,
            '-p', [string]$Values.POSTGRES_PORT,
            '-U', $User,
            '-d', $Database,
            '-Atq',
            '-c', $Sql
        )

        & $Psql @arguments 2>&1 | Out-Null
        $exitCode = $LASTEXITCODE
        return ($exitCode -eq 0)
    }
    finally {
        if ($hadPreviousPassword) {
            $env:PGPASSWORD = $previousPassword
        }
        else {
            Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        }
    }
}

function Require-Psql {
    param(
        [Parameter(Mandatory)][string]$Psql,
        [Parameter(Mandatory)][hashtable]$Values,
        [Parameter(Mandatory)][string]$User,
        [Parameter(Mandatory)][string]$Password,
        [Parameter(Mandatory)][string]$Database,
        [Parameter(Mandatory)][string]$Sql,
        [Parameter(Mandatory)][string]$Failure
    )

    if (-not (Invoke-Psql $Psql $Values $User $Password $Database $Sql)) {
        throw $Failure
    }
}

try {
    if (-not (Test-Path -LiteralPath $EnvPath -PathType Leaf)) {
        throw "Missing $EnvPath"
    }

    $values = Read-DotEnv $EnvPath
    $psql = (Get-Command psql -CommandType Application -ErrorAction Stop).Source

    foreach ($key in @('POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_ADMIN_USER', 'POSTGRES_ADMIN_PASSWORD')) {
        Require-Value $values $key
    }

    foreach ($target in $Targets) {
        foreach ($suffix in @('NAME', 'SCHEMA', 'OWNER', 'MIGRATOR_USERNAME', 'MIGRATOR_PASSWORD', 'APP_USERNAME', 'APP_PASSWORD')) {
            Require-Value $values "$($target.Prefix)_$suffix"
        }

        $expected = @{
            NAME = $target.Db
            SCHEMA = $target.Schema
            OWNER = $target.Owner
            MIGRATOR_USERNAME = $target.Migrator
            APP_USERNAME = $target.App
        }

        foreach ($suffix in $expected.Keys) {
            $key = "$($target.Prefix)_$suffix"
            if ([string]$values[$key] -ne [string]$expected[$suffix]) {
                throw "$key does not match ADR-016. Expected '$($expected[$suffix])'."
            }
        }
    }

    $adminUser = [string]$values.POSTGRES_ADMIN_USER
    $adminPassword = [string]$values.POSTGRES_ADMIN_PASSWORD

    # Global managed-role attributes and memberships.
    $ownerNames = @($Targets | ForEach-Object { $_.Owner }) | Sort-Object -Unique
    $migratorNames = @($Targets | ForEach-Object { $_.Migrator }) | Sort-Object -Unique
    $appNames = @($Targets | ForEach-Object { $_.App }) | Sort-Object -Unique
    $roleNames = @($ownerNames + $migratorNames + $appNames) | Sort-Object -Unique

    $ownerList = ($ownerNames | ForEach-Object { "'$_'" }) -join ', '
    $migratorList = ($migratorNames | ForEach-Object { "'$_'" }) -join ', '
    $appList = ($appNames | ForEach-Object { "'$_'" }) -join ', '
    $roleList = ($roleNames | ForEach-Object { "'$_'" }) -join ', '

    $metadataSql = @"
SELECT 1 / CASE WHEN
    (SELECT count(*) FROM pg_roles WHERE rolname IN ($roleList)) = $($roleNames.Count)
    AND NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname IN ($roleList)
          AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls OR rolinherit)
    )
    AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ($ownerList) AND rolcanlogin)
    AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ($migratorList) AND NOT rolcanlogin)
    AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ($appList) AND NOT rolcanlogin)
    AND NOT EXISTS (
        SELECT 1
        FROM pg_auth_members membership
        JOIN pg_roles granted_role ON granted_role.oid = membership.roleid
        JOIN pg_roles member_role ON member_role.oid = membership.member
        WHERE granted_role.rolname IN ($roleList)
           OR member_role.rolname IN ($roleList)
    )
THEN 1 ELSE 0 END;
"@

    Require-Psql $psql $values $adminUser $adminPassword 'postgres' $metadataSql `
        'Service-role attributes or memberships violate ADR-016.'

    foreach ($target in $Targets) {
        $db = $target.Db
        $schema = $target.Schema
        $appUser = [string]$values["$($target.Prefix)_APP_USERNAME"]
        $appPassword = [string]$values["$($target.Prefix)_APP_PASSWORD"]
        $migratorUser = [string]$values["$($target.Prefix)_MIGRATOR_USERNAME"]
        $migratorPassword = [string]$values["$($target.Prefix)_MIGRATOR_PASSWORD"]

        $ownershipSql = @"
SELECT 1 / CASE WHEN
    (SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname = '$db') = '$($target.Owner)'
    AND NOT EXISTS (
        SELECT 1
        FROM pg_database database
        CROSS JOIN LATERAL aclexplode(COALESCE(database.datacl, acldefault('d', database.datdba))) privilege
        WHERE database.datname = '$db'
          AND privilege.grantee = 0
          AND privilege.privilege_type IN ('CONNECT', 'CREATE', 'TEMPORARY')
    )
THEN 1 ELSE 0 END;
"@
        Require-Psql $psql $values $adminUser $adminPassword 'postgres' $ownershipSql `
            "$db database owner or PUBLIC privileges violate ADR-016."

        # Own-database connectivity proves the credentials before negative tests.
        Require-Psql $psql $values $appUser $appPassword $db 'SELECT 1;' `
            "$appUser cannot connect to its own database $db."
        Require-Psql $psql $values $migratorUser $migratorPassword $db 'SELECT 1;' `
            "$migratorUser cannot connect to its own database $db."

        $appBaselineSql = @"
SELECT 1 / CASE WHEN
    has_database_privilege(current_user, current_database(), 'CONNECT')
    AND NOT has_database_privilege(current_user, current_database(), 'CREATE')
    AND NOT has_database_privilege(current_user, current_database(), 'TEMPORARY')
    AND has_schema_privilege(current_user, '$schema', 'USAGE')
    AND NOT has_schema_privilege(current_user, '$schema', 'CREATE')
THEN 1 ELSE 0 END;
"@
        Require-Psql $psql $values $appUser $appPassword $db $appBaselineSql `
            "$appUser does not have the expected runtime database/schema access."

        $migratorBaselineSql = @"
SELECT 1 / CASE WHEN
    has_database_privilege(current_user, current_database(), 'CONNECT')
    AND NOT has_database_privilege(current_user, current_database(), 'CREATE')
    AND NOT has_database_privilege(current_user, current_database(), 'TEMPORARY')
    AND has_schema_privilege(current_user, '$schema', 'USAGE')
    AND has_schema_privilege(current_user, '$schema', 'CREATE')
    AND (SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname = '$schema') = current_user
THEN 1 ELSE 0 END;
"@
        Require-Psql $psql $values $migratorUser $migratorPassword $db $migratorBaselineSql `
            "$migratorUser does not have the expected migrator database/schema access."

        # Object-level model:
        #   new migrator objects -> app denied by default
        #   explicit migration GRANT -> app DML allowed
        #   schema DDL -> app still denied
        $probe = '__adr016_privilege_probe'
        $ddlProbe = '__adr016_app_must_not_create'

        Require-Psql $psql $values $migratorUser $migratorPassword $db `
            "DROP TABLE IF EXISTS $schema.$probe; DROP TABLE IF EXISTS $schema.$ddlProbe; CREATE TABLE $schema.$probe (id integer PRIMARY KEY, value text NOT NULL);" `
            "$migratorUser cannot create the verification probe in $schema."

        try {
            if (Invoke-Psql $psql $values $appUser $appPassword $db "SELECT * FROM $schema.$probe;") {
                throw "$appUser unexpectedly has default SELECT privilege on new objects in $schema."
            }

            if (Invoke-Psql $psql $values $appUser $appPassword $db "INSERT INTO $schema.$probe (id, value) VALUES (1, 'before-grant');") {
                throw "$appUser unexpectedly has default INSERT privilege on new objects in $schema."
            }

            Require-Psql $psql $values $migratorUser $migratorPassword $db `
                "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE $schema.$probe TO $appUser;" `
                "$migratorUser cannot grant explicit runtime DML in $schema."

            $runtimeDmlSql = @"
INSERT INTO $schema.$probe (id, value) VALUES (1, 'created');
UPDATE $schema.$probe SET value = 'updated' WHERE id = 1;
SELECT 1 / CASE WHEN EXISTS (
    SELECT 1 FROM $schema.$probe WHERE id = 1 AND value = 'updated'
) THEN 1 ELSE 0 END;
DELETE FROM $schema.$probe WHERE id = 1;
"@
            Require-Psql $psql $values $appUser $appPassword $db $runtimeDmlSql `
                "$appUser cannot perform explicitly granted runtime DML in $schema."

            if (Invoke-Psql $psql $values $appUser $appPassword $db "CREATE TABLE $schema.$ddlProbe (id integer);") {
                throw "$appUser unexpectedly created a table in $schema."
            }

            if (Invoke-Psql $psql $values $appUser $appPassword $db "ALTER TABLE $schema.$probe ADD COLUMN forbidden_column integer;") {
                throw "$appUser unexpectedly altered a migrator-owned table in $schema."
            }
        }
        finally {
            # Use the local bootstrap admin for cleanup so an unexpected DDL grant
            # cannot leave an app-owned probe behind or mask the original failure.
            Require-Psql $psql $values $adminUser $adminPassword $db `
                "DROP TABLE IF EXISTS $schema.$probe; DROP TABLE IF EXISTS $schema.$ddlProbe;" `
                "Could not clean up verification probes in $schema."
        }

        # App/migrator roles must not connect to another managed service database.
        foreach ($other in $Targets | Where-Object { $_.Db -ne $db }) {
            if (Invoke-Psql $psql $values $appUser $appPassword $other.Db 'SELECT 1;') {
                throw "$appUser unexpectedly connected to $($other.Db)."
            }
            if (Invoke-Psql $psql $values $migratorUser $migratorPassword $other.Db 'SELECT 1;') {
                throw "$migratorUser unexpectedly connected to $($other.Db)."
            }
        }

        Write-Host "$db`: ownership, schema rights, default-deny, explicit DML, DDL denial, and cross-database isolation verified"
    }

    Write-Host ''
    Write-Host 'ADR-016 local PostgreSQL verification passed.'
    exit 0
}
catch {
    Write-Error "Local database verification failed: $($_.Exception.Message)"
    exit 1
}
