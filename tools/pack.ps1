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

function Invoke-ToolScript {
  param(
    [string]$ScriptRel,
    [object[]]$Arguments = @()
  )

  $scriptPath = Join-Path $repo $ScriptRel
  if (-not (Test-Path $scriptPath)) {
    throw "Missing tool script: $ScriptRel"
  }

  & $scriptPath @Arguments
  if (-not $?) {
    throw "Tool script failed: $ScriptRel"
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
Write-StatusLine ("INFO Gate max: M{0}" -f $gateMax)
Write-StatusLine ("INFO Pack max: M{0}" -f $packMax)
Write-Host ""

if ($To -lt 0) { throw "Invalid -To value." }

if (-not $SkipStaticRepoChecks) {
  Run-StaticRepoChecks
}

if ($To -le $gateMax) {
  Write-Host ""
  Write-StatusLine ("=== RANGE: M0 -> M{0} (gate) ===" -f $To)
  Invoke-ToolScript -ScriptRel "tools\gate.ps1" -Arguments (@("-To", $To, "-ComposeDir", $ComposeDir, "-RepoDir", $RepoDir, "-ApiService", $ApiService) + @($(if ($NoBuild) { "-NoBuild" })))
} else {
  Write-Host ""
  Write-StatusLine ("=== RANGE: M0 -> M{0} (gate) ===" -f $gateMax)
  Invoke-ToolScript -ScriptRel "tools\gate.ps1" -Arguments (@("-To", $gateMax, "-ComposeDir", $ComposeDir, "-RepoDir", $RepoDir, "-ApiService", $ApiService) + @($(if ($NoBuild) { "-NoBuild" })))

  $manifestPath = Join-Path $toolsDir "milestone_pack_manifest.json"
  $steps = Get-PackManifestStages -ManifestPath $manifestPath -RepoRoot $repo -ComposeDir $ComposeDir -NoBuild:$NoBuild

  if (@($steps).Count -eq 0) {
    throw "Manifest pack stages missing or empty: tools\milestone_pack_manifest.json"
  }

  foreach ($step in $steps) {
    if ($step.Group -gt $To) { continue }

    Write-Host ""
    Write-StatusLine ("=== RUNNING: {0} ===" -f $step.Name)
    Invoke-ToolScript -ScriptRel $step.Script -Arguments $step.Args
  }
}

if (-not $SkipRepoAudit) {
  Run-RepoAudit
}

Write-Host ""
Write-StatusLine ("=== MASTER PACK PASS OK (M0->M{0}) ===" -f $To)
Write-Host ""
