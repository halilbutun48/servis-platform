[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('seferpakt-cont211', 'seferpakt_cont04')]
  [string]$Project,

  [Parameter(Mandatory = $true)]
  [string]$EvidencePath,

  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$resolvedEvidence = Resolve-Path (Join-Path $repoRoot $EvidencePath) -ErrorAction Stop
$evidenceFullPath = $resolvedEvidence.Path

if (-not $evidenceFullPath.StartsWith((Join-Path $repoRoot 'docs\evidence'), [StringComparison]::OrdinalIgnoreCase)) {
  throw 'EvidencePath must be inside docs/evidence.'
}

$evidence = Get-Content -LiteralPath $evidenceFullPath -Raw | ConvertFrom-Json
$manifestProjects = @($evidence.removalManifest.containers | Where-Object { $_.project -eq $Project })
if ($manifestProjects.Count -eq 0) {
  throw "Evidence does not authorize project '$Project'."
}

function Invoke-DockerText {
  param([string[]]$Arguments)
  $output = & docker @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Docker command failed: docker $($Arguments -join ' ')"
  }
  return @($output)
}

$containerIds = @(Invoke-DockerText @('ps', '-a', '--filter', "label=com.docker.compose.project=$Project", '--format', '{{.ID}}'))
$containers = @()
foreach ($containerId in $containerIds) {
  $containers += (Invoke-DockerText @('inspect', $containerId) | ConvertFrom-Json)
}

$running = @($containers | Where-Object { $_.State.Status -ne 'exited' })
if ($running.Count -gt 0) {
  throw "Refusing cleanup: project '$Project' has running or non-exited containers."
}

$manifestIds = @($manifestProjects.id)
$unexpected = @($containers | Where-Object { $manifestIds -notcontains $_.Id })
$containers = @($containers | Where-Object { $manifestIds -contains $_.Id })

Write-Output "Project: $Project"
Write-Output "Evidence: $evidenceFullPath"
Write-Output "Exited containers: $($containers.Count)"
if ($unexpected.Count -gt 0) {
  Write-Output "Uncovered exited containers retained: $($unexpected.Name -join ', ')"
}
Write-Output 'Volumes and images: retained by design.'

if (-not $Apply) {
  Write-Output 'Dry run only. Re-run with -Apply after reviewing the exact evidence manifest.'
  return
}

foreach ($container in $containers) {
  Invoke-DockerText @('rm', $container.Id) | Out-Host
}

$networkIds = @($evidence.removalManifest.networks.id)
foreach ($networkId in $networkIds) {
  $networkJson = @(& docker network inspect $networkId 2>$null)
  if ($LASTEXITCODE -ne 0 -or $networkJson.Count -eq 0) {
    continue
  }
  $network = $networkJson | ConvertFrom-Json
  $endpointCount = @($network.Containers.PSObject.Properties).Count
  if ($endpointCount -ne 0) {
    throw "Refusing network removal: '$networkId' still has endpoints."
  }
  Invoke-DockerText @('network', 'rm', $networkId) | Out-Host
}

Write-Output 'Cleanup completed. No volume, image, database, or build-cache deletion was performed.'
