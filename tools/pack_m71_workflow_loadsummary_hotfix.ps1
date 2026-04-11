# compatibility_alias: true
# canonical_target: tools/packs/living/hotfixes/pack_m71_workflow_loadsummary_hotfix.ps1
param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'packs\living\hotfixes\pack_m71_workflow_loadsummary_hotfix.ps1') -RepoRoot $RepoRoot
