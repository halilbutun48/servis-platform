param(
  [string]$RepoRoot = (Resolve-Path ".").Path
)
$ErrorActionPreference = "Stop"
Write-Host "=== M68 FETCH HARDENING PACK ==="
Push-Location $RepoRoot
try {
  Write-Host "=== M68 Runtime/Static Check ==="
  node .\backend\scripts\m68_fetch_hardening_check.js
  if ($LASTEXITCODE -ne 0) { throw "m68_fetch_hardening_check failed" }
  Write-Host "=== M68 Repo Contract ==="
  .\tools\check_m68_fetch_hardening_repo_contract.ps1 -RepoRoot $RepoRoot
  if ($LASTEXITCODE -ne 0) { throw "repo contract failed" }
  Write-Host "=== M68 FETCH HARDENING PACK PASS OK ==="
}
finally {
  Pop-Location
}
