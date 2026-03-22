param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_pack_runner.ps1")
Set-Location $RepoRoot

Invoke-ComposeNodePack `
  -RepoRoot $RepoRoot `
  -PackTitle 'M46 AI COPILOT FOUNDATION PACK' `
  -RuntimeTitle 'M46 Runtime Check' `
  -RepoContractTitle 'M46 Repo Contract' `
  -SuccessTitle 'M46 AI COPILOT FOUNDATION' `
  -NodeScript 'backend/scripts/m46_ai_copilot_check.js' `
  -RepoContractScript 'tools/check_m46_ai_copilot_repo_contract.ps1'
