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

function Get-StableTo {
  param([string]$RepoRoot)

  # fallback: if empty, use current script's repo root
  if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    try { $RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..") } catch { $RepoRoot = "" }
  }

  if (-not [string]::IsNullOrWhiteSpace($RepoRoot)) {
    $p = Join-Path $RepoRoot "tools\STABLE_TO.txt"
    if (Test-Path $p) {
      try {
        $v = (Get-Content $p -Raw).Trim()
        if ($v -match '^\d+$') { return [int]$v }
      } catch {}
    }
  }

  if ($env:STABLE_TO -and $env:STABLE_TO -match '^\d+$') { return [int]$env:STABLE_TO }

  return 0
}

if ($To -le 0) {
  $scriptsDir = Join-Path $repoRoot "backend\scripts"
  $max = Get-MaxMilestone -ScriptsDir $scriptsDir
  $stable = Get-StableTo -RepoRoot $repoRoot
  if ($stable -gt 0) {
    $To = [Math]::Min($stable, $max)
    Write-Host "ℹ️ Stable cap: M$To (max found M$max)" -ForegroundColor Cyan
  } else {
    $To = $max
    Write-Host "ℹ️ Auto-detected max milestone: M$To" -ForegroundColor Cyan
  }
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
