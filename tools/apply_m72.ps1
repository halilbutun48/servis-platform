param(
  [Parameter(Mandatory=$false)]
  [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
  param([string]$Hint)

  if ($Hint -and (Test-Path (Join-Path $Hint 'backend'))) {
    return (Resolve-Path $Hint).Path
  }

  $here = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  if (Test-Path (Join-Path $here 'backend')) { return $here }
  if (Test-Path (Join-Path $here 'servis-platform/backend')) { return (Resolve-Path (Join-Path $here 'servis-platform')).Path }

  throw "Repo root not found. Run from repo root (where backend/ exists) or pass -RepoRoot."
}

$root = Resolve-RepoRoot $RepoRoot
$payload = (Resolve-Path (Join-Path $PSScriptRoot '..\overlay_m72')).Path

Write-Host "[M72] RepoRoot: $root" -ForegroundColor Cyan

# Copy files (overwrite)
$copyMap = @(
  @{ src = 'backend/src/routes/driver.js'; dst = 'backend/src/routes/driver.js' },
  @{ src = 'backend/src/routes/gps.js';    dst = 'backend/src/routes/gps.js' },
  @{ src = 'web/src/panels/driver/RoutePanel.jsx'; dst = 'web/src/panels/driver/RoutePanel.jsx' },
  @{ src = 'web/src/panels/driver/TodayPanel.jsx'; dst = 'web/src/panels/driver/TodayPanel.jsx' },
  @{ src = 'web/src/utils/offlineQueue.js'; dst = 'web/src/utils/offlineQueue.js' }
)

foreach ($m in $copyMap) {
  $from = Join-Path $payload $m.src
  $to = Join-Path $root $m.dst
  $toDir = Split-Path $to -Parent
  if (-not (Test-Path $toDir)) { New-Item -ItemType Directory -Force -Path $toDir | Out-Null }
  Copy-Item -Force $from $to
  Write-Host "[M72] Copied $($m.dst)" -ForegroundColor DarkGreen
}

# Patch prisma schema: ShiftProgress.startedAt + pausedAt
$schemaPath = Join-Path $root 'backend/prisma/schema.prisma'
if (-not (Test-Path $schemaPath)) { throw "schema.prisma not found: $schemaPath" }

$lines = Get-Content $schemaPath
$out = New-Object System.Collections.Generic.List[string]
$in = $false
$hasStarted = $false
$hasPaused = $false

foreach ($ln in $lines) {
  if ($ln -match '^model\s+ShiftProgress\s*\{') { $in = $true }
  if ($in) {
    if ($ln -match '\bstartedAt\b') { $hasStarted = $true }
    if ($ln -match '\bpausedAt\b') { $hasPaused = $true }
  }
  $out.Add($ln)

  if ($in -and ($ln -match '\blastReachedOrder\b') -and (-not $hasStarted -or -not $hasPaused)) {
    if (-not $hasStarted) { $out.Add('  startedAt        DateTime?') ; $hasStarted = $true }
    if (-not $hasPaused)  { $out.Add('  pausedAt         DateTime?') ; $hasPaused  = $true }
  }

  if ($in -and ($ln -match '^\}')) { $in = $false }
}

Set-Content -Path $schemaPath -Value $out -Encoding utf8
Write-Host "[M72] Patched prisma schema (ShiftProgress startedAt/pausedAt)" -ForegroundColor DarkGreen

Write-Host "[M72] Done. Restart api container so prisma db push applies." -ForegroundColor Cyan
