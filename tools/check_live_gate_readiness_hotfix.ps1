param(
  [Parameter(Mandatory=$true)][string]$RepoRoot
)
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")Write-Host '=== LIVE + GATE READINESS HOTFIX CHECK ==='
$scriptPath = Join-Path $RepoRoot 'backend/scripts/live_gate_readiness_hotfix_check.mjs'
node $scriptPath $RepoRoot
if ($LASTEXITCODE -ne 0) { throw 'live_gate_readiness_hotfix_check failed' }
Write-Host '=== LIVE + GATE READINESS HOTFIX CHECK PASS ==='
