param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_runner.ps1')

Invoke-StandardPack `
  -RepoRoot $RepoRoot `
  -Title 'M76B LIVING MATRIX + TOOLS CONSOLIDATION PACK' `
  -Info 'Bu pack yaşayan doğrulama girişlerini, tools klasör düzenini ve matrix raporunu doğrular.' `
  -RepoContractScript 'tools\check_m76b_living_matrix_tools_consolidation_repo_contract.ps1' `
  -NodeScript 'backend\scripts\m76b_living_matrix_tools_consolidation_check.js' `
  -SuccessTitle 'M76B LIVING MATRIX + TOOLS CONSOLIDATION' `
  -SuccessInfo 'Living matrix raporu ve grouped tools entrypoint omurgasi hazir.'
