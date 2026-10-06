[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Import-Module (Join-Path $PSScriptRoot 'GitleaksScanning.psm1') -Force
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('apx-gitleaks-sanitizer-' + [Guid]::NewGuid().ToString('N'))
$failures = New-Object System.Collections.Generic.List[string]
$nowUtc = [datetime]::Parse('2026-09-13T12:00:00Z').ToUniversalTime()

function Invoke-TestCase { param([string]$Name, [scriptblock]$Body) try { & $Body; Write-Output "[PASS] $Name" } catch { $script:failures.Add("${Name}: $($_.Exception.Message)"); Write-Output "[FAIL] $Name" } }
function Assert-ThrowsCode { param([scriptblock]$Body, [string]$Code) try { & $Body } catch { if ($_.Exception.Message -eq $Code) { return }; throw "Expected '$Code', got '$($_.Exception.Message)'." }; throw "Expected '$Code', but no failure was raised." }
function Write-TestReport {
    param([Parameter(Mandatory)][object[]]$Value)

    # Gitleaks emits a JSON array even for one finding. Keep fixtures in that
    # exact shape so Windows PowerShell and PowerShell 7 exercise the same
    # parser path as the production adapter.
    $path = Join-Path $testRoot ([guid]::NewGuid().ToString('N') + '.json')
    ConvertTo-Json -InputObject @($Value) -Depth 10 | Set-Content -LiteralPath $path -Encoding utf8 -NoNewline
    return $path
}
function New-Finding { param([string]$Mode = 'dir') $path = 'fixtures/example.txt'; $rule = 'fixture-rule'; $commit = if ($Mode -eq 'git') { 'a' * 40 } else { '' }; [pscustomobject]@{ RuleID = $rule; File = $path; Fingerprint = if ($Mode -eq 'git') { "$commit`:$path`:$rule`:1" } else { "$path`:$rule`:1" }; Commit = $commit; Secret = 'redacted'; Match = 'redacted'; Line = 'redacted' } }
function New-AllowlistEntry { param([string]$Mode = 'dir') $finding = New-Finding -Mode $Mode; [pscustomobject]@{ id = 'GL-FP-001'; scanMode = $Mode; ruleId = $finding.RuleID; repositoryRelativePath = $finding.File; scannerFingerprint = $finding.Fingerprint; commitId = if ($Mode -eq 'git') { $finding.Commit } else { $null }; status = 'false-positive'; owner = 'Repository Owner'; rationale = 'Synthetic unit-test false positive.'; remediationReference = 'TEST-GL-001'; approvedBy = 'Repository Owner'; approvedAt = '2026-09-12T00:00:00Z'; expiresAt = '2026-09-14T00:00:00Z' } }

try {
    New-Item -ItemType Directory -Path $testRoot | Out-Null
    Invoke-TestCase -Name 'Valid directory report is sanitized to approved fields only' -Body {
        $inventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @((New-Finding -Mode 'dir'))) -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot)
        if ($inventory.Count -ne 1) { throw 'Expected one finding.' }
        $fields = @($inventory[0].PSObject.Properties.Name)
        $expected = @('scanMode', 'ruleId', 'repositoryRelativePath', 'scannerFingerprint', 'commitId', 'status', 'remediationReference')
        if (($fields -join ',') -ne ($expected -join ',')) { throw 'Sanitized finding field set drifted.' }
        if ($inventory[0].commitId -ne $null -or $inventory[0].status -ne 'observed') { throw 'Directory finding was not normalized.' }
    }
    Invoke-TestCase -Name 'Valid Git report preserves only commit identifier' -Body {
        $inventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @((New-Finding -Mode 'git'))) -ScanMode git -RepositoryRoot $testRoot)
        if ($inventory[0].commitId -ne ('a' * 40)) { throw 'Git commit was not retained.' }
    }
    Invoke-TestCase -Name 'Web route paths are sanitized literally in directory and Git reports' -Body {
        foreach ($mode in @('dir', 'git')) {
            $finding = New-Finding -Mode $mode
            $finding.File = 'web/app/(admin)/auctions/[id]/page.tsx'
            $finding.Fingerprint = if ($mode -eq 'git') { "$($finding.Commit):$($finding.File):fixture-rule:1" } else { "$($finding.File):fixture-rule:1" }
            $inventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @($finding)) -ScanMode $mode -RepositoryRoot $testRoot -SnapshotRoot $testRoot)
            if ($inventory.Count -ne 1 -or $inventory[0].repositoryRelativePath -cne $finding.File -or $inventory[0].scannerFingerprint -cne $finding.Fingerprint) { throw 'Route identity changed during sanitization.' }
        }
    }
    Invoke-TestCase -Name 'Unsafe report paths remain rejected with route characters present' -Body {
        foreach ($unsafe in @('web/(admin)/../secret.txt', 'web/[id]/../../secret.txt', 'web/(admin)/file:stream', 'web/(admin)/file*.txt', 'web/(admin)/file?.txt')) {
            $finding = New-Finding
            $finding.File = $unsafe
            Assert-ThrowsCode -Code 'GITLEAKS_REPORT_PATH_UNSAFE' -Body { ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @($finding)) -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot | Out-Null }
        }
    }
    Invoke-TestCase -Name 'Malformed raw report rejected' -Body {
        $path = Join-Path $testRoot 'malformed.json'; Set-Content -LiteralPath $path -Value '{not-json' -NoNewline
        Assert-ThrowsCode -Code 'GITLEAKS_RAW_REPORT_MALFORMED' -Body { ConvertTo-SanitizedGitleaksInventory -ReportPath $path -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot | Out-Null }
    }
    Invoke-TestCase -Name 'Raw report missing fingerprint rejected' -Body {
        $finding = New-Finding; $finding.PSObject.Properties.Remove('Fingerprint')
        Assert-ThrowsCode -Code 'GITLEAKS_RAW_FINGERPRINT_INVALID' -Body { ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @($finding)) -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot | Out-Null }
    }
    Invoke-TestCase -Name 'Absolute fingerprint rejected' -Body {
        $finding = New-Finding; $finding.Fingerprint = 'C:\temp\fixture.txt:fixture-rule:1'
        Assert-ThrowsCode -Code 'GITLEAKS_RAW_FINGERPRINT_INVALID' -Body { ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @($finding)) -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot | Out-Null }
    }
    Invoke-TestCase -Name 'Git finding without commit rejected' -Body {
        $finding = New-Finding -Mode git; $finding.Commit = ''
        Assert-ThrowsCode -Code 'GITLEAKS_RAW_COMMIT_INVALID' -Body { ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @($finding)) -ScanMode git -RepositoryRoot $testRoot | Out-Null }
    }
    Invoke-TestCase -Name 'Unallowlisted finding fails as an incident' -Body {
        $inventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @((New-Finding))) -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot)
        Assert-ThrowsCode -Code 'GITLEAKS_FINDING_REQUIRES_INCIDENT' -Body { Test-GitleaksPolicy -Inventory $inventory -Allowlist @() -NowUtc $nowUtc | Out-Null }
    }
    Invoke-TestCase -Name 'Exact valid false-positive entry is retained as sanitized policy output' -Body {
        $inventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @((New-Finding))) -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot)
        $decisions = @(Test-GitleaksPolicy -Inventory $inventory -Allowlist @((New-AllowlistEntry)) -NowUtc $nowUtc)
        if ($decisions.Count -ne 1 -or $decisions[0].status -ne 'false-positive' -or $decisions[0].remediationReference -ne 'TEST-GL-001') { throw 'Exact false-positive policy result is invalid.' }
    }
    Invoke-TestCase -Name 'Expired false-positive entry rejected' -Body {
        $inventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @((New-Finding))) -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot)
        $entry = New-AllowlistEntry; $entry.expiresAt = '2026-09-13T11:59:59Z'
        Assert-ThrowsCode -Code 'GITLEAKS_ALLOWLIST_EXPIRED' -Body { Test-GitleaksPolicy -Inventory $inventory -Allowlist @($entry) -NowUtc $nowUtc | Out-Null }
    }
    Invoke-TestCase -Name 'Case-drifted exact match is rejected' -Body {
        $inventory = @(ConvertTo-SanitizedGitleaksInventory -ReportPath (Write-TestReport @((New-Finding))) -ScanMode dir -RepositoryRoot $testRoot -SnapshotRoot $testRoot)
        $entry = New-AllowlistEntry; $entry.repositoryRelativePath = 'Fixtures/example.txt'
        Assert-ThrowsCode -Code 'GITLEAKS_FINDING_REQUIRES_INCIDENT' -Body { Test-GitleaksPolicy -Inventory $inventory -Allowlist @($entry) -NowUtc $nowUtc | Out-Null }
    }
    Invoke-TestCase -Name 'Empty finding inventory passes without disposition' -Body {
        $decisions = @(Test-GitleaksPolicy -Inventory @() -Allowlist @() -NowUtc $nowUtc)
        if ($decisions.Count -ne 0) { throw 'Empty policy result was not empty.' }
    }
} finally { if (Test-Path -LiteralPath $testRoot) { Remove-Item -LiteralPath $testRoot -Recurse -Force } }

Write-Output 'Tests: 13'
Write-Output "Failures: $($failures.Count)"
if ($failures.Count -gt 0) { $failures | ForEach-Object { Write-Output "[DETAIL] $_" }; exit 1 }
Write-Output 'Gitleaks scanning sanitizer and policy tests: PASS'
