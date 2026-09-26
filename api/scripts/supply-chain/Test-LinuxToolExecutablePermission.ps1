#Requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Linux)) {
    throw 'LINUX_TEST_REQUIRED'
}

Import-Module (Join-Path $PSScriptRoot 'SupplyChainTooling.psm1') -Force
$root = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-linux-tool-permission-' + [guid]::NewGuid().ToString('N'))
try {
    [void][System.IO.Directory]::CreateDirectory($root)
    $tool = Join-Path $root 'fixture-tool'
    [System.IO.File]::WriteAllText($tool, "#!/bin/sh`necho fixture-tool`n", [System.Text.UTF8Encoding]::new($false))
    & chmod -x -- $tool
    if ($LASTEXITCODE -ne 0) { throw 'TEST_FIXTURE_PERMISSION_SETUP_FAILED' }

    Set-ToolExecutablePermission -Path $tool
    $output = @(& $tool)
    if ($LASTEXITCODE -ne 0 -or $output -ne 'fixture-tool') { throw 'TEST_EXECUTABLE_PERMISSION_NOT_APPLIED' }
    Write-Output 'Linux tool executable permission test: PASS'
} finally {
    if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
}
