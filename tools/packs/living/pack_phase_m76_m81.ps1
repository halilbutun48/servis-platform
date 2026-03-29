param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path, [string]$ComposeDir = 'infra', [switch]$NoBuild, [int]$To = 78)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot '..\..\_packs\pack_m76_m81.ps1') -RepoRoot $RepoRoot -ComposeDir $ComposeDir -NoBuild:$NoBuild -To $To
