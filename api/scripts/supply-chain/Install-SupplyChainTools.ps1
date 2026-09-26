#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$VerifyOnly,
    [switch]$ForceReinstall,
    [string]$StatusPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-ToolBootstrapStatus {
    param([Parameter(Mandatory)][ValidateSet('PASS','FAILED')][string]$State, [Parameter(Mandatory)][string]$FailureCode)
    if ([string]::IsNullOrWhiteSpace($StatusPath)) { return }
    $directory = Split-Path -Parent $StatusPath
    [void][System.IO.Directory]::CreateDirectory($directory)
    $temporaryPath = $StatusPath + '.' + [guid]::NewGuid().ToString('N') + '.tmp'
    $value = [ordered]@{ schemaVersion = 1; state = $State; failureCode = $FailureCode } | ConvertTo-Json -Compress
    try {
        [System.IO.File]::WriteAllText($temporaryPath, $value, [System.Text.UTF8Encoding]::new($false))
        Move-Item -LiteralPath $temporaryPath -Destination $StatusPath -Force
    } finally {
        if (Test-Path -LiteralPath $temporaryPath) { Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue }
    }
}

try {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
    $manifestPath = Join-Path $repoRoot 'security\tooling\supply-chain-tools.json'
    $modulePath = Join-Path $PSScriptRoot 'SupplyChainTooling.psm1'

    try {
        Import-Module $modulePath -Force
    } catch {
        throw 'TOOL_BOOTSTRAP_MODULE_LOAD_FAILED'
    }
    try {
        $platform = Resolve-SupportedPlatform
    } catch {
        throw 'TOOL_BOOTSTRAP_PLATFORM_RESOLUTION_FAILED'
    }
    $common = @{
        Platform = $platform
        ManifestPath = $manifestPath
        VerifyOnly = $VerifyOnly
        ForceReinstall = $ForceReinstall
    }

    # Cosign is checksum- and version-verified before it becomes the trust tool
    # used for Trivy release provenance verification.
    try {
        $cosignPath = Get-VerifiedTool -ToolName 'cosign' @common
    } catch {
        throw 'TOOL_BOOTSTRAP_COSIGN_FAILED'
    }
    try {
        $null = Get-VerifiedTool -ToolName 'trivy' -VerifiedCosignPath $cosignPath @common
    } catch {
        if ($_.Exception.Message -match 'Trivy trusted-root refresh failed') { throw 'TOOL_BOOTSTRAP_TUF_REFRESH_FAILED' }
        if ($_.Exception.Message -match 'Trivy release provenance verification failed') { throw 'TOOL_BOOTSTRAP_PROVENANCE_FAILED' }
        throw 'TOOL_BOOTSTRAP_TRIVY_FAILED'
    }
    try {
        $null = Get-VerifiedTool -ToolName 'gitleaks' @common
    } catch {
        throw 'TOOL_BOOTSTRAP_GITLEAKS_FAILED'
    }

    Write-ToolBootstrapStatus -State 'PASS' -FailureCode 'NONE'
    Write-Output "Supply-chain tool bootstrap: PASS ($platform)"
    Write-Output 'cosign: checksum and version verified'
    Write-Output 'trivy: checksum, Sigstore provenance, and version verified'
    Write-Output 'gitleaks: checksum and version verified'
} catch {
    $message = [string]$_.Exception.Message
    $failureCode = if ($message -match '\b(TOOL_BOOTSTRAP_[A-Z_]+_FAILED)\b') { $Matches[1] } else { 'TOOL_BOOTSTRAP_CHILD_PROCESS_FAILED' }
    Write-ToolBootstrapStatus -State 'FAILED' -FailureCode $failureCode
    throw $failureCode
}
