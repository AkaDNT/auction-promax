#Requires -Version 5.1
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$runnerSource = Join-Path $PSScriptRoot 'Run-ServiceLocal.ps1'
$httpVerifierSource = Join-Path $PSScriptRoot 'Test-ServiceHttp.ps1'
$registrySource = Join-Path $PSScriptRoot '..\service-foundation\services.json'
foreach ($path in @($runnerSource, $httpVerifierSource, $registrySource)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw 'SERVICE_LOCAL_TEST_SOURCE_MISSING' }
}

$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('auction-promax-service-local-' + [guid]::NewGuid().ToString('N'))
$apiRoot = Join-Path $testRoot 'api'
$scriptsRoot = Join-Path $apiRoot 'scripts'
$foundationRoot = Join-Path $apiRoot 'service-foundation'
$configPath = Join-Path $apiRoot '.env.local'
$logPath = Join-Path $apiRoot 'logs/service-http.log'
$markerPath = Join-Path $apiRoot 'maven-observed.txt'
$servicePath = Join-Path $apiRoot 'services/auction-service'
$gatewayPath = Join-Path $apiRoot 'services/realtime-gateway'
$runner = Join-Path $scriptsRoot 'Run-ServiceLocal.ps1'
$httpVerifier = Join-Path $scriptsRoot 'Test-ServiceHttp.ps1'
$targetKeys = @('AUCTION_DB_URL','AUCTION_DB_APP_USERNAME','AUCTION_DB_APP_PASSWORD','AUCTION_DB_MIGRATOR_USERNAME','AUCTION_DB_MIGRATOR_PASSWORD')
$overrideKeys = @('SPRING_DATASOURCE_URL','SPRING_APPLICATION_JSON','SPRING_PROFILES_ACTIVE','JAVA_TOOL_OPTIONS','MAVEN_OPTS','BIDDING_DB_APP_PASSWORD','POSTGRES_ADMIN_PASSWORD','POSTGRES_PASSWORD','PGPASSWORD','PGPASSFILE','DATABASE_URL')
$allChangedKeys = @($targetKeys + $overrideKeys + @('T04_MAVEN_MARKER','T04_EXPECT_CWD','T04_MAVEN_EXIT')) | Select-Object -Unique
$originalEnvironment = @{}
foreach ($key in $allChangedKeys) { $originalEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
$originalLocation = (Get-Location).Path
$runningOnWindows = [Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT

function Write-Configuration {
    param([string[]]$Lines)
    [IO.File]::WriteAllLines($configPath, $Lines, [Text.Encoding]::UTF8)
}

function Get-ValidConfiguration {
    @(
        '# synthetic local-only fixture',
        'AUCTION_DB_URL=jdbc:postgresql://localhost:5432/auction_db',
        'AUCTION_DB_APP_USERNAME=auction_app',
        'AUCTION_DB_APP_PASSWORD=synthetic-auction-app-password',
        'AUCTION_DB_MIGRATOR_USERNAME=auction_migrator',
        'AUCTION_DB_MIGRATOR_PASSWORD=synthetic-auction-migrator-password'
    )
}

function Reset-Marker {
    if (Test-Path -LiteralPath $markerPath) { Remove-Item -LiteralPath $markerPath -Force }
}

function Assert-RunnerRejected {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$ExpectedCode,
        [Parameter(Mandatory)][scriptblock]$Action
    )
    Reset-Marker
    $caughtCode = $null
    $output = ''
    try { $output = (& $Action 2>&1 | Out-String) }
    catch { $caughtCode = $_.Exception.Message }
    if ($caughtCode -cne $ExpectedCode) { throw "Fixture rejected incorrectly: $Name" }
    if (Test-Path -LiteralPath $markerPath) { throw "Fixture reached Maven unexpectedly: $Name" }
    if ($output -match 'synthetic-(auction|migrator)-password') { throw "Fixture leaked a secret: $Name" }
    Write-Output "[PASS] $Name"
}

function Write-FakeWrapper {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$ExpectedService)
    if ($runningOnWindows) {
        $content = @"
@echo off
if not "%T04_EXPECT_CWD%"=="%CD%" exit /b 81
if not "%~1"=="-B" exit /b 82
if not "%~2"=="spring-boot:run" exit /b 83
if not "%~3"=="-Dspring-boot.run.profiles=local" exit /b 84
if not "%~4"=="-Dspring-boot.run.arguments=--server.address=127.0.0.1 --server.port=9091" exit /b 85
if "$ExpectedService"=="auction-service" (
  if not "%AUCTION_DB_URL%"=="jdbc:postgresql://localhost:5432/auction_db" exit /b 86
  if not "%AUCTION_DB_APP_USERNAME%"=="auction_app" exit /b 87
  if not "%AUCTION_DB_APP_PASSWORD%"=="synthetic-auction-app-password" exit /b 88
  if not "%AUCTION_DB_MIGRATOR_USERNAME%"=="auction_migrator" exit /b 89
  if not "%AUCTION_DB_MIGRATOR_PASSWORD%"=="synthetic-auction-migrator-password" exit /b 90
) else (
  if defined AUCTION_DB_URL exit /b 91
  if defined AUCTION_DB_APP_USERNAME exit /b 92
  if defined AUCTION_DB_APP_PASSWORD exit /b 93
  if defined AUCTION_DB_MIGRATOR_USERNAME exit /b 94
  if defined AUCTION_DB_MIGRATOR_PASSWORD exit /b 95
)
echo PASS>"%T04_MAVEN_MARKER%"
exit /b %T04_MAVEN_EXIT%
"@
        [IO.File]::WriteAllText($Path, $content, [Text.Encoding]::ASCII)
        return
    }

    $content = @'
#!/bin/sh
[ "$T04_EXPECT_CWD" = "$PWD" ] || exit 81
[ "$1" = "-B" ] || exit 82
[ "$2" = "spring-boot:run" ] || exit 83
[ "$3" = "-Dspring-boot.run.profiles=local" ] || exit 84
[ "$4" = "-Dspring-boot.run.arguments=--server.address=127.0.0.1 --server.port=9091" ] || exit 85
if [ "__EXPECTED_SERVICE__" = "auction-service" ]; then
  [ "$AUCTION_DB_URL" = "jdbc:postgresql://localhost:5432/auction_db" ] || exit 86
  [ "$AUCTION_DB_APP_USERNAME" = "auction_app" ] || exit 87
  [ "$AUCTION_DB_APP_PASSWORD" = "synthetic-auction-app-password" ] || exit 88
  [ "$AUCTION_DB_MIGRATOR_USERNAME" = "auction_migrator" ] || exit 89
  [ "$AUCTION_DB_MIGRATOR_PASSWORD" = "synthetic-auction-migrator-password" ] || exit 90
else
  [ -z "${AUCTION_DB_URL-}" ] || exit 91
  [ -z "${AUCTION_DB_APP_USERNAME-}" ] || exit 92
  [ -z "${AUCTION_DB_APP_PASSWORD-}" ] || exit 93
  [ -z "${AUCTION_DB_MIGRATOR_USERNAME-}" ] || exit 94
  [ -z "${AUCTION_DB_MIGRATOR_PASSWORD-}" ] || exit 95
fi
printf 'PASS\n' > "$T04_MAVEN_MARKER"
exit "$T04_MAVEN_EXIT"
'@
    $content = $content.Replace('__EXPECTED_SERVICE__', $ExpectedService)
    [IO.File]::WriteAllText($Path, $content, [Text.Encoding]::ASCII)
    $mode = [IO.UnixFileMode]::UserRead -bor [IO.UnixFileMode]::UserWrite -bor [IO.UnixFileMode]::UserExecute
    $mode = $mode -bor [IO.UnixFileMode]::GroupRead -bor [IO.UnixFileMode]::GroupExecute
    $mode = $mode -bor [IO.UnixFileMode]::OtherRead -bor [IO.UnixFileMode]::OtherExecute
    [IO.File]::SetUnixFileMode($Path, $mode)
}

