param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"
node "$RepoRoot\backend\scripts\superadmin_menu_turkce_hotfix_check.js" "$RepoRoot"
