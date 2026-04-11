# COMPATIBILITY_ALIAS: true
# CANONICAL_TARGET: tools/checks/living/hotfixes/check_m71_room_title_hotfix_repo_contract.ps1
# PURPOSE: Backward-compatible root entry. Canonical implementation lives under tools/checks/living/hotfixes.
param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot '_repo_contract_common.ps1')
& (Join-Path $PSScriptRoot 'checks\living\hotfixes\check_m71_room_title_hotfix_repo_contract.ps1') -RepoRoot $RepoRoot