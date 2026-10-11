#Requires -Version 5.1
<#
.SYNOPSIS
Verifies a running registered technical service over loopback HTTP.
.DESCRIPTION
Never starts or stops a process. It checks readiness, approved actuator endpoints, the exact
technical success/validation/malformed-request responses, and correlation propagation. Only
fixed result codes are written to the caller's ignored private log path.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$ServiceId,
    [Parameter(Mandatory)][string]$BaseUri,
    [Parameter(Mandatory)][string]$LogPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http

function Stop-HttpCheck {
    param([Parameter(Mandatory)][string]$Code)
    throw $Code
}

function Get-PlatformPathComparison {
    if ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT) {
        return [StringComparison]::OrdinalIgnoreCase
    }
    return [StringComparison]::Ordinal
}

function Assert-LoopbackUri {
    param([Parameter(Mandatory)][uri]$Uri)
    if (-not $Uri.IsAbsoluteUri -or $Uri.Scheme -cne 'http' -or
        -not [string]::IsNullOrEmpty($Uri.UserInfo) -or
        -not [string]::IsNullOrEmpty($Uri.Query) -or
        -not [string]::IsNullOrEmpty($Uri.Fragment) -or
        ($Uri.AbsolutePath -ne '/' -and $Uri.AbsolutePath -ne '')) {
        Stop-HttpCheck 'SERVICE_HTTP_BASE_URI_INVALID'
    }
    if (-not $Uri.IsLoopback) { Stop-HttpCheck 'SERVICE_HTTP_BASE_URI_INVALID' }
    $addresses = @()
    if ($Uri.Host -ceq 'localhost') {
        try { $addresses = @([Net.Dns]::GetHostAddresses($Uri.DnsSafeHost)) }
        catch { Stop-HttpCheck 'SERVICE_HTTP_BASE_URI_INVALID' }
        if ($addresses.Count -eq 0) { Stop-HttpCheck 'SERVICE_HTTP_BASE_URI_INVALID' }
        foreach ($address in $addresses) {
            if (-not [Net.IPAddress]::IsLoopback($address)) { Stop-HttpCheck 'SERVICE_HTTP_BASE_URI_INVALID' }
        }
    } else {
        $address = $null
        if (-not [Net.IPAddress]::TryParse($Uri.Host, [ref]$address) -or
            -not [Net.IPAddress]::IsLoopback($address)) {
            Stop-HttpCheck 'SERVICE_HTTP_BASE_URI_INVALID'
        }
    }
}

