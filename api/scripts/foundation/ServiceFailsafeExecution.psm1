Set-StrictMode -Version Latest

function Test-ServiceFailsafeExecution {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string] $ServiceId,
    [Parameter(Mandatory = $true)]
    [string] $ReportDirectory,
    [Parameter(Mandatory = $true)]
    [string] $RepositoryRoot
  )

  $registryPath = Join-Path $RepositoryRoot 'api/service-foundation/services.json'
  if (-not (Test-Path -LiteralPath $registryPath -PathType Leaf)) {
    throw 'SERVICE_FAILSAFE_REGISTRY_INVALID'
  }
  try {
    $registry = Get-Content -LiteralPath $registryPath -Raw | ConvertFrom-Json -ErrorAction Stop
  } catch {
    throw 'SERVICE_FAILSAFE_REGISTRY_INVALID'
  }
  $service = @($registry.services | Where-Object { $_.id -ceq $ServiceId })
  if ($service.Count -ne 1) {
    throw 'SERVICE_FAILSAFE_SERVICE_INVALID'
  }

  $isPreservedIdentity = ($service[0].id -ceq 'identity-profile-service') -and ($service[0].preserved -eq $true) -and ($service[0].variant -ceq 'relational')
  $isGeneratedGateway = ($service[0].preserved -eq $false) -and ($service[0].variant -ceq 'gateway')
  $isGeneratedRelational = ($service[0].preserved -eq $false) -and ($service[0].variant -ceq 'relational')
  $expectedClass = if ($isPreservedIdentity) {
    'IdentityProfileServiceApplicationTestcontainersIT'
  } elseif ($isGeneratedGateway) {
    'GatewayNoDatastoreIT'
  } elseif ($isGeneratedRelational) {
    'RelationalBoundaryTestcontainersIT'
  } else {
    throw 'SERVICE_FAILSAFE_SERVICE_INVALID'
  }
  $reportsPath = [System.IO.Path]::GetFullPath($ReportDirectory)
  if (-not (Test-Path -LiteralPath $reportsPath -PathType Container)) {
    throw 'SERVICE_FAILSAFE_REPORTS_MISSING'
  }
  $reportsItem = Get-Item -LiteralPath $reportsPath -Force
  if (($reportsItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw 'SERVICE_FAILSAFE_PATH_UNSAFE'
  }

  $matchingReports = @()
  foreach ($report in @(Get-ChildItem -LiteralPath $reportsPath -File -Filter 'TEST-*.xml')) {
    if (($report.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
      throw 'SERVICE_FAILSAFE_PATH_UNSAFE'
    }
    $settings = [System.Xml.XmlReaderSettings]::new()
    $settings.DtdProcessing = [System.Xml.DtdProcessing]::Prohibit
    $settings.XmlResolver = $null
    $reader = $null
    try {
      $reader = [System.Xml.XmlReader]::Create($report.FullName, $settings)
      $document = [System.Xml.XmlDocument]::new()
      $document.XmlResolver = $null
      $document.Load($reader)
    } catch {
      throw 'SERVICE_FAILSAFE_REPORT_INVALID'
    } finally {
      if ($null -ne $reader) { $reader.Dispose() }
    }

    $suite = $document.DocumentElement
    if ($null -eq $suite -or $suite.LocalName -cne 'testsuite') {
      throw 'SERVICE_FAILSAFE_REPORT_INVALID'
    }
    $suiteName = $suite.GetAttribute('name')
    if ($suiteName -ceq ($service[0].packageName + '.' + $expectedClass)) {
      $matchingReports += [pscustomobject]@{
        Tests = $suite.GetAttribute('tests')
        Failures = $suite.GetAttribute('failures')
        Errors = $suite.GetAttribute('errors')
        Skipped = $suite.GetAttribute('skipped')
      }
    }
  }

  if ($matchingReports.Count -ne 1) { throw 'SERVICE_FAILSAFE_REQUIRED_IT_MISSING' }
  $counts = @{}
  foreach ($name in @('Tests', 'Failures', 'Errors', 'Skipped')) {
    $number = 0
    if (-not [int]::TryParse($matchingReports[0].$name, [ref] $number)) {
      throw 'SERVICE_FAILSAFE_REPORT_INVALID'
    }
    $counts[$name] = $number
  }
  if ($counts.Tests -lt 1) { throw 'SERVICE_FAILSAFE_REQUIRED_IT_NOT_EXECUTED' }
  if ($counts.Failures -ne 0 -or $counts.Errors -ne 0 -or $counts.Skipped -ne 0) {
    throw 'SERVICE_FAILSAFE_REQUIRED_IT_FAILED_OR_SKIPPED'
  }

  return [pscustomobject]@{ ServiceId = $ServiceId; TestClass = $expectedClass; Tests = $counts.Tests }
}

Export-ModuleMember -Function Test-ServiceFailsafeExecution
