param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"
Write-Host "=== M75 HOT PATH PHASE 4 PACK ==="
Write-Host "=== M75 Runtime/Static Check ==="
Push-Location $RepoRoot
try {
  node .\backend\scripts\m75_hot_path_phase4_check.js
if ($LASTEXITCODE -ne 0) { throw "m75_hot_path_phase4_check failed" }
  node .\backend\scripts\scale_readiness_check.js
} finally {
  Pop-Location
}
& "$PSScriptRoot\check_m75_hot_path_phase4_repo_contract.ps1" -RepoRoot $RepoRoot
Write-Host "=== M75 HOT PATH PHASE 4 PACK PASS OK ==="

