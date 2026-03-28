param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_pack_runner.ps1')

Invoke-StandardPack `
  -RepoRoot $RepoRoot `
  -Title 'M77 KVKK + UYUM KATMANI PACK' `
  -Info 'Bu pack M77 omurgasinin dosya, manifest ve living static baglarini dogrular. Ilk tur sadece iskeleti acar; detay enforcement sonraki iterasyonda derinlesir.' `
  -RepoContractScript 'tools\check_m77_kvkk_uyum_katmani_repo_contract.ps1' `
  -NodeScript 'backend\scripts\m77_kvkk_uyum_katmani_check.js' `
  -SuccessTitle 'M77 KVKK + UYUM KATMANI' `
  -SuccessInfo 'M77 iskeleti acildi; aydinlatma, gorunurluk matrisi, retention ve audit izi omurgasi artik kanonik faza kayitli.'
