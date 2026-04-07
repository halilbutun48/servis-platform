param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

Write-Host "=== M82.10 Repo Contract ==="
@(
  "backend\src\services\paymentBackbone.js",
  "backend\src\routes\commercialCore.js",
  "backend\scripts\m82_10_super_admin_commercial_settings_check.js",
  "web\src\panels\superadmin\CommercialCorePanel.jsx",
  "tools\pack_m82_10_super_admin_commercial_settings.ps1",
  "tools\check_m82_10_super_admin_commercial_settings_repo_contract.ps1",
  "docs\RUNBOOK_M82_10_SUPER_ADMIN_COMMERCIAL_SETTINGS.md",
  "tools\README.md",
  "tools\PRIMER_SNAPSHOT.md",
  "docs\MILESTONE_REGISTRY_V1.md",
  "docs\PRIMER_SSOT.md",
  "docs\NEXT_BACKLOG_V1.md"
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$service = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\services\paymentBackbone.js"
$route = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\routes\commercialCore.js"
$panel = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "web\src\panels\superadmin\CommercialCorePanel.jsx"
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\RUNBOOK_M82_10_SUPER_ADMIN_COMMERCIAL_SETTINGS.md"
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\README.md"
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\PRIMER_SNAPSHOT.md"
$registry = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\MILESTONE_REGISTRY_V1.md"
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\PRIMER_SSOT.md"
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\NEXT_BACKLOG_V1.md"
$pack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\pack_m82_10_super_admin_commercial_settings.ps1"

Assert-RepoContractContainsAny -Text $service -Needles @('buildPaymentBackboneSettings','upsertGlobalCommissionRule','upsertRoomCommissionRule','disableRoomCommissionRule') -Label 'payment backbone service carries M82.10 setting actions'
Assert-RepoContractContainsAny -Text $route -Needles @('/payment-backbone/settings','/payment-backbone/settings/global','/payment-backbone/settings/room') -Label 'commercial core route exposes M82.10 setting endpoints'
Assert-RepoContractContainsAny -Text $panel -Needles @('Super Admin ticari ayarlar','Global ayar','Oda bazlı override','Override kapat') -Label 'superadmin panel exposes M82.10 settings surface'
Assert-RepoContractContainsAny -Text $runbook -Needles @('M82.10','pack_m82_10_super_admin_commercial_settings.ps1','m82_10_super_admin_commercial_settings_check.js','oda bazlı override') -Label 'runbook captures M82.10 route'
Assert-RepoContractContainsAny -Text $toolsReadme -Needles @('pack_m82_10_super_admin_commercial_settings.ps1','M82.10') -Label 'tools readme exposes M82.10 pack'
Assert-RepoContractMilestoneMention -Text $toolsPrimer -Milestone 'M82.10' -Descriptors @('super admin ticari ayarlar','m82_10check') -Label 'tools primer exposes M82.10 route'
Assert-RepoContractContainsAny -Text $registry -Needles @('M82.10','Super Admin ticari ayarlar') -Label 'registry lists M82.10'
Assert-RepoContractMilestoneMention -Text $primer -Milestone 'M82.10' -Descriptors @('super admin ticari ayarlar') -Label 'primer lists M82.10'
Assert-RepoContractContainsAny -Text $backlog -Needles @('M82.10','super admin ticari ayarlar') -Label 'backlog lists M82.10'
Assert-RepoContractContainsAny -Text $pack -Needles @('check_m82_10_super_admin_commercial_settings_repo_contract.ps1','m82_10_super_admin_commercial_settings_check.js','M82.10 SUPER ADMIN COMMERCIAL SETTINGS PACK PASS OK') -Label 'pack wires repo contract and M82.10 guard'

Write-Host "=== M82.10 Repo Contract PASS ==="
