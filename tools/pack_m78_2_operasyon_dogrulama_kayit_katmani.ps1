param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_runner.ps1')

Invoke-StandardPack `
  -RepoRoot $RepoRoot `
  -Title 'M78.2 OPERASYON DOGRULAMA KAYIT KATMANI PACK' `
  -Info 'Bu pack M78.1 yuzeyini ilk yazilabilir katmana tasir. Durum + kanit tipi + not + referans metni kaydedilir. STABLE_TO yine 78 kalir.' `
  -RepoContractScript 'tools\check_m78_2_operasyon_dogrulama_kayit_katmani_repo_contract.ps1' `
  -NodeScript 'backend\scripts\m78_2_operasyon_dogrulama_kayit_katmani_check.js' `
  -SuccessTitle 'M78.2 OPERASYON DOGRULAMA KAYIT KATMANI' `
  -SuccessInfo 'M78.2 ilk yazilabilir kayit katmani acildi; operasyon dogrulama sonucu super admin ekranindan kaydedilebilir ve STABLE_TO 78 korunur.'
