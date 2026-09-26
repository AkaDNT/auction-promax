#Requires -Version 5.1
[CmdletBinding()]
param([Parameter(Mandatory)][string]$SummaryPath)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'HostedSupplyChain.psm1') -Force

$summary = Read-HostedRunSummary -Path $SummaryPath
if ($summary.executionState -ne 'PASS' -or $summary.policyState -eq 'NOT_EVALUATED') { throw 'HOSTED_RELEASE_POLICY_NOT_EVALUATED' }
if ($summary.policyState -eq 'PASS') { exit 0 }
if ($summary.policyState -eq 'BLOCKED') { exit 1 }
throw 'HOSTED_RELEASE_POLICY_INVALID'
