#Requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Linux)) {
    throw 'LINUX_TEST_REQUIRED'
}

Import-Module (Join-Path $PSScriptRoot 'HostedSupplyChain.psm1') -Force
$powerShell = Get-HostedChildPowerShellExecutable
if ([System.IO.Path]::GetFileName($powerShell) -ne 'pwsh') { throw 'HOSTED_LINUX_PWSH_RESOLUTION_INVALID' }

$output = @(& $powerShell -NoProfile -Command '$PSVersionTable.PSEdition')
if ($LASTEXITCODE -ne 0 -or $output -notcontains 'Core') { throw 'HOSTED_LINUX_PWSH_EXECUTION_INVALID' }

Write-Output 'Linux hosted child PowerShell resolution test: PASS'
