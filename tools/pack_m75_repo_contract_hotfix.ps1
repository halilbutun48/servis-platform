param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"
Write-Host "=== M75 REPO CONTRACT HOTFIX PACK ==="
& "$RepoRoot\tools\check_m75_hot_path_phase4_repo_contract.ps1" -RepoRoot $RepoRoot
Write-Host "=== M75 REPO CONTRACT HOTFIX PACK PASS OK ==="
