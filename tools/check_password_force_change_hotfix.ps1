param(
  [string]$RepoRoot = (Get-Location).Path
)
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")Push-Location $RepoRoot
try {
  Write-Host "=== PASSWORD FORCE CHANGE HOTFIX CHECK ==="
  node .\backend\scripts\password_force_change_check.js
  if ($LASTEXITCODE -ne 0) { throw "password_force_change_check failed" }
  Write-Host "=== PASSWORD FORCE CHANGE HOTFIX CHECK PASS ==="
} finally {
  Pop-Location
}
