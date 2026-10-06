Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Throw-GitleaksScanFailure {
    param([Parameter(Mandatory)][string]$Code)
    throw $Code
}

function Test-PathWithinRoot {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Root
    )

    $resolvedPath = [System.IO.Path]::GetFullPath($Path)
    $resolvedRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    $prefix = $resolvedRoot + [System.IO.Path]::DirectorySeparatorChar
    return $resolvedPath.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)
}

function Get-WorkingTreeCandidatePaths {
    param([Parameter(Mandatory)][string]$RepositoryRoot)

    $repositoryRoot = [System.IO.Path]::GetFullPath($RepositoryRoot)
    if (-not (Test-Path -LiteralPath $repositoryRoot -PathType Container)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_REPOSITORY_ROOT_MISSING'
    }

    $insideWorkTree = @(& git -C $repositoryRoot rev-parse --is-inside-work-tree 2>$null)
    if ($LASTEXITCODE -ne 0 -or $insideWorkTree.Count -ne 1 -or "$($insideWorkTree[0])" -ne 'true') {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_REPOSITORY_NOT_A_WORKTREE'
    }

    # This is deliberately Git's candidate set, not an unrestricted filesystem walk.
    # It includes tracked and non-ignored untracked files while excluding .env.local
    # when it follows the repository's ignore rules.
    $candidateOutput = @(& git -C $repositoryRoot ls-files --cached --others --exclude-standard 2>$null)
    if ($LASTEXITCODE -ne 0) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_WORKING_TREE_ENUMERATION_FAILED'
    }

    $candidates = New-Object System.Collections.Generic.List[string]
    foreach ($candidateValue in $candidateOutput) {
        $candidate = "$candidateValue"
        if ([string]::IsNullOrWhiteSpace($candidate)) {
            Throw-GitleaksScanFailure -Code 'GITLEAKS_WORKING_TREE_PATH_UNSAFE'
        }
        # Route groups and dynamic route segments use () and [] as literal
        # filename characters. They are never evaluated as wildcard patterns.
        if ($candidate -notmatch '^[A-Za-z0-9._/()\[\]-]+$' -or $candidate -match '(^|/)\.\.(/|$)' -or $candidate.StartsWith('/') -or $candidate -match '^[A-Za-z]:') {
            Throw-GitleaksScanFailure -Code 'GITLEAKS_WORKING_TREE_PATH_UNSAFE'
        }
        if ($candidate -match '(^|/)\.env\.local$') {
            Throw-GitleaksScanFailure -Code 'GITLEAKS_ENV_LOCAL_CANDIDATE_REJECTED'
        }

        $sourcePath = Join-Path $repositoryRoot ($candidate -replace '/', [System.IO.Path]::DirectorySeparatorChar)
        if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
            # A tracked deletion is not present in the working tree and cannot be
            # copied; the Git-history scan covers its committed content.
            continue
        }
        $item = Get-Item -LiteralPath $sourcePath -Force
        if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            Throw-GitleaksScanFailure -Code 'GITLEAKS_WORKING_TREE_REPARSE_POINT_REJECTED'
        }
        if (-not (Test-PathWithinRoot -Path $sourcePath -Root $repositoryRoot)) {
            Throw-GitleaksScanFailure -Code 'GITLEAKS_WORKING_TREE_PATH_ESCAPES_ROOT'
        }
        $candidates.Add($candidate)
    }

    return @($candidates | Sort-Object -Unique)
}

function New-WorkingTreeSnapshot {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$TemporaryRoot
    )

    $repositoryRoot = [System.IO.Path]::GetFullPath($RepositoryRoot)
    $temporaryRoot = [System.IO.Path]::GetFullPath($TemporaryRoot)
    if (Test-PathWithinRoot -Path $temporaryRoot -Root $repositoryRoot) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_SNAPSHOT_ROOT_INSIDE_REPOSITORY'
    }
    if (Test-Path -LiteralPath $temporaryRoot) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_SNAPSHOT_ROOT_ALREADY_EXISTS'
    }

    New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
    try {
        $candidates = @(Get-WorkingTreeCandidatePaths -RepositoryRoot $repositoryRoot)
        foreach ($candidate in $candidates) {
            $sourcePath = Join-Path $repositoryRoot ($candidate -replace '/', [System.IO.Path]::DirectorySeparatorChar)
            $destinationPath = Join-Path $temporaryRoot ($candidate -replace '/', [System.IO.Path]::DirectorySeparatorChar)
            $destinationDirectory = Split-Path -Parent $destinationPath
            [System.IO.Directory]::CreateDirectory($destinationDirectory) | Out-Null
            if (-not [System.IO.Directory]::Exists($destinationDirectory)) {
                Throw-GitleaksScanFailure -Code 'GITLEAKS_SNAPSHOT_DIRECTORY_CREATION_FAILED'
            }
            [System.IO.File]::Copy($sourcePath, $destinationPath, $true)
        }
        return [pscustomobject]@{
            snapshotRoot = $temporaryRoot
            candidateCount = $candidates.Count
        }
    } catch {
        if (Test-Path -LiteralPath $temporaryRoot) {
            Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
        }
        throw
    }
}

