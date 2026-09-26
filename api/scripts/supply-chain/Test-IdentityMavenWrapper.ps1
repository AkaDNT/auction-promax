#Requires -Version 5.1
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$serviceRoot = Join-Path $repoRoot 'services\identity-profile-service'
$wrapperPath = Join-Path $serviceRoot 'mvnw.cmd'
$temporaryMavenUserHome = Join-Path ([System.IO.Path]::GetTempPath()) ('auction-promax-maven-wrapper-' + [guid]::NewGuid().ToString('N'))

if (-not (Test-Path -LiteralPath $wrapperPath -PathType Leaf)) {
    throw 'Identity Maven Wrapper is missing.'
}

$previousMavenUserHome = $env:MAVEN_USER_HOME
try {
    New-Item -ItemType Directory -Path $temporaryMavenUserHome | Out-Null
    $env:MAVEN_USER_HOME = $temporaryMavenUserHome
    Push-Location $serviceRoot
    try {
        $output = @(& $env:ComSpec /d /c 'mvnw.cmd -v' 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }

    if ($exitCode -ne 0) {
        throw "Identity Maven Wrapper version command failed with exit code $exitCode."
    }
    if (-not ($output -match '^Apache Maven ')) {
        throw 'Identity Maven Wrapper did not report an Apache Maven version.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $temporaryMavenUserHome 'wrapper\dists') -PathType Container)) {
        throw 'Identity Maven Wrapper did not place its distribution below MAVEN_USER_HOME\wrapper\dists.'
    }

    Write-Output 'Identity Maven Wrapper: PASS'
} finally {
    $env:MAVEN_USER_HOME = $previousMavenUserHome
    if ((Split-Path -Leaf $temporaryMavenUserHome) -match '^auction-promax-maven-wrapper-[a-f0-9]{32}$' -and (Test-Path -LiteralPath $temporaryMavenUserHome)) {
        Remove-Item -LiteralPath $temporaryMavenUserHome -Recurse -Force
    }
}
