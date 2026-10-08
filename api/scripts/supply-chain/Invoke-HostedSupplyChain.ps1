#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateSet('supply-chain','security-freshness')][string]$WorkflowName,
    [Parameter(Mandatory)][ValidatePattern('^[a-f0-9]{40}$')][string]$CommitSha,
    [ValidateNotNullOrEmpty()][string]$ServiceId = 'identity-profile-service',
    [switch]$RepositoryOnly,
    [Parameter(Mandatory)][string]$EvidenceRoot,
    [switch]$RefreshDatabase,
    [switch]$UseExistingVerifiedArtifact,
    [switch]$NoExit,
    [hashtable]$Adapters
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$serviceEvidenceMode = $PSBoundParameters.ContainsKey('ServiceId')
Import-Module (Join-Path $PSScriptRoot 'HostedSupplyChain.psm1') -Force
Import-Module (Join-Path $PSScriptRoot 'ServiceArtifact.psm1') -Force
try { $serviceArtifact = Resolve-ServiceArtifact -ServiceId $ServiceId }
catch { throw 'SERVICE_ARTIFACT_RESOLUTION_FAILED' }

function Invoke-HostedStage {
    param([string]$Name, [scriptblock]$DefaultAction, [object[]]$DefaultArguments = @())
    if ($null -ne $Adapters -and $Adapters.ContainsKey($Name)) { return & $Adapters[$Name] }
    return & $DefaultAction @DefaultArguments
}
function Invoke-HostedRepositoryScript {
    param([Parameter(Mandatory)][string]$ScriptName, [string[]]$Arguments = @(), [string]$BootstrapTemporaryRoot, [string]$SmokeTemporaryRoot, [string]$ContainerScanTemporaryRoot)
    $isToolBootstrap = $ScriptName -eq 'Install-SupplyChainTools.ps1'
    $isSmoke = $ScriptName -eq 'Invoke-ContainerTechnicalSmoke.ps1'
    $isContainerScan = $ScriptName -eq 'Invoke-ContainerVulnerabilityScanning.ps1'
    $wrapperPhase = 'initialize'
    try {
        $wrapperPhase = 'resolve-script'
        $scriptPath = Join-Path $PSScriptRoot $ScriptName
        if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
            if ($isToolBootstrap) { throw 'TOOL_BOOTSTRAP_SCRIPT_RESOLUTION_FAILED' }
            throw 'POLICY_EVALUATION_FAILED'
        }
        $wrapperPhase = 'resolve-shell'
        $childPowerShell = Get-HostedChildPowerShellExecutable
    } catch {
        $message = [string]$_.Exception.Message
        if ($isToolBootstrap -and $message -notmatch '^TOOL_BOOTSTRAP_[A-Z_]+_FAILED$') {
            Write-Warning ('Tool bootstrap wrapper diagnostic: phase={0}; exceptionType={1}' -f $wrapperPhase, $_.Exception.GetType().Name)
            throw 'TOOL_BOOTSTRAP_WRAPPER_FAILED'
        }
        throw
    }
    $wrapperPhase = 'build-arguments'
    $previousErrorActionPreference = $ErrorActionPreference
    $runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform([System.Runtime.InteropServices.OSPlatform]::Windows)
    $childArguments = @('-NoProfile')
    if ($runningOnWindows) { $childArguments += @('-ExecutionPolicy', 'Bypass') }
    $childArguments += @('-File', $scriptPath)
    $childArguments += $Arguments
    $bootstrapStatusPath = $null
    $smokeStatusPath = $null
    $containerScanStatusPath = $null
    if ($isToolBootstrap) {
        $wrapperPhase = 'validate-temp-root'
        if ([string]::IsNullOrWhiteSpace($BootstrapTemporaryRoot) -or -not (Test-Path -LiteralPath $BootstrapTemporaryRoot -PathType Container)) {
            Write-Warning ('Tool bootstrap wrapper diagnostic: phase={0}; exceptionType={1}' -f $wrapperPhase, 'ValidationException')
            throw 'TOOL_BOOTSTRAP_WRAPPER_FAILED'
        }
        $wrapperPhase = 'build-status-path'
        try {
            $bootstrapStatusPath = Join-Path $BootstrapTemporaryRoot ('tool-bootstrap-' + [guid]::NewGuid().ToString('N') + '.json')
            $childArguments += @('-StatusPath', $bootstrapStatusPath)
        } catch {
            Write-Warning ('Tool bootstrap wrapper diagnostic: phase={0}; exceptionType={1}' -f $wrapperPhase, $_.Exception.GetType().Name)
            throw 'TOOL_BOOTSTRAP_WRAPPER_FAILED'
        }
    }
    if ($isSmoke) {
        if ([string]::IsNullOrWhiteSpace($SmokeTemporaryRoot) -or -not (Test-Path -LiteralPath $SmokeTemporaryRoot -PathType Container)) {
            throw 'CONTAINER_SMOKE_WRAPPER_STARTUP_FAILED'
        }
        $smokeStatusPath = Join-Path $SmokeTemporaryRoot ('container-smoke-' + [guid]::NewGuid().ToString('N') + '.json')
        $childArguments += @('-StatusPath', $smokeStatusPath)
    }
    if ($isContainerScan) {
        if ([string]::IsNullOrWhiteSpace($ContainerScanTemporaryRoot) -or -not (Test-Path -LiteralPath $ContainerScanTemporaryRoot -PathType Container)) {
            throw 'CONTAINER_SCAN_WRAPPER_STARTUP_FAILED'
        }
        $containerScanStatusPath = Join-Path $ContainerScanTemporaryRoot ('container-scan-' + [guid]::NewGuid().ToString('N') + '.json')
        $childArguments += @('-StatusPath', $containerScanStatusPath)
    }
    $wrapperPhase = 'launch-child'
    try {
        $ErrorActionPreference = 'Continue'
        $output = @(& $childPowerShell @childArguments 2>&1)
        $exitCode = $LASTEXITCODE
    } catch {
        if ($isToolBootstrap) { throw 'TOOL_BOOTSTRAP_CHILD_LAUNCH_FAILED' }
        throw
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($isToolBootstrap) {
        $wrapperPhase = 'read-status'
        try { $bootstrapStatus = Read-HostedToolBootstrapStatus -Path $bootstrapStatusPath } catch {
            Write-Warning ('Tool bootstrap wrapper diagnostic: phase={0}; exceptionType={1}' -f $wrapperPhase, $_.Exception.GetType().Name)
            throw 'TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED'
        }
        $wrapperPhase = 'interpret-status'
        if ($bootstrapStatus.state -eq 'FAILED') { throw $bootstrapStatus.failureCode }
        $wrapperPhase = 'check-child-exit'
        if ($exitCode -ne 0) { throw 'TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED' }
        $wrapperPhase = 'complete'
        return $output
    }
    if ($isSmoke) {
        $smokeStatus = Read-HostedSmokeStatus -Path $smokeStatusPath
        if ($smokeStatus.state -eq 'FAILED') {
            if ($exitCode -eq 0) { throw 'CONTAINER_SMOKE_WRAPPER_STATUS_INVALID' }
            throw ('{0}|phase={1}|exceptionType={2}' -f $smokeStatus.failureCode, $smokeStatus.phase, $smokeStatus.exceptionType)
        }
        if ($smokeStatus.state -eq 'STARTED') {
            if ($exitCode -eq 0) { throw 'CONTAINER_SMOKE_WRAPPER_STATUS_INVALID' }
            throw ('CONTAINER_SMOKE_WRAPPER_UNMANAGED_FAILURE|phase={0}|exceptionType=Unavailable' -f $smokeStatus.phase)
        }
        if ($exitCode -ne 0) {
            throw 'CONTAINER_SMOKE_WRAPPER_STATUS_INVALID'
        }
        return $output
    }
    if ($isContainerScan) {
        $containerScanStatus = Read-HostedContainerScanStatus -Path $containerScanStatusPath
        if ($containerScanStatus.state -eq 'BLOCKED') {
            if ($exitCode -eq 0) { throw 'CONTAINER_SCAN_WRAPPER_STATUS_INVALID' }
            Write-Warning ('Container scan diagnostic: phase={0}; failureCode={1}' -f $containerScanStatus.phase, $containerScanStatus.failureCode)
            return 'POLICY_BLOCKED'
        }
        if ($containerScanStatus.state -eq 'FAILED') {
            if ($exitCode -eq 0) { throw 'CONTAINER_SCAN_WRAPPER_STATUS_INVALID' }
            throw ('{0}|phase={1}|exceptionType={2}' -f $containerScanStatus.failureCode, $containerScanStatus.phase, $containerScanStatus.exceptionType)
        }
        if ($containerScanStatus.state -eq 'PASS' -and $exitCode -eq 0) { return $output }
        throw 'CONTAINER_SCAN_WRAPPER_STATUS_INVALID'
    }
    if ($exitCode -ne 0) {
        $text = $output -join [Environment]::NewLine
        if ($isToolBootstrap) {
            if ($text -match '\b(TOOL_BOOTSTRAP_(?:COSIGN|TRIVY|PROVENANCE|TUF_REFRESH|GITLEAKS|MODULE_LOAD|PLATFORM_RESOLUTION|CHILD_PROCESS|WRAPPER|SCRIPT_RESOLUTION|SHELL_RESOLUTION|CHILD_LAUNCH)_FAILED)\b') { throw $Matches[1] }
            throw 'TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED'
        }
        if ([string]::IsNullOrWhiteSpace($text)) { throw 'POLICY_EVALUATION_FAILED' }
        throw $text
    }
    return $output
}
function Write-HostedJson {
    param([string]$Path, $Value)
    if ($Value -is [System.Collections.IDictionary] -and $Value.Contains('findings')) {
        $findingsValue = $Value['findings']
        if ($null -eq $findingsValue -or ($findingsValue -is [pscustomobject] -and @($findingsValue.PSObject.Properties).Count -eq 0)) {
            $Value['findings'] = [object[]]@()
        }
    }
    [System.IO.File]::WriteAllText($Path, ($Value | ConvertTo-Json -Depth 8 -Compress), [System.Text.UTF8Encoding]::new($false))
}
function Get-ServiceSourceProvenance {
    param([Parameter(Mandatory)][string]$ServiceId, [Parameter(Mandatory)][string]$Commit)
    $repositoryRoot = Split-Path -Parent $repoRoot
    $relativePath = 'api/services/' + $ServiceId
    $tracked = @(& git -C $repositoryRoot ls-tree -r --name-only $Commit -- $relativePath 2>$null)
    if ($LASTEXITCODE -ne 0) { throw 'SERVICE_SOURCE_PROVENANCE_UNAVAILABLE' }
    if ($tracked.Count -gt 0) {
        return [ordered]@{ kind='committed'; executionCommit=$Commit }
    }
    $historicalAdditions = @(& git -C $repositoryRoot log $Commit --diff-filter=A --format=%H -- $relativePath 2>$null)
    if ($LASTEXITCODE -ne 0) { throw 'SERVICE_SOURCE_PROVENANCE_UNAVAILABLE' }
    if ($historicalAdditions.Count -gt 0) { throw 'SERVICE_SOURCE_REMOVED' }
    if (-not (Test-Path -LiteralPath $serviceArtifact.projectPath -PathType Container)) { throw 'SERVICE_GENERATION_MISSING' }
    return [ordered]@{ kind='ephemeral-generated'; executionCommit=$Commit; generatorCommit=$Commit; serviceId=$ServiceId }
}
function New-ServiceEvidenceRecord {
    param([Parameter(Mandatory)][System.Collections.IDictionary]$Fields)
    if (-not $serviceEvidenceMode) {
        $legacyRecord = [ordered]@{ commit = $CommitSha }
        foreach ($key in $Fields.Keys) { if ($key -cne 'documentType') { $legacyRecord[$key] = $Fields[$key] } }
        return $legacyRecord
    }
    $record = [ordered]@{ schemaVersion=2; serviceId=$serviceArtifact.serviceId; variant=$serviceArtifact.variant; commit=$CommitSha; sourceProvenance=$sourceProvenance }
    foreach ($key in $Fields.Keys) {
        if ($record.Contains($key)) { throw 'SERVICE_EVIDENCE_FIELD_COLLISION' }
        $record[$key] = $Fields[$key]
    }
    return $record
}
function Get-HostedSha256 {
    param([Parameter(Mandatory)][string]$Path)
    $stream = [System.IO.File]::OpenRead($Path)
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    try { return ([System.BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $algorithm.Dispose(); $stream.Dispose() }
}
function Read-HostedSanitizedInventory {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw 'EVIDENCE_SANITIZATION_FAILED' }
    try {
        $parsed = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -ErrorAction Stop
        $items = @($parsed | ForEach-Object { $_ })
        foreach ($item in $items) {
            foreach ($forbidden in @('Secret','Match','Line','Description','PrimaryURL','References')) {
                if ($item.PSObject.Properties.Name -contains $forbidden) { throw 'EVIDENCE_SANITIZATION_FAILED' }
            }
        }
        return $items
    } catch { throw 'EVIDENCE_SANITIZATION_FAILED' }
}

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-hosted-' + [guid]::NewGuid().ToString('N'))
$summary = New-HostedRunSummary -Workflow $WorkflowName -CommitSha $CommitSha
$policyBlocked = $false
$reviewRequired = $false
$primaryFailure = $null
$sourceProvenance = $null
$sourceProvenanceFailure = $null
$currentFailureCode = 'POLICY_EVALUATION_FAILED'
$completedStages = New-Object System.Collections.Generic.HashSet[string]
try {
    [void][System.IO.Directory]::CreateDirectory($EvidenceRoot)
    [void][System.IO.Directory]::CreateDirectory($temporaryRoot)
    $checkedOutSha = @(& git -C $repoRoot rev-parse HEAD 2>$null)
    if ($LASTEXITCODE -ne 0 -or $checkedOutSha.Count -ne 1 -or [string]$checkedOutSha[0] -notmatch '^[a-f0-9]{40}$') { throw 'CHECKOUT_REVISION_UNAVAILABLE' }
    $actualExecutionSha = [string]$checkedOutSha[0]
    $requestedCommitSha = $CommitSha
    $CommitSha = $actualExecutionSha
    if ($requestedCommitSha -cne $actualExecutionSha) {
        $sourceProvenanceFailure = 'CHECKOUT_REVISION_MISMATCH'
        throw 'CHECKOUT_REVISION_MISMATCH'
    }
    if ($serviceEvidenceMode) {
        try { $sourceProvenance = Get-ServiceSourceProvenance -ServiceId $ServiceId -Commit $CommitSha }
        catch { $sourceProvenanceFailure = [string]$_.Exception.Message; throw }
    }
    $stages = if ($RepositoryOnly) {
        @(
        @{ name='contract'; code='CONTRACT_VALIDATION_FAILED'; action={ node (Join-Path $PSScriptRoot 'Test-HostedSupplyChainContract.mjs') '--repository'; if ($LASTEXITCODE -ne 0) { throw 'CONTRACT_VALIDATION_FAILED' } } },
        @{ name='tools'; code='TOOL_BOOTSTRAP_FAILED'; arguments=@($temporaryRoot); action={ param([string]$BootstrapTemporaryRoot) Invoke-HostedRepositoryScript -ScriptName 'Install-SupplyChainTools.ps1' -BootstrapTemporaryRoot $BootstrapTemporaryRoot | Out-Null } },
        @{ name='dependency'; code='DEPENDENCY_SCAN_FAILED'; action={ if ($RefreshDatabase) { Invoke-HostedRepositoryScript -ScriptName 'Invoke-VulnerabilityScanning.ps1' -Arguments @('-RepositoryOnly') | Out-Null } else { Invoke-HostedRepositoryScript -ScriptName 'Invoke-VulnerabilityScanning.ps1' -Arguments @('-RepositoryOnly','-SkipDatabaseRefresh') | Out-Null } } },
        @{ name='gitleaks'; code='SECRET_SCAN_FAILED'; action={ Invoke-HostedRepositoryScript -ScriptName 'Invoke-GitleaksScanning.ps1' | Out-Null } }
        )
    } else {
        @(
        @{ name='contract'; code='CONTRACT_VALIDATION_FAILED'; action={ node (Join-Path $PSScriptRoot 'Test-HostedSupplyChainContract.mjs') '--repository'; if ($LASTEXITCODE -ne 0) { throw 'CONTRACT_VALIDATION_FAILED' } } },
        @{ name='tools'; code='TOOL_BOOTSTRAP_FAILED'; arguments=@($temporaryRoot); action={ param([string]$BootstrapTemporaryRoot) Invoke-HostedRepositoryScript -ScriptName 'Install-SupplyChainTools.ps1' -BootstrapTemporaryRoot $BootstrapTemporaryRoot | Out-Null } },
        @{ name='prebuild'; code='SBOM_BUILD_FAILED'; action={ if ($UseExistingVerifiedArtifact) { Invoke-HostedRepositoryScript -ScriptName 'Invoke-ContainerPrebuildArtifact.ps1' -Arguments @('-SkipBuild','-ServiceId',$ServiceId) | Out-Null } else { Invoke-HostedRepositoryScript -ScriptName 'Invoke-ContainerPrebuildArtifact.ps1' -Arguments @('-ServiceId',$ServiceId) | Out-Null } } },
        @{ name='dependency'; code='DEPENDENCY_SCAN_FAILED'; action={ if ($RefreshDatabase) { Invoke-HostedRepositoryScript -ScriptName 'Invoke-VulnerabilityScanning.ps1' -Arguments @('-ServiceId',$ServiceId) | Out-Null } else { Invoke-HostedRepositoryScript -ScriptName 'Invoke-VulnerabilityScanning.ps1' -Arguments @('-SkipDatabaseRefresh','-ServiceId',$ServiceId) | Out-Null } } },
        @{ name='gitleaks'; code='SECRET_SCAN_FAILED'; action={ Invoke-HostedRepositoryScript -ScriptName 'Invoke-GitleaksScanning.ps1' -Arguments @('-ServiceId',$ServiceId) | Out-Null } },
        @{ name='base'; code='BASE_TRUST_FAILED'; action={ Invoke-HostedRepositoryScript -ScriptName 'Test-ContainerBaseImageResolution.ps1' | Out-Null } },
        @{ name='image'; code='IMAGE_BUILD_FAILED'; action={ Invoke-HostedRepositoryScript -ScriptName 'Invoke-ContainerImageBuild.ps1' -Arguments @('-UseExistingVerifiedArtifact','-ServiceId',$ServiceId) | Out-Null } },
        @{ name='smoke'; code='SMOKE_FAILED'; arguments=@($temporaryRoot); action={ param([string]$SmokeTemporaryRoot) Invoke-HostedRepositoryScript -ScriptName 'Invoke-ContainerTechnicalSmoke.ps1' -Arguments @('-ServiceId',$ServiceId) -SmokeTemporaryRoot $SmokeTemporaryRoot | Out-Null } },
        @{ name='container'; code='CONTAINER_SCAN_FAILED'; arguments=@($temporaryRoot); action={ param([string]$ContainerScanTemporaryRoot) Invoke-HostedRepositoryScript -ScriptName 'Invoke-ContainerVulnerabilityScanning.ps1' -Arguments @('-ServiceId',$ServiceId) -ContainerScanTemporaryRoot $ContainerScanTemporaryRoot } }
        )
    }
    foreach ($stage in $stages) {
        $currentFailureCode = $stage.code
        try {
            $stageArguments = if ($stage.ContainsKey('arguments')) { @($stage.arguments) } else { @() }
            $result = Invoke-HostedStage -Name $stage.name -DefaultAction $stage.action -DefaultArguments $stageArguments
            $null = $completedStages.Add($stage.name)
            if ($result -eq 'POLICY_BLOCKED') { $policyBlocked = $true }
            if ($result -eq 'REVIEW_REQUIRED') { $reviewRequired = $true }
        } catch {
            $message = [string]$_.Exception.Message
            if ($message -match '\b(TOOL_BOOTSTRAP_(?:COSIGN|TRIVY|PROVENANCE|TUF_REFRESH|GITLEAKS|MODULE_LOAD|PLATFORM_RESOLUTION|CHILD_PROCESS|WRAPPER|SCRIPT_RESOLUTION|SHELL_RESOLUTION|CHILD_LAUNCH)_FAILED)\b') {
                throw $Matches[1]
            }
            if ($stage.name -eq 'tools') {
                Write-Warning ('Tool bootstrap wrapper diagnostic: phase=stage-dispatch; exceptionType={0}' -f $_.Exception.GetType().Name)
                throw 'TOOL_BOOTSTRAP_WRAPPER_FAILED'
            }
            if ($stage.name -eq 'prebuild' -and $message -match '\b(CONTAINER_PREBUILD_[A-Z_]+)\b') {
                Write-Warning ('Container prebuild diagnostic: failureCode={0}' -f $Matches[1])
            } elseif ($stage.name -eq 'prebuild') {
                Write-Warning ('Container prebuild diagnostic: phase=stage-dispatch; exceptionType={0}' -f $_.Exception.GetType().Name)
            }
            if ($stage.name -eq 'dependency' -and $message -notmatch 'HIGH_OR_CRITICAL_DISPOSITION_REQUIRED|VULNERABILITY_POLICY_BLOCKED' -and $message -match '\b(TRIVY_[A-Z0-9_]+|VULNERABILITY_[A-Z0-9_]+)\b') {
                Write-Warning ('Dependency scan diagnostic: failureCode={0}' -f $Matches[1])
            } elseif ($stage.name -eq 'dependency' -and $message -notmatch 'HIGH_OR_CRITICAL_DISPOSITION_REQUIRED|VULNERABILITY_POLICY_BLOCKED') {
                Write-Warning ('Dependency scan diagnostic: failureCode=DEPENDENCY_SCAN_UNCLASSIFIED; exceptionType={0}' -f $_.Exception.GetType().Name)
            }
            if ($stage.name -eq 'base' -and $message -match '\b(CONTAINER_BASE_IMAGE_[A-Z_]+)\b') {
                Write-Warning ('Container base trust diagnostic: failureCode={0}' -f $Matches[1])
            }
            if ($stage.name -eq 'base' -and $message -match 'CONTAINER_BASE_IMAGE_UNCLASSIFIED_FAILED\|phase=([a-z-]+)\|exceptionType=([A-Za-z0-9_.]+)') {
                Write-Warning ('Container base resolution diagnostic: phase={0}; exceptionType={1}' -f $Matches[1], $Matches[2])
            }
            if ($stage.name -eq 'smoke' -and $message -match '(CONTAINER_SMOKE_[A-Z_]+)\|phase=([a-z-]+)\|exceptionType=([A-Za-z0-9_.]+)') {
                Write-Warning ('Container smoke diagnostic: phase={0}; failureCode={1}; exceptionType={2}' -f $Matches[2], $Matches[1], $Matches[3])
            } elseif ($stage.name -eq 'smoke' -and $message -match '\b(CONTAINER_SMOKE_[A-Z_]+)\b') {
                Write-Warning ('Container smoke diagnostic: failureCode={0}' -f $Matches[1])
            } elseif ($stage.name -eq 'smoke') {
                Write-Warning 'Container smoke diagnostic: failureCode=CONTAINER_SMOKE_WRAPPER_UNCLASSIFIED'
            }
            if ($stage.name -eq 'container' -and $message -match '(CONTAINER_SCAN_[A-Z_]+)\|phase=([a-z-]+)\|exceptionType=([A-Za-z0-9_.]+)') {
                Write-Warning ('Container scan diagnostic: phase={0}; failureCode={1}; exceptionType={2}' -f $Matches[2], $Matches[1], $Matches[3])
            } elseif ($stage.name -eq 'container' -and $message -match '\b(CONTAINER_SCAN_[A-Z_]+)\b') {
                Write-Warning ('Container scan diagnostic: failureCode={0}' -f $Matches[1])
            }
            if ($message -match 'HIGH_OR_CRITICAL_DISPOSITION_REQUIRED|CONTAINER_SCAN_POLICY_BLOCKED|VULNERABILITY_POLICY_BLOCKED|GITLEAKS_POLICY_BLOCKED') {
                # A policy block means scanning and sanitization completed; retain its evidence.
                $null = $completedStages.Add($stage.name)
                $policyBlocked = $true
                continue
            }
            throw $stage.code
        }
    }
    $summary = Complete-HostedExecution -Summary $summary -PolicyState $(if ($policyBlocked) { 'BLOCKED' } else { 'PASS' })
    if ($reviewRequired) { $summary = Set-HostedStageResult -Summary $summary -Result 'REVIEW_REQUIRED' }
} catch {
    $primaryFailure = [string]$_.Exception.Message
    if ($primaryFailure -notmatch '^(CHECKOUT_FAILED|CHECKOUT_REVISION_UNAVAILABLE|CHECKOUT_REVISION_MISMATCH|SERVICE_SOURCE_REMOVED|SERVICE_GENERATION_MISSING|SERVICE_SOURCE_PROVENANCE_UNAVAILABLE|CONTRACT_VALIDATION_FAILED|TOOL_BOOTSTRAP_FAILED|TOOL_BOOTSTRAP_COSIGN_FAILED|TOOL_BOOTSTRAP_TRIVY_FAILED|TOOL_BOOTSTRAP_PROVENANCE_FAILED|TOOL_BOOTSTRAP_TUF_REFRESH_FAILED|TOOL_BOOTSTRAP_GITLEAKS_FAILED|TOOL_BOOTSTRAP_MODULE_LOAD_FAILED|TOOL_BOOTSTRAP_PLATFORM_RESOLUTION_FAILED|TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED|TOOL_BOOTSTRAP_WRAPPER_FAILED|TOOL_BOOTSTRAP_SCRIPT_RESOLUTION_FAILED|TOOL_BOOTSTRAP_SHELL_RESOLUTION_FAILED|TOOL_BOOTSTRAP_CHILD_LAUNCH_FAILED|SBOM_BUILD_FAILED|SBOM_VALIDATION_FAILED|DEPENDENCY_SCAN_FAILED|SECRET_SCAN_FAILED|BASE_TRUST_FAILED|IMAGE_BUILD_FAILED|SMOKE_FAILED|CONTAINER_SCAN_FAILED|SCANNER_OUTPUT_INVALID|POLICY_EVALUATION_FAILED|EVIDENCE_SANITIZATION_FAILED|EVIDENCE_VALIDATION_FAILED|EVIDENCE_UPLOAD_FAILED|CLEANUP_FAILED)$') { $primaryFailure = $currentFailureCode }
    $summary = Set-HostedStageResult -Summary $summary -Result 'IMPLEMENTATION_FAILURE' -FailureCode $primaryFailure
} finally {
    try {
        if ($serviceEvidenceMode -and $null -ne $sourceProvenance) {
            Write-HostedJson -Path (Join-Path $EvidenceRoot 'run-summary.json') -Value (New-ServiceEvidenceRecord -Fields ([ordered]@{ documentType='run-summary';workflow=$summary.workflow; executionState=$summary.executionState; policyState=$summary.policyState; reviewState=$summary.reviewState; deltaState=$summary.deltaState; failureCode=$summary.failureCode }))
        } else {
            Write-HostedRunSummaryAtomic -Path (Join-Path $EvidenceRoot 'run-summary.json') -Summary $summary
        }
        $serviceEvidence = [string]$serviceArtifact.evidencePath
        $inventoryMap = @{ dependency='vulnerability-inventory.json'; gitleaks='gitleaks-inventory.json'; container='container-vulnerability-inventory.json' }
        $allFindings = @()
        foreach ($stageName in $inventoryMap.Keys) {
            $findings = @()
            if ($summary.executionState -eq 'PASS' -and $completedStages.Contains($stageName)) { $findings = @(Read-HostedSanitizedInventory -Path (Join-Path $serviceEvidence $inventoryMap[$stageName])) }
            $allFindings += $findings
            $destination = switch ($stageName) { 'dependency' { 'vulnerability-inventory.json' } 'gitleaks' { 'gitleaks-inventory.json' } default { 'container-vulnerability-inventory.json' } }
            $documentType = [System.IO.Path]::GetFileNameWithoutExtension($destination)
            Write-HostedJson -Path (Join-Path $EvidenceRoot $destination) -Value (New-ServiceEvidenceRecord -Fields ([ordered]@{ documentType=$documentType;findings=$findings }))
        }
        $imageContract = Get-Content -LiteralPath (Join-Path $repoRoot 'security\tooling\container-image-contract.json') -Raw | ConvertFrom-Json
        $baseTrust = Get-Content -LiteralPath (Join-Path $repoRoot 'security\tooling\container-base-images.json') -Raw | ConvertFrom-Json
        $jarPath = [string]$serviceArtifact.jarPath
        $imageId = if ($null -eq $Adapters -and $summary.executionState -eq 'PASS' -and $completedStages.Contains('image')) { ((& docker image inspect $serviceArtifact.imageReference --format '{{.Id}}' 2>$null) | Select-Object -First 1) } else { 'unavailable' }
        $jarHash = if (Test-Path -LiteralPath $jarPath) { Get-HostedSha256 -Path $jarPath } else { 'unavailable' }
        Write-HostedJson -Path (Join-Path $EvidenceRoot 'image-identity.json') -Value (New-ServiceEvidenceRecord -Fields ([ordered]@{ documentType='image-identity';imageId=$imageId;imageReference=$serviceArtifact.imageReference;platform=$imageContract.image.platform;jarSha256=$jarHash;baseManifestDigest=$baseTrust.images[0].platformManifestDigest }))
        $smokeReady = if ($summary.executionState -eq 'PASS' -and $completedStages.Contains('smoke')) { 'UP' } else { 'unavailable' }
        Write-HostedJson -Path (Join-Path $EvidenceRoot 'smoke-summary.json') -Value (New-ServiceEvidenceRecord -Fields ([ordered]@{ documentType='smoke-summary';readiness=$smokeReady;platform=$imageContract.image.platform;runtimeUser=$imageContract.runtime.user;readOnlyRootFilesystem=$imageContract.technicalSmoke.readOnlyRootFilesystem;dropAllCapabilities=$imageContract.technicalSmoke.dropAllCapabilities;noNewPrivileges=$imageContract.technicalSmoke.noNewPrivileges }))
        $counts = @{}; foreach ($severity in @('CRITICAL','HIGH','MEDIUM','LOW','UNKNOWN')) { $counts[$severity] = @($allFindings | Where-Object { $_.severity -eq $severity }).Count }
        Write-HostedJson -Path (Join-Path $EvidenceRoot 'policy-summary.json') -Value (New-ServiceEvidenceRecord -Fields ([ordered]@{ documentType='policy-summary';policyState=$summary.policyState;reviewState=$summary.reviewState;deltaState=$summary.deltaState;counts=$counts }))
    } finally {
        if (Test-Path -LiteralPath $temporaryRoot) { Remove-HostedTemporaryRoot -Root $temporaryRoot }
    }
}

if ($serviceEvidenceMode -and $null -eq $sourceProvenance) {
    if ($sourceProvenanceFailure -match '^(CHECKOUT_REVISION_MISMATCH|SERVICE_SOURCE_REMOVED|SERVICE_GENERATION_MISSING|SERVICE_SOURCE_PROVENANCE_UNAVAILABLE)$') { throw $sourceProvenanceFailure }
    throw 'SERVICE_SOURCE_PROVENANCE_UNAVAILABLE'
}
$summaryHash = Get-HostedSha256 -Path (Join-Path $EvidenceRoot 'run-summary.json')
if (-not [string]::IsNullOrWhiteSpace([string]$env:GITHUB_OUTPUT)) { Add-Content -LiteralPath $env:GITHUB_OUTPUT -Value "policy_state=$($summary.policyState)"; Add-Content -LiteralPath $env:GITHUB_OUTPUT -Value "review_state=$($summary.reviewState)"; Add-Content -LiteralPath $env:GITHUB_OUTPUT -Value "summary_sha256=$summaryHash" }
if ($NoExit) { return $summary }
Write-Output (Format-HostedRunResult -Summary $summary)
if ($summary.executionState -ne 'PASS') { exit 1 }
exit 0