function Assert-IgnoredLogPath {
    param(
        [Parameter(Mandatory)][string]$RepositoryRoot,
        [Parameter(Mandatory)][string]$Path
    )
    $fullRoot = [IO.Path]::GetFullPath($RepositoryRoot).TrimEnd([char[]]@([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar))
    $logCandidate = if ([IO.Path]::IsPathRooted($Path)) { $Path } else { Join-Path $RepositoryRoot $Path }
    $fullPath = [IO.Path]::GetFullPath($logCandidate)
    $prefix = $fullRoot + [IO.Path]::DirectorySeparatorChar
    if (-not $fullPath.StartsWith($prefix, (Get-PlatformPathComparison)) -or
        [IO.Path]::GetExtension($fullPath) -cne '.log') {
        Stop-HttpCheck 'SERVICE_HTTP_LOG_PATH_INVALID'
    }
    $parentPath = Split-Path -Parent $fullPath
    if (-not (Test-Path -LiteralPath $parentPath -PathType Container)) { Stop-HttpCheck 'SERVICE_HTTP_LOG_PATH_INVALID' }
    $relative = $fullPath.Substring($prefix.Length)
    $current = $fullRoot
    foreach ($segment in ($relative -split '[\\/]')) {
        $current = Join-Path $current $segment
        if (Test-Path -LiteralPath $current) {
            $item = Get-Item -LiteralPath $current -Force
            if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { Stop-HttpCheck 'SERVICE_HTTP_LOG_PATH_INVALID' }
        }
    }
    $relativePath = $fullPath.Substring($prefix.Length).Replace([IO.Path]::DirectorySeparatorChar, '/')
    $nativePreferenceWasPresent = Test-Path -LiteralPath 'variable:PSNativeCommandUseErrorActionPreference'
    if ($nativePreferenceWasPresent) {
        $previousNativePreference = $PSNativeCommandUseErrorActionPreference
        $PSNativeCommandUseErrorActionPreference = $false
    }
    try {
        & git -C $RepositoryRoot check-ignore --quiet -- $relativePath 2>$null
        $ignoreExitCode = $LASTEXITCODE
    } catch {
        Stop-HttpCheck 'SERVICE_HTTP_LOG_PATH_INVALID'
    } finally {
        if ($nativePreferenceWasPresent) { $PSNativeCommandUseErrorActionPreference = $previousNativePreference }
    }
    if ($ignoreExitCode -ne 0) { Stop-HttpCheck 'SERVICE_HTTP_LOG_PATH_INVALID' }
    return $fullPath
}

function Get-JsonResponse {
    param([Parameter(Mandatory)][Net.Http.HttpResponseMessage]$Response)
    $bytes = $Response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
    try {
        $encoding = [Text.UTF8Encoding]::new($false, $true)
        $body = $encoding.GetString($bytes)
        $json = $body | ConvertFrom-Json -ErrorAction Stop
    }
    catch { Stop-HttpCheck 'SERVICE_HTTP_RESPONSE_INVALID' }
    return [pscustomobject]@{ StatusCode = [int]$Response.StatusCode; Body = $json }
}

function Assert-CorrelationHeader {
    param(
        [Parameter(Mandatory)][Net.Http.HttpResponseMessage]$Response,
        [Parameter(Mandatory)][string]$Expected
    )
    try { $values = @($Response.Headers.GetValues('X-Correlation-ID')) }
    catch { Stop-HttpCheck 'SERVICE_HTTP_CORRELATION_FAILED' }
    if ($values.Count -ne 1 -or [string]$values[0] -cne $Expected) {
        Stop-HttpCheck 'SERVICE_HTTP_CORRELATION_FAILED'
    }
}

$resultCode = 'SERVICE_HTTP_FAILED'
$fullLogPath = $null
$client = $null
try {
    $repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..') -ErrorAction Stop).Path
    $registryPath = Join-Path $repositoryRoot 'api/service-foundation/services.json'
    try { $registry = Get-Content -LiteralPath $registryPath -Raw | ConvertFrom-Json -ErrorAction Stop }
    catch { Stop-HttpCheck 'SERVICE_HTTP_REGISTRY_INVALID' }
    $service = @($registry.services | Where-Object { [string]$_.id -ceq $ServiceId })
    if ($service.Count -ne 1 -or $service[0].preserved) { Stop-HttpCheck 'SERVICE_HTTP_UNKNOWN_SERVICE' }

    try { $uri = [uri]$BaseUri } catch { Stop-HttpCheck 'SERVICE_HTTP_BASE_URI_INVALID' }
    Assert-LoopbackUri -Uri $uri
    $fullLogPath = Assert-IgnoredLogPath -RepositoryRoot $repositoryRoot -Path $LogPath
    $handler = [Net.Http.HttpClientHandler]::new()
    $handler.AllowAutoRedirect = $false
    $handler.UseProxy = $false
    $client = [Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(5)
    $base = $uri.GetLeftPart([UriPartial]::Authority)

    $readinessResponse = $client.GetAsync("$base/actuator/health/readiness").GetAwaiter().GetResult()
    $readiness = Get-JsonResponse -Response $readinessResponse
    if ($readiness.StatusCode -ne 200 -or $readiness.Body.status -cne 'UP') {
        Stop-HttpCheck 'SERVICE_HTTP_READINESS_FAILED'
    }
    $infoResponse = $client.GetAsync("$base/actuator/info").GetAwaiter().GetResult()
    if ([int]$infoResponse.StatusCode -ne 200) { Stop-HttpCheck 'SERVICE_HTTP_INFO_FAILED' }
    $metricsResponse = $client.GetAsync("$base/actuator/metrics").GetAwaiter().GetResult()
    if ([int]$metricsResponse.StatusCode -ne 200) { Stop-HttpCheck 'SERVICE_HTTP_METRICS_FAILED' }

    $correlationId = 'local-probe-' + [guid]::NewGuid().ToString('N')
    $successContent = [Net.Http.StringContent]::new('{"value":"service-local-probe"}', [Text.Encoding]::UTF8, 'application/json')
    $successRequest = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Post, "$base/internal/technical-baseline/validate")
    $successRequest.Headers.Add('X-Correlation-ID', $correlationId)
    $successRequest.Content = $successContent
    $successResponse = $client.SendAsync($successRequest).GetAwaiter().GetResult()
    $success = Get-JsonResponse -Response $successResponse
    if ($success.StatusCode -ne 200 -or
        $successResponse.Content.Headers.ContentType.MediaType -cne 'application/json' -or
        $success.Body.accepted -ne $true -or
        [int]$success.Body.valueLength -ne 19) {
        Stop-HttpCheck 'SERVICE_HTTP_SUCCESS_PROBE_FAILED'
    }
    Assert-CorrelationHeader -Response $successResponse -Expected $correlationId

    $validationContent = [Net.Http.StringContent]::new('{"value":""}', [Text.Encoding]::UTF8, 'application/json')
    $validationRequest = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Post, "$base/internal/technical-baseline/validate")
    $validationCorrelationId = 'local-probe-validation-' + [guid]::NewGuid().ToString('N')
    $validationRequest.Headers.Add('X-Correlation-ID', $validationCorrelationId)
    $validationRequest.Content = $validationContent
    $validationResponse = $client.SendAsync($validationRequest).GetAwaiter().GetResult()
    $validation = Get-JsonResponse -Response $validationResponse
    if ($validation.StatusCode -ne 400 -or
        $validationResponse.Content.Headers.ContentType.MediaType -cne 'application/problem+json' -or
        $validation.Body.type -cne 'urn:auction-promax:problem:validation-failed' -or
        $validation.Body.title -cne 'Request rejected' -or
        [int]$validation.Body.status -ne 400 -or
        $validation.Body.detail -cne 'The request is invalid.' -or
        $validation.Body.instance -cne '/internal/technical-baseline/validate' -or
        $validation.Body.code -cne 'VALIDATION_FAILED' -or
        $validation.Body.correlationId -cne $validationCorrelationId) {
        Stop-HttpCheck 'SERVICE_HTTP_VALIDATION_PROBE_FAILED'
    }
    Assert-CorrelationHeader -Response $validationResponse -Expected $validationCorrelationId

    $malformedContent = [Net.Http.StringContent]::new('{"value":', [Text.Encoding]::UTF8, 'application/json')
    $malformedRequest = [Net.Http.HttpRequestMessage]::new([Net.Http.HttpMethod]::Post, "$base/internal/technical-baseline/validate")
    $malformedCorrelationId = 'local-probe-malformed-' + [guid]::NewGuid().ToString('N')
    $malformedRequest.Headers.Add('X-Correlation-ID', $malformedCorrelationId)
    $malformedRequest.Content = $malformedContent
    $malformedResponse = $client.SendAsync($malformedRequest).GetAwaiter().GetResult()
    $malformed = Get-JsonResponse -Response $malformedResponse
    if ($malformed.StatusCode -ne 400 -or
        $malformedResponse.Content.Headers.ContentType.MediaType -cne 'application/problem+json' -or
        $malformed.Body.type -cne 'urn:auction-promax:problem:malformed-request' -or
        $malformed.Body.title -cne 'Request rejected' -or
        [int]$malformed.Body.status -ne 400 -or
        $malformed.Body.code -cne 'MALFORMED_REQUEST' -or
        $malformed.Body.detail -cne 'The request is invalid.' -or
        $malformed.Body.instance -cne '/internal/technical-baseline/validate' -or
        $malformed.Body.correlationId -cne $malformedCorrelationId) {
        Stop-HttpCheck 'SERVICE_HTTP_MALFORMED_PROBE_FAILED'
    }
    Assert-CorrelationHeader -Response $malformedResponse -Expected $malformedCorrelationId

    $resultCode = 'SERVICE_HTTP_PASS'
} catch {
    if ($_.Exception.Message -match '^SERVICE_HTTP_[A-Z_]+$') { $resultCode = $_.Exception.Message }
    else { $resultCode = 'SERVICE_HTTP_FAILED' }
    throw $resultCode
} finally {
    if ($null -ne $client) { $client.Dispose() }
    if ($null -ne $fullLogPath) {
        try { [IO.File]::AppendAllText($fullLogPath, "$resultCode`r`n", [Text.Encoding]::UTF8) }
        catch { throw 'SERVICE_HTTP_LOG_WRITE_FAILED' }
    }
}

Write-Output 'SERVICE_HTTP_PASS'
