# tools/pack.ps1
param(
  [Parameter(Mandatory=$false)]
  [ValidateRange(0,199)]
  [int]$To = 0,

  [Parameter(Mandatory=$false)]
  [string]$ComposeDir = "infra",

  [Parameter(Mandatory=$false)]
  [string]$RepoDir = ".",

  [Parameter(Mandatory=$false)]
  [string]$ApiService = "api",

  [Parameter(Mandatory=$false)]
  [switch]$NoBuild,

  [Parameter(Mandatory=$false)]
  [switch]$SkipStaticRepoChecks,

  [Parameter(Mandatory=$false)]
  [switch]$SkipRepoAudit
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_console_status.ps1")
. (Join-Path $PSScriptRoot "_manifest_pack_helpers.ps1")

$repo = (Resolve-Path $RepoDir).Path
$toolsDir = Join-Path $repo "tools"
$scriptsDir = Join-Path $repo "backend\scripts"

function Get-MaxGateMilestone {
  param([string]$ScriptsDir)
  if (-not (Test-Path $ScriptsDir)) { return 41 }

  $max = -1
  for ($i = 0; $i -lt 300; $i++) {
    $p = Join-Path $ScriptsDir ("m{0}check.js" -f $i)
    if (Test-Path $p) { $max = $i } else { break }
  }

  if ($max -lt 0) { return 41 }
  return $max
}

function Get-MaxPackMilestone {
  param([string]$ToolsDir, [int]$GateMax)

  $max = $GateMax
  if (-not (Test-Path $ToolsDir)) { return $max }

  Get-ChildItem -Path $ToolsDir -Filter "pack_m*.ps1" -File | ForEach-Object {
    if ($_.BaseName -match '^pack_m(\d+)') {
      $n = [int]$matches[1]
      if ($n -gt $max) { $max = $n }
    }
  }

  return $max
}

function Invoke-PhaseScript {
  param(
    [Parameter(Mandatory=$true)][string]$ScriptRel,
    [Parameter(Mandatory=$false)][object[]]$Arguments = @()
  )

  $scriptPath = Join-Path $repo $ScriptRel
  if (-not (Test-Path $scriptPath)) {
    throw "Missing phase script: $ScriptRel"
  }

  $namedArgs = @{}
  $positionalArgs = @()
  for ($i = 0; $i -lt $Arguments.Count; $i++) {
    $arg = $Arguments[$i]
    if (($arg -is [string]) -and $arg.StartsWith('-')) {
      $name = $arg.TrimStart('-')
      $hasValue = ($i + 1 -lt $Arguments.Count) -and -not (($Arguments[$i + 1] -is [string]) -and $Arguments[$i + 1].StartsWith('-'))
      if ($hasValue) {
        $namedArgs[$name] = $Arguments[$i + 1]
        $i++
      }
      else {
        $namedArgs[$name] = $true
      }
    }
    else {
      $positionalArgs += $arg
    }
  }

  if ($namedArgs.Count -gt 0 -and $positionalArgs.Count -gt 0) {
    & $scriptPath @namedArgs @positionalArgs
  }
  elseif ($namedArgs.Count -gt 0) {
    & $scriptPath @namedArgs
  }
  else {
    & $scriptPath @positionalArgs
  }

  if (-not $?) {
    throw ("Phase script failed: {0}" -f $ScriptRel)
  }
}

function Run-StaticRepoChecks {
  Write-Host ""
  Write-StatusLine "=== STATIC REPO CHECKS ==="

  $checks = @(
    "tools\check_repo_cleanup_m104.ps1",
    "tools\check_tools_hygiene_m105.ps1",
    "tools\check_repo_hygiene_m106.ps1"
  )

  foreach ($checkRel in $checks) {
    $checkPath = Join-Path $repo $checkRel
    if (-not (Test-Path $checkPath)) {
      Write-StatusLine ("WARN skipped missing static check: {0}" -f $checkRel)
      continue
    }

    Write-Host ""
    Write-StatusLine ("--- {0} ---" -f (Split-Path $checkRel -Leaf))
    & $checkPath -RepoRoot $repo
    if (-not $?) { throw ("Static repo check failed: {0}" -f $checkRel) }
  }
}

function Run-RepoAudit {
  $auditScript = Join-Path $repo "tools\check_repo_audit_master.ps1"
  if (-not (Test-Path $auditScript)) {
    Write-StatusLine "WARN repo audit script missing; skipped."
    return
  }

  Write-Host ""
  Write-StatusLine "=== REPO AUDIT ==="
  & $auditScript -RepoRoot $repo
  if (-not $?) { throw "Repo audit script failed." }
}

$gateMax = Get-MaxGateMilestone -ScriptsDir $scriptsDir
$packMax = Get-MaxPackMilestone -ToolsDir $toolsDir -GateMax $gateMax

if ($To -le 0) {
  $To = $packMax
  Write-StatusLine ("INFO Auto -To: M{0}" -f $To)
}

Write-Host ""
Write-StatusLine ("=== PERSONEL-SERVIS V1 - MASTER PACK (M0->M{0}) ===" -f $To)
Write-StatusLine ("INFO Visible phases: M0->M41 | M42->M58 | M59->M66 | M67->M75 | M76A-1 | M76B | M76A-2 | M77 | M78 | M79 | M80 | M81 | M82.1 | M82.8 | M82.9->M82.11 | M83 | M84 | M85 | M86 | M87 | M88 | M89")
Write-StatusLine ("INFO Gate max: M{0}" -f $gateMax)
Write-StatusLine ("INFO Pack max: M{0}" -f $packMax)
Write-Host ""

if (-not $SkipStaticRepoChecks) {
  Run-StaticRepoChecks
}

$phaseArgsCommon = @('-RepoRoot', $repo, '-ComposeDir', $ComposeDir, '-ApiService', $ApiService) + @($(if ($NoBuild) { '-NoBuild' }))

if ($To -ge 0) {
  $phaseTo = [Math]::Min($To, 41)
  Write-Host ""
  Write-StatusLine ("=== PHASE 1: M0 -> M{0} ===" -f $phaseTo)
  Invoke-PhaseScript -ScriptRel "tools\packs\living\pack_phase_m0_m41.ps1" -Arguments (@('-To', $phaseTo) + $phaseArgsCommon)
}

if ($To -gt 41) {
  $phaseTo = [Math]::Min($To, 58)
  Write-Host ""
  Write-StatusLine ("=== PHASE 2: M42 -> M{0} ===" -f $phaseTo)
  Invoke-PhaseScript -ScriptRel "tools\packs\living\pack_phase_m42_m58.ps1" -Arguments (@('-To', $phaseTo) + $phaseArgsCommon)
}

if ($To -gt 58) {
  $phaseTo = [Math]::Min($To, 66)
  Write-Host ""
  Write-StatusLine ("=== PHASE 3: M59 -> M{0} ===" -f $phaseTo)
  Invoke-PhaseScript -ScriptRel "tools\packs\living\pack_phase_m59_m66.ps1" -Arguments (@('-To', $phaseTo) + $phaseArgsCommon)
}

if ($To -gt 66) {
  $phaseTo = [Math]::Min($To, 75)
  Write-Host ""
  Write-StatusLine ("=== PHASE 4: M67 -> M{0} ===" -f $phaseTo)
  Invoke-PhaseScript -ScriptRel "tools\_packs\pack_m67_m75.ps1" -Arguments (@('-To', $phaseTo) + $phaseArgsCommon)
}

if ($To -gt 75) {
  $phaseTo = [Math]::Min($To, 81)
  Write-Host ""
  Write-StatusLine ("=== PHASE 5: M76 -> M{0} ===" -f $phaseTo)
  Invoke-PhaseScript -ScriptRel "tools\_packs\pack_m76_m81.ps1" -Arguments (@('-To', $phaseTo) + $phaseArgsCommon)
}

if ($To -gt 81) {
  $phaseTo = [Math]::Min($To, 82)
  Write-Host ""
  Write-StatusLine ("=== PHASE 6: M82 -> M{0} ===" -f $phaseTo)
  Invoke-PhaseScript -ScriptRel "tools\_packs\pack_m82.ps1" -Arguments (@('-To', $phaseTo) + $phaseArgsCommon)
}


if (-not $SkipRepoAudit) {
  Run-RepoAudit
}

Write-Host ""
Write-StatusLine ("=== MASTER PACK PASS OK (M0->M{0}) ===" -f $To)
Write-Host ""