function Get-VerifiedGitleaksExecutable {
    [OutputType([string])]
    param()

    $toolingModulePath = Join-Path $PSScriptRoot 'SupplyChainTooling.psm1'
    if (-not (Test-Path -LiteralPath $toolingModulePath -PathType Leaf)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_BOOTSTRAP_MODULE_MISSING'
    }
    Import-Module $toolingModulePath -Force
    $platform = Resolve-SupportedPlatform
    return Get-VerifiedTool -ToolName 'gitleaks' -Platform $platform -VerifyOnly
}

function Get-GitleaksScanArguments {
    [OutputType([string[]])]
    param(
        [Parameter(Mandatory)]$ScanDefinition,
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$InputPath,
        [Parameter(Mandatory)][string]$OutputPath
    )

    $repositoryRoot = [System.IO.Path]::GetFullPath($RepositoryRoot)
    $outputPath = [System.IO.Path]::GetFullPath($OutputPath)
    $configPath = Join-Path $repositoryRoot 'security\tooling\gitleaks.toml'
    $ignorePath = Join-Path $repositoryRoot 'security\tooling\gitleaks-empty-ignore.txt'
    if (-not (Test-Path -LiteralPath $configPath -PathType Leaf) -or -not (Test-Path -LiteralPath $ignorePath -PathType Leaf)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_CONFIGURATION_MISSING'
    }

    $id = "$($ScanDefinition.id)"
    if ($id -eq 'working-tree') {
        return @('dir', $InputPath, '--config', $configPath, '--gitleaks-ignore-path', $ignorePath, '--ignore-gitleaks-allow', '--redact=100', '--report-format', 'json', '--report-path', $outputPath, '--exit-code', '3', '--log-level', 'error', '--no-banner', '--no-color', '--timeout', '300')
    }
    if ($id -eq 'git-history') {
        $inputPath = [System.IO.Path]::GetFullPath($InputPath)
        return @('git', $inputPath, '--log-opts', '--full-history --all', '--config', $configPath, '--gitleaks-ignore-path', $ignorePath, '--ignore-gitleaks-allow', '--redact=100', '--report-format', 'json', '--report-path', $outputPath, '--exit-code', '3', '--log-level', 'error', '--no-banner', '--no-color', '--timeout', '300')
    }
    Throw-GitleaksScanFailure -Code 'GITLEAKS_SCAN_DEFINITION_UNSUPPORTED'
}

function Invoke-GitleaksScan {
    [OutputType([pscustomobject])]
    param(
        [Parameter(Mandatory)][string]$GitleaksExecutable,
        [Parameter(Mandatory)]$ScanDefinition,
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$InputPath,
        [Parameter(Mandatory)][string]$OutputPath,
        [string]$WorkingDirectory
    )

    if (-not (Test-Path -LiteralPath $GitleaksExecutable -PathType Leaf)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_EXECUTABLE_MISSING'
    }
    $outputDirectory = Split-Path -Parent $OutputPath
    if ([string]::IsNullOrWhiteSpace($outputDirectory)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_REPORT_PATH_INVALID'
    }
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    $arguments = @(Get-GitleaksScanArguments -ScanDefinition $ScanDefinition -RepositoryRoot $RepositoryRoot -InputPath $InputPath -OutputPath $OutputPath)
    if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory) -and -not (Test-Path -LiteralPath $WorkingDirectory -PathType Container)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_WORKING_DIRECTORY_MISSING'
    }
    # Never forward native output: even with --redact=100 it is not evidence.
    if ([string]::IsNullOrWhiteSpace($WorkingDirectory)) {
        $null = @(& $GitleaksExecutable @arguments 2>&1)
        $exitCode = $LASTEXITCODE
    } else {
        Push-Location $WorkingDirectory
        try {
            $null = @(& $GitleaksExecutable @arguments 2>&1)
            $exitCode = $LASTEXITCODE
        } finally {
            Pop-Location
        }
    }
    if ($exitCode -notin @(0, 3)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_SCAN_FAILED'
    }
    return [pscustomobject]@{
        scanId = "$($ScanDefinition.id)"
        exitCode = $exitCode
        reportPath = [System.IO.Path]::GetFullPath($OutputPath)
    }
}

function Get-GitleaksPropertyValue {
    param([Parameter(Mandatory)]$Object, [Parameter(Mandatory)][string]$Name)
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) { return $null }
    return $property.Value
}

