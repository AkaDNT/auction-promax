[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$servicePath = Join-Path $PSScriptRoot "..\services\identity-profile-service"
$wrapperPath = Join-Path $servicePath "mvnw.cmd"

if (-not (Test-Path -LiteralPath $wrapperPath -PathType Leaf)) {
    throw "Maven Wrapper was not found at $wrapperPath."
}

Push-Location $servicePath
try {
    & $wrapperPath -B verify
    if ($LASTEXITCODE -ne 0) {
        throw "Maven verify failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}
