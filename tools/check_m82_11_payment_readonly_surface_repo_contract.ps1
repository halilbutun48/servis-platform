param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

Write-Host "=== M82.11 Repo Contract ==="
@(
  "backend\src\services\paymentBackbone.js",
  "backend\src\routes\agreements.js",
  "backend\src\routes\shifts\shared.js",
  "backend\scripts\m82_11_payment_readonly_surface_check.js",
  "web\src\components\CommercialReadonlySummary.jsx",
  "web\src\panels\company\AgreementsPanel.jsx",
  "web\src\panels\room\AgreementsPanel.jsx",
  "web\src\panels\company\companyShiftsPanelRows.jsx",
  "web\src\panels\room\roomShiftsPanelRows.jsx",
  "tools\pack_m82_11_payment_readonly_surface.ps1",
  "tools\check_m82_11_payment_readonly_surface_repo_contract.ps1",
  "docs\RUNBOOK_M82_11_PAYMENT_READONLY_SURFACE.md",
  "tools\README.md",
  "tools\PRIMER_SNAPSHOT.md",
  "docs\MILESTONE_REGISTRY_V1.md",
  "docs\PRIMER_SSOT.md",
  "docs\NEXT_BACKLOG_V1.md"
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$service = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\services\paymentBackbone.js"
$agreementsRoute = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\routes\agreements.js"
$shiftsRoute = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\routes\shifts\shared.js"
$component = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "web\src\components\CommercialReadonlySummary.jsx"
$companyAgreements = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "web\src\panels\company\AgreementsPanel.jsx"
$roomAgreements = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "web\src\panels\room\AgreementsPanel.jsx"
$companyShiftRows = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "web\src\panels\company\companyShiftsPanelRows.jsx"
$roomShiftRows = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "web\src\panels\room\roomShiftsPanelRows.jsx"
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\RUNBOOK_M82_11_PAYMENT_READONLY_SURFACE.md"
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\README.md"
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\PRIMER_SNAPSHOT.md"
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\MILESTONE_REGISTRY_V1.md"
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\PRIMER_SSOT.md"
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\NEXT_BACKLOG_V1.md"
$pack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\pack_m82_11_payment_readonly_surface.ps1"

Assert-RepoContractContainsAny -Text $service -Needles @('buildAgreementCommercialBackboneMap','buildShiftCommercialBackboneMap') -Label 'payment backbone service carries M82.11 readonly map builders'
Assert-RepoContractContainsAny -Text $agreementsRoute -Needles @('commercialBackbone','buildAgreementCommercialBackboneMap') -Label 'agreements route attaches readonly commercial summary'
Assert-RepoContractContainsAny -Text $shiftsRoute -Needles @('commercialBackbone','buildShiftCommercialBackboneMap') -Label 'shifts route attaches readonly commercial summary'
Assert-RepoContractContainsAny -Text $component -Needles @('Komisyon snapshot','Settlement hazırlığı','Tahsilat:') -Label 'readonly summary component renders payment snapshot'
Assert-RepoContractContainsAny -Text $companyAgreements -Needles @('CommercialReadonlySummary') -Label 'company agreements surface renders readonly summary'
Assert-RepoContractContainsAny -Text $roomAgreements -Needles @('CommercialReadonlySummary') -Label 'room agreements surface renders readonly summary'
Assert-RepoContractContainsAny -Text $companyShiftRows -Needles @('CommercialReadonlySummary') -Label 'company shift rows render readonly summary'
Assert-RepoContractContainsAny -Text $roomShiftRows -Needles @('CommercialReadonlySummary') -Label 'room shift rows render readonly summary'
Assert-RepoContractContainsAny -Text $runbook -Needles @('M82.11','pack_m82_11_payment_readonly_surface.ps1','m82_11check','vardiya serisi') -Label 'runbook captures M82.11 route'
Assert-RepoContractContainsAny -Text $toolsReadme -Needles @('pack_m82_11_payment_readonly_surface.ps1','M82.11') -Label 'tools readme exposes M82.11 pack'
Assert-RepoContractMilestoneMention -Text $toolsPrimer -Milestone 'M82.11' -Descriptors @('payment readonly yuzey','payment readonly ticari yuzey','m82_11check') -Label 'tools primer exposes M82.11 route'
Assert-RepoContractContainsAny -Text $registry -Needles @('M82.11','Payment readonly ticari yüzey') -Label 'registry lists M82.11'
Assert-RepoContractMilestoneMention -Text $primer -Milestone 'M82.11' -Descriptors @('payment readonly yuzey','payment readonly ticari yuzey','payment readonly surface','payment readonly ticari surface') -Label 'primer lists M82.11'
Assert-RepoContractContainsAny -Text $backlog -Needles @('M82.11','payment readonly ticari yüzey') -Label 'backlog lists M82.11'
Assert-RepoContractContainsAny -Text $pack -Needles @('check_m82_11_payment_readonly_surface_repo_contract.ps1','m82_11_payment_readonly_surface_check.js','M82.11 PAYMENT READONLY SURFACE PACK PASS OK') -Label 'pack wires repo contract and M82.11 guard'

Write-Host "=== M82.11 Repo Contract PASS ==="
