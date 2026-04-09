param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

Write-Host "=== M83 Repo Contract ==="
@(
  "backend\src\ops\fieldPrepPacket.js",
  "backend\src\routes\pilotLaunchGate.js",
  "backend\scripts\m83_field_prep_packet_check.js",
  "web\src\panels\superadmin\PilotLaunchGatePanel.jsx",
  "tools\pack_m83_field_prep_packet.ps1",
  "tools\check_m83_field_prep_packet_repo_contract.ps1",
  "docs\RUNBOOK_M83_FIELD_PREP_PACKET.md",
  "tools\README.md",
  "tools\PRIMER_SNAPSHOT.md",
  "docs\PRIMER_SSOT.md",
  "docs\NEXT_BACKLOG_V1.md"
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$service = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\ops\fieldPrepPacket.js"
$route = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\routes\pilotLaunchGate.js"
$panel = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "web\src\panels\superadmin\PilotLaunchGatePanel.jsx"
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\RUNBOOK_M83_FIELD_PREP_PACKET.md"
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\README.md"
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\PRIMER_SNAPSHOT.md"
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\PRIMER_SSOT.md"
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\NEXT_BACKLOG_V1.md"
$pack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\pack_m83_field_prep_packet.ps1"

Assert-RepoContractContainsAny -Text $service -Needles @('FIELD_PREP_OPERATOR_SEQUENCE','FIELD_PREP_TEST_SCENARIOS','buildFieldPrepPacket') -Label 'field prep service carries M83 packet builders'
Assert-RepoContractContainsAny -Text $route -Needles @('/field-prep-packet','buildFieldPrepPacket') -Label 'pilot launch gate route wires field prep packet endpoint'
Assert-RepoContractContainsAny -Text $panel -Needles @('Canlı ortam ve release kontrolleri','Gerçek saha senaryoları','Rol ve cihaz checklisti') -Label 'pilot launch gate panel renders M83 field prep sections'
Assert-RepoContractContainsAny -Text $runbook -Needles @('M83','pack_m83_field_prep_packet.ps1','m83check','Sahaya Çıkış Kontrolü') -Label 'runbook captures M83 route'
Assert-RepoContractContainsAny -Text $toolsReadme -Needles @('pack_m83_field_prep_packet.ps1','M83') -Label 'tools readme exposes M83 pack'
Assert-RepoContractMilestoneMention -Text $toolsPrimer -Milestone 'M83' -Descriptors @('saha hazirlik paketi','field prep packet','m83check') -Label 'tools primer exposes M83 route'
Assert-RepoContractMilestoneMention -Text $primer -Milestone 'M83' -Descriptors @('saha hazirlik paketi','field prep packet') -Label 'primer lists M83'
Assert-RepoContractContainsAny -Text $backlog -Needles @("M83","M84","M85","M86","M87","M88","M89","M90","living route") -Label 'backlog lists M83'
Assert-RepoContractContainsAny -Text $pack -Needles @('check_m83_field_prep_packet_repo_contract.ps1','m83_field_prep_packet_check.js','M83 FIELD PREP PACK PACK PASS OK') -Label 'pack wires repo contract and M83 guard'

Write-Host "=== M83 Repo Contract PASS ==="

