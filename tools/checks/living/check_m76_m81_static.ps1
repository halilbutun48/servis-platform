param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot '..\..\check_m76a_2_final_normalization_archiving_repo_contract.ps1') -RepoRoot $RepoRoot
