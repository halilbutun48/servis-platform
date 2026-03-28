param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'packs\living\hotfixes\pack_m71_room_title_hotfix.ps1') -RepoRoot $RepoRoot
