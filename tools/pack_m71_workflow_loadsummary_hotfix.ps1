param(
  [string]$RepoRoot = "D:\servis-platform"
)
$ErrorActionPreference = "Stop"
Write-Host "=== M71 WORKFLOW LOADSUMMARY HOTFIX PACK ==="
& (Join-Path $PSScriptRoot "check_m71_workflow_loadsummary_hotfix_repo_contract.ps1") -RepoRoot $RepoRoot
Write-Host "=== M71 WORKFLOW LOADSUMMARY HOTFIX PACK PASS OK ==="