try {
    [void][IO.Directory]::CreateDirectory($scriptsRoot)
    [void][IO.Directory]::CreateDirectory($foundationRoot)
    [void][IO.Directory]::CreateDirectory($servicePath)
    [void][IO.Directory]::CreateDirectory($gatewayPath)
    Copy-Item -LiteralPath $runnerSource -Destination $runner
    Copy-Item -LiteralPath $httpVerifierSource -Destination $httpVerifier
    Copy-Item -LiteralPath $registrySource -Destination (Join-Path $foundationRoot 'services.json')
    [IO.File]::WriteAllText((Join-Path $testRoot '.gitignore'), "**/.env.local`n**/*.log`n", [Text.Encoding]::ASCII)

    & git -C $testRoot init --quiet
    if ($LASTEXITCODE -ne 0) { throw 'SERVICE_LOCAL_TEST_GIT_INIT_FAILED' }
    & git -C $testRoot check-ignore --quiet -- api/.env.local
    if ($LASTEXITCODE -ne 0) { throw 'SERVICE_LOCAL_TEST_CONFIG_NOT_IGNORED' }

    $wrapperName = if ($runningOnWindows) { 'mvnw.cmd' } else { 'mvnw' }
    $auctionWrapper = Join-Path $servicePath $wrapperName
    $gatewayWrapper = Join-Path $gatewayPath $wrapperName
    Write-FakeWrapper -Path $auctionWrapper -ExpectedService 'auction-service'
    Write-FakeWrapper -Path $gatewayWrapper -ExpectedService 'realtime-gateway'
    $valid = Get-ValidConfiguration
    Write-Configuration $valid

    $env:T04_MAVEN_MARKER = $markerPath
    $env:T04_MAVEN_EXIT = '0'
    $env:T04_EXPECT_CWD = $servicePath

    # Test T04 RED/GREEN boundary: a selected service receives only its own validated settings.
    foreach ($mode in @('absent','empty')) {
        foreach ($key in $targetKeys) {
            if ($mode -eq 'absent') { Remove-Item -LiteralPath "Env:$key" -ErrorAction SilentlyContinue }
            else { [Environment]::SetEnvironmentVariable($key, '', 'Process') }
        }
        Reset-Marker
        $output = (& $runner -ServiceId 'auction-service' -ConfigurationPath $configPath -Port 9091 2>&1 | Out-String)
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $markerPath)) { throw "Runner did not invoke the controlled Maven child for $mode environment" }
        if ($output -match 'synthetic-(auction|migrator)-password') { throw 'Successful runner output leaked a synthetic credential' }
        foreach ($key in $targetKeys) {
            $actual = [Environment]::GetEnvironmentVariable($key, 'Process')
            if ($mode -eq 'absent' -and $null -ne $actual) { throw 'Absent environment value was not restored' }
            if ($mode -eq 'empty' -and $actual -cne '') { throw 'Empty environment value was not restored' }
        }
        if ((Get-Location).Path -cne $originalLocation) { throw 'Working location was not restored' }
        Write-Output "[PASS] restoreAbsentAndEmptyVariables ($mode)"
    }

    # Assert successful invocation also restores prior nonempty values.
    foreach ($key in $targetKeys) { [Environment]::SetEnvironmentVariable($key, 'prior-fixture-value', 'Process') }
    Reset-Marker
    $successOutput = (& $runner -ServiceId 'auction-service' -ConfigurationPath $configPath -Port 9091 2>&1 | Out-String)
    if (-not (Test-Path -LiteralPath $markerPath)) { throw 'Successful invocation did not reach Maven boundary' }
    if ($successOutput -match 'synthetic-(auction|migrator)-password') { throw 'noSecretOutput failed' }
    foreach ($key in $targetKeys) {
        if ([Environment]::GetEnvironmentVariable($key, 'Process') -cne 'prior-fixture-value') { throw 'Nonempty environment value was not restored' }
    }
    Write-Output '[PASS] noSecretOutput'

    foreach ($case in @(
        @{ Name='rejectInheritedSpringDatasource'; Key='SPRING_DATASOURCE_URL'; Expected='SERVICE_LOCAL_INHERITED_OVERRIDE' },
        @{ Name='rejectSpringJsonConfigProfile'; Key='SPRING_APPLICATION_JSON'; Expected='SERVICE_LOCAL_INHERITED_OVERRIDE' },
        @{ Name='rejectSpringJsonConfigProfile'; Key='SPRING_PROFILES_ACTIVE'; Expected='SERVICE_LOCAL_INHERITED_OVERRIDE' },
        @{ Name='rejectJvmMavenOptions'; Key='JAVA_TOOL_OPTIONS'; Expected='SERVICE_LOCAL_INHERITED_OVERRIDE' },
        @{ Name='rejectJvmMavenOptions'; Key='MAVEN_OPTS'; Expected='SERVICE_LOCAL_INHERITED_OVERRIDE' }
    )) {
        $priorOverride = [Environment]::GetEnvironmentVariable($case.Key, 'Process')
        try {
            [Environment]::SetEnvironmentVariable($case.Key, 'synthetic-override', 'Process')
            Assert-RunnerRejected -Name $case.Name -ExpectedCode $case.Expected -Action {
                & $runner -ServiceId 'auction-service' -ConfigurationPath $configPath -Port 9091
            }
            if ([Environment]::GetEnvironmentVariable($case.Key, 'Process') -cne 'synthetic-override') {
                throw 'Inherited override was modified'
            }
        } finally {
            [Environment]::SetEnvironmentVariable($case.Key, $priorOverride, 'Process')
        }
    }

    $priorForeignPassword = [Environment]::GetEnvironmentVariable('BIDDING_DB_APP_PASSWORD', 'Process')
    try {
        [Environment]::SetEnvironmentVariable('BIDDING_DB_APP_PASSWORD', 'synthetic-other-service-password', 'Process')
        Assert-RunnerRejected -Name 'rejectInheritedOtherServiceDatabaseCredentials' -ExpectedCode 'SERVICE_LOCAL_INHERITED_DATABASE_CONFIG' -Action {
            & $runner -ServiceId 'auction-service' -ConfigurationPath $configPath -Port 9091
        }
    } finally {
        [Environment]::SetEnvironmentVariable('BIDDING_DB_APP_PASSWORD', $priorForeignPassword, 'Process')
    }

    foreach ($case in @(
        @{ Name='rejectInheritedPostgresPassword'; Key='POSTGRES_PASSWORD' },
        @{ Name='rejectInheritedPgPassword'; Key='PGPASSWORD' },
        @{ Name='rejectInheritedPgPassfile'; Key='PGPASSFILE' },
        @{ Name='rejectInheritedGenericDatabaseUrl'; Key='DATABASE_URL' }
    )) {
        $priorValue = [Environment]::GetEnvironmentVariable($case.Key, 'Process')
        try {
            [Environment]::SetEnvironmentVariable($case.Key, 'synthetic-database-carrier', 'Process')
            Assert-RunnerRejected -Name $case.Name -ExpectedCode 'SERVICE_LOCAL_INHERITED_DATABASE_CONFIG' -Action {
                & $runner -ServiceId 'auction-service' -ConfigurationPath $configPath -Port 9091
            }
        } finally {
            [Environment]::SetEnvironmentVariable($case.Key, $priorValue, 'Process')
        }
    }

    Assert-RunnerRejected -Name 'rejectWrongServiceDatabase' -ExpectedCode 'SERVICE_LOCAL_DATABASE_MISMATCH' -Action {
        Write-Configuration ($valid -replace 'auction_db', 'bidding_db')
        & $runner -ServiceId 'auction-service' -ConfigurationPath $configPath -Port 9091
    }
    Assert-RunnerRejected -Name 'rejectCaseVariantDatabase' -ExpectedCode 'SERVICE_LOCAL_DATABASE_MISMATCH' -Action {
        Write-Configuration ($valid -replace 'auction_db', 'AUCTION_DB')
        & $runner -ServiceId 'auction-service' -ConfigurationPath $configPath -Port 9091
    }
    Write-Configuration $valid
    Assert-RunnerRejected -Name 'rejectWrongServiceRole' -ExpectedCode 'SERVICE_LOCAL_ROLE_MISMATCH' -Action {
        Write-Configuration ($valid -replace 'AUCTION_DB_APP_USERNAME=auction_app', 'AUCTION_DB_APP_USERNAME=bidding_app')
        & $runner -ServiceId 'auction-service' -ConfigurationPath $configPath -Port 9091
    }
    Write-Configuration $valid

    $env:T04_MAVEN_EXIT = '7'
    $caughtMavenFailure = $false
    try { & $runner -ServiceId 'auction-service' -ConfigurationPath $configPath -Port 9091 }
    catch { if ($_.Exception.Message -cne 'SERVICE_LOCAL_MAVEN_FAILED') { throw }; $caughtMavenFailure = $true }
    if (-not $caughtMavenFailure) { throw 'Nonzero Maven result was ignored' }
    foreach ($key in $targetKeys) {
        if ([Environment]::GetEnvironmentVariable($key, 'Process') -cne 'prior-fixture-value') { throw 'Maven failure did not restore environment' }
    }
    Write-Output '[PASS] mavenFailureRestoresEnvironment'
    $env:T04_MAVEN_EXIT = '0'

    # Gateway has no registry database mapping and must launch without relational settings.
    [IO.File]::WriteAllText($configPath, "# no gateway datasource`n", [Text.Encoding]::ASCII)
    foreach ($key in $targetKeys) { Remove-Item -LiteralPath "Env:$key" -ErrorAction SilentlyContinue }
    $env:T04_EXPECT_CWD = $gatewayPath
    Reset-Marker
    & $runner -ServiceId 'realtime-gateway' -ConfigurationPath $configPath -Port 9091
    if (-not (Test-Path -LiteralPath $markerPath)) { throw 'Database-free gateway did not reach Maven boundary' }
    Write-Output '[PASS] gatewayStartsWithoutDatabaseConfiguration'

    $env:T04_EXPECT_CWD = $servicePath
    Write-Configuration $valid
    Assert-RunnerRejected -Name 'rejectNonLoopback' -ExpectedCode 'SERVICE_HTTP_BASE_URI_INVALID' -Action {
        & $httpVerifier -ServiceId 'auction-service' -BaseUri 'https://example.com' -LogPath $logPath
    }

    $notIgnoredPath = Join-Path $apiRoot 'local-config.txt'
    [IO.File]::WriteAllText($notIgnoredPath, 'synthetic-only', [Text.Encoding]::ASCII)
    Assert-RunnerRejected -Name 'rejectNonIgnoredConfiguration' -ExpectedCode 'SERVICE_LOCAL_CONFIG_NOT_IGNORED' -Action {
        & $runner -ServiceId 'auction-service' -ConfigurationPath $notIgnoredPath -Port 9091
    }
    Remove-Item -LiteralPath $notIgnoredPath -Force

    if (-not $runningOnWindows) {
        $caseVariantApiRoot = Join-Path $testRoot 'API'
        [void][IO.Directory]::CreateDirectory($caseVariantApiRoot)
        $caseVariantConfig = Join-Path $caseVariantApiRoot '.env.local'
        [IO.File]::WriteAllLines($caseVariantConfig, [string[]]$valid, [Text.Encoding]::UTF8)
        Assert-RunnerRejected -Name 'rejectCaseVariantRepositoryPathOnCaseSensitiveHost' -ExpectedCode 'SERVICE_LOCAL_CONFIG_PATH_INVALID' -Action {
            & $runner -ServiceId 'auction-service' -ConfigurationPath $caseVariantConfig -Port 9091
        }

        $caseVariantLogDirectory = Join-Path $caseVariantApiRoot 'logs'
        [void][IO.Directory]::CreateDirectory($caseVariantLogDirectory)
        $caseVariantLogPath = Join-Path $caseVariantLogDirectory 'service-http.log'
        Assert-RunnerRejected -Name 'rejectCaseVariantHttpLogPathOnCaseSensitiveHost' -ExpectedCode 'SERVICE_HTTP_LOG_PATH_INVALID' -Action {
            & $httpVerifier -ServiceId 'auction-service' -BaseUri 'http://127.0.0.1:0' -LogPath $caseVariantLogPath
        }
    }

    Write-Output 'Service local runner fixture tests: PASS'
} finally {
    foreach ($key in $allChangedKeys) {
        if ($null -eq $originalEnvironment[$key]) { Remove-Item -LiteralPath "Env:$key" -ErrorAction SilentlyContinue }
        else { [Environment]::SetEnvironmentVariable($key, [string]$originalEnvironment[$key], 'Process') }
    }
    if ((Get-Location).Path -cne $originalLocation) { Set-Location -LiteralPath $originalLocation }
    $fullTestRoot = [IO.Path]::GetFullPath($testRoot)
    $tempPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([char[]]@([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)) + [IO.Path]::DirectorySeparatorChar
    if (-not $fullTestRoot.StartsWith($tempPrefix, [StringComparison]::OrdinalIgnoreCase) -or
        (Split-Path -Leaf $fullTestRoot) -notmatch '^auction-promax-service-local-[0-9a-f]{32}$') {
        throw 'Refusing to remove an unexpected service-local fixture path'
    }
    if (Test-Path -LiteralPath $fullTestRoot -PathType Container) { Remove-Item -LiteralPath $fullTestRoot -Recurse -Force }
}
