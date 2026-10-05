#Requires -Version 5.1
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$launcher = Join-Path $PSScriptRoot 'run-identity-local.ps1'
if (-not (Test-Path -LiteralPath $launcher -PathType Leaf)) {
    throw 'RED: local launcher is missing'
}
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('t08-launcher-' + [guid]::NewGuid().ToString('N'))
$service = Join-Path $testRoot 'services/identity-profile-service'
[void][IO.Directory]::CreateDirectory($service)
$envFile = Join-Path $testRoot '.env.local'
$marker = Join-Path $testRoot 'maven-observed.txt'
$keys = @('IDENTITY_DB_URL','IDENTITY_DB_APP_USERNAME','IDENTITY_DB_APP_PASSWORD','IDENTITY_DB_MIGRATOR_USERNAME','IDENTITY_DB_MIGRATOR_PASSWORD')
$original = @{}
foreach ($key in $keys) { $original[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
$originalMarker = $env:T08_TEST_MARKER
$originalExit = $env:T08_TEST_EXIT
$originalLocation = (Get-Location).Path
$valid = @(
    '# Synthetic local fixture',
    'IDENTITY_DB_URL=jdbc:postgresql://localhost:5432/identity_db',
    'IDENTITY_DB_APP_USERNAME=identity_app',
    'IDENTITY_DB_APP_PASSWORD="fixture-app=only"',
    'IDENTITY_DB_MIGRATOR_USERNAME=identity_migrator',
    "IDENTITY_DB_MIGRATOR_PASSWORD='fixture-migrator-only'",
    'IGNORED_BOOTSTRAP_SETTING=not-exported'
)
$fake = @'
@echo off
if not "%IDENTITY_DB_URL%"=="jdbc:postgresql://localhost:5432/identity_db" exit /b 91
if not "%IDENTITY_DB_APP_USERNAME%"=="identity_app" exit /b 92
if not "%IDENTITY_DB_APP_PASSWORD%"=="fixture-app=only" exit /b 93
if not "%IDENTITY_DB_MIGRATOR_USERNAME%"=="identity_migrator" exit /b 94
if not "%IDENTITY_DB_MIGRATOR_PASSWORD%"=="fixture-migrator-only" exit /b 95
if not "%~1"=="-B" exit /b 96
if not "%~2"=="spring-boot:run" exit /b 97
echo %*| findstr /L /C:"-Dspring-boot.run.profiles=local" >nul
if errorlevel 1 exit /b 98
echo %*| findstr /L /C:"-Dspring-boot.run.arguments=--server.address=127.0.0.1 --server.port=8080" >nul
if errorlevel 1 exit /b 99
echo observed>"%T08_TEST_MARKER%"
exit /b %T08_TEST_EXIT%
'@
[IO.File]::WriteAllText((Join-Path $service 'mvnw.cmd'), $fake, [Text.Encoding]::ASCII)
function Write-Fixture([string[]]$Lines) { [IO.File]::WriteAllLines($envFile, $Lines, [Text.Encoding]::ASCII) }
function Assert-Restored {
    foreach ($key in $keys) {
        if ([Environment]::GetEnvironmentVariable($key, 'Process') -ne $script:expected[$key]) {
            throw 'Environment restoration failed'
        }
    }
    if ((Get-Location).Path -ne $originalLocation) { throw 'Working directory restoration failed' }
}
function Assert-Rejected([string]$Name, [string[]]$Lines, [string]$Code) {
    Write-Fixture $Lines
    if (Test-Path -LiteralPath $marker) { Remove-Item -LiteralPath $marker }
    $caught = $false
    try { & $launcher -ApiRoot $testRoot }
    catch {
        if ($_.Exception.Message -notmatch [regex]::Escape($Code)) { throw }
        $caught = $true
    }
    if (-not $caught -or (Test-Path -LiteralPath $marker)) { throw "Rejection failed: $Name" }
    Assert-Restored
    Write-Output "[PASS] $Name rejected before Maven"
}
try {
    $env:T08_TEST_MARKER = $marker
    $env:T08_TEST_EXIT = '0'
    foreach ($mode in @('existing','unset')) {
        $script:expected = @{}
        foreach ($key in $keys) {
            $prior = if ($mode -eq 'existing') { 'prior-fixture' } else { $null }
            if ($mode -eq 'unset') { Remove-Item -LiteralPath "Env:$key" -ErrorAction SilentlyContinue }
            else { [Environment]::SetEnvironmentVariable($key, $prior, 'Process') }
            $script:expected[$key] = $prior
        }
        Write-Fixture $valid
        & $launcher -ApiRoot $testRoot
        if (-not (Test-Path -LiteralPath $marker)) { throw 'Maven boundary was not exercised' }
        Assert-Restored
        Write-Output "[PASS] successful Maven invocation and $mode environment restoration"
    }
    $env:T08_TEST_EXIT = '7'
    $caught = $false
    try { & $launcher -ApiRoot $testRoot }
    catch { if ($_.Exception.Message -ne 'LOCAL_IDENTITY_MAVEN_FAILED:7') { throw }; $caught = $true }
    if (-not $caught) { throw 'Maven failure was ignored' }
    Assert-Restored
    Write-Output '[PASS] Maven failure and restoration'
    $env:T08_TEST_EXIT = '0'
    foreach ($override in @('SPRING_DATASOURCE_URL','SPRING_FLYWAY_URL','SPRING_APPLICATION_JSON','SPRING_CONFIG_LOCATION','SPRING_PROFILES_ACTIVE','JAVA_TOOL_OPTIONS','JDK_JAVA_OPTIONS','MAVEN_OPTS','MAVEN_ARGS')) {
        $savedOverride = [Environment]::GetEnvironmentVariable($override, 'Process')
        try {
            [Environment]::SetEnvironmentVariable($override, 'synthetic-override', 'Process')
            Assert-Rejected "inherited $override" $valid 'LOCAL_IDENTITY_INHERITED_OVERRIDE'
            if ([Environment]::GetEnvironmentVariable($override, 'Process') -ne 'synthetic-override') { throw 'Inherited override was mutated' }
        } finally {
            if ($null -eq $savedOverride) { Remove-Item -LiteralPath "Env:$override" -ErrorAction SilentlyContinue }
            else { [Environment]::SetEnvironmentVariable($override, $savedOverride, 'Process') }
        }
    }
    Assert-Rejected 'missing key' @($valid | Where-Object { $_ -notmatch '^IDENTITY_DB_APP_PASSWORD=' }) 'LOCAL_IDENTITY_REQUIRED_VALUE'
    Assert-Rejected 'blank value' @($valid -replace '^IDENTITY_DB_APP_PASSWORD=.*$', 'IDENTITY_DB_APP_PASSWORD= ') 'LOCAL_IDENTITY_REQUIRED_VALUE'
    Assert-Rejected 'duplicate key' @($valid + 'IDENTITY_DB_APP_USERNAME=identity_app') 'LOCAL_IDENTITY_ENV_DUPLICATE'
    Assert-Rejected 'malformed line' @($valid + 'malformed') 'LOCAL_IDENTITY_ENV_INVALID'
    Assert-Rejected 'blank key' @($valid + '=synthetic') 'LOCAL_IDENTITY_ENV_INVALID'
    Assert-Rejected 'placeholder password' @($valid -replace '^IDENTITY_DB_APP_PASSWORD=.*$', 'IDENTITY_DB_APP_PASSWORD=replace-me') 'LOCAL_IDENTITY_PLACEHOLDER'
    Assert-Rejected 'remote host' @($valid -replace 'localhost:5432/identity_db', 'remote.invalid:5432/identity_db') 'LOCAL_IDENTITY_DB_URL'
    Assert-Rejected 'test database' @($valid -replace '/identity_db', '/identity_test_db') 'LOCAL_IDENTITY_DB_URL'
    Assert-Rejected 'invalid port' @($valid -replace ':5432/', ':65536/') 'LOCAL_IDENTITY_DB_URL'
    Assert-Rejected 'wrong runtime role' @($valid -replace '=identity_app$', '=identity_migrator') 'LOCAL_IDENTITY_DB_ROLE'
    Assert-Rejected 'unmatched quote' @($valid -replace '^IDENTITY_DB_APP_PASSWORD=.*$', 'IDENTITY_DB_APP_PASSWORD="fixture') 'LOCAL_IDENTITY_ENV_INVALID'
    Remove-Item -LiteralPath $envFile
    $caught = $false
    try { & $launcher -ApiRoot $testRoot }
    catch { if ($_.Exception.Message -ne 'LOCAL_IDENTITY_ENV_MISSING') { throw }; $caught = $true }
    if (-not $caught) { throw 'Missing file accepted' }
    Assert-Restored
    Write-Output '[PASS] missing file rejected'
    Write-Output 'Local identity launcher tests: PASS'
} finally {
    foreach ($key in $keys) { [Environment]::SetEnvironmentVariable($key, $original[$key], 'Process') }
    [Environment]::SetEnvironmentVariable('T08_TEST_MARKER', $originalMarker, 'Process')
    [Environment]::SetEnvironmentVariable('T08_TEST_EXIT', $originalExit, 'Process')
    # Remove only explicitly created fixture files; no recursive deletion.
    foreach ($path in @($envFile, $marker, (Join-Path $service 'mvnw.cmd'))) {
        if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path }
    }
    Remove-Item -LiteralPath $service
    Remove-Item -LiteralPath (Join-Path $testRoot 'services')
    Remove-Item -LiteralPath $testRoot
}
