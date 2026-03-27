param(
  [string]$RepoRoot = (Resolve-Path ".").Path
)
$ErrorActionPreference = "Stop"
Write-Host "=== M70 CHECKER SYNC + HOT PATH PACK ==="
Push-Location $RepoRoot
try {
  Write-Host "=== M70 Runtime/Static Check ==="
  node .\backend\scripts\m70_checker_sync_hot_path_check.js
  if ($LASTEXITCODE -ne 0) { throw "m70_checker_sync_hot_path_check failed" }
  Write-Host "=== M70 Repo Contract ==="
  .\tools\check_m70_checker_sync_hot_path_repo_contract.ps1 -RepoRoot $RepoRoot
  if ($LASTEXITCODE -ne 0) { throw "repo contract failed" }
  Write-Host "=== M70 CHECKER SYNC + HOT PATH PACK PASS OK ==="
  Write-Host "INFO Sonraki adim: guncellenmis M67 paketini tekrar kosup yeni tabloyu oku."
}
finally {
  Pop-Location
}
