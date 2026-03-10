# tools/pack.ps1
param(
  [Parameter(Mandatory=$false)]
  [ValidateRange(0,99)]
  [int]$To = 0,

  [Parameter(Mandatory=$false)]
  [string]$ComposeDir = "infra",

  [Parameter(Mandatory=$false)]
  [string]$RepoDir = ".",

  [Parameter(Mandatory=$false)]
  [string]$ApiService = "api",
  [Parameter(Mandatory=$false)]
  [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

$repo = Resolve-Path $RepoDir
$compose = Join-Path $repo $ComposeDir
$gate = Join-Path $repo "tools/gate.ps1"
$scriptsDir = Join-Path $repo "backend\scripts"

# Auto -To (0 = auto max)
function Get-MaxMilestone {
  param([string]$ScriptsDir)

  if (-not (Test-Path $ScriptsDir)) { return 36 }

  $max = -1
  for ($i = 0; $i -lt 300; $i++) {
    $p = Join-Path $ScriptsDir ("m{0}check.js" -f $i)
    if (Test-Path $p) { $max = $i } else { break }
  }

  if ($max -lt 0) { return 36 }
  return $max
}

if ($To -le 0) {
  $To = Get-MaxMilestone -ScriptsDir $scriptsDir
  Write-Host ("INFO Auto -To: M{0}" -f $To) -ForegroundColor Cyan
}

Write-Host ""
Write-Host ("=== PERSONEL-SERVIS V1 — PACK (M0→M{0}) ===" -f $To) -ForegroundColor Cyan
Write-Host ("Target stage: M{0}" -f $To)
Write-Host ""

if (-not (Test-Path $gate)) { throw "gate.ps1 not found: $gate" }
if (-not (Test-Path $compose)) { throw "compose dir not found: $compose" }

Write-Host "=== Install (backend) ===" -ForegroundColor Cyan
Write-Host "SKIP (Docker mode) — host node_modules gerekmiyor."
Write-Host ""

Write-Host "=== Install (web) ===" -ForegroundColor Cyan
Write-Host "SKIP (Docker mode) — host node_modules gerekmiyor."
Write-Host ""

Write-Host "=== Gate ===" -ForegroundColor Cyan
& $gate -To $To -ComposeDir $ComposeDir -RepoDir $RepoDir -ApiService $ApiService -NoBuild:$NoBuild

Write-Host ""
Write-Host "=== PACK PASS OK ===" -ForegroundColor Green
Write-Host ""

