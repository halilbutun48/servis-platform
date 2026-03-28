param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_runner.ps1')

Invoke-StandardPack `
  -RepoRoot $RepoRoot `
  -Title 'M77 KVKK + UYUM KATMANI PACK' `
  -Info 'Bu pack M77.5 retention / export-trail enforcement turunu dogrular: retention, anonymize ve export audit izi helper katmani role/payload redaction omurgasina baglanmis olmalidir.' `
  -RepoContractScript 'tools\check_m77_kvkk_uyum_katmani_repo_contract.ps1' `
  -NodeScript 'backend\scripts\m77_kvkk_uyum_katmani_check.js' `
  -SuccessTitle 'M77 KVKK + UYUM KATMANI' `
  -SuccessInfo 'M77.5 retention / export-trail enforcement gecti; retention policy, export audit izi ve anonymize hedefleri artik derin KVKK omurgasina baglanmistir.'
