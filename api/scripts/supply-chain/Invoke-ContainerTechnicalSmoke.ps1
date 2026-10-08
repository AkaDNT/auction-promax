#Requires -Version 5.1
[CmdletBinding()]
param([string]$StatusPath, [ValidateNotNullOrEmpty()][string]$ServiceId = 'identity-profile-service', [switch]$ResolverContractTest, [switch]$StatusContractTest, [switch]$StartupEnvelopeContractTest, [switch]$FailureClassifierContractTest, [switch]$SmokeConfigurationContractTest)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-SmokeStatus {
    param(
        [Parameter(Mandatory)][ValidateSet('STARTED','FAILED','PASS')][string]$State,
        [string]$Phase,
        [string]$FailureCode,
        [string]$ExceptionType
    )
    if ([string]::IsNullOrWhiteSpace($StatusPath)) { return }
    $payload = switch ($State) {
        'STARTED' { [ordered]@{ schemaVersion=1; state='STARTED'; phase=$Phase } }
        'FAILED' { [ordered]@{ schemaVersion=1; state='FAILED'; phase=$Phase; failureCode=$FailureCode; exceptionType=$ExceptionType } }
        'PASS' { [ordered]@{ schemaVersion=1; state='PASS'; phase='complete' } }
    }
    $temporaryPath = "$StatusPath.tmp"
    try {
        [System.IO.File]::WriteAllText($temporaryPath, ($payload | ConvertTo-Json -Compress), [System.Text.UTF8Encoding]::new($false))
        Move-Item -LiteralPath $temporaryPath -Destination $StatusPath -Force
    } finally {
        if (Test-Path -LiteralPath $temporaryPath) { Remove-Item -LiteralPath $temporaryPath -Force }
    }
}

function Resolve-ContainerSmokeDockerExecutable {
    param(
        [Parameter(Mandatory)][bool]$RunningOnWindows,
        [scriptblock]$CommandResolver
    )
    $commandName = if ($RunningOnWindows) { 'docker.exe' } else { 'docker' }
    $command = if ($null -ne $CommandResolver) {
        & $CommandResolver $commandName
    } else {
        Get-Command -Name $commandName -CommandType Application -ErrorAction SilentlyContinue |
            Select-Object -First 1
    }
    if ($null -eq $command) { throw 'CONTAINER_SMOKE_DOCKER_MISSING' }
    $executable = [string]$command.Definition
    if ([string]::IsNullOrWhiteSpace($executable)) { throw 'CONTAINER_SMOKE_DOCKER_MISSING' }
    return $executable
}

