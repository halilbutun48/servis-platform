param(
  [string]$RepoRoot = (Resolve-Path ".").Path
)
$ErrorActionPreference = "Stop"
Write-Host "=== M69 FETCH HARDENING PHASE-2 PACK ==="
Push-Location $RepoRoot
try {
  Write-Host "=== M69 Runtime/Static Check ==="
  node .\backend\scripts\m69_fetch_hardening_phase2_check.js
  if ($LASTEXITCODE -ne 0) { throw "m69_fetch_hardening_phase2_check failed" }
  Write-Host "=== M69 Repo Contract ==="
  .\tools\check_m69_fetch_hardening_phase2_repo_contract.ps1 -RepoRoot $RepoRoot
  if ($LASTEXITCODE -ne 0) { throw "repo contract failed" }
  Write-Host "=== M69 FETCH HARDENING PHASE-2 PACK PASS OK ==="
}
finally {
  Pop-Location
}
