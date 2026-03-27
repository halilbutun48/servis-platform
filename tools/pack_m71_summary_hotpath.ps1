param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
Write-Host "=== M71 SUMMARY + HOT PATH PACK ==="
Write-Host "=== M71 Runtime/Static Check ==="
node (Join-Path $RepoRoot "backend\scripts\m71_summary_hotpath_check.js")
Write-Host "=== M71 Repo Contract ==="
& (Join-Path $RepoRoot "tools\check_m71_summary_hotpath_repo_contract.ps1") -RepoRoot $RepoRoot
Write-Host "=== M71 SUMMARY + HOT PATH PACK PASS OK ==="
