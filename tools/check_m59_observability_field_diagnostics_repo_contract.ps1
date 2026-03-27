param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"

function ReadText([string]$rel) {
  return [IO.File]::ReadAllText((Join-Path $RepoRoot $rel), [System.Text.Encoding]::UTF8).Normalize()
}
function MustExist([string]$rel) {
  if (-not (Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }
  Write-Host "OK $rel exists"
}
function MustContainAny([string]$txt,[string[]]$needles,[string]$label) {
  foreach ($n in $needles) {
    if ($txt.Contains(([string]$n).Normalize())) { Write-Host "OK $label"; return }
  }
  throw "FAIL $label"
}
function MustContainAll([string]$txt,[string[]]$needles,[string]$label) {
  foreach ($n in $needles) {
    if (-not $txt.Contains(([string]$n).Normalize())) { throw "FAIL $label" }
  }
  Write-Host "OK $label"
}

Write-Host "INFO Checking M59 files"
@(
  'backend\scripts\m59_observability_field_diagnostics_check.js',
  'backend\src\ops\observabilityManifest.js',
  'backend\src\routes\observability.js',
  'web\src\panels\superadmin\ObservabilityPanel.jsx',
  'tools\pack_m59_observability_field_diagnostics.ps1',
  'tools\check_m59_observability_field_diagnostics_repo_contract.ps1',
  'docs\RUNBOOK_M59_OBSERVABILITY_FIELD_DIAGNOSTICS.md',
  'docs\MILESTONE_M59_OBSERVABILITY_FIELD_DIAGNOSTICS.md',
  'docs\PROJECT_SPEC_V1.md',
  'docs\PRIMER_SSOT.md',
  'docs\STARTPACK_V1.md',
  'docs\CHECKLIST_SSOT.md',
  'docs\NEXT_BACKLOG_V1.md',
  'tools\PRIMER_SNAPSHOT.md',
  'tools\CHECKLIST_SSOT.md',
  'tools\README.md',
  'README.md'
) | ForEach-Object { MustExist $_ }

$project = ReadText 'docs\PROJECT_SPEC_V1.md'
$readme = ReadText 'README.md'
$primer = ReadText 'docs\PRIMER_SSOT.md'
$startpack = ReadText 'docs\STARTPACK_V1.md'
$checklist = ReadText 'docs\CHECKLIST_SSOT.md'
$backlog = ReadText 'docs\NEXT_BACKLOG_V1.md'
$toolsPrimer = ReadText 'tools\PRIMER_SNAPSHOT.md'
$toolsChecklist = ReadText 'tools\CHECKLIST_SSOT.md'
$toolsReadme = ReadText 'tools\README.md'
$runbook = ReadText 'docs\RUNBOOK_M59_OBSERVABILITY_FIELD_DIAGNOSTICS.md'
$milestone = ReadText 'docs\MILESTONE_M59_OBSERVABILITY_FIELD_DIAGNOSTICS.md'
$route = ReadText 'backend\src\routes\observability.js'
$manifest = ReadText 'backend\src\ops\observabilityManifest.js'
$panel = ReadText 'web\src\panels\superadmin\ObservabilityPanel.jsx'
$pack = ReadText 'tools\pack_m59_observability_field_diagnostics.ps1'
$script = ReadText 'backend\scripts\m59_observability_field_diagnostics_check.js'

MustContainAny $project @('B2B servis pazaryeri + operasyon yonetim platformudur','teklif','sozlesme') 'project spec reflects marketplace identity'
MustContainAny $readme @('M59','pack_m59_observability_field_diagnostics.ps1','M65','M75 green baseline') 'root readme reflects M59 route and no-field-before-M65 rule'
MustContainAny $primer @('M59','pack_m59_observability_field_diagnostics.ps1','M65','M75 green baseline') 'primer ssot reflects new route'
MustContainAny $startpack @('M59','pack_m59_observability_field_diagnostics.ps1','Saha testi') 'startpack reflects M59 and final field rule'
MustContainAll $checklist @('[ ]','M59','pack_m59_observability_field_diagnostics.ps1') 'checklist keeps M59 open with pack marker'
MustContainAny $backlog @('M59','pack_m59_observability_field_diagnostics.ps1','M60','M76A-1') 'backlog points to M59'
MustContainAny $toolsPrimer @('M59','pack_m59_observability_field_diagnostics.ps1','M65','M75 green baseline') 'tools primer reflects M59 route'
MustContainAll $toolsChecklist @('[ ]','M59','pack_m59_observability_field_diagnostics.ps1') 'tools checklist keeps M59 open with pack marker'
MustContainAny $toolsReadme @('pack_m59_observability_field_diagnostics.ps1','M59','M58 readiness contract') 'tools readme lists M59 pack and sequencing rule'
MustContainAny $runbook @('M59 GOZLEMLEME','mobil saglik olaylari iskeleti','GPS guven skoru') 'runbook defines M59 scope'
MustContainAny $milestone @('M59 GOZLEMLEME','ObservabilityPanel.jsx','pack_m59_observability_field_diagnostics.ps1') 'milestone documents M59 outputs'
MustContainAny $route @('/manifest','/health-summary','/event-types') 'observability route exposes manifest/summary endpoints'
MustContainAny $manifest @('M59_OBSERVABILITY_WIDGETS','mobileHealthEventTypes','gpsReliability') 'manifest defines M59 widgets and event types'
MustContainAny $manifest @('MOBILE_HEALTH_EVENT_TYPES','GPS_PUBLISH_SUCCESS','SURUCUNUN_TELEFON_GPSI') 'manifest defines health events and GPS wording'
MustContainAny $panel @('M59','GPS','Mobil') 'web panel shows M59 cards'
MustContainAny $pack @('m59_observability_field_diagnostics_check.js','check_m59_observability_field_diagnostics_repo_contract.ps1','PACK PASS OK') 'm59 pack wires runtime and repo contract'
MustContainAny $script @('M59 GOZLEMLEME','ObservabilityPanel.jsx','GPS') 'm59 runtime check covers skeleton baseline'

Write-Host 'M59 GOZLEMLEME + SAHA TESHis REPO CONTRACT PASS'
