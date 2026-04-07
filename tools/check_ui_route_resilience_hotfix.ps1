param([string]$RepoRoot = (Get-Location).Path)
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")Write-Host "=== UI ROUTE RESILIENCE HOTFIX CHECK ==="
node (Join-Path $RepoRoot "backend/scripts/ui_route_resilience_hotfix_check.js") $RepoRoot
if ($LASTEXITCODE -ne 0) { throw "ui_route_resilience_hotfix_check failed" }
Write-Host "=== UI ROUTE RESILIENCE HOTFIX CHECK PASS ==="
