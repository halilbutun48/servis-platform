param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot '..\..\check_repo_cleanup_m104.ps1') -RepoRoot $RepoRoot
& (Join-Path $PSScriptRoot '..\..\check_tools_hygiene_m105.ps1') -RepoRoot $RepoRoot
& (Join-Path $PSScriptRoot '..\..\check_repo_hygiene_m106.ps1') -RepoRoot $RepoRoot
