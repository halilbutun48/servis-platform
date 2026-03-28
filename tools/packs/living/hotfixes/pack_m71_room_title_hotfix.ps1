param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path)
$ErrorActionPreference = 'Stop'
Write-Host '=== M71 ROOM TITLE HOTFIX PACK ==='
& (Join-Path $PSScriptRoot '..\..\..\checks\living\hotfixes\check_m71_room_title_hotfix_repo_contract.ps1') -RepoRoot $RepoRoot
Write-Host '=== M71 ROOM TITLE HOTFIX PACK PASS OK ==='
