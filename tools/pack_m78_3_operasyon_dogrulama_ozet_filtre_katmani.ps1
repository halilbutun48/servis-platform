param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_runner.ps1')

Invoke-StandardPack `
  -RepoRoot $RepoRoot `
  -Title 'M78.3 OPERASYON DOGRULAMA OZET VE FILTRE KATMANI PACK' `
  -Info 'Bu pack M78.2 kayit katmanini daha okunur hale tasir. Filtre, son guncelleme ve export gorunurlugu eklenir. STABLE_TO yine 78 kalir.' `
  -RepoContractScript 'tools\check_m78_3_operasyon_dogrulama_ozet_filtre_katmani_repo_contract.ps1' `
  -NodeScript 'backend\scripts\m78_3_operasyon_dogrulama_ozet_filtre_katmani_check.js' `
  -SuccessTitle 'M78.3 OPERASYON DOGRULAMA OZET VE FILTRE KATMANI' `
  -SuccessInfo 'M78.3 ozet ve filtre katmani acildi; kayitlar ayni ekranda daha okunur hale geldi ve STABLE_TO 78 korunur.'
