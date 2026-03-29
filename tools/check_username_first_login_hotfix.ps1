param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = "Stop"
Write-Host "=== USERNAME-FIRST LOGIN HOTFIX CHECK ==="
Push-Location $RepoRoot
try {
  node .\backend\scripts\username_first_login_hotfix_check.js
  if ($LASTEXITCODE -ne 0) { throw "username_first_login_hotfix_check failed" }
  Write-Host "=== USERNAME-FIRST LOGIN HOTFIX CHECK PASS ==="
} finally {
  Pop-Location
}
