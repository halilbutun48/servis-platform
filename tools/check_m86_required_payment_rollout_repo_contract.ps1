param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

Write-Host "=== M86 Repo Contract ==="
@(
  "backend\src\services\paymentBackbone.js",
  "backend\src\routes\commercialCore.js",
  "backend\scripts\m86_required_payment_rollout_check.js",
  "web\src\panels\superadmin\CommercialCorePanel.jsx",
  "web\src\components\CommercialReadonlySummary.jsx",
  "tools\pack_m86_required_payment_rollout.ps1",
  "tools\check_m86_required_payment_rollout_repo_contract.ps1",
  "docs\RUNBOOK_M86_REQUIRED_PAYMENT_ROLLOUT.md",
  "tools\README.md",
  "tools\PRIMER_SNAPSHOT.md",
  "docs\PRIMER_SSOT.md",
  "docs\NEXT_BACKLOG_V1.md"
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$service = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\services\paymentBackbone.js"
$route = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\routes\commercialCore.js"
$panel = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "web\src\panels\superadmin\CommercialCorePanel.jsx"
$summary = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "web\src\components\CommercialReadonlySummary.jsx"
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\RUNBOOK_M86_REQUIRED_PAYMENT_ROLLOUT.md"
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\README.md"
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\PRIMER_SNAPSHOT.md"
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\PRIMER_SSOT.md"
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\NEXT_BACKLOG_V1.md"
$pack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\pack_m86_required_payment_rollout.ps1"

Assert-RepoContractContainsAny -Text $service -Needles @('buildRequiredPaymentRolloutStatus','listRequiredPaymentRolloutCandidates','activateRequiredPaymentRollout','deactivateRequiredPaymentRollout') -Label 'payment backbone service carries M86 rollout builders'
Assert-RepoContractContainsAny -Text $route -Needles @('/payment-backbone/required/status','/payment-backbone/required/candidates','/payment-backbone/required/activate','/payment-backbone/required/deactivate') -Label 'commercial core route wires M86 required rollout endpoints'
Assert-RepoContractContainsAny -Text $panel -Needles @("M86 zorunlu ödeme rollout",'Zorunlu ödeme rollout listesi','Rollout ACTIVE yap') -Label 'commercial core panel renders M86 rollout sections'
Assert-RepoContractContainsAny -Text $summary -Needles @("Zorunlu ödeme rollout'u",'paymentMode === "REQUIRED"','Aktif','Beklemede','Durduruldu') -Label 'readonly summary reflects required rollout state'
Assert-RepoContractContainsAny -Text $runbook -Needles @('M86','pack_m86_required_payment_rollout.ps1','m86check','REQUIRED') -Label 'runbook captures M86 route'
Assert-RepoContractContainsAny -Text $toolsReadme -Needles @('pack_m86_required_payment_rollout.ps1','M86') -Label 'tools readme exposes M86 pack'
Assert-RepoContractMilestoneMention -Text $toolsPrimer -Milestone 'M86' -Descriptors @('zorunlu odeme rollout','required payment rollout','m86check') -Label 'tools primer exposes M86 route'
Assert-RepoContractMilestoneMention -Text $primer -Milestone 'M86' -Descriptors @('zorunlu odeme rollout','required payment rollout','payment') -Label 'primer lists M86'
Assert-RepoContractContainsAny -Text $backlog -Needles @('M86','zorunlu odeme rollout') -Label 'backlog lists M86 note'
Assert-RepoContractContainsAny -Text $pack -Needles @('check_m86_required_payment_rollout_repo_contract.ps1','m86_required_payment_rollout_check.js','M86 REQUIRED PAYMENT ROLLOUT PACK PASS OK') -Label 'pack wires repo contract and M86 guard'

Write-Host "=== M86 Repo Contract PASS ==="