function Invoke-ContainerSmokeDockerResolverContractTest {
    $windowsRequests = [System.Collections.Generic.List[string]]::new()
    $windowsResolver = {
        param([string]$Name)
        $null = $windowsRequests.Add($Name)
        [pscustomobject]@{ Definition = 'C:\tools\docker.exe' }
    }.GetNewClosure()
    if ((Resolve-ContainerSmokeDockerExecutable -RunningOnWindows $true -CommandResolver $windowsResolver) -ne 'C:\tools\docker.exe' -or $windowsRequests.Count -ne 1 -or $windowsRequests[0] -ne 'docker.exe') { throw 'CONTAINER_SMOKE_RESOLVER_WINDOWS_INVALID' }
    Write-Output '[PASS] Windows resolver selects docker.exe'

    $linuxRequests = [System.Collections.Generic.List[string]]::new()
    $linuxResolver = {
        param([string]$Name)
        $null = $linuxRequests.Add($Name)
        [pscustomobject]@{ Definition = '/usr/bin/docker' }
    }.GetNewClosure()
    if ((Resolve-ContainerSmokeDockerExecutable -RunningOnWindows $false -CommandResolver $linuxResolver) -ne '/usr/bin/docker' -or $linuxRequests.Count -ne 1 -or $linuxRequests[0] -ne 'docker') { throw 'CONTAINER_SMOKE_RESOLVER_LINUX_INVALID' }
    Write-Output '[PASS] Linux resolver selects docker'

    $definitionResolver = {
        param([string]$Name)
        [pscustomobject]@{ Definition = '/usr/bin/docker' }
    }
    if ((Resolve-ContainerSmokeDockerExecutable -RunningOnWindows $false -CommandResolver $definitionResolver) -ne '/usr/bin/docker') { throw 'CONTAINER_SMOKE_RESOLVER_DEFINITION_INVALID' }
    Write-Output '[PASS] Resolver accepts application Definition'

    $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-smoke-docker-resolver-' + [guid]::NewGuid().ToString('N'))
    $previousPath = $env:PATH
    try {
        [void][System.IO.Directory]::CreateDirectory($temporaryRoot)
        $runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
        if ($runningOnWindows) {
            $fixtureDocker = Join-Path $temporaryRoot 'docker.exe'
            $commandShell = Get-Command -Name 'cmd.exe' -CommandType Application -ErrorAction Stop | Select-Object -First 1
            Copy-Item -LiteralPath ([string]$commandShell.Definition) -Destination $fixtureDocker -ErrorAction Stop
        } else {
            $fixtureDocker = Join-Path $temporaryRoot 'docker'
            [System.IO.File]::WriteAllText($fixtureDocker, "#!/bin/sh`nexit 0`n", [System.Text.UTF8Encoding]::new($false))
            & chmod '+x' $fixtureDocker
            if ($LASTEXITCODE -ne 0) { throw 'CONTAINER_SMOKE_RESOLVER_FIXTURE_EXECUTABLE_INVALID' }
        }
        $env:PATH = $temporaryRoot + [System.IO.Path]::PathSeparator + $previousPath
        $resolvedFixtureDocker = Resolve-ContainerSmokeDockerExecutable -RunningOnWindows $runningOnWindows
        if ([string]::IsNullOrWhiteSpace($resolvedFixtureDocker) -or -not ([System.IO.Path]::GetFullPath($resolvedFixtureDocker) -ieq [System.IO.Path]::GetFullPath($fixtureDocker))) { throw 'CONTAINER_SMOKE_RESOLVER_APPLICATION_INFO_INVALID' }
    } finally {
        $env:PATH = $previousPath
        if (Test-Path -LiteralPath $temporaryRoot) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force }
    }
    Write-Output '[PASS] Resolver accepts real application Definition'

    try {
        $null = Resolve-ContainerSmokeDockerExecutable -RunningOnWindows $false -CommandResolver { param([string]$Name) $null }
        throw 'CONTAINER_SMOKE_RESOLVER_MISSING_ACCEPTED'
    } catch {
        if ($_.Exception.Message -ne 'CONTAINER_SMOKE_DOCKER_MISSING') { throw }
    }
    Write-Output '[PASS] Missing selected Docker executable rejected'
    Write-Output 'Container smoke Docker resolver contract tests: PASS'
}

