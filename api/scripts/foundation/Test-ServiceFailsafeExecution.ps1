$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'ServiceFailsafeExecution.psm1') -Force
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$fixtureRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('service-failsafe-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fixtureRoot | Out-Null
$script:cases = 0

function Assert-Code {
  param([scriptblock] $Operation, [string] $ExpectedCode)
  try { & $Operation; throw 'SERVICE_FAILSAFE_FIXTURE_EXPECTED_FAILURE' }
  catch {
    if ($_.Exception.Message -cne $ExpectedCode) { throw }
  }
  $script:cases++
}

function Write-Report {
  param([string] $Directory, [string] $SuiteName, [int] $Tests = 1, [int] $Failures = 0, [int] $Errors = 0, [int] $Skipped = 0)
  New-Item -ItemType Directory -Path $Directory -Force | Out-Null
  $xml = "<testsuite name=`"$SuiteName`" tests=`"$Tests`" failures=`"$Failures`" errors=`"$Errors`" skipped=`"$Skipped`"></testsuite>"
  Set-Content -LiteralPath (Join-Path $Directory 'TEST-required-it.xml') -Value $xml -Encoding utf8
}

try {
  foreach ($service in @(
      @{ Id = 'identity-profile-service'; Class = 'IdentityProfileServiceApplicationTestcontainersIT'; Package = 'com.auctionpromax.identityprofileservice' },
      @{ Id = 'auction-service'; Class = 'RelationalBoundaryTestcontainersIT'; Package = 'com.auctionpromax.auctionservice' },
      @{ Id = 'realtime-gateway'; Class = 'GatewayNoDatastoreIT'; Package = 'com.auctionpromax.realtimegateway' })) {
    $directory = Join-Path $fixtureRoot $service.Id
    Write-Report -Directory $directory -SuiteName ($service.Package + '.' + $service.Class)
    $result = Test-ServiceFailsafeExecution -ServiceId $service.Id -ReportDirectory $directory -RepositoryRoot $repositoryRoot
    if ($result.TestClass -cne $service.Class -or $result.Tests -ne 1) { throw 'SERVICE_FAILSAFE_FIXTURE_SUCCESS_INVALID' }
    $script:cases++
  }

  $missing = Join-Path $fixtureRoot 'missing'
  New-Item -ItemType Directory -Path $missing | Out-Null
  Assert-Code { Test-ServiceFailsafeExecution -ServiceId 'auction-service' -ReportDirectory $missing -RepositoryRoot $repositoryRoot } 'SERVICE_FAILSAFE_REQUIRED_IT_MISSING'

  foreach ($case in @(
      @{ Name = 'zero'; Tests = 0; Failures = 0; Skipped = 0; Code = 'SERVICE_FAILSAFE_REQUIRED_IT_NOT_EXECUTED' },
      @{ Name = 'skipped'; Tests = 1; Failures = 0; Skipped = 1; Code = 'SERVICE_FAILSAFE_REQUIRED_IT_FAILED_OR_SKIPPED' },
      @{ Name = 'failed'; Tests = 1; Failures = 1; Skipped = 0; Code = 'SERVICE_FAILSAFE_REQUIRED_IT_FAILED_OR_SKIPPED' })) {
    $directory = Join-Path $fixtureRoot $case.Name
    Write-Report -Directory $directory -SuiteName 'com.auctionpromax.auctionservice.RelationalBoundaryTestcontainersIT' -Tests $case.Tests -Failures $case.Failures -Skipped $case.Skipped
    Assert-Code { Test-ServiceFailsafeExecution -ServiceId 'auction-service' -ReportDirectory $directory -RepositoryRoot $repositoryRoot } $case.Code
  }

  $duplicate = Join-Path $fixtureRoot 'duplicate'
  Write-Report -Directory $duplicate -SuiteName 'com.auctionpromax.auctionservice.RelationalBoundaryTestcontainersIT'
  Copy-Item -LiteralPath (Join-Path $duplicate 'TEST-required-it.xml') -Destination (Join-Path $duplicate 'TEST-required-it-copy.xml')
  Assert-Code { Test-ServiceFailsafeExecution -ServiceId 'auction-service' -ReportDirectory $duplicate -RepositoryRoot $repositoryRoot } 'SERVICE_FAILSAFE_REQUIRED_IT_MISSING'

  $dtd = Join-Path $fixtureRoot 'dtd'
  New-Item -ItemType Directory -Path $dtd | Out-Null
  Set-Content -LiteralPath (Join-Path $dtd 'TEST-required-it.xml') -Value '<!DOCTYPE testsuite [<!ENTITY x SYSTEM "file:///etc/passwd">]><testsuite name="com.auctionpromax.auctionservice.RelationalBoundaryTestcontainersIT" tests="1" failures="0" errors="0" skipped="0">&x;</testsuite>' -Encoding utf8
  Assert-Code { Test-ServiceFailsafeExecution -ServiceId 'auction-service' -ReportDirectory $dtd -RepositoryRoot $repositoryRoot } 'SERVICE_FAILSAFE_REPORT_INVALID'

  Write-Output "SERVICE_FAILSAFE_FIXTURES_PASS cases=$script:cases"
} finally {
  Remove-Item -LiteralPath $fixtureRoot -Recurse -Force -ErrorAction SilentlyContinue
}
