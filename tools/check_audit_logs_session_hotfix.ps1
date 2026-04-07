param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")Write-Host "=== AUDIT LOGS SESSION HOTFIX CHECK ==="
Push-Location $RepoRoot
try {
  node .\backend\scripts\audit_logs_session_hotfix_check.mjs
  if ($LASTEXITCODE -ne 0) { throw "audit_logs_session_hotfix_check failed" }
  Write-Host "=== AUDIT LOGS SESSION HOTFIX CHECK PASS ==="
} finally {
  Pop-Location
}
