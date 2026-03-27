param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot '..\..\pack_m76b_living_matrix_tools_consolidation.ps1') -RepoRoot $RepoRoot
