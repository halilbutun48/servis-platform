param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_runner.ps1')

Invoke-StandardPack `
  -RepoRoot $RepoRoot `
  -Title 'M76A-1 MINIMUM NORMALIZATION PACK' `
  -Info 'Bu pack yaşayan pack envanterini, manifest hizasını ve minimum helper standardını doğrular.' `
  -RepoContractScript 'tools\check_m76a_1_minimum_normalization_repo_contract.ps1' `
  -NodeScript 'backend\scripts\m76a_1_minimum_normalization_check.js' `
  -SuccessTitle 'M76A-1 MINIMUM NORMALIZATION' `
  -SuccessInfo 'Master pack artik M75 green baseline ve M76A-1 normalizasyon adimini gorur.'
