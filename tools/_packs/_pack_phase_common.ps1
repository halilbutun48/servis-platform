param()
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\_console_status.ps1')
. (Join-Path $PSScriptRoot '..\_manifest_pack_helpers.ps1')

function Invoke-ManifestToolScript {
  param(
    [Parameter(Mandatory=$true)][string]$ScriptPath,
    [Parameter()]$Args
  )

  $argList = @($Args)
  $named = @{}
  $positional = @()

  for ($i = 0; $i -lt $argList.Count; $i++) {
    $item = $argList[$i]
    if ($item -is [string] -and $item.StartsWith('-')) {
      $key = $item.TrimStart('-')
      $hasValue = ($i + 1) -lt $argList.Count -and -not (($argList[$i + 1] -is [string]) -and $argList[$i + 1].StartsWith('-'))
      if ($hasValue) {
        $named[$key] = $argList[$i + 1]
        $i++
      } else {
        $named[$key] = $true
      }
    } else {
      $positional += $item
    }
  }

  if ($named.Count -gt 0 -and $positional.Count -gt 0) {
    & $ScriptPath @named @positional
  } elseif ($named.Count -gt 0) {
    & $ScriptPath @named
  } elseif ($positional.Count -gt 0) {
    & $ScriptPath @positional
  } else {
    & $ScriptPath
  }
}

function Invoke-PhaseManifestRange {
  param(
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter(Mandatory=$false)]$ComposeDir,
    [Parameter(Mandatory=$true)][string]$ManifestPath,
    [Parameter(Mandatory=$true)][int]$FromExclusive,
    [Parameter(Mandatory=$true)][int]$ToInclusive,
    [Parameter()][switch]$NoBuild
  )

  $steps = Get-PackManifestStages -ManifestPath $ManifestPath -RepoRoot $RepoRoot -ComposeDir ([string](Normalize-ComposeDirValue $ComposeDir)) -NoBuild:$NoBuild
  if (@($steps).Count -eq 0) {
    throw 'Manifest pack stages missing or empty.'
  }

  $selected = @($steps | Where-Object { $_.Group -gt $FromExclusive -and $_.Group -le $ToInclusive })
  if (@($selected).Count -eq 0) {
    Write-StatusLine ("INFO No manifest stages in requested range >M{0} <=M{1}." -f $FromExclusive, $ToInclusive)
    return
  }

  foreach ($step in $selected) {
    Write-Host ''
    Write-StatusLine ("=== RUNNING: {0} ===" -f $step.Name)
    $scriptPath = Join-Path $RepoRoot $step.Script
    if (-not (Test-Path $scriptPath)) {
      throw ("Missing tool script: {0}" -f $step.Script)
    }
    Invoke-ManifestToolScript -ScriptPath $scriptPath -Args $step.Args
    if (-not $?) {
      throw ("Tool script failed: {0}" -f $step.Script)
    }
  }
}
