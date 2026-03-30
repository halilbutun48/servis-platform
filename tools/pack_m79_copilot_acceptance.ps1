param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'
Write-Host ''
Write-Host '=== M79 COPILOT ACCEPTANCE PACK ==='
Write-Host ''
node (Join-Path $RepoRoot 'backend/scripts/m79_d1_copilot_acceptance_pack.js')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host ''
Write-Host '=== M79 COPILOT ACCEPTANCE PACK PASS ==='
