# tools/pack.ps1
param(
  [Parameter(Mandatory=$false)]
  [ValidateRange(0,34)]
  [int]$To = 21,

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

Write-Host ""
Write-Host ("=== PERSONEL-SERVIS V1 — PACK (M0→M{0}) ===" -f $To) -ForegroundColor Cyan
Write-Host ("Target stage: M{0}" -f $To)
Write-Host ""

$repo = Resolve-Path $RepoDir
$compose = Join-Path $repo $ComposeDir
$gate = Join-Path $repo "tools/gate.ps1"

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
Write-Host "=== PACK PASS ✅ ===" -ForegroundColor Green
Write-Host ""
