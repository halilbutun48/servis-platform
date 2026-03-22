param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_pack_runner.ps1")
Set-Location $RepoRoot

Invoke-ComposeNodePack `
  -RepoRoot $RepoRoot `
  -PackTitle 'M45 RETENTION + BACKUP PACK' `
  -RuntimeTitle 'M45 Runtime Check' `
  -RepoContractTitle 'M45 Repo Contract' `
  -SuccessTitle 'M45 RETENTION + BACKUP' `
  -NodeScript 'backend/scripts/m45_retention_backup_check.js' `
  -RepoContractScript 'tools/check_m45_retention_backup_repo_contract.ps1'
