<# .SYNOPSIS Drops only allowlisted local test databases after explicit acknowledgement. #>
[CmdletBinding(SupportsShouldProcess)]
param([switch]$IUnderstandThisDeletesLocalTestDatabases)
Set-StrictMode -Version Latest;$ErrorActionPreference='Stop'
if(!$IUnderstandThisDeletesLocalTestDatabases){throw 'Pass -IUnderstandThisDeletesLocalTestDatabases to reset only local test databases.'}
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path;$envPath=Join-Path $root '.env.local';if(!(Test-Path $envPath)){throw "Missing $envPath"};$h=@{};Get-Content $envPath|ForEach-Object{$x=$_.Trim();if($x -and !$x.StartsWith('#')){$i=$x.IndexOf('=');if($i-gt 0){$h[$x.Substring(0,$i)]=$x.Substring($i+1)}}}
foreach($k in @('POSTGRES_HOST','POSTGRES_PORT','POSTGRES_ADMIN_USER','POSTGRES_ADMIN_PASSWORD')){if(!$h[$k]){throw "Missing $k"}};$psql=(Get-Command psql -CommandType Application -ErrorAction Stop).Source;$old=$env:PGPASSWORD
try{$env:PGPASSWORD=$h.POSTGRES_ADMIN_PASSWORD;foreach($db in @('identity_test_db','auction_test_db','transaction_test_db','payment_test_db')){if($PSCmdlet.ShouldProcess($db,'DROP DATABASE (local test database only)')){& $psql -X -v ON_ERROR_STOP=1 -h $h.POSTGRES_HOST -p $h.POSTGRES_PORT -U $h.POSTGRES_ADMIN_USER -d postgres -c "DROP DATABASE IF EXISTS $db WITH (FORCE)";if($LASTEXITCODE-ne 0){exit $LASTEXITCODE}}}}finally{if($null-eq$old){Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue}else{$env:PGPASSWORD=$old}}
