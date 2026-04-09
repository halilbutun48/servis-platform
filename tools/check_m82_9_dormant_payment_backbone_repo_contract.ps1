param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

Write-Host "=== M82.9 Repo Contract ==="
@(
  "backend\prisma\schema.prisma",
  "backend\prisma\migrations\20260407103000_m82_9_dormant_payment_backbone\migration.sql",
  "backend\src\services\paymentBackbone.js",
  "backend\src\routes\agreements.js",
  "backend\src\routes\shifts\company.js",
  "backend\src\routes\shifts\room.js",
  "backend\src\routes\commercialCore.js",
  "backend\scripts\m82_9_dormant_payment_backbone_check.js",
  "web\src\panels\superadmin\CommercialCorePanel.jsx",
  "tools\pack_m82_9_dormant_payment_backbone.ps1",
  "tools\check_m82_9_dormant_payment_backbone_repo_contract.ps1",
  "docs\RUNBOOK_M82_9_DORMANT_PAYMENT_BACKBONE.md",
  "tools\README.md",
  "tools\PRIMER_SNAPSHOT.md",
  "docs\MILESTONE_REGISTRY_V1.md",
  "docs\PRIMER_SSOT.md",
  "docs\NEXT_BACKLOG_V1.md"
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$schema = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\prisma\schema.prisma"
$service = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\services\paymentBackbone.js"
$route = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\routes\commercialCore.js"
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\RUNBOOK_M82_9_DORMANT_PAYMENT_BACKBONE.md"
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\README.md"
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\PRIMER_SNAPSHOT.md"
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\MILESTONE_REGISTRY_V1.md"
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\PRIMER_SSOT.md"
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\NEXT_BACKLOG_V1.md"
$pack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\pack_m82_9_dormant_payment_backbone.ps1"

Assert-RepoContractContainsAny -Text $schema -Needles @('model CommercialSource','model SettlementPlan','model SettlementEntry','enum PaymentMode') -Label 'schema carries dormant payment backbone models'
Assert-RepoContractContainsAny -Text $service -Needles @('upsertAgreementCommercialBackbone','upsertShiftSeriesCommercialBackboneByShiftId','providerAdapters','buildPaymentBackboneStatus') -Label 'payment backbone service carries required abstractions'
Assert-RepoContractContainsAny -Text $route -Needles @('/payment-backbone/status','/payment-backbone/sources') -Label 'commercial core route exposes payment backbone endpoints'
Assert-RepoContractContainsAny -Text $runbook -Needles @('M82.9','pack_m82_9_dormant_payment_backbone.ps1','m82_9_dormant_payment_backbone_check.js','CommercialSource') -Label 'runbook captures M82.9 route'
Assert-RepoContractContainsAny -Text $toolsReadme -Needles @('pack_m82_9_dormant_payment_backbone.ps1','M82.9') -Label 'tools readme exposes M82.9 pack'
Assert-RepoContractMilestoneMention -Text $toolsPrimer -Milestone 'M82.9' -Descriptors @('dormant payment backbone','m82_9check') -Label 'tools primer exposes M82.9 route'
Assert-RepoContractContainsAny -Text $registry -Needles @('M82.9','Dormant payment backbone') -Label 'registry lists M82.9'
Assert-RepoContractMilestoneMention -Text $primer -Milestone 'M82.9' -Descriptors @('dormant payment backbone') -Label 'primer lists M82.9'
Assert-RepoContractContainsAny -Text $backlog -Needles @("M82.9","M82.10","M82.11","M83","M84","M85","M86","M87","M88","M89","M90","living route") -Label 'backlog lists M82.9'
Assert-RepoContractContainsAny -Text $pack -Needles @('check_m82_9_dormant_payment_backbone_repo_contract.ps1','m82_9_dormant_payment_backbone_check.js','M82.9 DORMANT PAYMENT BACKBONE PACK PASS OK') -Label 'pack wires repo contract and dormant backbone guard'

Write-Host "=== M82.9 Repo Contract PASS ==="

