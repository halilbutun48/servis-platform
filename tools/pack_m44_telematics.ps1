param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_pack_runner.ps1")
Set-Location $RepoRoot

Invoke-ComposeNodePack `
  -RepoRoot $RepoRoot `
  -PackTitle 'M44 TELEMATICS PACK' `
  -RuntimeTitle 'M44 Runtime Check' `
  -RepoContractTitle 'M44 Repo Contract' `
  -SuccessTitle 'M44 TELEMATICS' `
  -NodeScript 'backend/scripts/m44_telematics_check.js' `
  -RepoContractScript 'tools/check_m44_telematics_repo_contract.ps1'