function Invoke-ContainerSmokeStatusContractTest {
    Import-Module (Join-Path $PSScriptRoot 'HostedSupplyChain.psm1') -Force
    $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-smoke-status-contract-' + [guid]::NewGuid().ToString('N'))
    $originalStatusPath = $script:StatusPath
    try {
        [void][System.IO.Directory]::CreateDirectory($temporaryRoot)
        $script:StatusPath = Join-Path $temporaryRoot 'status.json'
        foreach ($case in @(
            @{ state='STARTED'; phase='startup'; code=$null; type=$null; properties=@('schemaVersion','state','phase') },
            @{ state='FAILED'; phase='inspect-container'; code='CONTAINER_SMOKE_INSPECTION_FAILED'; type='RuntimeException'; properties=@('schemaVersion','state','phase','failureCode','exceptionType') },
            @{ state='PASS'; phase='ignored'; code=$null; type=$null; properties=@('schemaVersion','state','phase') }
        )) {
            Write-SmokeStatus -State $case.state -Phase $case.phase -FailureCode $case.code -ExceptionType $case.type
            $status = Read-HostedSmokeStatus -Path $script:StatusPath
            $actualProperties = (@($status.PSObject.Properties.Name | Sort-Object) -join ',')
            $expectedProperties = (@($case.properties | Sort-Object) -join ',')
            if ($status.state -ne $case.state -or $actualProperties -ne $expectedProperties -or ($case.state -eq 'PASS' -and $status.phase -ne 'complete')) { throw 'CONTAINER_SMOKE_STATUS_ROUND_TRIP_INVALID' }
        }
        $negativeCases = @(
            '{"schemaVersion":1,"state":"PASS","phase":"complete","failureCode":"CONTAINER_SMOKE_START_FAILED"}',
            '{"schemaVersion":1,"state":"PASS","phase":"not-complete"}',
            '{"schemaVersion":1,"state":"FAILED","phase":"start-container","exceptionType":"RuntimeException"}',
            '{"schemaVersion":1,"state":"STARTED","phase":"startup","failureCode":"CONTAINER_SMOKE_START_FAILED"}',
            '{"schemaVersion":1,"state":"PASS","phase":"complete","unexpected":"value"}',
            '{"schemaVersion":2,"state":"PASS","phase":"complete"}',
            '{"schemaVersion":1,"state":"UNKNOWN","phase":"complete"}'
        )
        foreach ($json in $negativeCases) {
            [System.IO.File]::WriteAllText($script:StatusPath, $json, [System.Text.UTF8Encoding]::new($false))
            try { $null = Read-HostedSmokeStatus -Path $script:StatusPath; throw 'CONTAINER_SMOKE_STATUS_INVALID_ACCEPTED' }
            catch { if ($_.Exception.Message -ne 'CONTAINER_SMOKE_WRAPPER_STATUS_INVALID') { throw } }
        }
    } finally {
        $script:StatusPath = $originalStatusPath
        if (Test-Path -LiteralPath $temporaryRoot) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force }
    }
    Write-Output '[PASS] STARTED status round-trips'
    Write-Output '[PASS] FAILED status round-trips'
    Write-Output '[PASS] PASS status round-trips'
    Write-Output '[PASS] Invalid state-dependent status shapes rejected'
    Write-Output 'Container smoke status state contract tests: PASS'
}

if ($ResolverContractTest) { Invoke-ContainerSmokeDockerResolverContractTest; exit 0 }
if ($StatusContractTest) { Invoke-ContainerSmokeStatusContractTest; exit 0 }

