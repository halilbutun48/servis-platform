param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_runner.ps1')

Invoke-StandardPack `
  -RepoRoot $RepoRoot `
  -Title 'M78.1 OPERASYON DOGRULAMA YUZEYI PACK' `
  -Info 'Bu pack M78 iskeletini minimum super admin urun yuzeyine tasir. Read-only role secimi, durum ozeti ve kanit tipleri dogrulanir. STABLE_TO yine 78 kalir.' `
  -RepoContractScript 'tools\check_m78_1_operasyon_dogrulama_yuzeyi_repo_contract.ps1' `
  -NodeScript 'backend\scripts\m78_1_operasyon_dogrulama_yuzeyi_check.js' `
  -SuccessTitle 'M78.1 OPERASYON DOGRULAMA YUZEYI' `
  -SuccessInfo 'M78.1 minimal urun yuzeyi acildi; rol bazli operasyon dogrulama artik super admin icinde okunabilir ve STABLE_TO 78 korunur.'
