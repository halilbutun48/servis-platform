param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'checks\living\hotfixes\check_m71_room_title_hotfix_repo_contract.ps1') -RepoRoot $RepoRoot
