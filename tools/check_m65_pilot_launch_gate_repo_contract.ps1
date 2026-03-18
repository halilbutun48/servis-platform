param([string]$RepoRoot = (Resolve-Path ".").Path)
$ErrorActionPreference = "Stop"
function NormalizeText([string]$s) {
  if ($null -eq $s) { return "" }
  $t = [string]$s
  $pairs = @(
    @([string][char]0x0130,'I'), @([string][char]0x0131,'i'),
    @([string][char]0x015E,'S'), @([string][char]0x015F,'s'),
    @([string][char]0x011E,'G'), @([string][char]0x011F,'g'),
    @([string][char]0x00DC,'U'), @([string][char]0x00FC,'u'),
    @([string][char]0x00D6,'O'), @([string][char]0x00F6,'o'),
    @([string][char]0x00C7,'C'), @([string][char]0x00E7,'c'),
    @([string][char]0x2014,'-'), @([string][char]0x2013,'-'),
    @([string][char]0x2192,'->'), @('`','')
  )
  foreach ($pair in $pairs) { $t = $t.Replace($pair[0], $pair[1]) }
  $t = $t.ToLowerInvariant()
  $t = [regex]::Replace($t, '\s+', ' ')
  return $t.Trim()
}
function ReadText([string]$rel){ [IO.File]::ReadAllText((Join-Path $RepoRoot $rel), [System.Text.Encoding]::UTF8) }
function MustExist([string]$rel){ if (!(Test-Path (Join-Path $RepoRoot $rel))) { throw "FAIL missing $rel" }; Write-Host "OK $rel exists" }
function MustContainAny([string]$txt,[string[]]$needles,[string]$label){ $nTxt = NormalizeText $txt; foreach ($n in $needles) { if ($nTxt.Contains((NormalizeText ([string]$n)))) { Write-Host "OK $label"; return } }; throw "FAIL $label" }

Write-Host 'INFO Checking M65 files'
@(
 'backend\scripts\m65_pilot_launch_gate_check.js',
 'backend\src\ops\pilotLaunchGateManifest.js',
 'backend\src\routes\pilotLaunchGate.js',
 'web\src\panels\superadmin\PilotLaunchGatePanel.jsx',
 'docs\RUNBOOK_M65_PILOT_LAUNCH_GATE.md',
 'docs\MILESTONE_M65_PILOT_LAUNCH_GATE.md',
 'tools\pack_m65_pilot_launch_gate.ps1',
 'tools\check_m65_pilot_launch_gate_repo_contract.ps1',
 'README.md', 'docs\PROJECT_SPEC_V1.md', 'docs\PRIMER_SSOT.md', 'docs\STARTPACK_V1.md', 'docs\CHECKLIST_SSOT.md', 'docs\NEXT_BACKLOG_V1.md', 'tools\PRIMER_SNAPSHOT.md', 'tools\CHECKLIST_SSOT.md', 'tools\README.md', 'docs\MILESTONE_REGISTRY_V1.md'
) | ForEach-Object { MustExist $_ }
$readme = ReadText 'README.md'
$projectSpec = ReadText 'docs\PROJECT_SPEC_V1.md'
$primer = ReadText 'docs\PRIMER_SSOT.md'
$startpack = ReadText 'docs\STARTPACK_V1.md'
$checklist = ReadText 'docs\CHECKLIST_SSOT.md'
$backlog = ReadText 'docs\NEXT_BACKLOG_V1.md'
$toolsPrimer = ReadText 'tools\PRIMER_SNAPSHOT.md'
$toolsChecklist = ReadText 'tools\CHECKLIST_SSOT.md'
$toolsReadme = ReadText 'tools\README.md'
$registry = ReadText 'docs\MILESTONE_REGISTRY_V1.md'
$runbook = ReadText 'docs\RUNBOOK_M65_PILOT_LAUNCH_GATE.md'
$milestone = ReadText 'docs\MILESTONE_M65_PILOT_LAUNCH_GATE.md'
$route = ReadText 'backend\src\routes\pilotLaunchGate.js'
$manifest = ReadText 'backend\src\ops\pilotLaunchGateManifest.js'
$panel = ReadText 'web\src\panels\superadmin\PilotLaunchGatePanel.jsx'
$pack = ReadText 'tools\pack_m65_pilot_launch_gate.ps1'
$script = ReadText 'backend\scripts\m65_pilot_launch_gate_check.js'
MustContainAny $readme @('m64 green','m65 - pilot launch gate','pack_m65_pilot_launch_gate.ps1') 'root readme reflects M65 route'
MustContainAny $projectSpec @('pilot launch gate','go / limited go / no-go','m59 -> m65') 'project spec reflects launch gate layer'
MustContainAny $primer @('m64 - dogal copilot katmani resmi green oldu','m65 - pilot launch gate','pack_m65_pilot_launch_gate.ps1') 'primer ssot reflects M64 green and M65 active'
MustContainAny $startpack @('m65 - pilot launch gate','m65 green olmadan sahaya cikilmaz','pack_m65_pilot_launch_gate.ps1') 'startpack reflects M65 opening'
MustContainAny $checklist @('[x] m64 - dogal copilot katmani','[ ] m65 - pilot launch gate') 'checklist marks M64 green and keeps M65 open'
MustContainAny $backlog @('m65 - pilot launch gate','launch checklist','go / limited go / no-go') 'backlog points to M65'
MustContainAny $toolsPrimer @('m64 - dogal copilot katmani resmi green oldu','m65 - pilot launch gate','pack_m65_pilot_launch_gate.ps1') 'tools primer reflects M65 route'
MustContainAny $toolsChecklist @('[x] m64 - dogal copilot katmani','[ ] m65 - pilot launch gate') 'tools checklist marks M64 green and keeps M65 open'
MustContainAny $toolsReadme @('pack_m65_pilot_launch_gate.ps1','m65 green olmadan sahaya cikilmaz','aktif hat: m65') 'tools readme lists M65 pack and sequencing rule'
MustContainAny $registry @('m64 - dogal copilot katmani - green','m65 - pilot launch gate - aktif') 'registry lists current official route'
MustContainAny $runbook @('m65 pilot launch gate','kritik risk listesi','sahaya cikilmaz') 'runbook defines M65 scope'
MustContainAny $milestone @('m65 - pilot launch gate','pilotlaunchgatepanel.jsx','pack_m65_pilot_launch_gate.ps1') 'milestone documents M65 outputs'
MustContainAny $route @('/manifest','/decision-template','/risk-template') 'pilot launch gate route exposes summary endpoints'
MustContainAny $manifest @('pilot_launch_gate_capabilities','go / limited go / no-go','build / cihaz uygunluk matrisi') 'manifest defines M65 gate capabilities'
MustContainAny $panel @('m65 pilot launch gate','launch checklist','go / limited go / no-go') 'web panel shows M65 cards'
MustContainAny $pack @('m65_pilot_launch_gate_check.js','check_m65_pilot_launch_gate_repo_contract.ps1','pack pass ok') 'm65 pack wires runtime and repo contract'
MustContainAny $script @('m65 pilot launch gate check','/api/pilot-launch-gate') 'm65 runtime check covers skeleton baseline'
Write-Host 'M65 PILOT LAUNCH GATE REPO CONTRACT PASS'
