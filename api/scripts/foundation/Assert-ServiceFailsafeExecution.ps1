[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('auction-service', 'bidding-service', 'billing-service', 'realtime-gateway')]
  [string] $ServiceId,
  [string] $ReportDirectory = 'target/failsafe-reports'
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
Import-Module (Join-Path $PSScriptRoot 'ServiceFailsafeExecution.psm1') -Force
$result = Test-ServiceFailsafeExecution -ServiceId $ServiceId -ReportDirectory $ReportDirectory -RepositoryRoot $repositoryRoot
Write-Output "SERVICE_FAILSAFE_EXECUTION_PASS service=$($result.ServiceId) tests=$($result.Tests)"
