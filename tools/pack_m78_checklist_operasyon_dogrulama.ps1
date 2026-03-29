param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_runner.ps1')

Invoke-StandardPack `
  -RepoRoot $RepoRoot `
  -Title 'M78 CHECKLIST + OPERASYON DOGRULAMA PACK' `
  -Info 'Bu pack M78 iskelet turunu dogrular: saha kabul checklistleri, rol bazli operasyon dogrulama, kanit/proof omurgasi ve kabul-red-eksik-tekrar kontrol akisi runbook/milestone/manifest hattina bagli olmalidir.' `
  -RepoContractScript 'tools\check_m78_checklist_operasyon_dogrulama_repo_contract.ps1' `
  -NodeScript 'backend\scripts\m78_checklist_operasyon_dogrulama_check.js' `
  -SuccessTitle 'M78 CHECKLIST + OPERASYON DOGRULAMA' `
  -SuccessInfo 'M78 iskeleti acildi; saha kabul checklistleri, rol bazli operasyon dogrulama ve kanit/proof omurgasi artik living hatta baglidir.'
