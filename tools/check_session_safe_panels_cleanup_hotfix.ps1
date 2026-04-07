param(
  [string]$RepoRoot = '.'
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")$root = (Resolve-Path $RepoRoot).Path
Write-Host '=== SESSION-SAFE PANELS CLEANUP HOTFIX CHECK ==='

$checkScript = Join-Path $root 'backend\scripts\session_safe_panels_cleanup_hotfix_check.mjs'
node $checkScript
if ($LASTEXITCODE -ne 0) { throw 'session_safe_panels_cleanup_hotfix_check failed' }

Write-Host '=== SESSION-SAFE PANELS CLEANUP HOTFIX CHECK PASS ==='
