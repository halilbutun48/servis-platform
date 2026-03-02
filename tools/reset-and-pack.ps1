param(
  # If not provided (or 0), auto-detect the highest contiguous m{N}check.js starting from m0check.js.
  [int]$To = 0,
  [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

# Repo root = parent of /tools
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$composeFile = Join-Path $repoRoot "infra\docker-compose.yml"
$composeBase = @("compose", "-f", $composeFile, "--profile", "osrm")

function Get-MaxMilestone {
  param([string]$ScriptsDir)

  if (-not (Test-Path $ScriptsDir)) { return 35 }

  $max = -1
  for ($i = 0; $i -lt 300; $i++) {
    $p = Join-Path $ScriptsDir ("m{0}check.js" -f $i)
    if (Test-Path $p) { $max = $i } else { break }
  }

  if ($max -lt 0) { return 35 }
  return $max
}

if ($To -le 0) {
  $scriptsDir = Join-Path $repoRoot "backend\scripts"
  $To = Get-MaxMilestone -ScriptsDir $scriptsDir
  Write-Host "ℹ️ Auto-detected max milestone: M$To" -ForegroundColor Cyan
}

Write-Host "`n=== RESET: docker compose down -v (with osrm profile) ==="
docker @composeBase down -v --remove-orphans

Write-Host "`n=== UP: docker compose up -d" -NoNewline
if (-not $NoBuild) { Write-Host " --build" } else { Write-Host "" }

if (-not $NoBuild) {
  docker @composeBase up -d --build
} else {
  docker @composeBase up -d
}

Write-Host "`n=== PACK: tools/pack.ps1 -To $To ==="
& (Join-Path $repoRoot "tools\pack.ps1") -To $To

Write-Host "`n✅ reset-and-pack done."
