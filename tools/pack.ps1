# tools/pack.ps1
param(
  [ValidateRange(0,12)]
  [int]$To = 12,

  # Docker workflow varsayılan: host node_modules gerekmiyor
  [bool]$DockerOnly = $true,

  [string]$RepoDir,
  [string]$ComposeDir,
  [string]$ApiService = "api"
)

$ErrorActionPreference = "Stop"

if (-not $RepoDir) {
  $RepoDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}
if (-not $ComposeDir) {
  $ComposeDir = Join-Path $RepoDir "infra"
}

$targetStage = "M$To"

Write-Host "`n=== PERSONEL-SERVIS V1 — PACK (M0→M12) ==="
Write-Host "Target stage: $targetStage"

Write-Host "`n=== Install (backend) ==="
if ($DockerOnly) {
  Write-Host "SKIP (Docker mode) — host node_modules gerekmiyor."
} else {
  Push-Location (Join-Path $RepoDir "backend")
  try { npm ci } finally { Pop-Location }
}

Write-Host "`n=== Install (web) ==="
if ($DockerOnly) {
  Write-Host "SKIP (Docker mode) — host node_modules gerekmiyor."
} else {
  Push-Location (Join-Path $RepoDir "web")
  try { npm ci } finally { Pop-Location }
}

Write-Host "`n=== Gate ==="
$gate = Join-Path $PSScriptRoot "gate.ps1"

& $gate -To $To -ComposeDir $ComposeDir -RepoDir $RepoDir -ApiService $ApiService
if ($LASTEXITCODE -ne 0) { throw "GATE FAIL (exit=$LASTEXITCODE)" }

Write-Host "`n=== DONE ==="
Write-Host "✅ PACK PASS (Docker-only: Gate already ran FULLCHECK + SMOKE)"
exit 0
