param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")node "$RepoRoot\backend\scripts\superadmin_menu_turkce_hotfix_check.js" "$RepoRoot"