function ConvertTo-GitleaksRepositoryRelativePath {
    param(
        [Parameter(Mandatory)][string]$ReportedPath,
        [Parameter(Mandatory)][ValidateSet('dir', 'git')][string]$ScanMode,
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [string]$SnapshotRoot
    )

    if ([string]::IsNullOrWhiteSpace($ReportedPath)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_REPORT_PATH_MISSING'
    }
    if ([System.IO.Path]::IsPathRooted($ReportedPath)) {
        if ($ScanMode -ne 'dir' -or [string]::IsNullOrWhiteSpace($SnapshotRoot) -or -not (Test-PathWithinRoot -Path $ReportedPath -Root $SnapshotRoot)) {
            Throw-GitleaksScanFailure -Code 'GITLEAKS_REPORT_PATH_ABSOLUTE'
        }
        $relative = $ReportedPath.Substring(([System.IO.Path]::GetFullPath($SnapshotRoot).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)).Length).TrimStart([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    } else {
        $relative = $ReportedPath
    }
    $relative = $relative.Replace('\\', '/')
    if ($relative -notmatch '^[A-Za-z0-9._/()\[\]-]+$' -or $relative -match '(^|/)\.\.(/|$)' -or $relative.StartsWith('/') -or $relative -match '^[A-Za-z]:') {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_REPORT_PATH_UNSAFE'
    }
    return $relative
}

function ConvertTo-SanitizedGitleaksInventory {
    [OutputType([object[]])]
    param(
        [Parameter(Mandatory)][string]$ReportPath,
        [Parameter(Mandatory)][ValidateSet('dir', 'git')][string]$ScanMode,
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [string]$SnapshotRoot
    )

    if (-not (Test-Path -LiteralPath $ReportPath -PathType Leaf)) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_REPORT_MISSING'
    }
    try {
        $rawJson = Get-Content -LiteralPath $ReportPath -Raw -ErrorAction Stop
    } catch {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_REPORT_MALFORMED'
    }
    try {
        # Do not parse through the pipeline: PowerShell hosts differ in
        # whether a root JSON array is emitted as individual findings or as a
        # single Object[] pipeline item. Parse first, then normalize the
        # result explicitly so the validation loop always receives findings.
        $parsedRaw = ConvertFrom-Json -InputObject $rawJson -ErrorAction Stop
        $raw = @($parsedRaw)
    } catch {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_REPORT_MALFORMED'
    }
    # Windows PowerShell 5.1 unwraps a one-element JSON array when it flows
    # through ConvertFrom-Json. After validating JSON syntax, check the root
    # token and normalize the parsed result for identical 5.1/7 behavior.
    if (-not $rawJson.TrimStart().StartsWith('[')) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_REPORT_SHAPE_INVALID'
    }
    if ($raw.Count -eq 0) { return @() }

    $inventory = New-Object System.Collections.Generic.List[object]
    $seen = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($finding in @($raw)) {
        if ($null -eq $finding) { Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_FINDING_INVALID' }
        $ruleId = "$(Get-GitleaksPropertyValue -Object $finding -Name 'RuleID')"
        $file = "$(Get-GitleaksPropertyValue -Object $finding -Name 'File')"
        $fingerprint = "$(Get-GitleaksPropertyValue -Object $finding -Name 'Fingerprint')"
        if ($ruleId -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$') { Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_RULE_ID_INVALID' }
        if ([string]::IsNullOrWhiteSpace($fingerprint) -or $fingerprint -match '[\r\n]' -or $fingerprint -match '[A-Za-z]:[\\/]') { Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_FINGERPRINT_INVALID' }
        $relativePath = ConvertTo-GitleaksRepositoryRelativePath -ReportedPath $file -ScanMode $ScanMode -RepositoryRoot $RepositoryRoot -SnapshotRoot $SnapshotRoot

        $commitValue = Get-GitleaksPropertyValue -Object $finding -Name 'Commit'
        $commitId = if ($null -eq $commitValue) { '' } else { "$commitValue" }
        if ($ScanMode -eq 'git') {
            if ($commitId -notmatch '^[a-f0-9]{40}$') { Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_COMMIT_INVALID' }
            if ($fingerprint -notmatch ('^' + [regex]::Escape($commitId) + ':' + [regex]::Escape($relativePath) + ':' + [regex]::Escape($ruleId) + ':[0-9]+$')) { Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_FINGERPRINT_INVALID' }
        } else {
            if (-not [string]::IsNullOrWhiteSpace($commitId)) { Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_COMMIT_UNEXPECTED' }
            if ($fingerprint -notmatch ('^' + [regex]::Escape($relativePath) + ':' + [regex]::Escape($ruleId) + ':[0-9]+$')) { Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_FINGERPRINT_INVALID' }
            $commitId = $null
        }
        $key = @($ScanMode, $ruleId, $relativePath, $fingerprint, $commitId) -join "`0"
        if (-not $seen.Add($key)) { Throw-GitleaksScanFailure -Code 'GITLEAKS_RAW_FINDING_DUPLICATE' }
        $inventory.Add([pscustomobject]@{
            scanMode = $ScanMode
            ruleId = $ruleId
            repositoryRelativePath = $relativePath
            scannerFingerprint = $fingerprint
            commitId = $commitId
            status = 'observed'
            remediationReference = $null
        })
    }
    return $inventory.ToArray()
}

function ConvertTo-GitleaksUtcTimestamp {
    param([Parameter(Mandatory)][string]$Value, [Parameter(Mandatory)][string]$FailureCode)
    try {
        return [datetimeoffset]::ParseExact($Value, 'yyyy-MM-ddTHH:mm:ssZ', [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::AssumeUniversal).ToUniversalTime()
    } catch {
        Throw-GitleaksScanFailure -Code $FailureCode
    }
}

function Test-GitleaksPolicy {
    [OutputType([object[]])]
    param(
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Inventory,
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Allowlist,
        [Parameter(Mandatory)][datetime]$NowUtc
    )

    $decisions = New-Object System.Collections.Generic.List[object]
    foreach ($finding in $Inventory) {
        $matches = @($Allowlist | Where-Object {
            $_.scanMode -ceq $finding.scanMode -and $_.ruleId -ceq $finding.ruleId -and $_.repositoryRelativePath -ceq $finding.repositoryRelativePath -and $_.scannerFingerprint -ceq $finding.scannerFingerprint -and "$(if ($null -eq $_.commitId) { '' } else { $_.commitId })" -ceq "$(if ($null -eq $finding.commitId) { '' } else { $finding.commitId })"
        })
        if ($matches.Count -gt 1) { Throw-GitleaksScanFailure -Code 'GITLEAKS_ALLOWLIST_AMBIGUOUS' }
        if ($matches.Count -eq 0) { Throw-GitleaksScanFailure -Code 'GITLEAKS_FINDING_REQUIRES_INCIDENT' }
        $entry = $matches[0]
        $approvedAt = ConvertTo-GitleaksUtcTimestamp -Value "$($entry.approvedAt)" -FailureCode 'GITLEAKS_ALLOWLIST_APPROVAL_INVALID'
        $expiresAt = ConvertTo-GitleaksUtcTimestamp -Value "$($entry.expiresAt)" -FailureCode 'GITLEAKS_ALLOWLIST_EXPIRY_INVALID'
        if ($approvedAt.UtcDateTime -gt $NowUtc.ToUniversalTime()) { Throw-GitleaksScanFailure -Code 'GITLEAKS_ALLOWLIST_APPROVAL_IN_FUTURE' }
        if ($expiresAt.UtcDateTime -le $NowUtc.ToUniversalTime()) { Throw-GitleaksScanFailure -Code 'GITLEAKS_ALLOWLIST_EXPIRED' }
        $decisions.Add([pscustomobject]@{
            scanMode = $finding.scanMode
            ruleId = $finding.ruleId
            repositoryRelativePath = $finding.repositoryRelativePath
            scannerFingerprint = $finding.scannerFingerprint
            commitId = $finding.commitId
            status = 'false-positive'
            remediationReference = "$($entry.remediationReference)"
        })
    }
    return $decisions.ToArray()
}

function Assert-ExpectedGitleaksFixtureFinding {
    param(
        [Parameter(Mandatory)]$ScanResult,
        [Parameter(Mandatory)][AllowEmptyCollection()][object[]]$Inventory,
        [Parameter(Mandatory)][ValidateSet('dir', 'git')][string]$ScanMode
    )
    $matches = @($Inventory | Where-Object {
        $_.scanMode -ceq $ScanMode -and $_.ruleId -ceq 'apx-controlled-secret-fixture' -and $_.repositoryRelativePath -ceq 'fixture.txt' -and $_.status -ceq 'observed'
    })
    if ($ScanResult.exitCode -ne 3 -or $matches.Count -ne 1 -or $Inventory.Count -ne 1) {
        Throw-GitleaksScanFailure -Code 'GITLEAKS_FIXTURE_NOT_DETECTED'
    }
    return $matches[0]
}

Export-ModuleMember -Function 'Get-WorkingTreeCandidatePaths', 'New-WorkingTreeSnapshot', 'Get-VerifiedGitleaksExecutable', 'Get-GitleaksScanArguments', 'Invoke-GitleaksScan', 'ConvertTo-SanitizedGitleaksInventory', 'Test-GitleaksPolicy', 'Assert-ExpectedGitleaksFixtureFinding'
