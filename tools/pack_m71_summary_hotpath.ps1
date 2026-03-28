param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$ComposeDir = (Join-Path $RepoRoot "infra")
)

$ErrorActionPreference = "Stop"
Write-Host "=== M71 SUMMARY + HOT PATH PACK ==="
Write-Host "=== M71 Runtime/Static Check ==="
node (Join-Path $RepoRoot "backend\scripts\m71_summary_hotpath_check.js")
if ($LASTEXITCODE -ne 0) { throw 'm71 summary hotpath check failed' }
Write-Host "=== M71 Repo Contract ==="
& (Join-Path $RepoRoot "tools\check_m71_summary_hotpath_repo_contract.ps1") -RepoRoot $RepoRoot
if (-not $?) { throw 'm71 repo contract failed' }
Write-Host "=== M71 SUMMARY + HOT PATH PACK PASS OK ==="