$smokePhase = 'startup'
$started = $false
$failureCode = $null
$cleanupFailed = $false
$name = $null
$databaseName = $null
$networkName = $null
$databaseStarted = $false
$networkCreated = $false
Write-SmokeStatus -State 'STARTED' -Phase 'startup'
function Fail([string]$Code) {
    Write-SmokeStatus -State 'FAILED' -Phase $smokePhase -FailureCode $Code -ExceptionType 'ManagedFailure'
    throw $Code
}
function Resolve-DockerFailureCode([string]$Output, [string]$FallbackCode) {
    $normalized = [string]$Output
    if ($normalized -match '(?i)address already in use|port is already allocated|bind:.*in use') { return 'CONTAINER_SMOKE_HOST_PORT_UNAVAILABLE' }
    if ($normalized -match '(?i)no space left on device|out of disk space') { return 'CONTAINER_SMOKE_RUNTIME_STORAGE_UNAVAILABLE' }
    if ($normalized -match '(?i)permission denied|operation not permitted|access is denied') { return 'CONTAINER_SMOKE_RUNTIME_PERMISSION_DENIED' }
    if ($normalized -match '(?i)failed to create shim|OCI runtime create failed|containerd-shim|failed to start.*container') { return 'CONTAINER_SMOKE_RUNTIME_START_FAILED' }
    if ($normalized -match '(?i)network.*not found|network.*does not exist') { return 'CONTAINER_SMOKE_RUNTIME_NETWORK_UNAVAILABLE' }
    return $FallbackCode
}
function Invoke-ContainerSmokeFailureClassifierContractTest {
    foreach ($case in @(
        @{ output='Bind for 127.0.0.1 failed: port is already allocated'; expected='CONTAINER_SMOKE_HOST_PORT_UNAVAILABLE' },
        @{ output='failed to create shim task: OCI runtime create failed: permission denied'; expected='CONTAINER_SMOKE_RUNTIME_PERMISSION_DENIED' },
        @{ output='failed to create shim task: OCI runtime create failed: unknown runtime error'; expected='CONTAINER_SMOKE_RUNTIME_START_FAILED' },
        @{ output='no space left on device'; expected='CONTAINER_SMOKE_RUNTIME_STORAGE_UNAVAILABLE' },
        @{ output='network apx-example not found'; expected='CONTAINER_SMOKE_RUNTIME_NETWORK_UNAVAILABLE' },
        @{ output='unrecognized private daemon detail'; expected='CONTAINER_SMOKE_START_FAILED' }
    )) {
        $actual = Resolve-DockerFailureCode -Output $case.output -FallbackCode 'CONTAINER_SMOKE_START_FAILED'
        if ($actual -cne $case.expected) { throw 'CONTAINER_SMOKE_FAILURE_CLASSIFICATION_INVALID' }
    }
    Write-Output '[PASS] Docker failure classifier maps known classes and fails closed for unknown output'
    Write-Output 'Container smoke Docker failure classifier contract tests: PASS'
}
function Get-ContainerSmokeConfiguration {
    param([Parameter(Mandatory)]$Artifact, [Parameter(Mandatory)]$SmokeContract)
    $profile = 'local'
    $readinessPath = if ($Artifact.serviceId -ceq 'identity-profile-service') { '/actuator/health' } else { [string]$SmokeContract.readinessPath }
    $databaseEnvironment = @()
    $appUsername = $null
    $migratorUsername = $null
    if ($Artifact.variant -ceq 'relational') {
        $appUsername = $Artifact.environmentPrefix.ToLowerInvariant() + '_test_app'
        $migratorUsername = $Artifact.environmentPrefix.ToLowerInvariant() + '_test_migrator'
        $appPassword = if ($Artifact.serviceId -ceq 'identity-profile-service') { 'test-only-identity-app-not-a-secret' } else { 'test-only-app-not-a-secret' }
        $migratorPassword = if ($Artifact.serviceId -ceq 'identity-profile-service') { 'test-only-identity-migrator-not-a-secret' } else { 'test-only-migrator-not-a-secret' }
        $prefix = [string]$Artifact.environmentPrefix
        $databaseEnvironment = @(
            ($prefix + '_DB_APP_USERNAME=' + $appUsername),
            ($prefix + '_DB_APP_PASSWORD=' + $appPassword),
            ($prefix + '_DB_MIGRATOR_USERNAME=' + $migratorUsername),
            ($prefix + '_DB_MIGRATOR_PASSWORD=' + $migratorPassword)
        )
    }
    return [pscustomobject]@{ profile=$profile; readinessPath=$readinessPath; databaseEnvironment=@($databaseEnvironment); appUsername=$appUsername; migratorUsername=$migratorUsername }
}
function Invoke-ContainerSmokeConfigurationContractTest {
    $identity = [pscustomobject]@{ serviceId='identity-profile-service'; variant='relational'; environmentPrefix='IDENTITY'; testDatabase='identity_test_db'; databaseHost='identity-db' }
    $smokeContract = [pscustomobject]@{ profile='technical-local'; readinessPath='/actuator/health/readiness' }
    $identitySettings = Get-ContainerSmokeConfiguration -Artifact $identity -SmokeContract $smokeContract
    if ($identitySettings.profile -cne 'local' -or $identitySettings.readinessPath -cne '/actuator/health' -or $identitySettings.appUsername -cne 'identity_test_app' -or $identitySettings.migratorUsername -cne 'identity_test_migrator' -or $identitySettings.databaseEnvironment -notcontains 'IDENTITY_DB_APP_PASSWORD=test-only-identity-app-not-a-secret' -or $identitySettings.databaseEnvironment -notcontains 'IDENTITY_DB_MIGRATOR_PASSWORD=test-only-identity-migrator-not-a-secret') { throw 'CONTAINER_SMOKE_IDENTITY_DATABASE_CONFIGURATION_INVALID' }
    $generated = [pscustomobject]@{ serviceId='auction-service'; variant='relational'; environmentPrefix='AUCTION'; testDatabase='auction_test_db'; databaseHost='auction-db' }
    $generatedSettings = Get-ContainerSmokeConfiguration -Artifact $generated -SmokeContract $smokeContract
    if ($generatedSettings.profile -cne 'local' -or $generatedSettings.readinessPath -cne $smokeContract.readinessPath -or $generatedSettings.appUsername -cne 'auction_test_app' -or $generatedSettings.migratorUsername -cne 'auction_test_migrator' -or $generatedSettings.databaseEnvironment -notcontains 'AUCTION_DB_APP_PASSWORD=test-only-app-not-a-secret' -or $generatedSettings.databaseEnvironment -notcontains 'AUCTION_DB_MIGRATOR_PASSWORD=test-only-migrator-not-a-secret') { throw 'CONTAINER_SMOKE_GENERATED_DATABASE_CONFIGURATION_INVALID' }
    $gateway = [pscustomobject]@{ serviceId='realtime-gateway'; variant='gateway'; environmentPrefix=$null; testDatabase=$null; databaseHost=$null }
    $gatewaySettings = Get-ContainerSmokeConfiguration -Artifact $gateway -SmokeContract $smokeContract
    if ($gatewaySettings.profile -cne 'local' -or $gatewaySettings.readinessPath -cne $smokeContract.readinessPath -or $null -ne $gatewaySettings.appUsername -or $null -ne $gatewaySettings.migratorUsername -or @($gatewaySettings.databaseEnvironment).Count -ne 0) { throw 'CONTAINER_SMOKE_GATEWAY_DATABASE_CONFIGURATION_FORBIDDEN' }
    Write-Output '[PASS] Identity smoke requires its database-enabled profile, aggregate database health, and bootstrap credentials'
    Write-Output '[PASS] Generated relational smoke keeps generated bootstrap credentials'
    Write-Output '[PASS] Gateway smoke has no datastore configuration'
    Write-Output 'Container smoke service configuration contract tests: PASS'
}
function Invoke-DockerCommand([string[]]$Arguments, [string]$Code) {
    $output = @(& $script:dockerExe @Arguments 2>&1); $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) { Fail (Resolve-DockerFailureCode -Output ($output -join [Environment]::NewLine) -FallbackCode $Code) }; return ($output -join [Environment]::NewLine)
}
if ($FailureClassifierContractTest) { Invoke-ContainerSmokeFailureClassifierContractTest; return }
if ($SmokeConfigurationContractTest) { Invoke-ContainerSmokeConfigurationContractTest; return }
try {
    $smokePhase = 'resolve-docker'
    $runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
    $testCommandResolver = if ($StartupEnvelopeContractTest) { { param([string]$Name) $null } } else { $null }
    $script:dockerExe = Resolve-ContainerSmokeDockerExecutable -RunningOnWindows $runningOnWindows -CommandResolver $testCommandResolver
    $smokePhase = 'load-contract'
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
    $contractPath = Join-Path $repoRoot 'security\tooling\container-image-contract.json'
    $serviceResolverPath = Join-Path $PSScriptRoot 'ServiceArtifact.psm1'
    $contractTestPath = Join-Path $PSScriptRoot 'Test-ContainerImageContract.mjs'
    if (-not (Test-Path $contractPath -PathType Leaf) -or -not (Test-Path $contractTestPath -PathType Leaf) -or -not (Test-Path $serviceResolverPath -PathType Leaf)) { Fail 'CONTAINER_SMOKE_CONTRACT_MISSING' }
    $smokePhase = 'validate-contract'
    & node $contractTestPath
    if ($LASTEXITCODE -ne 0) { Fail 'CONTAINER_SMOKE_CONTRACT_INVALID' }
    try { $contract = Get-Content $contractPath -Raw | ConvertFrom-Json -ErrorAction Stop } catch { Fail 'CONTAINER_SMOKE_CONTRACT_INVALID' }
    Import-Module $serviceResolverPath -Force
    try { $artifact = Resolve-ServiceArtifact -ServiceId $ServiceId -RequireBuiltArtifact }
    catch { Fail 'CONTAINER_SMOKE_SERVICE_ARTIFACT_INVALID' }
    $image = [string]$artifact.imageReference; $smoke = $contract.technicalSmoke; $runtimeUser = [string]$contract.runtime.user
    $smokeSettings = Get-ContainerSmokeConfiguration -Artifact $artifact -SmokeContract $smoke
    $smokeProfile = [string]$smokeSettings.profile
    $name = 'apx-' + $artifact.serviceId + '-t03-smoke-' + [Guid]::NewGuid().ToString('N').Substring(0,12)
    $appArguments = @('--detach','--rm','--name',$name,'--platform',$contract.image.platform,'--user',$runtimeUser,'--read-only','--tmpfs',$smoke.tmpfsPath,'--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit',[string]$smoke.pidsLimit)
    if ($artifact.variant -ceq 'relational') {
        $databaseName = 'apx-' + $artifact.serviceId + '-t03-db-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
        $networkName = 'apx-' + $artifact.serviceId + '-t03-net-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
        $bootstrapFile = if ($artifact.serviceId -ceq 'identity-profile-service') { 'bootstrap-identity.sql' } else { 'bootstrap.sql' }
        $bootstrapPath = Join-Path $artifact.projectPath ('src\test\resources\db\testcontainers\' + $bootstrapFile)
        if (-not (Test-Path -LiteralPath $bootstrapPath -PathType Leaf)) { Fail 'CONTAINER_SMOKE_DATABASE_BOOTSTRAP_MISSING' }
        $postgresImage = 'postgres:17.11-bookworm@sha256:84560e3b9c6874893fc4e2854f5dc3e7c1a37bc9d1dfd7a8c641310ae22ba5ad'
        $smokePhase = 'start-database-network'
        Invoke-DockerCommand @('network','create',$networkName) 'CONTAINER_SMOKE_DATABASE_NETWORK_FAILED' | Out-Null
        $networkCreated = $true
        $smokePhase = 'start-database'
        Invoke-DockerCommand @('run','--detach','--rm','--name',$databaseName,'--network',$networkName,'--env',('POSTGRES_DB=' + $artifact.testDatabase),'--env','POSTGRES_USER=tc_bootstrap','--env','POSTGRES_PASSWORD=test-only-bootstrap-not-a-secret','--mount',('type=bind,src=' + $bootstrapPath + ',dst=/docker-entrypoint-initdb.d/00-bootstrap.sql,readonly'),$postgresImage) 'CONTAINER_SMOKE_DATABASE_START_FAILED' | Out-Null
        $databaseStarted = $true
        $databaseDeadline = [DateTime]::UtcNow.AddSeconds(60)
        $databaseReady = $false
        do {
            $null = @(& $script:dockerExe exec $databaseName pg_isready -U tc_bootstrap -d $artifact.testDatabase 2>&1)
            if ($LASTEXITCODE -eq 0) {
                $bootstrapCheck = @(& $script:dockerExe exec $databaseName psql -U tc_bootstrap -d $artifact.testDatabase -Atqc ("SELECT count(*) FROM pg_roles WHERE rolname IN ('$($smokeSettings.appUsername)','$($smokeSettings.migratorUsername)')") 2>&1)
                if ($LASTEXITCODE -eq 0 -and (($bootstrapCheck -join '').Trim() -ceq '2')) { $databaseReady = $true; break }
            }
            Start-Sleep -Seconds 2
        } while ([DateTime]::UtcNow -lt $databaseDeadline)
        if (-not $databaseReady) { Fail 'CONTAINER_SMOKE_DATABASE_READINESS_TIMEOUT' }
        $appArguments += @('--network',$networkName)
        $appArguments += @('--env',($artifact.environmentPrefix + '_DB_URL=jdbc:postgresql://' + $databaseName + ':5432/' + $artifact.testDatabase))
        foreach ($databaseEntry in $smokeSettings.databaseEnvironment) { $appArguments += @('--env',[string]$databaseEntry) }
    }
    $smokePhase = 'reserve-port'
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,0)
    try { $listener.Start(); $hostPort = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port } catch { Fail 'CONTAINER_SMOKE_PORT_RESERVATION_FAILED' } finally { if ($listener) { $listener.Stop() } }
    $smokePhase = 'validate-image'
    Invoke-DockerCommand @('image','inspect',$image) 'CONTAINER_SMOKE_IMAGE_MISSING' | Out-Null
    $smokePhase = 'start-container'
    $appArguments += @('--publish',"127.0.0.1:$hostPort`:8080",'--env',"SPRING_PROFILES_ACTIVE=$smokeProfile",$image)
    Invoke-DockerCommand $appArguments 'CONTAINER_SMOKE_START_FAILED' | Out-Null
    $started = $true
    $smokePhase = 'inspect-container'
    try { $state = @((Invoke-DockerCommand @('inspect',$name) 'CONTAINER_SMOKE_INSPECTION_FAILED') | ConvertFrom-Json -ErrorAction Stop)[0] } catch { Fail 'CONTAINER_SMOKE_INSPECTION_MALFORMED' }
    $smokePhase = 'validate-hardening'
    $tmpfs = @($state.HostConfig.Tmpfs.PSObject.Properties.Name)
    $nnp = @($state.HostConfig.SecurityOpt | Where-Object { [string]$_ -match '^no-new-privileges(?::true)?$' }).Count -gt 0
    if (-not [bool]$state.HostConfig.ReadonlyRootfs -or [int64]$state.HostConfig.PidsLimit -ne [int64]$smoke.pidsLimit -or [string]$state.Config.User -cne $runtimeUser -or @($state.HostConfig.CapDrop) -notcontains 'ALL' -or -not $nnp -or $tmpfs -notcontains [string]$smoke.tmpfsPath) { Fail 'CONTAINER_SMOKE_HARDENING_DRIFT' }
    $smokePhase = 'validate-binding'
    $binding = @($state.NetworkSettings.Ports.'8080/tcp' | Where-Object { $_.HostIp -eq '127.0.0.1' })
    if ($binding.Count -ne 1 -or [int]$binding[0].HostPort -ne [int]$hostPort) { Fail 'CONTAINER_SMOKE_LOOPBACK_BINDING_INVALID' }
    $uri = "http://127.0.0.1:$hostPort$($smokeSettings.readinessPath)"; $deadline = [DateTime]::UtcNow.AddSeconds([int]$smoke.startupTimeoutSeconds); $ready = $false
    do {
        $smokePhase = 'poll-readiness'
        try {
            $r = Invoke-WebRequest -UseBasicParsing -Uri $uri -TimeoutSec 5
            $content = if ($r.Content -is [byte[]]) { [System.Text.Encoding]::UTF8.GetString($r.Content) } else { [string]$r.Content }
            $smokePhase = 'parse-readiness'
            if ($r.StatusCode -eq 200 -and $content -match '"status"\s*:\s*"UP"') { $ready = $true; break }
        } catch {}
        Start-Sleep 2
    } while ([DateTime]::UtcNow -lt $deadline)
    if (-not $ready) { Fail 'CONTAINER_SMOKE_READINESS_TIMEOUT' }
    Write-Output ('Container technical smoke: PASS (container={0}, readiness={1})' -f $name,$uri)
    Write-SmokeStatus -State 'PASS' -Phase 'complete'
} catch {
    $message = [string]$_.Exception.Message
    $failureCode = if ($message -match '^CONTAINER_SMOKE_[A-Z0-9_]+$') {
        $message
    } else {
        'CONTAINER_SMOKE_UNCLASSIFIED_FAILED'
    }
    Write-SmokeStatus -State 'FAILED' -Phase $smokePhase -FailureCode $failureCode -ExceptionType $_.Exception.GetType().Name
}
finally {
    $smokePhase = 'cleanup'
    if ($started) { & $script:dockerExe rm --force $name 2>$null | Out-Null; if ($LASTEXITCODE -ne 0) { $cleanupFailed=$true } }
    if ($databaseStarted) { & $script:dockerExe rm --force $databaseName 2>$null | Out-Null; if ($LASTEXITCODE -ne 0) { $cleanupFailed=$true } }
    if ($networkCreated) { & $script:dockerExe network rm $networkName 2>$null | Out-Null; if ($LASTEXITCODE -ne 0) { $cleanupFailed=$true } }
}
if ($cleanupFailed -and -not $failureCode) { Fail 'CONTAINER_SMOKE_CLEANUP_FAILED' }
if ($failureCode) { throw $failureCode }
