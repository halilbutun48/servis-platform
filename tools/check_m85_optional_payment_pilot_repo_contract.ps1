param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

Write-Host "=== M85 Repo Contract ==="
@(
  "backend\src\services\paymentBackbone.js",
  "backend\src\routes\commercialCore.js",
  "backend\scripts\m85_optional_payment_pilot_check.js",
  "web\src\panels\superadmin\CommercialCorePanel.jsx",
  "web\src\components\CommercialReadonlySummary.jsx",
  "tools\pack_m85_optional_payment_pilot.ps1",
  "tools\check_m85_optional_payment_pilot_repo_contract.ps1",
  "docs\RUNBOOK_M85_OPTIONAL_PAYMENT_PILOT.md",
  "tools\README.md",
  "tools\PRIMER_SNAPSHOT.md",
  "docs\PRIMER_SSOT.md",
  "docs\NEXT_BACKLOG_V1.md"
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$service = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\services\paymentBackbone.js"
$route = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\routes\commercialCore.js"
$panel = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "web\src\panels\superadmin\CommercialCorePanel.jsx"
$summary = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "web\src\components\CommercialReadonlySummary.jsx"
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\RUNBOOK_M85_OPTIONAL_PAYMENT_PILOT.md"
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\README.md"
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\PRIMER_SNAPSHOT.md"
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\PRIMER_SSOT.md"
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\NEXT_BACKLOG_V1.md"
$pack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\pack_m85_optional_payment_pilot.ps1"

Assert-RepoContractContainsAny -Text $service -Needles @('buildOptionalPaymentPilotStatus','listOptionalPaymentPilotCandidates','activateOptionalPaymentPilot','deactivateOptionalPaymentPilot') -Label 'payment backbone service carries M85 pilot builders'
Assert-RepoContractContainsAny -Text $route -Needles @('/payment-backbone/pilot/status','/payment-backbone/pilot/candidates','/payment-backbone/pilot/activate','/payment-backbone/pilot/deactivate') -Label 'commercial core route wires M85 pilot endpoints'
Assert-RepoContractContainsAny -Text $panel -Needles @('M85 opsiyonel ödeme pilotu','Opsiyonel ödeme pilot listesi','Pilot READY yap') -Label 'commercial core panel renders M85 pilot sections'
Assert-RepoContractContainsAny -Text $summary -Needles @('Opsiyonel ödeme pilotu','paymentmode === "OPTIONAL"','paymentMode === "OPTIONAL"','Hazır','Beklemede') -Label 'readonly summary reflects optional pilot state'
Assert-RepoContractContainsAny -Text $runbook -Needles @('M85','pack_m85_optional_payment_pilot.ps1','m85check','OPTIONAL') -Label 'runbook captures M85 route'
Assert-RepoContractContainsAny -Text $toolsReadme -Needles @('pack_m85_optional_payment_pilot.ps1','M85') -Label 'tools readme exposes M85 pack'
Assert-RepoContractMilestoneMention -Text $toolsPrimer -Milestone 'M85' -Descriptors @('opsiyonel odeme pilotu','odeme opsiyonel pilot','optional payment pilot','m85check') -Label 'tools primer exposes M85 route'
Assert-RepoContractMilestoneMention -Text $primer -Milestone 'M85' -Descriptors @('opsiyonel odeme pilotu','odeme opsiyonel pilot','optional payment pilot') -Label 'primer lists M85'
Assert-RepoContractContainsAny -Text $backlog -Needles @('M85','opsiyonel ödeme pilotu') -Label 'backlog lists M85 note'
Assert-RepoContractContainsAny -Text $pack -Needles @('check_m85_optional_payment_pilot_repo_contract.ps1','m85_optional_payment_pilot_check.js','M85 OPTIONAL PAYMENT PILOT PACK PASS OK') -Label 'pack wires repo contract and M85 guard'

Write-Host "=== M85 Repo Contract PASS ==="
