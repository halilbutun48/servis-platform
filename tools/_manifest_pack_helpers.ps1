param()
$ErrorActionPreference = 'Stop'


function Normalize-ComposeDirValue {
  param([Parameter()][object]$Value)

  if ($null -eq $Value) { return 'infra' }
  if ($Value -is [string]) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return 'infra' }
    return $Value
  }
  if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
    foreach ($item in $Value) {
      $norm = Normalize-ComposeDirValue -Value $item
      if (-not [string]::IsNullOrWhiteSpace($norm)) { return $norm }
    }
    return 'infra'
  }
  $s = [string]$Value
  if ([string]::IsNullOrWhiteSpace($s)) { return 'infra' }
  return $s
}


function Get-PackManifestStages {
  param(
    [Parameter(Mandatory=$true)][string]$ManifestPath,
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter()]$ComposeDir,
    [Parameter()][switch]$NoBuild
  )

  if (-not (Test-Path $ManifestPath)) { return @() }

  $raw = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($raw)) { return @() }

  $manifest = $raw | ConvertFrom-Json
  if ($null -eq $manifest -or $null -eq $manifest.stages) { return @() }

  $steps = @()
  foreach ($stage in $manifest.stages) {
    if ($null -eq $stage) { continue }
    if ($stage.kind -ne 'pack') { continue }

    $args = @()
    if ($stage.repoParam -eq 'RepoRoot') {
      $args += @('-RepoRoot', $RepoRoot)
    } elseif ($stage.repoParam -eq 'RepoDir') {
      $args += @('-RepoDir', $RepoRoot)
    }

    if ($stage.composeParam -eq 'ComposeDir') {
      $args += @('-ComposeDir', ([string](Normalize-ComposeDirValue -Value $ComposeDir)))
    }

    if ($NoBuild -and $stage.supportsNoBuild) {
      $args += '-NoBuild'
    }

    $steps += [pscustomobject]@{
      Group = [int]$stage.group
      Name = [string]$stage.id
      Script = [string]$stage.script
      Args = @($args)
    }
  }

  return @($steps)
}
