$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Import-Module (Join-Path $PSScriptRoot 'LocalDbTopology.psm1') -Force
$targets = @(Get-LocalDatabaseTopology)
$expected = @(
    @('IDENTITY_DB','identity_db','identity','identity_owner','identity_migrator','identity_app'),
    @('IDENTITY_TEST_DB','identity_test_db','identity','identity_test_owner','identity_test_migrator','identity_test_app'),
    @('AUCTION_DB','auction_db','auction','auction_owner','auction_migrator','auction_app'),
    @('AUCTION_TEST_DB','auction_test_db','auction','auction_test_owner','auction_test_migrator','auction_test_app'),
    @('BIDDING_DB','bidding_db','bidding','bidding_owner','bidding_migrator','bidding_app'),
    @('BIDDING_TEST_DB','bidding_test_db','bidding','bidding_test_owner','bidding_test_migrator','bidding_test_app'),
    @('BILLING_DB','billing_db','billing','billing_owner','billing_migrator','billing_app'),
    @('BILLING_TEST_DB','billing_test_db','billing','billing_test_owner','billing_test_migrator','billing_test_app')
)
if ($targets.Count -ne 8) { throw 'TOPOLOGY_COUNT_INVALID' }
$keys = @('Prefix','Db','Schema','Owner','Migrator','App')
for ($i = 0; $i -lt 8; $i++) {
    for ($j = 0; $j -lt $keys.Count; $j++) {
        if ($targets[$i][$keys[$j]] -cne $expected[$i][$j]) { throw ('TOPOLOGY_MAPPING_INVALID_' + $i + '_' + $keys[$j]) }
    }
}
# Mutation of one consumer's returned record must not redirect a later caller.
$targets[4].Db = 'transaction_db'
if ((@(Get-LocalDatabaseTopology))[4].Db -cne 'bidding_db') { throw 'TOPOLOGY_STATE_LEAKED' }

# Evaluate only the actual target assignment from each consumer, not its body:
# no credentials, process environment, psql or native database operation.
foreach ($consumer in @('local-db-bootstrap.ps1','local-db-verify.ps1')) {
    $tokens = $null
    $parseErrors = $null
    $ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot $consumer), [ref]$tokens, [ref]$parseErrors)
    if ($parseErrors.Count -ne 0) { throw 'CONSUMER_PARSE_FAILED' }
    $assignments = @($ast.FindAll({ param($node)
        $node -is [Management.Automation.Language.AssignmentStatementAst] -and
        $node.Left.Extent.Text -ceq '$Targets'
    }, $true))
    if ($assignments.Count -ne 1) { throw 'CONSUMER_TARGETS_AMBIGUOUS' }
    $actual = @(& ([scriptblock]::Create($assignments[0].Right.Extent.Text)))
    if ($actual.Count -ne 8) { throw 'CONSUMER_TARGET_COUNT_INVALID' }
    for ($i = 0; $i -lt 8; $i++) {
        for ($j = 0; $j -lt $keys.Count; $j++) {
            if ($actual[$i][$keys[$j]] -cne $expected[$i][$j]) { throw 'CONSUMER_TARGET_MAPPING_INVALID' }
        }
    }
}

$apiRoot = Split-Path -Parent $PSScriptRoot
$example = @{}
foreach ($line in [IO.File]::ReadAllLines((Join-Path $apiRoot '.env.local.example'))) {
    if ($line -match '^([A-Z][A-Z0-9_]+)=(.*)$') {
        if ($example.ContainsKey($Matches[1])) { throw 'EXAMPLE_KEY_DUPLICATE' }
        $example[$Matches[1]] = $Matches[2]
    }
}
foreach ($target in @(Get-LocalDatabaseTopology)) {
    $suffixes = @('NAME','SCHEMA','OWNER','MIGRATOR_USERNAME','APP_USERNAME')
    $fields = @('Db','Schema','Owner','Migrator','App')
    for ($i = 0; $i -lt $fields.Count; $i++) {
        if ($example[$target.Prefix + '_' + $suffixes[$i]] -cne $target[$fields[$i]]) { throw 'EXAMPLE_MAPPING_INVALID' }
    }
    foreach ($suffix in @('APP_PASSWORD','MIGRATOR_PASSWORD')) {
        if ($example[$target.Prefix + '_' + $suffix] -cne 'replace-me') { throw 'EXAMPLE_PASSWORD_NOT_PLACEHOLDER' }
    }
}
Write-Output 'LOCAL_DB_CONSUMER_AND_EXAMPLE_CONTRACT_PASS (metadata only; SQL/native isolation not executed)'
Write-Output 'LOCAL_DB_TOPOLOGY_FIXTURES_PASS'
