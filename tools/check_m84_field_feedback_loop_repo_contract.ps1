param([string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path)
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_repo_contract_common.ps1")

Write-Host "=== M84 Repo Contract ==="
@(
  "backend\src\ops\fieldFeedbackLoop.js",
  "backend\src\routes\pilotLaunchGate.js",
  "backend\scripts\m84_field_feedback_loop_check.js",
  "web\src\panels\superadmin\PilotLaunchGatePanel.jsx",
  "tools\pack_m84_field_feedback_loop.ps1",
  "tools\check_m84_field_feedback_loop_repo_contract.ps1",
  "docs\RUNBOOK_M84_FIELD_FEEDBACK_LOOP.md",
  "tools\README.md",
  "tools\PRIMER_SNAPSHOT.md",
  "docs\PRIMER_SSOT.md",
  "docs\NEXT_BACKLOG_V1.md"
) | ForEach-Object { Assert-RepoContractExists -RepoRoot $RepoRoot -RelativePath $_ }

$service = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\ops\fieldFeedbackLoop.js"
$route = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "backend\src\routes\pilotLaunchGate.js"
$panel = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "web\src\panels\superadmin\PilotLaunchGatePanel.jsx"
$runbook = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\RUNBOOK_M84_FIELD_FEEDBACK_LOOP.md"
$toolsReadme = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\README.md"
$toolsPrimer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\PRIMER_SNAPSHOT.md"
$primer = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\PRIMER_SSOT.md"
$backlog = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "docs\NEXT_BACKLOG_V1.md"
$pack = Read-RepoContractText -RepoRoot $RepoRoot -RelativePath "tools\pack_m84_field_feedback_loop.ps1"

Assert-RepoContractContainsAny -Text $service -Needles @('FIELD_FEEDBACK_STATUSES','buildFieldFeedbackLoopPacket','updateFieldFeedbackRecordStatus') -Label 'field feedback service carries M84 builders'
Assert-RepoContractContainsAny -Text $route -Needles @('/field-feedback-loop','/field-feedback-loop/records/:id/status') -Label 'pilot launch gate route wires M84 endpoints'
Assert-RepoContractContainsAny -Text $panel -Needles @('Saha gözlem / geri bildirim döngüsü','Yeni saha geri bildirimi ekle','Durum akışı') -Label 'pilot launch gate panel renders M84 feedback sections'
Assert-RepoContractContainsAny -Text $runbook -Needles @('M84','pack_m84_field_feedback_loop.ps1','m84check','Sahaya Cikis Kontrolu') -Label 'runbook captures M84 route'
Assert-RepoContractContainsAny -Text $toolsReadme -Needles @('pack_m84_field_feedback_loop.ps1','M84') -Label 'tools readme exposes M84 pack'
Assert-RepoContractMilestoneMention -Text $toolsPrimer -Milestone 'M84' -Descriptors @('saha gozlem / geri bildirim dongusu','saha geri bildirim dongusu','field feedback loop','m84check') -Label 'tools primer exposes M84 route'
Assert-RepoContractMilestoneMention -Text $primer -Milestone 'M84' -Descriptors @('saha gozlem / geri bildirim dongusu','saha geri bildirim dongusu','field feedback loop') -Label 'primer lists M84'
Assert-RepoContractContainsAny -Text $backlog -Needles @('M84','field feedback loop') -Label 'backlog lists M84 note'
Assert-RepoContractContainsAny -Text $pack -Needles @('check_m84_field_feedback_loop_repo_contract.ps1','m84_field_feedback_loop_check.js','M84 FIELD FEEDBACK LOOP PACK PASS OK') -Label 'pack wires repo contract and M84 guard'

Write-Host "=== M84 Repo Contract PASS ==="
