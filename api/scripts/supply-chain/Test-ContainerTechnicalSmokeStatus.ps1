#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'Invoke-ContainerTechnicalSmoke.ps1'
Import-Module (Join-Path $PSScriptRoot 'HostedSupplyChain.psm1') -Force
$resolverOutput = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath -ResolverContractTest 2>&1)
if ($LASTEXITCODE -ne 0 -or ($resolverOutput -join "`n") -notmatch 'Container smoke Docker resolver contract tests: PASS') { throw 'CONTAINER_SMOKE_DOCKER_RESOLVER_CONTRACT_FAILED' }
$stateContractOutput = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath -StatusContractTest 2>&1)
if ($LASTEXITCODE -ne 0 -or ($stateContractOutput -join "`n") -notmatch 'Container smoke status state contract tests: PASS') { throw 'CONTAINER_SMOKE_STATUS_STATE_CONTRACT_FAILED' }
$failureClassifierOutput = @(& $scriptPath -FailureClassifierContractTest 2>&1)
if (($failureClassifierOutput -join "`n") -notmatch 'Container smoke Docker failure classifier contract tests: PASS') { throw 'CONTAINER_SMOKE_FAILURE_CLASSIFIER_CONTRACT_FAILED' }
$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$errors) | Out-Null
if ($errors.Count -ne 0) { throw 'CONTAINER_SMOKE_SCRIPT_PARSE_INVALID' }
$ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$errors)
$protectedAutomaticVariables = @('IsWindows','IsLinux','IsMacOS','IsCoreCLR')
$protectedUsages = @()
foreach ($functionAst in @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $true))) {
    $paramBlock = $functionAst.Body.ParamBlock
    if ($null -eq $paramBlock) { continue }
    foreach ($parameterAst in @($paramBlock.Parameters)) {
        if ($parameterAst.Name.VariablePath.UserPath -in $protectedAutomaticVariables) { $protectedUsages += $parameterAst.Name.VariablePath.UserPath }
    }
}
foreach ($assignmentAst in @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.AssignmentStatementAst] }, $true))) {
    if ($assignmentAst.Left -is [System.Management.Automation.Language.VariableExpressionAst] -and $assignmentAst.Left.VariablePath.UserPath -in $protectedAutomaticVariables) { $protectedUsages += $assignmentAst.Left.VariablePath.UserPath }
}
if ($protectedUsages.Count -ne 0) { throw 'CONTAINER_SMOKE_PROTECTED_AUTOMATIC_VARIABLE_COLLISION' }

$source = Get-Content -LiteralPath $scriptPath -Raw
foreach ($required in @(
    '[string]$StatusPath',
    'function Write-SmokeStatus',
    "-State 'STARTED'",
    "-State 'FAILED'",
    "-State 'PASS'",
    'CONTAINER_SMOKE_UNCLASSIFIED_FAILED'
)) {
    if (-not $source.Contains($required)) { throw 'CONTAINER_SMOKE_STATUS_CONTRACT_MISSING' }
}

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-smoke-status-' + [guid]::NewGuid().ToString('N'))
try {
    [void][System.IO.Directory]::CreateDirectory($temporaryRoot)
    $statusPath = Join-Path $temporaryRoot 'smoke.json'
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $startupOutput = @(& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath -StatusPath $statusPath -StartupEnvelopeContractTest 2>&1)
        $startupExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($startupExitCode -eq 0) { throw 'CONTAINER_SMOKE_STARTUP_ENVELOPE_ACCEPTED_RESOLVER_FAILURE' }
    $startupStatus = Read-HostedSmokeStatus -Path $statusPath
    if ($startupStatus.state -ne 'FAILED' -or $startupStatus.phase -ne 'resolve-docker' -or $startupStatus.failureCode -ne 'CONTAINER_SMOKE_DOCKER_MISSING') { throw 'CONTAINER_SMOKE_STARTUP_ENVELOPE_STATUS_INVALID' }
    [System.IO.File]::WriteAllText($statusPath, '{"schemaVersion":1,"state":"FAILED","phase":"inspect-container","failureCode":"CONTAINER_SMOKE_INSPECTION_FAILED","exceptionType":"RuntimeException"}', [System.Text.UTF8Encoding]::new($false))
    $status = Read-HostedSmokeStatus -Path $statusPath
    if ($status.state -ne 'FAILED' -or $status.phase -ne 'inspect-container' -or $status.failureCode -ne 'CONTAINER_SMOKE_INSPECTION_FAILED') { throw 'CONTAINER_SMOKE_STATUS_READER_INVALID' }
} finally {
    if (Test-Path -LiteralPath $temporaryRoot) { Remove-Item -LiteralPath $temporaryRoot -Recurse -Force }
}

Write-Host '[PASS] Container smoke script parses'
Write-Host '[PASS] Container smoke does not bind protected automatic variables'
Write-Host '[PASS] Container smoke Docker resolver is portable'
Write-Host '[PASS] Container smoke status states round-trip'
Write-Host '[PASS] Container smoke status contract is present'
Write-Host '[PASS] Resolver failure is captured by managed startup envelope'
Write-Host '[PASS] Sanitized failed smoke status is accepted'
Write-Host 'Container technical smoke status tests: PASS'
