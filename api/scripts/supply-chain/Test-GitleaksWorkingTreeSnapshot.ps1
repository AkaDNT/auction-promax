[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Import-Module (Join-Path $PSScriptRoot 'GitleaksScanning.psm1') -Force

$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-gitleaks-snapshot-' + [Guid]::NewGuid().ToString('N'))
$testRepository = Join-Path $testRoot 'repository'
$snapshotRoot = Join-Path $testRoot 'snapshot'
$failures = New-Object System.Collections.Generic.List[string]

function Invoke-TestCase {
    param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][scriptblock]$Body)
    try {
        & $Body
        Write-Output "[PASS] $Name"
    } catch {
        $script:failures.Add("${Name}: $($_.Exception.Message)")
        Write-Output "[FAIL] $Name"
    }
}

function Assert-Equal {
    param($Actual, $Expected, [string]$Message)
    if ($Actual -ne $Expected) { throw "$Message (actual='$Actual', expected='$Expected')" }
}

function Assert-ThrowsCode {
    param([Parameter(Mandatory)][scriptblock]$Body, [Parameter(Mandatory)][string]$Code)
    try {
        & $Body
    } catch {
        if ($_.Exception.Message -eq $Code) { return }
        throw "Expected failure code '$Code', got '$($_.Exception.Message)'."
    }
    throw "Expected failure code '$Code', but no failure was raised."
}

try {
    New-Item -ItemType Directory -Path $testRepository -Force | Out-Null
    & git -C $testRepository init --quiet
    if ($LASTEXITCODE -ne 0) { throw 'Unable to initialize temporary Git repository.' }
    & git -C $testRepository config user.email 'cycle4-fixture@example.invalid'
    & git -C $testRepository config user.name 'Cycle 4 Fixture'

    Set-Content -LiteralPath (Join-Path $testRepository '.gitignore') -Value ".env.local`nignored/" -NoNewline
    Set-Content -LiteralPath (Join-Path $testRepository 'tracked.txt') -Value 'tracked-original' -NoNewline
    $nestedTrackedDirectory = Join-Path $testRepository 'nested\tracked'
    New-Item -ItemType Directory -Path $nestedTrackedDirectory -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $nestedTrackedDirectory 'baseline.txt') -Value 'nested-tracked-file' -NoNewline
    & git -C $testRepository add .gitignore tracked.txt nested/tracked/baseline.txt
    & git -C $testRepository commit --quiet -m 'fixture baseline'
    if ($LASTEXITCODE -ne 0) { throw 'Unable to commit temporary Git fixture.' }

    Set-Content -LiteralPath (Join-Path $testRepository 'tracked.txt') -Value 'tracked-working-tree-change' -NoNewline
    Set-Content -LiteralPath (Join-Path $testRepository 'untracked.txt') -Value 'untracked-working-tree-file' -NoNewline
    Set-Content -LiteralPath (Join-Path $testRepository '.env.local') -Value 'must-not-be-copied' -NoNewline
    New-Item -ItemType Directory -Path (Join-Path $testRepository 'ignored') | Out-Null
    Set-Content -LiteralPath (Join-Path $testRepository 'ignored/ignored.txt') -Value 'must-not-be-copied' -NoNewline

    Invoke-TestCase -Name 'Candidate set includes tracked and non-ignored untracked files' -Body {
        $candidates = @(Get-WorkingTreeCandidatePaths -RepositoryRoot $testRepository)
        if ('tracked.txt' -notin $candidates -or 'untracked.txt' -notin $candidates) { throw 'Expected working-tree files were absent.' }
    }
    Invoke-TestCase -Name 'Ignored env-local is excluded before snapshot creation' -Body {
        $candidates = @(Get-WorkingTreeCandidatePaths -RepositoryRoot $testRepository)
        if ('.env.local' -in $candidates) { throw 'Ignored .env.local was a scan candidate.' }
    }
    Invoke-TestCase -Name 'Snapshot retains working-tree modifications and excludes ignored files' -Body {
        $result = New-WorkingTreeSnapshot -RepositoryRoot $testRepository -TemporaryRoot $snapshotRoot
        Assert-Equal $result.candidateCount 4 'Unexpected snapshot candidate count'
        Assert-Equal (Get-Content -LiteralPath (Join-Path $snapshotRoot 'tracked.txt') -Raw) 'tracked-working-tree-change' 'Tracked working-tree content was not retained'
        Assert-Equal (Get-Content -LiteralPath (Join-Path $snapshotRoot 'untracked.txt') -Raw) 'untracked-working-tree-file' 'Untracked working-tree content was not retained'
        Assert-Equal (Get-Content -LiteralPath (Join-Path $snapshotRoot 'nested/tracked/baseline.txt') -Raw) 'nested-tracked-file' 'Nested tracked content was not retained'
        if (Test-Path -LiteralPath (Join-Path $snapshotRoot '.env.local')) { throw '.env.local was copied into snapshot.' }
        if (Test-Path -LiteralPath (Join-Path $snapshotRoot 'ignored/ignored.txt')) { throw 'Ignored file was copied into snapshot.' }
    }
    Invoke-TestCase -Name 'Tracked env-local candidate fails closed before content copy' -Body {
        & git -C $testRepository add -f .env.local
        if ($LASTEXITCODE -ne 0) { throw 'Unable to stage env-local rejection fixture.' }
        Assert-ThrowsCode -Code 'GITLEAKS_ENV_LOCAL_CANDIDATE_REJECTED' -Body { Get-WorkingTreeCandidatePaths -RepositoryRoot $testRepository | Out-Null }
    }
    Invoke-TestCase -Name 'Nested tracked env-local candidate also fails closed' -Body {
        $nestedDirectory = Join-Path $testRepository 'config'
        New-Item -ItemType Directory -Path $nestedDirectory -Force | Out-Null
        Set-Content -LiteralPath (Join-Path $nestedDirectory '.env.local') -Value 'must-not-be-read' -NoNewline
        & git -C $testRepository add -f config/.env.local
        if ($LASTEXITCODE -ne 0) { throw 'Unable to stage nested env-local rejection fixture.' }
        Assert-ThrowsCode -Code 'GITLEAKS_ENV_LOCAL_CANDIDATE_REJECTED' -Body { Get-WorkingTreeCandidatePaths -RepositoryRoot $testRepository | Out-Null }
    }
} finally {
    if (Test-Path -LiteralPath $testRoot) { Remove-Item -LiteralPath $testRoot -Recurse -Force }
}

Write-Output "Tests: $($failures.Count + 5)"
Write-Output "Failures: $($failures.Count)"
if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Output "[DETAIL] $_" }
    exit 1
}
Write-Output 'Gitleaks working-tree snapshot tests: PASS'
